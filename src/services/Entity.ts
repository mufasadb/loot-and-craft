// Entity base class implementation with computed stats and effect system

import { makeObservable, observable, computed } from 'mobx';
import { 
  Entity as IEntity, 
  Player as IPlayer, 
  Enemy as IEnemy,
  PlayerEquipment,
  PlayerInventory,
  PlayerStash,
  PlayerLoadout,
  EnemyAIPattern,
  EnemyIntent
} from '../types/entities';
import { BaseStats, EntityId, Position } from '../types/base';
import { CombatEffect, EffectCollection, StatusEffect, AbilityEffect } from '../types/effects';
import { EquipmentSlot, RangeState, StartingClass, EnemyType, EffectTrigger, DurationUnit } from '../types/enums';
import { Item } from '../types/items';

// Base Entity class - abstract implementation
export abstract class BaseEntity implements IEntity {
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
  effects: EffectCollectionImpl;
  
  // Temporary modifiers (like Block doubling armor for one turn)
  tempStatModifiers: Partial<BaseStats>;

  constructor(id: EntityId, name: string, baseStats: BaseStats) {
    this.id = id;
    this.name = name;
    this.baseStats = baseStats;
    this.currentHealth = baseStats.maxHealth;
    this.currentMana = baseStats.maxMana;
    this.currentEnergyShield = baseStats.maxEnergyShield;
    this.rangeState = RangeState.IN_RANGE;
    this.initiative = 0;
    this.effects = new EffectCollectionImpl();
    this.tempStatModifiers = {};
  }

  // Computed stats getter - calculates on-demand including all modifiers
  get computedStats(): BaseStats {
    const base = { ...this.baseStats };
    
    // Apply temporary modifiers (like Block)
    Object.entries(this.tempStatModifiers).forEach(([key, value]) => {
      if (value !== undefined) {
        (base as any)[key] += value;
      }
    });
    
    // Apply effect modifiers
    const effectModifiers = this.effects.getTotalStatModifiers();
    Object.entries(effectModifiers).forEach(([key, value]) => {
      if (value !== undefined) {
        (base as any)[key] += value;
      }
    });
    
    return base;
  }

  // Damage handling with Energy Shield mechanics
  takeDamage(amount: number, _type: string = 'physical'): boolean {
    if (amount <= 0) return this.currentHealth > 0;
    
    // Energy Shield absorbs all damage types first
    if (this.currentEnergyShield > 0) {
      const absorbed = Math.min(this.currentEnergyShield, amount);
      this.currentEnergyShield -= absorbed;
      amount -= absorbed;
    }
    
    // Remaining damage goes to health
    if (amount > 0) {
      this.currentHealth = Math.max(0, this.currentHealth - amount);
    }
    
    return this.currentHealth > 0;
  }

  heal(amount: number, healEnergyShield: boolean = false): void {
    if (amount <= 0) return;
    
    if (healEnergyShield && this.currentEnergyShield < this.computedStats.maxEnergyShield) {
      const esHeal = Math.min(amount, this.computedStats.maxEnergyShield - this.currentEnergyShield);
      this.currentEnergyShield += esHeal;
      amount -= esHeal;
    }
    
    if (amount > 0) {
      this.currentHealth = Math.min(this.computedStats.maxHealth, this.currentHealth + amount);
    }
  }

  addEffect(effect: CombatEffect): void {
    if (effect.onApply) {
      effect.onApply(this.id);
    }
    
    if (effect.visible && this.isStatusEffect(effect)) {
      this.effects.statusEffects.push(effect as StatusEffect);
    } else if (this.isAbilityEffect(effect)) {
      this.effects.abilityEffects.push(effect as AbilityEffect);
    }
  }

  removeEffect(effectId: string): boolean {
    // Try to remove from status effects
    const statusIndex = this.effects.statusEffects.findIndex(e => e.id === effectId);
    if (statusIndex >= 0) {
      const effect = this.effects.statusEffects[statusIndex];
      if (effect.onRemove) {
        effect.onRemove(this.id);
      }
      this.effects.statusEffects.splice(statusIndex, 1);
      return true;
    }
    
    // Try to remove from ability effects
    const abilityIndex = this.effects.abilityEffects.findIndex(e => e.id === effectId);
    if (abilityIndex >= 0) {
      const effect = this.effects.abilityEffects[abilityIndex];
      if (effect.onRemove) {
        effect.onRemove(this.id);
      }
      this.effects.abilityEffects.splice(abilityIndex, 1);
      return true;
    }
    
    return false;
  }

