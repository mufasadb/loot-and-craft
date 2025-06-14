import { uiStore } from '../stores/UIStore'
import { gameStore } from '../stores/GameStore'
import { AssetService } from '../services/AssetService'
import { autorun } from 'mobx'
import { logger } from '../services/Logger'
import { CombatState } from '../types/enums'

export class GameLayout {
  private app: HTMLElement
  private disposer: (() => void) | null = null
  private dragCleanupFunctions: (() => void)[] = []
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
    const combat = gameStore.combatManager;
    
    if (!combat) {
      return `
        <h2>⚔️ Combat Arena</h2>
        <div class="combat-error">
          <p>Combat system not initialized</p>
          <button class="back-btn" data-action="go-town">← Back to Town</button>
        </div>
      `;
    }

    return `
      <div class="combat-arena">
        ${this.renderCombatHeader()}
        ${this.renderCombatField()}
        ${this.renderCombatActions()}
        ${this.renderCombatLog()}
        ${this.renderCombatResult()}
      </div>
    `;
  }

  private renderCombatHeader(): string {
    const combat = gameStore.combatManager!;
    return `
      <div class="combat-header">
        <h2>⚔️ Combat - Turn ${combat.currentTurn}</h2>
        <div class="combat-status">
          <span class="combat-state">${combat.currentState}</span>
          <span class="range-indicator">Range Status Available</span>
        </div>
      </div>
    `;
  }

  private renderCombatField(): string {
    const combat = gameStore.combatManager!;
    
    return `
      <div class="combat-field">
        <div class="combatant player-area">
          ${this.renderPlayerCombatant(combat.player)}
        </div>
        <div class="vs-divider">VS</div>
        <div class="combatant enemy-area">
          ${combat.enemies.map(enemy => this.renderEnemyCombatant(enemy)).join('')}
        </div>
      </div>
    `;
  }

  private renderPlayerCombatant(player: any): string {
    const healthPercent = Math.max(0, (player.currentHP / player.maxHP) * 100);
    const manaPercent = player.maxMP > 0 ? Math.max(0, (player.currentMP / player.maxMP) * 100) : 0;
    
    return `
      <div class="combatant-card player-card">
        <div class="combatant-name">${player.name}</div>
        <div class="combatant-level">Level ${player.level}</div>
        
        <div class="health-bar-container">
          <div class="stat-label">HP</div>
          <div class="health-bar">
            <div class="health-fill" style="width: ${healthPercent}%"></div>
            <span class="health-text">${player.currentHP}/${player.maxHP}</span>
          </div>
        </div>
        
        ${player.maxMP > 0 ? `
          <div class="mana-bar-container">
            <div class="stat-label">MP</div>
            <div class="mana-bar">
              <div class="mana-fill" style="width: ${manaPercent}%"></div>
              <span class="mana-text">${player.currentMP}/${player.maxMP}</span>
            </div>
          </div>
        ` : ''}
        
        <div class="combatant-effects">
          ${player.activeEffects?.map((effect: any) => 
            `<span class="effect-badge">${effect.name}</span>`
          ).join('') || ''}
        </div>
      </div>
    `;
  }

  private renderEnemyCombatant(enemy: any): string {
    const healthPercent = Math.max(0, (enemy.currentHP / enemy.maxHP) * 100);
    const isTargeted = false; // TODO: Implement targeting logic
    
    return `
      <div class="combatant-card enemy-card ${isTargeted ? 'targeted' : ''}" 
           data-enemy-id="${enemy.id}">
        <div class="combatant-name">${enemy.name}</div>
        <div class="combatant-level">Level ${enemy.level}</div>
        
        <div class="health-bar-container">
          <div class="stat-label">HP</div>
          <div class="health-bar enemy-health">
            <div class="health-fill" style="width: ${healthPercent}%"></div>
            <span class="health-text">${enemy.currentHP}/${enemy.maxHP}</span>
          </div>
        </div>
        
        <div class="combatant-effects">
          ${enemy.activeEffects?.map((effect: any) => 
            `<span class="effect-badge">${effect.name}</span>`
          ).join('') || ''}
        </div>
        
        ${isTargeted ? '<div class="target-indicator">🎯</div>' : ''}
      </div>
    `;
  }

  private renderAbilityButtons(): string {
    const player = gameStore.player;
    if (!player) return '';

    const abilities: string[] = [];
    
    // Collect abilities from equipped items
    Object.values(player.equipment).forEach((item: any) => {
      if (item && item.equipment?.grantedAbilities) {
        abilities.push(...item.equipment.grantedAbilities);
      }
    });

    // Remove duplicates and filter out basic attacks
    const uniqueAbilities = [...new Set(abilities)].filter(ability => 
      ability !== 'basic_attack' && ability !== 'ranged_attack'
    );

    if (uniqueAbilities.length === 0) {
      return '<p class="no-abilities">No abilities available</p>';
    }

    return uniqueAbilities.map(abilityId => {
      const abilityName = this.getAbilityDisplayName(abilityId);
      const manaCost = this.getAbilityManaCost(abilityId);
      const canCast = player.currentMana >= manaCost;
      
      return `
        <button class="action-btn ability-btn ${!canCast ? 'disabled' : ''}" 
                data-action="combat-ability" 
                data-ability-id="${abilityId}" 
                ${!canCast ? 'disabled' : ''}>
          ✨ ${abilityName} (${manaCost} MP)
        </button>
      `;
    }).join('');
  }

  private getAbilityDisplayName(abilityId: string): string {
    const displayNames: { [key: string]: string } = {
      'ice_armor': 'Ice Armor',
      'flame_blade': 'Flame Blade', 
      'wind_step': 'Wind Step',
      'fireball': 'Fireball',
      'ice_shard': 'Ice Shard',
      'lightning_bolt': 'Lightning Bolt',
      'heal': 'Heal',
      'shield_bash': 'Shield Bash',
      'crushing_blow': 'Crushing Blow'
    };
    return displayNames[abilityId] || abilityId.replace(/_/g, ' ');
  }

  private getAbilityManaCost(abilityId: string): number {
    const manaCosts: { [key: string]: number } = {
      'ice_armor': 30,
      'flame_blade': 25,
      'wind_step': 20,
      'fireball': 25,
      'ice_shard': 20,
      'lightning_bolt': 30,
      'heal': 15,
      'shield_bash': 12,
      'crushing_blow': 20
    };
    return manaCosts[abilityId] || 10;
  }

  private getAbilityData(abilityId: string): any {
    const abilities: { [key: string]: any } = {
      'ice_armor': {
        cooldown: 5,
        targetType: 'self',
        effectType: 'defensive',
        magnitude: 1.0,
        statusEffectChance: 100,
        statusEffect: 'ice_armor_active',
        duration: 3
      },
      'flame_blade': {
        cooldown: 4,
        targetType: 'self',
        effectType: 'buff',
        magnitude: 1.0,
        statusEffectChance: 100,
        statusEffect: 'flame_blade_active',
        duration: 3
      },
      'wind_step': {
        cooldown: 3,
        targetType: 'self',
        effectType: 'buff',
        magnitude: 1.0,
        statusEffectChance: 100,
        statusEffect: 'wind_step_active',
        duration: 3
      },
      'fireball': {
        cooldown: 2,
        targetType: 'single_enemy',
        effectType: 'magical_damage',
        magnitude: 1.3,
        statusEffectChance: 40,
        statusEffect: 'ignite',
        duration: 3
      }
    };
    return abilities[abilityId] || {
      cooldown: 0,
      targetType: 'self',
      effectType: 'buff',
      magnitude: 1.0,
      statusEffectChance: 0,
      duration: 1
    };
  }

  private renderCombatActions(): string {
    const combat = gameStore.combatManager!;
    
    if (combat.currentState !== CombatState.PLAYER_ACTION_SELECT) {
      return `
        <div class="combat-actions disabled">
          <div class="turn-indicator">
            ${combat.currentState === CombatState.ENEMY_TURN_START ? 'Enemy Turn...' : 
              combat.currentState === CombatState.CHECK_VICTORY ? 'Victory!' :
              combat.currentState === CombatState.CHECK_DEFEAT ? 'Defeat!' :
              combat.currentState}
          </div>
        </div>
      `;
    }

    const canAttack = true; // TODO: Implement range checking
    const canMove = false; // TODO: Implement range checking
    
    return `
      <div class="combat-actions">
        <div class="action-row primary-actions">
          <button class="action-btn attack-btn ${!canAttack ? 'disabled' : ''}" 
                  data-action="combat-attack" ${!canAttack ? 'disabled' : ''}>
            ⚔️ Attack
          </button>
          <button class="action-btn block-btn" data-action="combat-block">
            🛡️ Block
          </button>
          <button class="action-btn move-btn ${!canMove ? 'disabled' : ''}" 
                  data-action="combat-move" ${!canMove ? 'disabled' : ''}>
            🏃 Move In
          </button>
        </div>
        
        <div class="action-row secondary-actions">
          ${this.renderAbilityButtons()}
        </div>
        
        <div class="action-row utility-actions">
          <button class="action-btn escape-btn" data-action="combat-escape">
            🏃‍♂️ Escape
          </button>
        </div>
      </div>
    `;
  }

  private renderCombatLog(): string {
    const combat = gameStore.combatManager!;
    const logs = combat.combatLog || [];
    
    return `
      <div class="combat-log">
        <h3>Combat Log</h3>
        <div class="log-entries">
          ${logs.slice(-10).map(log => `
            <div class="log-entry ${log.type} ${log.emphasis ? 'emphasis' : ''}" 
                 style="${log.color ? `color: ${log.color}` : ''}">
              <span class="log-turn">[T${log.turn}]</span>
              <span class="log-message">${log.message}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private renderCombatResult(): string {
    const combat = gameStore.combatManager!;
    
    if (combat.currentState !== CombatState.CHECK_VICTORY && combat.currentState !== CombatState.CHECK_DEFEAT && combat.currentState !== CombatState.COMBAT_END) {
      return '';
    }

    const result = combat.getCombatResult();
    
    return `
      <div class="combat-result-overlay">
        <div class="combat-result">
          <h2>${result.outcome === 'victory' ? '🎉 Victory!' : 
                 result.outcome === 'defeat' ? '💀 Defeat!' : 
                 '🏃‍♂️ Escaped!'}</h2>
          
          <div class="result-details">
            ${result.experience && result.experience > 0 ? `<p>Experience Gained: +${result.experience}</p>` : ''}
            ${result.gold && result.gold > 0 ? `<p>Gold Gained: +${result.gold}</p>` : ''}
            ${result.loot && result.loot.length > 0 ? `
              <div class="items-gained">
                <p>Items Found:</p>
                <ul>
                  ${result.loot.map((item: any) => `<li>${item.name}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
          </div>
          
          <button class="action-btn continue-btn" data-action="go-town">
            Continue
          </button>
        </div>
      </div>
    `;
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

    // Enemy targeting for combat
    const enemyCards = this.app.querySelectorAll('[data-enemy-id]')
    enemyCards.forEach(card => {
      card.addEventListener('click', this.handleEnemyTarget.bind(this))
    })
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
        // Enter combat mode for testing with mock data
        this.createMockCombat()
        gameStore.setCurrentScreen('combat')
        break
      case 'combat-attack':
        this.handleCombatAttack()
        break
      case 'combat-block':
        this.handleCombatBlock()
        break
      case 'combat-move':
        this.handleCombatMove()
        break
      case 'combat-ability':
        this.handleCombatAbility(target)
        break
      case 'combat-escape':
        this.handleCombatEscape()
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

  private handleCombatAttack() {
    const combat = gameStore.combatManager
    if (!combat || combat.currentState !== CombatState.PLAYER_ACTION_SELECT) return

    try {
      const action = {
        type: 'ATTACK' as const,
        isValid: true,
        executionOrder: 1,
        manaCost: 0,
        canBeCountered: true
      }
      combat.executePlayerAction(action as any)
      // MobX autorun will handle re-rendering
    } catch (error) {
      console.error('Combat attack failed:', error)
    }
  }

  private handleCombatBlock() {
    const combat = gameStore.combatManager
    if (!combat || combat.currentState !== CombatState.PLAYER_ACTION_SELECT) return

    try {
      const action = {
        type: 'BLOCK' as const,
        isValid: true,
        executionOrder: 1,
        manaCost: 0,
        canBeCountered: false
      }
      combat.executePlayerAction(action as any)
      // MobX autorun will handle re-rendering
    } catch (error) {
      console.error('Combat block failed:', error)
    }
  }

  private handleCombatMove() {
    const combat = gameStore.combatManager
    if (!combat || combat.currentState !== CombatState.PLAYER_ACTION_SELECT) return

    try {
      const action = {
        type: 'MOVE' as const,
        isValid: true,
        executionOrder: 1,
        manaCost: 0,
        canBeCountered: false
      }
      combat.executePlayerAction(action as any)
      // MobX autorun will handle re-rendering
    } catch (error) {
      console.error('Combat move failed:', error)
    }
  }

  private handleCombatAbility(target: HTMLElement) {
    const combat = gameStore.combatManager
    if (!combat || combat.currentState !== CombatState.PLAYER_ACTION_SELECT) return

    const abilityId = target.getAttribute('data-ability-id')
    if (!abilityId) return

    try {
      // Get ability data from our local methods
      const manaCost = this.getAbilityManaCost(abilityId);
      const abilityData = this.getAbilityData(abilityId);
      
      const action = {
        type: 'CAST_ABILITY' as const,
        abilityId: abilityId,
        targetId: undefined, // For now, no specific target
        manaCost: manaCost,
        cooldown: abilityData.cooldown,
        targetType: abilityData.targetType,
        effectType: abilityData.effectType,
        magnitude: abilityData.magnitude,
        statusEffectChance: abilityData.statusEffectChance,
        statusEffect: abilityData.statusEffect,
        duration: abilityData.duration,
        isValid: true,
        executionOrder: 1,
        canBeCountered: true
      }
      combat.executePlayerAction(action as any)
      // MobX autorun will handle re-rendering
    } catch (error) {
      console.error('Combat ability failed:', error)
    }
  }

  private handleCombatEscape() {
    const combat = gameStore.combatManager
    if (!combat || combat.currentState !== CombatState.PLAYER_ACTION_SELECT) return

    try {
      const action = {
        type: 'ESCAPE' as const,
        isValid: true,
        executionOrder: 1,
        manaCost: 0,
        canBeCountered: false
      }
      combat.executePlayerAction(action as any)
      // MobX autorun will handle re-rendering
    } catch (error) {
      console.error('Combat escape failed:', error)
    }
  }

  private handleEnemyTarget(event: Event) {
    const target = event.currentTarget as HTMLElement
    const enemyId = target.getAttribute('data-enemy-id')
    const combat = gameStore.combatManager
    
    if (!combat || !enemyId) return

    try {
      // TODO: Implement enemy targeting logic
      console.log('Enemy targeted:', enemyId)
      // MobX autorun will handle re-rendering
    } catch (error) {
      console.error('Enemy targeting failed:', error)
    }
  }

  private createMockCombat() {
    // Create a simplified mock combat manager for UI testing
    const mockCombat = {
      currentState: CombatState.PLAYER_ACTION_SELECT,
      currentTurn: 1,
      player: {
        name: 'Adventurer',
        level: 1,
        currentHP: 80,
        maxHP: 100,
        currentMP: 30,
        maxMP: 50,
        activeEffects: []
      },
      enemies: [
        {
          id: 'enemy-1',
          name: 'River Goblin',
          level: 1,
          currentHP: 40,
          maxHP: 60,
          activeEffects: []
        }
      ],
      combatLog: [
        { turn: 1, message: 'Combat begins!', type: 'system', timestamp: Date.now() },
        { turn: 1, message: 'River Goblin appears!', type: 'action', timestamp: Date.now() }
      ],
      getCombatResult: () => ({
        outcome: 'victory' as const,
        experience: 25,
        gold: 10,
        loot: [],
        totalDamageDealt: 50,
        totalDamageTaken: 20,
        turnsElapsed: 3,
        abilitiesUsed: [],
        combatLog: []
      }),
      executePlayerAction: async (action: any) => {
        console.log('Mock action executed:', action.type)
      }
    }
    
    // Set the mock combat manager
    gameStore.combatManager = mockCombat as any
  }
}