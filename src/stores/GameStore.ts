import { makeObservable, observable, action } from 'mobx'

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
    
    // TODO: Load player data from Supabase or create new player
    const defaultPlayer: PlayerState = {
      id: 'player-1',
      name: 'Adventurer',
      level: 1,
      gold: 100,
      experience: 0
    }
    
    this.setPlayer(defaultPlayer)
    this.setLoading(false)
  }
}

// Create singleton instance
export const gameStore = new GameStore()