  // Reset temporary effects at turn end
  clearTemporaryEffects(): void {
    this.tempStatModifiers = {};
    
    // Remove effects with turn-based durations
    this.effects.statusEffects = this.effects.statusEffects.filter(effect => {
      if (effect.duration.unit === DurationUnit.TURNS && effect.duration.amount <= 0) {
        if (effect.onRemove) {
          effect.onRemove(this.id);
        }
        return false;
      }
      return true;
    });
    
    this.effects.abilityEffects = this.effects.abilityEffects.filter(effect => {
      if (effect.duration.unit === DurationUnit.TURNS && effect.duration.amount <= 0) {
        if (effect.onRemove) {
          effect.onRemove(this.id);
        }
        return false;
      }
      return true;
    });
  }

  private isStatusEffect(effect: CombatEffect): effect is StatusEffect {
    return effect.visible && 'statusType' in effect && 'iconPath' in effect;
  }

  private isAbilityEffect(effect: CombatEffect): effect is AbilityEffect {
    return 'abilityId' in effect && 'isToggleable' in effect;
  }
}

// EffectCollection implementation
class EffectCollectionImpl implements EffectCollection {
  statusEffects: StatusEffect[] = [];
  abilityEffects: AbilityEffect[] = [];

  constructor() {
    makeObservable(this, {
      statusEffects: observable,
      abilityEffects: observable
    });
  }

  getActiveEffects(trigger: EffectTrigger): CombatEffect[] {
    const allEffects = [...this.statusEffects, ...this.abilityEffects];
    return allEffects.filter(effect => effect.triggers.includes(trigger));
  }

  getTotalStatModifiers(): Partial<BaseStats> {
    const modifiers: Partial<BaseStats> = {};
    
    // Process status effects
    this.statusEffects.forEach(effect => {
      if (effect.statModifiers) {
        Object.entries(effect.statModifiers).forEach(([key, value]) => {
          if (value !== undefined) {
            (modifiers as any)[key] = ((modifiers as any)[key] || 0) + value;
          }
        });
      }
    });
    
    // Process ability effects (if they have continuous stat modifiers)
    this.abilityEffects.forEach(effect => {
      if (effect.triggers.includes(EffectTrigger.CONTINUOUS) && effect.isActive) {
        // Ability effects with continuous modifiers would go here
        // This is implementation-specific based on ability type
      }
    });
    
    return modifiers;
  }

  hasEffect(effectId: string): boolean {
    return this.statusEffects.some(e => e.id === effectId) || 
           this.abilityEffects.some(e => e.id === effectId);
  }

  getStackCount(effectId: string): number {
    const statusCount = this.statusEffects.filter(e => e.id === effectId).length;
    const abilityCount = this.abilityEffects.filter(e => e.id === effectId).length;
    return statusCount + abilityCount;
  }
}

// Player class implementation
export class Player extends BaseEntity implements IPlayer {
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

  constructor(
    id: EntityId, 
    name: string, 
    startingClass: StartingClass, 
    baseStats: BaseStats
  ) {
    super(id, name, baseStats);
    
    // Initialize fields first
    this.level = 1;
    this.experience = 0;
    this.gold = 0;
    this.startingClass = startingClass;
    this.equipment = new PlayerEquipmentImpl();
    this.inventory = new PlayerInventoryImpl(20); // Default 20 slots
    this.stash = new PlayerStashImpl();
    this.loadouts = [];
    this.currentLoadout = 0;
    this.canAct = true;
    this.lastAction = undefined;
    
    // Then configure MobX
    makeObservable(this, {
      // Inherited fields from BaseEntity
      baseStats: observable,
      currentHealth: observable,
      currentMana: observable,
      currentEnergyShield: observable,
      rangeState: observable,
      initiative: observable,
      tempStatModifiers: observable,
      computedStats: computed,
      // Player-specific observables
      startingClass: false,
      stash: false,
      loadouts: false,
      level: observable,
      experience: observable,
      gold: observable,
      equipment: observable,
      inventory: observable,
      currentLoadout: observable,
      canAct: observable,
      lastAction: observable
    });
  }

