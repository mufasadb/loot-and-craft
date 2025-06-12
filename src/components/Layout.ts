import { uiStore } from '../stores/UIStore'
import { gameStore } from '../stores/GameStore'
import { AssetService } from '../services/AssetService'
import { autorun } from 'mobx'
import { CombatArena } from './CombatArena'
import { logger } from '../services/Logger'

export class GameLayout {
  private app: HTMLElement
  private disposer: (() => void) | null = null
  private dragCleanupFunctions: (() => void)[] = []
  private combatArena: CombatArena | null = null
  private backgroundAssets: {
    panel?: string;
    container?: string;
    button?: string;
    frame?: string;
  } = {}
  private assetsLoaded = false

  constructor(app: HTMLElement) {
    this.app = app
    this.loadBackgroundAssets()
    this.setupAutorun()
  }

  private setupAutorun() {
    // Auto-render when observable state changes
    this.disposer = autorun(() => {
      // Access ALL observables here to trigger re-run
      // Use gameStore.currentScreen as the primary source of truth for screen state
      const centerContent = gameStore.currentScreen === 'town' ? 'town' :
                          gameStore.currentScreen === 'combat' ? 'combat' :
                          gameStore.currentScreen === 'dungeon' ? 'dungeon' :
                          gameStore.currentScreen === 'craft' ? 'craft' :
                          gameStore.currentScreen === 'trade' ? 'trade' :
                          uiStore.centerContent
      const leftPanelOpen = uiStore.leftPanelOpen
      const rightPanelOpen = uiStore.rightPanelOpen
      const isMobile = uiStore.isMobile
      const inventoryFilter = uiStore.inventoryFilter
      const player = gameStore.player
      const currentScreen = gameStore.currentScreen
      
      // Pass all values to render to avoid accessing observables inside render
      this.render({
        centerContent,
        leftPanelOpen,
        rightPanelOpen,
        isMobile,
        inventoryFilter,
        player,
        currentScreen
      })
    })
  }

  private async loadBackgroundAssets() {
    if (this.assetsLoaded) return;
    
    try {
      // Search for different types of UI assets from Classic RPG GUI collection
      const [panelAssets, buttonAssets, frameAssets, containerAssets] = await Promise.all([
        AssetService.searchAssets({
          tags: ['panel', 'background', 'window'],
          usage: ['ui_element', 'background'],
          pathContains: 'classic',
          limit: 3
        }),
        AssetService.searchAssets({
          tags: ['button', 'ui'],
          usage: ['ui_element', 'button'],
          pathContains: 'classic',
          limit: 3
        }),
        AssetService.searchAssets({
          tags: ['frame', 'border'],
          usage: ['ui_element', 'frame'],
          pathContains: 'classic',
          limit: 3
        }),
        AssetService.searchAssets({
          tags: ['container', 'box', 'inventory'],
          usage: ['ui_element', 'background'],
          pathContains: 'classic',
          limit: 3
        })
      ]);

      // Store the first suitable asset from each category
      if (panelAssets.length > 0) this.backgroundAssets.panel = panelAssets[0].path;
      if (buttonAssets.length > 0) this.backgroundAssets.button = buttonAssets[0].path;
      if (frameAssets.length > 0) this.backgroundAssets.frame = frameAssets[0].path;
      if (containerAssets.length > 0) this.backgroundAssets.container = containerAssets[0].path;

      this.assetsLoaded = true;
      this.applyBackgroundStyles();
    } catch (error) {
      logger.warn('Failed to load background assets:', error);
      this.assetsLoaded = true;
    }
  }

  private applyBackgroundStyles() {
    if (!this.assetsLoaded) return;

    // Apply CSS custom properties for background images
    const root = document.documentElement;
    
    if (this.backgroundAssets.panel) {
      root.style.setProperty('--panel-bg-image', `url('${this.backgroundAssets.panel}')`);
    }
    if (this.backgroundAssets.button) {
      root.style.setProperty('--button-bg-image', `url('${this.backgroundAssets.button}')`);
    }
    if (this.backgroundAssets.frame) {
      root.style.setProperty('--frame-bg-image', `url('${this.backgroundAssets.frame}')`);
    }
    if (this.backgroundAssets.container) {
      root.style.setProperty('--container-bg-image', `url('${this.backgroundAssets.container}')`);
    }

    // Add enhanced styling class to app container
    this.app.classList.add('rpg-enhanced');
  }

