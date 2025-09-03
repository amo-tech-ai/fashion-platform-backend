CREATE TABLE fashionistas_shows (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  show_date TIMESTAMP WITH TIME ZONE NOT NULL,
  venue_name TEXT NOT NULL DEFAULT 'Dulcina Medellín',
  venue_address TEXT NOT NULL DEFAULT 'Medellín, Colombia',
  capacity_seated INTEGER NOT NULL DEFAULT 550,
  capacity_standing INTEGER NOT NULL DEFAULT 150,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'sold_out', 'cancelled', 'completed')),
  featured_designers TEXT[],
  teaser_video_url TEXT,
  poster_image_url TEXT,
  whatsapp_group_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE fashionistas_ticket_tiers (
  id BIGSERIAL PRIMARY KEY,
  show_id BIGINT NOT NULL REFERENCES fashionistas_shows(id) ON DELETE CASCADE,
  tier_name TEXT NOT NULL,
  tier_type TEXT NOT NULL CHECK (tier_type IN ('standing', 'standard', 'premium', 'vip', 'table')),
  base_price_usd DOUBLE PRECISION NOT NULL,
  base_price_cop DOUBLE PRECISION NOT NULL,
  max_quantity INTEGER NOT NULL,
  sold_quantity INTEGER NOT NULL DEFAULT 0,
  benefits TEXT[],
  seating_section TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE fashionistas_pricing_phases (
  id BIGSERIAL PRIMARY KEY,
  show_id BIGINT NOT NULL REFERENCES fashionistas_shows(id) ON DELETE CASCADE,
  phase_name TEXT NOT NULL,
  discount_percentage DOUBLE PRECISION NOT NULL DEFAULT 0,
  premium_percentage DOUBLE PRECISION NOT NULL DEFAULT 0,
  max_tickets INTEGER,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE fashionistas_seat_map (
  id BIGSERIAL PRIMARY KEY,
  show_id BIGINT NOT NULL REFERENCES fashionistas_shows(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  row_number TEXT NOT NULL,
  seat_number TEXT NOT NULL,
  tier_id BIGINT NOT NULL REFERENCES fashionistas_ticket_tiers(id),
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  is_accessible BOOLEAN NOT NULL DEFAULT FALSE,
  x_coordinate DOUBLE PRECISION,
  y_coordinate DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE fashionistas_tickets (
  id BIGSERIAL PRIMARY KEY,
  show_id BIGINT NOT NULL REFERENCES fashionistas_shows(id),
  tier_id BIGINT NOT NULL REFERENCES fashionistas_ticket_tiers(id),
  seat_id BIGINT REFERENCES fashionistas_seat_map(id),
  user_id BIGINT NOT NULL,
  ticket_number TEXT NOT NULL UNIQUE,
  qr_code TEXT NOT NULL UNIQUE,
  attendee_name TEXT NOT NULL,
  attendee_email TEXT NOT NULL,
  attendee_phone TEXT,
  purchase_price_usd DOUBLE PRECISION NOT NULL,
  purchase_price_cop DOUBLE PRECISION NOT NULL,
  currency_used TEXT NOT NULL CHECK (currency_used IN ('USD', 'COP')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'cancelled', 'refunded')),
  group_booking_id TEXT,
  special_requirements TEXT,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE fashionistas_group_bookings (
  id BIGSERIAL PRIMARY KEY,
  booking_reference TEXT NOT NULL UNIQUE,
  show_id BIGINT NOT NULL REFERENCES fashionistas_shows(id),
  organizer_user_id BIGINT NOT NULL,
  organizer_name TEXT NOT NULL,
  organizer_email TEXT NOT NULL,
  organizer_phone TEXT,
  total_tickets INTEGER NOT NULL,
  total_amount_usd DOUBLE PRECISION NOT NULL,
  total_amount_cop DOUBLE PRECISION NOT NULL,
  currency_used TEXT NOT NULL CHECK (currency_used IN ('USD', 'COP')),
  discount_applied DOUBLE PRECISION DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  stripe_payment_intent_id TEXT,
  special_requests TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE fashionistas_waitlist (
  id BIGSERIAL PRIMARY KEY,
  show_id BIGINT NOT NULL REFERENCES fashionistas_shows(id),
  tier_id BIGINT NOT NULL REFERENCES fashionistas_ticket_tiers(id),
  user_id BIGINT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  preferred_quantity INTEGER NOT NULL DEFAULT 1,
  max_price_usd DOUBLE PRECISION,
  max_price_cop DOUBLE PRECISION,
  notified BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE fashionistas_promo_codes (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  show_id BIGINT REFERENCES fashionistas_shows(id),
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_usd', 'fixed_cop')),
  discount_value DOUBLE PRECISION NOT NULL,
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  applicable_tiers BIGINT[],
  minimum_tickets INTEGER DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fashionistas_shows_date ON fashionistas_shows(show_date);
CREATE INDEX idx_fashionistas_shows_status ON fashionistas_shows(status);
CREATE INDEX idx_fashionistas_ticket_tiers_show_id ON fashionistas_ticket_tiers(show_id);
CREATE INDEX idx_fashionistas_pricing_phases_show_id ON fashionistas_pricing_phases(show_id);
CREATE INDEX idx_fashionistas_pricing_phases_dates ON fashionistas_pricing_phases(start_date, end_date);
CREATE INDEX idx_fashionistas_seat_map_show_id ON fashionistas_seat_map(show_id);
CREATE INDEX idx_fashionistas_seat_map_available ON fashionistas_seat_map(is_available);
CREATE INDEX idx_fashionistas_tickets_show_id ON fashionistas_tickets(show_id);
CREATE INDEX idx_fashionistas_tickets_user_id ON fashionistas_tickets(user_id);
CREATE INDEX idx_fashionistas_tickets_status ON fashionistas_tickets(status);
CREATE INDEX idx_fashionistas_group_bookings_show_id ON fashionistas_group_bookings(show_id);
CREATE INDEX idx_fashionistas_waitlist_show_tier ON fashionistas_waitlist(show_id, tier_id);
CREATE INDEX idx_fashionistas_promo_codes_code ON fashionistas_promo_codes(code);
CREATE UNIQUE INDEX idx_fashionistas_seat_unique ON fashionistas_seat_map(show_id, section, row_number, seat_number);
