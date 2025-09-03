import { api } from "encore.dev/api";
import { db } from "./db";
import type { VenueComparison } from "./types";

export interface GetVenueComparisonParams {
  startDate?: string;
  endDate?: string;
}

export interface VenueComparisonResponse {
  venues: VenueComparison[];
  topPerformer: VenueComparison;
  averages: {
    revenuePerEvent: number;
    capacityUtilization: number;
    bookingRate: number;
  };
}

// Compare performance across all venues
export const getComparison = api<GetVenueComparisonParams, VenueComparisonResponse>(
  { method: "GET", path: "/venues/comparison", expose: true },
  async ({ startDate, endDate }) => {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const venueData = await db.queryAll`
      SELECT 
        e.venue,
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
      WHERE e.date >= ${start}
        AND e.date <= ${end}
      GROUP BY e.venue
      HAVING COUNT(DISTINCT e.id) > 0
      ORDER BY total_revenue DESC
    `;

    const venues: VenueComparison[] = venueData.map(v => ({
      venue: v.venue,
      totalEvents: v.total_events,
      totalRevenue: v.total_revenue,
      averageCapacityUtilization: v.avg_capacity_utilization || 0,
      revenuePerEvent: v.total_events > 0 ? v.total_revenue / v.total_events : 0,
      bookingRate: v.total_events > 0 ? v.total_bookings / v.total_events : 0,
    }));

    const topPerformer = venues.length > 0 ? venues[0] : {
      venue: '',
      totalEvents: 0,
      totalRevenue: 0,
      averageCapacityUtilization: 0,
      revenuePerEvent: 0,
      bookingRate: 0,
    };

    const averages = {
      revenuePerEvent: venues.length > 0 ? venues.reduce((sum, v) => sum + v.revenuePerEvent, 0) / venues.length : 0,
      capacityUtilization: venues.length > 0 ? venues.reduce((sum, v) => sum + v.averageCapacityUtilization, 0) / venues.length : 0,
      bookingRate: venues.length > 0 ? venues.reduce((sum, v) => sum + v.bookingRate, 0) / venues.length : 0,
    };

    return {
      venues,
      topPerformer,
      averages,
    };
  }
);
