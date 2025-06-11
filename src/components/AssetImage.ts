/**
 * Asset Image Component Utilities
 * Helper functions for loading and displaying asset images
 */

import { assetManager } from '../services/AssetManager';

export interface AssetImageOptions {
  fallback?: string;
  preload?: boolean;
  onLoad?: (img: HTMLImageElement) => void;
  onError?: (error: Error) => void;
}

/**
 * Create an image element for an asset
 */
export async function createAssetImage(
  path: string, 
  options: AssetImageOptions = {}
): Promise<HTMLImageElement> {
  try {
    const asset = await assetManager.loadAsset(path);
    
    if (asset.metadata.type !== 'image') {
      throw new Error(`Asset ${path} is not an image`);
    }
    
    const img = asset.data as HTMLImageElement;
    
    // Clone the image to avoid conflicts
    const clone = new Image();
    clone.src = img.src;
    clone.alt = path;
    clone.loading = 'lazy';
    
    if (options.onLoad) {
      clone.onload = () => options.onLoad!(clone);
    }
    
    return clone;
  } catch (error) {
    console.warn(`Failed to load asset image: ${path}`, error);
    
    if (options.fallback) {
      try {
        return createAssetImage(options.fallback, { ...options, fallback: undefined });
      } catch (fallbackError) {
        console.warn(`Fallback image also failed: ${options.fallback}`, fallbackError);
      }
    }
    
    if (options.onError) {
      options.onError(error instanceof Error ? error : new Error(String(error)));
    }
    
    // Return a placeholder image
    const placeholder = new Image();
    placeholder.src = 'data:image/svg+xml;base64,' + btoa(`
      <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="64" fill="#333"/>
        <text x="32" y="35" font-family="Arial" font-size="10" fill="#666" text-anchor="middle">
          Missing
        </text>
      </svg>
    `);
    placeholder.alt = `Missing: ${path}`;
    
    return placeholder;
  }
}

/**
 * Create a CSS background-image URL for an asset
 */
export async function getAssetBackgroundUrl(path: string): Promise<string> {
  try {
    const asset = await assetManager.loadAsset(path);
    if (asset.metadata.type !== 'image') {
      throw new Error(`Asset ${path} is not an image`);
    }
    
    const img = asset.data as HTMLImageElement;
    return `url(${img.src})`;
  } catch (error) {
    console.warn(`Failed to get background URL for asset: ${path}`, error);
    return 'none';
  }
}

/**
 * Preload multiple asset images
 */
export async function preloadAssetImages(paths: string[]): Promise<void> {
  try {
    await assetManager.preloadAssets(paths);
    console.log(`✅ Preloaded ${paths.length} images`);
  } catch (error) {
    console.warn('⚠️ Some images failed to preload:', error);
  }
}

/**
 * Create a DOM image element and append it to a container
 */
export async function appendAssetImage(
  container: HTMLElement,
  path: string,
  options: AssetImageOptions & { className?: string } = {}
): Promise<HTMLImageElement> {
  const img = await createAssetImage(path, options);
  
  if (options.className) {
    img.className = options.className;
  }
  
  container.appendChild(img);
  return img;
}

/**
 * Set an element's background to an asset image
 */
export async function setAssetBackground(
  element: HTMLElement,
  path: string,
  options: { size?: string; position?: string; repeat?: string } = {}
): Promise<void> {
  const backgroundUrl = await getAssetBackgroundUrl(path);
  
  element.style.backgroundImage = backgroundUrl;
  element.style.backgroundSize = options.size || 'contain';
  element.style.backgroundPosition = options.position || 'center';
  element.style.backgroundRepeat = options.repeat || 'no-repeat';
}

/**
 * Search for assets by tags and return paths
 */
export function searchAssetPaths(tags: string[]): string[] {
  const results = assetManager.searchAssets(tags);
  return results.map(asset => asset.path);
}

/**
 * Get all assets of a specific usage type
 */
export function getAssetPathsByUsage(usage: string): string[] {
  const results = assetManager.getAssetsByUsage(usage);
  return results.map(asset => asset.path);
}