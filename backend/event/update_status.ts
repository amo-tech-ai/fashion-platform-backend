import { api, APIError } from "encore.dev/api";
import { eventDB } from "./db";
import type { Event, EventStatus, EventType } from "./types";

export interface UpdateEventStatusParams {
  id: number;
}

export interface UpdateEventStatusRequest {
  status: EventStatus;
}

// Updates an event's status.
export const updateStatus = api<UpdateEventStatusParams & UpdateEventStatusRequest, Event>(
  { expose: true, method: "PUT", path: "/events/:id/status" },
  async ({ id, status }) => {
    const row = await eventDB.queryRow`
      UPDATE events 
      SET status = ${status}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
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
