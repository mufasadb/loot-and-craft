// Unified effect processing system for abilities and status effects

import { makeObservable, observable, action } from 'mobx';
import {
  CombatEffect,
  StatusEffect,
  EffectProcessor as IEffectProcessor,
  IgniteEffect,
  ChillEffect,
  FreezeEffect,
  OnHitEffect,
  LifeStealEffect,
  BlockEffect
} from '../types/effects';
import {
  EffectTrigger,
  DurationUnit,
  StatusEffectType
} from '../types/enums';
import {
  BaseStats,
  EntityId,
  EffectContext,
  EffectResult,
  DurationInfo
} from '../types/base';

// Base CombatEffect implementation
export abstract class BaseCombatEffect implements CombatEffect {
  id: string;
  name: string;
  triggers: EffectTrigger[];
  duration: DurationInfo;
  visible: boolean;
  stackable: boolean;
  maxStacks?: number;
  sourceId?: EntityId;
  sourceAbilityId?: string;

  constructor(config: {
    id: string;
    name: string;
    triggers: EffectTrigger[];
    duration: DurationInfo;
    visible?: boolean;
    stackable?: boolean;
    maxStacks?: number;
    sourceId?: EntityId;
    sourceAbilityId?: string;
  }) {
    makeObservable(this, {
      duration: observable
    });

    this.id = config.id;
    this.name = config.name;
    this.triggers = config.triggers;
    this.duration = config.duration;
    this.visible = config.visible ?? false;
    this.stackable = config.stackable ?? false;
    this.maxStacks = config.maxStacks;
    this.sourceId = config.sourceId;
    this.sourceAbilityId = config.sourceAbilityId;
  }

  abstract process(context: EffectContext): EffectResult;

  onApply?(target: EntityId): void;
  onRemove?(target: EntityId): void;
  onStack?(existingEffect: CombatEffect): CombatEffect;
}

// Status Effect implementations
export class IgniteEffectImpl extends BaseCombatEffect implements IgniteEffect {
  statusType = StatusEffectType.IGNITE as const;
  visible = true as const;
  iconPath: string;
  description: string;
  damagePerTurn: number;
  damageType: 'fire' = 'fire';

  constructor(config: {
    id: string;
    duration: DurationInfo;
    damagePerTurn: number;
    sourceId?: EntityId;
  }) {
    super({
      id: config.id,
      name: 'Ignite',
      triggers: [EffectTrigger.TURN_START],
      duration: config.duration,
      visible: true,
      stackable: true,
      maxStacks: 10,
      sourceId: config.sourceId
    });

    this.damagePerTurn = config.damagePerTurn;
    this.iconPath = 'ui/status/ignite.png';
    this.description = `Taking ${this.damagePerTurn} fire damage per turn`;
  }

  process(context: EffectContext): EffectResult {
    if (context.trigger === EffectTrigger.TURN_START) {
      return {
        success: true,
        damage: {
          amount: this.damagePerTurn,
          type: this.damageType,
          targetId: context.targetId
        },
        message: `${context.targetId} burns for ${this.damagePerTurn} fire damage`
      };
    }
    return { success: false };
  }
}

export class ChillEffectImpl extends BaseCombatEffect implements ChillEffect {
  statusType = StatusEffectType.CHILL as const;
  visible = true as const;
  iconPath: string;
  description: string;
  movementSpeedReduction: number;
  actionDelayTurns: number;
  statModifiers?: Partial<BaseStats>;

  constructor(config: {
    id: string;
    duration: DurationInfo;
    movementSpeedReduction: number;
    actionDelayTurns: number;
    sourceId?: EntityId;
  }) {
    super({
      id: config.id,
      name: 'Chill',
      triggers: [EffectTrigger.CONTINUOUS],
      duration: config.duration,
      visible: true,
      stackable: false,
      sourceId: config.sourceId
    });

    this.movementSpeedReduction = config.movementSpeedReduction;
    this.actionDelayTurns = config.actionDelayTurns;
    this.iconPath = 'ui/status/chill.png';
    this.description = `Movement slowed by ${this.movementSpeedReduction}%`;
    
    // Chill reduces initiative
    this.statModifiers = {
      initiative: -this.actionDelayTurns
    };
  }

  process(_context: EffectContext): EffectResult {
    return { success: true, message: 'Movement slowed by chill' };
  }
}

export class FreezeEffectImpl extends BaseCombatEffect implements FreezeEffect {
  statusType = StatusEffectType.FREEZE as const;
  visible = true as const;
  iconPath: string;
  description: string;
  disablesActions = true as const;

  constructor(config: {
    id: string;
    duration: DurationInfo;
    sourceId?: EntityId;
  }) {
    super({
      id: config.id,
      name: 'Freeze',
      triggers: [EffectTrigger.CONTINUOUS],
      duration: config.duration,
      visible: true,
      stackable: false,
      sourceId: config.sourceId
    });

    this.iconPath = 'ui/status/freeze.png';
    this.description = 'Frozen solid - cannot act';
  }

