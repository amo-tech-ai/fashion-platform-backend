import { api, APIError } from "encore.dev/api";
import { eventDB } from "./db";
import type { Event, EventType } from "./types";

export interface GetEventParams {
  id: number;
}

// Retrieves an event by ID.
export const get = api<GetEventParams, Event>(
  { expose: true, method: "GET", path: "/events/:id" },
  async ({ id }) => {
    const row = await eventDB.queryRow`
      SELECT * FROM events WHERE id = ${id}
    `;

    if (!row) {
      throw APIError.notFound("Event not found");
    }

    return {
      id: row.id,
      organizerId: row.organizer_id,
      venueId: row.venue_id,
      title: row.title,
      description: row.description,
      eventType: row.event_type as EventType,
      status: row.status as any,
      startDate: row.start_date,
      endDate: row.end_date,
      registrationStart: row.registration_start,
      registrationEnd: row.registration_end,
      maxCapacity: row.max_capacity,
      isFeatured: row.is_featured,
      tags: row.tags || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
);
