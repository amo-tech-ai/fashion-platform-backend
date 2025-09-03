import { api, APIError } from "encore.dev/api";
import { db } from "./db";

export interface GetEventAnalyticsParams {
  id: number;
}

export interface TierBreakdown {
  name: string;
  price: number;
  sold: number;
  available: number;
  revenue: number;
}

export interface CustomerInfo {
  customerName: string;
  customerEmail: string;
  quantity: number;
  totalAmount: number;
  createdAt: Date;
  bookingCode: string;
}

export interface EventAnalyticsResponse {
  salesByDay: Array<{ date: string; bookings: number; revenue: number }>;
  tierBreakdown: TierBreakdown[];
  customers: CustomerInfo[];
  totalBookings: number;
  totalRevenue: number;
}

// Get detailed event analytics
export const getAnalytics = api<GetEventAnalyticsParams, EventAnalyticsResponse>(
  { method: "GET", path: "/events/:id/analytics" },
  async ({ id }) => {
    // Sales over time
    const salesByDay = await db.queryAll`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as bookings,
        SUM(total_amount) as revenue
      FROM bookings
      WHERE event_id = ${id}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `;

    // Ticket tier breakdown
    const tierBreakdownData = await db.queryAll`
      SELECT 
        t.id, t.name, t.price, t.quantity,
        COALESCE(b.sold_quantity, 0) as sold
      FROM event_ticket_tiers t
      LEFT JOIN (
        SELECT ticket_tier_id, SUM(quantity) as sold_quantity
        FROM bookings
        WHERE event_id = ${id}
        GROUP BY ticket_tier_id
      ) b ON t.id = b.ticket_tier_id
      WHERE t.event_id = ${id}
    `;

    const tierBreakdown = tierBreakdownData.map(tier => ({
      name: tier.name,
      price: tier.price,
      sold: tier.sold,
      available: tier.quantity - tier.sold,
      revenue: tier.price * tier.sold,
    }));

    // Customer list
    const customers = await db.queryAll`
      SELECT
        customer_name,
        customer_email,
        quantity,
        total_amount,
        created_at,
        booking_code
      FROM bookings
      WHERE event_id = ${id}
      ORDER BY created_at DESC
    `;

    const totalRevenue = customers.reduce((sum, c) => sum + c.total_amount, 0);

    return {
      salesByDay: salesByDay.map(s => ({
        date: new Date(s.date).toISOString().split('T')[0],
        bookings: s.bookings,
        revenue: s.revenue,
      })),
      tierBreakdown,
      customers: customers.map(c => ({
        customerName: c.customer_name,
        customerEmail: c.customer_email,
        quantity: c.quantity,
        totalAmount: c.total_amount,
        createdAt: c.created_at,
        bookingCode: c.booking_code,
      })),
      totalBookings: customers.length,
      totalRevenue,
    };
  }
);