  process(context: EffectContext): EffectResult {
    return {
      success: true,
      statusChange: {
        targetId: context.targetId,
        canAct: false
      },
      message: `${context.targetId} is frozen and cannot act`
    };
  }
}

export class BlockEffectImpl extends BaseCombatEffect implements BlockEffect {
  triggers = [EffectTrigger.BEFORE_DAMAGE_TAKEN];
  duration = { amount: 1, unit: DurationUnit.TURNS } as const;
  armorDoubling = true as const;
  damageReduction = 0.25 as const;
  abilityId: string;
  isToggleable = false as const;
  isActive = true as const;

  constructor(config: {
    id: string;
    sourceId?: EntityId;
  }) {
    super({
      id: config.id,
      name: 'Block',
      triggers: [EffectTrigger.BEFORE_DAMAGE_TAKEN],
      duration: { amount: 1, unit: DurationUnit.TURNS },
      visible: true,
      stackable: false,
      sourceId: config.sourceId
    });

    this.abilityId = 'block_action';
  }

  process(context: EffectContext): EffectResult {
    if (context.trigger === EffectTrigger.BEFORE_DAMAGE_TAKEN && context.damage) {
      // Apply 25% damage reduction
      const reducedDamage = Math.floor(context.damage.amount * (1 - this.damageReduction));
      
      return {
        success: true,
        damageModification: {
          originalAmount: context.damage.amount,
          newAmount: reducedDamage,
          reason: 'Blocked'
        },
        message: `Blocked! Damage reduced from ${context.damage.amount} to ${reducedDamage}`
      };
    }
    
    return { success: false };
  }

  onApply(_target: EntityId): void {
    // The armor doubling is handled by the entity's tempStatModifiers
    // This is applied when the block action is executed
  }
}

// Ability Effect implementations
export class OnHitEffectImpl extends BaseCombatEffect implements OnHitEffect {
  triggers = [EffectTrigger.ON_ATTACK];
  abilityId: string;
  isToggleable: boolean;
  isActive: boolean;
  effectToApply: StatusEffect;
  activationChance?: number;

  constructor(config: {
    id: string;
    abilityId: string;
    effectToApply: StatusEffect;
    duration: DurationInfo;
    activationChance?: number;
    isToggleable?: boolean;
    sourceId?: EntityId;
  }) {
    super({
      id: config.id,
      name: `On Hit: ${config.effectToApply.name}`,
      triggers: [EffectTrigger.ON_ATTACK],
      duration: config.duration,
      visible: false,
      stackable: false,
      sourceId: config.sourceId
    });

    this.abilityId = config.abilityId;
    this.effectToApply = config.effectToApply;
    this.activationChance = config.activationChance ?? 1.0;
    this.isToggleable = config.isToggleable ?? false;
    this.isActive = true;
  }

  process(context: EffectContext): EffectResult {
    if (context.trigger === EffectTrigger.ON_ATTACK && this.isActive) {
      // Check activation chance
      if (this.activationChance && Math.random() > this.activationChance) {
        return { success: false };
      }

      return {
        success: true,
        applyEffect: {
          targetId: context.attackTarget || context.targetId,
          effect: this.effectToApply
        },
        message: `Applied ${this.effectToApply.name} on hit`
      };
    }
    
    return { success: false };
  }
}

export class LifeStealEffectImpl extends BaseCombatEffect implements LifeStealEffect {
  triggers = [EffectTrigger.AFTER_ATTACK];
  abilityId: string;
  isToggleable: boolean;
  isActive: boolean;
  stealPercentage: number;
  healsEnergyShield: boolean;

  constructor(config: {
    id: string;
    abilityId: string;
    stealPercentage: number;
    healsEnergyShield?: boolean;
    duration: DurationInfo;
    sourceId?: EntityId;
  }) {
    super({
      id: config.id,
      name: `Life Steal ${(config.stealPercentage * 100).toFixed(0)}%`,
      triggers: [EffectTrigger.AFTER_ATTACK],
      duration: config.duration,
      visible: false,
      stackable: false,
      sourceId: config.sourceId
    });

    this.abilityId = config.abilityId;
    this.stealPercentage = config.stealPercentage;
    this.healsEnergyShield = config.healsEnergyShield ?? false;
    this.isToggleable = false;
    this.isActive = true;
  }

  process(context: EffectContext): EffectResult {
    if (context.trigger === EffectTrigger.AFTER_ATTACK && context.damageDealt && this.isActive) {
      const healAmount = Math.floor(context.damageDealt * this.stealPercentage);
      
      return {
        success: true,
        healing: {
          targetId: context.sourceId || context.targetId,
          amount: healAmount,
          healEnergyShield: this.healsEnergyShield
        },
        message: `Life steal healed for ${healAmount}`
      };
    }
    
    return { success: false };
  }
}

// Effect Processor implementation
export class EffectProcessor implements IEffectProcessor {
  private entityEffects: Map<EntityId, CombatEffect[]> = new Map();

