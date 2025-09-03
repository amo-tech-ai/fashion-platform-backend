-- Users table to store customers and organizers
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'organizer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events table
CREATE TABLE events (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  date TIMESTAMP NOT NULL,
  venue VARCHAR(255) NOT NULL,
  capacity INTEGER NOT NULL,
  description TEXT,
  organizer_id BIGINT NOT NULL REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP
);

-- Ticket tiers table
CREATE TABLE event_ticket_tiers (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  price DOUBLE PRECISION NOT NULL,
  quantity INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Bookings table
CREATE TABLE bookings (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT REFERENCES events(id),
  ticket_tier_id BIGINT REFERENCES event_ticket_tiers(id),
  quantity INTEGER NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  total_amount DOUBLE PRECISION NOT NULL,
  booking_code VARCHAR(20) UNIQUE,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_organizer ON events(organizer_id);
CREATE INDEX idx_bookings_event ON bookings(event_id);
CREATE INDEX idx_bookings_code ON bookings(booking_code);
