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

    if (events.length === 0) {
      return { events: [] };
    }

    const eventIds = events.map(e => e.id);

    const tiers = await db.rawQueryAll<EventTicketTier & { event_id: number }>`
      SELECT * FROM event_ticket_tiers WHERE event_id = ANY(${[eventIds]})
    `;

    const bookingsCounts = await db.rawQueryAll<{ event_id: number; count: number }>`
      SELECT event_id, SUM(quantity) as count 
      FROM bookings 
      WHERE event_id = ANY(${[eventIds]})
      GROUP BY event_id
    `;

    const tiersByEvent = tiers.reduce((acc, tier) => {
      if (!acc[tier.event_id]) {
        acc[tier.event_id] = [];
      }
      acc[tier.event_id].push(tier);
      return acc;
    }, {} as Record<number, EventTicketTier[]>);

    const bookingsCountByEvent = bookingsCounts.reduce((acc, row) => {
      acc[row.event_id] = row.count;
      return acc;
    }, {} as Record<number, number>);

    const results: EventWithAvailability[] = events.map(event => {
      const bookingsCount = bookingsCountByEvent[event.id] || 0;
      return {
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
        tickets: tiersByEvent[event.id] || [],
        available: event.capacity - bookingsCount,
        soldOut: bookingsCount >= event.capacity,
      };
    });

    return { events: results };
  }
);
