import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { venueDB } from "./db";
import type { VenueBooking, BookingStatus } from "./types";

export interface ListBookingsParams {
  venueId?: Query<number>;
  bookerId?: Query<number>;
  status?: Query<BookingStatus>;
  limit?: Query<number>;
  offset?: Query<number>;
}

export interface ListBookingsResponse {
  bookings: VenueBooking[];
  total: number;
}

// Lists venue bookings with optional filtering.
export const listBookings = api<ListBookingsParams, ListBookingsResponse>(
  { expose: true, method: "GET", path: "/venues/bookings" },
  async ({ venueId, bookerId, status, limit = 20, offset = 0 }) => {
    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let paramIndex = 1;

    if (venueId) {
      whereClause += ` AND venue_id = $${paramIndex}`;
      params.push(venueId);
      paramIndex++;
    }

    if (bookerId) {
      whereClause += ` AND booker_id = $${paramIndex}`;
      params.push(bookerId);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    const countQuery = `SELECT COUNT(*) as count FROM venue_bookings ${whereClause}`;
    const countResult = await venueDB.rawQueryRow(countQuery, ...params);
    const total = countResult?.count || 0;

    const query = `
      SELECT * FROM venue_bookings 
      ${whereClause}
      ORDER BY start_date ASC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const rows = await venueDB.rawQueryAll(query, ...params);

    const bookings = rows.map(row => ({
      id: row.id,
      venueId: row.venue_id,
      eventId: row.event_id,
      bookerId: row.booker_id,
      startDate: row.start_date,
      endDate: row.end_date,
      totalCost: row.total_cost,
      status: row.status as BookingStatus,
      bookingNotes: row.booking_notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return { bookings, total };
  }
);
