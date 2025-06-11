#!/usr/bin/env node

/**
 * Asset Manifest Generator for Loot & Craft
 * Scans the assets directory and generates a manifest.json file with metadata
 */

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const ASSETS_DIR = path.join(__dirname, '../assets');
const OUTPUT_FILE = path.join(ASSETS_DIR, 'manifest.json');

// Supported file types
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a'];
const DATA_EXTENSIONS = ['.json', '.xml', '.txt'];

/**
 * Get dominant colors from an image
 */
async function getDominantColors(imagePath) {
  try {
    const img = await loadImage(imagePath);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const data = imageData.data;
    
    // Sample pixels and count colors
    const colorCounts = new Map();
    for (let i = 0; i < data.length; i += 16) { // Sample every 4th pixel
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      
      if (a < 128) continue; // Skip transparent pixels
      
      const color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
    }
    
    // Get top 3 colors
    const sortedColors = Array.from(colorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([color]) => color);
    
    return sortedColors;
  } catch (error) {
    console.warn(`Could not analyze colors for ${imagePath}:`, error.message);
    return [];
  }
}

/**
 * Check if image has transparency
 */
async function hasTransparency(imagePath) {
  try {
    const img = await loadImage(imagePath);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const data = imageData.data;
    
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Generate tags from file path and metadata
 */
function generateTags(relativePath, metadata) {
  const tags = [];
  
  // Add folder-based tags
  const pathParts = relativePath.split('/');
  pathParts.slice(0, -1).forEach(part => {
    tags.push(part.toLowerCase());
  });
  
  // Add filename-based tags
  const filename = path.basename(relativePath, path.extname(relativePath));
  const filenameWords = filename.toLowerCase()
    .replace(/[_-]/g, ' ')
    .split(' ')
    .filter(word => word.length > 0);
  tags.push(...filenameWords);
  
  // Add type-based tags
  if (metadata.type === 'image') {
    tags.push('image', 'visual');
    
    // Add rarity tags based on dominant colors
    if (metadata.metadata.dominantColors) {
      const colors = metadata.metadata.dominantColors;
      if (colors.some(c => c.match(/#[89a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]/i))) {
        tags.push('rare', 'purple');
      } else if (colors.some(c => c.match(/#[a-f][a-f][0-9][0-9][0-9][0-9]/i))) {
        tags.push('magic', 'blue');
      } else if (colors.some(c => c.match(/#[a-f][a-f][a-f][0-9][0-9][0-9]/i))) {
        tags.push('unique', 'orange');
      }
    }
    
    // Add size-based tags
    if (metadata.metadata.width && metadata.metadata.height) {
      if (metadata.metadata.width === metadata.metadata.height) {
        tags.push('square');
      }
      if (metadata.metadata.width >= 128 || metadata.metadata.height >= 128) {
        tags.push('large');
      } else if (metadata.metadata.width <= 32 || metadata.metadata.height <= 32) {
        tags.push('small', 'icon');
      }
    }
  }
  
  // Add contextual tags based on path
  if (relativePath.includes('weapon')) {
    tags.push('equipment', 'weapon', 'combat');
  } else if (relativePath.includes('armor')) {
    tags.push('equipment', 'armor', 'defense');
  } else if (relativePath.includes('crafting')) {
    tags.push('material', 'crafting', 'consumable');
  } else if (relativePath.includes('ui')) {
    tags.push('interface', 'ui', 'button');
  } else if (relativePath.includes('enemy')) {
    tags.push('creature', 'enemy', 'combat');
  }
  
  return [...new Set(tags)]; // Remove duplicates
}

/**
 * Determine usage based on path and type
 */
function determineUsage(relativePath, metadata) {
  const usage = [];
  
  if (relativePath.includes('icons')) {
    usage.push('inventory_icon', 'ui_icon');
  } else if (relativePath.includes('buttons')) {
    usage.push('ui_button');
  } else if (relativePath.includes('frames')) {
    usage.push('ui_frame');
  } else if (relativePath.includes('weapons') || relativePath.includes('armor')) {
    usage.push('inventory_icon', 'equipment_display');
  } else if (relativePath.includes('enemies')) {
    usage.push('combat_sprite');
  } else if (relativePath.includes('backgrounds')) {
    usage.push('background', 'environment');
  } else if (metadata.type === 'audio') {
    if (relativePath.includes('sfx')) {
      usage.push('sound_effect');
    } else if (relativePath.includes('music')) {
      usage.push('background_music');
    }
  } else if (metadata.type === 'data') {
    usage.push('game_data');
  }
  
  return usage.length > 0 ? usage : ['unknown'];
}

/**
 * Process a single file
 */
async function processFile(filePath, relativePath) {
  const stats = fs.statSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  
  let type;
  if (IMAGE_EXTENSIONS.includes(ext)) {
    type = 'image';
  } else if (AUDIO_EXTENSIONS.includes(ext)) {
    type = 'audio';
  } else if (DATA_EXTENSIONS.includes(ext)) {
    type = 'data';
  } else {
    return null; // Unsupported file type
  }
  
  const metadata = {
    path: relativePath,
    type,
    metadata: {
      fileSize: stats.size
    }
  };
  
  // Process images
  if (type === 'image' && ext !== '.svg') {
    try {
      const img = await loadImage(filePath);
      metadata.metadata.width = img.width;
      metadata.metadata.height = img.height;
      metadata.metadata.dominantColors = await getDominantColors(filePath);
      metadata.metadata.hasTransparency = await hasTransparency(filePath);
    } catch (error) {
      console.warn(`Could not process image ${relativePath}:`, error.message);
    }
  }
  
  // Generate tags and usage
  metadata.tags = generateTags(relativePath, metadata);
  metadata.usage = determineUsage(relativePath, metadata);
  
  return metadata;
}

/**
 * Recursively scan directory
 */
async function scanDirectory(dir, baseDir = dir) {
  const assets = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Skip hidden directories and node_modules
      if (entry.name.startsWith('.') || entry.name === 'node_modules') {
        continue;
      }
      
      const subAssets = await scanDirectory(fullPath, baseDir);
      assets.push(...subAssets);
    } else if (entry.isFile()) {
      // Skip hidden files and the manifest itself
      if (entry.name.startsWith('.') || entry.name === 'manifest.json') {
        continue;
      }
      
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      const assetData = await processFile(fullPath, relativePath);
      
      if (assetData) {
        assets.push(assetData);
        console.log(`📄 Processed: ${relativePath}`);
      }
    }
  }
  
  return assets;
}

/**
 * Main function
 */
async function generateManifest() {
  console.log('🔄 Generating asset manifest...');
  
  if (!fs.existsSync(ASSETS_DIR)) {
    console.error(`❌ Assets directory not found: ${ASSETS_DIR}`);
    process.exit(1);
  }
  
  try {
    const assets = await scanDirectory(ASSETS_DIR);
    
    const manifest = {
      version: '1.0.0',
      generated: new Date().toISOString(),
      assets: assets.sort((a, b) => a.path.localeCompare(b.path))
    };
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2));
    
    console.log(`✅ Asset manifest generated successfully!`);
    console.log(`📦 Total assets: ${assets.length}`);
    console.log(`💾 Saved to: ${OUTPUT_FILE}`);
    
    // Print summary by type
    const summary = assets.reduce((acc, asset) => {
      acc[asset.type] = (acc[asset.type] || 0) + 1;
      return acc;
    }, {});
    
    console.log('📊 Summary by type:');
    Object.entries(summary).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
    
  } catch (error) {
    console.error('❌ Error generating manifest:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  generateManifest();
}

module.exports = { generateManifest };