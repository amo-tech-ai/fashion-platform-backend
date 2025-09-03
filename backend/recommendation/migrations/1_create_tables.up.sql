CREATE TABLE user_preferences (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  preferred_event_types TEXT[],
  preferred_designers BIGINT[],
  preferred_locations TEXT[],
  price_range_min DOUBLE PRECISION,
  price_range_max DOUBLE PRECISION,
  preferred_days_of_week INTEGER[],
  preferred_times TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE user_interactions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  event_id BIGINT NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'like', 'share', 'purchase', 'attend')),
  interaction_weight DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE event_features (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL,
  feature_vector DOUBLE PRECISION[],
  tags TEXT[],
  popularity_score DOUBLE PRECISION DEFAULT 0.0,
  quality_score DOUBLE PRECISION DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE user_similarity (
  id BIGSERIAL PRIMARY KEY,
  user_a_id BIGINT NOT NULL,
  user_b_id BIGINT NOT NULL,
  similarity_score DOUBLE PRECISION NOT NULL,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE recommendation_cache (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  event_id BIGINT NOT NULL,
  recommendation_score DOUBLE PRECISION NOT NULL,
  recommendation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX idx_user_interactions_event_id ON user_interactions(event_id);
CREATE INDEX idx_user_interactions_type ON user_interactions(interaction_type);
CREATE INDEX idx_event_features_event_id ON event_features(event_id);
CREATE INDEX idx_user_similarity_user_a ON user_similarity(user_a_id);
CREATE INDEX idx_user_similarity_user_b ON user_similarity(user_b_id);
CREATE INDEX idx_user_similarity_score ON user_similarity(similarity_score);
CREATE INDEX idx_recommendation_cache_user_id ON recommendation_cache(user_id);
CREATE INDEX idx_recommendation_cache_expires ON recommendation_cache(expires_at);
CREATE UNIQUE INDEX idx_user_preferences_unique ON user_preferences(user_id);
CREATE UNIQUE INDEX idx_event_features_unique ON event_features(event_id);
CREATE UNIQUE INDEX idx_user_similarity_unique ON user_similarity(user_a_id, user_b_id);
CREATE UNIQUE INDEX idx_recommendation_cache_unique ON recommendation_cache(user_id, event_id);
