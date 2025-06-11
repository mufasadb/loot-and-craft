// Dungeon and key system types - progression and content generation

import { DungeonTheme } from './enums';
import { Item, KeyModifier } from './items';
import { Enemy, EnemyTemplate } from './entities';
import { BaseStats } from './base';

// Dungeon key system (per GDD section 2.6)
export interface DungeonKey extends Item {
  keyData: {
    tier: number;                    // Difficulty tier (1, 2, 3, ...)
    theme: DungeonTheme;            // Dungeon environment and enemy types
    modifiers: KeyModifier[];       // Applied modifications
    usesRemaining: number;          // Usually 1, but could be more
    
    // Generation context
    originalTier: number;           // Before modifications
    craftingHistory: string[];     // What was done to this key
  };
}

// Dungeon instance when key is used
export interface DungeonInstance {
  id: string;
  
  // Key properties
  tier: number;
  theme: DungeonTheme;
  modifiers: KeyModifier[];
  
  // Generated content
  encounters: DungeonEncounter[];
  bossEncounter?: DungeonEncounter;
  
  // Layout and progression
  currentEncounter: number;
  totalEncounters: number;
  
  // Loot and rewards
  baseLootTier: number;
  lootQuantityMultiplier: number;
  experienceMultiplier: number;
  
  // Environmental effects
  environmentalEffects: string[];
  
  // State
  isCompleted: boolean;
  allowEscape: boolean;
}

// Individual combat encounter within dungeon
export interface DungeonEncounter {
  id: string;
  encounterNumber: number;
  
  // Enemies
  enemies: Enemy[];
  enemyCount: number;
  
  // Special properties
  isBossEncounter: boolean;
  isEliteEncounter: boolean;
  hasSpecialReward: boolean;
  
  // Environmental factors
  terrain?: TerrainEffect;
  ambientEffects?: string[];
  
  // Completion state
  isCompleted: boolean;
  playerVictory?: boolean;
}

// Terrain effects in encounters
export interface TerrainEffect {
  id: string;
  name: string;
  description: string;
  
  // Effects on combat
  playerEffects?: Partial<BaseStats>;
  enemyEffects?: Partial<BaseStats>;
  
  // Special mechanics
  damageOverTime?: {
    damageType: string;
    damagePerTurn: number;
  };
  
  // Visual
  iconPath: string;
  backgroundEffect: string;
}

// Dungeon generation rules per theme
export interface DungeonThemeConfig {
  theme: DungeonTheme;
  name: string;
  description: string;
  
  // Enemy composition
  commonEnemies: string[];        // Enemy template IDs
  eliteEnemies: string[];
  bossEnemies: string[];
  
  // Encounter structure
  encounterCount: [number, number]; // min, max encounters
  eliteChance: number;              // Chance for elite encounter
  bossGuaranteed: boolean;          // Always has boss at end
  
  // Environmental effects
  terrainEffects: string[];
  ambientEffects: string[];
  
  // Loot modifiers
  preferredLootTypes: string[];
  lootBonuses: {
    [itemType: string]: number;   // Multiplier for specific types
  };
  
  // Visual theme
  backgroundImages: string[];
  musicTrack?: string;
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

// The River - special starter zone (per GDD section 2.7)
export interface RiverZone {
  // Always accessible, no key required
  isUnlocked: true;
  keyRequired: false;
  
  // Generates basic tier 1 content
  baseTier: 1;
  enemyPool: string[]; // Generic monster templates
  
  // Rewards tier 1 keys and basic gear
  lootTable: {
    keyDropChance: number;
    keyTiers: number[]; // Which tier keys can drop
    equipmentTiers: number[];
  };
  
  // Difficulty scaling
  encounterCount: number; // Fixed number of encounters
  difficultyProgression: number; // How much harder each encounter gets
}

// Dungeon generator creates instances from keys
export interface DungeonGenerator {
  // Main generation method
  generateDungeon(key: DungeonKey): DungeonInstance;
  
  // Sub-generators
  generateEncounters(tier: number, theme: DungeonTheme, count: number): DungeonEncounter[];
  generateBossEncounter(tier: number, theme: DungeonTheme): DungeonEncounter;
  applyKeyModifiers(dungeon: DungeonInstance, modifiers: KeyModifier[]): void;
  
