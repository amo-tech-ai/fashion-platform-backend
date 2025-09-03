import { api, APIError } from "encore.dev/api";
import { recommendationDB } from "./db";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import type { EventFeatures } from "./types";

const eventDB = SQLDatabase.named("event");
const ticketDB = SQLDatabase.named("ticket");
const designerDB = SQLDatabase.named("designer");

export interface GenerateEventFeaturesRequest {
  eventId: number;
}

// Generates feature vectors for events to enable ML-based recommendations.
export const generateEventFeatures = api<GenerateEventFeaturesRequest, EventFeatures>(
  { expose: true, method: "POST", path: "/recommendations/features/events/:eventId" },
  async ({ eventId }) => {
    // Get event details
    const event = await eventDB.queryRow`
      SELECT e.*, v.city, v.country, v.capacity
      FROM events e
      LEFT JOIN venues v ON e.venue_id = v.id
      WHERE e.id = ${eventId}
    `;

    if (!event) {
      throw APIError.notFound("Event not found");
    }

    // Get event designers
    const eventDesigners = await eventDB.queryAll`
      SELECT ed.designer_id, d.brand_name, d.verification_status
      FROM event_designers ed
      JOIN designers d ON ed.designer_id = d.id
      WHERE ed.event_id = ${eventId}
    `;

    // Get ticket pricing information
    const ticketTiers = await eventDB.queryAll`
      SELECT price, early_bird_price, tier_type, max_quantity, sold_quantity
      FROM ticket_tiers
      WHERE event_id = ${eventId} AND is_active = true
    `;

    // Calculate popularity metrics
    const popularityMetrics = await recommendationDB.queryRow`
      SELECT 
        COUNT(*) as total_interactions,
        COUNT(CASE WHEN interaction_type = 'view' THEN 1 END) as views,
        COUNT(CASE WHEN interaction_type = 'like' THEN 1 END) as likes,
        COUNT(CASE WHEN interaction_type = 'purchase' THEN 1 END) as purchases,
        AVG(interaction_weight) as avg_engagement
      FROM user_interactions
      WHERE event_id = ${eventId}
    `;

    // Generate feature vector
    const features = [];

    // Event type features (one-hot encoding)
    const eventTypes = ['fashion_show', 'exhibition', 'popup', 'workshop'];
    eventTypes.forEach(type => {
      features.push(event.event_type === type ? 1 : 0);
    });

    // Pricing features
    const minPrice = ticketTiers.length > 0 ? Math.min(...ticketTiers.map(t => t.price)) : 0;
    const maxPrice = ticketTiers.length > 0 ? Math.max(...ticketTiers.map(t => t.price)) : 0;
    const avgPrice = ticketTiers.length > 0 ? ticketTiers.reduce((sum, t) => sum + t.price, 0) / ticketTiers.length : 0;
    
    features.push(
      Math.log(minPrice + 1), // Log-normalized prices
      Math.log(maxPrice + 1),
      Math.log(avgPrice + 1)
    );

    // Capacity and venue features
    features.push(
      Math.log((event.capacity || 100) + 1), // Log-normalized capacity
      event.venue_id ? 1 : 0, // Has venue
      event.city ? 1 : 0 // Has location
    );

    // Designer features
    const verifiedDesigners = eventDesigners.filter(d => d.verification_status === 'verified').length;
    const totalDesigners = eventDesigners.length;
    
    features.push(
      totalDesigners,
      verifiedDesigners,
      totalDesigners > 0 ? verifiedDesigners / totalDesigners : 0 // Verification ratio
    );

    // Temporal features
    const now = new Date();
    const eventDate = new Date(event.start_date);
    const daysUntilEvent = Math.max(0, Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const dayOfWeek = eventDate.getDay();
    const hour = eventDate.getHours();
    
    features.push(
      Math.log(daysUntilEvent + 1),
      dayOfWeek / 7, // Normalized day of week
      hour / 24 // Normalized hour
    );

    // Popularity features
    const totalInteractions = popularityMetrics?.total_interactions || 0;
    const views = popularityMetrics?.views || 0;
    const likes = popularityMetrics?.likes || 0;
    const purchases = popularityMetrics?.purchases || 0;
    const avgEngagement = popularityMetrics?.avg_engagement || 0;
    
    features.push(
      Math.log(totalInteractions + 1),
      Math.log(views + 1),
      Math.log(likes + 1),
      Math.log(purchases + 1),
      avgEngagement
    );

    // Calculate scores
    const popularityScore = Math.min(100, totalInteractions * 0.1 + purchases * 2);
    const qualityScore = Math.min(100, 
      (verifiedDesigners * 20) + 
      (event.is_featured ? 30 : 0) + 
      (avgEngagement * 10)
    );

    // Generate tags
    const tags = [
      event.event_type,
      ...event.tags || [],
      ...eventDesigners.map(d => d.brand_name.toLowerCase()),
      event.city?.toLowerCase(),
      event.country?.toLowerCase(),
    ].filter(Boolean);

    const row = await recommendationDB.queryRow<EventFeatures>`
      INSERT INTO event_features (
        event_id, feature_vector, tags, popularity_score, quality_score
      )
      VALUES (
        ${eventId}, ${features}, ${tags}, ${popularityScore}, ${qualityScore}
      )
      ON CONFLICT (event_id)
      DO UPDATE SET
        feature_vector = ${features},
        tags = ${tags},
        popularity_score = ${popularityScore},
        quality_score = ${qualityScore},
        updated_at = NOW()
      RETURNING *
    `;

    if (!row) {
      throw APIError.internal("Failed to generate event features");
    }

    return {
      id: row.id,
      eventId: row.event_id,
      featureVector: row.feature_vector || [],
      tags: row.tags || [],
      popularityScore: row.popularity_score,
      qualityScore: row.quality_score,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
);

export interface BatchGenerateFeaturesResponse {
  processed: number;
  errors: number;
}

// Generates features for all events in batch.
export const batchGenerateFeatures = api<void, BatchGenerateFeaturesResponse>(
  { expose: true, method: "POST", path: "/recommendations/features/batch" },
  async () => {
    // Get all published events
    const events = await eventDB.queryAll`
      SELECT id FROM events WHERE status = 'published'
    `;

    let processed = 0;
    let errors = 0;

    for (const event of events) {
      try {
        await generateEventFeatures({ eventId: event.id });
        processed++;
      } catch (error) {
        errors++;
        console.error(`Failed to generate features for event ${event.id}:`, error);
      }
    }

    return { processed, errors };
  }
);
