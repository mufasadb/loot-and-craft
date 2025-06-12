// Crafting system types - orbs, materials, and transformation rules

import { CraftingOrbType, ItemRarity, AffixTier } from './enums';
import { Item, Affix } from './items';

// Crafting orb definitions
export interface CraftingOrb {
  id: string;
  name: string;
  type: CraftingOrbType;
  description: string;
  
  // Usage rules
  validTargetRarities: ItemRarity[];
  validTargetTypes: string[];  // 'equipment', 'key', etc.
  
  // Transformation rules
  transformationRules: CraftingTransformation;
  
  // Visual
  iconPath: string;
  
  // Rarity and acquisition
  dropWeight: number;
  minDungeonTier: number;
}

// Transformation rules for each orb type
export interface CraftingTransformation {
  // Input requirements
  requiresRarity: ItemRarity;
  
  // Output specifications  
  resultRarity: ItemRarity;
  preserveAffixes: boolean;
  
  // Affix generation rules
  affixGeneration?: {
    minAffixes: number;
    maxAffixes: number;
    preferredTiers?: AffixTier[];
    bannedAffixes?: string[];
    guaranteedAffixes?: string[];
  };
  
  // Special rules
  rerollAllAffixes?: boolean;
  addRandomAffixes?: number;
  removeRandomAffixes?: number;
  
  // Success/failure mechanics
  successChance: number;       // 0-1, chance of success
  failureConsequences?: {
    destroyItem?: boolean;
    lowerRarity?: boolean;
    removeRandomAffix?: boolean;
  };
}

// Specific orb implementations (per GDD)
export interface EssenceOfEnchantment extends CraftingOrb {
  type: CraftingOrbType.ESSENCE_OF_ENCHANTMENT;
  transformationRules: {
    requiresRarity: ItemRarity.NORMAL;
    resultRarity: ItemRarity.MAGIC;
    preserveAffixes: false;
    affixGeneration: {
      minAffixes: 1;
      maxAffixes: 2;
    };
    successChance: 1.0; // Always succeeds
  };
}

export interface EssenceOfEmpowerment extends CraftingOrb {
  type: CraftingOrbType.ESSENCE_OF_EMPOWERMENT;
  transformationRules: {
    requiresRarity: ItemRarity.NORMAL;
    resultRarity: ItemRarity.RARE;
    preserveAffixes: false;
    affixGeneration: {
      minAffixes: 3;
      maxAffixes: 4;
    };
    successChance: 1.0;
  };
}

export interface ShardOfFlux extends CraftingOrb {
  type: CraftingOrbType.SHARD_OF_FLUX;
  transformationRules: {
    requiresRarity: ItemRarity.MAGIC;
    resultRarity: ItemRarity.MAGIC;
    preserveAffixes: false;
    rerollAllAffixes: true;
    successChance: 1.0;
  };
}

export interface CrystalOfChaos extends CraftingOrb {
  type: CraftingOrbType.CRYSTAL_OF_CHAOS;
  transformationRules: {
    requiresRarity: ItemRarity.RARE;
    resultRarity: ItemRarity.RARE;
    preserveAffixes: false;
    rerollAllAffixes: true;
    successChance: 1.0;
  };
}

export interface RuneOfAscension extends CraftingOrb {
  type: CraftingOrbType.RUNE_OF_ASCENSION;
  transformationRules: {
    requiresRarity: ItemRarity.MAGIC;
    resultRarity: ItemRarity.RARE;
    preserveAffixes: true;
    addRandomAffixes: 2; // Add 1-2 more affixes
    successChance: 1.0;
  };
}

// Crafting interface state
export interface CraftingInterface {
  // Input slots
  baseItemSlot?: Item;
  craftingOrbSlot?: CraftingOrb;
  
  // Output preview
  resultPreview?: CraftingResultPreview;
  
  // Validation
  isValidCombination: boolean;
  validationErrors: string[];
  
  // State
  isCrafting: boolean;
  canCraft: boolean;
}

// Preview of crafting result
export interface CraftingResultPreview {
  // Deterministic results
  guaranteedRarity?: ItemRarity;
  guaranteedAffixes?: Affix[];
  
  // Possible outcomes for random results
  possibleOutcomes: CraftingOutcome[];
  
