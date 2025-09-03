import { api, APIError } from "encore.dev/api";
import { ticketDB } from "./db";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import type { TicketOrder, OrderItem } from "./types";

const eventDB = SQLDatabase.named("event");

export interface CreateOrderRequest {
  userId: number;
  eventId: number;
  items: {
    tierId: number;
    quantity: number;
  }[];
}

export interface CreateOrderResponse {
  order: TicketOrder;
  items: OrderItem[];
}

// Creates a new ticket order.
export const createOrder = api<CreateOrderRequest, CreateOrderResponse>(
  { expose: true, method: "POST", path: "/tickets/orders" },
  async (req) => {
    if (req.items.length === 0) {
      throw APIError.invalidArgument("Order must contain at least one item");
    }

    // Start transaction
    await using tx = await ticketDB.begin();

    try {
      // Verify event exists and is published
      const event = await eventDB.queryRow`
        SELECT id, status, registration_start, registration_end 
        FROM events 
        WHERE id = ${req.eventId}
      `;
      
      if (!event) {
        throw APIError.notFound("Event not found");
      }
      
      if (event.status !== 'published') {
        throw APIError.failedPrecondition("Event is not available for registration");
      }

      const now = new Date();
      if (now < event.registration_start || now > event.registration_end) {
        throw APIError.failedPrecondition("Registration is not currently open for this event");
      }

      // Verify ticket tiers and calculate pricing
      let totalAmount = 0;
      const validatedItems = [];

      for (const item of req.items) {
        const tier = await eventDB.queryRow`
          SELECT id, name, price, early_bird_price, early_bird_end, 
                 max_quantity, sold_quantity, is_active
          FROM ticket_tiers 
          WHERE id = ${item.tierId} AND event_id = ${req.eventId}
        `;

        if (!tier || !tier.is_active) {
          throw APIError.notFound(`Ticket tier ${item.tierId} not found or inactive`);
        }

        // Check availability
        const availableQuantity = tier.max_quantity - tier.sold_quantity;
        if (item.quantity > availableQuantity) {
          throw APIError.resourceExhausted(`Only ${availableQuantity} tickets available for ${tier.name}`);
        }

        // Calculate price (early bird if applicable)
        let unitPrice = tier.price;
        if (tier.early_bird_price && tier.early_bird_end && now <= tier.early_bird_end) {
          unitPrice = tier.early_bird_price;
        }

        const itemTotal = unitPrice * item.quantity;
        totalAmount += itemTotal;

        validatedItems.push({
          tierId: item.tierId,
          quantity: item.quantity,
          unitPrice,
          totalPrice: itemTotal,
        });

        // Update sold quantity
        await eventDB.exec`
          UPDATE ticket_tiers 
          SET sold_quantity = sold_quantity + ${item.quantity}
          WHERE id = ${item.tierId}
        `;
      }

      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Create order
      const orderRow = await tx.queryRow`
        INSERT INTO ticket_orders (user_id, event_id, order_number, total_amount)
        VALUES (${req.userId}, ${req.eventId}, ${orderNumber}, ${totalAmount})
        RETURNING *
      `;

      if (!orderRow) {
        throw APIError.internal("Failed to create order");
      }

      // Create order items
      const orderItems = [];
      for (const item of validatedItems) {
        const itemRow = await tx.queryRow`
          INSERT INTO order_items (order_id, tier_id, quantity, unit_price, total_price)
          VALUES (${orderRow.id}, ${item.tierId}, ${item.quantity}, ${item.unitPrice}, ${item.totalPrice})
          RETURNING *
        `;

        if (itemRow) {
          orderItems.push({
            id: itemRow.id,
            orderId: itemRow.order_id,
            tierId: itemRow.tier_id,
            quantity: itemRow.quantity,
            unitPrice: itemRow.unit_price,
            totalPrice: itemRow.total_price,
            createdAt: itemRow.created_at,
          });
        }
      }

      await tx.commit();

      const order = {
        id: orderRow.id,
        userId: orderRow.user_id,
        eventId: orderRow.event_id,
        orderNumber: orderRow.order_number,
        totalAmount: orderRow.total_amount,
        paymentIntentId: orderRow.payment_intent_id,
        paymentStatus: orderRow.payment_status as any,
        stripeSessionId: orderRow.stripe_session_id,
        createdAt: orderRow.created_at,
        updatedAt: orderRow.updated_at,
      };

      return { order, items: orderItems };

    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }
);
