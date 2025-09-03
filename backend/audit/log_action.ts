import { api, APIError } from "encore.dev/api";
import { auditDB } from "./db";
import type { AuditLog } from "./types";

export interface LogActionRequest {
  userId?: number;
  action: string;
  resourceType: string;
  resourceId?: number;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

// Logs an action for audit purposes.
export const logAction = api<LogActionRequest, AuditLog>(
  { expose: true, method: "POST", path: "/audit/log" },
  async (req) => {
    const row = await auditDB.queryRow<AuditLog>`
      INSERT INTO audit_logs (
        user_id, action, resource_type, resource_id, 
        old_values, new_values, ip_address, user_agent
      )
      VALUES (
        ${req.userId}, ${req.action}, ${req.resourceType}, ${req.resourceId},
        ${JSON.stringify(req.oldValues || {})}, ${JSON.stringify(req.newValues || {})},
        ${req.ipAddress}, ${req.userAgent}
      )
      RETURNING *
    `;

    if (!row) {
      throw APIError.internal("Failed to create audit log");
    }

    return {
      id: row.id,
      userId: row.user_id,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      oldValues: row.old_values || {},
      newValues: row.new_values || {},
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      timestamp: row.timestamp,
    };
  }
);

export interface GetAuditLogsParams {
  userId?: number;
  action?: string;
  resourceType?: string;
  resourceId?: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface GetAuditLogsResponse {
  logs: AuditLog[];
  total: number;
}

// Retrieves audit logs with filtering options.
export const getAuditLogs = api<GetAuditLogsParams, GetAuditLogsResponse>(
  { expose: true, method: "GET", path: "/audit/logs" },
  async ({ userId, action, resourceType, resourceId, startDate, endDate, limit = 50, offset = 0 }) => {
    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let paramIndex = 1;

    if (userId) {
      whereClause += ` AND user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    if (action) {
      whereClause += ` AND action = $${paramIndex}`;
      params.push(action);
      paramIndex++;
    }

    if (resourceType) {
      whereClause += ` AND resource_type = $${paramIndex}`;
      params.push(resourceType);
      paramIndex++;
    }

    if (resourceId) {
      whereClause += ` AND resource_id = $${paramIndex}`;
      params.push(resourceId);
      paramIndex++;
    }

    if (startDate) {
      whereClause += ` AND timestamp >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereClause += ` AND timestamp <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    const countQuery = `SELECT COUNT(*) as count FROM audit_logs ${whereClause}`;
    const countResult = await auditDB.rawQueryRow(countQuery, ...params);
    const total = countResult?.count || 0;

    const query = `
      SELECT * FROM audit_logs 
      ${whereClause}
      ORDER BY timestamp DESC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const rows = await auditDB.rawQueryAll(query, ...params);

    const logs = rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      oldValues: row.old_values || {},
      newValues: row.new_values || {},
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      timestamp: row.timestamp,
    }));

    return { logs, total };
  }
);