  equipItem(item: Item, slot: EquipmentSlot): boolean {
    if (!this.canEquip(item, slot)) {
      return false;
    }
    
    // Unequip existing item if present
    const existing = this.equipment.getEquippedItem(slot);
    if (existing) {
      this.unequipItem(slot);
    }
    
    // Equip new item
    (this.equipment as any)[slot] = item;
    
    // Remove from inventory if it was there
    this.removeFromInventory(item.id);
    
    return true;
  }

  unequipItem(slot: EquipmentSlot): Item | null {
    const item = this.equipment.getEquippedItem(slot);
    if (!item) return null;
    
    // Try to add to inventory
    if (this.addToInventory(item)) {
      (this.equipment as any)[slot] = undefined;
      return item;
    }
    
    return null; // Inventory full
  }

  switchLoadout(loadoutIndex: number): void {
    if (loadoutIndex < 0 || loadoutIndex >= this.loadouts.length) {
      return;
    }
    
    const loadout = this.loadouts[loadoutIndex];
    if (!loadout.isValid) {
      return;
    }
    
    // TODO: Implement loadout switching logic
    this.currentLoadout = loadoutIndex;
  }

  addToInventory(item: Item): boolean {
    return this.inventory.addItem(item);
  }

  removeFromInventory(itemId: string): Item | null {
    return this.inventory.removeItem(itemId);
  }

  canEquip(item: Item, slot: EquipmentSlot): boolean {
    // Check if item is equipment type
    if (!item.equipment) {
      return false;
    }
    
    // Check if item is compatible with slot
    if (item.equipment.slot !== slot) {
      return false;
    }
    
    // TODO: Add more validation (level requirements, class restrictions, etc.)
    return true;
  }

  // Override computedStats to include equipment
  get computedStats(): BaseStats {
    const base = super.computedStats;
    const equipmentStats = this.equipment.getTotalStats();
    
    // Add equipment stats to base
    Object.entries(equipmentStats).forEach(([key, value]) => {
      if (value !== undefined) {
        (base as any)[key] += value;
      }
    });
    
    return base;
  }
}

// PlayerEquipment implementation
class PlayerEquipmentImpl implements PlayerEquipment {
  weapon?: Item;
  shield?: Item;
  helmet?: Item;
  chest?: Item;
  gloves?: Item;
  boots?: Item;
  amulet?: Item;
  ring1?: Item;
  ring2?: Item;

  constructor() {
    // Initialize all equipment slots to undefined
    this.weapon = undefined;
    this.shield = undefined;
    this.helmet = undefined;
    this.chest = undefined;
    this.gloves = undefined;
    this.boots = undefined;
    this.amulet = undefined;
    this.ring1 = undefined;
    this.ring2 = undefined;
    
    makeObservable(this, {
      weapon: observable,
      shield: observable,
      helmet: observable,
      chest: observable,
      gloves: observable,
      boots: observable,
      amulet: observable,
      ring1: observable,
      ring2: observable
    });
  }

  getEquippedItem(slot: EquipmentSlot): Item | undefined {
    return (this as any)[slot];
  }

  getAllEquipped(): Item[] {
    return Object.values(this).filter(item => item !== undefined) as Item[];
  }

  getTotalStats(): Partial<BaseStats> {
    const stats: Partial<BaseStats> = {};
    
    this.getAllEquipped().forEach(item => {
      // Add inherent stats from equipment
      if (item.equipment?.inherentStats) {
        Object.entries(item.equipment.inherentStats).forEach(([key, value]) => {
          if (value !== undefined) {
            (stats as any)[key] = ((stats as any)[key] || 0) + value;
          }
        });
      }
      
      // Add affix stats
      item.affixes.forEach(affix => {
        if (affix.statModifiers) {
          Object.entries(affix.statModifiers).forEach(([key, value]) => {
            if (value !== undefined) {
              (stats as any)[key] = ((stats as any)[key] || 0) + value;
            }
          });
        }
      });
    });
    
    return stats;
  }

