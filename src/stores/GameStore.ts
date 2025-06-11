import { makeObservable, observable, action } from 'mobx'
import { assetManager } from '../services/AssetManager'

export interface GameState {
  isLoading: boolean
  currentScreen: 'town' | 'combat' | 'dungeon' | 'craft' | 'trade'
  player: PlayerState | null
}

export interface PlayerState {
  id: string
  name: string
  level: number
  gold: number
  experience: number
}

export class GameStore {
  isLoading = true
  currentScreen: GameState['currentScreen'] = 'town'
  player: PlayerState | null = null

  constructor() {
    makeObservable(this, {
      isLoading: observable,
      currentScreen: observable,
      player: observable,
      setLoading: action,
      setCurrentScreen: action,
      setPlayer: action,
      initializeGame: action
    })
  }

  setLoading(loading: boolean) {
    this.isLoading = loading
  }

  setCurrentScreen(screen: GameState['currentScreen']) {
    this.currentScreen = screen
  }

  setPlayer(player: PlayerState | null) {
    this.player = player
  }

  async initializeGame() {
    this.setLoading(true)
    
    try {
      // Initialize asset manager
      console.log('🔄 Initializing asset manager...')
      await assetManager.initialize()
      console.log('✅ Asset manager initialized')
      
      // Preload critical UI assets
      const criticalAssets = [
        'ui/icons/health.svg',
        'ui/icons/mana.svg',
        'ui/icons/attack.svg',
        'ui/icons/defense.svg'
      ].filter(path => assetManager.getCachedAsset(path) === null)
      
      if (criticalAssets.length > 0) {
        console.log(`🔄 Preloading ${criticalAssets.length} critical assets...`)
        try {
          await assetManager.preloadAssets(criticalAssets)
          console.log('✅ Critical assets preloaded')
        } catch (error) {
          console.warn('⚠️ Some critical assets failed to load:', error)
        }
      }
      
      // TODO: Load player data from Supabase or create new player
      const defaultPlayer: PlayerState = {
        id: 'player-1',
        name: 'Adventurer',
        level: 1,
        gold: 100,
        experience: 0
      }
      
      this.setPlayer(defaultPlayer)
    } catch (error) {
      console.error('❌ Failed to initialize game:', error)
      throw error
    } finally {
      this.setLoading(false)
    }
  }
}

// Create singleton instance
export const gameStore = new GameStore()