import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { db } from "./db";

export interface BookingHistoryItem {
  bookingId: number;
  customerEmail: string;
  customerName: string;
  eventId: number;
  ticketTierId: number;
  quantity: number;
  totalAmount: number;
  bookingCode: string;
  status: string;
  bookingDate: Date;
  eventName: string;
  eventDate: Date;
  venue: string;
  eventDescription?: string;
  organizerId: number;
  ticketTierName: string;
  ticketPrice: number;
}

export interface BookingStats {
  totalBookings: number;
  totalSpent: number;
  favoriteVenue: string;
  mostBookedEventType: string;
  upcomingEvents: number;
  pastEvents: number;
}

export interface GetBookingHistoryParams {
  email: string;
  limit?: Query<number>;
  offset?: Query<number>;
  status?: Query<string>;
  startDate?: Query<string>;
  endDate?: Query<string>;
}

export interface BookingHistoryResponse {
  bookings: BookingHistoryItem[];
  stats: BookingStats;
  total: number;
}

export interface VenueInsight {
  venue: string;
  bookingCount: number;
  totalSpent: number;
  avgSpent: number;
  lastBooking: Date;
}

export interface EventTypeInsight {
  eventType: string;
  bookingCount: number;
  totalSpent: number;
  avgPricePaid: number;
}

export interface BookingPattern {
  dayOfWeek: number;
  hourOfDay: number;
  bookingCount: number;
}

export interface SpendingPattern {
  month: Date;
  bookings: number;
  totalSpent: number;
  avgSpent: number;
}

export interface BookingInsightsResponse {
  venuePreferences: VenueInsight[];
  eventTypePreferences: EventTypeInsight[];
  bookingPatterns: BookingPattern[];
  spendingPatterns: SpendingPattern[];
}

