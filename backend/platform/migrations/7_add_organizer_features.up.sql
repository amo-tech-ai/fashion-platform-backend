-- Communication templates table
CREATE TABLE communication_templates (
  id BIGSERIAL PRIMARY KEY,
  organizer_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organizer communications log
CREATE TABLE organizer_communications (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT REFERENCES events(id) ON DELETE CASCADE,
  organizer_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  message_id VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(100) NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'sent', 'failed', 'cancelled')),
  open_rate DOUBLE PRECISION DEFAULT 0,
  click_rate DOUBLE PRECISION DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Marketing campaigns table
CREATE TABLE marketing_campaigns (
  id BIGSERIAL PRIMARY KEY,
  organizer_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  event_id BIGINT REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL, -- 'email', 'social', 'paid_ads', 'influencer'
  platform VARCHAR(100), -- 'facebook', 'instagram', 'google', 'email'
  budget DOUBLE PRECISION DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  target_audience JSONB DEFAULT '{}',
  creative_assets JSONB DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaign performance metrics
CREATE TABLE campaign_metrics (
  id BIGSERIAL PRIMARY KEY,
  campaign_id BIGINT REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  spend DOUBLE PRECISION DEFAULT 0,
  revenue DOUBLE PRECISION DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(campaign_id, date)
);

-- Event updates and announcements
CREATE TABLE event_updates (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT REFERENCES events(id) ON DELETE CASCADE,
  organizer_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  update_type VARCHAR(100) NOT NULL, -- 'general', 'schedule_change', 'venue_change', 'cancellation'
  priority VARCHAR(50) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Automated reports configuration
CREATE TABLE automated_reports (
  id BIGSERIAL PRIMARY KEY,
  organizer_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  report_type VARCHAR(100) NOT NULL, -- 'daily', 'weekly', 'monthly', 'event_summary'
  frequency VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly'
  recipients TEXT[] DEFAULT '{}',
  filters JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  last_sent TIMESTAMP WITH TIME ZONE,
  next_scheduled TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Report generation history
CREATE TABLE report_history (
  id BIGSERIAL PRIMARY KEY,
  organizer_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  report_id VARCHAR(255) UNIQUE NOT NULL,
  report_type VARCHAR(100) NOT NULL,
  parameters JSONB DEFAULT '{}',
  file_url VARCHAR(500),
  status VARCHAR(50) DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed')),
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Real-time analytics cache
CREATE TABLE analytics_cache (
  id BIGSERIAL PRIMARY KEY,
  organizer_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  event_id BIGINT REFERENCES events(id) ON DELETE CASCADE,
  metric_type VARCHAR(100) NOT NULL,
  metric_data JSONB NOT NULL,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 hour',
  UNIQUE(organizer_id, event_id, metric_type)
);

-- Attendee feedback and surveys
CREATE TABLE attendee_surveys (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT REFERENCES events(id) ON DELETE CASCADE,
  organizer_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  questions JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  send_after_event BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Survey responses
CREATE TABLE survey_responses (
  id BIGSERIAL PRIMARY KEY,
  survey_id BIGINT REFERENCES attendee_surveys(id) ON DELETE CASCADE,
  booking_id BIGINT REFERENCES bookings(id) ON DELETE CASCADE,
  responses JSONB NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_communication_templates_organizer ON communication_templates(organizer_id);
CREATE INDEX idx_organizer_communications_event ON organizer_communications(event_id);
CREATE INDEX idx_organizer_communications_organizer ON organizer_communications(organizer_id);
CREATE INDEX idx_organizer_communications_status ON organizer_communications(status);
CREATE INDEX idx_marketing_campaigns_organizer ON marketing_campaigns(organizer_id);
CREATE INDEX idx_marketing_campaigns_event ON marketing_campaigns(event_id);
CREATE INDEX idx_campaign_metrics_campaign ON campaign_metrics(campaign_id);
CREATE INDEX idx_campaign_metrics_date ON campaign_metrics(date);
CREATE INDEX idx_event_updates_event ON event_updates(event_id);
CREATE INDEX idx_automated_reports_organizer ON automated_reports(organizer_id);
CREATE INDEX idx_report_history_organizer ON report_history(organizer_id);
CREATE INDEX idx_analytics_cache_organizer_event ON analytics_cache(organizer_id, event_id);
CREATE INDEX idx_analytics_cache_expires ON analytics_cache(expires_at);
CREATE INDEX idx_attendee_surveys_event ON attendee_surveys(event_id);
CREATE INDEX idx_survey_responses_survey ON survey_responses(survey_id);
