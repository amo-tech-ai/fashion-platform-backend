-- User preferences table
CREATE TABLE user_preferences (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  favorite_designers TEXT[] DEFAULT '{}',
  favorite_venues TEXT[] DEFAULT '{}',
  favorite_event_types TEXT[] DEFAULT '{}',
  notification_preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User booking history view (for easier querying)
CREATE VIEW user_booking_history AS
SELECT 
  b.id as booking_id,
  b.customer_email,
  b.customer_name,
  b.event_id,
  b.ticket_tier_id,
  b.quantity,
  b.total_amount,
  b.booking_code,
  b.status,
  b.created_at as booking_date,
  e.name as event_name,
  e.date as event_date,
  e.venue,
  e.description as event_description,
  e.organizer_id,
  t.name as ticket_tier_name,
  t.price as ticket_price
FROM bookings b
JOIN events e ON b.event_id = e.id
JOIN event_ticket_tiers t ON b.ticket_tier_id = t.id;

-- Indexes for performance
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_bookings_customer_email ON bookings(customer_email);
CREATE INDEX idx_bookings_created_at ON bookings(created_at);
