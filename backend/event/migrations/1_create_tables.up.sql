CREATE TABLE events (
  id BIGSERIAL PRIMARY KEY,
  organizer_id BIGINT NOT NULL,
  venue_id BIGINT,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('fashion_show', 'exhibition', 'popup', 'workshop')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  registration_start TIMESTAMP WITH TIME ZONE NOT NULL,
  registration_end TIMESTAMP WITH TIME ZONE NOT NULL,
  max_capacity INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE ticket_tiers (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  tier_type TEXT NOT NULL CHECK (tier_type IN ('general', 'vip', 'press', 'backstage')),
  price DOUBLE PRECISION NOT NULL,
  early_bird_price DOUBLE PRECISION,
  early_bird_end TIMESTAMP WITH TIME ZONE,
  max_quantity INTEGER NOT NULL,
  sold_quantity INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE event_designers (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  designer_id BIGINT NOT NULL,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  showcase_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_organizer_id ON events(organizer_id);
CREATE INDEX idx_events_venue_id ON events(venue_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_featured ON events(is_featured);
CREATE INDEX idx_events_tags ON events USING GIN(tags);
CREATE INDEX idx_ticket_tiers_event_id ON ticket_tiers(event_id);
CREATE INDEX idx_ticket_tiers_active ON ticket_tiers(is_active);
CREATE INDEX idx_event_designers_event_id ON event_designers(event_id);
CREATE INDEX idx_event_designers_designer_id ON event_designers(designer_id);
CREATE UNIQUE INDEX idx_event_designers_unique ON event_designers(event_id, designer_id);
