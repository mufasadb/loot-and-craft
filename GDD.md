# **Game Design Document: Project Loot & Craft (Working Title)**

## **1\. Introduction**

* **Logline/Elevator Pitch:** An accessible yet deep loot-driven RPG where strategic crafting, item-based abilities, and varied endgame challenges fuel endless character progression, with future idle mechanics.  
* **Genre:** Loot-based RPG (ARPG-lite), Turn-based Combat, Crafting Game, with Idle RPG elements.  
* **Target Audience:** Players who enjoy theory-crafting, deep itemization (like in Path of Exile), strategic combat, and the satisfaction of incremental progress found in idle/looter games (like Melvor Idle & Mega Loot).  
* **Core Pillars:**  
  * **Deep & Rewarding Crafting:** Crafting is not just a gold sink but a core progression path, allowing meaningful modification and creation of powerful items.  
  * **Loot That Matters:** Items are the primary driver of power and abilities, encouraging experimentation and diverse builds. Every drop has potential.  
  * **Strategic Turn-Based Combat:** Simple to learn, but with depth arising from enemy mechanics, item abilities, and resource management.  
  * **Varied Endgame Content:** Multiple game modes that incentivize different builds and strategies, extending replayability.  
  * **Player-Driven Progression:** Minimal hand-holding; progression is about understanding game systems and making smart choices about gear and crafting.

## **2\. Gameplay Mechanics**

### **2.1. Core Gameplay Loop**

1. **Acquire Key/Enter Dungeon:** Players obtain dungeon keys (or access free starter zones).  
2. **Dungeon Run:** Engage in a series of turn-based encounters (approx. 5-10 fights, bosses are 1-1). Manage limited backpack inventory.  
3. **Collect Loot & Resources:** Defeat enemies to gain gear, crafting materials, and potentially new keys.  
4. **Return to Town:**  
   * Manage Stash: Store valuable items and materials.  
   * Craft & Upgrade: Use collected resources to improve gear or craft new items.  
   * Analyze Loot: Break down unwanted items for materials.  
   * Equip & Prepare: Optimize gear loadouts for the next challenge.  
5. **Tackle Harder Content:** Use improved gear and new keys to take on more difficult dungeons for better rewards.

### **2.2. Combat System**

* **Format:** Turn-based, Player vs. up to 5 enemies.  
* **Player Actions:**  
  * **Attack:** Select a target and perform a basic attack determined by the equipped weapon.  
  * **Block:** Doubles current armor value and reduces incoming damage by 25% for the turn.  
  * **Toggle Abilities:** Activate/deactivate mana-costing abilities granted by items.  
* **Player Representation:** Abstract; no on-screen player character. Focus is on items and stats.  
* **Enemy AI:**  
  * Enemies use the same stat system and tools as the player.  
  * Attacks are telegraphed, allowing players to react strategically.  
  * Variety: Melee, Ranged, Magic-users with different attack patterns, resistances, and abilities (e.g., heals, buffs).  
* **Range Mechanic:**  
  * Abstract states: "In Range" or "Out of Range."  
  * One turn is required to change range state (e.g., melee closing distance).  
  * Ranged vs. Ranged: Both start "In Range."  
  * Bow User Advantage: If a bow user faces a melee enemy, the enemy uses its first turn to "close in," effectively giving the bow user a free first turn of action (unless the bow user also moves).  
* **Targeting:** Player selects an enemy target for attacks and abilities.  
* **Multi-Attack:** Some weapon types or abilities may allow attacking multiple targets.

### **2.3. Itemization**

* **Item-Driven Abilities:** Primary source of player abilities and combat options are from equipped items, especially weapons. Some armor pieces may also grant abilities (e.g., "Cast Ice Armor").  
* **Item Slots (Example):** Weapon, Shield (optional), Helmet, Chest, Gloves, Boots, Amulet, 2x Rings. (To be finalized)  
* **Base Item Types:**  
  * Each slot has various base types (e.g., Iron Sword, Shadow Wand, Leather Gloves).  
  * Base types have inherent properties (e.g., damage range for weapons, armor value for armor, implicit affixes).  
  * Example Inherent Properties:  
    * **Magic Armor (e.g., Robes, Circlets):** Grants a small Energy Shield.  
    * **Physical Armor (e.g., Plate, Helms):** Provides base physical damage mitigation.  
    * **Range-Focused Gear (e.g., Leather, Hoods):** May offer base Dodge chance.  
    * **Swords:** Standard melee attack.  
    * **Axes:** Melee attack, potentially with wider swing hitting adjacent targets.  
    * **Bows:** Ranged attack, grants "Out of Range" start vs. melee. Lower base damage than equivalent tier melee, but potential for first-turn advantage.  
    * **Wands/Staves:** Ranged magic attacks, can be single target or spread.  
