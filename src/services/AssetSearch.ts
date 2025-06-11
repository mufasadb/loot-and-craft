/**
 * Advanced Asset Search Service
 * Optimized search for large collections (6000+ assets)
 */

import { assetManager } from './AssetManager';
import { AssetMetadata } from './AssetManager';

export interface SearchFilters {
  collection?: 'fantasy-icons' | 'classic-rpg-gui' | 'custom';
  category?: string[];
  theme?: string[];
  rarity?: string[];
  usage?: string[];
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  equipment?: 'weapon' | 'armor' | 'accessory';
}

export interface SearchOptions {
  limit?: number;
  fuzzy?: boolean;
  sortBy?: 'relevance' | 'name' | 'size';
}

class AssetSearchService {
  private searchIndex: Map<string, AssetMetadata[]> = new Map();
  private initialized = false;

  /**
   * Build search indexes for fast lookups
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await assetManager.initialize();
    this.buildSearchIndexes();
    this.initialized = true;
    console.log('🔍 Asset search service initialized');
  }

  /**
   * Build search indexes from manifest
   */
  private buildSearchIndexes(): void {
    if (!assetManager['manifest']) return;

    const assets = assetManager['manifest'].assets;
    
    // Build tag index
    assets.forEach(asset => {
      asset.tags.forEach(tag => {
        if (!this.searchIndex.has(tag)) {
          this.searchIndex.set(tag, []);
        }
        this.searchIndex.get(tag)!.push(asset);
      });
    });

    console.log(`📊 Built search index with ${this.searchIndex.size} unique tags`);
  }

  /**
   * Search for assets by query string
   */
  searchByQuery(query: string, options: SearchOptions = {}): AssetMetadata[] {
    if (!this.initialized) {
      console.warn('Asset search not initialized');
      return [];
    }

    const terms = query.toLowerCase().split(' ').filter(term => term.length > 0);
    const results = new Map<string, { asset: AssetMetadata, score: number }>();

    terms.forEach(term => {
      // Exact match
      const exactMatches = this.searchIndex.get(term) || [];
      exactMatches.forEach(asset => {
        const current = results.get(asset.path) || { asset, score: 0 };
        current.score += 10; // High score for exact match
        results.set(asset.path, current);
      });

      // Fuzzy match if enabled
      if (options.fuzzy) {
        this.searchIndex.forEach((assets, tag) => {
          if (tag.includes(term) || term.includes(tag)) {
            assets.forEach(asset => {
              const current = results.get(asset.path) || { asset, score: 0 };
              current.score += 5; // Lower score for fuzzy match
              results.set(asset.path, current);
            });
          }
        });
      }
    });

    // Convert to array and sort
    let resultArray = Array.from(results.values());

    switch (options.sortBy) {
      case 'name':
        resultArray.sort((a, b) => a.asset.path.localeCompare(b.asset.path));
        break;
      case 'size':
        resultArray.sort((a, b) => (b.asset.metadata.fileSize || 0) - (a.asset.metadata.fileSize || 0));
        break;
      case 'relevance':
      default:
        resultArray.sort((a, b) => b.score - a.score);
        break;
    }

    // Apply limit
    if (options.limit) {
      resultArray = resultArray.slice(0, options.limit);
    }

    return resultArray.map(r => r.asset);
  }

  /**
   * Advanced search with filters
   */
  searchWithFilters(filters: SearchFilters, options: SearchOptions = {}): AssetMetadata[] {
    if (!this.initialized) {
      console.warn('Asset search not initialized');
      return [];
    }

    let results = assetManager['manifest']?.assets || [];

    // Apply collection filter
    if (filters.collection) {
      const collectionMap = {
        'fantasy-icons': '5000FantasyIcons',
        'classic-rpg-gui': 'Classic_RPG_GUI',
        'custom': ''
      };
      const pathFilter = collectionMap[filters.collection];
      results = results.filter(asset => 
        filters.collection === 'custom' 
          ? !asset.path.includes('5000FantasyIcons') && !asset.path.includes('Classic_RPG_GUI')
          : asset.path.includes(pathFilter)
      );
    }

    // Apply category filters
    if (filters.category && filters.category.length > 0) {
      results = results.filter(asset =>
        filters.category!.some(cat => asset.tags.includes(cat))
      );
    }

    // Apply theme filters
    if (filters.theme && filters.theme.length > 0) {
      results = results.filter(asset =>
        filters.theme!.some(theme => asset.tags.includes(theme))
      );
    }

    // Apply rarity filters
    if (filters.rarity && filters.rarity.length > 0) {
      results = results.filter(asset =>
        filters.rarity!.some(rarity => asset.tags.includes(rarity))
      );
    }

    // Apply usage filters
    if (filters.usage && filters.usage.length > 0) {
      results = results.filter(asset =>
        filters.usage!.some(usage => asset.usage.includes(usage))
      );
    }

    // Apply size filter
    if (filters.size) {
      results = results.filter(asset => asset.tags.includes(filters.size!));
    }

    // Apply equipment filter
    if (filters.equipment) {
      const equipmentTags = {
        'weapon': ['sword', 'axe', 'bow', 'staff', 'mace', 'dagger'],
        'armor': ['helmet', 'chest', 'gloves', 'boots', 'pants', 'shoulder', 'belt'],
        'accessory': ['ring', 'necklace', 'bracelet']
      };
      
      results = results.filter(asset =>
        equipmentTags[filters.equipment!].some(tag => asset.tags.includes(tag))
      );
    }

    // Apply limit
    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Get random assets from a collection
   */
  getRandomAssets(count: number, filters?: SearchFilters): AssetMetadata[] {
    let pool = filters ? this.searchWithFilters(filters) : (assetManager['manifest']?.assets || []);
    
    const shuffled = pool.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  /**
   * Get collection statistics
   */
  getCollectionStats() {
    if (!assetManager['manifest']) return null;

    const manifest = assetManager['manifest'];
    return {
      totalAssets: manifest.totalAssets || manifest.assets.length,
      collections: manifest.collections || {},
      topTags: this.getTopTags(20),
      searchIndexSize: this.searchIndex.size
    };
  }

  /**
   * Get most common tags
   */
  private getTopTags(limit: number): { tag: string, count: number }[] {
    const tagCounts = new Map<string, number>();
    
    this.searchIndex.forEach((assets, tag) => {
      tagCounts.set(tag, assets.length);
    });

    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag, count]) => ({ tag, count }));
  }

  /**
   * Find similar assets based on tags
   */
  findSimilar(asset: AssetMetadata, limit: number = 10): AssetMetadata[] {
    const candidates = new Map<string, number>();

    asset.tags.forEach(tag => {
      const relatedAssets = this.searchIndex.get(tag) || [];
      relatedAssets.forEach(related => {
        if (related.path !== asset.path) {
          candidates.set(related.path, (candidates.get(related.path) || 0) + 1);
        }
      });
    });

    const sorted = Array.from(candidates.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    const manifest = assetManager['manifest'];
    if (!manifest) return [];

    return sorted.map(([path]) => 
      manifest.assets.find(a => a.path === path)!
    ).filter(Boolean);
  }
}

// Singleton instance
export const assetSearch = new AssetSearchService();