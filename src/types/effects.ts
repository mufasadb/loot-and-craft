// Unified effect system for abilities and status effects

import { EffectTrigger, DurationUnit, StatusEffectType } from './enums';
import { BaseStats, DurationInfo, EffectContext, EffectResult, EntityId } from './base';

// Base effect class - unified system for abilities and statuses
export interface CombatEffect {
  id: string;
  name: string;
  triggers: EffectTrigger[];         // When this effect processes
  duration: DurationInfo;
  visible: boolean;                  // Shows as status icon
  stackable: boolean;                // Can multiple instances exist
  maxStacks?: number;
  
  // Source tracking
  sourceId?: EntityId;               // Who applied this effect
  sourceAbilityId?: string;          // What ability created it
  
  // Processing
  process(context: EffectContext): EffectResult;
  
  // Lifecycle
  onApply?(target: EntityId): void;
  onRemove?(target: EntityId): void;
  onStack?(existingEffect: CombatEffect): CombatEffect;
}

// Status effects - visible, continuous effects
export interface StatusEffect extends CombatEffect {
  statusType: StatusEffectType;
  visible: true;
  
  // Visual representation
  iconPath: string;
  description: string;
  
  // Status-specific properties
  damagePerTurn?: number;            // For DoTs like Ignite
  statModifiers?: Partial<BaseStats>; // For buffs/debuffs
  disablesActions?: boolean;         // Like Freeze
}

// Ability effects - triggered by items, usually invisible
export interface AbilityEffect extends CombatEffect {
  abilityId: string;
  manaCost?: number;                 // If manually toggled
  isToggleable: boolean;             // Can player turn on/off
  isActive: boolean;                 // Current state if toggleable
  
  // Activation conditions
  activationChance?: number;         // 0-1, chance to trigger
  cooldownTurns?: number;
  lastUsedTurn?: number;
  
  // Resource costs
  healthCost?: number;
  energyShieldCost?: number;
}

// Specific status effect implementations
export interface IgniteEffect extends StatusEffect {
  statusType: StatusEffectType.IGNITE;
  damagePerTurn: number;
  damageType: 'fire';
}

export interface ChillEffect extends StatusEffect {
  statusType: StatusEffectType.CHILL;
  movementSpeedReduction: number;    // Percentage
  actionDelayTurns: number;          // How much slower
}

export interface FreezeEffect extends StatusEffect {
  statusType: StatusEffectType.FREEZE;
  disablesActions: true;
}

export interface ShockEffect extends StatusEffect {
  statusType: StatusEffectType.SHOCK;
  damageVulnerability: number;       // Percentage increase in damage taken
}

export interface CurseEffect extends StatusEffect {
  statusType: StatusEffectType.CURSE;
  statReductions: Partial<BaseStats>; // What stats are reduced
}

// Specific ability effect implementations
export interface OnHitEffect extends AbilityEffect {
  triggers: [EffectTrigger.ON_ATTACK];
  effectToApply: StatusEffect;       // What status to apply on hit
}

export interface AuraEffect extends AbilityEffect {
  triggers: [EffectTrigger.CONTINUOUS];
  radius: number;                    // Affects nearby entities
  affectsAllies: boolean;
  affectsEnemies: boolean;
  auraEffects: Partial<BaseStats>;
}

export interface ReflectDamageEffect extends AbilityEffect {
  triggers: [EffectTrigger.AFTER_DAMAGE_TAKEN];
  reflectPercentage: number;         // How much damage to reflect
  reflectType?: 'same' | 'fire' | 'lightning' | 'ice' | 'dark';
}

export interface LifeStealEffect extends AbilityEffect {
  triggers: [EffectTrigger.AFTER_ATTACK];
  stealPercentage: number;           // Percentage of damage dealt
  healsEnergyShield: boolean;        // Whether it can heal ES too
}

// Block effect (special defensive action)
export interface BlockEffect extends AbilityEffect {
  triggers: [EffectTrigger.BEFORE_DAMAGE_TAKEN];
  duration: { amount: 1; unit: DurationUnit.TURNS };
  armorDoubling: true;
  damageReduction: 0.25;             // 25% damage reduction
}

// Effect processor handles all effect execution
export interface EffectProcessor {
  processEffects(
    trigger: EffectTrigger,
    context: EffectContext,
    effects: CombatEffect[]
  ): EffectResult[];
  
  addEffect(targetId: EntityId, effect: CombatEffect): void;
  removeEffect(targetId: EntityId, effectId: string): boolean;
  getEffects(targetId: EntityId): CombatEffect[];
  
  // Duration management
  advanceDurations(trigger: EffectTrigger): void;
  cleanupExpiredEffects(): void;
}

// Effect templates for item generation
export interface EffectTemplate {
  id: string;
  name: string;
  type: 'status' | 'ability';
  
  // Generation parameters
  manaCostRange?: [number, number];
  damageRange?: [number, number];
  durationRange?: [number, number];
  chanceRange?: [number, number];
  
  // Scaling with item level
  scalingFactor: number;
  
  // Restrictions
  allowedWeaponTypes?: string[];
  allowedArmorTypes?: string[];
  minItemLevel: number;
  
  // Description template
  descriptionTemplate: string;       // Uses {{variable}} placeholders
}

// Collection of all effects on an entity
export interface EffectCollection {
  statusEffects: StatusEffect[];
  abilityEffects: AbilityEffect[];
  
  // Quick access methods
  getActiveEffects(trigger: EffectTrigger): CombatEffect[];
  getTotalStatModifiers(): Partial<BaseStats>;
  hasEffect(effectId: string): boolean;
  getStackCount(effectId: string): number;
}