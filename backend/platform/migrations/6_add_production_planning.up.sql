-- Production Plans table
CREATE TABLE production_plans (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT REFERENCES events(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  attendee_count INTEGER NOT NULL,
  budget BIGINT NOT NULL,
  timeline_days INTEGER NOT NULL,
  -- Generated specifications
  venue_requirements JSONB,
  staffing_plan JSONB,
  vendor_requirements JSONB,
  success_criteria JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Timeline Milestones
CREATE TABLE plan_timeline_milestones (
  id BIGSERIAL PRIMARY KEY,
  plan_id BIGINT REFERENCES production_plans(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'delayed')),
  assigned_to VARCHAR(255)
);

-- Budget Allocations
CREATE TABLE plan_budget_allocations (
  id BIGSERIAL PRIMARY KEY,
  plan_id BIGINT REFERENCES production_plans(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  allocated_amount DOUBLE PRECISION NOT NULL,
  actual_amount DOUBLE PRECISION DEFAULT 0,
  percentage INTEGER NOT NULL
);

-- Stakeholders
CREATE TABLE plan_stakeholders (
  id BIGSERIAL PRIMARY KEY,
  plan_id BIGINT REFERENCES production_plans(id) ON DELETE CASCADE,
  role VARCHAR(100) NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  responsibilities TEXT
);

-- Link production plan to event
ALTER TABLE events ADD COLUMN production_plan_id BIGINT REFERENCES production_plans(id);
