import { api, APIError } from "encore.dev/api";
import { db } from "./db";
import type { Booking } from "./types";

export interface GetBookingParams {
  code: string;
}

interface BookingDetails extends Booking {
  eventName: string;
  eventDate: Date;
  venue: string;
  ticketTierName: string;
}

// Get booking details
export const get = api<GetBookingParams, BookingDetails>(
  { method: "GET", path: "/bookings/:code", expose: true },
  async ({ code }) => {
    const booking = await db.queryRow`
      SELECT 
        b.*,
        e.name as event_name,
        e.date as event_date,
        e.venue,
        t.name as ticket_tier_name
      FROM bookings b
      JOIN events e ON b.event_id = e.id
      JOIN event_ticket_tiers t ON b.ticket_tier_id = t.id
      WHERE b.booking_code = ${code}
    `;

    if (!booking) {
      throw APIError.notFound("Booking not found");
    }

    return {
      id: booking.id,
      eventId: booking.event_id,
      ticketTierId: booking.ticket_tier_id,
      quantity: booking.quantity,
      customerEmail: booking.customer_email,
      customerName: booking.customer_name,
      totalAmount: booking.total_amount,
      bookingCode: booking.booking_code,
      status: booking.status as any,
      createdAt: booking.created_at,
      eventName: booking.event_name,
      eventDate: booking.event_date,
      venue: booking.venue,
      ticketTierName: booking.ticket_tier_name,
    };
  }
);
