// Item system types - equipment, affixes, and item generation

import { 
  ItemRarity, ItemType, EquipmentSlot, WeaponType, ArmorType, 
  AffixType, AffixTier, DamageType 
} from './enums';
import { BaseStats, EntityId } from './base';

// Base item interface
export interface BaseItem {
  id: string;
  name: string;
  type: ItemType;
  rarity: ItemRarity;
  level: number;
  iconPath: string;
  description?: string;
}

// Affix definition - magical properties on items
export interface Affix {
  id: string;
  name: string;
  type: AffixType;
  tier: AffixTier;
  
  // What the affix does
  statModifiers: Partial<BaseStats>;
  
  // Crafting and generation rules
  tags: string[];                    // For meta-crafting targeting
  allowedItemTypes: ItemType[];      // What items can have this affix
  allowedSlots?: EquipmentSlot[];    // Specific slots if equipment
  weight: number;                    // Rarity weight for generation
  levelRequirement: number;          // Minimum dungeon/monster level
  
  // Display
  description: string;               // Human-readable effect
}

// Equipment-specific data
export interface EquipmentData {
  slot: EquipmentSlot;
  
  // Base type determines inherent properties
  baseType: WeaponType | ArmorType | string;
  
  // Inherent stats from base type (always present)
  inherentStats: Partial<BaseStats>;
  
  // Granted abilities (especially weapons)
  grantedAbilities: string[];        // Ability IDs
  
  // Requirements
  levelRequirement?: number;
  statRequirements?: Partial<BaseStats>;
}

// Crafting material data
export interface CraftingData {
  materialType: string;              // 'orb', 'shard', 'essence', etc.
  stackSize: number;
  usageDescription: string;
}

// Key data for dungeon access
export interface KeyData {
  tier: number;
  theme: string;                     // Dungeon theme this key opens
  modifiers: KeyModifier[];          // Applied modifications
  usesRemaining: number;             // Usually 1, but could be more
}

// Key modifiers that affect dungeon difficulty/rewards
export interface KeyModifier {
  id: string;
  name: string;
  description: string;
  effects: {
    enemyHealthMultiplier?: number;
    enemyDamageMultiplier?: number;
    extraEnemyPacks?: number;
    bossChanceIncrease?: number;
    lootTierBonus?: number;
    lootQuantityMultiplier?: number;
    experienceMultiplier?: number;
  };
}

// Complete item definition
export interface Item extends BaseItem {
  // Type-specific data
  equipment?: EquipmentData;
  crafting?: CraftingData;
  key?: KeyData;
  
  // Magical properties (only for Magic/Rare/Unique/Set)
  affixes: Affix[];
  
  // Item state
  stackSize: number;                 // Current stack size
  maxStackSize: number;              // Maximum allowed stack
  isEquipped: boolean;
  equippedBy?: EntityId;
  
  // Unique/Set specific
  uniqueId?: string;                 // For unique items
  setId?: string;                    // For set items
  
  // Generation metadata
  itemLevel: number;                 // Level when generated
  generationSeed?: string;           // For deterministic generation
}

// Item generation templates
export interface ItemTemplate {
  id: string;
  name: string;
  type: ItemType;
  rarity: ItemRarity;
  
  // Equipment specifics
  slot?: EquipmentSlot;
  baseType?: WeaponType | ArmorType | string;
  inherentStats?: Partial<BaseStats>;
  grantedAbilities?: string[];
  
  // Affix constraints for generation
  guaranteedAffixes?: string[];      // Always has these affixes
  bannedAffixes?: string[];          // Never has these affixes
  affixTags?: string[];              // Prefers affixes with these tags
  
  // Requirements and constraints
  levelRequirement?: number;
  dropWeight: number;                // How common this template is
  minDungeonTier: number;           // Earliest tier this can drop
  
  // Visual
  iconPath: string;
  description?: string;
}

// Set item bonuses
export interface SetBonus {
  setId: string;
  setName: string;
  pieceCount: number;                // How many pieces needed
  bonuses: {
    2?: Partial<BaseStats>;          // 2-piece bonus
    3?: Partial<BaseStats>;          // 3-piece bonus
    4?: Partial<BaseStats>;          // 4-piece bonus
    5?: Partial<BaseStats>;          // 5-piece bonus
  };
  specialEffects?: {
    2?: string[];                    // Special ability IDs
    3?: string[];
    4?: string[];
    5?: string[];
  };
}

// Unique item definition
export interface UniqueItem extends ItemTemplate {
  rarity: ItemRarity.UNIQUE;
  fixedAffixes: Affix[];             // Exactly these affixes, always
  drawbacks?: Affix[];               // Negative effects for balance
  loreText?: string;                 // Flavor text
  isDropOnly: boolean;               // Cannot be crafted
}

// Item factory configuration for procedural generation
export interface ItemGenerationConfig {
  // Rarity weights by dungeon tier
  rarityWeights: {
    [tier: number]: {
      [rarity in ItemRarity]: number;
    };
  };
  
  // Affix count ranges by rarity
  affixCounts: {
    [rarity in ItemRarity]: {
      min: number;
      max: number;
      prefixMax: number;
      suffixMax: number;
    };
  };
  
  // Level scaling
  statScaling: {
    [tier: number]: number;          // Multiplier for base stats
  };
}

// Item comparison result for UI
export interface ItemComparison {
  item1: Item;
  item2: Item;
  differences: {
    stat: keyof BaseStats;
    item1Value: number;
    item2Value: number;
    difference: number;
    percentChange: number;
  }[];
  recommendation: 'upgrade' | 'downgrade' | 'sidegrade' | 'unknown';
}