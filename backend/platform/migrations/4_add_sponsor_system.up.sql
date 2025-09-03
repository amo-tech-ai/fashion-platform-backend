-- Sponsor companies table
CREATE TABLE sponsor_companies (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  industry VARCHAR(100) NOT NULL,
  website VARCHAR(255),
  company_size VARCHAR(50) CHECK (company_size IN ('startup', 'small', 'medium', 'large', 'enterprise')),
  annual_revenue BIGINT,
  headquarters_location VARCHAR(255),
  description TEXT,
  logo_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sponsor leads table
CREATE TABLE sponsor_leads (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT REFERENCES sponsor_companies(id),
  contact_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50),
  job_title VARCHAR(255),
  budget_range VARCHAR(50) CHECK (budget_range IN ('under_5k', '5k_15k', '15k_50k', '50k_100k', 'over_100k')),
  objectives TEXT[],
  preferred_events TEXT[],
  timeline VARCHAR(50) CHECK (timeline IN ('immediate', 'next_month', 'next_quarter', 'next_year')),
  lead_source VARCHAR(100),
  status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'qualified', 'proposal_sent', 'negotiating', 'closed_won', 'closed_lost')),
  lead_score INTEGER DEFAULT 0,
  assigned_to VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sponsorship packages table
CREATE TABLE sponsorship_packages (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  tier VARCHAR(50) CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'custom')),
  base_price DOUBLE PRECISION NOT NULL,
  description TEXT,
  benefits JSONB DEFAULT '{}',
  max_sponsors INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event sponsorship opportunities
CREATE TABLE event_sponsorship_opportunities (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT REFERENCES events(id) ON DELETE CASCADE,
  package_id BIGINT REFERENCES sponsorship_packages(id),
  custom_price DOUBLE PRECISION,
  custom_benefits JSONB,
  available_slots INTEGER DEFAULT 1,
  sold_slots INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sponsor proposals table
CREATE TABLE sponsor_proposals (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT REFERENCES sponsor_leads(id) ON DELETE CASCADE,
  event_id BIGINT REFERENCES events(id),
  package_id BIGINT REFERENCES sponsorship_packages(id),
  custom_package_details JSONB,
  total_amount DOUBLE PRECISION NOT NULL,
  roi_projections JSONB,
  proposal_document_url VARCHAR(500),
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired')),
  valid_until DATE,
  sent_at TIMESTAMP WITH TIME ZONE,
  viewed_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sponsor contracts table
CREATE TABLE sponsor_contracts (
  id BIGSERIAL PRIMARY KEY,
  proposal_id BIGINT REFERENCES sponsor_proposals(id) ON DELETE CASCADE,
  contract_number VARCHAR(100) UNIQUE NOT NULL,
  sponsor_company_id BIGINT REFERENCES sponsor_companies(id),
  event_id BIGINT REFERENCES events(id),
  total_amount DOUBLE PRECISION NOT NULL,
  payment_terms VARCHAR(100),
  contract_document_url VARCHAR(500),
  signature_status VARCHAR(50) DEFAULT 'pending' CHECK (signature_status IN ('pending', 'sponsor_signed', 'both_signed', 'cancelled')),
  sponsor_signed_at TIMESTAMP WITH TIME ZONE,
  organizer_signed_at TIMESTAMP WITH TIME ZONE,
  start_date DATE,
  end_date DATE,
  deliverables JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sponsor payments table
CREATE TABLE sponsor_payments (
  id BIGSERIAL PRIMARY KEY,
  contract_id BIGINT REFERENCES sponsor_contracts(id) ON DELETE CASCADE,
  amount DOUBLE PRECISION NOT NULL,
  payment_type VARCHAR(50) CHECK (payment_type IN ('deposit', 'milestone', 'final', 'full')),
  due_date DATE,
  paid_date DATE,
  payment_method VARCHAR(50),
  transaction_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sponsor activations table (tracking deliverables)
CREATE TABLE sponsor_activations (
  id BIGSERIAL PRIMARY KEY,
  contract_id BIGINT REFERENCES sponsor_contracts(id) ON DELETE CASCADE,
  activation_type VARCHAR(100) NOT NULL,
  description TEXT,
  due_date DATE,
  completed_date DATE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  assigned_to VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lead activity tracking
CREATE TABLE sponsor_lead_activities (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT REFERENCES sponsor_leads(id) ON DELETE CASCADE,
  activity_type VARCHAR(100) NOT NULL,
  description TEXT,
  performed_by VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sponsor portal access
CREATE TABLE sponsor_portal_access (
  id BIGSERIAL PRIMARY KEY,
  contract_id BIGINT REFERENCES sponsor_contracts(id) ON DELETE CASCADE,
  access_email VARCHAR(255) NOT NULL,
  access_token VARCHAR(255) UNIQUE,
  permissions JSONB DEFAULT '{}',
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_sponsor_leads_status ON sponsor_leads(status);
CREATE INDEX idx_sponsor_leads_score ON sponsor_leads(lead_score DESC);
CREATE INDEX idx_sponsor_leads_assigned ON sponsor_leads(assigned_to);
CREATE INDEX idx_sponsor_proposals_status ON sponsor_proposals(status);
CREATE INDEX idx_sponsor_contracts_signature_status ON sponsor_contracts(signature_status);
CREATE INDEX idx_sponsor_payments_status ON sponsor_payments(status);
CREATE INDEX idx_sponsor_payments_due_date ON sponsor_payments(due_date);
CREATE INDEX idx_sponsor_activations_status ON sponsor_activations(status);
CREATE INDEX idx_sponsor_activations_due_date ON sponsor_activations(due_date);
CREATE INDEX idx_lead_activities_lead_id ON sponsor_lead_activities(lead_id);
CREATE INDEX idx_lead_activities_created_at ON sponsor_lead_activities(created_at);
