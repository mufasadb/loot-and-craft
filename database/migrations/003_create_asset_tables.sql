-- Create asset_manifests table to store manifest metadata
CREATE TABLE IF NOT EXISTS asset_manifests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL,
  generated TIMESTAMPTZ NOT NULL,
  collections JSONB NOT NULL,
  total_assets INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create assets table to store individual asset information
CREATE TABLE IF NOT EXISTS assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  path TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  last_modified TIMESTAMPTZ NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  usage TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient searching
CREATE INDEX IF NOT EXISTS idx_assets_path ON assets(path);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type);
CREATE INDEX IF NOT EXISTS idx_assets_tags ON assets USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_assets_usage ON assets USING GIN(usage);
CREATE INDEX IF NOT EXISTS idx_assets_path_search ON assets USING GIN(to_tsvector('english', path));

-- Create RLS policies
ALTER TABLE asset_manifests ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Allow public read access to assets (they're game resources)
CREATE POLICY "Public read access for asset_manifests" ON asset_manifests
  FOR SELECT USING (true);

CREATE POLICY "Public read access for assets" ON assets
  FOR SELECT USING (true);

-- Only authenticated users can insert/update assets (for admin purposes)
CREATE POLICY "Authenticated write access for asset_manifests" ON asset_manifests
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated write access for assets" ON assets
  FOR ALL USING (auth.role() = 'authenticated');

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for assets table
CREATE TRIGGER update_assets_updated_at 
  BEFORE UPDATE ON assets 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();