* **Item Rarity:**  
  * Normal (White) \- No magical affixes.  
  * Magic (Blue) \- 1-2 affixes (1 prefix, 1 suffix).  
  * Rare (Yellow) \- 3-6 affixes (up to 3 prefixes, 3 suffixes).  
  * Unique (Orange/Gold) \- Fixed, powerful, often build-defining affixes with thematic names. Often have significant boons *and* drawbacks. Drop-only, cannot be crafted or altered by standard crafting.  
  * Set (Green) \- Items that grant additional powerful bonuses when multiple pieces of the same set are worn (e.g., 2-piece, 3-piece, 5-piece bonuses). Drop-only, cannot be crafted or altered.  
* **Affixes:**  
  * Magical properties that enhance items.  
  * **Prefixes & Suffixes:** Distinct pools of mods.  
    * **Prefixes:** Focus on primary offensive and defensive stats (e.g., +HP, +Attack, +Elemental Damage, +Armor, +Energy Shield)
    * **Suffixes:** Focus on resistances, utility, and secondary stats (e.g., Resistances, Dodge, Block, Critical Stats, Speed, Regeneration)
    * **Magic Items:** Can have 1 prefix and 1 suffix maximum
    * **Rare Items:** Can have up to 3 prefixes and 3 suffixes (6 total affixes)
  * **Tiered Affixes:** Affixes have multiple tiers (T1 to T5 currently). Higher tiers are rarer and more powerful.
    * **T1:** Common tier, available from level 1, weight 100
    * **T2:** Available from level 10+, weight 80
    * **T3:** Available from level 20+, weight 60
    * **T4:** Available from level 30+, weight 40
    * **T5:** Rare tier, available from level 40+, weight 20
  * **Level Requirements:** Higher tier affixes and base items can only drop in higher-level dungeons/from higher-level monsters.  
  * **Affix Tags:** Affixes are tagged with categories to allow for targeted meta-crafting:
    * **Damage Tags:** "physical", "fire", "lightning", "ice", "dark", "elemental", "damage", "attack"
    * **Defense Tags:** "defensive", "life", "resistance", "block", "dodge"
    * **Utility Tags:** "mana", "caster", "speed", "utility", "critical"
  * **Stat Types:**
    * **Flat Stats:** Direct numerical bonuses (e.g., +25 HP, +10 Attack)
    * **Percentage Stats:** Multiplicative bonuses (e.g., +15% Fire Resistance, +20% Critical Chance)
    * **Special Stats:** allRes (all resistances), hpRegen, mpRegen  
* **Backpack Inventory:** Limited size during dungeon runs (e.g., 10-20 slots).  
* **Stash Inventory:** Larger storage in town, potentially expandable.

### **2.4. Crafting System**

* **Core Principle:** Transform common loot into powerful gear through a multi-layered system.  
* **Materials:**  
  * **Item Shards/Essences:** Obtained by breaking down (deconstructing) magic and rare items. Different rarities of items yield different quality/types of shards.  
  * **Crafting Consumables:** Found as loot. Each has a specific function.  
    * *Basic Crafting Essences & Shards:*  
      * **Essence of Enchantment:** Imbues a normal (white) item with magical properties, transforming it to magic (blue) with 1-2 random affixes
      * **Essence of Empowerment:** Transforms a normal (white) item directly into a powerful rare (yellow), adding 3-4 random affixes
      * **Shard of Flux:** Destabilizes and reshapes the magical properties of a magic item, rerolling all affixes while preserving rarity
      * **Crystal of Chaos:** Violently restructures a rare item's essence, rerolling all affixes while preserving rarity
      * **Rune of Ascension:** Elevates a magic item to rare status, keeping existing affixes and adding 1-2 more  
  * **Elemental/Thematic Fragments:** Tiered fragments (e.g., Fire, Ice, Dark) used in specific crafting recipes or meta-crafting.  
* **Deconstruction:** Breaking down unwanted items for crafting materials.  
* **Meta-Crafting:** Advanced crafting options, often using rarer orbs obtained from specific content:  
  * Example: "Orb of Suffix Scouring" (removes suffixes, keeps prefixes) \- from Delve.  
  * Example: "Orb of Elemental Infusion (Fire)" (removes a random non-fire mod, adds a random fire mod, using Fire Tag) \- from specific bosses.  
* **No Crafting of Uniques/Sets:** These items are drop-only to maintain their prestige.

### **2.5. Character Progression & Stats**

