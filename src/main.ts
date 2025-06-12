import './style.css'
import { gameStore } from './stores/GameStore'
import { uiStore } from './stores/UIStore'
import { GameLayout } from './components/Layout'

// Import custom elements
import './components/CharacterEquipment'
import './components/InventoryGrid'
import './components/ItemTooltip'

// Initialize the game
let gameLayout: GameLayout | null = null

async function initGame() {
  console.log('🎮 Initializing Loot & Craft...')
  
  const app = document.querySelector<HTMLDivElement>('#app')!
  
  // Show loading screen
  app.innerHTML = `
    <div class="loading-screen">
      <h1>⚔️ Loot & Craft</h1>
      <p>Loading your adventure...</p>
      <div class="loading-bar">
        <div class="loading-progress"></div>
      </div>
    </div>
  `
  
  try {
    // Initialize game stores
    console.log('🔄 Starting game store initialization...')
    await gameStore.initializeGame()
    console.log('✅ Game store initialized successfully!')
    
    // Initialize game layout with reactive rendering
    console.log('🔄 Starting game layout initialization...')
    gameLayout = new GameLayout(app)
    console.log('✅ Game layout initialized successfully!')
    
    // Expose gameStore to window for debugging
    ;(window as any).gameStore = gameStore
    ;(window as any).uiStore = uiStore
    console.log('🔧 Debug stores exposed to window.gameStore and window.uiStore')
    
    console.log('✅ Game initialized successfully!')
  } catch (error) {
    console.error('❌ Failed to initialize game:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    if (errorStack) {
      console.error('Error stack:', errorStack)
    }
    console.error('Error message:', errorMessage)
    
    app.innerHTML = `
      <div class="error-screen">
        <h1>⚠️ Error</h1>
        <p>Failed to load the game. Please refresh and try again.</p>
        <p><small>${errorMessage}</small></p>
        <button onclick="location.reload()">🔄 Retry</button>
      </div>
    `
  }
}

// Clean up function for page unload
window.addEventListener('beforeunload', () => {
  if (gameLayout) {
    gameLayout.dispose()
  }
})

// Handle window resize events
window.addEventListener('resize', () => {
  uiStore.updateScreenSize()
})

// Start the game
initGame()
