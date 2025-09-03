CREATE TABLE sponsors (
  id BIGSERIAL PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  website TEXT,
  logo_url TEXT,
  description TEXT,
  industry TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE sponsor_packages (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  package_type TEXT NOT NULL CHECK (package_type IN ('title', 'presenting', 'gold', 'silver', 'bronze', 'media')),
  price DOUBLE PRECISION NOT NULL,
  max_sponsors INTEGER NOT NULL DEFAULT 1,
  benefits TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE event_sponsorships (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL,
  sponsor_id BIGINT NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  package_id BIGINT NOT NULL REFERENCES sponsor_packages(id) ON DELETE CASCADE,
  amount_paid DOUBLE PRECISION NOT NULL,
  contract_signed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled')),
  visibility_metrics JSONB DEFAULT '{}',
  roi_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE sponsor_benefits (
  id BIGSERIAL PRIMARY KEY,
  sponsorship_id BIGINT NOT NULL REFERENCES event_sponsorships(id) ON DELETE CASCADE,
  benefit_type TEXT NOT NULL,
  benefit_value TEXT NOT NULL,
  is_delivered BOOLEAN NOT NULL DEFAULT FALSE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sponsors_company_name ON sponsors(company_name);
CREATE INDEX idx_sponsor_packages_type ON sponsor_packages(package_type);
CREATE INDEX idx_sponsor_packages_active ON sponsor_packages(is_active);
CREATE INDEX idx_event_sponsorships_event_id ON event_sponsorships(event_id);
CREATE INDEX idx_event_sponsorships_sponsor_id ON event_sponsorships(sponsor_id);
CREATE INDEX idx_event_sponsorships_package_id ON event_sponsorships(package_id);
CREATE INDEX idx_event_sponsorships_status ON event_sponsorships(status);
CREATE INDEX idx_sponsor_benefits_sponsorship_id ON sponsor_benefits(sponsorship_id);
CREATE INDEX idx_sponsor_benefits_delivered ON sponsor_benefits(is_delivered);
CREATE UNIQUE INDEX idx_event_sponsor_package_unique ON event_sponsorships(event_id, sponsor_id, package_id);
