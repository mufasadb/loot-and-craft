// Base types and interfaces used throughout the game

import { DamageType, DurationUnit, EffectTrigger } from './enums';

// Core stats interface - all stats derive from equipment
export interface BaseStats {
  // Core resources (max values)
  maxHealth: number;
  maxMana: number;
  maxEnergyShield: number;

  // Defensive stats
  armor: number;
  fireResistance?: number;
  iceResistance?: number;
  lightningResistance?: number;
  darkResistance?: number;
  dodgeChance?: number;
  blockChance?: number;
  blockEffectiveness?: number;

  // Offensive stats
  damage: number; // Primary damage stat
  physicalDamage?: number;
  fireDamage?: number;
  iceDamage?: number;
  lightningDamage?: number;
  darkDamage?: number;
  increasedDamage?: number;
  criticalChance?: number;
  criticalMultiplier?: number;
  accuracy?: number;

  // Combat stats
  initiative: number;
  level: number;
  range?: number; // For ranged weapons

  // Utility stats
  movementSpeed?: number;
  magicFind?: number;
  itemQuantity?: number;
  manaRegeneration?: number;
  healthRegeneration?: number;
}

// Damage instance for combat calculations
export interface DamageInstance {
  amount: number;
  type: DamageType;
  isCritical: boolean;
  source: string; // Entity ID or ability name
}

// Duration information for effects
export interface DurationInfo {
  amount: number;
  unit: DurationUnit;
}

// Effect context for processing
export interface EffectContext {
  trigger: EffectTrigger;
  targetId: EntityId;
  sourceId?: EntityId;
  damage?: DamageInstance;
  attackTarget?: EntityId;
  damageDealt?: number;
  [key: string]: any;
}

// Result of effect processing
export interface EffectResult {
  success: boolean;
  message?: string;
  statModifiers?: Partial<BaseStats> & {
    damageMultiplier?: number;
  };
  damage?: {
    amount: number;
    type: string;
    targetId: EntityId;
  };
  healing?: {
    targetId: EntityId;
    amount: number;
    healEnergyShield?: boolean;
  };
  damageModification?: {
    originalAmount: number;
    newAmount: number;
    reason: string;
  };
  applyEffect?: {
    targetId: EntityId;
    effect: any;
  };
  statusChange?: {
    targetId: EntityId;
    canAct?: boolean;
  };
  preventAction?: boolean;
  preventsDamage?: boolean;
  reflectDamage?: {
    amount: number;
    targetId: EntityId;
    type: string;
  };
  additionalEffects?: string[]; // IDs of effects to add
  removeEffects?: string[]; // IDs of effects to remove
}

// Loot generation parameters
export interface LootParams {
  tier: number;
  magicFindBonus: number;
  quantityBonus: number;
  keyModifiers?: string[];
}

// Serializable unique identifier
export type EntityId = string;

// Position in combat (for future tactical positioning)
export interface Position {
  x: number;
  y: number;
}

// Combat targeting information
export interface TargetInfo {
  entityId: EntityId;
  position?: Position;
  isValid: boolean;
  reason?: string; // Why target is invalid
}