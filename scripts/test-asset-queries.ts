#!/usr/bin/env tsx

import { supabase } from './supabase-node'

async function testAssetQueries() {
  console.log('🔍 Testing asset queries...')
  
  // Check total count
  const { count: totalCount } = await supabase
    .from('assets')
    .select('*', { count: 'exact', head: true })
  
  console.log(`📊 Total assets in database: ${totalCount}`)
  
  // Check collections distribution
  const { data: fantasyIcons } = await supabase
    .from('assets')
    .select('path')
    .ilike('path', '%5000FantasyIcons%')
    .limit(1)
  
  const { data: classicRpg } = await supabase
    .from('assets')
    .select('path')
    .ilike('path', '%ClassicRPGGUI%')
    .limit(1)
  
  console.log(`Fantasy Icons found: ${fantasyIcons?.length || 0}`)
  console.log(`Classic RPG GUI found: ${classicRpg?.length || 0}`)
  
  // Sample some assets to see their structure
  const { data: sampleAssets } = await supabase
    .from('assets')
    .select('path, tags, usage, type')
    .limit(5)
  
  console.log('\n📝 Sample assets:')
  sampleAssets?.forEach((asset, i) => {
    console.log(`${i + 1}. ${asset.path}`)
    console.log(`   Type: ${asset.type}`)
    console.log(`   Tags: ${asset.tags.slice(0, 5).join(', ')}${asset.tags.length > 5 ? '...' : ''}`)
    console.log(`   Usage: ${asset.usage.join(', ')}`)
    console.log()
  })
  
  // Check for specific UI-related tags
  const { data: frameAssets } = await supabase
    .from('assets')
    .select('path, tags, usage')
    .overlaps('tags', ['frame'])
    .limit(5)
  
  console.log(`📦 Assets with 'frame' tag: ${frameAssets?.length || 0}`)
  
  // Check for Classic RPG GUI assets specifically
  const { data: rpgGuiAssets } = await supabase
    .from('assets')
    .select('path, tags, usage')
    .ilike('path', '%ClassicRPGGUI%')
    .limit(10)
  
  console.log(`🎮 Classic RPG GUI assets: ${rpgGuiAssets?.length || 0}`)
  if (rpgGuiAssets && rpgGuiAssets.length > 0) {
    rpgGuiAssets.slice(0, 3).forEach(asset => {
      console.log(`   ${asset.path}`)
      console.log(`     Tags: ${asset.tags.join(', ')}`)
      console.log(`     Usage: ${asset.usage.join(', ')}`)
    })
  }
}

testAssetQueries().catch(console.error)