  constructor() {
    makeObservable(this, {
      processEffects: action,
      addEffect: action,
      removeEffect: action,
      advanceDurations: action,
      cleanupExpiredEffects: action
    });
  }

  processEffects(
    trigger: EffectTrigger,
    context: EffectContext,
    effects: CombatEffect[]
  ): EffectResult[] {
    const results: EffectResult[] = [];
    
    // Filter effects by trigger
    const relevantEffects = effects.filter(effect => effect.triggers.includes(trigger));
    
    // Process each effect
    for (const effect of relevantEffects) {
      const result = effect.process({ ...context, trigger });
      if (result.success) {
        results.push(result);
      }
    }
    
    return results;
  }

  addEffect(targetId: EntityId, effect: CombatEffect): void {
    if (!this.entityEffects.has(targetId)) {
      this.entityEffects.set(targetId, []);
    }
    
    const effects = this.entityEffects.get(targetId)!;
    
    // Check for stacking
    if (effect.stackable) {
      const existingStacks = effects.filter(e => e.id === effect.id).length;
      if (effect.maxStacks && existingStacks >= effect.maxStacks) {
        return; // Max stacks reached
      }
    } else {
      // Remove existing non-stackable effect
      const existingIndex = effects.findIndex(e => e.id === effect.id);
      if (existingIndex >= 0) {
        const existing = effects[existingIndex];
        if (effect.onStack) {
          const merged = effect.onStack(existing);
          effects[existingIndex] = merged;
          return;
        } else {
          effects.splice(existingIndex, 1);
        }
      }
    }
    
    effects.push(effect);
  }

  removeEffect(targetId: EntityId, effectId: string): boolean {
    const effects = this.entityEffects.get(targetId);
    if (!effects) return false;
    
    const index = effects.findIndex(e => e.id === effectId);
    if (index >= 0) {
      const effect = effects[index];
      if (effect.onRemove) {
        effect.onRemove(targetId);
      }
      effects.splice(index, 1);
      return true;
    }
    
    return false;
  }

  getEffects(targetId: EntityId): CombatEffect[] {
    return this.entityEffects.get(targetId) || [];
  }

  advanceDurations(trigger: EffectTrigger): void {
    for (const [, effects] of this.entityEffects.entries()) {
      for (const effect of effects) {
        // Only advance turn-based durations on turn end
        if (trigger === EffectTrigger.TURN_END && effect.duration.unit === DurationUnit.TURNS) {
          effect.duration.amount = Math.max(0, effect.duration.amount - 1);
        }
        // Only advance round-based durations on combat end
        else if (trigger === EffectTrigger.COMBAT_END && effect.duration.unit === DurationUnit.ROUNDS) {
          effect.duration.amount = Math.max(0, effect.duration.amount - 1);
        }
      }
    }
  }

  cleanupExpiredEffects(): void {
    for (const [targetId, effects] of this.entityEffects.entries()) {
      const remaining = effects.filter(effect => {
        if (effect.duration.unit === DurationUnit.PERMANENT) {
          return true;
        }
        
        if (effect.duration.amount <= 0) {
          if (effect.onRemove) {
            effect.onRemove(targetId);
          }
          return false;
        }
        
        return true;
      });
      
      this.entityEffects.set(targetId, remaining);
    }
  }
}

// Effect factory functions for easy creation
export const EffectFactory = {
  createIgnite: (config: { 
    duration: DurationInfo; 
    damagePerTurn: number; 
    sourceId?: EntityId;
  }): IgniteEffect => {
    return new IgniteEffectImpl({
      id: `ignite_${Date.now()}_${Math.random()}`,
      ...config
    });
  },

  createChill: (config: {
    duration: DurationInfo;
    movementSpeedReduction: number;
    actionDelayTurns: number;
    sourceId?: EntityId;
  }): ChillEffect => {
    return new ChillEffectImpl({
      id: `chill_${Date.now()}_${Math.random()}`,
      ...config
    });
  },

  createFreeze: (config: {
    duration: DurationInfo;
    sourceId?: EntityId;
  }): FreezeEffect => {
    return new FreezeEffectImpl({
      id: `freeze_${Date.now()}_${Math.random()}`,
      ...config
    });
  },

  createBlock: (config: {
    sourceId?: EntityId;
  }): BlockEffect => {
    return new BlockEffectImpl({
      id: `block_${Date.now()}_${Math.random()}`,
      ...config
    });
  },

  createOnHitEffect: (config: {
    abilityId: string;
    effectToApply: StatusEffect;
    duration: DurationInfo;
    activationChance?: number;
    sourceId?: EntityId;
  }): OnHitEffect => {
    return new OnHitEffectImpl({
      id: `onhit_${config.abilityId}_${Date.now()}`,
      ...config
    });
  },

  createLifeSteal: (config: {
    abilityId: string;
    stealPercentage: number;
    healsEnergyShield?: boolean;
    duration: DurationInfo;
    sourceId?: EntityId;
  }): LifeStealEffect => {
    return new LifeStealEffectImpl({
      id: `lifesteal_${config.abilityId}_${Date.now()}`,
      ...config
    });
  }
};