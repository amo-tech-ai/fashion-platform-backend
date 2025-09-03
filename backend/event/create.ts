import { api, APIError } from "encore.dev/api";
import { eventDB } from "./db";
import type { Event, EventType } from "./types";

export interface CreateEventRequest {
  organizerId: number;
  venueId?: number;
  title: string;
  description?: string;
  eventType: EventType;
  startDate: Date;
  endDate: Date;
  registrationStart: Date;
  registrationEnd: Date;
  maxCapacity: number;
  tags?: string[];
}

// Creates a new event.
export const create = api<CreateEventRequest, Event>(
  { expose: true, method: "POST", path: "/events" },
  async (req) => {
    // Validate dates
    if (req.startDate >= req.endDate) {
      throw APIError.invalidArgument("Start date must be before end date");
    }
    
    if (req.registrationStart >= req.registrationEnd) {
      throw APIError.invalidArgument("Registration start must be before registration end");
    }
    
    if (req.registrationEnd > req.startDate) {
      throw APIError.invalidArgument("Registration must end before event starts");
    }

    const row = await eventDB.queryRow<Event>`
      INSERT INTO events (
        organizer_id, venue_id, title, description, event_type, 
        start_date, end_date, registration_start, registration_end, 
        max_capacity, tags
      )
      VALUES (
        ${req.organizerId}, ${req.venueId}, ${req.title}, ${req.description}, ${req.eventType},
        ${req.startDate}, ${req.endDate}, ${req.registrationStart}, ${req.registrationEnd},
        ${req.maxCapacity}, ${req.tags || []}
      )
      RETURNING *
    `;

    if (!row) {
      throw APIError.internal("Failed to create event");
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
