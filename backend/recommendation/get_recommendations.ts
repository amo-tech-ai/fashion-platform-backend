import { api, APIError } from "encore.dev/api";
import { recommendationDB } from "./db";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import type { EventRecommendation } from "./types";

const eventDB = SQLDatabase.named("event");
const userDB = SQLDatabase.named("user");
const designerDB = SQLDatabase.named("designer");
const venueDB = SQLDatabase.named("venue");

export interface GetRecommendationsParams {
  userId: number;
  limit?: number;
  includeEventDetails?: boolean;
  refreshCache?: boolean;
}

export interface GetRecommendationsResponse {
  recommendations: EventRecommendation[];
  total: number;
  cacheHit: boolean;
}

// Gets personalized event recommendations for a user.
export const getRecommendations = api<GetRecommendationsParams, GetRecommendationsResponse>(
  { expose: true, method: "GET", path: "/recommendations/users/:userId" },
  async ({ userId, limit = 10, includeEventDetails = true, refreshCache = false }) => {
    // Check cache first (unless refresh is requested)
    if (!refreshCache) {
      const cachedRecommendations = await recommendationDB.queryAll`
        SELECT rc.*, e.title, e.description, e.event_type, e.start_date
        FROM recommendation_cache rc
        JOIN events e ON rc.event_id = e.id
        WHERE rc.user_id = ${userId} 
          AND rc.expires_at > NOW()
          AND e.status = 'published'
          AND e.start_date > NOW()
        ORDER BY rc.recommendation_score DESC
        LIMIT ${limit}
      `;

      if (cachedRecommendations.length > 0) {
        const recommendations = await Promise.all(
          cachedRecommendations.map(async (rec) => {
            const eventDetails = includeEventDetails ? await getEventDetails(rec.event_id) : undefined;
            return {
              eventId: rec.event_id,
              score: rec.recommendation_score,
              reason: rec.recommendation_reason || "Personalized recommendation",
              confidence: Math.min(100, rec.recommendation_score * 10),
              eventDetails,
            };
          })
        );

        return {
          recommendations,
          total: recommendations.length,
          cacheHit: true,
        };
      }
    }

    // Generate fresh recommendations
    const recommendations = await generateRecommendations(userId, limit);

    // Cache the recommendations
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    for (const rec of recommendations) {
      await recommendationDB.exec`
        INSERT INTO recommendation_cache (user_id, event_id, recommendation_score, recommendation_reason, expires_at)
        VALUES (${userId}, ${rec.eventId}, ${rec.score}, ${rec.reason}, ${expiresAt})
        ON CONFLICT (user_id, event_id)
        DO UPDATE SET
          recommendation_score = ${rec.score},
          recommendation_reason = ${rec.reason},
          expires_at = ${expiresAt},
          created_at = NOW()
      `;
    }

    // Add event details if requested
    if (includeEventDetails) {
      for (const rec of recommendations) {
        rec.eventDetails = await getEventDetails(rec.eventId);
      }
    }

    return {
      recommendations,
      total: recommendations.length,
      cacheHit: false,
    };
  }
);

