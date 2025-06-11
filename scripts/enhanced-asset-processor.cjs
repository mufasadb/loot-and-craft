#!/usr/bin/env node

/**
 * Enhanced Asset Processor for Large Collections
 * Optimized for 5000+ fantasy icons and RPG GUI elements
 */

const fs = require('fs');
const path = require('path');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

const ASSETS_DIR = path.join(__dirname, '../assets');
const OUTPUT_FILE = path.join(ASSETS_DIR, 'manifest.json');
const BATCH_SIZE = 100; // Process in batches to avoid memory issues

// Enhanced categorization for large icon collections
const ICON_CATEGORIES = {
  // Weapons
  'sword': ['sword', 'blade', 'katana', 'scimitar', 'rapier'],
  'axe': ['axe', 'hatchet', 'tomahawk'],
  'bow': ['bow', 'crossbow', 'longbow'],
  'staff': ['staff', 'wand', 'rod', 'scepter'],
  'mace': ['mace', 'hammer', 'club', 'flail'],
  'dagger': ['dagger', 'knife', 'dirk'],
  
  // Armor
  'helmet': ['helm', 'hat', 'crown', 'cap', 'mask'],
  'chest': ['chest', 'armor', 'tunic', 'robe', 'shirt'],
  'gloves': ['glove', 'gauntlet', 'hand'],
  'boots': ['boot', 'shoe', 'foot'],
  'pants': ['pant', 'leg', 'trouser'],
  'shoulder': ['shoulder', 'pauldron'],
  'belt': ['belt', 'sash'],
  'back': ['back', 'cloak', 'cape'],
  
  // Accessories
  'ring': ['ring'],
  'necklace': ['neck', 'amulet', 'pendant'],
  'bracelet': ['bracer', 'bracelet'],
  
  // UI Elements
  'button': ['button', 'btn'],
  'frame': ['frame', 'border', 'panel'],
  'bar': ['bar', 'progress', 'hp', 'mana', 'energy'],
  'icon': ['icon', 'symbol'],
  'background': ['background', 'bg']
};

const RARITY_INDICATORS = {
  'common': ['common', 'basic', 'simple'],
  'magic': ['magic', 'enchanted', 'blue'],
  'rare': ['rare', 'precious', 'elite'],
  'epic': ['epic', 'purple', 'heroic'],
  'legendary': ['legendary', 'gold', 'unique', 'artifact'],
  'set': ['set', 'complete']
};

const THEME_TAGS = {
  'fire': ['fire', 'flame', 'burn', 'red', 'hot'],
  'ice': ['ice', 'frost', 'cold', 'blue', 'freeze'],
  'lightning': ['lightning', 'shock', 'electric', 'thunder'],
  'dark': ['dark', 'shadow', 'death', 'necro', 'black'],
  'holy': ['holy', 'divine', 'light', 'priest', 'paladin'],
  'nature': ['nature', 'earth', 'green', 'druid', 'forest'],
  'arcane': ['arcane', 'magic', 'mage', 'wizard', 'purple']
};

/**
 * Smart categorization based on filename and path
 */
function categorizeAsset(relativePath, filename) {
  const lowPath = relativePath.toLowerCase();
  const lowFile = filename.toLowerCase();
  const combined = `${lowPath} ${lowFile}`;
  
  const categories = [];
  const themes = [];
  const rarity = [];
  
  // Detect main category
  for (const [category, keywords] of Object.entries(ICON_CATEGORIES)) {
    if (keywords.some(keyword => combined.includes(keyword))) {
      categories.push(category);
    }
  }
  
  // Detect themes
  for (const [theme, keywords] of Object.entries(THEME_TAGS)) {
    if (keywords.some(keyword => combined.includes(keyword))) {
      themes.push(theme);
    }
  }
  
  // Detect rarity
  for (const [rarityLevel, keywords] of Object.entries(RARITY_INDICATORS)) {
    if (keywords.some(keyword => combined.includes(keyword))) {
      rarity.push(rarityLevel);
    }
  }
  
  return { categories, themes, rarity };
}

