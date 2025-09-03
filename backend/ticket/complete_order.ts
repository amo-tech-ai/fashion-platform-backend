import { api, APIError } from "encore.dev/api";
import { ticketDB } from "./db";
import type { Ticket } from "./types";

export interface CompleteOrderRequest {
  orderId: number;
  paymentIntentId: string;
}

export interface CompleteOrderResponse {
  tickets: Ticket[];
}

// Completes an order and generates tickets after successful payment.
export const completeOrder = api<CompleteOrderRequest, CompleteOrderResponse>(
  { expose: true, method: "POST", path: "/tickets/orders/complete" },
  async (req) => {
    await using tx = await ticketDB.begin();

    try {
      // Get order details
      const order = await tx.queryRow`
        SELECT * FROM ticket_orders 
        WHERE id = ${req.orderId} AND payment_status = 'pending'
      `;

      if (!order) {
        throw APIError.notFound("Order not found or already processed");
      }

      // Update order status
      await tx.exec`
        UPDATE ticket_orders 
        SET payment_status = 'completed', 
            payment_intent_id = ${req.paymentIntentId},
            updated_at = NOW()
        WHERE id = ${req.orderId}
      `;

      // Get order items
      const orderItems = await tx.queryAll`
        SELECT * FROM order_items WHERE order_id = ${req.orderId}
      `;

      const tickets = [];

      // Generate tickets for each order item
      for (const item of orderItems) {
        for (let i = 0; i < item.quantity; i++) {
          const ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
          const qrCode = `QR-${Date.now()}-${Math.random().toString(36).substr(2, 16).toUpperCase()}`;

          const ticketRow = await tx.queryRow`
            INSERT INTO tickets (
              event_id, tier_id, user_id, ticket_number, qr_code, purchase_price
            )
            VALUES (
              ${order.event_id}, ${item.tier_id}, ${order.user_id}, 
              ${ticketNumber}, ${qrCode}, ${item.unit_price}
            )
            RETURNING *
          `;

          if (ticketRow) {
            tickets.push({
              id: ticketRow.id,
              eventId: ticketRow.event_id,
              tierId: ticketRow.tier_id,
              userId: ticketRow.user_id,
              ticketNumber: ticketRow.ticket_number,
              qrCode: ticketRow.qr_code,
              status: ticketRow.status as any,
              purchasePrice: ticketRow.purchase_price,
              purchaseDate: ticketRow.purchase_date,
              usedAt: ticketRow.used_at,
              createdAt: ticketRow.created_at,
            });
          }
        }
      }

      await tx.commit();
      return { tickets };

    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }
);
