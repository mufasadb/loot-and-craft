import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types (will be generated/updated as schema evolves)
export interface Database {
  public: {
    Tables: {
      // Will be defined as we build out the game
    }
  }
}

// Service for game data persistence
export class GameDataService {
  static async savePlayerData(playerId: string, data: any) {
    // Will implement player data saving
    console.log('Saving player data:', playerId, data)
  }

  static async loadPlayerData(playerId: string) {
    // Will implement player data loading
    console.log('Loading player data:', playerId)
    return null
  }

  static async saveGameState(playerId: string, gameState: any) {
    // Will implement game state saving
    console.log('Saving game state:', playerId, gameState)
  }
}