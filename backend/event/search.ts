import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { db } from "./db";
import type { Event, EventStatus, EventTicketTier } from "./types";

interface EventWithAvailability extends Event {
  tickets: EventTicketTier[];
  available: number;
  soldOut: boolean;
  minPrice: number;
  maxPrice: number;
}

export interface SearchEventsParams {
  query?: Query<string>;
  venue?: Query<string>;
  startDate?: Query<string>;
  endDate?: Query<string>;
  minPrice?: Query<number>;
  maxPrice?: Query<number>;
  availableOnly?: Query<boolean>;
  eventType?: Query<string>;
  sortBy?: Query<string>;
  sortOrder?: Query<string>;
  limit?: Query<number>;
  offset?: Query<number>;
}

export interface SearchEventsResponse {
  events: EventWithAvailability[];
  total: number;
  filters: {
    venues: string[];
    priceRange: { min: number; max: number };
    eventTypes: string[];
  };
}

// Search events with comprehensive filtering
export const search = api<SearchEventsParams, SearchEventsResponse>(
  { method: "GET", path: "/events/search", expose: true },
  async ({
    query,
    venue,
    startDate,
    endDate,
    minPrice,
    maxPrice,
    availableOnly,
    eventType,
    sortBy = "date",
    sortOrder = "asc",
    limit = 20,
    offset = 0,
  }) => {
    // Build the WHERE clause dynamically
    const conditions: string[] = ["e.status = 'published'"];
    const params: any[] = [];
    let paramIndex = 1;

    // Full-text search on name and description
    if (query) {
      conditions.push(`(
        LOWER(e.name) LIKE LOWER($${paramIndex}) OR 
        LOWER(e.description) LIKE LOWER($${paramIndex + 1})
      )`);
      params.push(`%${query}%`, `%${query}%`);
      paramIndex += 2;
    }

    // Venue filter
    if (venue) {
      conditions.push(`LOWER(e.venue) = LOWER($${paramIndex})`);
      params.push(venue);
      paramIndex++;
    }

    // Date range filters
    if (startDate) {
      conditions.push(`e.date >= $${paramIndex}`);
      params.push(new Date(startDate));
      paramIndex++;
    }

    if (endDate) {
      conditions.push(`e.date <= $${paramIndex}`);
      params.push(new Date(endDate));
      paramIndex++;
    }

    // Build the main query
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    
    // Get events with basic info
    const eventsQuery = `
      SELECT e.*, 
             MIN(t.price) as min_price,
             MAX(t.price) as max_price
      FROM events e
      LEFT JOIN event_ticket_tiers t ON e.id = t.event_id
      ${whereClause}
      GROUP BY e.id, e.name, e.date, e.venue, e.capacity, e.description, e.organizer_id, e.status, e.created_at, e.published_at
    `;

    const events = await db.rawQueryAll(eventsQuery, ...params);

    // Filter by price range if specified
    let filteredEvents = events;
    if (minPrice !== undefined || maxPrice !== undefined) {
      filteredEvents = events.filter(event => {
        const eventMinPrice = event.min_price || 0;
        const eventMaxPrice = event.max_price || 0;
        
        if (minPrice !== undefined && eventMaxPrice < minPrice) return false;
        if (maxPrice !== undefined && eventMinPrice > maxPrice) return false;
        
        return true;
      });
    }

    // Get detailed info for each event
    const results: EventWithAvailability[] = [];
    
    for (const event of filteredEvents) {
      // Get ticket tiers
      const tiers = await db.queryAll<EventTicketTier>`
        SELECT * FROM event_ticket_tiers WHERE event_id = ${event.id}
      `;

      // Get booking count
      const bookingsCountResult = await db.queryRow`
        SELECT SUM(quantity) as count FROM bookings WHERE event_id = ${event.id}
      `;
      const bookingsCount = bookingsCountResult?.count || 0;
      const available = event.capacity - bookingsCount;

      // Apply availability filter
      if (availableOnly && available <= 0) continue;

      // Apply event type filter (based on ticket tier names for now)
      if (eventType) {
        const hasEventType = tiers.some(tier => 
          tier.name.toLowerCase().includes(eventType.toLowerCase())
        );
        if (!hasEventType) continue;
      }

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
        available,
        soldOut: available <= 0,
        minPrice: event.min_price || 0,
        maxPrice: event.max_price || 0,
      });
    }

    // Sort results
    results.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "date":
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "price":
          comparison = a.minPrice - b.minPrice;
          break;
        case "venue":
          comparison = a.venue.localeCompare(b.venue);
          break;
        case "availability":
          comparison = b.available - a.available;
          break;
        default:
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      
      return sortOrder === "desc" ? -comparison : comparison;
    });

    // Apply pagination
    const total = results.length;
    const paginatedResults = results.slice(offset, offset + limit);

    // Get filter options for the frontend
    const allEvents = await db.queryAll`
      SELECT DISTINCT e.venue FROM events e WHERE e.status = 'published'
    `;
    
    const priceRangeResult = await db.queryRow`
      SELECT MIN(t.price) as min_price, MAX(t.price) as max_price
      FROM event_ticket_tiers t
      JOIN events e ON t.event_id = e.id
      WHERE e.status = 'published'
    `;

    const eventTypesResult = await db.queryAll`
      SELECT DISTINCT t.name FROM event_ticket_tiers t
      JOIN events e ON t.event_id = e.id
      WHERE e.status = 'published'
    `;

    return {
      events: paginatedResults,
      total,
      filters: {
        venues: allEvents.map(e => e.venue).sort(),
        priceRange: {
          min: priceRangeResult?.min_price || 0,
          max: priceRangeResult?.max_price || 1000,
        },
        eventTypes: eventTypesResult.map(t => t.name).sort(),
      },
    };
  }
);
