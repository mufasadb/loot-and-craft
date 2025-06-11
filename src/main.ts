import './style.css'
import { gameStore } from './stores/GameStore'
import { uiStore } from './stores/UIStore'

// Initialize the game
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
    await gameStore.initializeGame()
    
    // Render main game interface
    renderGame()
    
    console.log('✅ Game initialized successfully!')
  } catch (error) {
    console.error('❌ Failed to initialize game:', error)
    app.innerHTML = `
      <div class="error-screen">
        <h1>⚠️ Error</h1>
        <p>Failed to load the game. Please refresh and try again.</p>
      </div>
    `
  }
}

function renderGame() {
  const app = document.querySelector<HTMLDivElement>('#app')!
  
  app.innerHTML = `
    <div class="game-container">
      <div class="panels">
        <div class="panel left-panel ${uiStore.isMobile && !uiStore.leftPanelOpen ? 'collapsed' : ''}">
          <h2>Character</h2>
          <div class="player-info">
            <p><strong>${gameStore.player?.name}</strong></p>
            <p>Level: ${gameStore.player?.level}</p>
            <p>Gold: ${gameStore.player?.gold}</p>
          </div>
        </div>
        
        <div class="panel center-panel">
          <h2>Town</h2>
          <div class="town-activities">
            <button class="activity-btn">🏰 Dungeon</button>
            <button class="activity-btn">🔨 Craft</button>
            <button class="activity-btn">🛒 Trade</button>
            <button class="activity-btn">🏖️ Beach</button>
          </div>
        </div>
        
        <div class="panel right-panel ${uiStore.isMobile && !uiStore.rightPanelOpen ? 'collapsed' : ''}">
          <h2>Inventory</h2>
          <div class="inventory-grid">
            <p>Empty inventory</p>
          </div>
        </div>
      </div>
      
      ${uiStore.isMobile ? `
        <div class="mobile-controls">
          <button onclick="toggleLeftPanel()">📊</button>
          <button onclick="toggleRightPanel()">🎒</button>
        </div>
      ` : ''}
    </div>
  `
}

// Global functions for mobile controls
(window as any).toggleLeftPanel = () => uiStore.toggleLeftPanel();
(window as any).toggleRightPanel = () => uiStore.toggleRightPanel();

// Start the game
initGame()
