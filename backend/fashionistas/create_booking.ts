import { api, APIError } from "encore.dev/api";
import { fashionistasDB } from "./db";
import { payment } from "~encore/clients";
import type { FashionistasGroupBooking, FashionistasTicket, Currency } from "./types";

export interface CreateBookingRequest {
  showId: number;
  organizerUserId: number;
  organizerName: string;
  organizerEmail: string;
  organizerPhone?: string;
  currency: Currency;
  tickets: Array<{
    tierId: number;
    seatId?: number;
    attendeeName: string;
    attendeeEmail: string;
    attendeePhone?: string;
    specialRequirements?: string;
  }>;
  promoCode?: string;
  specialRequests?: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CreateBookingResponse {
  booking: FashionistasGroupBooking;
  checkoutUrl: string;
  sessionId: string;
  totalAmount: number;
  currency: Currency;
  discountApplied: number;
}

// Creates a ticket booking and initiates payment.
export const createBooking = api<CreateBookingRequest, CreateBookingResponse>(
  { expose: true, method: "POST", path: "/fashionistas/bookings" },
  async (req) => {
    if (req.tickets.length === 0) {
      throw APIError.invalidArgument("At least one ticket is required");
    }

    await using tx = await fashionistasDB.begin();

    try {
      // Verify show exists and is available
      const show = await tx.queryRow`
        SELECT * FROM fashionistas_shows 
        WHERE id = ${req.showId} AND status = 'published'
      `;

      if (!show) {
        throw APIError.notFound("Show not found or not available for booking");
      }

      // Check if show is in the future
      if (new Date(show.show_date) <= new Date()) {
        throw APIError.failedPrecondition("Cannot book tickets for past shows");
      }

      // Get current pricing phase
      const currentPhase = await tx.queryRow`
        SELECT * FROM fashionistas_pricing_phases 
        WHERE show_id = ${req.showId} 
          AND start_date <= NOW() 
          AND end_date > NOW()
          AND is_active = true
        ORDER BY start_date DESC
        LIMIT 1
      `;

      if (!currentPhase) {
        throw APIError.failedPrecondition("No active pricing phase for this show");
      }

      // Validate tickets and calculate pricing
      let totalAmount = 0;
      const validatedTickets = [];

      for (const ticketReq of req.tickets) {
        // Get tier information
        const tier = await tx.queryRow`
          SELECT * FROM fashionistas_ticket_tiers 
          WHERE id = ${ticketReq.tierId} AND show_id = ${req.showId} AND is_active = true
        `;

        if (!tier) {
          throw APIError.notFound(`Ticket tier ${ticketReq.tierId} not found`);
        }

        // Check availability
        const soldCount = await tx.queryRow`
          SELECT COUNT(*) as count FROM fashionistas_tickets 
          WHERE tier_id = ${ticketReq.tierId} AND status = 'active'
        `;

        if (soldCount && soldCount.count >= tier.max_quantity) {
          throw APIError.resourceExhausted(`${tier.tier_name} is sold out`);
        }

        // Check seat availability if specified
        if (ticketReq.seatId) {
          const seat = await tx.queryRow`
            SELECT * FROM fashionistas_seat_map 
            WHERE id = ${ticketReq.seatId} AND show_id = ${req.showId} AND is_available = true
          `;

          if (!seat) {
            throw APIError.resourceExhausted("Selected seat is not available");
          }

          // Check if seat is already booked
          const existingTicket = await tx.queryRow`
            SELECT id FROM fashionistas_tickets 
            WHERE seat_id = ${ticketReq.seatId} AND status = 'active'
          `;

          if (existingTicket) {
            throw APIError.resourceExhausted("Selected seat is already booked");
          }
        }

        // Calculate price
        let price = req.currency === "USD" ? tier.base_price_usd : tier.base_price_cop;
        
        // Apply phase pricing
        if (currentPhase.discount_percentage > 0) {
          price = price * (1 - currentPhase.discount_percentage / 100);
        } else if (currentPhase.premium_percentage > 0) {
          price = price * (1 + currentPhase.premium_percentage / 100);
        }

        // Apply dynamic pricing based on capacity
        const percentageSold = (soldCount?.count || 0) / tier.max_quantity * 100;
        if (percentageSold >= 70) {
          price *= 1.1; // 10% increase when 70% sold
        }

        // Round price
        if (req.currency === "USD") {
          price = Math.ceil(price / 5) * 5;
        } else {
          price = Math.ceil(price / 10000) * 10000;
        }

        totalAmount += price;
        validatedTickets.push({
          ...ticketReq,
          tier,
          price,
        });
      }

      // Apply group discount for 6+ tickets
      let groupDiscount = 0;
      if (req.tickets.length >= 6) {
        groupDiscount = totalAmount * 0.15; // 15% group discount
        totalAmount -= groupDiscount;
      }

      // Apply promo code if provided
      let promoDiscount = 0;
      if (req.promoCode) {
        const promoValidation = await validatePromoCode({
          code: req.promoCode,
          showId: req.showId,
          tierIds: req.tickets.map(t => t.tierId),
          ticketCount: req.tickets.length,
          currency: req.currency,
        });

        if (promoValidation.isValid) {
          promoDiscount = promoValidation.discountAmount;
          totalAmount = promoValidation.finalAmount;
        }
      }

      const totalDiscount = groupDiscount + promoDiscount;

      // Generate booking reference
      const bookingReference = `FST-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      // Create group booking
      const bookingRow = await tx.queryRow`
        INSERT INTO fashionistas_group_bookings (
          booking_reference, show_id, organizer_user_id, organizer_name, 
          organizer_email, organizer_phone, total_tickets, total_amount_usd, 
          total_amount_cop, currency_used, discount_applied, special_requests
        )
        VALUES (
          ${bookingReference}, ${req.showId}, ${req.organizerUserId}, ${req.organizerName},
          ${req.organizerEmail}, ${req.organizerPhone}, ${req.tickets.length},
          ${req.currency === "USD" ? totalAmount : totalAmount / 4000},
          ${req.currency === "COP" ? totalAmount : totalAmount * 4000},
          ${req.currency}, ${totalDiscount}, ${req.specialRequests}
        )
        RETURNING *
      `;

      if (!bookingRow) {
        throw APIError.internal("Failed to create booking");
      }

      // Reserve seats temporarily (will be confirmed after payment)
      for (const ticket of validatedTickets) {
        if (ticket.seatId) {
          await tx.exec`
            UPDATE fashionistas_seat_map 
            SET is_available = false 
            WHERE id = ${ticket.seatId}
          `;
        }
      }

      await tx.commit();

      // Create Stripe checkout session
      const checkoutResponse = await payment.createCheckoutSession({
        orderId: bookingRow.id,
        amount: totalAmount,
        currency: req.currency,
        successUrl: req.successUrl,
        cancelUrl: req.cancelUrl,
        customerEmail: req.organizerEmail,
      });

      // Update booking with session ID
      await fashionistasDB.exec`
        UPDATE fashionistas_group_bookings 
        SET stripe_payment_intent_id = ${checkoutResponse.sessionId}
        WHERE id = ${bookingRow.id}
      `;

      const booking: FashionistasGroupBooking = {
        id: bookingRow.id,
        bookingReference: bookingRow.booking_reference,
        showId: bookingRow.show_id,
        organizerUserId: bookingRow.organizer_user_id,
        organizerName: bookingRow.organizer_name,
        organizerEmail: bookingRow.organizer_email,
        organizerPhone: bookingRow.organizer_phone,
        totalTickets: bookingRow.total_tickets,
        totalAmountUsd: bookingRow.total_amount_usd,
        totalAmountCop: bookingRow.total_amount_cop,
        currencyUsed: bookingRow.currency_used as Currency,
        discountApplied: bookingRow.discount_applied,
        paymentStatus: bookingRow.payment_status as any,
        stripePaymentIntentId: bookingRow.stripe_payment_intent_id,
        specialRequests: bookingRow.special_requests,
        createdAt: bookingRow.created_at,
        updatedAt: bookingRow.updated_at,
      };

      return {
        booking,
        checkoutUrl: checkoutResponse.url,
        sessionId: checkoutResponse.sessionId,
        totalAmount,
        currency: req.currency,
        discountApplied: totalDiscount,
      };

    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }
);

// Import the validatePromoCode function
import { validatePromoCode } from "./validate_promo_code";
