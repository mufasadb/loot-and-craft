import { makeObservable, observable, action } from 'mobx'
import { assetManager } from '../services/AssetManager'
import { Player, Enemy } from '../services/Entity'
import { CombatManager } from '../services/CombatManager'
import { StartingClass, EnemyType, DungeonTheme, RangeState } from '../types/enums'

export interface GameState {
  isLoading: boolean
  currentScreen: 'town' | 'combat' | 'dungeon' | 'craft' | 'trade'
  player: Player | null
  currentEnemy: Enemy | null
  currentEnemies: Enemy[]
  combatManager: CombatManager | null
}

interface EnemyTemplate {
  id: string
  name: string
  enemyType: string
  stats: {
    maxHealth: number
    maxMana: number
    maxEnergyShield: number
    armor: number
    damage: number
    initiative: number
    level: number
  }
  abilities: string[]
  spriteKey: string
  lootTier: number
  description: string
}

interface EnemyData {
  version: string
  enemyTemplates: {
    [theme: string]: {
      [tier: string]: EnemyTemplate[]
    }
  }
  aiPatterns: {
    [key: string]: {
      id: string
      name: string
      aggressiveness: number
      defensiveness: number
      cooldownManagement: string
      targetSelection: string
      description: string
    }
  }
}

// Using the actual Player class instead of simple interface

export class GameStore {
  isLoading = true
  currentScreen: GameState['currentScreen'] = 'town'
  player: Player | null = null
  currentEnemy: Enemy | null = null
  currentEnemies: Enemy[] = []
  combatManager: CombatManager | null = null
  private enemyData: EnemyData | null = null

  constructor() {
    makeObservable(this, {
      isLoading: observable,
      currentScreen: observable,
      player: observable,
      currentEnemy: observable,
      currentEnemies: observable,
      combatManager: observable,
      setLoading: action,
      setCurrentScreen: action,
      setPlayer: action,
      setCurrentEnemy: action,
      setCurrentEnemies: action,
      initializeGame: action,
      createTestEnemy: action,
      createEnemyFromTemplate: action,
      generateRandomEncounter: action,
      startBeachEncounter: action
    })
  }

  setLoading(loading: boolean) {
    this.isLoading = loading
  }

  setCurrentScreen(screen: GameState['currentScreen']) {
    this.currentScreen = screen
  }

  setPlayer(player: Player | null) {
    this.player = player
  }

  setCurrentEnemy(enemy: Enemy | null) {
    this.currentEnemy = enemy
  }

  setCurrentEnemies(enemies: Enemy[]) {
    this.currentEnemies = enemies
    this.currentEnemy = enemies.length > 0 ? enemies[0] : null
  }

  async loadEnemyData(): Promise<void> {
    try {
      const response = await fetch('/assets/data/enemies.json')
      if (!response.ok) {
        throw new Error(`Failed to load enemy data: ${response.status}`)
      }
      this.enemyData = await response.json()
      console.log('👹 Enemy templates loaded:', Object.keys(this.enemyData?.enemyTemplates || {}))
    } catch (error) {
      console.warn('⚠️ Could not load enemy data, using fallback')
      this.enemyData = null
    }
  }

  createTestEnemy(): Enemy {
    // Create a basic AI pattern
    const basicAI = {
      id: 'basic-aggressive',
      name: 'Basic Aggressive',
      aggressiveness: 0.8,
      intelligence: 0.5,
      patience: 0.2,
      preferredRange: RangeState.IN_RANGE,
      abilityUsageFrequency: 0.3,
      retreatThreshold: 0.2,
      focusesWeakest: false,
      avoidsBlocking: false,
      usesAbilitiesWhenBlocked: true,
      selectAction: () => ({ action: 'attack' as const, iconPath: '', description: 'Basic attack', isMultiTarget: false }),
      evaluateTargets: () => []
    };

    // Create a basic test enemy for combat testing
    const testEnemy = new Enemy(
      'test-goblin-1',
      'Test Goblin',
      EnemyType.MELEE,
      {
        maxHealth: 50,
        maxMana: 20,
        maxEnergyShield: 0,
        armor: 5,
        damage: 15,
        initiative: 12,
        level: 1
      },
      basicAI,
      1
    );
    
    // Set current health/mana
    testEnemy.currentHealth = testEnemy.computedStats.maxHealth;
    testEnemy.currentMana = testEnemy.computedStats.maxMana;
    
    return testEnemy;
  }