/**
 * Enhanced tag generation for large collections
 */
function generateEnhancedTags(relativePath, metadata) {
  const tags = new Set();
  const filename = path.basename(relativePath, path.extname(relativePath));
  const pathParts = relativePath.split('/');
  
  // Basic tags from path
  pathParts.forEach(part => {
    if (part && part.length > 2) {
      tags.add(part.toLowerCase().replace(/[_-]/g, ''));
    }
  });
  
  // Filename tags
  const filenameParts = filename.toLowerCase()
    .replace(/[_-]/g, ' ')
    .split(' ')
    .filter(word => word.length > 1);
  
  filenameParts.forEach(part => tags.add(part));
  
  // Smart categorization
  const categorization = categorizeAsset(relativePath, filename);
  
  categorization.categories.forEach(cat => tags.add(cat));
  categorization.themes.forEach(theme => tags.add(theme));
  categorization.rarity.forEach(rarity => tags.add(rarity));
  
  // Collection-specific tags
  if (relativePath.includes('5000FantasyIcons')) {
    tags.add('fantasy');
    tags.add('icon');
    tags.add('equipment');
  }
  
  if (relativePath.includes('Classic_RPG_GUI')) {
    tags.add('ui');
    tags.add('interface');
    tags.add('gui');
    tags.add('classic');
  }
  
  // Special handling for armor/weapon types
  if (relativePath.includes('ArmorIcons')) {
    tags.add('armor');
    tags.add('equipment');
    tags.add('wearable');
  }
  
  if (relativePath.includes('WeaponIcons')) {
    tags.add('weapon');
    tags.add('equipment');
    tags.add('combat');
  }
  
  // Add type-based tags
  if (metadata.type === 'image') {
    tags.add('image');
    tags.add('visual');
    
    // Size-based tags
    if (metadata.metadata.width && metadata.metadata.height) {
      const size = Math.max(metadata.metadata.width, metadata.metadata.height);
      if (size <= 32) tags.add('small');
      else if (size <= 64) tags.add('medium');
      else if (size <= 128) tags.add('large');
      else tags.add('xlarge');
      
      if (metadata.metadata.width === metadata.metadata.height) {
        tags.add('square');
      }
    }
  }
  
  return Array.from(tags).filter(tag => tag.length > 0);
}

/**
 * Determine usage patterns for assets
 */
function determineUsage(relativePath, metadata) {
  const usage = new Set();
  const lowPath = relativePath.toLowerCase();
  
  // UI elements
  if (lowPath.includes('gui') || lowPath.includes('ui')) {
    if (lowPath.includes('button')) usage.add('ui_button');
    if (lowPath.includes('frame')) usage.add('ui_frame');
    if (lowPath.includes('bar')) usage.add('ui_bar');
    if (lowPath.includes('icon')) usage.add('ui_icon');
    if (lowPath.includes('background')) usage.add('ui_background');
    usage.add('interface');
  }
  
  // Equipment icons
  if (lowPath.includes('armor') || lowPath.includes('weapon')) {
    usage.add('inventory_icon');
    usage.add('equipment_display');
    usage.add('tooltip_image');
  }
  
  // General icons
  if (lowPath.includes('icon') && !lowPath.includes('gui')) {
    usage.add('game_icon');
    usage.add('inventory_icon');
  }
  
  // Profession/skill icons
  if (lowPath.includes('profession') || lowPath.includes('skill')) {
    usage.add('character_sheet');
    usage.add('skill_tree');
  }
  
  return Array.from(usage).length > 0 ? Array.from(usage) : ['general'];
}

/**
 * Process a batch of files
 */