* **Gear-Driven:** All character power comes from equipped items. No direct player stat allocation on level-up (no traditional leveling system beyond what gear enables).  
* **Initial "Class" Choice:** Determines starting gear only (e.g., Ranger starts with a bow and basic leather armor). Does not confer permanent passive bonuses.  
* **Gear Loadouts:** Players can save and switch between up to 3 distinct gear sets in town (instant switch).  
* **Core Player Stats (derived from gear):**  
  * **Health (HP):** Total damage capacity.  
  * **Mana (MP):** Resource for item-activated abilities. Regenerates over time or via item stats/potions.  
  * **Energy Shield (ES):** An additional layer of protection on top of HP, typically from magic-focused gear. Absorbs all damage types. Regenerates if not hit for 3 rounds (half of missing ES restored per regeneration tick).  
* **Defensive Stats:**  
  * **Armor:** Reduces incoming Physical damage by a percentage.  
  * **Elemental Resistances (Fire, Ice, Lightning, Dark):** Reduces incoming damage of the specific element by a percentage.  
  * **Dodge Chance:** Chance to avoid an incoming attack/damage instance entirely.  
  * **Block Chance/Effectiveness:** (If shields are implemented beyond the "Block" action).  
* **Offensive Stats:**  
  * **Damage (Physical, Fire, Ice, Lightning, Dark):** Base damage values and types, primarily from weapons.  
  * **Increased Damage (Specific Types/Overall):** Percentage increases to damage.  
  * **Attack Speed/Cast Speed:** Affects how often actions can be taken (if applicable in turn-based context, or for DoTs).  
  * **Critical Strike Chance:** Chance to deal a critical hit.  
  * **Critical Strike Multiplier:** Damage bonus applied on a critical hit.  
  * **Accuracy:** Chance to hit an enemy (vs. enemy dodge/evasion).  
  * **Status Effect Application:**  
    * **Ignite (Fire):** Fire damage over time.  
    * **Chill/Freeze (Ice):** Slows enemy actions / Prevents enemy actions.  
    * **Shock (Lightning):** Increases damage taken by the enemy.  
    * **Curse/Weaken (Dark):** Reduces enemy effectiveness (e.g., damage, defenses).  
    * (Specific mechanics of statuses TBD)  
* **Utility Stats:**  
  * **Movement Speed / Run Speed:** Affects success in "Delve-like" modes. May translate to more actions or better positioning in some abstract way.  
  * **Magic Find (MF):** Increases the rarity of items dropped.  
  * **Increased Item Quantity (IIQ):** Increases the number of items dropped.  
  * **Mana Regeneration:** Rate at which mana is restored.  
  * **Health Regeneration:** Rate at which health is restored.

### **2.6. "Key" System & Dungeon Progression**

* **Dungeon Access:** Dungeons (beyond starter areas) require "Keys."  
* **Key Tiers:** Keys have tiers (e.g., Tier 1, Tier 2, ... Tier X). Higher tiers are more difficult and offer better rewards/higher item level drops.  
* **Key Acquisition:**  
  * Starter keys might be from a repeatable low-level zone (e.g., "The River").  
  * Higher tier keys primarily drop from dungeons of the preceding tier (e.g., a Tier 2 key can drop in a Tier 1 dungeon).  
* **Key Crafting/Modification:** Players can use crafting materials to augment keys, making them harder but more rewarding (e.g., adding "Enemies have 20% increased health," "Area contains an extra pack of magic monsters," "Increased chance to find another key").  
* **Predictable Enemy Types:** Key types or dungeon areas will generally have predictable enemy types (e.g., a "Frozen Cave Key" will mostly feature ice-based enemies), allowing for strategic gear choices. Some random variation will exist.

### **2.7. Specific Game Modes**

* **"The River" (Starter Zone):** A farmable, no-key-required area where players can fight generic monsters to get initial gear and low-tier keys.  
* **Standard Dungeons:** Accessed via keys, form the main progression loop.  
* **"Delve-like" Mode (Name TBD):**  
  * **Mechanic:** Player "chases a cart" that is constantly moving from start to end of a path.  
  * **Turn-Based Implementation:**  
    * Distance to cart is displayed. Player must stay within a certain range.  
    * Encounters appear at set distances along the path.  
    * "Run Speed" stat is crucial. Higher run speed allows more "catch-up" actions or covers more ground per "move" action.  
    * If enemies are not defeated quickly, or run speed is too low, the player falls too far behind the cart, fails the delve, and loses loot from missed encounters.  
  * **Rewards:** Potentially unique crafting materials (e.g., for meta-crafting affixes like "reroll prefix").  
