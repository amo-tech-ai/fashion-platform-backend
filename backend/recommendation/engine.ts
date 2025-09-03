import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { db } from "./db";

export interface RecommendedEvent {
  id: number;
  name: string;
  date: Date;
  venue: string;
  capacity: number;
  description?: string;
  organizerId: number;
  status: string;
  createdAt: Date;
  publishedAt?: Date;
  tickets: Array<{
    id: number;
    eventId: number;
    name: string;
    price: number;
    quantity: number;
    createdAt: Date;
  }>;
  available: number;
  soldOut: boolean;
  minPrice: number;
  maxPrice: number;
  recommendationScore: number;
  recommendationReasons: string[];
}

export interface GetRecommendationsParams {
  email: string;
  limit?: Query<number>;
  includeBooked?: Query<boolean>;
}

export interface RecommendationsResponse {
  recommendations: RecommendedEvent[];
  personalizedInsights: {
    favoriteVenues: string[];
    preferredEventTypes: string[];
    averageSpending: number;
    bookingFrequency: string;
  };
}

// Get personalized event recommendations
export const getRecommendations = api<GetRecommendationsParams, RecommendationsResponse>(
  { method: "GET", path: "/recommendations", expose: true },
  async ({ email, limit = 10, includeBooked = false }) => {
    // Get user's booking history and preferences
    const userHistory = await db.rawQueryAll(`
      SELECT 
        venue,
        ticket_tier_name,
        total_amount,
        booking_date,
        event_id
      FROM user_booking_history
      WHERE customer_email = $1
      ORDER BY booking_date DESC
    `, email);

    // Get user preferences if they exist
    const userPrefs = await db.queryRow`
      SELECT * FROM user_preferences up
      JOIN users u ON up.user_id = u.id
      WHERE u.email = ${email}
    `;

    // Calculate user insights
    const venueFrequency = new Map<string, number>();
    const eventTypeFrequency = new Map<string, number>();
    const bookedEventIds = new Set<number>();
    let totalSpent = 0;

    userHistory.forEach(booking => {
      venueFrequency.set(booking.venue, (venueFrequency.get(booking.venue) || 0) + 1);
      eventTypeFrequency.set(booking.ticket_tier_name, (eventTypeFrequency.get(booking.ticket_tier_name) || 0) + 1);
      totalSpent += booking.total_amount;
      bookedEventIds.add(booking.event_id);
    });

    const favoriteVenues = Array.from(venueFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([venue]) => venue);

    const preferredEventTypes = Array.from(eventTypeFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => type);

    const averageSpending = userHistory.length > 0 ? totalSpent / userHistory.length : 0;

    // Get booking frequency
    const daysSinceFirstBooking = userHistory.length > 0 
      ? Math.ceil((Date.now() - new Date(userHistory[userHistory.length - 1].booking_date).getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    
    const bookingFrequency = daysSinceFirstBooking > 0 
      ? userHistory.length / (daysSinceFirstBooking / 30) > 1 
        ? 'frequent' 
        : userHistory.length / (daysSinceFirstBooking / 30) > 0.5 
          ? 'regular' 
          : 'occasional'
      : 'new';

    // Build recommendation query
    let eventFilter = "e.status = 'published' AND e.date >= NOW()";
    if (!includeBooked && bookedEventIds.size > 0) {
      const bookedIds = Array.from(bookedEventIds).join(',');
      eventFilter += ` AND e.id NOT IN (${bookedIds})`;
    }

    // Get all available events with their details
    const events = await db.rawQueryAll(`
      SELECT 
        e.*,
        MIN(t.price) as min_price,
        MAX(t.price) as max_price,
        COALESCE(sold.tickets_sold, 0) as tickets_sold
      FROM events e
      LEFT JOIN event_ticket_tiers t ON e.id = t.event_id
      LEFT JOIN (
        SELECT event_id, SUM(quantity) as tickets_sold
        FROM bookings
        GROUP BY event_id
      ) sold ON e.id = sold.event_id
      WHERE ${eventFilter}
      GROUP BY e.id, e.name, e.date, e.venue, e.capacity, e.description, e.organizer_id, e.status, e.created_at, e.published_at, sold.tickets_sold
      ORDER BY e.date ASC
    `);

    // Score and rank events
    const scoredEvents = await Promise.all(events.map(async (event) => {
      let score = 0;
      const reasons: string[] = [];

      // Venue preference scoring
      if (favoriteVenues.includes(event.venue)) {
        const venueRank = favoriteVenues.indexOf(event.venue);
        score += (3 - venueRank) * 20; // 60, 40, 20 points
        reasons.push(`You've enjoyed events at ${event.venue}`);
      }

      // Get event ticket tiers for type matching
      const eventTiers = await db.rawQueryAll(`
        SELECT name FROM event_ticket_tiers WHERE event_id = $1
      `, event.id);

      // Event type preference scoring
      eventTiers.forEach(tier => {
        if (preferredEventTypes.includes(tier.name)) {
          const typeRank = preferredEventTypes.indexOf(tier.name);
          score += (3 - typeRank) * 15; // 45, 30, 15 points
          reasons.push(`You often book ${tier.name} tickets`);
        }
      });

      // Price preference scoring
      if (averageSpending > 0) {
        const priceDiff = Math.abs(event.min_price - averageSpending) / averageSpending;
        if (priceDiff < 0.3) { // Within 30% of average spending
          score += 25;
          reasons.push('Price matches your usual spending');
        } else if (priceDiff < 0.5) { // Within 50%
          score += 15;
        }
      }

      // User preferences from explicit settings
      if (userPrefs) {
        const favVenues = userPrefs.favorite_venues || [];
        const favTypes = userPrefs.favorite_event_types || [];

        if (favVenues.includes(event.venue)) {
          score += 30;
          reasons.push('One of your favorite venues');
        }

        eventTiers.forEach(tier => {
          if (favTypes.includes(tier.name)) {
            score += 25;
            reasons.push('Matches your preferred event type');
          }
        });
      }

      // Popularity boost (but not too much)
      const soldPercentage = event.capacity > 0 ? (event.tickets_sold / event.capacity) * 100 : 0;
      if (soldPercentage > 50 && soldPercentage < 90) {
        score += 10;
        reasons.push('Popular event with good availability');
      }

      // Recency boost for new events
      const daysSincePublished = event.published_at 
        ? Math.ceil((Date.now() - new Date(event.published_at).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      
      if (daysSincePublished <= 7) {
        score += 15;
        reasons.push('Recently announced event');
      }

      // Time preference (events happening soon but not too soon)
      const daysUntilEvent = Math.ceil((new Date(event.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntilEvent >= 7 && daysUntilEvent <= 60) {
        score += 10;
      }

      return {
        ...event,
        recommendationScore: score,
        recommendationReasons: reasons.slice(0, 3), // Limit to top 3 reasons
      };
    }));

    // Sort by score and get top recommendations
    const topRecommendations = scoredEvents
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, limit);

    // Get ticket details for recommended events
    const recommendations: RecommendedEvent[] = await Promise.all(
      topRecommendations.map(async (event) => {
        const tickets = await db.rawQueryAll(`
          SELECT * FROM event_ticket_tiers WHERE event_id = $1
        `, event.id);

        const available = event.capacity - (event.tickets_sold || 0);

        return {
          id: event.id,
          name: event.name,
          date: event.date,
          venue: event.venue,
          capacity: event.capacity,
          description: event.description,
          organizerId: event.organizer_id,
          status: event.status,
          createdAt: event.created_at,
          publishedAt: event.published_at,
          tickets: tickets.map(t => ({
            id: t.id,
            eventId: t.event_id,
            name: t.name,
            price: t.price,
            quantity: t.quantity,
            createdAt: t.created_at,
          })),
          available,
          soldOut: available <= 0,
          minPrice: event.min_price || 0,
          maxPrice: event.max_price || 0,
          recommendationScore: event.recommendationScore,
          recommendationReasons: event.recommendationReasons,
        };
      })
    );

    return {
      recommendations,
      personalizedInsights: {
        favoriteVenues,
        preferredEventTypes,
        averageSpending,
        bookingFrequency,
      },
    };
  }
);

// Get similar events based on a specific event
export const getSimilarEvents = api<{ eventId: number; email?: string; limit?: Query<number> }, { events: RecommendedEvent[] }>(
  { method: "GET", path: "/recommendations/similar/:eventId", expose: true },
  async ({ eventId, email, limit = 5 }) => {
    // Get the reference event
    const referenceEvent = await db.queryRow`
      SELECT * FROM events WHERE id = ${eventId}
    `;

    if (!referenceEvent) {
      return { events: [] };
    }

    // Get similar events (same venue or similar date range)
    const similarEvents = await db.rawQueryAll(`
      SELECT 
        e.*,
        MIN(t.price) as min_price,
        MAX(t.price) as max_price,
        COALESCE(sold.tickets_sold, 0) as tickets_sold
      FROM events e
      LEFT JOIN event_ticket_tiers t ON e.id = t.event_id
      LEFT JOIN (
        SELECT event_id, SUM(quantity) as tickets_sold
        FROM bookings
        GROUP BY event_id
      ) sold ON e.id = sold.event_id
      WHERE e.id != $1 
        AND e.status = 'published' 
        AND e.date >= NOW()
        AND (
          e.venue = $2 
          OR ABS(EXTRACT(EPOCH FROM (e.date - $3))) < 2592000
        )
      GROUP BY e.id, e.name, e.date, e.venue, e.capacity, e.description, e.organizer_id, e.status, e.created_at, e.published_at, sold.tickets_sold
      ORDER BY 
        CASE WHEN e.venue = $2 THEN 1 ELSE 2 END,
        ABS(EXTRACT(EPOCH FROM (e.date - $3)))
      LIMIT $4
    `, eventId, referenceEvent.venue, referenceEvent.date, limit);

    // Convert to RecommendedEvent format
    const events: RecommendedEvent[] = await Promise.all(
      similarEvents.map(async (event) => {
        const tickets = await db.rawQueryAll(`
          SELECT * FROM event_ticket_tiers WHERE event_id = $1
        `, event.id);

        const available = event.capacity - (event.tickets_sold || 0);
        const reasons: string[] = [];

        if (event.venue === referenceEvent.venue) {
          reasons.push('Same venue');
        }

        const daysDiff = Math.abs((new Date(event.date).getTime() - new Date(referenceEvent.date).getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 30) {
          reasons.push('Similar date');
        }

        return {
          id: event.id,
          name: event.name,
          date: event.date,
          venue: event.venue,
          capacity: event.capacity,
          description: event.description,
          organizerId: event.organizer_id,
          status: event.status,
          createdAt: event.created_at,
          publishedAt: event.published_at,
          tickets: tickets.map(t => ({
            id: t.id,
            eventId: t.event_id,
            name: t.name,
            price: t.price,
            quantity: t.quantity,
            createdAt: t.created_at,
          })),
          available,
          soldOut: available <= 0,
          minPrice: event.min_price || 0,
          maxPrice: event.max_price || 0,
          recommendationScore: event.venue === referenceEvent.venue ? 100 : 50,
          recommendationReasons: reasons,
        };
      })
    );

    return { events };
  }
);
