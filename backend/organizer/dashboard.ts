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

    const totalStats = await db.queryRow`
      SELECT
        COUNT(DISTINCT e.id) as total_events,
        COALESCE(SUM(b.total_amount), 0) as total_revenue
      FROM events e
      LEFT JOIN bookings b ON e.id = b.event_id
      WHERE e.organizer_id = ${organizerId}
    `;

    if (upcomingEvents.length === 0) {
      return {
        today: {
          bookings: todayStats?.bookings || 0,
          revenue: todayStats?.revenue || 0,
        },
        upcomingEvents: [],
        totalEvents: totalStats?.total_events || 0,
        totalRevenue: totalStats?.total_revenue || 0,
      };
    }

    const eventIds = upcomingEvents.map(e => e.id);

    const tiersByEvent = await db.rawQueryAll`
      SELECT event_id, SUM(quantity) as total_tickets
      FROM event_ticket_tiers
      WHERE event_id = ANY(${[eventIds]})
      GROUP BY event_id
    `;

    const bookingsByEvent = await db.rawQueryAll`
      SELECT event_id, SUM(quantity) as tickets_sold, SUM(total_amount) as revenue
      FROM bookings
      WHERE event_id = ANY(${[eventIds]})
      GROUP BY event_id
    `;

    const tiersMap = tiersByEvent.reduce((acc, row) => {
      acc[row.event_id] = row.total_tickets;
      return acc;
    }, {} as Record<number, number>);

    const bookingsMap = bookingsByEvent.reduce((acc, row) => {
      acc[row.event_id] = { ticketsSold: row.tickets_sold, revenue: row.revenue };
      return acc;
    }, {} as Record<number, { ticketsSold: number; revenue: number }>);

    const eventsWithMetrics: EventMetric[] = upcomingEvents.map(event => {
      const totalTickets = tiersMap[event.id] || 0;
      const { ticketsSold, revenue } = bookingsMap[event.id] || { ticketsSold: 0, revenue: 0 };
      
      return {
        id: event.id,
        name: event.name,
        date: event.date,
        venue: event.venue,
        soldPercentage: totalTickets > 0 ? Math.round((ticketsSold / totalTickets) * 100) : 0,
        ticketsSold,
        totalTickets,
        revenue,
        daysUntil: Math.ceil((new Date(event.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      };
    });

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