  createEnemyFromTemplate(templateId: string, theme: DungeonTheme = DungeonTheme.RIVER, tier: number = 1): Enemy | null {
    if (!this.enemyData) {
      console.warn('⚠️ Enemy data not loaded, creating test enemy')
      return this.createTestEnemy()
    }

    const themeKey = theme.toLowerCase()
    const tierKey = `tier${tier}`
    const templates = this.enemyData.enemyTemplates[themeKey]?.[tierKey]
    
    if (!templates) {
      console.warn(`⚠️ No templates found for ${themeKey} ${tierKey}`)
      return this.createTestEnemy()
    }

    const template = templates.find(t => t.id === templateId)
    if (!template) {
      console.warn(`⚠️ Template ${templateId} not found`)
      return this.createTestEnemy()
    }

    // Select appropriate AI pattern
    const aiPatternKey = template.enemyType === 'MAGIC' ? 'magical' : 
                        template.enemyType === 'RANGED' ? 'balanced' : 'aggressive'
    const aiPatternData = this.enemyData.aiPatterns[aiPatternKey]
    
    if (!aiPatternData) {
      console.error('❌ AI pattern not found:', aiPatternKey)
      return null
    }
    
    const aiPattern = {
      id: aiPatternData.id,
      name: aiPatternData.name,
      aggressiveness: aiPatternData.aggressiveness,
      intelligence: 0.5,
      patience: 1 - aiPatternData.aggressiveness,
      preferredRange: template.enemyType === 'RANGED' ? RangeState.OUT_OF_RANGE : RangeState.IN_RANGE,
      abilityUsageFrequency: template.enemyType === 'MAGIC' ? 0.7 : 0.3,
      retreatThreshold: 0.2,
      focusesWeakest: aiPatternData.targetSelection === 'weakest',
      avoidsBlocking: aiPatternData.aggressiveness > 0.7,
      usesAbilitiesWhenBlocked: template.enemyType === 'MAGIC',
      selectAction: () => ({ action: 'attack' as const, iconPath: '', description: 'Attack', isMultiTarget: false }),
      evaluateTargets: () => []
    }

    // Convert string to EnemyType enum
    const enemyType = EnemyType[template.enemyType as keyof typeof EnemyType] || EnemyType.MELEE

    try {
      const enemy = new Enemy(
        `${template.id}-${Date.now()}`,
        template.name,
        enemyType,
        template.stats,
        aiPattern,
        template.lootTier
      )

      // Set current health/mana to max
      enemy.currentHealth = enemy.computedStats.maxHealth
      enemy.currentMana = enemy.computedStats.maxMana
      enemy.currentEnergyShield = enemy.computedStats.maxEnergyShield

      return enemy
    } catch (error) {
      console.error('❌ Failed to create Enemy instance:', error)
      return null
    }
  }

  generateRandomEncounter(theme: DungeonTheme = DungeonTheme.RIVER, tier: number = 1, numEnemies?: number): Enemy[] {
    if (!this.enemyData) {
      console.warn('⚠️ Enemy data not loaded, creating single test enemy')
      return [this.createTestEnemy()]
    }

    const themeKey = theme.toLowerCase()
    const tierKey = `tier${tier}`
    const templates = this.enemyData.enemyTemplates[themeKey]?.[tierKey]
    
    if (!templates || templates.length === 0) {
      console.warn(`⚠️ No templates found for ${themeKey} ${tierKey}, using test enemy`)
      return [this.createTestEnemy()]
    }

    // Determine number of enemies (1-5 if not specified)
    const count = numEnemies || Math.floor(Math.random() * 5) + 1
    const enemies: Enemy[] = []

    for (let i = 0; i < count; i++) {
      // Pick random template
      const template = templates[Math.floor(Math.random() * templates.length)]
      const enemy = this.createEnemyFromTemplate(template.id, theme, tier)
      if (enemy) {
        enemies.push(enemy)
      }
    }

    console.log(`🌊 Generated ${enemies.length} enemies for beach encounter:`, enemies.map(e => e.name))
    return enemies
  }

