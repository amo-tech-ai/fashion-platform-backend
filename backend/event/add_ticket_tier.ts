import { api, APIError } from "encore.dev/api";
import { eventDB } from "./db";
import type { TicketTier, TicketTierType } from "./types";

export interface AddTicketTierRequest {
  eventId: number;
  name: string;
  description?: string;
  tierType: TicketTierType;
  price: number;
  earlyBirdPrice?: number;
  earlyBirdEnd?: Date;
  maxQuantity: number;
}

// Adds a new ticket tier to an event.
export const addTicketTier = api<AddTicketTierRequest, TicketTier>(
  { expose: true, method: "POST", path: "/events/ticket-tiers" },
  async (req) => {
    // Verify event exists
    const event = await eventDB.queryRow`
      SELECT id FROM events WHERE id = ${req.eventId}
    `;
    
    if (!event) {
      throw APIError.notFound("Event not found");
    }

    // Validate early bird pricing
    if (req.earlyBirdPrice && req.earlyBirdPrice >= req.price) {
      throw APIError.invalidArgument("Early bird price must be less than regular price");
    }

    const row = await eventDB.queryRow<TicketTier>`
      INSERT INTO ticket_tiers (
        event_id, name, description, tier_type, price, 
        early_bird_price, early_bird_end, max_quantity
      )
      VALUES (
        ${req.eventId}, ${req.name}, ${req.description}, ${req.tierType}, ${req.price},
        ${req.earlyBirdPrice}, ${req.earlyBirdEnd}, ${req.maxQuantity}
      )
      RETURNING *
    `;

    if (!row) {
      throw APIError.internal("Failed to create ticket tier");
    }

    return {
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
    };
  }
);
