CREATE TABLE event_analytics (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value DOUBLE PRECISION NOT NULL,
  metric_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE designer_analytics (
  id BIGSERIAL PRIMARY KEY,
  designer_id BIGINT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value DOUBLE PRECISION NOT NULL,
  metric_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE venue_analytics (
  id BIGSERIAL PRIMARY KEY,
  venue_id BIGINT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value DOUBLE PRECISION NOT NULL,
  metric_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE sponsor_analytics (
  id BIGSERIAL PRIMARY KEY,
  sponsorship_id BIGINT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value DOUBLE PRECISION NOT NULL,
  metric_date DATE NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_event_analytics_event_id ON event_analytics(event_id);
CREATE INDEX idx_event_analytics_metric_date ON event_analytics(metric_date);
CREATE INDEX idx_event_analytics_metric_name ON event_analytics(metric_name);
CREATE INDEX idx_designer_analytics_designer_id ON designer_analytics(designer_id);
CREATE INDEX idx_designer_analytics_metric_date ON designer_analytics(metric_date);
CREATE INDEX idx_venue_analytics_venue_id ON venue_analytics(venue_id);
CREATE INDEX idx_venue_analytics_metric_date ON venue_analytics(metric_date);
CREATE INDEX idx_sponsor_analytics_sponsorship_id ON sponsor_analytics(sponsorship_id);
CREATE INDEX idx_sponsor_analytics_metric_date ON sponsor_analytics(metric_date);
