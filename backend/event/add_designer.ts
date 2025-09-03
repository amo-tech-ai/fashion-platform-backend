import { api, APIError } from "encore.dev/api";
import { eventDB } from "./db";
import type { EventDesigner } from "./types";

export interface AddEventDesignerRequest {
  eventId: number;
  designerId: number;
  isFeatured?: boolean;
  showcaseOrder?: number;
}

// Adds a designer to an event.
export const addDesigner = api<AddEventDesignerRequest, EventDesigner>(
  { expose: true, method: "POST", path: "/events/designers" },
  async (req) => {
    // Verify event exists
    const event = await eventDB.queryRow`
      SELECT id FROM events WHERE id = ${req.eventId}
    `;
    
    if (!event) {
      throw APIError.notFound("Event not found");
    }

    // Check if designer is already added to this event
    const existing = await eventDB.queryRow`
      SELECT id FROM event_designers 
      WHERE event_id = ${req.eventId} AND designer_id = ${req.designerId}
    `;
    
    if (existing) {
      throw APIError.alreadyExists("Designer already added to this event");
    }

    const row = await eventDB.queryRow<EventDesigner>`
      INSERT INTO event_designers (event_id, designer_id, is_featured, showcase_order)
      VALUES (${req.eventId}, ${req.designerId}, ${req.isFeatured || false}, ${req.showcaseOrder})
      RETURNING *
    `;

    if (!row) {
      throw APIError.internal("Failed to add designer to event");
    }

    return {
      id: row.id,
      eventId: row.event_id,
      designerId: row.designer_id,
      isFeatured: row.is_featured,
      showcaseOrder: row.showcase_order,
      createdAt: row.created_at,
    };
  }
);
