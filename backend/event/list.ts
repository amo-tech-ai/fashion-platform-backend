import { api } from "encore.dev/api";
import { db } from "./db";
import type { Event, EventStatus, EventTicketTier } from "./types";

interface EventWithAvailability extends Event {
  tickets: EventTicketTier[];
  available: number;
  soldOut: boolean;
}

export interface ListEventsResponse {
  events: EventWithAvailability[];
}

// Get events with availability
export const list = api<void, ListEventsResponse>(
  { method: "GET", path: "/events", expose: true },
  async () => {
    const events = await db.queryAll`
      SELECT * FROM events
      WHERE status = 'published' AND date >= NOW()
    `;

    const results: EventWithAvailability[] = [];

    for (const event of events) {
      const tiers = await db.queryAll<EventTicketTier>`
        SELECT * FROM event_ticket_tiers WHERE event_id = ${event.id}
      `;

      const bookingsCountResult = await db.queryRow`
        SELECT SUM(quantity) as count FROM bookings WHERE event_id = ${event.id}
      `;
      const bookingsCount = bookingsCountResult?.count || 0;

      results.push({
        id: event.id,
        name: event.name,
        date: event.date,
        venue: event.venue,
        capacity: event.capacity,
        description: event.description,
        organizerId: event.organizer_id,
        status: event.status as EventStatus,
        createdAt: event.created_at,
        publishedAt: event.published_at,
        tickets: tiers,
        available: event.capacity - bookingsCount,
        soldOut: bookingsCount >= event.capacity,
      });
    }

    return { events: results };
  }
);