  async initializeGame() {
    this.setLoading(true)
    
    try {
      // Initialize asset manager
      console.log('🔄 Initializing asset manager...')
      await assetManager.initialize()
      console.log('✅ Asset manager initialized')
      
      // Load enemy data
      console.log('🔄 Loading enemy data...')
      await this.loadEnemyData()
      console.log('✅ Enemy data loaded')
      
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
      console.log('🔄 Creating player...')
      const defaultBaseStats = {
        maxHealth: 100,
        maxMana: 50,
        maxEnergyShield: 0,
        damage: 10,
        armor: 2,
        initiative: 10,
        level: 1
      }
      
      const defaultPlayer = new Player(
        'player-1',
        'Adventurer', 
        StartingClass.KNIGHT,
        defaultBaseStats
      )
      console.log('✅ Player created successfully!')
      
      // Set additional properties
      defaultPlayer.gold = 100
      defaultPlayer.experience = 0
      
      // Add some test items to inventory for drag & drop testing
      console.log('🔄 Adding test items...')
      this.addTestItems(defaultPlayer)
      console.log('✅ Test items added!')
      
      this.setPlayer(defaultPlayer)
      console.log('✅ Player set in store!')
    } catch (error) {
      console.error('❌ Failed to initialize game:', error)
      throw error
    } finally {
      this.setLoading(false)
    }
  }

