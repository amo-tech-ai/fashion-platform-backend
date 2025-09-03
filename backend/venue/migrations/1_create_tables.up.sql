CREATE TABLE venues (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  country TEXT NOT NULL,
  postal_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  capacity INTEGER NOT NULL,
  hourly_rate DOUBLE PRECISION NOT NULL,
  daily_rate DOUBLE PRECISION,
  amenities TEXT[],
  images TEXT[],
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE venue_bookings (
  id BIGSERIAL PRIMARY KEY,
  venue_id BIGINT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  event_id BIGINT,
  booker_id BIGINT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  total_cost DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  booking_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE venue_availability (
  id BIGSERIAL PRIMARY KEY,
  venue_id BIGINT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  blocked_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_venues_city ON venues(city);
CREATE INDEX idx_venues_country ON venues(country);
CREATE INDEX idx_venues_capacity ON venues(capacity);
CREATE INDEX idx_venues_active ON venues(is_active);
CREATE INDEX idx_venues_location ON venues(latitude, longitude);
CREATE INDEX idx_venue_bookings_venue_id ON venue_bookings(venue_id);
CREATE INDEX idx_venue_bookings_event_id ON venue_bookings(event_id);
CREATE INDEX idx_venue_bookings_booker_id ON venue_bookings(booker_id);
CREATE INDEX idx_venue_bookings_dates ON venue_bookings(start_date, end_date);
CREATE INDEX idx_venue_bookings_status ON venue_bookings(status);
CREATE INDEX idx_venue_availability_venue_id ON venue_availability(venue_id);
CREATE INDEX idx_venue_availability_date ON venue_availability(date);
CREATE UNIQUE INDEX idx_venue_availability_unique ON venue_availability(venue_id, date);
