import { api, APIError } from "encore.dev/api";
import { ticketDB } from "./db";
import { payment } from "~encore/clients";
import { notification } from "~encore/clients";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import type { Ticket } from "./types";

const userDB = SQLDatabase.named("user");
const eventDB = SQLDatabase.named("event");

export interface ProcessPaymentRequest {
  orderId: number;
  successUrl: string;
  cancelUrl: string;
}

export interface ProcessPaymentResponse {
  checkoutUrl: string;
  sessionId: string;
}

// Processes payment for a ticket order using Stripe.
export const processPayment = api<ProcessPaymentRequest, ProcessPaymentResponse>(
  { expose: true, method: "POST", path: "/tickets/orders/:orderId/payment" },
  async ({ orderId, successUrl, cancelUrl }) => {
    // Get order details
    const order = await ticketDB.queryRow`
      SELECT * FROM ticket_orders 
      WHERE id = ${orderId} AND payment_status = 'pending'
    `;

    if (!order) {
      throw APIError.notFound("Order not found or already processed");
    }

    // Get user details
    const user = await userDB.queryRow`
      SELECT email FROM users WHERE id = ${order.user_id}
    `;

    if (!user) {
      throw APIError.notFound("User not found");
    }

    try {
      // Create Stripe checkout session
      const checkoutResponse = await payment.createCheckoutSession({
        orderId: order.id,
        amount: order.total_amount,
        currency: "USD",
        successUrl,
        cancelUrl,
        customerEmail: user.email,
      });

      // Update order with session ID
      await ticketDB.exec`
        UPDATE ticket_orders 
        SET stripe_session_id = ${checkoutResponse.sessionId}
        WHERE id = ${orderId}
      `;

      return {
        checkoutUrl: checkoutResponse.url,
        sessionId: checkoutResponse.sessionId,
      };

    } catch (error: any) {
      throw APIError.internal(`Payment processing failed: ${error.message}`);
    }
  }
);

export interface ConfirmPaymentRequest {
  sessionId: string;
}

export interface ConfirmPaymentResponse {
  success: boolean;
  tickets: Ticket[];
  orderNumber: string;
}

// Confirms payment completion and generates tickets.
export const confirmPayment = api<ConfirmPaymentRequest, ConfirmPaymentResponse>(
  { expose: true, method: "POST", path: "/tickets/payment/confirm" },
  async ({ sessionId }) => {
    // Get order by session ID
    const order = await ticketDB.queryRow`
      SELECT * FROM ticket_orders 
      WHERE stripe_session_id = ${sessionId}
    `;

    if (!order) {
      throw APIError.notFound("Order not found");
    }

    if (order.payment_status === 'completed') {
      // Already processed, return existing tickets
      const existingTickets = await ticketDB.queryAll`
        SELECT * FROM tickets WHERE user_id = ${order.user_id} AND event_id = ${order.event_id}
        ORDER BY created_at DESC
      `;

      const tickets = existingTickets.map(row => ({
        id: row.id,
        eventId: row.event_id,
        tierId: row.tier_id,
        userId: row.user_id,
        ticketNumber: row.ticket_number,
        qrCode: row.qr_code,
        status: row.status as any,
        purchasePrice: row.purchase_price,
        purchaseDate: row.purchase_date,
        usedAt: row.used_at,
        createdAt: row.created_at,
      }));

      return {
        success: true,
        tickets,
        orderNumber: order.order_number,
      };
    }

    try {
      // Confirm payment with Stripe
      const paymentConfirmation = await payment.confirmPayment({
        paymentIntentId: sessionId, // Using session ID as payment intent for this example
      });

      // Complete the order and generate tickets
      const completionResponse = await completeOrder({
        orderId: order.id,
        paymentIntentId: paymentConfirmation.orderId.toString(),
      });

      // Get user and event details for notification
      const user = await userDB.queryRow`
        SELECT first_name, last_name, email FROM users WHERE id = ${order.user_id}
      `;

      const event = await eventDB.queryRow`
        SELECT title FROM events WHERE id = ${order.event_id}
      `;

      // Send confirmation email
      if (user && event) {
        await notification.sendTicketConfirmation({
          userEmail: user.email,
          userName: `${user.first_name} ${user.last_name}`,
          eventTitle: event.title,
          ticketCount: completionResponse.tickets.length,
          totalAmount: order.total_amount,
          orderNumber: order.order_number,
        });
      }

      return {
        success: true,
        tickets: completionResponse.tickets,
        orderNumber: order.order_number,
      };

    } catch (error: any) {
      throw APIError.internal(`Payment confirmation failed: ${error.message}`);
    }
  }
);
