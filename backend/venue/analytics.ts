import { api } from "encore.dev/api";
import { db } from "./db";
import type { VenueAnalytics, PeakBookingTime, SeasonalTrend, MonthlyMetric, EventPerformance } from "./types";

export interface GetVenueAnalyticsParams {
  venue: string;
  startDate?: string;
  endDate?: string;
}

// Get comprehensive venue analytics
export const getAnalytics = api<GetVenueAnalyticsParams, VenueAnalytics>(
  { method: "GET", path: "/venues/:venue/analytics", expose: true },
  async ({ venue, startDate, endDate }) => {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // Default to 1 year ago
    const end = endDate ? new Date(endDate) : new Date();

    // Basic venue metrics
    const venueMetrics = await db.queryRow`
      SELECT 
        COUNT(DISTINCT e.id) as total_events,
        COALESCE(SUM(b.total_amount), 0) as total_revenue,
        COALESCE(SUM(b.quantity), 0) as total_bookings,
        AVG(CASE WHEN e.capacity > 0 THEN (sold.tickets_sold::float / e.capacity) * 100 ELSE 0 END) as avg_capacity_utilization
      FROM events e
      LEFT JOIN bookings b ON e.id = b.event_id
      LEFT JOIN (
        SELECT event_id, SUM(quantity) as tickets_sold
        FROM bookings
        GROUP BY event_id
      ) sold ON e.id = sold.event_id
      WHERE e.venue = ${venue}
        AND e.date >= ${start}
        AND e.date <= ${end}
    `;

    const totalEvents = venueMetrics?.total_events || 0;
    const totalRevenue = venueMetrics?.total_revenue || 0;
    const totalBookings = venueMetrics?.total_bookings || 0;
    const averageCapacityUtilization = venueMetrics?.avg_capacity_utilization || 0;

    // Calculate booking rate (bookings per event)
    const bookingRate = totalEvents > 0 ? totalBookings / totalEvents : 0;
    const revenuePerEvent = totalEvents > 0 ? totalRevenue / totalEvents : 0;

    // Peak booking times (by hour of day when bookings were made)
    const peakTimesData = await db.queryAll`
      SELECT 
        EXTRACT(HOUR FROM b.created_at) as hour,
        COUNT(*) as booking_count
      FROM bookings b
      JOIN events e ON b.event_id = e.id
      WHERE e.venue = ${venue}
        AND e.date >= ${start}
        AND e.date <= ${end}
      GROUP BY EXTRACT(HOUR FROM b.created_at)
      ORDER BY booking_count DESC
    `;

    const totalPeakBookings = peakTimesData.reduce((sum, p) => sum + p.booking_count, 0);
    const peakBookingTimes: PeakBookingTime[] = peakTimesData.map(p => ({
      hour: p.hour,
      bookingCount: p.booking_count,
      percentage: totalPeakBookings > 0 ? (p.booking_count / totalPeakBookings) * 100 : 0,
    }));

    // Seasonal trends (by month)
    const seasonalData = await db.queryAll`
      SELECT 
        EXTRACT(MONTH FROM e.date) as month,
        COUNT(DISTINCT e.id) as events,
        COALESCE(SUM(b.total_amount), 0) as revenue,
        COALESCE(SUM(b.quantity), 0) as bookings,
        CASE 
          WHEN SUM(b.quantity) > 0 THEN SUM(b.total_amount) / SUM(b.quantity)
          ELSE 0 
        END as avg_ticket_price
      FROM events e
      LEFT JOIN bookings b ON e.id = b.event_id
      WHERE e.venue = ${venue}
        AND e.date >= ${start}
        AND e.date <= ${end}
      GROUP BY EXTRACT(MONTH FROM e.date)
      ORDER BY month
    `;

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const seasonalTrends: SeasonalTrend[] = seasonalData.map(s => ({
      month: s.month,
      monthName: monthNames[s.month - 1],
      events: s.events,
      revenue: s.revenue,
      bookings: s.bookings,
      averageTicketPrice: s.avg_ticket_price,
    }));

    // Monthly metrics for the last 12 months
    const monthlyData = await db.queryAll`
      SELECT 
        TO_CHAR(e.date, 'YYYY-MM') as month,
        COUNT(DISTINCT e.id) as events,
        COALESCE(SUM(b.total_amount), 0) as revenue,
        COALESCE(SUM(b.quantity), 0) as bookings,
        AVG(CASE WHEN e.capacity > 0 THEN (sold.tickets_sold::float / e.capacity) * 100 ELSE 0 END) as capacity_utilization
      FROM events e
      LEFT JOIN bookings b ON e.id = b.event_id
      LEFT JOIN (
        SELECT event_id, SUM(quantity) as tickets_sold
        FROM bookings
        GROUP BY event_id
      ) sold ON e.id = sold.event_id
      WHERE e.venue = ${venue}
        AND e.date >= ${start}
        AND e.date <= ${end}
      GROUP BY TO_CHAR(e.date, 'YYYY-MM')
      ORDER BY month DESC
      LIMIT 12
    `;

    const monthlyMetrics: MonthlyMetric[] = monthlyData.map(m => ({
      month: m.month,
      events: m.events,
      revenue: m.revenue,
      bookings: m.bookings,
      capacityUtilization: m.capacity_utilization || 0,
    }));

    // Event performance details
    const eventPerformanceData = await db.queryAll`
      SELECT 
        e.id,
        e.name,
        e.date,
        e.capacity,
        COALESCE(sold.tickets_sold, 0) as tickets_sold,
        COALESCE(revenue.total_revenue, 0) as revenue,
        CASE WHEN e.capacity > 0 THEN (COALESCE(sold.tickets_sold, 0)::float / e.capacity) * 100 ELSE 0 END as capacity_utilization,
        first_booking.created_at as first_booking_time
      FROM events e
      LEFT JOIN (
        SELECT event_id, SUM(quantity) as tickets_sold
        FROM bookings
        GROUP BY event_id
      ) sold ON e.id = sold.event_id
      LEFT JOIN (
        SELECT event_id, SUM(total_amount) as total_revenue
        FROM bookings
        GROUP BY event_id
      ) revenue ON e.id = revenue.event_id
      LEFT JOIN (
        SELECT event_id, MIN(created_at) as created_at
        FROM bookings
        GROUP BY event_id
      ) first_booking ON e.id = first_booking.event_id
      WHERE e.venue = ${venue}
        AND e.date >= ${start}
        AND e.date <= ${end}
      ORDER BY e.date DESC
    `;

    const eventPerformance: EventPerformance[] = eventPerformanceData.map(e => ({
      eventId: e.id,
      eventName: e.name,
      date: e.date,
      capacity: e.capacity,
      ticketsSold: e.tickets_sold,
      revenue: e.revenue,
      capacityUtilization: e.capacity_utilization,
      selloutTime: e.capacity_utilization >= 100 ? e.first_booking_time : undefined,
    }));

    return {
      venueId: venue,
      venueName: venue,
      totalEvents,
      totalRevenue,
      totalBookings,
      averageCapacityUtilization,
      bookingRate,
      revenuePerEvent,
      peakBookingTimes,
      seasonalTrends,
      monthlyMetrics,
      eventPerformance,
    };
  }
);
