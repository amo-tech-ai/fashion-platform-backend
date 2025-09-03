CREATE TABLE event_organizers (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  company_name TEXT NOT NULL,
  bio TEXT,
  website TEXT,
  phone TEXT,
  email TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  specializations TEXT[],
  years_experience INTEGER DEFAULT 0,
  portfolio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE event_projects (
  id BIGSERIAL PRIMARY KEY,
  organizer_id BIGINT NOT NULL REFERENCES event_organizers(id) ON DELETE CASCADE,
  event_id BIGINT NOT NULL,
  project_name TEXT NOT NULL,
  project_status TEXT NOT NULL DEFAULT 'planning' CHECK (project_status IN ('planning', 'in_progress', 'completed', 'cancelled')),
  budget_total DOUBLE PRECISION NOT NULL DEFAULT 0,
  budget_spent DOUBLE PRECISION NOT NULL DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE event_timeline (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES event_projects(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  task_description TEXT,
  assigned_to BIGINT,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  dependencies BIGINT[],
  estimated_hours DOUBLE PRECISION,
  actual_hours DOUBLE PRECISION,
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE event_staff_assignments (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES event_projects(id) ON DELETE CASCADE,
  staff_user_id BIGINT NOT NULL,
  role TEXT NOT NULL,
  hourly_rate DOUBLE PRECISION,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  responsibilities TEXT[],
  contact_info JSONB,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'confirmed', 'checked_in', 'completed', 'no_show')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE event_budgets (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES event_projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  subcategory TEXT,
  budgeted_amount DOUBLE PRECISION NOT NULL,
  actual_amount DOUBLE PRECISION DEFAULT 0,
  vendor_name TEXT,
  vendor_contact TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue', 'cancelled')),
  payment_due_date TIMESTAMP WITH TIME ZONE,
  invoice_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE event_designer_coordination (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES event_projects(id) ON DELETE CASCADE,
  designer_id BIGINT NOT NULL,
  slot_time TIMESTAMP WITH TIME ZONE,
  slot_duration INTEGER DEFAULT 15,
  collection_name TEXT,
  model_count INTEGER DEFAULT 0,
  music_requirements TEXT,
  lighting_requirements TEXT,
  special_requests TEXT,
  rehearsal_time TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'rehearsed', 'ready', 'completed', 'cancelled')),
  contact_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE event_vendor_management (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES event_projects(id) ON DELETE CASCADE,
  vendor_name TEXT NOT NULL,
  vendor_type TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  service_description TEXT,
  contract_amount DOUBLE PRECISION,
  payment_terms TEXT,
  delivery_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'contracted' CHECK (status IN ('contracted', 'confirmed', 'in_progress', 'delivered', 'completed', 'cancelled')),
  performance_rating INTEGER CHECK (performance_rating >= 1 AND performance_rating <= 5),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE event_logistics (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES event_projects(id) ON DELETE CASCADE,
  logistics_type TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  supplier TEXT,
  delivery_time TIMESTAMP WITH TIME ZONE,
  pickup_time TIMESTAMP WITH TIME ZONE,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'ordered' CHECK (status IN ('ordered', 'confirmed', 'in_transit', 'delivered', 'setup', 'returned')),
  cost DOUBLE PRECISION,
  responsible_person TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE event_communications (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES event_projects(id) ON DELETE CASCADE,
  communication_type TEXT NOT NULL CHECK (communication_type IN ('email', 'sms', 'call', 'meeting', 'announcement')),
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('all', 'designers', 'staff', 'vendors', 'attendees', 'sponsors', 'media')),
  subject TEXT,
  message TEXT NOT NULL,
  scheduled_time TIMESTAMP WITH TIME ZONE,
  sent_time TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'delivered', 'failed')),
  recipient_count INTEGER DEFAULT 0,
  delivery_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  created_by BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE event_analytics (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES event_projects(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_value DOUBLE PRECISION NOT NULL,
  metric_date DATE NOT NULL,
  metric_category TEXT,
  additional_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE event_alerts (
  id BIGSERIAL PRIMARY KEY,
  organizer_id BIGINT NOT NULL REFERENCES event_organizers(id) ON DELETE CASCADE,
  project_id BIGINT REFERENCES event_projects(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('deadline', 'budget', 'capacity', 'payment', 'staff', 'vendor', 'system')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_required BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  is_resolved BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_event_organizers_user_id ON event_organizers(user_id);
CREATE INDEX idx_event_organizers_verification ON event_organizers(verification_status);
CREATE INDEX idx_event_projects_organizer_id ON event_projects(organizer_id);
CREATE INDEX idx_event_projects_status ON event_projects(project_status);
CREATE INDEX idx_event_projects_dates ON event_projects(start_date, end_date);
CREATE INDEX idx_event_timeline_project_id ON event_timeline(project_id);
CREATE INDEX idx_event_timeline_due_date ON event_timeline(due_date);
CREATE INDEX idx_event_timeline_status ON event_timeline(status);
CREATE INDEX idx_event_timeline_assigned_to ON event_timeline(assigned_to);
CREATE INDEX idx_event_staff_project_id ON event_staff_assignments(project_id);
CREATE INDEX idx_event_staff_user_id ON event_staff_assignments(staff_user_id);
CREATE INDEX idx_event_budgets_project_id ON event_budgets(project_id);
CREATE INDEX idx_event_budgets_category ON event_budgets(category);
CREATE INDEX idx_event_budgets_payment_status ON event_budgets(payment_status);
CREATE INDEX idx_event_designer_coordination_project_id ON event_designer_coordination(project_id);
CREATE INDEX idx_event_designer_coordination_designer_id ON event_designer_coordination(designer_id);
CREATE INDEX idx_event_designer_coordination_slot_time ON event_designer_coordination(slot_time);
CREATE INDEX idx_event_vendor_management_project_id ON event_vendor_management(project_id);
CREATE INDEX idx_event_vendor_management_status ON event_vendor_management(status);
CREATE INDEX idx_event_logistics_project_id ON event_logistics(project_id);
CREATE INDEX idx_event_logistics_status ON event_logistics(status);
CREATE INDEX idx_event_communications_project_id ON event_communications(project_id);
CREATE INDEX idx_event_communications_scheduled_time ON event_communications(scheduled_time);
CREATE INDEX idx_event_analytics_project_id ON event_analytics(project_id);
CREATE INDEX idx_event_analytics_metric_date ON event_analytics(metric_date);
CREATE INDEX idx_event_alerts_organizer_id ON event_alerts(organizer_id);
CREATE INDEX idx_event_alerts_project_id ON event_alerts(project_id);
CREATE INDEX idx_event_alerts_severity ON event_alerts(severity);
CREATE INDEX idx_event_alerts_is_read ON event_alerts(is_read);
