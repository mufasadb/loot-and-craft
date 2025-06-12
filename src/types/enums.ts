// Core enumerations for the game system

// Item system
export enum ItemRarity {
  NORMAL = 'normal',     // White - No magical affixes
  MAGIC = 'magic',       // Blue - 1-2 affixes (1 prefix, 1 suffix)
  RARE = 'rare',         // Yellow - 3-6 affixes (up to 3 prefixes, 3 suffixes)
  UNIQUE = 'unique',     // Orange/Gold - Fixed, powerful affixes
  SET = 'set'            // Green - Set bonuses when multiple pieces worn
}

export enum ItemType {
  EQUIPMENT = 'equipment',
  WEAPON = 'weapon',
  ARMOR = 'armor',
  CRAFTING = 'crafting',
  KEY = 'key'
}

export enum EquipmentSlot {
  WEAPON = 'weapon',
  SHIELD = 'shield',
  HELMET = 'helmet',
  CHEST = 'chest',
  GLOVES = 'gloves',
  BOOTS = 'boots',
  AMULET = 'amulet',
  RING1 = 'ring1',
  RING2 = 'ring2'
}

export enum WeaponType {
  SWORD = 'sword',       // Standard melee attack
  AXE = 'axe',          // Melee attack, potential multi-target
  BOW = 'bow',          // Ranged attack, range advantage vs melee
  WAND = 'wand',        // Ranged magic, single target
  STAFF = 'staff'       // Ranged magic, potential area effect
}

export enum ArmorType {
  PLATE = 'plate',       // Physical armor, high mitigation
  MAIL = 'mail',        // Medium armor
  LEATHER = 'leather',   // Light armor, may offer dodge
  LIGHT = 'light',      // Light armor variant
  ROBES = 'robes',      // Magic armor, grants energy shield
  CIRCLET = 'circlet'   // Light head armor with magic properties
}

// Damage and effect types
export enum DamageType {
  PHYSICAL = 'physical',
  FIRE = 'fire',
  ICE = 'ice',
  LIGHTNING = 'lightning',
  DARK = 'dark'
}

export enum StatusEffectType {
  IGNITE = 'ignite',     // Fire DoT
  CHILL = 'chill',      // Ice slow
  FREEZE = 'freeze',    // Ice disable
  SHOCK = 'shock',      // Lightning vulnerability
  CURSE = 'curse'       // Dark debuff
}

// Affix system
export enum AffixType {
  PREFIX = 'prefix',
  SUFFIX = 'suffix'
}

export enum AffixTier {
  T1 = 1,  // Common, level 1+, weight 100
  T2 = 2,  // Level 10+, weight 80
  T3 = 3,  // Level 20+, weight 60
  T4 = 4,  // Level 30+, weight 40
  T5 = 5   // Rare, level 40+, weight 20
}

// Effect system
export enum EffectTrigger {
  CONTINUOUS = 'continuous',                    // Stat modifiers
  TURN_START = 'turn_start',
  TURN_END = 'turn_end',
  BEFORE_ATTACK = 'before_attack',
  ON_ATTACK = 'on_attack',
  AFTER_ATTACK = 'after_attack',
  BEFORE_DAMAGE_TAKEN = 'before_damage_taken',
  AFTER_DAMAGE_TAKEN = 'after_damage_taken',
  ON_KILL = 'on_kill',
  ON_DEATH = 'on_death',
  COMBAT_START = 'combat_start',
  COMBAT_END = 'combat_end'
}

export enum DurationUnit {
  TURNS = 'turns',
  ROUNDS = 'rounds',
  HITS = 'hits',
  PERMANENT = 'permanent'
}

// Combat system
export enum CombatState {
  INITIALIZING = 'initializing',
  ROLL_INITIATIVE = 'roll_initiative',
  PLAYER_TURN_START = 'player_turn_start',
  PLAYER_ACTION_SELECT = 'player_action_select',
  PLAYER_ACTION_RESOLVE = 'player_action_resolve',
  ENEMY_TURN_START = 'enemy_turn_start',
  ENEMY_INTENT = 'enemy_intent',
  ENEMY_ACTION_RESOLVE = 'enemy_action_resolve',
  BETWEEN_TURNS = 'between_turns',
  CHECK_VICTORY = 'check_victory',
  CHECK_DEFEAT = 'check_defeat',
  COMBAT_END = 'combat_end',
  LOOT_DISTRIBUTION = 'loot_distribution'
}

export enum RangeState {
  IN_RANGE = 'in_range',
  OUT_OF_RANGE = 'out_of_range'
}

export enum CombatAction {
  ATTACK = 'attack',
  BLOCK = 'block',
  TOGGLE_ABILITY = 'toggle_ability',
  MOVE = 'move',
  ESCAPE = 'escape'
}

export enum EnemyType {
  MELEE = 'melee',
  RANGED = 'ranged',
  MAGIC = 'magic'
}

// Crafting system
export enum CraftingOrbType {
  ESSENCE_OF_ENCHANTMENT = 'essence_of_enchantment',  // Normal -> Magic
  ESSENCE_OF_EMPOWERMENT = 'essence_of_empowerment',  // Normal -> Rare
  SHARD_OF_FLUX = 'shard_of_flux',                    // Reroll Magic affixes
  CRYSTAL_OF_CHAOS = 'crystal_of_chaos',              // Reroll Rare affixes
  RUNE_OF_ASCENSION = 'rune_of_ascension'             // Magic -> Rare, keep affixes
}

// Dungeon system
export enum DungeonTheme {
  RIVER = 'river',           // Starter zone
  CRYPT = 'crypt',
  CAVE = 'cave',
  FOREST = 'forest',
  VOLCANIC = 'volcanic',
  FROZEN = 'frozen'
}

// Starting classes (determines initial gear only)
export enum StartingClass {
  RANGER = 'ranger',    // Bow + leather armor
  KNIGHT = 'knight',    // Sword + plate armor
  MAGE = 'mage'        // Wand + robes
}