* **"Tower Defense" Mode (Future):**  
  * Enemies attack a central objective, not the player directly.  
  * Focus on high DPS or specific crowd control/taunt builds.  
  * Player might select pre-wave "aids" or "towers" crafted using specific resources.  
  * Motivates different gear builds than standard dungeons.

### **2.8. Death & Penalties**

* **Consequences of Failure in a Dungeon:**  
  1. Lose the Key used to enter the dungeon.  
  2. Lose all items currently in the backpack inventory.  
  3. Risk of losing one randomly selected equipped item. (Severity to be tuned – high risk).

## **3\. Content**

### **3.1. Enemy Types & Abilities**

* **Categorization:** Melee, Ranged, Magic-users.  
* **Visual Cues:** Enemy models and attack animations will clearly indicate their intended actions and damage types.  
* **Resistances & Weaknesses:** Enemies will have varied resistances to different damage types (never full immunity).  
* **Abilities:** Similar to player abilities – heals, area attacks, buffs, debuffs, special attacks.  
* **Predictability by Area:** Dungeon themes/key types will heavily influence the types of enemies encountered (e.g., "Volcanic Caverns" will have fire-based enemies).

### **3.2. Dungeon Environments/Themes**

* Visually distinct themes tied to key types (e.g., Crypt, Cave, Forest, Volcanic, Frozen).  
* Layouts are procedurally generated or follow set templates for variety.

### **3.3. Boss Encounters**

* Significantly more challenging than regular enemies.  
* Unique mechanics and attack patterns.  
* Higher chance to drop rare loot, unique items, set items, and special crafting materials (e.g., meta-crafting orbs).

## **4\. Interface (UI/UX)**

* **General Principle:** Clean, clear, and efficient, especially for mobile. Information-on-demand rather than overwhelming clutter.  
* **Town Screen:**  
  * Simple visual representation (e.g., diorama with interactive points).  
  * Buttons/Icons for: Stash, Crafting (Anvil), Dungeon Access (Door/Portal), (Future) NPC Recruits.  
  * Minimal NPC interaction (speech bubbles for tips/lore).  
* **Combat Screen (Mobile First):**  
  * **Key Info (Always Visible):** Player HP/MP/ES, Enemy HP (selected target), Enemy Intent Icon.  
  * **Controls:** Attack Button, Block Button, Toggled Ability Icons.  
  * Enemy selection intuitive (tap).  
* **Inventory & Stash Management:**  
  * Grid-based.  
  * Clear item icons and rarity indicators.  
  * **Item Details:** Tap/hover on an item shows its full stats, affixes, and base type.  
  * **Comparison:** Easy comparison tool (e.g., side-by-side view when selecting an item with one already equipped).  
* **Crafting Interface:**  
  * Intuitive slots for base item and crafting consumables.  
  * Clear preview of potential outcomes (where applicable).  
* **Keyword/Icon System:**  
  * Stats and mechanics (e.g., "Ignite," "Dodge," "Armor") paired with unique icons.  
  * Hovering/tapping an icon or keyword provides a detailed explanation tooltip.  
* **Stat Display:**  
  * Main combat UI shows core stats (HP, Mana, ES, primary damage/type).  
  * Clicking these sections expands to show detailed breakdowns (resistances, crit chance/multi, damage type percentages, etc.).

## **5\. Future/Extended Features**

### **5.1. Idle System (Late Game)**

* **Unlock:** Becomes available after reaching a certain progression point (e.g., Tier 5 keys).  
* **Mechanic:**  
  1. Player "hires" NPCs (Townsfolk).  
  2. Player equips these NPCs with gear from their own stash.  
  3. Player provides a dungeon key to an NPC.  
  4. The NPC attempts the dungeon "offline." Success is based on a % chance influenced by their gear quality relative to the dungeon tier, and a base RNG factor.  
  5. NPCs will fight sub-optimally (e.g., random targeting, no strategic ability use).  
  6. **Rewards:** If successful, the NPC "returns" with a portion of the loot (e.g., 50%), deposited into a special "drop box" for the player to collect. The NPC keeps the rest.  
  7. NPCs can "level up" or gain proficiency with better gear, slightly improving success odds.

## **6\. (Optional Sections for Later)**

* **Monetization:** (To be determined \- e.g., cosmetics, stash tabs, convenience items if F2P. If premium, no predatory MTX).  
* **Art Style/Audio Direction:** (To be determined \- functional and clear visuals are priority. Audio for impact and feedback).  
* **Narrative/Story Outline:** (Minimalist \- focus on mechanics. Perhaps a loose framing for why the world is dangerous and full of loot).

