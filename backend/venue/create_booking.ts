import { api, APIError } from "encore.dev/api";
import { venueDB } from "./db";
import type { VenueBooking } from "./types";

export interface CreateBookingRequest {
  venueId: number;
  eventId?: number;
  bookerId: number;
  startDate: Date;
  endDate: Date;
  bookingNotes?: string;
}

// Creates a new venue booking.
export const createBooking = api<CreateBookingRequest, VenueBooking>(
  { expose: true, method: "POST", path: "/venues/bookings" },
  async (req) => {
    if (req.startDate >= req.endDate) {
      throw APIError.invalidArgument("Start date must be before end date");
    }

    // Check if venue exists and get rates
    const venue = await venueDB.queryRow`
      SELECT id, hourly_rate, daily_rate, is_active FROM venues WHERE id = ${req.venueId}
    `;
    
    if (!venue) {
      throw APIError.notFound("Venue not found");
    }

    if (!venue.is_active) {
      throw APIError.failedPrecondition("Venue is not active");
    }

    // Check for booking conflicts
    const conflict = await venueDB.queryRow`
      SELECT id FROM venue_bookings 
      WHERE venue_id = ${req.venueId} 
        AND status IN ('pending', 'confirmed')
        AND (
          (start_date <= ${req.startDate} AND end_date > ${req.startDate}) OR
          (start_date < ${req.endDate} AND end_date >= ${req.endDate}) OR
          (start_date >= ${req.startDate} AND end_date <= ${req.endDate})
        )
    `;
    
    if (conflict) {
      throw APIError.failedPrecondition("Venue is not available for the requested time period");
    }

    // Calculate total cost
    const durationHours = Math.ceil((req.endDate.getTime() - req.startDate.getTime()) / (1000 * 60 * 60));
    const durationDays = Math.ceil(durationHours / 24);
    
    let totalCost = durationHours * venue.hourly_rate;
    
    // Use daily rate if available and more economical
    if (venue.daily_rate && durationDays * venue.daily_rate < totalCost) {
      totalCost = durationDays * venue.daily_rate;
    }

    const row = await venueDB.queryRow<VenueBooking>`
      INSERT INTO venue_bookings (
        venue_id, event_id, booker_id, start_date, end_date, total_cost, booking_notes
      )
      VALUES (
        ${req.venueId}, ${req.eventId}, ${req.bookerId}, ${req.startDate}, 
        ${req.endDate}, ${totalCost}, ${req.bookingNotes}
      )
      RETURNING *
    `;

    if (!row) {
      throw APIError.internal("Failed to create booking");
    }

    return {
      id: row.id,
      venueId: row.venue_id,
      eventId: row.event_id,
      bookerId: row.booker_id,
      startDate: row.start_date,
      endDate: row.end_date,
      totalCost: row.total_cost,
      status: row.status as any,
      bookingNotes: row.booking_notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
);
