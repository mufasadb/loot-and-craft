/**
 * Asset Management System for Loot & Craft
 * Handles loading, caching, and tagging of game assets
 */

export interface AssetMetadata {
  path: string;
  tags: string[];
  metadata: {
    width?: number;
    height?: number;
    fileSize?: number;
    dominantColors?: string[];
    hasTransparency?: boolean;
  };
  usage: string[];
  type: 'image' | 'audio' | 'data';
}

export interface AssetManifest {
  version: string;
  generated: string;
  collections?: {
    [key: string]: number;
  };
  totalAssets?: number;
  assets: AssetMetadata[];
}

export interface LoadedAsset {
  data: HTMLImageElement | HTMLAudioElement | any;
  metadata: AssetMetadata;
  loadedAt: number;
}

class AssetManagerService {
  private cache: Map<string, LoadedAsset> = new Map();
  private manifest: AssetManifest | null = null;
  private loadingPromises: Map<string, Promise<LoadedAsset>> = new Map();

  /**
   * Initialize the asset manager by loading the manifest
   */
  async initialize(): Promise<void> {
    try {
      const response = await fetch('/assets/manifest.json');
      if (!response.ok) {
        throw new Error(`Failed to load asset manifest: ${response.status}`);
      }
      this.manifest = await response.json();
      console.log(`📦 Asset manifest loaded: ${this.manifest?.assets.length || 0} assets`);
    } catch (error) {
      console.warn('⚠️ Asset manifest not found, running without manifest');
      this.manifest = { version: '1.0.0', generated: Date.now().toString(), assets: [] };
    }
  }

  /**
   * Load an asset by path, with caching
   */
  async loadAsset(path: string): Promise<LoadedAsset> {
    // Check cache first
    const cached = this.cache.get(path);
    if (cached) {
      return cached;
    }

    // Check if already loading
    const loading = this.loadingPromises.get(path);
    if (loading) {
      return loading;
    }

    // Start loading
    const loadPromise = this.doLoadAsset(path);
    this.loadingPromises.set(path, loadPromise);

    try {
      const asset = await loadPromise;
      this.cache.set(path, asset);
      this.loadingPromises.delete(path);
      return asset;
    } catch (error) {
      this.loadingPromises.delete(path);
      throw error;
    }
  }

  /**
   * Actually perform the asset loading
   */
  private async doLoadAsset(path: string): Promise<LoadedAsset> {
    const metadata = this.getAssetMetadata(path);
    const fullPath = `/assets/${path}`;

    let data: HTMLImageElement | HTMLAudioElement | any;

    if (metadata.type === 'image') {
      data = await this.loadImage(fullPath);
    } else if (metadata.type === 'audio') {
      data = await this.loadAudio(fullPath);
    } else if (metadata.type === 'data') {
      data = await this.loadData(fullPath);
    } else {
      throw new Error(`Unknown asset type for ${path}`);
    }

    return {
      data,
      metadata,
      loadedAt: Date.now()
    };
  }

  /**
   * Load an image asset
   */
  private loadImage(fullPath: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${fullPath}`));
      img.src = fullPath;
    });
  }

  /**
   * Load an audio asset
   */
  private loadAudio(fullPath: string): Promise<HTMLAudioElement> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.oncanplaythrough = () => resolve(audio);
      audio.onerror = () => reject(new Error(`Failed to load audio: ${fullPath}`));
      audio.src = fullPath;
    });
  }

  /**
   * Load a data asset (JSON)
   */
  private async loadData(fullPath: string): Promise<any> {
    const response = await fetch(fullPath);
    if (!response.ok) {
      throw new Error(`Failed to load data: ${fullPath}`);
    }
    return response.json();
  }

  /**
   * Get metadata for an asset path
   */
  private getAssetMetadata(path: string): AssetMetadata {
    if (this.manifest) {
      const found = this.manifest.assets.find(asset => asset.path === path);
      if (found) return found;
    }

    // Generate basic metadata if not in manifest
    const extension = path.split('.').pop()?.toLowerCase() || '';
    let type: 'image' | 'audio' | 'data';
    
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension)) {
      type = 'image';
    } else if (['mp3', 'wav', 'ogg', 'm4a'].includes(extension)) {
      type = 'audio';
    } else {
      type = 'data';
    }

    return {
      path,
      tags: this.generateTagsFromPath(path),
      metadata: {},
      usage: ['unknown'],
      type
    };
  }

  /**
   * Generate basic tags from file path
   */
  private generateTagsFromPath(path: string): string[] {
    const parts = path.split('/');
    const filename = parts[parts.length - 1].split('.')[0];
    return [
      ...parts.slice(0, -1), // folder names
      filename.toLowerCase().replace(/[_-]/g, ' ').split(' ')
    ].flat().filter(tag => tag.length > 0);
  }

  /**
   * Search assets by tags
   */
  searchAssets(tags: string[]): AssetMetadata[] {
    if (!this.manifest) return [];

    return this.manifest.assets.filter(asset => 
      tags.some(tag => 
        asset.tags.some(assetTag => 
          assetTag.toLowerCase().includes(tag.toLowerCase())
        )
      )
    );
  }

  /**
   * Get assets by usage type
   */
  getAssetsByUsage(usage: string): AssetMetadata[] {
    if (!this.manifest) return [];

    return this.manifest.assets.filter(asset => 
      asset.usage.includes(usage)
    );
  }

  /**
   * Preload a set of assets
   */
  async preloadAssets(paths: string[]): Promise<LoadedAsset[]> {
    const promises = paths.map(path => this.loadAsset(path));
    return Promise.all(promises);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      loadingCount: this.loadingPromises.size,
      totalAssets: this.manifest?.assets.length || 0
    };
  }

  /**
   * Clear cache (useful for memory management)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Asset cache cleared');
  }

  /**
   * Get a cached asset without loading
   */
  getCachedAsset(path: string): LoadedAsset | null {
    return this.cache.get(path) || null;
  }
}

// Singleton instance
export const assetManager = new AssetManagerService();