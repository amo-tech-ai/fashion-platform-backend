-- Group bookings table
CREATE TABLE group_bookings (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT REFERENCES events(id) ON DELETE CASCADE,
  organizer_email VARCHAR(255) NOT NULL,
  organizer_name VARCHAR(255) NOT NULL,
  group_name VARCHAR(255) NOT NULL,
  estimated_size INTEGER NOT NULL,
  max_size INTEGER NOT NULL,
  invite_code VARCHAR(20) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'locked', 'completed', 'cancelled')),
  seating_preference VARCHAR(50) DEFAULT 'together' CHECK (seating_preference IN ('together', 'scattered', 'no_preference')),
  payment_method VARCHAR(50) DEFAULT 'individual' CHECK (payment_method IN ('individual', 'organizer_pays')),
  discount_percentage DOUBLE PRECISION DEFAULT 0,
  complimentary_tickets INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  locked_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Group booking invitations
CREATE TABLE group_invitations (
  id BIGSERIAL PRIMARY KEY,
  group_booking_id BIGINT REFERENCES group_bookings(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  invited_by VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(group_booking_id, email)
);

-- Group booking members (tracks who has actually booked)
CREATE TABLE group_booking_members (
  id BIGSERIAL PRIMARY KEY,
  group_booking_id BIGINT REFERENCES group_bookings(id) ON DELETE CASCADE,
  booking_id BIGINT REFERENCES bookings(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  ticket_tier_id BIGINT REFERENCES event_ticket_tiers(id),
  quantity INTEGER NOT NULL,
  amount_paid DOUBLE PRECISION NOT NULL,
  discount_applied DOUBLE PRECISION DEFAULT 0,
  is_complimentary BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_booking_id, booking_id)
);

-- Group chat messages
CREATE TABLE group_chat_messages (
  id BIGSERIAL PRIMARY KEY,
  group_booking_id BIGINT REFERENCES group_bookings(id) ON DELETE CASCADE,
  sender_email VARCHAR(255) NOT NULL,
  sender_name VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'reminder')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seating assignments (for venues that support assigned seating)
CREATE TABLE group_seating_assignments (
  id BIGSERIAL PRIMARY KEY,
  group_booking_id BIGINT REFERENCES group_bookings(id) ON DELETE CASCADE,
  booking_id BIGINT REFERENCES bookings(id) ON DELETE CASCADE,
  section VARCHAR(100),
  row_number VARCHAR(10),
  seat_number VARCHAR(10),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add group_booking_id to bookings table
ALTER TABLE bookings ADD COLUMN group_booking_id BIGINT REFERENCES group_bookings(id);

-- Indexes for performance
CREATE INDEX idx_group_bookings_event_id ON group_bookings(event_id);
CREATE INDEX idx_group_bookings_invite_code ON group_bookings(invite_code);
CREATE INDEX idx_group_bookings_organizer_email ON group_bookings(organizer_email);
CREATE INDEX idx_group_invitations_group_booking_id ON group_invitations(group_booking_id);
CREATE INDEX idx_group_invitations_email ON group_invitations(email);
CREATE INDEX idx_group_booking_members_group_booking_id ON group_booking_members(group_booking_id);
CREATE INDEX idx_group_chat_messages_group_booking_id ON group_chat_messages(group_booking_id);
CREATE INDEX idx_bookings_group_booking_id ON bookings(group_booking_id);