  public dispose() {
    if (this.disposer) {
      this.disposer()
    }
    
    // Clean up drag listeners
    this.dragCleanupFunctions.forEach(cleanup => cleanup())
    this.dragCleanupFunctions = []
  }

  private render(state: {
    centerContent: any,
    leftPanelOpen: boolean,
    rightPanelOpen: boolean,
    isMobile: boolean,
    inventoryFilter: string,
    player: any,
    currentScreen?: string
  }) {
    const enhancedClass = this.assetsLoaded ? 'rpg-enhanced' : '';
    
    this.app.innerHTML = `
      <div class="game-container ${enhancedClass}">
        <div class="panels">
          ${this.renderLeftPanel(state)}
          ${this.renderCenterPanel(state)}
          ${this.renderRightPanel(state)}
        </div>
        ${state.isMobile ? this.renderMobileControls() : ''}
      </div>
    `
    
    // Apply background styles if assets are loaded
    if (this.assetsLoaded) {
      this.applyBackgroundStyles();
    }
    
    // Attach event listeners after rendering
    this.attachEventListeners()
    
    // Setup drag and drop for inventory items
    this.setupDragAndDrop()
  }

  private renderLeftPanel(state: any): string {
    const isCollapsed = state.isMobile && !state.leftPanelOpen
    const enhancedClass = this.assetsLoaded ? 'rpg-panel' : '';
    
    return `
      <div class="panel left-panel ${isCollapsed ? 'collapsed' : ''} ${enhancedClass}">
        <h2>Character</h2>
        ${this.renderPlayerInfo(state)}
        ${this.renderPlayerStats(state)}
      </div>
    `
  }