// Get user booking history
export const getBookingHistory = api<GetBookingHistoryParams, BookingHistoryResponse>(
  { method: "GET", path: "/users/booking-history", expose: true },
  async ({ email, limit = 20, offset = 0, status, startDate, endDate }) => {
    // Build the WHERE clause dynamically
    const conditions: string[] = ["customer_email = $1"];
    const params: any[] = [email];
    let paramIndex = 2;

    if (status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (startDate) {
      conditions.push(`booking_date >= $${paramIndex}`);
      params.push(new Date(startDate));
      paramIndex++;
    }

    if (endDate) {
      conditions.push(`booking_date <= $${paramIndex}`);
      params.push(new Date(endDate));
      paramIndex++;
    }

    const whereClause = conditions.join(" AND ");

    // Get bookings with pagination
    const bookingsQuery = `
      SELECT * FROM user_booking_history
      WHERE ${whereClause}
      ORDER BY booking_date DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const bookings = await db.rawQueryAll(bookingsQuery, ...params, limit, offset);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total FROM user_booking_history
      WHERE ${whereClause}
    `;

    const countResult = await db.rawQueryRow(countQuery, ...params);
    const total = countResult?.total || 0;

    // Calculate stats
    const statsQuery = `
      SELECT 
        COUNT(*) as total_bookings,
        SUM(total_amount) as total_spent,
        COUNT(CASE WHEN event_date >= NOW() THEN 1 END) as upcoming_events,
        COUNT(CASE WHEN event_date < NOW() THEN 1 END) as past_events
      FROM user_booking_history
      WHERE customer_email = $1
    `;

    const statsResult = await db.rawQueryRow(statsQuery, email);

    // Get favorite venue
    const favoriteVenueQuery = `
      SELECT venue, COUNT(*) as count
      FROM user_booking_history
      WHERE customer_email = $1
      GROUP BY venue
      ORDER BY count DESC
      LIMIT 1
    `;

    const favoriteVenueResult = await db.rawQueryRow(favoriteVenueQuery, email);

    // Get most booked event type (based on ticket tier names)
    const mostBookedTypeQuery = `
      SELECT ticket_tier_name, COUNT(*) as count
      FROM user_booking_history
      WHERE customer_email = $1
      GROUP BY ticket_tier_name
      ORDER BY count DESC
      LIMIT 1
    `;

    const mostBookedTypeResult = await db.rawQueryRow(mostBookedTypeQuery, email);

    const stats: BookingStats = {
      totalBookings: statsResult?.total_bookings || 0,
      totalSpent: statsResult?.total_spent || 0,
      favoriteVenue: favoriteVenueResult?.venue || 'None',
      mostBookedEventType: mostBookedTypeResult?.ticket_tier_name || 'None',
      upcomingEvents: statsResult?.upcoming_events || 0,
      pastEvents: statsResult?.past_events || 0,
    };

    const bookingHistory: BookingHistoryItem[] = bookings.map(booking => ({
      bookingId: booking.booking_id,
      customerEmail: booking.customer_email,
      customerName: booking.customer_name,
      eventId: booking.event_id,
      ticketTierId: booking.ticket_tier_id,
      quantity: booking.quantity,
      totalAmount: booking.total_amount,
      bookingCode: booking.booking_code,
      status: booking.status,
      bookingDate: booking.booking_date,
      eventName: booking.event_name,
      eventDate: booking.event_date,
      venue: booking.venue,
      eventDescription: booking.event_description,
      organizerId: booking.organizer_id,
      ticketTierName: booking.ticket_tier_name,
      ticketPrice: booking.ticket_price,
    }));

    return {
      bookings: bookingHistory,
      stats,
      total,
    };
  }
);

// Get booking insights for recommendations
export const getBookingInsights = api<{ email: string }, BookingInsightsResponse>(
  { method: "GET", path: "/users/booking-insights" },
  async ({ email }) => {
    // Get venue preferences based on booking history
    const venueInsights = await db.rawQueryAll(`
      SELECT 
        venue,
        COUNT(*) as booking_count,
        SUM(total_amount) as total_spent,
        AVG(total_amount) as avg_spent,
        MAX(booking_date) as last_booking
      FROM user_booking_history
      WHERE customer_email = $1
      GROUP BY venue
      ORDER BY booking_count DESC, total_spent DESC
    `, email);

    // Get event type preferences
    const eventTypeInsights = await db.rawQueryAll(`
      SELECT 
        ticket_tier_name as event_type,
        COUNT(*) as booking_count,
        SUM(total_amount) as total_spent,
        AVG(ticket_price) as avg_price_paid
      FROM user_booking_history
      WHERE customer_email = $1
      GROUP BY ticket_tier_name
      ORDER BY booking_count DESC
    `, email);

    // Get booking patterns (day of week, time preferences)
    const bookingPatterns = await db.rawQueryAll(`
      SELECT 
        EXTRACT(DOW FROM booking_date) as day_of_week,
        EXTRACT(HOUR FROM booking_date) as hour_of_day,
        COUNT(*) as booking_count
      FROM user_booking_history
      WHERE customer_email = $1
      GROUP BY EXTRACT(DOW FROM booking_date), EXTRACT(HOUR FROM booking_date)
      ORDER BY booking_count DESC
    `, email);

    // Get spending patterns
    const spendingPatterns = await db.rawQueryAll(`
      SELECT 
        DATE_TRUNC('month', booking_date) as month,
        COUNT(*) as bookings,
        SUM(total_amount) as total_spent,
        AVG(total_amount) as avg_spent
      FROM user_booking_history
      WHERE customer_email = $1
        AND booking_date >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', booking_date)
      ORDER BY month DESC
    `, email);

    return {
      venuePreferences: venueInsights.map(v => ({
        venue: v.venue,
        bookingCount: v.booking_count,
        totalSpent: v.total_spent,
        avgSpent: v.avg_spent,
        lastBooking: v.last_booking,
      })),
      eventTypePreferences: eventTypeInsights.map(e => ({
        eventType: e.event_type,
        bookingCount: e.booking_count,
        totalSpent: e.total_spent,
        avgPricePaid: e.avg_price_paid,
      })),
      bookingPatterns: bookingPatterns.map(p => ({
        dayOfWeek: p.day_of_week,
        hourOfDay: p.hour_of_day,
        bookingCount: p.booking_count,
      })),
      spendingPatterns: spendingPatterns.map(s => ({
        month: s.month,
        bookings: s.bookings,
        totalSpent: s.total_spent,
        avgSpent: s.avg_spent,
      })),
    };
  }
);
