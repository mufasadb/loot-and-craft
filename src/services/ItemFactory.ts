// Item factory for procedural item generation with affixes

import {
  Item,
  BaseItem,
  Affix,
  ItemTemplate,
  ItemGenerationConfig
} from '../types/items';
import {
  ItemRarity,
  ItemType,
  EquipmentSlot,
  WeaponType,
  ArmorType,
  AffixType,
  AffixTier
} from '../types/enums';
import { BaseStats } from '../types/base';

// Default generation configuration
const DEFAULT_GENERATION_CONFIG: ItemGenerationConfig = {
  rarityWeights: {
    1: { [ItemRarity.NORMAL]: 100, [ItemRarity.MAGIC]: 25, [ItemRarity.RARE]: 5, [ItemRarity.UNIQUE]: 1, [ItemRarity.SET]: 1 },
    2: { [ItemRarity.NORMAL]: 80, [ItemRarity.MAGIC]: 35, [ItemRarity.RARE]: 10, [ItemRarity.UNIQUE]: 2, [ItemRarity.SET]: 2 },
    3: { [ItemRarity.NORMAL]: 60, [ItemRarity.MAGIC]: 45, [ItemRarity.RARE]: 15, [ItemRarity.UNIQUE]: 3, [ItemRarity.SET]: 3 },
    4: { [ItemRarity.NORMAL]: 40, [ItemRarity.MAGIC]: 55, [ItemRarity.RARE]: 25, [ItemRarity.UNIQUE]: 5, [ItemRarity.SET]: 5 },
    5: { [ItemRarity.NORMAL]: 20, [ItemRarity.MAGIC]: 60, [ItemRarity.RARE]: 35, [ItemRarity.UNIQUE]: 8, [ItemRarity.SET]: 8 }
  },
  affixCounts: {
    [ItemRarity.NORMAL]: { min: 0, max: 0, prefixMax: 0, suffixMax: 0 },
    [ItemRarity.MAGIC]: { min: 1, max: 2, prefixMax: 1, suffixMax: 1 },
    [ItemRarity.RARE]: { min: 3, max: 6, prefixMax: 3, suffixMax: 3 },
    [ItemRarity.UNIQUE]: { min: 4, max: 8, prefixMax: 4, suffixMax: 4 },
    [ItemRarity.SET]: { min: 2, max: 4, prefixMax: 2, suffixMax: 2 }
  },
  statScaling: {
    1: 1.0,
    2: 1.2,
    3: 1.5,
    4: 1.8,
    5: 2.2
  }
};

// Sample affix pool - this would normally be loaded from JSON
const SAMPLE_AFFIXES: Affix[] = [
  {
    id: 'increased_damage',
    name: 'of Damage',
    type: AffixType.SUFFIX,
    tier: AffixTier.T1,
    statModifiers: { damage: 5 },
    tags: ['damage', 'offense'],
    allowedItemTypes: [ItemType.WEAPON],
    allowedSlots: [EquipmentSlot.WEAPON],
    weight: 100,
    levelRequirement: 1,
    description: '+5 to damage'
  },
  {
    id: 'increased_health',
    name: 'of Vitality',
    type: AffixType.SUFFIX,
    tier: AffixTier.T1,
    statModifiers: { maxHealth: 10 },
    tags: ['health', 'defense'],
    allowedItemTypes: [ItemType.ARMOR],
    allowedSlots: [EquipmentSlot.CHEST, EquipmentSlot.HELMET],
    weight: 100,
    levelRequirement: 1,
    description: '+10 to maximum health'
  },
  {
    id: 'increased_armor',
    name: 'of Protection',
    type: AffixType.SUFFIX,
    tier: AffixTier.T1,
    statModifiers: { armor: 3 },
    tags: ['armor', 'defense'],
    allowedItemTypes: [ItemType.ARMOR],
    weight: 100,
    levelRequirement: 1,
    description: '+3 to armor'
  },
  {
    id: 'heavy_prefix',
    name: 'Heavy',
    type: AffixType.PREFIX,
    tier: AffixTier.T2,
    statModifiers: { damage: 8, maxHealth: 5 },
    tags: ['damage', 'health'],
    allowedItemTypes: [ItemType.WEAPON, ItemType.ARMOR],
    weight: 50,
    levelRequirement: 3,
    description: '+8 damage, +5 maximum health'
  },
  {
    id: 'sharp_prefix',
    name: 'Sharp',
    type: AffixType.PREFIX,
    tier: AffixTier.T1,
    statModifiers: { damage: 6, criticalChance: 0.05 },
    tags: ['damage', 'critical'],
    allowedItemTypes: [ItemType.WEAPON],
    allowedSlots: [EquipmentSlot.WEAPON],
    weight: 75,
    levelRequirement: 2,
    description: '+6 damage, +5% critical chance'
  }
];

