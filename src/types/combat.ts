// Combat system types - state machine, actions, and damage calculations

import { CombatState, CombatAction, RangeState, DamageType } from './enums';
import { EntityId, DamageInstance } from './base';
import { Entity, Enemy, Player, CombatParticipant } from './entities';
import { Item, KeyModifier } from './items';

// Re-export enums for external use
export { CombatState, CombatAction, RangeState, DamageType };

// Main combat state machine
export interface CombatManager {
  currentState: CombatState;
  participants: CombatParticipant[];
  player: Player;
  enemies: Enemy[];
  
  // Combat settings from key
  keyModifiers: KeyModifier[];
  dungeonTier: number;
  
  // Turn management
  currentTurn: number;
  currentParticipantIndex: number;
  turnOrder: EntityId[];
  
  // Range states for all entities
  rangeStates: Map<EntityId, RangeState>;
  
  // Combat history
  combatLog: CombatLogEntry[];
  damageHistory: DamageRecord[];
  
  // State machine methods
  advanceState(): void;
  setState(newState: CombatState): void;
  canTransition(fromState: CombatState, toState: CombatState): boolean;
  
  // Combat actions
  executePlayerAction(action: PlayerAction): Promise<void>;
  executeEnemyAction(enemy: Enemy): Promise<void>;
  
  // Range management
  getRange(entityId1: EntityId, entityId2: EntityId): RangeState;
  changeRange(entityId: EntityId, newRange: RangeState): void;
  
  // Victory/defeat checking
  checkVictory(): boolean;
  checkDefeat(): boolean;
  
  // Loot distribution
  generateLoot(): Item[];
  applyKeyModifiers(loot: Item[]): Item[];
}

// Player actions in combat
export interface PlayerAction {
  type: CombatAction;
  targetId?: EntityId;
  abilityId?: string;
  
  // Action validation
  isValid: boolean;
  invalidReason?: string;
  
  // Execution context
  executionOrder: number;
  manaCost: number;
  canBeCountered: boolean;
}

// Attack action specifics
export interface AttackAction extends PlayerAction {
  type: CombatAction.ATTACK;
  targetId: EntityId;
  
  // Attack parameters
  weaponUsed: Item;
  damageRolls: DamageInstance[];
  hitChance: number;
  criticalChance: number;
  
  // Special attack properties
  isMultiTarget: boolean;
  additionalTargets?: EntityId[];
  rangeRequired: RangeState;
}

// Block action (special defensive action)
export interface BlockAction extends PlayerAction {
  type: CombatAction.BLOCK;
  
  // Block mechanics (per GDD)
  armorDoubleAmount: number;  // Current armor value to double
  damageReduction: 0.25;      // 25% damage reduction
  duration: 1;                // Lasts until end of turn
}

// Ability casting action
export interface CastAbilityAction extends PlayerAction {
  type: CombatAction.CAST_ABILITY;
  abilityId: string;
  targetId?: string;
  
  // Ability properties from data
  manaCost: number;
  cooldown: number;
  targetType: string;
  effectType: string;
  magnitude: number;
  statusEffectChance: number;
  statusEffect?: string;
  duration?: number;
}

// Ability toggle action
export interface ToggleAbilityAction extends PlayerAction {
  type: CombatAction.TOGGLE_ABILITY;
  abilityId: string;
  
  // Toggle state
  currentlyActive: boolean;
  newState: boolean;
  
  // Ability properties
  manaCostPerTurn?: number;
  activationCost?: number;
  deactivationCost?: number;
}

// Movement action (range change)
export interface MoveAction extends PlayerAction {
  type: CombatAction.MOVE;
  
  newRangeState: RangeState;
  movementCost: number; // Usually 1 turn
}

// Escape action (flee from combat)
export interface EscapeAction extends PlayerAction {
  type: CombatAction.ESCAPE;
  
  successChance: number;
  consequences: string[]; // What happens if escape fails
  isAllowed: boolean;     // Some dungeons don't allow escape
}

// Damage calculation pipeline
export interface DamageCalculation {
  // Input
  attacker: Entity;
  target: Entity;
  baseDamage: number;
  damageType: DamageType;
  
