import { api, APIError } from "encore.dev/api";
import { db } from "./db";
import type { Event, EventTicketTier } from "./types";

export interface GetEventParams {
  id: number;
}

interface EventWithTickets extends Event {
  tickets: EventTicketTier[];
  available: number;
  soldOut: boolean;
}

// Get single event with ticket details
export const get = api<GetEventParams, EventWithTickets>(
  { method: "GET", path: "/events/:id", expose: true },
  async ({ id }) => {
    const event = await db.queryRow`
      SELECT * FROM events WHERE id = ${id}
    `;

    if (!event) {
      throw APIError.notFound("Event not found");
    }

    const [tickets, bookingsCountResult] = await Promise.all([
      db.queryAll<EventTicketTier>`
        SELECT * FROM event_ticket_tiers WHERE event_id = ${id}
      `,
      db.queryRow`
        SELECT SUM(quantity) as count FROM bookings WHERE event_id = ${id}
      `
    ]);
    
    const bookingsCount = bookingsCountResult?.count || 0;

    return {
      id: event.id,
      name: event.name,
      date: event.date,
      venue: event.venue,
      capacity: event.capacity,
      description: event.description,
      organizerId: event.organizer_id,
      status: event.status as any,
      createdAt: event.created_at,
      publishedAt: event.published_at,
      tickets,
      available: event.capacity - bookingsCount,
      soldOut: bookingsCount >= event.capacity,
    };
  }
);
