import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { eventDB } from "./db";
import type { Event, EventType, EventStatus } from "./types";

export interface ListEventsParams {
  limit?: Query<number>;
  offset?: Query<number>;
  status?: Query<EventStatus>;
  eventType?: Query<EventType>;
  organizerId?: Query<number>;
  venueId?: Query<number>;
  featured?: Query<boolean>;
  search?: Query<string>;
  tags?: Query<string>;
}

export interface ListEventsResponse {
  events: Event[];
  total: number;
}

// Lists events with optional filtering and pagination.
export const list = api<ListEventsParams, ListEventsResponse>(
  { expose: true, method: "GET", path: "/events" },
  async ({ 
    limit = 20, 
    offset = 0, 
    status, 
    eventType, 
    organizerId, 
    venueId, 
    featured, 
    search, 
    tags 
  }) => {
    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (eventType) {
      whereClause += ` AND event_type = $${paramIndex}`;
      params.push(eventType);
      paramIndex++;
    }

    if (organizerId) {
      whereClause += ` AND organizer_id = $${paramIndex}`;
      params.push(organizerId);
      paramIndex++;
    }

    if (venueId) {
      whereClause += ` AND venue_id = $${paramIndex}`;
      params.push(venueId);
      paramIndex++;
    }

    if (featured !== undefined) {
      whereClause += ` AND is_featured = $${paramIndex}`;
      params.push(featured);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (tags) {
      whereClause += ` AND tags && $${paramIndex}`;
      params.push([tags]);
      paramIndex++;
    }

    const countQuery = `SELECT COUNT(*) as count FROM events ${whereClause}`;
    const countResult = await eventDB.rawQueryRow(countQuery, ...params);
    const total = countResult?.count || 0;

    const query = `
      SELECT * FROM events 
      ${whereClause}
      ORDER BY start_date ASC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const rows = await eventDB.rawQueryAll(query, ...params);

    const events = rows.map(row => ({
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
    }));

    return { events, total };
  }
);