  getGrantedAbilities(): string[] {
    const abilities: string[] = [];
    
    this.getAllEquipped().forEach(item => {
      if (item.equipment?.grantedAbilities) {
        abilities.push(...item.equipment.grantedAbilities);
      }
    });
    
    return abilities;
  }
}

// PlayerInventory implementation  
class PlayerInventoryImpl implements PlayerInventory {
  items: Item[] = [];
  maxSize: number;

  constructor(maxSize: number = 20) {
    this.maxSize = maxSize;
    
    makeObservable(this, {
      items: observable,
      maxSize: observable
    });
  }

  addItem(item: Item): boolean {
    if (this.isFull()) {
      return false;
    }
    
    this.items.push(item);
    return true;
  }

  removeItem(itemId: string): Item | null {
    const index = this.items.findIndex(item => item.id === itemId);
    if (index >= 0) {
      return this.items.splice(index, 1)[0];
    }
    return null;
  }

  findItem(predicate: (item: Item) => boolean): Item | undefined {
    return this.items.find(predicate);
  }

  getAvailableSpace(): number {
    return this.maxSize - this.items.length;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  isFull(): boolean {
    return this.items.length >= this.maxSize;
  }
}

// PlayerStash implementation (simplified for now)
class PlayerStashImpl implements PlayerStash {
  tabs: any[] = []; // TODO: Implement StashTab properly
  activeTab: number = 0;

  constructor() {
    makeObservable(this, {
      tabs: observable,
      activeTab: observable
    });
  }

  addItemToTab(_item: Item, _tabIndex: number): boolean {
    // TODO: Implement
    return false;
  }

  moveItemBetweenTabs(_itemId: string, _fromTab: number, _toTab: number): boolean {
    // TODO: Implement
    return false;
  }

  findItemInAllTabs(_itemId: string): { item: Item; tab: number; index: number } | null {
    // TODO: Implement
    return null;
  }

  searchItems(_query: string): { item: Item; tab: number; index: number }[] {
    // TODO: Implement
    return [];
  }
}

// Enemy class implementation
export class Enemy extends BaseEntity implements IEnemy {
  // Enemy type determines AI behavior
  enemyType: EnemyType;
  
  // AI and behavior
  aiPattern: EnemyAIPattern;
  currentIntent: EnemyIntent;
  
  // Loot and rewards
  lootTier: number;
  experienceReward: number;
  goldReward: [number, number];
  
  // Visual and theme
  spriteKey: string;
  animationSet: string;
  
  // Special properties
  isElite: boolean;
  isBoss: boolean;

  constructor(
    id: EntityId,
    name: string,
    enemyType: EnemyType,
    baseStats: BaseStats,
    aiPattern: EnemyAIPattern,
    lootTier: number = 1
  ) {
    super(id, name, baseStats);
    
    // Initialize fields first
    this.enemyType = enemyType;
    this.aiPattern = aiPattern;
    this.lootTier = lootTier;
    this.experienceReward = baseStats.level * 10; // Base calculation
    this.goldReward = [baseStats.level * 2, baseStats.level * 5];
    this.spriteKey = `enemy_${enemyType.toLowerCase()}`;
    this.animationSet = 'default';
    this.isElite = false;
    this.isBoss = false;
    
    // Initialize with a default "nothing" intent BEFORE makeObservable
    this.currentIntent = {
      action: 'nothing',
      iconPath: '',
      description: 'Deciding what to do...',
      isMultiTarget: false
    };
    
    // Then configure MobX
    makeObservable(this, {
      // Inherited fields from BaseEntity
      baseStats: observable,
      currentHealth: observable,
      currentMana: observable,
      currentEnergyShield: observable,
      rangeState: observable,
      initiative: observable,
      tempStatModifiers: observable,
      computedStats: computed,
      // Enemy-specific observables
      enemyType: observable,
      currentIntent: observable,
      lootTier: observable,
      experienceReward: observable,
      goldReward: observable,
      isElite: observable,
      isBoss: observable
    });
  }

