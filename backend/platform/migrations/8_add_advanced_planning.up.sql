-- New Venues table for Prompt 2
CREATE TABLE venues (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  location TEXT,
  capacity_seated INTEGER,
  capacity_standing INTEGER,
  square_footage INTEGER,
  features TEXT[] DEFAULT '{}', -- e.g., 'runway', 'backstage', 'loading_dock'
  tech_specs JSONB, -- e.g., {"power": "3-phase", "lighting_grid": true}
  base_cost DOUBLE PRECISION,
  contact_email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- New Vendors table for Prompt 5
CREATE TABLE vendors (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  category VARCHAR(100) NOT NULL, -- 'catering', 'av', 'photography'
  contact_email VARCHAR(255),
  rating REAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Link vendors to production plans/budgets
CREATE TABLE plan_vendor_contracts (
  id BIGSERIAL PRIMARY KEY,
  plan_id BIGINT REFERENCES production_plans(id) ON DELETE CASCADE,
  budget_allocation_id BIGINT REFERENCES plan_budget_allocations(id),
  vendor_id BIGINT REFERENCES vendors(id),
  contract_value DOUBLE PRECISION NOT NULL,
  contract_document_url VARCHAR(500),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Track payments to vendors
CREATE TABLE vendor_payments (
  id BIGSERIAL PRIMARY KEY,
  contract_id BIGINT REFERENCES plan_vendor_contracts(id) ON DELETE CASCADE,
  amount DOUBLE PRECISION NOT NULL,
  due_date DATE,
  paid_date DATE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add dependencies to timeline milestones for Prompt 4
ALTER TABLE plan_timeline_milestones ADD COLUMN depends_on BIGINT[];
ALTER TABLE plan_timeline_milestones ADD COLUMN duration_days INTEGER DEFAULT 1;

-- Add attendee mix to production plans for Prompt 1
ALTER TABLE production_plans ADD COLUMN attendee_mix JSONB;

-- Add chat to production plans for Prompt 3
CREATE TABLE production_plan_chat_messages (
  id BIGSERIAL PRIMARY KEY,
  plan_id BIGINT REFERENCES production_plans(id) ON DELETE CASCADE,
  sender_id BIGINT REFERENCES users(id),
  sender_name VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add issues to production plans for Prompt 3
CREATE TABLE production_plan_issues (
  id BIGSERIAL PRIMARY KEY,
  plan_id BIGINT REFERENCES production_plans(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  reported_by_id BIGINT REFERENCES users(id),
  assigned_to_id BIGINT REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_venues_name ON venues(name);
CREATE INDEX idx_vendors_name ON vendors(name);
CREATE INDEX idx_vendors_category ON vendors(category);
CREATE INDEX idx_plan_vendor_contracts_plan_id ON plan_vendor_contracts(plan_id);
CREATE INDEX idx_vendor_payments_contract_id ON vendor_payments(contract_id);
CREATE INDEX idx_production_plan_chat_messages_plan_id ON production_plan_chat_messages(plan_id);
CREATE INDEX idx_production_plan_issues_plan_id ON production_plan_issues(plan_id);
CREATE INDEX idx_production_plan_issues_status ON production_plan_issues(status);
