// Entity system - Player and Enemy classes with unified stat computation

import { EquipmentSlot, EnemyType, RangeState, StartingClass } from './enums';
import { BaseStats, EntityId, Position } from './base';
import { Item } from './items';
import { CombatEffect, EffectCollection } from './effects';

// Base entity interface - shared between Player and Enemy
export interface Entity {
  id: EntityId;
  name: string;
  
  // Base stats (from gear for player, inherent for enemies)
  baseStats: BaseStats;
  
  // Current state
  currentHealth: number;
  currentMana: number;
  currentEnergyShield: number;
  
  // Combat state
  rangeState: RangeState;
  position?: Position;
  initiative: number;
  
  // Effects and abilities
  effects: EffectCollection;
  
  // Temporary modifiers (like Block doubling armor for one turn)
  tempStatModifiers: Partial<BaseStats>;
  
  // Computed stats getter - calculates on-demand including all modifiers
  readonly computedStats: BaseStats;
  
  // Methods
  takeDamage(amount: number, type: string): boolean; // Returns true if alive
  heal(amount: number, healEnergyShield?: boolean): void;
  addEffect(effect: CombatEffect): void;
  removeEffect(effectId: string): boolean;
  
  // Reset temporary effects at turn end
  clearTemporaryEffects(): void;
}

// Player-specific data and methods
export interface Player extends Entity {
  // Progression
  level: number;
  experience: number;
  gold: number;
  
  // Equipment and inventory
  equipment: PlayerEquipment;
  inventory: PlayerInventory;
  stash: PlayerStash;
  
  // Loadouts for quick gear switching
  loadouts: PlayerLoadout[];
  currentLoadout: number;
  
  // Player actions
  canAct: boolean;
  lastAction?: string;
  
  // Starting class (affects initial gear only)
  startingClass: StartingClass;
  
  // Methods
  equipItem(item: Item, slot: EquipmentSlot): boolean;
  unequipItem(slot: EquipmentSlot): Item | null;
  switchLoadout(loadoutIndex: number): void;
  addToInventory(item: Item): boolean;
  removeFromInventory(itemId: string): Item | null;
  canEquip(item: Item, slot: EquipmentSlot): boolean;
}

// Enemy-specific data and methods
export interface Enemy extends Entity {
  // Enemy type determines AI behavior
  enemyType: EnemyType;
  
  // AI and behavior
  aiPattern: EnemyAIPattern;
  currentIntent: EnemyIntent;
  
  // Loot and rewards
  lootTier: number;
  experienceReward: number;
  goldReward: [number, number]; // Min, max range
  
  // Visual and theme
  spriteKey: string;
  animationSet: string;
  
  // Special properties
  isElite: boolean;
  isBoss: boolean;
  
  // Methods
  selectIntent(): EnemyIntent;
  executeIntent(targets: Entity[]): void;
  getTargetPriority(entities: Entity[]): Entity[];
}

// Player equipment slots
export interface PlayerEquipment {
  weapon?: Item;
  shield?: Item;
  helmet?: Item;
  chest?: Item;
  gloves?: Item;
  boots?: Item;
  amulet?: Item;
  ring1?: Item;
  ring2?: Item;
  
  // Helper methods
  getEquippedItem(slot: EquipmentSlot): Item | undefined;
  getAllEquipped(): Item[];
  getTotalStats(): Partial<BaseStats>;
  getGrantedAbilities(): string[];
}

// Player inventory (limited during dungeons)
export interface PlayerInventory {
  items: Item[];
  maxSize: number; // 10-20 slots during dungeon runs
  
  // Methods
  addItem(item: Item): boolean;
  removeItem(itemId: string): Item | null;
  findItem(predicate: (item: Item) => boolean): Item | undefined;
  getAvailableSpace(): number;
  isEmpty(): boolean;
  isFull(): boolean;
}

// Player stash (larger storage in town)
export interface PlayerStash {
  tabs: StashTab[];
  activeTab: number;
  
  // Methods
  addItemToTab(item: Item, tabIndex: number): boolean;
  moveItemBetweenTabs(itemId: string, fromTab: number, toTab: number): boolean;
  findItemInAllTabs(itemId: string): { item: Item; tab: number; index: number } | null;
  searchItems(query: string): { item: Item; tab: number; index: number }[];
}

export interface StashTab {
  name: string;
  icon: string;
  items: Item[];
  maxSize: number; // Expandable
}

// Saved gear loadouts
export interface PlayerLoadout {
  name: string;
  equipment: { [slot in EquipmentSlot]?: string }; // Item IDs
  isValid: boolean; // All items still exist and can be equipped
}

// Enemy AI patterns
export interface EnemyAIPattern {
  id: string;
  name: string;
  
  // Behavior weights
  aggressiveness: number; // 0-1, likelihood to attack vs defend
  intelligence: number;   // 0-1, how well it targets and uses abilities
  patience: number;       // 0-1, willingness to wait for better opportunities
  
  // Action preferences
  preferredRange: RangeState;
  abilityUsageFrequency: number;
  retreatThreshold: number; // Health % when it tries to retreat/defend
  
  // Special behaviors
  focusesWeakest: boolean;
  avoidsBlocking: boolean;
  usesAbilitiesWhenBlocked: boolean;
  
  // Methods
  selectAction(self: Enemy, targets: Entity[]): EnemyIntent;
  evaluateTargets(targets: Entity[]): Entity[];
}

// Enemy intended action (telegraphed to player)
export interface EnemyIntent {
  action: 'attack' | 'ability' | 'move' | 'defend' | 'nothing';
  targetId?: EntityId;
  abilityId?: string;
  
  // Preview information for UI
  estimatedDamage?: [number, number]; // Min, max damage
  damageType?: string;
  additionalEffects?: string[]; // Status effects or special mechanics
  
  // Visual
  iconPath: string;
  description: string;
  isMultiTarget: boolean;
}

// Entity factory for creating players and enemies
export interface EntityFactory {
  createPlayer(startingClass: StartingClass, name: string): Player;
  createEnemy(templateId: string, level: number): Enemy;
  createEnemyFromTemplate(template: EnemyTemplate): Enemy;
}

// Enemy templates for procedural generation
export interface EnemyTemplate {
  id: string;
  name: string;
  enemyType: EnemyType;
  
  // Stats scaling
  baseStats: BaseStats;
  statScaling: { [level: number]: number };
  
  // AI and behavior
  aiPatternId: string;
  abilities: string[]; // Ability IDs
  
  // Loot and rewards
  lootTier: number;
  experienceMultiplier: number;
  goldMultiplier: number;
  
  // Appearance
  spriteKey: string;
  animationSet: string;
  
  // Special flags
  isElite: boolean;
  isBoss: boolean;
  
  // Spawn rules
  spawnWeight: number;
  minDungeonTier: number;
  preferredThemes: string[];
  
  // Resistances and vulnerabilities
  resistances?: { [damageType: string]: number };
  vulnerabilities?: { [damageType: string]: number };
}

// Combat participant wrapper
export interface CombatParticipant {
  entity: Entity;
  turnOrder: number;
  hasActed: boolean;
  
  // Turn state
  canMove: boolean;
  canAttack: boolean;
  canUseAbilities: boolean;
  
  // Combat-specific state
  damageThisTurn: number;
  healingThisTurn: number;
  effectsAppliedThisTurn: string[];
}