async function processBatch(files, batchIndex) {
  console.log(`📄 Processing batch ${batchIndex + 1} (${files.length} files)...`);
  
  const results = [];
  
  for (const { filePath, relativePath } of files) {
    try {
      const stats = fs.statSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      
      // Only process image files for now
      if (!['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext)) {
        continue;
      }
      
      const metadata = {
        path: relativePath,
        type: 'image',
        metadata: {
          fileSize: stats.size,
          lastModified: stats.mtime.toISOString()
        }
      };
      
      // For large collections, skip image analysis to improve performance
      // We'll rely on smart tagging instead
      metadata.tags = generateEnhancedTags(relativePath, metadata);
      metadata.usage = determineUsage(relativePath, metadata);
      
      results.push(metadata);
      
    } catch (error) {
      console.warn(`⚠️ Error processing ${relativePath}:`, error.message);
    }
  }
  
  return results;
}

/**
 * Recursively scan directory and collect all files
 */
function collectAllFiles(dir, baseDir = dir) {
  const files = [];
  
  function scanDir(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip hidden directories and specific ones
        if (entry.name.startsWith('.') || 
            entry.name === 'node_modules' || 
            entry.name === 'Photoshop') {
          continue;
        }
        scanDir(fullPath);
      } else if (entry.isFile()) {
        // Skip hidden files and the manifest
        if (entry.name.startsWith('.') || entry.name === 'manifest.json') {
          continue;
        }
        
        const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
        files.push({ filePath: fullPath, relativePath });
      }
    }
  }
  
  scanDir(dir);
  return files;
}

/**
 * Main processing function
 */
async function generateEnhancedManifest() {
  console.log('🚀 Starting enhanced asset processing for large collections...');
  
  if (!fs.existsSync(ASSETS_DIR)) {
    console.error(`❌ Assets directory not found: ${ASSETS_DIR}`);
    process.exit(1);
  }
  
  try {
    // Collect all files
    console.log('📂 Scanning directories...');
    const allFiles = collectAllFiles(ASSETS_DIR);
    console.log(`📊 Found ${allFiles.length} files to process`);
    
    // Process in batches
    const allAssets = [];
    const batches = [];
    
    for (let i = 0; i < allFiles.length; i += BATCH_SIZE) {
      batches.push(allFiles.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`🔄 Processing ${batches.length} batches...`);
    
    for (let i = 0; i < batches.length; i++) {
      const batchResults = await processBatch(batches[i], i);
      allAssets.push(...batchResults);
      
      // Progress indicator
      const progress = ((i + 1) / batches.length * 100).toFixed(1);
      console.log(`📈 Progress: ${progress}% (${allAssets.length} assets processed)`);
    }
    
    // Generate manifest
    const manifest = {
      version: '2.0.0',
      generated: new Date().toISOString(),
      collections: {
        'fantasy-icons': allAssets.filter(a => a.path.includes('5000FantasyIcons')).length,
        'classic-rpg-gui': allAssets.filter(a => a.path.includes('Classic_RPG_GUI')).length,
        'custom': allAssets.filter(a => !a.path.includes('5000FantasyIcons') && !a.path.includes('Classic_RPG_GUI')).length
      },
      totalAssets: allAssets.length,
      assets: allAssets.sort((a, b) => a.path.localeCompare(b.path))
    };
    
    // Save manifest
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2));
    
    console.log('✅ Enhanced manifest generated successfully!');
    console.log(`📦 Total assets: ${allAssets.length}`);
    console.log('📊 Collection breakdown:');
    Object.entries(manifest.collections).forEach(([collection, count]) => {
      console.log(`   ${collection}: ${count} assets`);
    });
    
    // Generate tag summary
    const tagCounts = new Map();
    allAssets.forEach(asset => {
      asset.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });
    
    const topTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
    
    console.log('🏷️  Top 20 tags:');
    topTags.forEach(([tag, count]) => {
      console.log(`   ${tag}: ${count}`);
    });
    
  } catch (error) {
    console.error('❌ Error generating enhanced manifest:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  generateEnhancedManifest();
}

module.exports = { generateEnhancedManifest };