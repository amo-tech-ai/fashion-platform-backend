import { api, APIError } from "encore.dev/api";
import { recommendationDB } from "./db";
import type { UserInteraction, InteractionType } from "./types";

export interface TrackInteractionRequest {
  userId: number;
  eventId: number;
  interactionType: InteractionType;
  metadata?: Record<string, any>;
}

// Tracks user interactions with events for recommendation learning.
export const trackInteraction = api<TrackInteractionRequest, UserInteraction>(
  { expose: true, method: "POST", path: "/recommendations/interactions" },
  async ({ userId, eventId, interactionType, metadata }) => {
    // Define interaction weights
    const interactionWeights: Record<InteractionType, number> = {
      view: 1.0,
      like: 2.0,
      share: 3.0,
      purchase: 5.0,
      attend: 7.0,
    };

    const weight = interactionWeights[interactionType];

    const row = await recommendationDB.queryRow<UserInteraction>`
      INSERT INTO user_interactions (user_id, event_id, interaction_type, interaction_weight)
      VALUES (${userId}, ${eventId}, ${interactionType}, ${weight})
      ON CONFLICT (user_id, event_id, interaction_type) 
      DO UPDATE SET 
        interaction_weight = user_interactions.interaction_weight + ${weight},
        created_at = NOW()
      RETURNING *
    `;

    if (!row) {
      throw APIError.internal("Failed to track interaction");
    }

    // Invalidate recommendation cache for this user
    await recommendationDB.exec`
      DELETE FROM recommendation_cache 
      WHERE user_id = ${userId}
    `;

    return {
      id: row.id,
      userId: row.user_id,
      eventId: row.event_id,
      interactionType: row.interaction_type as InteractionType,
      interactionWeight: row.interaction_weight,
      createdAt: row.created_at,
    };
  }
);

export interface UpdateUserPreferencesRequest {
  userId: number;
  preferredEventTypes?: string[];
  preferredDesigners?: number[];
  preferredLocations?: string[];
  priceRangeMin?: number;
  priceRangeMax?: number;
  preferredDaysOfWeek?: number[];
  preferredTimes?: string[];
}

// Updates user preferences for personalized recommendations.
export const updateUserPreferences = api<UpdateUserPreferencesRequest, void>(
  { expose: true, method: "PUT", path: "/recommendations/preferences" },
  async (req) => {
    await recommendationDB.exec`
      INSERT INTO user_preferences (
        user_id, preferred_event_types, preferred_designers, preferred_locations,
        price_range_min, price_range_max, preferred_days_of_week, preferred_times
      )
      VALUES (
        ${req.userId}, ${req.preferredEventTypes || []}, ${req.preferredDesigners || []}, 
        ${req.preferredLocations || []}, ${req.priceRangeMin}, ${req.priceRangeMax},
        ${req.preferredDaysOfWeek || []}, ${req.preferredTimes || []}
      )
      ON CONFLICT (user_id) 
      DO UPDATE SET
        preferred_event_types = COALESCE(${req.preferredEventTypes}, user_preferences.preferred_event_types),
        preferred_designers = COALESCE(${req.preferredDesigners}, user_preferences.preferred_designers),
        preferred_locations = COALESCE(${req.preferredLocations}, user_preferences.preferred_locations),
        price_range_min = COALESCE(${req.priceRangeMin}, user_preferences.price_range_min),
        price_range_max = COALESCE(${req.priceRangeMax}, user_preferences.price_range_max),
        preferred_days_of_week = COALESCE(${req.preferredDaysOfWeek}, user_preferences.preferred_days_of_week),
        preferred_times = COALESCE(${req.preferredTimes}, user_preferences.preferred_times),
        updated_at = NOW()
    `;

    // Invalidate recommendation cache for this user
    await recommendationDB.exec`
      DELETE FROM recommendation_cache 
      WHERE user_id = ${req.userId}
    `;
  }
);
