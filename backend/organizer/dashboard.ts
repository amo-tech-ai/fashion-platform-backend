import { api, APIError } from "encore.dev/api";
import { db } from "./db";
import type { DashboardMetrics, EventMetric } from "./types";

export interface GetDashboardMetricsParams {
  organizerId: number;
}

// Get dashboard metrics for organizer
export const getDashboardMetrics = api<GetDashboardMetricsParams, DashboardMetrics>(
  { method: "GET", path: "/dashboard/:organizerId" },
  async ({ organizerId }) => {
    // Today's metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStats = await db.queryRow`
      SELECT
        COUNT(*) as bookings,
        COALESCE(SUM(b.total_amount), 0) as revenue
      FROM bookings b
      JOIN events e ON b.event_id = e.id
      WHERE e.organizer_id = ${organizerId}
        AND b.created_at >= ${today}
    `;

    // Upcoming events
    const upcomingEvents = await db.queryAll`
      SELECT * FROM events
      WHERE organizer_id = ${organizerId}
        AND date >= NOW()
      ORDER BY date ASC
      LIMIT 5
    `;

    const eventsWithMetrics: EventMetric[] = [];
    for (const event of upcomingEvents) {
      const tiers = await db.queryAll`
        SELECT * FROM event_ticket_tiers WHERE event_id = ${event.id}
      `;
      const totalTickets = tiers.reduce((sum, t) => sum + t.quantity, 0);

      const bookings = await db.queryAll`
        SELECT quantity, total_amount FROM bookings WHERE event_id = ${event.id}
      `;
      const ticketsSold = bookings.reduce((sum, b) => sum + b.quantity, 0);
      const revenue = bookings.reduce((sum, b) => sum + b.total_amount, 0);

      eventsWithMetrics.push({
        id: event.id,
        name: event.name,
        date: event.date,
        venue: event.venue,
        soldPercentage: totalTickets > 0 ? Math.round((ticketsSold / totalTickets) * 100) : 0,
        ticketsSold,
        totalTickets,
        revenue,
        daysUntil: Math.ceil((new Date(event.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      });
    }

    const totalStats = await db.queryRow`
      SELECT
        COUNT(DISTINCT e.id) as total_events,
        COALESCE(SUM(b.total_amount), 0) as total_revenue
      FROM events e
      LEFT JOIN bookings b ON e.id = b.event_id
      WHERE e.organizer_id = ${organizerId}
    `;

    return {
      today: {
        bookings: todayStats?.bookings || 0,
        revenue: todayStats?.revenue || 0,
      },
      upcomingEvents: eventsWithMetrics,
      totalEvents: totalStats?.total_events || 0,
      totalRevenue: totalStats?.total_revenue || 0,
    };
  }
);