// Sample item templates
const SAMPLE_TEMPLATES: ItemTemplate[] = [
  {
    id: 'iron_sword',
    name: 'Iron Sword',
    type: ItemType.WEAPON,
    rarity: ItemRarity.NORMAL,
    slot: EquipmentSlot.WEAPON,
    baseType: WeaponType.SWORD,
    inherentStats: { damage: 12, accuracy: 85 },
    grantedAbilities: ['basic_attack'],
    levelRequirement: 1,
    dropWeight: 100,
    minDungeonTier: 1,
    iconPath: 'items/weapons/iron_sword.png',
    description: 'A sturdy iron sword'
  },
  {
    id: 'leather_armor',
    name: 'Leather Armor',
    type: ItemType.ARMOR,
    rarity: ItemRarity.NORMAL,
    slot: EquipmentSlot.CHEST,
    baseType: ArmorType.LIGHT,
    inherentStats: { armor: 8, maxHealth: 15 },
    levelRequirement: 1,
    dropWeight: 100,
    minDungeonTier: 1,
    iconPath: 'items/armor/leather_chest.png',
    description: 'Basic leather protection'
  },
  {
    id: 'wooden_bow',
    name: 'Wooden Bow',
    type: ItemType.WEAPON,
    rarity: ItemRarity.NORMAL,
    slot: EquipmentSlot.WEAPON,
    baseType: WeaponType.BOW,
    inherentStats: { damage: 10, accuracy: 90, range: 2 },
    grantedAbilities: ['ranged_attack'],
    levelRequirement: 1,
    dropWeight: 80,
    minDungeonTier: 1,
    iconPath: 'items/weapons/wooden_bow.png',
    description: 'A simple wooden bow'
  }
];

export class ItemFactory {
  private affixPool: Affix[];
  private templates: ItemTemplate[];
  private config: ItemGenerationConfig;

  constructor(
    affixes?: Affix[],
    templates?: ItemTemplate[],
    config?: ItemGenerationConfig
  ) {
    this.affixPool = affixes || SAMPLE_AFFIXES;
    this.templates = templates || SAMPLE_TEMPLATES;
    this.config = config || DEFAULT_GENERATION_CONFIG;
  }

  // Generate a random item for a given dungeon tier
  generateRandomItem(dungeonTier: number): Item {
    // Select rarity based on tier weights
    const rarity = this.selectRarity(dungeonTier);
    
    // Select a random template appropriate for this tier
    const availableTemplates = this.templates.filter(
      template => template.minDungeonTier <= dungeonTier
    );
    
    if (availableTemplates.length === 0) {
      throw new Error(`No templates available for dungeon tier ${dungeonTier}`);
    }
    
    const template = this.weightedRandomSelect(availableTemplates, t => t.dropWeight);
    
    return this.generateItemFromTemplate(template, rarity, dungeonTier);
  }

