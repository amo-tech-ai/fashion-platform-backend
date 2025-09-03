import { api, APIError } from "encore.dev/api";
import { fashionistasDB } from "./db";
import { payment } from "~encore/clients";
import { notification } from "~encore/clients";
import { recommendation } from "~encore/clients";
import type { FashionistasTicket, FashionistasGroupBooking } from "./types";

export interface CompleteBookingRequest {
  sessionId: string;
}

export interface CompleteBookingResponse {
  success: boolean;
  booking: FashionistasGroupBooking;
  tickets: FashionistasTicket[];
  whatsappGroupLink?: string;
}

// Completes booking after successful payment and generates tickets.
export const completeBooking = api<CompleteBookingRequest, CompleteBookingResponse>(
  { expose: true, method: "POST", path: "/fashionistas/bookings/complete" },
  async ({ sessionId }) => {
    // Get booking by session ID
    const booking = await fashionistasDB.queryRow`
      SELECT * FROM fashionistas_group_bookings 
      WHERE stripe_payment_intent_id = ${sessionId}
    `;

    if (!booking) {
      throw APIError.notFound("Booking not found");
    }

    if (booking.payment_status === 'completed') {
      // Already processed, return existing tickets
      const existingTickets = await fashionistasDB.queryAll`
        SELECT * FROM fashionistas_tickets 
        WHERE group_booking_id = ${booking.booking_reference}
        ORDER BY created_at ASC
      `;

      const tickets = existingTickets.map(mapTicketRow);

      return {
        success: true,
        booking: mapBookingRow(booking),
        tickets,
      };
    }

    try {
      // Confirm payment with Stripe
      await payment.confirmPayment({
        paymentIntentId: sessionId,
      });

      await using tx = await fashionistasDB.begin();

      // Update booking status
      await tx.exec`
        UPDATE fashionistas_group_bookings 
        SET payment_status = 'completed', updated_at = NOW()
        WHERE id = ${booking.id}
      `;

      // Get the original booking request data (stored in a separate table or reconstructed)
      // For this example, we'll get the show and tier information
      const show = await tx.queryRow`
        SELECT * FROM fashionistas_shows WHERE id = ${booking.show_id}
      `;

      // Generate tickets
      const tickets: FashionistasTicket[] = [];
      
      // Since we don't have the original ticket details stored, we'll need to reconstruct
      // In a real implementation, you'd store the ticket details during booking creation
      // For now, we'll create tickets based on the booking information
      
      for (let i = 0; i < booking.total_tickets; i++) {
        const ticketNumber = `FST-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        const qrCode = `QR-${Date.now()}-${Math.random().toString(36).substr(2, 16).toUpperCase()}`;

        // For this example, we'll assign to the first available tier
        const availableTier = await tx.queryRow`
          SELECT tt.* FROM fashionistas_ticket_tiers tt
          LEFT JOIN (
            SELECT tier_id, COUNT(*) as sold
            FROM fashionistas_tickets
            WHERE show_id = ${booking.show_id} AND status = 'active'
            GROUP BY tier_id
          ) sold ON tt.id = sold.tier_id
          WHERE tt.show_id = ${booking.show_id} 
            AND tt.is_active = true
            AND COALESCE(sold.sold, 0) < tt.max_quantity
          ORDER BY tt.base_price_usd ASC
          LIMIT 1
        `;

        if (!availableTier) {
          throw APIError.resourceExhausted("No available tickets");
        }

        const ticketRow = await tx.queryRow`
          INSERT INTO fashionistas_tickets (
            show_id, tier_id, user_id, ticket_number, qr_code,
            attendee_name, attendee_email, purchase_price_usd, purchase_price_cop,
            currency_used, group_booking_id
          )
          VALUES (
            ${booking.show_id}, ${availableTier.id}, ${booking.organizer_user_id},
            ${ticketNumber}, ${qrCode}, ${booking.organizer_name}, ${booking.organizer_email},
            ${booking.total_amount_usd / booking.total_tickets}, 
            ${booking.total_amount_cop / booking.total_tickets},
            ${booking.currency_used}, ${booking.booking_reference}
          )
          RETURNING *
        `;

        if (ticketRow) {
          tickets.push(mapTicketRow(ticketRow));
        }
      }

      await tx.commit();

      // Track purchase interaction for recommendations
      await recommendation.trackInteraction({
        userId: booking.organizer_user_id,
        eventId: booking.show_id,
        interactionType: "purchase",
        metadata: {
          ticketCount: booking.total_tickets,
          totalAmount: booking.currency_used === "USD" ? booking.total_amount_usd : booking.total_amount_cop,
          currency: booking.currency_used,
        },
      });

      // Send confirmation email
      await notification.sendTicketConfirmation({
        userEmail: booking.organizer_email,
        userName: booking.organizer_name,
        eventTitle: show?.title || "Fashionistas Show",
        ticketCount: booking.total_tickets,
        totalAmount: booking.currency_used === "USD" ? booking.total_amount_usd : booking.total_amount_cop,
        orderNumber: booking.booking_reference,
      });

      // Update promo code usage if applicable
      // This would require storing which promo code was used during booking

      return {
        success: true,
        booking: mapBookingRow(booking),
        tickets,
        whatsappGroupLink: show?.whatsapp_group_link,
      };

    } catch (error: any) {
      throw APIError.internal(`Booking completion failed: ${error.message}`);
    }
  }
);

function mapBookingRow(row: any): FashionistasGroupBooking {
  return {
    id: row.id,
    bookingReference: row.booking_reference,
    showId: row.show_id,
    organizerUserId: row.organizer_user_id,
    organizerName: row.organizer_name,
    organizerEmail: row.organizer_email,
    organizerPhone: row.organizer_phone,
    totalTickets: row.total_tickets,
    totalAmountUsd: row.total_amount_usd,
    totalAmountCop: row.total_amount_cop,
    currencyUsed: row.currency_used as any,
    discountApplied: row.discount_applied,
    paymentStatus: row.payment_status as any,
    stripePaymentIntentId: row.stripe_payment_intent_id,
    specialRequests: row.special_requests,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTicketRow(row: any): FashionistasTicket {
  return {
    id: row.id,
    showId: row.show_id,
    tierId: row.tier_id,
    seatId: row.seat_id,
    userId: row.user_id,
    ticketNumber: row.ticket_number,
    qrCode: row.qr_code,
    attendeeName: row.attendee_name,
    attendeeEmail: row.attendee_email,
    attendeePhone: row.attendee_phone,
    purchasePriceUsd: row.purchase_price_usd,
    purchasePriceCop: row.purchase_price_cop,
    currencyUsed: row.currency_used as any,
    status: row.status as any,
    groupBookingId: row.group_booking_id,
    specialRequirements: row.special_requirements,
    usedAt: row.used_at,
    createdAt: row.created_at,
  };
}
