import { api, APIError } from "encore.dev/api";
import { db } from "./db";
import { notification } from "~encore/clients";
import { bookingTopic } from "./pubsub";
import type { Booking } from "./types";

export interface BookTicketsRequest {
  eventId: number;
  ticketTierId: number;
  quantity: number;
  customerEmail: string;
  customerName: string;
}

// Book tickets for an event
export const book = api<BookTicketsRequest, Booking>(
  { method: "POST", path: "/bookings", expose: true },
  async ({ eventId, ticketTierId, quantity, customerEmail, customerName }) => {
    await using tx = await db.begin();
    try {
      // Check availability
      const tier = await tx.queryRow`
        SELECT t.id, t.name, t.price, t.quantity, COALESCE(b.sold, 0) as sold
        FROM event_ticket_tiers t
        LEFT JOIN (
          SELECT ticket_tier_id, SUM(quantity) as sold
          FROM bookings
          WHERE event_id = ${eventId}
          GROUP BY ticket_tier_id
        ) b ON t.id = b.ticket_tier_id
        WHERE t.id = ${ticketTierId} AND t.event_id = ${eventId}
      `;

      if (!tier) {
        throw APIError.notFound("Ticket tier not found");
      }

      const available = tier.quantity - tier.sold;
      if (available < quantity) {
        throw APIError.resourceExhausted(`Only ${available} tickets available`);
      }

      // Create booking
      const totalAmount = tier.price * quantity;
      const bookingCode = Math.random().toString(36).substring(2, 9).toUpperCase();

      const bookingRow = await tx.queryRow`
        INSERT INTO bookings (event_id, ticket_tier_id, quantity, customer_email, customer_name, total_amount, booking_code, status)
        VALUES (${eventId}, ${ticketTierId}, ${quantity}, ${customerEmail}, ${customerName}, ${totalAmount}, ${bookingCode}, 'confirmed')
        RETURNING *
      `;

      if (!bookingRow) {
        throw APIError.internal("Failed to create booking");
      }

      const booking: Booking = {
        id: bookingRow.id,
        eventId: bookingRow.event_id,
        ticketTierId: bookingRow.ticket_tier_id,
        quantity: bookingRow.quantity,
        customerEmail: bookingRow.customer_email,
        customerName: bookingRow.customer_name,
        totalAmount: bookingRow.total_amount,
        bookingCode: bookingRow.booking_code,
        status: bookingRow.status as any,
        createdAt: bookingRow.created_at,
      };

      // Send confirmation email
      await notification.sendConfirmationEmail({
        bookingCode: booking.bookingCode,
        customerEmail: booking.customerEmail,
        customerName: booking.customerName,
      });

      // Publish to topic for real-time updates
      await bookingTopic.publish(booking);

      await tx.commit();
      return booking;
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }
);
