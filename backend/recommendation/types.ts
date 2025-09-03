export type InteractionType = "view" | "like" | "share" | "purchase" | "attend";

export interface UserPreferences {
  id: number;
  userId: number;
  preferredEventTypes: string[];
  preferredDesigners: number[];
  preferredLocations: string[];
  priceRangeMin?: number;
  priceRangeMax?: number;
  preferredDaysOfWeek: number[];
  preferredTimes: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserInteraction {
  id: number;
  userId: number;
  eventId: number;
  interactionType: InteractionType;
  interactionWeight: number;
  createdAt: Date;
}

export interface EventFeatures {
  id: number;
  eventId: number;
  featureVector: number[];
  tags: string[];
  popularityScore: number;
  qualityScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSimilarity {
  id: number;
  userAId: number;
  userBId: number;
  similarityScore: number;
  calculatedAt: Date;
}

export interface RecommendationCache {
  id: number;
  userId: number;
  eventId: number;
  recommendationScore: number;
  recommendationReason?: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface EventRecommendation {
  eventId: number;
  score: number;
  reason: string;
  confidence: number;
  eventDetails?: {
    title: string;
    description?: string;
    eventType: string;
    startDate: Date;
    venue?: string;
    designers: string[];
    priceRange: {
      min: number;
      max: number;
    };
  };
}
