import './style.css'
import { gameStore } from './stores/GameStore'
import { uiStore } from './stores/UIStore'
import { GameLayout } from './components/Layout'
import { logger } from './services/Logger'

// Import custom elements
import './components/CharacterEquipment'
import './components/InventoryGrid'
import './components/ItemTooltip'

// Initialize the game
let gameLayout: GameLayout | null = null

async function initGame() {
  logger.info('🎮 Initializing Loot & Craft...')
  
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
    logger.info('🔄 Starting game store initialization...')
    await gameStore.initializeGame()
    logger.info('✅ Game store initialized successfully!')
    
    // Initialize game layout with reactive rendering
    logger.info('🔄 Starting game layout initialization...')
    gameLayout = new GameLayout(app)
    logger.info('✅ Game layout initialized successfully!')
    
    // Expose gameStore to window for debugging
    ;(window as any).gameStore = gameStore
    ;(window as any).uiStore = uiStore
    logger.info('🔧 Debug stores exposed to window.gameStore and window.uiStore')
    
    logger.info('✅ Game initialized successfully!')
  } catch (error) {
    logger.error('❌ Failed to initialize game:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    if (errorStack) {
      logger.error('Error stack:', errorStack)
    }
    logger.error('Error message:', errorMessage)
    
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
