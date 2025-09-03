-- Prospecting and Engagement
CREATE TABLE sponsor_prospects (
  id BIGSERIAL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  website VARCHAR(255),
  industry VARCHAR(100),
  source VARCHAR(100),
  status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'researching', 'contacted', 'converted', 'rejected')),
  fit_score INTEGER DEFAULT 0,
  enrichment_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE sponsor_leads ADD COLUMN engagement_score INTEGER DEFAULT 0;
ALTER TABLE sponsor_leads ADD COLUMN last_engaged_at TIMESTAMP WITH TIME ZONE;

CREATE TABLE lead_engagement_events (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT REFERENCES sponsor_leads(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- e.g., 'email_open', 'link_click', 'page_view'
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Outreach Campaigns
CREATE TABLE outreach_campaigns (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  target_industry VARCHAR(100),
  target_company_size VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE campaign_emails (
  id BIGSERIAL PRIMARY KEY,
  campaign_id BIGINT REFERENCES outreach_campaigns(id) ON DELETE CASCADE,
  sequence_number INTEGER NOT NULL,
  delay_days INTEGER NOT NULL, -- Delay after previous email
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE lead_campaign_enrollment (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT REFERENCES sponsor_leads(id) ON DELETE CASCADE,
  campaign_id BIGINT REFERENCES outreach_campaigns(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'unsubscribed')),
  current_sequence INTEGER DEFAULT 1,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(lead_id, campaign_id)
);

-- Sponsor Success & Portal
CREATE TABLE sponsor_assets (
  id BIGSERIAL PRIMARY KEY,
  contract_id BIGINT REFERENCES sponsor_contracts(id) ON DELETE CASCADE,
  asset_type VARCHAR(100) NOT NULL, -- e.g., 'logo_high_res', 'booth_design', 'ad_copy'
  file_url VARCHAR(500) NOT NULL,
  submitted_by VARCHAR(255),
  status VARCHAR(50) DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE sponsor_contracts ADD COLUMN renewal_status VARCHAR(50) DEFAULT 'pending' CHECK (renewal_status IN ('pending', 'offered', 'negotiating', 'renewed', 'declined'));
ALTER TABLE sponsor_contracts ADD COLUMN renewal_notes TEXT;

CREATE TABLE renewal_offers (
  id BIGSERIAL PRIMARY KEY,
  contract_id BIGINT REFERENCES sponsor_contracts(id) ON DELETE CASCADE,
  offer_amount DOUBLE PRECISION NOT NULL,
  incentives TEXT[],
  valid_until DATE,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sponsor_prospects_status ON sponsor_prospects(status);
CREATE INDEX idx_sponsor_prospects_industry ON sponsor_prospects(industry);
CREATE INDEX idx_lead_engagement_events_lead_id ON lead_engagement_events(lead_id);
CREATE INDEX idx_lead_campaign_enrollment_status ON lead_campaign_enrollment(status);
CREATE INDEX idx_sponsor_assets_contract_id ON sponsor_assets(contract_id);