  // Generate item from specific template
  generateItemFromTemplate(
    template: ItemTemplate,
    rarity?: ItemRarity,
    dungeonTier: number = 1
  ): Item {
    const itemRarity = rarity || template.rarity;
    const itemLevel = dungeonTier;
    
    // Create base item
    const baseItem: BaseItem = {
      id: `${template.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: template.name,
      type: template.type,
      rarity: itemRarity,
      level: itemLevel,
      iconPath: template.iconPath,
      description: template.description
    };

    // Create item with type-specific data
    const item: Item = {
      ...baseItem,
      affixes: [],
      stackSize: 1,
      maxStackSize: template.type === ItemType.CRAFTING ? 99 : 1,
      isEquipped: false,
      itemLevel,
      generationSeed: baseItem.id
    };

    // Add equipment data if applicable
    if (template.slot && template.baseType && template.inherentStats) {
      const scaledStats = this.scaleStats(template.inherentStats, dungeonTier);
      
      item.equipment = {
        slot: template.slot,
        baseType: template.baseType,
        inherentStats: scaledStats,
        grantedAbilities: template.grantedAbilities || [],
        levelRequirement: template.levelRequirement
      };
    }

    // Generate affixes based on rarity
    if (itemRarity !== ItemRarity.NORMAL) {
      item.affixes = this.generateAffixes(item, itemRarity, dungeonTier);
      
      // Update item name with affix names
      item.name = this.buildItemName(template.name, item.affixes);
    }

    return item;
  }

  // Generate a specific type of item
  generateWeapon(weaponType: WeaponType, dungeonTier: number): Item {
    const weaponTemplates = this.templates.filter(
      t => t.type === ItemType.WEAPON && t.baseType === weaponType
    );
    
    if (weaponTemplates.length === 0) {
      throw new Error(`No templates found for weapon type ${weaponType}`);
    }
    
    const template = this.weightedRandomSelect(weaponTemplates, t => t.dropWeight);
    const rarity = this.selectRarity(dungeonTier);
    
    return this.generateItemFromTemplate(template, rarity, dungeonTier);
  }

  generateArmor(armorSlot: EquipmentSlot, dungeonTier: number): Item {
    const armorTemplates = this.templates.filter(
      t => t.type === ItemType.ARMOR && t.slot === armorSlot
    );
    
    if (armorTemplates.length === 0) {
      throw new Error(`No templates found for armor slot ${armorSlot}`);
    }
    
    const template = this.weightedRandomSelect(armorTemplates, t => t.dropWeight);
    const rarity = this.selectRarity(dungeonTier);
    
    return this.generateItemFromTemplate(template, rarity, dungeonTier);
  }

  // Generate crafting materials
  generateCraftingMaterial(materialType: string, quantity: number = 1): Item {
    return {
      id: `crafting_${materialType}_${Date.now()}`,
      name: this.getCraftingMaterialName(materialType),
      type: ItemType.CRAFTING,
      rarity: ItemRarity.NORMAL,
      level: 1,
      iconPath: `items/crafting/${materialType}.png`,
      affixes: [],
      stackSize: quantity,
      maxStackSize: 99,
      isEquipped: false,
      itemLevel: 1,
      crafting: {
        materialType,
        stackSize: quantity,
        usageDescription: this.getCraftingUsageDescription(materialType)
      }
    };
  }

  // Generate dungeon key
  generateDungeonKey(tier: number, theme: string = 'generic'): Item {
    return {
      id: `key_${theme}_t${tier}_${Date.now()}`,
      name: `${theme.charAt(0).toUpperCase() + theme.slice(1)} Key (T${tier})`,
      type: ItemType.KEY,
      rarity: ItemRarity.NORMAL,
      level: tier,
      iconPath: `items/keys/${theme}_key_t${tier}.png`,
      affixes: [],
      stackSize: 1,
      maxStackSize: 10,
      isEquipped: false,
      itemLevel: tier,
      key: {
        tier,
        theme,
        modifiers: [], // Could add random modifiers here
        usesRemaining: 1
      }
    };
  }

  // Private helper methods
  private selectRarity(dungeonTier: number): ItemRarity {
    const weights = this.config.rarityWeights[dungeonTier] || this.config.rarityWeights[1];
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    const randomValue = Math.random() * totalWeight;
    
    let currentWeight = 0;
    for (const [rarity, weight] of Object.entries(weights)) {
      currentWeight += weight;
      if (randomValue <= currentWeight) {
        return rarity as ItemRarity;
      }
    }
    
    return ItemRarity.NORMAL; // Fallback
  }

  private generateAffixes(item: Item, rarity: ItemRarity, dungeonTier: number): Affix[] {
    const affixConfig = this.config.affixCounts[rarity];
    const affixCount = Math.floor(
      Math.random() * (affixConfig.max - affixConfig.min + 1)
    ) + affixConfig.min;
    
    const availableAffixes = this.affixPool.filter(affix => 
      affix.levelRequirement <= dungeonTier &&
      affix.allowedItemTypes.includes(item.type) &&
      (!affix.allowedSlots || !item.equipment || affix.allowedSlots.includes(item.equipment.slot))
    );
    
    const selectedAffixes: Affix[] = [];
    const usedAffixIds = new Set<string>();
    
    for (let i = 0; i < affixCount && selectedAffixes.length < affixCount; i++) {
      const eligibleAffixes = availableAffixes.filter(affix => 
        !usedAffixIds.has(affix.id)
      );
      
      if (eligibleAffixes.length === 0) break;
      
      const selectedAffix = this.weightedRandomSelect(eligibleAffixes, a => a.weight);
      selectedAffixes.push(selectedAffix);
      usedAffixIds.add(selectedAffix.id);
    }
    
    return selectedAffixes;
  }

  private scaleStats(baseStats: Partial<BaseStats>, dungeonTier: number): Partial<BaseStats> {
    const scalingFactor = this.config.statScaling[dungeonTier] || 1.0;
    const scaledStats: Partial<BaseStats> = {};
    
    Object.entries(baseStats).forEach(([key, value]) => {
      if (typeof value === 'number') {
        (scaledStats as any)[key] = Math.floor(value * scalingFactor);
      }
    });
    
    return scaledStats;
  }

  private buildItemName(baseName: string, affixes: Affix[]): string {
    const prefixes = affixes.filter(a => a.type === AffixType.PREFIX);
    const suffixes = affixes.filter(a => a.type === AffixType.SUFFIX);
    
    let name = baseName;
    
    if (prefixes.length > 0) {
      const prefixName = prefixes[0].name; // Use first prefix
      name = `${prefixName} ${name}`;
    }
    
    if (suffixes.length > 0) {
      const suffixName = suffixes[0].name; // Use first suffix
      name = `${name} ${suffixName}`;
    }
    
    return name;
  }

  private weightedRandomSelect<T>(items: T[], weightFn: (item: T) => number): T {
    const totalWeight = items.reduce((sum, item) => sum + weightFn(item), 0);
    const randomValue = Math.random() * totalWeight;
    
    let currentWeight = 0;
    for (const item of items) {
      currentWeight += weightFn(item);
      if (randomValue <= currentWeight) {
        return item;
      }
    }
    
    return items[items.length - 1]; // Fallback to last item
  }

  private getCraftingMaterialName(materialType: string): string {
    const names: { [key: string]: string } = {
      'transmutation_orb': 'Transmutation Orb',
      'alteration_orb': 'Alteration Orb',
      'alchemy_orb': 'Alchemy Orb',
      'chaos_orb': 'Chaos Orb',
      'exalted_orb': 'Exalted Orb',
      'iron_shard': 'Iron Shard',
      'magic_essence': 'Magic Essence'
    };
    
    return names[materialType] || materialType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private getCraftingUsageDescription(materialType: string): string {
    const descriptions: { [key: string]: string } = {
      'transmutation_orb': 'Upgrades Normal item to Magic',
      'alteration_orb': 'Rerolls Magic item affixes',
      'alchemy_orb': 'Upgrades Magic item to Rare',
      'chaos_orb': 'Rerolls Rare item affixes',
      'exalted_orb': 'Adds an affix to Rare item',
      'iron_shard': 'Basic crafting material',
      'magic_essence': 'Infuses items with magical properties'
    };
    
    return descriptions[materialType] || 'Crafting material';
  }

  // Public utility methods
  addAffixToPool(affix: Affix): void {
    this.affixPool.push(affix);
  }

  addTemplate(template: ItemTemplate): void {
    this.templates.push(template);
  }

  getAffixPool(): Affix[] {
    return [...this.affixPool];
  }

  getTemplates(): ItemTemplate[] {
    return [...this.templates];
  }
}