  private renderPlayerInfo(state: any): string {
    const player = state.player
    if (!player) {
      return '<p>No character loaded</p>'
    }

    return `
      <div class="player-info">
        <p><strong>${player.name}</strong></p>
        <p>Level: ${player.level}</p>
        <p>Gold: ${player.gold}</p>
        <div class="vital-bars">
          <div class="health-bar">
            <label>Health</label>
            <div class="bar">
              <div class="fill health-fill" style="width: ${(player.currentHealth / player.computedStats.maxHealth) * 100}%"></div>
              <span>${player.currentHealth}/${player.computedStats.maxHealth}</span>
            </div>
          </div>
          <div class="mana-bar">
            <label>Mana</label>
            <div class="bar">
              <div class="fill mana-fill" style="width: ${(player.currentMana / player.computedStats.maxMana) * 100}%"></div>
              <span>${player.currentMana}/${player.computedStats.maxMana}</span>
            </div>
          </div>
          ${player.computedStats.maxEnergyShield > 0 ? `
            <div class="energy-shield-bar">
              <label>Energy Shield</label>
              <div class="bar">
                <div class="fill es-fill" style="width: ${(player.currentEnergyShield / player.computedStats.maxEnergyShield) * 100}%"></div>
                <span>${player.currentEnergyShield}/${player.computedStats.maxEnergyShield}</span>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `
  }

  private renderPlayerStats(state: any): string {
    const player = state.player
    if (!player) return ''

    const stats = player.computedStats
    return `
      <div class="player-stats">
        <h3>Stats</h3>
        <div class="stat-grid">
          <div class="stat-item">
            <span class="stat-label">Damage</span>
            <span class="stat-value">${stats.damage}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Armor</span>
            <span class="stat-value">${stats.armor}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Initiative</span>
            <span class="stat-value">${stats.initiative}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Level</span>
            <span class="stat-value">${stats.level}</span>
          </div>
        </div>
        <button class="${this.assetsLoaded ? 'view-character-btn rpg-button' : 'view-character-btn'}" data-action="view-character">
          View Equipment
        </button>
      </div>
    `
  }

  private renderCenterPanel(state: any): string {
    const enhancedClass = this.assetsLoaded ? 'rpg-panel' : '';
    
    return `
      <div class="panel center-panel ${enhancedClass}">
        ${this.renderCenterContent(state)}
      </div>
    `
  }

  private renderCenterContent(state: any): string {
    switch (state.centerContent) {
      case 'town':
        return this.renderTownHub()
      case 'combat':
        return this.renderCombatArena()
      case 'dungeon':
        return this.renderDungeonSelection()
      case 'craft':
        return this.renderCraftingForge()
      case 'trade':
        return this.renderTradingPost()
      case 'character':
        return this.renderCharacterScreen()
      default:
        return this.renderTownHub()
    }
  }

  private renderTownHub(): string {
    const buttonClass = this.assetsLoaded ? 'activity-btn rpg-button' : 'activity-btn';
    
    return `
      <h2>🏘️ Town Hub</h2>
      <div class="town-activities">
        <button class="${buttonClass}" data-action="go-dungeon">
          🏰 Dungeon
          <small>Enter dungeons with keys</small>
        </button>
        <button class="${buttonClass}" data-action="go-beach">
          🏖️ Beach
          <small>Free practice combat</small>
        </button>
        <button class="${buttonClass}" data-action="go-craft">
          🔨 Craft
          <small>Enhance your gear</small>
        </button>
        <button class="${buttonClass}" data-action="go-trade">
          🛒 Trade
          <small>Buy and sell items</small>
        </button>
        <button class="${buttonClass}" data-action="enter-combat">
          ⚔️ Test Combat
          <small>Test the combat system</small>
        </button>
      </div>
    `
  }

  private renderCombatArena(): string {
    // Initialize CombatArena component if not already done
    if (!this.combatArena) {
      this.combatArena = new CombatArena();
    }
    return this.combatArena.render();
  }

  private renderDungeonSelection(): string {
    return `
      <h2>🏰 Dungeon Selection</h2>
      <div class="dungeon-selection">
        <p>Dungeon selection interface will be implemented here</p>
        <button class="back-btn" data-action="go-town">← Back to Town</button>
      </div>
    `
  }

  private renderCraftingForge(): string {
    return `
      <h2>🔨 Crafting Forge</h2>
      <div class="crafting-interface">
        <p>Crafting interface will be implemented here</p>
        <button class="back-btn" data-action="go-town">← Back to Town</button>
      </div>
    `
  }

  private renderTradingPost(): string {
    return `
      <h2>🛒 Trading Post</h2>
      <div class="trading-interface">
        <p>Trading interface will be implemented here</p>
        <button class="back-btn" data-action="go-town">← Back to Town</button>
      </div>
    `
  }

  private renderCharacterScreen(): string {
    return `
      <div class="character-screen">
        <div class="character-header">
          <h2>👤 Character Sheet</h2>
          <button class="back-btn" data-action="go-town">← Back to Town</button>
        </div>
        <character-equipment></character-equipment>
      </div>
    `
  }

  private renderRightPanel(state: any): string {
    const isCollapsed = state.isMobile && !state.rightPanelOpen
    const enhancedClass = this.assetsLoaded ? 'rpg-panel' : '';
    
    return `
      <div class="panel right-panel ${isCollapsed ? 'collapsed' : ''} ${enhancedClass}">
        <h2>Inventory</h2>
        ${this.renderInventory(state)}
      </div>
    `
  }

  private renderInventory(state: any): string {
    const player = state.player
    if (!player) {
      return '<p>No character loaded</p>'
    }

    return `
      <div class="inventory-container">
        <div class="inventory-header">
          <div class="inventory-filters">
            <button class="filter-btn ${state.inventoryFilter === 'all' ? 'active' : ''}" data-filter="all">All</button>
            <button class="filter-btn ${state.inventoryFilter === 'equipment' ? 'active' : ''}" data-filter="equipment">Equipment</button>
            <button class="filter-btn ${state.inventoryFilter === 'crafting' ? 'active' : ''}" data-filter="crafting">Crafting</button>
            <button class="filter-btn ${state.inventoryFilter === 'keys' ? 'active' : ''}" data-filter="keys">Keys</button>
            <button class="filter-btn ${state.inventoryFilter === 'consumables' ? 'active' : ''}" data-filter="consumables">Consumables</button>
          </div>
          <div class="inventory-controls">
            <button class="sort-btn" data-action="sort-inventory">Sort</button>
            <div class="inventory-space">${player.inventory.items.length}/${player.inventory.maxSize}</div>
          </div>
        </div>
        <inventory-grid grid-size="${state.isMobile ? 20 : 40}" columns="${state.isMobile ? 4 : 5}"></inventory-grid>
        <div class="trash-zone" data-drop-zone='{"type":"trash"}'>
          🗑️ Drop items here to delete
        </div>
      </div>
    `
  }


  private setupDragAndDrop() {
    // Clean up previous listeners
    this.dragCleanupFunctions.forEach(cleanup => cleanup())
    this.dragCleanupFunctions = []

    // The InventoryGrid component handles its own drag and drop
    // This method can be used for other UI elements that need drag/drop
    
    // Setup hover tooltips for any remaining items not handled by components
    this.setupItemTooltips()
  }

  private setupItemTooltips() {
    // The InventoryGrid component handles its own tooltips
    // This method can be used for other UI elements that need tooltips
    // For now, it's empty since all item tooltips are handled by components
  }

  private renderMobileControls(): string {
    return `
      <div class="mobile-controls">
        <button class="mobile-btn ${uiStore.leftPanelOpen ? 'active' : ''}" data-action="toggle-left">
          📊 Stats
        </button>
        <button class="mobile-btn ${uiStore.rightPanelOpen ? 'active' : ''}" data-action="toggle-right">
          🎒 Inventory
        </button>
      </div>
    `
  }

  private attachEventListeners() {
    // Remove existing listeners by re-rendering, then add new ones
    const actionButtons = this.app.querySelectorAll('[data-action]')
    actionButtons.forEach(button => {
      button.addEventListener('click', this.handleAction.bind(this))
    })

    // Filter buttons
    const filterButtons = this.app.querySelectorAll('[data-filter]')
    filterButtons.forEach(button => {
      button.addEventListener('click', this.handleFilter.bind(this))
    })

    // Setup combat component event listeners if in combat mode
    if (uiStore.centerContent === 'combat' && this.combatArena) {
      // The combat components handle their own event listeners
      // Just ensure they're initialized
      this.setupCombatEventListeners()
    }
  }

  private setupCombatEventListeners() {
    // Combat action buttons are handled by the CombatArena component internally
    // This method can be used for any additional combat-specific event handling
  }

  private handleAction(event: Event) {
    const target = event.target as HTMLElement
    const action = target.getAttribute('data-action')

    switch (action) {
      case 'toggle-left':
        uiStore.toggleLeftPanel()
        break
      case 'toggle-right':
        uiStore.toggleRightPanel()
        break
      case 'go-town':
        gameStore.setCurrentScreen('town')
        break
      case 'go-dungeon':
        gameStore.setCurrentScreen('dungeon')
        break
      case 'go-craft':
        gameStore.setCurrentScreen('craft')
        break
      case 'go-trade':
        gameStore.setCurrentScreen('trade')
        break
      case 'view-character':
        uiStore.goToCharacter()  // Keep this one as uiStore since it's not in gameStore
        break
      case 'go-beach':
        // Beach is a special dungeon type - generates random encounter
        gameStore.startBeachEncounter()
        break
      case 'enter-combat':
        // Enter combat mode for testing
        gameStore.setCurrentScreen('combat')
        break
    }
  }

  private handleFilter(event: Event) {
    const target = event.target as HTMLElement
    const filter = target.getAttribute('data-filter') as any
    
    if (filter) {
      uiStore.setInventoryFilter(filter)
    }
  }
}