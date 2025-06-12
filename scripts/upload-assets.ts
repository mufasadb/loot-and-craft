#!/usr/bin/env tsx

import { readFile } from 'fs/promises'
import { join } from 'path'
import { supabase } from './supabase-node'

interface AssetManifest {
  version: string
  generated: string
  collections: Record<string, number>
  totalAssets: number
  assets: Array<{
    path: string
    type: string
    metadata: {
      fileSize: number
      lastModified: string
    }
    tags: string[]
    usage: string[]
  }>
}

async function uploadManifest(manifest: AssetManifest) {
  try {
    // Test if tables exist by trying to query them
    console.log('🗄️  Checking if tables exist...')
    
    const { error: manifestTableError } = await supabase
      .from('asset_manifests')
      .select('id')
      .limit(1)
    
    const { error: assetsTableError } = await supabase
      .from('assets')
      .select('id')
      .limit(1)
    
    if (manifestTableError || assetsTableError) {
      console.log('⚠️  Tables don\'t exist. Please create them manually in Supabase dashboard:')
      console.log(`
-- Run this SQL in your Supabase dashboard:
CREATE TABLE IF NOT EXISTS asset_manifests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL,
  generated TIMESTAMPTZ NOT NULL,
  collections JSONB NOT NULL,
  total_assets INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE INDEX IF NOT EXISTS idx_assets_path ON assets(path);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type);
CREATE INDEX IF NOT EXISTS idx_assets_tags ON assets USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_assets_usage ON assets USING GIN(usage);
      `)
      throw new Error('Tables need to be created manually')
    }

    // Upload manifest metadata
    const { error: manifestError } = await supabase
      .from('asset_manifests')
      .upsert({
        version: manifest.version,
        generated: manifest.generated,
        collections: manifest.collections,
        total_assets: manifest.totalAssets,
        created_at: new Date().toISOString()
      })

    if (manifestError) {
      console.error('Error uploading manifest metadata:', manifestError)
      throw manifestError
    }

    // Upload assets in batches
    const batchSize = 100
    const totalBatches = Math.ceil(manifest.assets.length / batchSize)
    
    console.log(`📦 Uploading ${manifest.assets.length} assets in ${totalBatches} batches...`)

    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize
      const end = Math.min(start + batchSize, manifest.assets.length)
      const batch = manifest.assets.slice(start, end)

      const assetsForDb = batch.map(asset => ({
        path: asset.path,
        type: asset.type,
        file_size: asset.metadata.fileSize,
        last_modified: asset.metadata.lastModified,
        tags: asset.tags,
        usage: asset.usage
      }))

      const { error: assetError } = await supabase
        .from('assets')
        .upsert(assetsForDb, {
          onConflict: 'path'
        })

      if (assetError) {
        console.error(`Error uploading asset batch ${i + 1}:`, assetError)
        throw assetError
      }

      console.log(`   ✅ Uploaded batch ${i + 1}/${totalBatches}`)
    }

    return true
  } catch (error) {
    console.error('Failed to upload asset manifest:', error)
    throw error
  }
}

async function uploadAssetManifest() {
  try {
    console.log('🚀 Starting asset manifest upload...')
    
    // Read the manifest file
    const manifestPath = join(process.cwd(), 'assets', 'manifest.json')
    const manifestContent = await readFile(manifestPath, 'utf-8')
    const manifest: AssetManifest = JSON.parse(manifestContent)
    
    console.log(`📊 Manifest info:`)
    console.log(`   Version: ${manifest.version}`)
    console.log(`   Generated: ${manifest.generated}`)
    console.log(`   Total Assets: ${manifest.totalAssets}`)
    console.log(`   Collections:`, manifest.collections)
    
    // Upload to Supabase
    await uploadManifest(manifest)
    
    console.log('✅ Asset manifest uploaded successfully!')
    
    // Test searching
    console.log('\n🔍 Testing asset search...')
    
    const { data: uiAssets } = await supabase
      .from('assets')
      .select('*')
      .overlaps('usage', ['ui_element', 'button', 'frame', 'background'])
      .limit(10)
    
    console.log(`Found ${uiAssets?.length || 0} UI assets`)
    
    const { data: classicRpgAssets } = await supabase
      .from('assets')
      .select('*')
      .ilike('path', '%ClassicRPGGUI%')
      .limit(10)
    
    console.log(`Found ${classicRpgAssets?.length || 0} Classic RPG GUI assets`)
    
    // Show some examples
    if (classicRpgAssets && classicRpgAssets.length > 0) {
      console.log('\n📝 Sample Classic RPG GUI assets:')
      classicRpgAssets.slice(0, 5).forEach(asset => {
        console.log(`   ${asset.path}`)
        console.log(`     Tags: ${asset.tags.slice(0, 3).join(', ')}...`)
        console.log(`     Usage: ${asset.usage.join(', ')}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Failed to upload asset manifest:', error)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  uploadAssetManifest()
}

export { uploadAssetManifest }