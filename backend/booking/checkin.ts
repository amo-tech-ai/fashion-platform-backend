import { api, APIError } from "encore.dev/api";
import { db } from "./db";
import type { Booking } from "./types";

export interface CheckInRequest {
  bookingCode: string;
}

// Check in a booking
export const checkIn = api<CheckInRequest, Booking>(
  { method: "POST", path: "/bookings/checkin", expose: true },
  async ({ bookingCode }) => {
    const booking = await db.queryRow`
      UPDATE bookings
      SET status = 'checked_in'
      WHERE booking_code = ${bookingCode} AND status = 'confirmed'
      RETURNING *
    `;

    if (!booking) {
      throw APIError.notFound("Confirmed booking not found or already checked in");
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
    };
  }
);