  // Warnings
  warnings: string[]; // e.g., "This will destroy your item if it fails"
  destructive: boolean; // Whether this could destroy the item
}

export interface CraftingOutcome {
  probability: number;
  resultRarity: ItemRarity;
  affixCount: [number, number]; // min, max
  description: string;
}

// Actual crafting result
export interface CraftingResult {
  success: boolean;
  resultItem?: Item;
  consumedMaterials: string[]; // IDs of consumed items
  
  // For display
  resultMessage: string;
  showAnimation: boolean;
  
  // Failure details if applicable
  failureReason?: string;
  itemDestroyed?: boolean;
}

// Disenchanting system (breaking items for materials)
export interface DisenchantingInterface {
  targetItem?: Item;
  expectedMaterials: MaterialReward[];
  
  canDisenchant: boolean;
  validationErrors: string[];
}

export interface MaterialReward {
  materialType: string;
  quantity: [number, number]; // min, max
  probability: number;
}

// Disenchanting rules based on item rarity and level
export interface DisenchantingRules {
  [rarity: string]: {
    baseShards: number;
    levelScaling: number;
    bonusMaterials?: {
      materialType: string;
      chance: number;
      quantity: [number, number];
    }[];
  };
}

// Meta-crafting system (advanced orbs from specific content)
export interface MetaCraftingOrb extends CraftingOrb {
  // Special acquisition requirements
  sourceContent: string; // 'delve', 'boss:fire_lord', etc.
  isMetaCrafting: true;
  
  // Advanced transformation rules
  targetSpecificAffixes?: {
    removeAffixesWithTags?: string[];
    addAffixesWithTags?: string[];
    rerollAffixesWithTags?: string[];
  };
  
  // Tag-based targeting (per GDD)
  affixTagTargeting: {
    targetTags: string[]; // e.g., ['fire', 'elemental']
    operation: 'remove' | 'add' | 'reroll' | 'upgrade';
  };
}

// Key crafting system (modifying dungeon keys)
export interface KeyCraftingInterface {
  targetKey?: Item; // Key to modify
  modifierOrb?: CraftingOrb;
  
  availableModifiers: KeyModifierOption[];
  selectedModifiers: string[];
  
  difficultyIncrease: number;
  rewardIncrease: number;
  
  canCraft: boolean;
  validationErrors: string[];
}

export interface KeyModifierOption {
  id: string;
  name: string;
  description: string;
  
  // Effects on dungeon
  difficultyModifier: number;
  rewardModifier: number;
  
  // Requirements
  requiredOrbType?: CraftingOrbType;
  minKeyTier: number;
  
  // Incompatible with other modifiers
  conflicts?: string[];
}

// Crafting manager handles all crafting operations
export interface CraftingManager {
  // Basic crafting
  validateCombination(baseItem: Item, orb: CraftingOrb): boolean;
  previewResult(baseItem: Item, orb: CraftingOrb): CraftingResultPreview;
  executeCrafting(baseItem: Item, orb: CraftingOrb): CraftingResult;
  
  // Disenchanting
  validateDisenchant(item: Item): boolean;
  previewDisenchant(item: Item): MaterialReward[];
  executeDisenchant(item: Item): MaterialReward[];
  
  // Key modification
  validateKeyModification(key: Item, modifier: string): boolean;
  previewKeyModification(key: Item, modifier: string): Item;
  executeKeyModification(key: Item, modifier: string): Item;
  
  // Meta-crafting
  validateMetaCrafting(item: Item, metaOrb: MetaCraftingOrb): boolean;
  executeMetaCrafting(item: Item, metaOrb: MetaCraftingOrb): CraftingResult;
}

// Crafting recipes for complex multi-step crafting (future expansion)
export interface CraftingRecipe {
  id: string;
  name: string;
  description: string;
  
  // Input requirements
  ingredients: {
    itemId?: string;
    itemType?: string;
    rarity?: ItemRarity;
    quantity: number;
  }[];
  
  // Output
  result: {
    itemTemplate: string;
    rarity: ItemRarity;
    guaranteedAffixes?: string[];
  };
  
  // Requirements
  requiredCraftingLevel?: number;
  unlockConditions?: string[];
  
  // Discovery
  isDiscovered: boolean;
  discoveryHints?: string[];
}