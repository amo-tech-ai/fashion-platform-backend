CREATE TABLE designers (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  brand_name TEXT NOT NULL,
  bio TEXT,
  website TEXT,
  instagram TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verification_notes TEXT,
  commission_rate DOUBLE PRECISION NOT NULL DEFAULT 0.15,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE collections (
  id BIGSERIAL PRIMARY KEY,
  designer_id BIGINT NOT NULL REFERENCES designers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  season TEXT,
  year INTEGER,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE portfolio_items (
  id BIGSERIAL PRIMARY KEY,
  designer_id BIGINT NOT NULL REFERENCES designers(id) ON DELETE CASCADE,
  collection_id BIGINT REFERENCES collections(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  image_key TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_designers_user_id ON designers(user_id);
CREATE INDEX idx_designers_verification_status ON designers(verification_status);
CREATE INDEX idx_collections_designer_id ON collections(designer_id);
CREATE INDEX idx_collections_featured ON collections(is_featured);
CREATE INDEX idx_portfolio_items_designer_id ON portfolio_items(designer_id);
CREATE INDEX idx_portfolio_items_collection_id ON portfolio_items(collection_id);
CREATE INDEX idx_portfolio_items_order ON portfolio_items(designer_id, order_index);
