import { api, APIError } from "encore.dev/api";
import { db } from "./db";

export interface UserPreferences {
  id: number;
  userId: number;
  favoriteDesigners: string[];
  favoriteVenues: string[];
  favoriteEventTypes: string[];
  notificationPreferences: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdatePreferencesRequest {
  userId: number;
  favoriteDesigners?: string[];
  favoriteVenues?: string[];
  favoriteEventTypes?: string[];
  notificationPreferences?: Record<string, any>;
}

export interface GetPreferencesParams {
  userId: number;
}

// Get user preferences
export const getPreferences = api<GetPreferencesParams, UserPreferences>(
  { method: "GET", path: "/users/:userId/preferences" },
  async ({ userId }) => {
    const preferences = await db.queryRow`
      SELECT * FROM user_preferences WHERE user_id = ${userId}
    `;

    if (!preferences) {
      // Create default preferences if none exist
      const defaultPrefs = await db.queryRow`
        INSERT INTO user_preferences (user_id, favorite_designers, favorite_venues, favorite_event_types, notification_preferences)
        VALUES (${userId}, '{}', '{}', '{}', '{}')
        RETURNING *
      `;

      if (!defaultPrefs) {
        throw APIError.internal("Failed to create default preferences");
      }

      return {
        id: defaultPrefs.id,
        userId: defaultPrefs.user_id,
        favoriteDesigners: defaultPrefs.favorite_designers || [],
        favoriteVenues: defaultPrefs.favorite_venues || [],
        favoriteEventTypes: defaultPrefs.favorite_event_types || [],
        notificationPreferences: defaultPrefs.notification_preferences || {},
        createdAt: defaultPrefs.created_at,
        updatedAt: defaultPrefs.updated_at,
      };
    }

    return {
      id: preferences.id,
      userId: preferences.user_id,
      favoriteDesigners: preferences.favorite_designers || [],
      favoriteVenues: preferences.favorite_venues || [],
      favoriteEventTypes: preferences.favorite_event_types || [],
      notificationPreferences: preferences.notification_preferences || {},
      createdAt: preferences.created_at,
      updatedAt: preferences.updated_at,
    };
  }
);

// Update user preferences
export const updatePreferences = api<UpdatePreferencesRequest, UserPreferences>(
  { method: "PUT", path: "/users/preferences" },
  async ({ userId, favoriteDesigners, favoriteVenues, favoriteEventTypes, notificationPreferences }) => {
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (favoriteDesigners !== undefined) {
      updateFields.push(`favorite_designers = $${paramIndex}`);
      updateValues.push(favoriteDesigners);
      paramIndex++;
    }

    if (favoriteVenues !== undefined) {
      updateFields.push(`favorite_venues = $${paramIndex}`);
      updateValues.push(favoriteVenues);
      paramIndex++;
    }

    if (favoriteEventTypes !== undefined) {
      updateFields.push(`favorite_event_types = $${paramIndex}`);
      updateValues.push(favoriteEventTypes);
      paramIndex++;
    }

    if (notificationPreferences !== undefined) {
      updateFields.push(`notification_preferences = $${paramIndex}`);
      updateValues.push(JSON.stringify(notificationPreferences));
      paramIndex++;
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(userId);

    const query = `
      UPDATE user_preferences 
      SET ${updateFields.join(', ')}
      WHERE user_id = $${paramIndex}
      RETURNING *
    `;

    const preferences = await db.rawQueryRow(query, ...updateValues);

    if (!preferences) {
      throw APIError.notFound("User preferences not found");
    }

    return {
      id: preferences.id,
      userId: preferences.user_id,
      favoriteDesigners: preferences.favorite_designers || [],
      favoriteVenues: preferences.favorite_venues || [],
      favoriteEventTypes: preferences.favorite_event_types || [],
      notificationPreferences: preferences.notification_preferences || {},
      createdAt: preferences.created_at,
      updatedAt: preferences.updated_at,
    };
  }
);

// Add item to favorites
export const addToFavorites = api<{ userId: number; type: 'designers' | 'venues' | 'eventTypes'; item: string }, UserPreferences>(
  { method: "POST", path: "/users/preferences/favorites" },
  async ({ userId, type, item }) => {
    const columnMap = {
      designers: 'favorite_designers',
      venues: 'favorite_venues',
      eventTypes: 'favorite_event_types',
    };

    const column = columnMap[type];
    if (!column) {
      throw APIError.invalidArgument("Invalid favorite type");
    }

    const preferences = await db.rawQueryRow(`
      UPDATE user_preferences 
      SET ${column} = array_append(${column}, $1),
          updated_at = NOW()
      WHERE user_id = $2 AND NOT ($1 = ANY(${column}))
      RETURNING *
    `, item, userId);

    if (!preferences) {
      throw APIError.notFound("User preferences not found or item already in favorites");
    }

    return {
      id: preferences.id,
      userId: preferences.user_id,
      favoriteDesigners: preferences.favorite_designers || [],
      favoriteVenues: preferences.favorite_venues || [],
      favoriteEventTypes: preferences.favorite_event_types || [],
      notificationPreferences: preferences.notification_preferences || {},
      createdAt: preferences.created_at,
      updatedAt: preferences.updated_at,
    };
  }
);

// Remove item from favorites
export const removeFromFavorites = api<{ userId: number; type: 'designers' | 'venues' | 'eventTypes'; item: string }, UserPreferences>(
  { method: "DELETE", path: "/users/preferences/favorites" },
  async ({ userId, type, item }) => {
    const columnMap = {
      designers: 'favorite_designers',
      venues: 'favorite_venues',
      eventTypes: 'favorite_event_types',
    };

    const column = columnMap[type];
    if (!column) {
      throw APIError.invalidArgument("Invalid favorite type");
    }

    const preferences = await db.rawQueryRow(`
      UPDATE user_preferences 
      SET ${column} = array_remove(${column}, $1),
          updated_at = NOW()
      WHERE user_id = $2
      RETURNING *
    `, item, userId);

    if (!preferences) {
      throw APIError.notFound("User preferences not found");
    }

    return {
      id: preferences.id,
      userId: preferences.user_id,
      favoriteDesigners: preferences.favorite_designers || [],
      favoriteVenues: preferences.favorite_venues || [],
      favoriteEventTypes: preferences.favorite_event_types || [],
      notificationPreferences: preferences.notification_preferences || {},
      createdAt: preferences.created_at,
      updatedAt: preferences.updated_at,
    };
  }
);