  // Calculation steps
  rawDamage: number;
  hitRoll: number;
  hitSuccess: boolean;
  criticalRoll: number;
  criticalSuccess: boolean;
  finalDamage: number;
  
  // Mitigation
  armorReduction: number;
  resistanceReduction: number;
  dodgeRoll: number;
  dodgeSuccess: boolean;
  blockReduction: number;
  
  // Results
  damageDealt: number;
  healthDamage: number;
  energyShieldDamage: number;
  
  // Effects triggered
  onHitEffects: string[];
  statusesApplied: string[];
  
  // Display
  showCritical: boolean;
  showDodge: boolean;
  showBlock: boolean;
  combatMessage: string;
}

// Combat damage record for tracking
export interface DamageRecord {
  turn: number;
  attackerId: EntityId;
  targetId: EntityId;
  damage: DamageInstance;
  finalDamage: number;
  
  // Context
  abilityUsed?: string;
  wasCritical: boolean;
  wasBlocked: boolean;
  wasDodged: boolean;
  
  timestamp: number;
}

// Combat log entry for UI display
export interface CombatLogEntry {
  turn: number;
  message: string;
  type: 'damage' | 'heal' | 'effect' | 'action' | 'system' | 'error' | 'buff' | 'debuff';
  entityId?: EntityId;
  
  // Visual styling
  color?: string;
  emphasis?: boolean;
  
  timestamp: number;
}

// Combat initialization parameters
export interface CombatInitParams {
  player: Player;
  enemies: Enemy[];
  dungeonTier: number;
  keyModifiers: KeyModifier[];
  
  // Special combat rules
  allowEscape: boolean;
  turnTimeLimit?: number;
  
  // Environmental effects
  environmentalEffects?: string[];
}

// Combat result when combat ends
export interface CombatResult {
  outcome: 'victory' | 'defeat' | 'escape';
  
  // Victory rewards
  loot?: Item[];
  experience?: number;
  gold?: number;
  
  // Defeat penalties (per GDD)
  defeatPenalties?: {
    lostKey: boolean;
    lostBackpackItems: Item[];
    lostEquippedItem?: Item;
  };
  
  // Statistics
  totalDamageDealt: number;
  totalDamageTaken: number;
  turnsElapsed: number;
  abilitiesUsed: string[];
  
  // Combat log for review
  combatLog: CombatLogEntry[];
}

// Range mechanics implementation
export interface RangeManager {
  // Range state tracking
  entityRanges: Map<EntityId, RangeState>;
  
  // Range change validation
  canChangeRange(entityId: EntityId, newRange: RangeState): boolean;
  getRangeChangeTime(entityId: EntityId, newRange: RangeState): number;
  
  // Attack validation based on range
  canAttack(attackerId: EntityId, targetId: EntityId): boolean;
  getAttackModifier(attackerId: EntityId, targetId: EntityId): number;
  
  // Special range rules (per GDD)
  // - Melee must spend turn to close distance
  // - Ranged vs ranged start in range
  // - Bow users get advantage vs melee (enemy uses first turn to close)
  handleBowAdvantage(bowUser: EntityId, meleeEnemy: EntityId): void;
}

// Initiative system for turn order
export interface InitiativeManager {
  rollInitiative(participants: Entity[]): EntityId[];
  getInitiativeBonus(entity: Entity): number;
  handleTiedInitiative(entities: Entity[]): EntityId[];
  
  // Special initiative rules
  playerGoesFirst: boolean;
  randomizeOrder: boolean;
}

// Defeat penalty system (per GDD section 2.8)
export interface DefeatPenaltyManager {
  // Apply penalties when player is defeated
  applyDefeatPenalties(player: Player, keyUsed?: Item): DefeatPenaltyResult;
  
  // Individual penalty calculations
  loseKey(keyUsed?: Item): boolean;
  loseBackpackItems(player: Player): Item[];
  loseEquippedItem(player: Player): Item | null;
  
  // Severity tuning
  equippedItemLossChance: number; // To be tuned - high risk per GDD
}

export interface DefeatPenaltyResult {
  keyLost: boolean;
  backpackItemsLost: Item[];
  equippedItemLost?: Item;
  
  // For UI display
  penaltyMessages: string[];
  totalValueLost: number;
}