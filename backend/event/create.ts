import { api, APIError } from "encore.dev/api";
import { db } from "./db";
import type { Event, EventStatus } from "./types";

export interface CreateEventRequest {
  name: string;
  date: Date;
  venue: string;
  capacity: number;
  description: string;
  organizerId: number;
}

// Create a fashion event
export const create = api<CreateEventRequest, Event>(
  { method: "POST", path: "/events" },
  async ({ name, date, venue, capacity, description, organizerId }) => {
    await using tx = await db.begin();

    try {
      const eventRow = await tx.queryRow`
        INSERT INTO events (name, date, venue, capacity, description, organizer_id, status, created_at)
        VALUES (${name}, ${date}, ${venue}, ${capacity}, ${description}, ${organizerId}, 'draft', NOW())
        RETURNING *
      `;

      if (!eventRow) {
        throw APIError.internal("Failed to create event");
      }

      const eventId = eventRow.id;

      // Create default ticket tiers
      await tx.exec`
        INSERT INTO event_ticket_tiers (event_id, name, price, quantity)
        VALUES 
          (${eventId}, 'General', 100, ${Math.floor(capacity * 0.6)}),
          (${eventId}, 'VIP', 250, ${Math.floor(capacity * 0.3)}),
          (${eventId}, 'Press', 0, ${Math.floor(capacity * 0.1)})
      `;

      await tx.commit();

      return {
        id: eventRow.id,
        name: eventRow.name,
        date: eventRow.date,
        venue: eventRow.venue,
        capacity: eventRow.capacity,
        description: eventRow.description,
        organizerId: eventRow.organizer_id,
        status: eventRow.status as EventStatus,
        createdAt: eventRow.created_at,
        publishedAt: eventRow.published_at,
      };
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }
);
