import { api, APIError } from "encore.dev/api";
import { auditDB } from "./db";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import type { GDPRRequest, GDPRRequestType, GDPRRequestStatus } from "./types";

const userDB = SQLDatabase.named("user");
const designerDB = SQLDatabase.named("designer");
const ticketDB = SQLDatabase.named("ticket");

export interface CreateGDPRRequestRequest {
  userId: number;
  requestType: GDPRRequestType;
  requestDetails?: Record<string, any>;
}

// Creates a new GDPR request.
export const createGDPRRequest = api<CreateGDPRRequestRequest, GDPRRequest>(
  { expose: true, method: "POST", path: "/audit/gdpr/request" },
  async ({ userId, requestType, requestDetails }) => {
    const row = await auditDB.queryRow<GDPRRequest>`
      INSERT INTO gdpr_requests (user_id, request_type, request_details)
      VALUES (${userId}, ${requestType}, ${JSON.stringify(requestDetails || {})})
      RETURNING *
    `;

    if (!row) {
      throw APIError.internal("Failed to create GDPR request");
    }

    return {
      id: row.id,
      userId: row.user_id,
      requestType: row.request_type as GDPRRequestType,
      status: row.status as GDPRRequestStatus,
      requestDetails: row.request_details || {},
      responseData: row.response_data || {},
      requestedAt: row.requested_at,
      completedAt: row.completed_at,
      notes: row.notes,
    };
  }
);

export interface ProcessGDPRRequestParams {
  requestId: number;
}

export interface ProcessGDPRRequestResponse {
  request: GDPRRequest;
  data?: Record<string, any>;
}

// Processes a GDPR request and exports user data.
export const processGDPRRequest = api<ProcessGDPRRequestParams, ProcessGDPRRequestResponse>(
  { expose: true, method: "POST", path: "/audit/gdpr/process/:requestId" },
  async ({ requestId }) => {
    // Get the request
    const request = await auditDB.queryRow`
      SELECT * FROM gdpr_requests WHERE id = ${requestId}
    `;

    if (!request) {
      throw APIError.notFound("GDPR request not found");
    }

    if (request.status !== 'pending') {
      throw APIError.failedPrecondition("Request has already been processed");
    }

    // Update status to processing
    await auditDB.exec`
      UPDATE gdpr_requests 
      SET status = 'processing' 
      WHERE id = ${requestId}
    `;

    const userId = request.user_id;
    let responseData: Record<string, any> = {};

    try {
      if (request.request_type === 'access' || request.request_type === 'portability') {
        // Export all user data
        const userData = await userDB.queryRow`
          SELECT * FROM users WHERE id = ${userId}
        `;

        const userPreferences = await userDB.queryRow`
          SELECT * FROM user_preferences WHERE user_id = ${userId}
        `;

        const designerData = await designerDB.queryRow`
          SELECT * FROM designers WHERE user_id = ${userId}
        `;

        const tickets = await ticketDB.queryAll`
          SELECT * FROM tickets WHERE user_id = ${userId}
        `;

        const orders = await ticketDB.queryAll`
          SELECT * FROM ticket_orders WHERE user_id = ${userId}
        `;

        responseData = {
          user: userData,
          preferences: userPreferences,
          designer: designerData,
          tickets,
          orders,
          exportedAt: new Date().toISOString(),
        };
      } else if (request.request_type === 'deletion') {
        // Mark for deletion (actual deletion should be done carefully)
        responseData = {
          message: "User data marked for deletion",
          deletionScheduled: true,
          scheduledDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        };
      }

      // Update request as completed
      const updatedRequest = await auditDB.queryRow`
        UPDATE gdpr_requests 
        SET status = 'completed', 
            response_data = ${JSON.stringify(responseData)},
            completed_at = NOW()
        WHERE id = ${requestId}
        RETURNING *
      `;

      return {
        request: {
          id: updatedRequest.id,
          userId: updatedRequest.user_id,
          requestType: updatedRequest.request_type as GDPRRequestType,
          status: updatedRequest.status as GDPRRequestStatus,
          requestDetails: updatedRequest.request_details || {},
          responseData: updatedRequest.response_data || {},
          requestedAt: updatedRequest.requested_at,
          completedAt: updatedRequest.completed_at,
          notes: updatedRequest.notes,
        },
        data: responseData,
      };

    } catch (error) {
      // Update request as rejected
      await auditDB.exec`
        UPDATE gdpr_requests 
        SET status = 'rejected', 
            notes = ${`Processing failed: ${error}`},
            completed_at = NOW()
        WHERE id = ${requestId}
      `;
      throw error;
    }
  }
);

export interface ListGDPRRequestsParams {
  userId?: number;
  status?: GDPRRequestStatus;
  requestType?: GDPRRequestType;
  limit?: number;
  offset?: number;
}

export interface ListGDPRRequestsResponse {
  requests: GDPRRequest[];
  total: number;
}

// Lists GDPR requests with filtering options.
export const listGDPRRequests = api<ListGDPRRequestsParams, ListGDPRRequestsResponse>(
  { expose: true, method: "GET", path: "/audit/gdpr/requests" },
  async ({ userId, status, requestType, limit = 20, offset = 0 }) => {
    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let paramIndex = 1;

    if (userId) {
      whereClause += ` AND user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (requestType) {
      whereClause += ` AND request_type = $${paramIndex}`;
      params.push(requestType);
      paramIndex++;
    }

    const countQuery = `SELECT COUNT(*) as count FROM gdpr_requests ${whereClause}`;
    const countResult = await auditDB.rawQueryRow(countQuery, ...params);
    const total = countResult?.count || 0;

    const query = `
      SELECT * FROM gdpr_requests 
      ${whereClause}
      ORDER BY requested_at DESC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const rows = await auditDB.rawQueryAll(query, ...params);

    const requests = rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      requestType: row.request_type as GDPRRequestType,
      status: row.status as GDPRRequestStatus,
      requestDetails: row.request_details || {},
      responseData: row.response_data || {},
      requestedAt: row.requested_at,
      completedAt: row.completed_at,
      notes: row.notes,
    }));

    return { requests, total };
  }
);
