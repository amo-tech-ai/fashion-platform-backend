CREATE TABLE tickets (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL,
  tier_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  ticket_number TEXT NOT NULL UNIQUE,
  qr_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'cancelled', 'refunded')),
  purchase_price DOUBLE PRECISION NOT NULL,
  purchase_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE ticket_orders (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  event_id BIGINT NOT NULL,
  order_number TEXT NOT NULL UNIQUE,
  total_amount DOUBLE PRECISION NOT NULL,
  payment_intent_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  stripe_session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES ticket_orders(id) ON DELETE CASCADE,
  tier_id BIGINT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DOUBLE PRECISION NOT NULL,
  total_price DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tickets_event_id ON tickets(event_id);
CREATE INDEX idx_tickets_tier_id ON tickets(tier_id);
CREATE INDEX idx_tickets_user_id ON tickets(user_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_qr_code ON tickets(qr_code);
CREATE INDEX idx_ticket_orders_user_id ON ticket_orders(user_id);
CREATE INDEX idx_ticket_orders_event_id ON ticket_orders(event_id);
CREATE INDEX idx_ticket_orders_payment_status ON ticket_orders(payment_status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_tier_id ON order_items(tier_id);
