#!/usr/bin/env tsx

import 'dotenv/config'
import { supabase } from '../src/services/supabase'

async function createAssetTables() {
  console.log('🗄️  Creating asset tables in Supabase...')
  
  try {
    // Create asset_manifests table
    const { error: manifestError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS asset_manifests (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          version TEXT NOT NULL,
          generated TIMESTAMPTZ NOT NULL,
          collections JSONB NOT NULL,
          total_assets INTEGER NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    })
    
    if (manifestError) {
      console.log('Manifest table probably already exists or needs manual creation')
    }

    // Create assets table
    const { error: assetsError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    })
    
    if (assetsError) {
      console.log('Assets table probably already exists or needs manual creation')
    }

    console.log('✅ Tables creation attempted. If there were errors, please run the SQL manually in Supabase dashboard.')
    
  } catch (error) {
    console.log('📝 Please create the tables manually in your Supabase dashboard with this SQL:')
    console.log(`
-- Create asset_manifests table
CREATE TABLE IF NOT EXISTS asset_manifests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL,
  generated TIMESTAMPTZ NOT NULL,
  collections JSONB NOT NULL,
  total_assets INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create assets table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_assets_path ON assets(path);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type);
CREATE INDEX IF NOT EXISTS idx_assets_tags ON assets USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_assets_usage ON assets USING GIN(usage);
    `)
  }
}

createAssetTables()