async function generateRecommendations(userId: number, limit: number): Promise<EventRecommendation[]> {
  const recommendations: EventRecommendation[] = [];

  // Get user preferences
  const userPrefs = await recommendationDB.queryRow`
    SELECT * FROM user_preferences WHERE user_id = ${userId}
  `;

  // Get user's interaction history
  const userInteractions = await recommendationDB.queryAll`
    SELECT event_id, interaction_type, SUM(interaction_weight) as total_weight
    FROM user_interactions
    WHERE user_id = ${userId}
    GROUP BY event_id, interaction_type
    ORDER BY total_weight DESC
  `;

  // Get similar users
  const similarUsers = await recommendationDB.queryAll`
    SELECT user_b_id, similarity_score
    FROM user_similarity
    WHERE user_a_id = ${userId}
    ORDER BY similarity_score DESC
    LIMIT 20
  `;

  // Get all available events
  const availableEvents = await eventDB.queryAll`
    SELECT e.id, e.title, e.event_type, e.start_date, e.tags, e.is_featured,
           v.city, v.country
    FROM events e
    LEFT JOIN venues v ON e.venue_id = v.id
    WHERE e.status = 'published' 
      AND e.start_date > NOW()
      AND e.id NOT IN (
        SELECT DISTINCT event_id 
        FROM user_interactions 
        WHERE user_id = ${userId} AND interaction_type IN ('purchase', 'attend')
      )
    ORDER BY e.start_date ASC
  `;

  // Score each event
  for (const event of availableEvents) {
    let score = 0;
    let reasons: string[] = [];

    // Content-based filtering
    if (userPrefs) {
      // Event type preference
      if (userPrefs.preferred_event_types?.includes(event.event_type)) {
        score += 20;
        reasons.push("matches your event type preferences");
      }

      // Location preference
      if (userPrefs.preferred_locations?.some(loc => 
        event.city?.toLowerCase().includes(loc.toLowerCase()) ||
        event.country?.toLowerCase().includes(loc.toLowerCase())
      )) {
        score += 15;
        reasons.push("in your preferred location");
      }

      // Day of week preference
      const eventDayOfWeek = new Date(event.start_date).getDay();
      if (userPrefs.preferred_days_of_week?.includes(eventDayOfWeek)) {
        score += 10;
        reasons.push("on your preferred day");
      }
    }

    // Collaborative filtering
    let collaborativeScore = 0;
    for (const similarUser of similarUsers) {
      const similarUserInteraction = await recommendationDB.queryRow`
        SELECT SUM(interaction_weight) as weight
        FROM user_interactions
        WHERE user_id = ${similarUser.user_b_id} AND event_id = ${event.id}
      `;

      if (similarUserInteraction?.weight > 0) {
        collaborativeScore += similarUserInteraction.weight * similarUser.similarity_score;
      }
    }

    if (collaborativeScore > 0) {
      score += Math.min(30, collaborativeScore * 5);
      reasons.push("liked by similar users");
    }

    // Get event features for content similarity
    const eventFeatures = await recommendationDB.queryRow`
      SELECT popularity_score, quality_score, tags
      FROM event_features
      WHERE event_id = ${event.id}
    `;

    if (eventFeatures) {
      // Popularity boost
      score += eventFeatures.popularity_score * 0.2;
      
      // Quality boost
      score += eventFeatures.quality_score * 0.3;

      if (eventFeatures.popularity_score > 50) {
        reasons.push("trending event");
      }
      if (eventFeatures.quality_score > 70) {
        reasons.push("high-quality event");
      }
    }

    // Featured event boost
    if (event.is_featured) {
      score += 15;
      reasons.push("featured event");
    }

    // Time-based scoring
    const daysUntilEvent = Math.ceil((new Date(event.start_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntilEvent <= 7) {
      score += 10; // Boost for upcoming events
      reasons.push("happening soon");
    } else if (daysUntilEvent > 60) {
      score -= 5; // Slight penalty for far future events
    }

    // Add to recommendations if score is meaningful
    if (score > 5) {
      recommendations.push({
        eventId: event.id,
        score,
        reason: reasons.length > 0 ? reasons.join(", ") : "recommended for you",
        confidence: Math.min(100, score),
      });
    }
  }

  // Sort by score and return top recommendations
  recommendations.sort((a, b) => b.score - a.score);
  return recommendations.slice(0, limit);
}

async function getEventDetails(eventId: number) {
  const event = await eventDB.queryRow`
    SELECT e.*, v.name as venue_name, v.city, v.country
    FROM events e
    LEFT JOIN venues v ON e.venue_id = v.id
    WHERE e.id = ${eventId}
  `;

  if (!event) return undefined;

  // Get designers
  const designers = await eventDB.queryAll`
    SELECT d.brand_name
    FROM event_designers ed
    JOIN designers d ON ed.designer_id = d.id
    WHERE ed.event_id = ${eventId}
  `;

  // Get price range
  const priceRange = await eventDB.queryRow`
    SELECT MIN(price) as min_price, MAX(price) as max_price
    FROM ticket_tiers
    WHERE event_id = ${eventId} AND is_active = true
  `;

  return {
    title: event.title,
    description: event.description,
    eventType: event.event_type,
    startDate: event.start_date,
    venue: event.venue_name ? `${event.venue_name}, ${event.city}, ${event.country}` : undefined,
    designers: designers.map(d => d.brand_name),
    priceRange: {
      min: priceRange?.min_price || 0,
      max: priceRange?.max_price || 0,
    },
  };
}

export interface GetTrendingEventsResponse {
  events: EventRecommendation[];
}

// Gets trending events based on popularity metrics.
export const getTrendingEvents = api<{ limit?: number }, GetTrendingEventsResponse>(
  { expose: true, method: "GET", path: "/recommendations/trending" },
  async ({ limit = 10 }) => {
    const trendingEvents = await recommendationDB.queryAll`
      SELECT ef.event_id, ef.popularity_score, ef.quality_score,
             e.title, e.event_type, e.start_date, e.is_featured
      FROM event_features ef
      JOIN events e ON ef.event_id = e.id
      WHERE e.status = 'published' AND e.start_date > NOW()
      ORDER BY ef.popularity_score DESC, ef.quality_score DESC
      LIMIT ${limit}
    `;

    const events = await Promise.all(
      trendingEvents.map(async (event) => {
        const eventDetails = await getEventDetails(event.event_id);
        return {
          eventId: event.event_id,
          score: event.popularity_score,
          reason: "trending now",
          confidence: Math.min(100, event.popularity_score),
          eventDetails,
        };
      })
    );

    return { events };
  }
);
