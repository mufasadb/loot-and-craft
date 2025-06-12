import { createClient } from '@supabase/supabase-js'

// Environment variables for Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types based on our schema
export interface Database {
  public: {
    Tables: {
      asset_manifests: {
        Row: {
          id: string
          version: string
          generated: string
          collections: Record<string, number>
          total_assets: number
          created_at: string
        }
        Insert: {
          version: string
          generated: string
          collections: Record<string, number>
          total_assets: number
          created_at?: string
        }
        Update: {
          version?: string
          generated?: string
          collections?: Record<string, number>
          total_assets?: number
        }
      }
      assets: {
        Row: {
          id: string
          path: string
          type: string
          file_size: number
          last_modified: string
          tags: string[]
          usage: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          path: string
          type: string
          file_size: number
          last_modified: string
          tags?: string[]
          usage?: string[]
        }
        Update: {
          path?: string
          type?: string
          file_size?: number
          last_modified?: string
          tags?: string[]
          usage?: string[]
        }
      }
      players: {
        Row: {
          id: string
          user_id: string
          name: string
          level: number
          experience: number
          gold: number
          created_at: string
          updated_at: string
          base_health: number
          base_mana: number
          base_energy_shield: number
          base_armor: number
          base_damage: number
          current_health: number
          current_mana: number
          current_energy_shield: number
        }
        Insert: {
          user_id: string
          name: string
          level?: number
          experience?: number
          gold?: number
          base_health?: number
          base_mana?: number
          base_energy_shield?: number
          base_armor?: number
          base_damage?: number
          current_health?: number
          current_mana?: number
          current_energy_shield?: number
        }
        Update: {
          name?: string
          level?: number
          experience?: number
          gold?: number
          base_health?: number
          base_mana?: number
          base_energy_shield?: number
          base_armor?: number
          base_damage?: number
          current_health?: number
          current_mana?: number
          current_energy_shield?: number
        }
      }
      items: {
        Row: {
          id: string
          player_id: string
          name: string
          type: string
          slot: string | null
          rarity: string
          tier: number
          base_stats: Record<string, any>
          location: string
          stash_tab: number
          position_x: number
          position_y: number
          image_path: string | null
          description: string | null
          created_at: string
          equipped_loadout: number | null
        }
        Insert: {
          player_id: string
          name: string
          type: string
          slot?: string | null
          rarity?: string
          tier?: number
          base_stats?: Record<string, any>
          location?: string
          stash_tab?: number
          position_x?: number
          position_y?: number
          image_path?: string | null
          description?: string | null
          equipped_loadout?: number | null
        }
        Update: {
          name?: string
          type?: string
          slot?: string | null
          rarity?: string
          tier?: number
          base_stats?: Record<string, any>
          location?: string
          stash_tab?: number
          position_x?: number
          position_y?: number
          image_path?: string | null
          description?: string | null
          equipped_loadout?: number | null
        }
      }
      game_sessions: {
        Row: {
          id: string
          player_id: string
          current_activity: string
          combat_data: Record<string, any> | null
          dungeon_data: Record<string, any> | null
          created_at: string
          updated_at: string
        }
        Insert: {
          player_id: string
          current_activity?: string
          combat_data?: Record<string, any> | null
          dungeon_data?: Record<string, any> | null
        }
        Update: {
          current_activity?: string
          combat_data?: Record<string, any> | null
          dungeon_data?: Record<string, any> | null
        }
      }
    }
  }
}

// Service for game data persistence
export class GameDataService {
  static async createPlayer(userId: string, name: string) {
    const { data, error } = await supabase
      .from('players')
      .insert({
        user_id: userId,
        name: name
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating player:', error)
      throw error
    }

    return data
  }

  static async getPlayer(userId: string) {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error loading player:', error)
      throw error
    }

    return data
  }

  static async updatePlayer(playerId: string, updates: Database['public']['Tables']['players']['Update']) {
    const { data, error } = await supabase
      .from('players')
      .update(updates)
      .eq('id', playerId)
      .select()
      .single()

    if (error) {
      console.error('Error updating player:', error)
      throw error
    }

    return data
  }

  static async getPlayerItems(playerId: string) {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('player_id', playerId)

    if (error) {
      console.error('Error loading items:', error)
      throw error
    }

    return data || []
  }

  static async saveGameSession(playerId: string, sessionData: Database['public']['Tables']['game_sessions']['Update']) {
    const { data, error } = await supabase
      .from('game_sessions')
      .upsert({
        player_id: playerId,
        ...sessionData
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving game session:', error)
      throw error
    }

    return data
  }

  static async getGameSession(playerId: string) {
    const { data, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('player_id', playerId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading game session:', error)
      throw error
    }

    return data
  }

  // Auth helpers
  static async signUp(email: string, password: string) {
    return await supabase.auth.signUp({ email, password })
  }

  static async signIn(email: string, password: string) {
    return await supabase.auth.signInWithPassword({ email, password })
  }

  static async signOut() {
    return await supabase.auth.signOut()
  }

  static async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  }

  static onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback)
  }
}