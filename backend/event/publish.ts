import { api, APIError } from "encore.dev/api";
import { db } from "./db";
import type { Event } from "./types";

export interface PublishEventParams {
  id: number;
}

// Publish event
export const publish = api<PublishEventParams, Event>(
  { method: "PUT", path: "/events/:id/publish" },
  async ({ id }) => {
    const event = await db.queryRow`
      UPDATE events
      SET status = 'published', published_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (!event) {
      throw APIError.notFound("Event not found");
    }

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
    };
  }
);
