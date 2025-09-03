import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { ticketDB } from "./db";
import type { Ticket, TicketStatus } from "./types";

export interface ListUserTicketsParams {
  userId: number;
  status?: Query<TicketStatus>;
  eventId?: Query<number>;
  limit?: Query<number>;
  offset?: Query<number>;
}

export interface ListUserTicketsResponse {
  tickets: Ticket[];
  total: number;
}

// Lists tickets for a user.
export const listUserTickets = api<ListUserTicketsParams, ListUserTicketsResponse>(
  { expose: true, method: "GET", path: "/tickets/users/:userId" },
  async ({ userId, status, eventId, limit = 20, offset = 0 }) => {
    let whereClause = "WHERE user_id = $1";
    const params: any[] = [userId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (eventId) {
      whereClause += ` AND event_id = $${paramIndex}`;
      params.push(eventId);
      paramIndex++;
    }

    const countQuery = `SELECT COUNT(*) as count FROM tickets ${whereClause}`;
    const countResult = await ticketDB.rawQueryRow(countQuery, ...params);
    const total = countResult?.count || 0;

    const query = `
      SELECT * FROM tickets 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const rows = await ticketDB.rawQueryAll(query, ...params);

    const tickets = rows.map(row => ({
      id: row.id,
      eventId: row.event_id,
      tierId: row.tier_id,
      userId: row.user_id,
      ticketNumber: row.ticket_number,
      qrCode: row.qr_code,
      status: row.status as TicketStatus,
      purchasePrice: row.purchase_price,
      purchaseDate: row.purchase_date,
      usedAt: row.used_at,
      createdAt: row.created_at,
    }));

    return { tickets, total };
  }
);