  // River zone generation
  generateRiverEncounters(): DungeonEncounter[];
  
  // Validation
  validateDungeonBalance(dungeon: DungeonInstance): boolean;
}

// Specific game modes (per GDD section 2.7)

// Delve-like mode (future implementation)
export interface DelveMode {
  // Cart chasing mechanics
  cartPosition: number;
  playerPosition: number;
  maxDistance: number;           // How far behind player can fall
  
  // Path progression
  pathLength: number;
  encounterPositions: number[];  // Where encounters appear
  completedEncounters: number[];
  
  // Speed mechanics
  baseMovementSpeed: number;
  playerMovementSpeed: number;   // From stats
  cartMovementSpeed: number;
  
  // Failure conditions
  fallBehindDistance: number;    // Distance at which player fails
  timeLimit?: number;            // Optional time pressure
  
  // Rewards
  rewardMultiplier: number;      // Better rewards for keeping up
  uniqueMaterials: string[];     // Special crafting materials
}

// Tower Defense mode (future implementation)
export interface TowerDefenseMode {
  // Objective protection
  objectiveHealth: number;
  maxObjectiveHealth: number;
  
  // Wave system
  currentWave: number;
  totalWaves: number;
  waveEnemies: Enemy[][];
  
  // Player tools
  availableTowers: TowerOption[];
  placedTowers: PlacedTower[];
  
  // Resources
  towerPoints: number;           // Currency for placing towers
  pointsPerWave: number;
  
  // Victory conditions
  objectiveSurvived: boolean;
  allWavesDefeated: boolean;
}

export interface TowerOption {
  id: string;
  name: string;
  cost: number;
  
  // Tower stats
  damage: number;
  range: number;
  attackSpeed: number;
  specialEffects: string[];
  
  // Requirements
  requiredMaterials?: string[];
  unlockConditions?: string[];
}

export interface PlacedTower {
  id: string;
  towerType: string;
  position: { x: number; y: number };
  
  // State
  currentHealth: number;
  maxHealth: number;
  isActive: boolean;
  
  // Performance tracking
  damageDealt: number;
  enemiesKilled: number;
}

// Dungeon progression and unlocks
export interface DungeonProgression {
  // Highest tier reached
  maxTierReached: number;
  
  // Theme unlocks
  unlockedThemes: DungeonTheme[];
  
  // Special mode unlocks
  delveUnlocked: boolean;
  towerDefenseUnlocked: boolean;
  
  // Statistics
  dungeonsCompleted: number;
  totalDeaths: number;
  keysUsed: number;
  
  // Per-theme statistics
  themeStats: {
    [theme in DungeonTheme]: {
      timesCompleted: number;
      bestTime?: number;
      highestTier: number;
    };
  };
}

// Key crafting and modification system
export interface KeyModificationSystem {
  // Available modifications
  availableModifiers: KeyModifierTemplate[];
  
  // Modification rules
  maxModifiersPerKey: number;
  modifierConflicts: { [modifierId: string]: string[] };
  
  // Costs and requirements
  modificationCosts: {
    [modifierId: string]: {
      materials: string[];
      goldCost: number;
    };
  };
}

export interface KeyModifierTemplate {
  id: string;
  name: string;
  description: string;
  
  // Effects (per GDD examples)
  effects: {
    enemyHealthMultiplier?: number;      // "Enemies have 20% increased health"
    extraMonsterPacks?: number;          // "Area contains extra pack of magic monsters"
    keyDropChanceIncrease?: number;      // "Increased chance to find another key"
    lootTierBonus?: number;              // "Rewards are T+1"
    bossChanceIncrease?: number;         // Higher chance for boss encounter
    experienceMultiplier?: number;
    goldMultiplier?: number;
  };
  
  // Application rules
  validKeyTiers: number[];
  validThemes?: DungeonTheme[];
  stackable: boolean;
  
  // Costs
  difficultyIncrease: number;          // How much harder this makes the dungeon
  materialCosts: string[];
}