  selectIntent(targets: IEntity[] = []): EnemyIntent {
    // Enhanced AI decision-making based on combat context
    const healthPercentage = this.currentHealth / this.baseStats.maxHealth;
    const player = targets.find(t => 'inventory' in t); // Find player target
    
    // Determine action based on AI pattern and current situation
    let selectedAction: EnemyIntent['action'] = 'attack'; // Default
    let targetId: string | undefined;
    let estimatedDamage: [number, number] = [0, 0];
    let description = 'Chooses an action';
    let iconPath = '/assets/ui/icons/sword.png';
    let additionalEffects: string[] = [];
    
    // 1. Check if enemy should retreat/defend (low health)
    if (healthPercentage <= this.aiPattern.retreatThreshold) {
      if (!this.aiPattern.avoidsBlocking && Math.random() < 0.7) {
        selectedAction = 'defend';
        description = `${this.name} raises guard defensively`;
        iconPath = '/assets/ui/icons/shield.png';
      }
    }
    
    // 2. Check for ability usage
    else if (Math.random() < this.aiPattern.abilityUsageFrequency) {
      // TODO: Select from available abilities
      // For now, simulate with basic ability
      if (this.enemyType === EnemyType.MAGIC || this.enemyType === EnemyType.RANGED) {
        selectedAction = 'ability';
        description = `${this.name} prepares a special ability`;
        iconPath = '/assets/ui/icons/magic.png';
        estimatedDamage = [
          Math.floor(this.computedStats.damage * 1.2),
          Math.floor(this.computedStats.damage * 1.8)
        ];
        additionalEffects = ['May apply status effect'];
      }
    }
    
    // 3. Regular attack decision
    else {
      selectedAction = 'attack';
      
      // Select target based on AI intelligence
      if (player && this.aiPattern.focusesWeakest) {
        targetId = player.id;
        
        // Calculate estimated damage against player
        const playerArmor = (player as any).computedStats?.armor || 0;
        const baseDamage = this.computedStats.damage;
        const minDamage = Math.max(1, baseDamage - playerArmor);
        const maxDamage = Math.max(1, Math.floor(baseDamage * 1.5) - playerArmor);
        
        estimatedDamage = [minDamage, maxDamage];
        description = `${this.name} targets you for ${minDamage}-${maxDamage} damage`;
      } else if (targets.length > 0) {
        // Random target selection for less intelligent enemies
        const randomTarget = targets[Math.floor(Math.random() * targets.length)];
        targetId = randomTarget.id;
        
        const baseDamage = this.computedStats.damage;
        estimatedDamage = [
          Math.max(1, Math.floor(baseDamage * 0.8)),
          Math.max(1, Math.floor(baseDamage * 1.2))
        ];
        description = `${this.name} prepares to attack`;
      }
      
      iconPath = '/assets/ui/icons/sword.png';
    }
    
    // 4. Movement consideration for ranged enemies
    if (this.rangeState === RangeState.OUT_OF_RANGE && 
        (this.enemyType === EnemyType.MELEE || Math.random() < 0.3)) {
      selectedAction = 'move';
      description = `${this.name} moves to close distance`;
      iconPath = '/assets/ui/icons/move.png';
    }
    
    // Create the intent
    this.currentIntent = {
      action: selectedAction,
      targetId,
      estimatedDamage,
      damageType: this.enemyType === EnemyType.MAGIC ? 'Fire' : 'Physical',
      additionalEffects,
      iconPath,
      description,
      isMultiTarget: false // TODO: Implement multi-target abilities
    };
    
    return this.currentIntent;
  }

  executeIntent(_targets: IEntity[]): void {
    // TODO: Implement intent execution based on current intent
    switch (this.currentIntent.action) {
      case 'attack':
        // Execute attack logic
        break;
      case 'ability':
        // Execute ability logic
        break;
      case 'move':
        // Execute movement logic
        break;
      case 'defend':
        // Execute defense logic
        break;
      case 'nothing':
        // Do nothing this turn
        break;
    }
  }

  getTargetPriority(entities: IEntity[]): IEntity[] {
    return this.aiPattern.evaluateTargets(entities);
  }
}