import { supabase } from './supabase'

export interface AssetManifest {
  version: string
  generated: string
  collections: Record<string, number>
  totalAssets: number
  assets: Asset[]
}

export interface Asset {
  path: string
  type: string
  metadata: {
    fileSize: number
    lastModified: string
  }
  tags: string[]
  usage: string[]
}

export class AssetService {
  /**
   * Upload the entire asset manifest to Supabase
   */
  static async uploadManifest(manifest: AssetManifest) {
    try {
      // First, create/update the manifest metadata
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

      // Then upload assets in batches (Supabase has limits on bulk inserts)
      const batchSize = 100
      const totalBatches = Math.ceil(manifest.assets.length / batchSize)
      
      console.log(`Uploading ${manifest.assets.length} assets in ${totalBatches} batches...`)

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

        console.log(`Uploaded batch ${i + 1}/${totalBatches}`)
      }

      console.log('Asset manifest uploaded successfully!')
      return true
    } catch (error) {
      console.error('Failed to upload asset manifest:', error)
      throw error
    }
  }

  /**
   * Search assets by tags, usage, or path
   */
  static async searchAssets(query: {
    tags?: string[]
    usage?: string[]
    pathContains?: string
    type?: string
    limit?: number
  }) {
    let queryBuilder = supabase
      .from('assets')
      .select('*')

    if (query.tags?.length) {
      queryBuilder = queryBuilder.overlaps('tags', query.tags)
    }

    if (query.usage?.length) {
      queryBuilder = queryBuilder.overlaps('usage', query.usage)
    }

    if (query.pathContains) {
      queryBuilder = queryBuilder.ilike('path', `%${query.pathContains}%`)
    }

    if (query.type) {
      queryBuilder = queryBuilder.eq('type', query.type)
    }

    if (query.limit) {
      queryBuilder = queryBuilder.limit(query.limit)
    }

    const { data, error } = await queryBuilder

    if (error) {
      console.error('Error searching assets:', error)
      throw error
    }

    return data || []
  }

  /**
   * Get assets by collection (derived from path)
   */
  static async getAssetsByCollection(collection: 'fantasy-icons' | 'classic-rpg-gui' | 'custom') {
    const pathPattern = collection === 'fantasy-icons' ? '%5000FantasyIcons%' :
                       collection === 'classic-rpg-gui' ? '%ClassicRPGGUI%' :
                       '%custom%'

    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .ilike('path', pathPattern)

    if (error) {
      console.error('Error getting assets by collection:', error)
      throw error
    }

    return data || []
  }

  /**
   * Get random assets for UI elements
   */
  static async getRandomAssets(usage: string[], count: number = 10) {
    // Note: Supabase doesn't have a built-in random function, so we'll use a workaround
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .overlaps('usage', usage)
      .limit(count * 3) // Get more than needed and pick randomly

    if (error) {
      console.error('Error getting random assets:', error)
      throw error
    }

    if (!data || data.length === 0) return []

    // Shuffle and take the requested count
    const shuffled = data.sort(() => 0.5 - Math.random())
    return shuffled.slice(0, count)
  }

  /**
   * Get assets suitable for UI elements (buttons, frames, etc.)
   */
  static async getUIAssets() {
    return this.searchAssets({
      usage: ['ui_element', 'button', 'frame', 'background'],
      limit: 50
    })
  }

  /**
   * Get assets suitable for equipment display
   */
  static async getEquipmentAssets() {
    return this.searchAssets({
      usage: ['inventory_icon', 'equipment_display'],
      limit: 100
    })
  }
}