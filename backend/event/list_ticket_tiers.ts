import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { eventDB } from "./db";
import type { TicketTier, TicketTierType } from "./types";

export interface ListTicketTiersParams {
  eventId: number;
  active?: Query<boolean>;
}

export interface ListTicketTiersResponse {
  tiers: TicketTier[];
}

// Lists ticket tiers for an event.
export const listTicketTiers = api<ListTicketTiersParams, ListTicketTiersResponse>(
  { expose: true, method: "GET", path: "/events/:eventId/ticket-tiers" },
  async ({ eventId, active }) => {
    let whereClause = "WHERE event_id = $1";
    const params: any[] = [eventId];
    let paramIndex = 2;

    if (active !== undefined) {
      whereClause += ` AND is_active = $${paramIndex}`;
      params.push(active);
      paramIndex++;
    }

    const query = `
      SELECT * FROM ticket_tiers 
      ${whereClause}
      ORDER BY price ASC
    `;

    const rows = await eventDB.rawQueryAll(query, ...params);

    const tiers = rows.map(row => ({
      id: row.id,
      eventId: row.event_id,
      name: row.name,
      description: row.description,
      tierType: row.tier_type as TicketTierType,
      price: row.price,
      earlyBirdPrice: row.early_bird_price,
      earlyBirdEnd: row.early_bird_end,
      maxQuantity: row.max_quantity,
      soldQuantity: row.sold_quantity,
      isActive: row.is_active,
      createdAt: row.created_at,
    }));

    return { tiers };
  }
);