  private addTestItems(player: Player) {
    // Create some test items for the inventory
    const testItems = [
      {
        id: 'sword-1',
        name: 'Iron Sword',
        type: 'equipment',
        rarity: 'normal',
        level: 1,
        iconPath: '/assets/ui/icons/sword.svg',
        description: 'A sturdy iron sword.',
        equipment: {
          slot: 'weapon',
          baseType: 'sword',
          inherentStats: { damage: 12 },
          grantedAbilities: [],
          levelRequirement: 1
        },
        affixes: [],
        stackSize: 1,
        maxStackSize: 1,
        isEquipped: false,
        itemLevel: 1
      },
      {
        id: 'helmet-1',
        name: 'Leather Cap',
        type: 'equipment',
        rarity: 'normal',
        level: 1,
        iconPath: '/assets/ui/icons/helmet.svg',
        description: 'Basic leather protection.',
        equipment: {
          slot: 'helmet',
          baseType: 'leather',
          inherentStats: { armor: 3, maxHealth: 10 },
          grantedAbilities: [],
          levelRequirement: 1
        },
        affixes: [],
        stackSize: 1,
        maxStackSize: 1,
        isEquipped: false,
        itemLevel: 1
      },
      {
        id: 'potion-1',
        name: 'Health Potion',
        type: 'crafting',
        rarity: 'normal',
        level: 1,
        iconPath: '/assets/ui/icons/potion.svg',
        description: 'Restores 50 health.',
        crafting: {
          materialType: 'potion',
          stackSize: 10,
          usageDescription: 'Consume to restore health'
        },
        affixes: [],
        stackSize: 3,
        maxStackSize: 10,
        isEquipped: false,
        itemLevel: 1
      },
      {
        id: 'material-1',
        name: 'Iron Ore',
        type: 'crafting',
        rarity: 'normal',
        level: 1,
        iconPath: '/assets/ui/icons/ore.svg',
        description: 'Raw iron ore for crafting.',
        crafting: {
          materialType: 'material',
          stackSize: 50,
          usageDescription: 'Used in weapon crafting'
        },
        affixes: [],
        stackSize: 10,
        maxStackSize: 50,
        isEquipped: false,
        itemLevel: 1
      },
      {
        id: 'key-1',
        name: 'Dungeon Key',
        type: 'key',
        rarity: 'magic',
        level: 1,
        iconPath: '/assets/ui/icons/key.svg',
        description: 'Opens dungeon doors.',
        key: {
          tier: 1,
          theme: 'river',
          modifiers: [],
          usesRemaining: 1
        },
        affixes: [],
        stackSize: 1,
        maxStackSize: 1,
        isEquipped: false,
        itemLevel: 1
      },
      {
        id: 'ring-1',
        name: 'Copper Ring',
        type: 'equipment',
        rarity: 'magic',
        level: 1,
        iconPath: '/assets/ui/icons/ring.svg',
        description: 'A simple magical ring.',
        equipment: {
          slot: 'ring1',
          baseType: 'ring',
          inherentStats: { maxMana: 15 },
          grantedAbilities: [],
          levelRequirement: 1
        },
        affixes: [],
        stackSize: 1,
        maxStackSize: 1,
        isEquipped: false,
        itemLevel: 1
      },
      {
        id: 'ice-armor-ring',
        name: 'Ice Armor Ring',
        type: 'equipment',
        rarity: 'magic',
        level: 1,
        iconPath: '/assets/ui/icons/ring.svg',
        description: 'A frigid ring that can conjure protective ice.',
        equipment: {
          slot: 'ring1',
          baseType: 'ring',
          inherentStats: { armor: 2, maxMana: 20, maxEnergyShield: 8 },
          grantedAbilities: ['ice_armor'],
          levelRequirement: 4
        },
        affixes: [],
        stackSize: 1,
        maxStackSize: 1,
        isEquipped: false,
        itemLevel: 1
      },
      {
        id: 'flame-blade-sword',
        name: 'Flame Blade Sword',
        type: 'equipment',
        rarity: 'magic',
        level: 1,
        iconPath: '/assets/ui/icons/sword.svg',
        description: 'A magical sword that can be ignited with flames.',
        equipment: {
          slot: 'weapon',
          baseType: 'sword',
          inherentStats: { damage: 15, maxMana: 15, initiative: 1 },
          grantedAbilities: ['basic_attack', 'flame_blade'],
          levelRequirement: 3
        },
        affixes: [],
        stackSize: 1,
        maxStackSize: 1,
        isEquipped: false,
        itemLevel: 1
      },
      {
        id: 'wind-step-boots',
        name: 'Wind Step Boots',
        type: 'equipment',
        rarity: 'magic',
        level: 1,
        iconPath: '/assets/ui/icons/boots.svg',
        description: 'Enchanted boots that allow swift movement.',
        equipment: {
          slot: 'boots',
          baseType: 'light',
          inherentStats: { armor: 4, maxHealth: 8, maxMana: 10, initiative: 4 },
          grantedAbilities: ['wind_step'],
          levelRequirement: 3
        },
        affixes: [],
        stackSize: 1,
        maxStackSize: 1,
        isEquipped: false,
        itemLevel: 1
      }
    ]

    // Add items to inventory
    testItems.forEach(item => {
      player.addToInventory(item as any)
    })
    
    // Auto-equip some ability items for testing
    const abilityItems = testItems.filter(item => 
      item.name.includes('Ice Armor') || 
      item.name.includes('Flame Blade') || 
      item.name.includes('Wind Step')
    )
    
    abilityItems.forEach(item => {
      if (item.equipment) {
        // Remove from inventory first
        player.removeFromInventory(item.id)
        // Then equip it
        player.equipItem(item as any, item.equipment.slot as any)
      }
    })
  }

  startBeachEncounter(): void {
    if (!this.player) {
      console.warn('⚠️ Cannot start encounter: no player')
      return
    }

    // Generate random river encounter (1-5 enemies)
    const enemies = this.generateRandomEncounter(DungeonTheme.RIVER, 1)
    this.setCurrentEnemies(enemies)
    
    // Initialize combat manager
    this.combatManager = new CombatManager({
      player: this.player,
      enemies: enemies,
      dungeonTier: 1,
      keyModifiers: [],
      allowEscape: true
    })
    
    // Switch to combat screen
    this.setCurrentScreen('combat')
    
    console.log(`🌊 Beach encounter started with ${enemies.length} enemies!`)
  }
}

// Create singleton instance
export const gameStore = new GameStore()