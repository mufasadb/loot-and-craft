# **Loot & Craft \- Project Development Document**

## **Project Overview**

**Technology Stack:**

* TypeScript  
* Vite (Build tool)  
* MobX (State management)  
* PWA (Progressive Web App)  
* HTML5 Canvas/WebGL for animations

**Architecture Pattern:** \- Object-oriented design with clear separation of concerns

* Component-based UI structure  
* State machine for combat logic  
* JSON-based content pipeline

## **Phase 1: Foundation & Asset Pipeline (Week 1-2)**

### **1.1 Project Setup**

**Tasks:**

* Initialize Vite project with TypeScript configuration  
* Set up PWA manifest and service worker  
* Configure MobX for state management  
* Set up folder structure following game development patterns  
* Configure asset loading pipeline

**Acceptance Criteria:**

* Project builds and runs locally  
* PWA installable on mobile/desktop  
* Hot module replacement working  
* TypeScript strict mode enabled

### **1.2 Asset Management System**

**Tasks:**

* Create asset folder structure:  
  /assets  
    /images  
      /items  
        /weapons  
        /armor  
        /crafting  
      /enemies  
      /ui  
        /frames  
        /buttons  
        /icons  
      /backgrounds  
    /audio  
      /sfx  
      /music  
    /data  
      /items.json  
      /enemies.json  
      /abilities.json  
      /affixes.json

* Build asset loader service with caching  
* Implement asset tagging system  
* Create asset manifest generator

**Acceptance Criteria:**

* All assets load asynchronously without blocking  
* Assets cached for offline use  
* Asset metadata searchable by tags  
* Bundle size optimized with lazy loading

### **1.3 Asset Processing & Tagging**

**Tasks:**

* Build asset processor script that:  
  * Recursively scans asset folders  
  * For each image:  
    {  
      "path": "items/weapons/iron\_sword.png",  
      "tags": \[  
        "item", "weapon", "sword", "gray", "metallic",  
        "tier1", "common", "melee"  
      \],  
      "metadata": {  
        "width": 64,  
        "height": 64,  
        "fileSize": 2048,  
        "dominantColors": \["\#C0C0C0", "\#808080"\],  
        "hasTransparency": true  
      },  
      "usage": \["inventory\_icon", "equipment\_display"\]  
    }

  * Generates searchable manifest.json  
  * Auto-tags based on folder structure  
  * Identifies rarity by color analysis (purple \= rare, etc.)  
* Create LLM integration for description:  
  * Use vision API to generate descriptions  
  * Extract game-relevant features  
  * Tag emotional tone (menacing, elegant, crude)  
* Build asset validation tool:  
  * Check all referenced assets exist  
  * Verify consistent sizing for each type  
  * Flag missing or broken references

**Acceptance Criteria:**

* All images have at least 5 relevant tags  
* Manifest enables \<100ms searches  
* Color extraction identifies rarity tier  
* No hardcoded asset paths in code  
* Build fails if assets are missing

## **Phase 2: Core Data Models (Week 2-3)**

### **2.1 Base Classes Implementation**

#### **Item Class**

**Tasks:**

* Create Item base class with:  
  * Type enum (Equipment, Crafting, Key)  
  * Rarity enum (Normal, Magic, Rare, Unique, Set)  
  * Slot enum (Ring, Glove, Weapon, etc.)  
  * Stats interface (inherent \+ extended)  
  * Affix system (prefix/suffix)  
  * Image reference  
  * Granted abilities array  
* Implement item generation algorithm based on tier  
* Create item factory with weighted random generation. **The factory must first determine the item's base type (e.g., Sword, Gloves, Key) and then pull from the appropriate, restricted affix pool for that item type.**

**Acceptance Criteria:**

* Items generate with appropriate stats for tier  
* Affix system correctly applies prefixes/suffixes based on item type restrictions  
* Item serialization/deserialization working  
* Unit tests for item generation logic

#### **Affix Class**

**Tasks:**

* Create Affix class with:  
  * Type (Prefix/Suffix)  
  * Tier (1-10)  
  * Effect type  
  * Quantity/value  
  * Tags for meta-crafting  
  * **allowedItemTypes**: An array of item base types or slots this affix can roll on (e.g., \['weapon'\], \['gloves', 'boots'\], \['key'\]).  
* Build affix pool manager that loads from affixes.json.  
* Implement tier-based affix selection that respects allowedItemTypes.  
* Define specific affix pools for Keys (e.g., "+1 monster per fight", "% chance for boss", "rewards are T+1").

**Acceptance Criteria:**

* Affixes apply correctly only to valid item types.  
* Tier restrictions enforced.  
* Tag system enables targeted crafting.  
* Affix stacking rules implemented.

#### **Entity Base Class**

**Tasks:**

* Create abstract Entity class with:  
  * Base stats (HP, Mana, ES)  
  * Computed stats approach (calculated on-demand including all modifiers)  
  * Unified effect system (statuses and abilities inherit from CombatEffect)  
  * Combat methods interface  
  * Effect trigger points (CONTINUOUS, TURN\_START, BEFORE\_ATTACK, etc.)  
* Implement computedStats getter that:  
  * Combines base stats \+ gear stats  
  * Applies all active effect modifiers (flat and percentage)  
  * Returns fresh calculation each time (no caching)

**Acceptance Criteria:**

* Stat computation includes all modifiers from effects  
* Single effect processing pipeline for both statuses and abilities  
* Combat interface standardized with clear trigger points  
* No attack speed stat (use explicit multi-hit mechanics instead)

#### **Enemy Class**

**Tasks:**

* Extend Entity class for enemies  
* Implement enemy-specific properties:  
  * AI behavior patterns  
  * Loot tier association  
  * Attack telegraphing  
  * Ability usage logic  
* Create enemy factory from JSON data

**Acceptance Criteria:**

* Enemies load from JSON configuration  
* AI acts according to defined patterns  
* Telegraphing system provides clear intent  
* Abilities trigger at appropriate times

#### **Player Class**

**Tasks:**

* Extend Entity class for player  
* Add player-specific features:  
  * Inventory management (backpack \+ stash)  
  * Equipment slots with validation  
  * Gold tracking  
  * Computed stats using on-demand calculation  
  * Multiple loadout support (3 sets)  
* Remove attack speed from stat system  
* Implement effect collection from equipped items

**Acceptance Criteria:**

* Equipment properly modifies stats via computed properties  
* Inventory capacity enforced  
* Loadout switching is instant  
* All item-granted effects process through unified system  
* Stat sheet shows calculation breakdown

#### **Block Action Specific Implementation**

**Tasks:**

* Implement Block mechanics exactly as per GDD:  
  executeBlock(entity: Entity) {  
    // 1\. Double current armor value for this turn only  
    entity.tempArmorModifier \= entity.computedStats.armor;

    // 2\. Apply 25% damage reduction to all incoming damage  
    entity.addEffect(new BlockEffect({  
      duration: { turns: 1, unit: DurationUnit.TURNS },  
      damageReduction: 0.25,  
      triggers: \[EffectTrigger.BEFORE\_DAMAGE\_TAKEN\]  
    }));

    // 3\. Visual feedback  
    showBlockAnimation(entity);

    // 4\. Clear modifiers at turn end  
    onTurnEnd: () \=\> {  
      entity.tempArmorModifier \= 0;  
    }  
  }

* Show block status clearly:  
  * Shield icon appears  
  * Armor value shows doubled (in different color)  
  * "Blocking" text under health bar  
* Enemy AI interaction:  
  * Smart enemies may choose not to attack  
  * Some abilities pierce block  
  * Block doesn't prevent status effects

**Acceptance Criteria:**

* Armor exactly doubles (not \+100%)  
* 25% reduction applies after armor  
* Block expires at turn end  
* Visual feedback immediate  
* Stacks with other defensive buffs

### **2.2 Unified Effect System (Abilities & Statuses)**

**Tasks:**

* Create CombatEffect base class:  
  * Triggers array (when to process)  
  * Duration system (turns, rounds, hits, permanent)  
  * Process method with context  
  * Visible flag (shows as status icon)  
* Extend for StatusEffect (visible, continuous effects)  
* Extend for AbilityEffect (conditional triggers, mana costs)  
* Create EffectProcessor with single processing pipeline  
* Define all trigger points:  
  * CONTINUOUS (stat modifiers)  
  * Turn-based (TURN\_START, TURN\_END)  
  * Combat actions (BEFORE\_ATTACK, ON\_ATTACK, AFTER\_ATTACK)  
  * Defensive (BEFORE\_DAMAGE\_TAKEN, AFTER\_DAMAGE\_TAKEN)  
  * Special (ON\_KILL, ON\_DEATH, COMBAT\_START)

**Acceptance Criteria:**

* Single processing point for all effects  
* Statuses and abilities use same pipeline  
* Effect stacking works correctly (chances add to 100% max)  
* Non-stat effects work (Marked, Reflect, Banish, etc.)  
* Clear trigger point documentation

### **2.3 Combat Handler State Machine**

**Tasks:**

* Build detailed state machine with these states:  
  * INITIALIZING (set up participants, range states, **apply key modifiers**)  
  * ROLL\_INITIATIVE (calculate turn order)  
  * PLAYER\_TURN\_START (process turn-start effects)  
  * PLAYER\_ACTION\_SELECT (await input)  
  * PLAYER\_ACTION\_RESOLVE (execute action)  
  * ENEMY\_TURN\_START (enemy pre-turn)  
  * ENEMY\_INTENT (telegraph actions)  
  * ENEMY\_ACTION\_RESOLVE (execute enemy action)  
  * BETWEEN\_TURNS (status ticks, regeneration)  
  * CHECK\_VICTORY  
  * CHECK\_DEFEAT (handle failure and penalties)  
  * COMBAT\_END (cleanup)  
  * LOOT\_DISTRIBUTION  
* Implement range mechanics:  
  * Abstract IN\_RANGE/OUT\_OF\_RANGE states  
  * Melee must spend turn to close distance  
  * Ranged vs ranged start in range  
* Create damage calculation pipeline:  
  * Pre-attack effects → Base damage → Hit check → Crit check → Mitigation → Application → Post-damage effects  
* Handle Energy Shield mechanics (absorbs all damage types first)  
* **Implement Defeat Penalty Logic:**  
  * On entering CHECK\_DEFEAT state:  
    1. The Key used for the dungeon is lost.  
    2. All items in the player's backpack are lost.  
    3. Roll a chance to lose one randomly selected equipped item (details to be tuned).  
    4. Transition player back to the Town Hub.

**Acceptance Criteria:**

* State transitions smooth and logical  
* Range mechanics create tactical decisions  
* Damage pipeline processes all effects in order  
* Turn order respects initiative  
* Status effect timing correct (DoTs at turn start, duration at turn end)  
* Defeat penalties are applied correctly as per GDD.  
* Loot distribution correctly accounts for any modifiers from the dungeon Key (e.g., "rewards are T+1").

## **Phase 3: UI Framework (Week 3-4)**

### **3.1 Layout System**

**Tasks:**

* Create responsive three-panel layout:  
  * Desktop: Exactly 33.33% width each panel, full height  
  * Mobile: 100% width stacked, with collapse buttons  
  * Panels in order: Stats (left), Content (center), Inventory (right)  
  * No panel can be completely hidden on desktop  
* Implement panel state management in MobX:  
  class UIStore {  
    @observable leftPanelOpen \= true;  // mobile only  
    @observable rightPanelOpen \= false; // mobile only  
    @observable centerContent: 'town' | 'combat' | 'dungeon' | 'craft' | etc;  
  }

* Add smooth transitions:  
  * Panel slides for mobile collapse/expand  
  * Fade transitions when switching center content  
  * No layout shift during transitions  
* Mobile-specific features:  
  * Swipe gestures for panel toggle  
  * Auto-collapse inventory when entering combat  
  * Sticky headers for each panel

**Acceptance Criteria:**

* Desktop always shows all 3 panels  
* Mobile panels collapse without breaking layout  
* Transitions complete in under 300ms  
* No horizontal scroll ever appears  
* Touch gestures feel native

### **3.2 Core UI Components**

#### **Drag & Drop System**

**Tasks:**

* Create DragDropContext provider with MobX observable state  
* Build Draggable component with:  
  * Mouse/touch tracking (track offset from click point, not center)  
  * Visual feedback during drag (semi-transparent clone follows cursor)  
  * Container validation before drop  
  * Return-to-origin animation if drop fails  
  * Ghost image of original stays in place during drag  
* Build DropContainer component with:  
  * Accept/reject logic based on container type and item type  
  * Visual highlight on valid hover (green glow)  
  * Red highlight on invalid hover  
  * Overflow handling strategies:  
    * "reject": Don't accept if full  
    * "swap": Swap with existing item  
    * "push": Push existing item to source container  
  * Support for both single-item and multi-item containers  
* Container types must include:  
  * Inventory slots (accepts any item)  
  * Equipment slots (validates by item slot type)  
  * Crafting slots (base item slot, crafting material slot, **key modification slot**)  
  * Disenchant slot (magic/rare items only)  
  * Trade slots (read-only, click to buy)

**Acceptance Criteria:**

* Drag works identically with mouse and touch  
* Items track cursor based on initial click position  
* Invalid drops animate back to origin  
* Container rules strictly enforced  
* Swap behavior works for equipment slots  
* Mobile performance maintains 60fps during drag

#### **Inventory Grid**

**Tasks:**

* Create scrollable grid container:  
  * Desktop: 10 columns x N rows  
  * Mobile: 5 columns x N rows  
  * Each slot exactly square  
  * Grid expands vertically as needed  
* Implement item filtering:  
  * Filter buttons: "All", "Equipment", "Crafting", "Keys"  
  * Instant filter (no animation)  
  * Remember last selected filter  
  * Item count badge on each filter  
* Add item tooltips:  
  * Desktop: Show on hover after 500ms  
  * Mobile: Show on long-press (400ms)  
  * Tooltip shows ALL item stats and affixes  
  * Compare mode: hold shift (desktop) or toggle button (mobile)  
* Build item actions:  
  * Right-click (desktop) or long-press (mobile) for context menu  
  * Actions: Equip, Disenchant, Drop, Compare  
  * Disabled actions are grayed out with reason  
* Stash-specific features:  
  * Separate stash tabs (min 4 tabs)  
  * Tab naming/icons  
  * Sort buttons: by type, tier, rarity  
  * Search box with real-time filtering

**Acceptance Criteria:**

* Grid scrolls at 60fps with 200+ items  
* Tooltips position intelligently (never off-screen)  
* Filter changes are instant  
* Touch-friendly on mobile (no accidental actions)  
* Sort is stable (same items stay in same order)

#### **Character Equipment Screen**

**Tasks:**

* Create character doll with equipment slots  
* Implement slot validation for item types  
* Show equipped item effects  
* Add quick-swap for loadouts  
* Display computed stats panel

**Acceptance Criteria:**

* Only valid items equip to slots  
* Stats update immediately on equip  
* Visual feedback for equipped items  
* Loadout switching is instant  
* Stat breakdowns show calculations

### **3.3 Combat UI**

**Tasks:**

* Create combat arena with exactly 5 enemy slots vertically stacked:  
  * Enemies face left (player implied to be off-screen left)  
  * Fixed positions (no dynamic positioning)  
  * Top enemy is default selection target  
* Build health/mana/ES bars:  
  * Stacked thin bars for each enemy  
  * Current/Max numbers displayed on bars  
  * Energy Shield bar above health (different color)  
  * Smooth depletion animations (fade the lost portion)  
* Implement damage number popups:  
  * Appear at perceived player position (left side) when player damages  
  * Appear above enemy when enemy takes damage  
  * Critical hits show with "\!" suffix and different color  
  * Float up and fade over 1.5 seconds  
* Add enemy intent indicators:  
  * Icon above enemy showing intended action  
  * Damage preview on hover (e.g., "⚔️ 15-20")  
  * Multiple sword icons for multi-hit attacks  
  * Ability icons with tooltip descriptions  
* Create action buttons:  
  * Attack (disabled if no valid target)  
  * Block (shows defense preview)  
  * Escape (only in non-key dungeons)  
  * Fixed position at bottom of combat area  
* Enemy selection:  
  * Click/tap to select  
  * Highlight selected enemy  
  * Tab/gesture to cycle targets

**Acceptance Criteria:**

* Enemy positions never overlap or shift  
* All 5 slots visible without scrolling  
* Damage numbers never overlap  
* Intent clearly shows next enemy action  
* Touch targets minimum 44x44 pixels  
* Selection state clearly visible

## **Phase 4: Town & Activities (Week 4-5)**

### **4.0 Initial Player Setup**

**Tasks:**

* Create a one-time "New Game" screen.  
* Player chooses a starting "Class" (e.g., Ranger, Knight, Mage).  
* The choice determines the player's initial set of equipped items (e.g., Ranger gets a basic bow and leather armor).  
* This choice does not provide permanent buffs, only starting gear.

**Acceptance Criteria:**

* Screen is shown only once for a new player.  
* Selecting a class correctly equips the specified starting items.  
* Player is taken to the Town Hub after selection.

### **4.1 Town Hub**

**Tasks:**

* Create town view with activity buttons  
* Implement activity state management  
* Add visual feedback for available activities  
* Build notification system for completed tasks

**Acceptance Criteria:**

* Activities load in center panel  
* Unavailable activities clearly marked  
* Smooth transitions between activities  
* Back navigation intuitive

### **4.2 Activity Screens**

#### **Dungeon Selection**

**Tasks:**

* Create key selection interface:  
  * Show all keys in inventory  
  * Display key tier prominently  
  * **Show key modifiers (e.g., "Extra Monsters", "Boss Chance") clearly.**  
  * Preview panel shows:  
    * Expected enemy types (based on key theme)  
    * Tier-appropriate loot preview  
    * Warning if player seems undergeared  
* Key consumption flow:  
  * Confirm button with "This will consume the key"  
  * Key removed from inventory immediately  
  * Cannot back out after confirmation  
* Beach alternative (no key required):  
  * Always available button  
  * Shows "Tier 1 Enemies" clearly  
  * No key slot needed

**Acceptance Criteria:**

* Cannot select non-key items  
* Key consumption is irreversible  
* Preview helps player decision  
* Beach always accessible  
* Clear tier and modifier indicators throughout

#### **Beach (Starter Zone)**

**Tasks:**

* Create simplified combat starter  
* Generate tier 1 encounters  
* No key requirement implementation

**Acceptance Criteria:**

* Accessible without keys  
* Generates 5 consecutive fights  
* Appropriate for new players  
* Rewards scale with tier 1

#### **Crafting Forge**

**Tasks:**

* Create crafting interface:  
  * Slots: Base Item (left), Crafting Orb (right).  
  * Add support for modifying **Keys** in the Base Item slot.  
  * Result preview panel (center).  
  * Craft button (disabled until valid combination).  
* Implement crafting rules exactly as specified:  
  // Orb behaviors (MUST MATCH GDD):  
  transmutation: normal → magic (random affixes)  
  alteration: reroll magic item affixes  
  augmentation: add affix to magic (if \<2 affixes)  
  alchemy: magic → rare (3-6 random affixes)  
  chaos: reroll all rare affixes

* Show outcome preview:  
  * Deterministic outcomes show exact result  
  * Random outcomes show possibilities  
  * Warning for destructive actions  
* Validation rules:  
  * Cannot craft uniques/sets (show error)  
  * Orb requirements strictly enforced  
  * Item must be unequipped  
* Post-craft flow:  
  * Show result with sparkle effect  
  * Auto-move to inventory if space  
  * If inventory full, item stays in result slot  
  * Cannot close window with item in result

**Acceptance Criteria:**

* Only valid combinations enable craft button  
* Preview accurately shows possibilities  
* Crafting consumes correct materials  
* Results match GDD rules exactly  
* Cannot lose items due to full inventory  
* Interface correctly handles crafting on both equipment and keys.

#### **Disenchanting**

**Tasks:**

* Create disenchant interface  
* Implement shard generation logic  
* Add bulk disenchant option  
* Show expected outcomes

**Acceptance Criteria:**

* Only valid items disenchantable  
* Shard generation balanced per tier/rarity  
* Bulk operation efficient  
* Cannot disenchant equipped items

#### **Trading Post**

**Tasks:**

* Generate tier-appropriate trade offers  
* Implement refresh mechanism  
* Add purchase confirmation  
* Track purchase history

**Acceptance Criteria:**

* Offers scale with player progression  
* Refresh timer visible  
* Cannot buy without sufficient gold  
* Purchases add to inventory correctly

## **Phase 5: Polish & Effects (Week 5-6)**

### **5.1 Visual Polish**

**Tasks:**

* Implement grimdark UI theme:  
  * Dark grey color palette  
  * Gothic/medieval UI frames  
  * Diablo/PoE style fonts  
* Add depth effects (shadows, bevels)  
* Create particle effects for abilities  
* Implement screen shake for impacts

**Acceptance Criteria:**

* Consistent visual theme throughout  
* UI elements have depth/3D appearance  
* Effects enhance without overwhelming  
* Performance remains smooth

### **5.2 Animation System**

**Tasks:**

* Hover animations for ALL interactive elements:  
  * Scale to 1.05 on hover  
  * Brightness increase of 10%  
  * Transition duration: 150ms  
  * Mobile: same effect on touch start  
* Combat animations (all under 500ms):  
  * Enemy hit: bounce 10px toward player  
  * Enemy attack: lunge 15px toward player  
  * Block animation: shield raise effect  
  * Death: fade out \+ collapse  
* Screen transitions:  
  * Fade out current (200ms)  
  * Fade in new (200ms)  
  * No content shift during transition  
* Health bar animations:  
  * Damage: red portion fades over 1s  
  * Healing: green flash then instant fill  
  * Shield damage: blue portion shatters  
* Damage numbers:  
  * Start at damage point  
  * Float up 50px over 1.5s  
  * Fade from 100% to 0% opacity  
  * Slight random X drift (-10px to \+10px)  
  * Crits: 1.5x size, exclamation mark, red color  
* Loot drop animation:  
  * Items fall from top with physics  
  * Bounce once on landing  
  * Glow effect on rare+ items

**Acceptance Criteria:**

* All animations GPU-accelerated (transform/opacity only)  
* 60fps maintained during animations  
* Animations can be interrupted/cancelled  
* Reduced motion setting disables non-essential animations  
* No animation causes layout shift

### **5.3 Audio System**

**Tasks:**

* Create SoundManager singleton  
* Implement sound categories (SFX, Music, UI)  
* Add volume controls with persistence  
* Create audio sprite system  
* Implement positional audio for combat

**Acceptance Criteria:**

* Sounds play without delay  
* Volume settings persist  
* No audio glitches on mobile  
* Mute option works globally

## **Phase 6: Progressive Web App Features (Week 6\)**

### **6.1 Offline Functionality**

**Tasks:**

* Implement service worker caching strategy  
* Create offline fallback pages  
* Add sync queue for actions  
* Handle connection state changes

**Acceptance Criteria:**

* Game playable offline  
* Progress saves locally  
* Syncs when connection restored  
* Clear offline indicators

### **6.2 Installation & Updates**

**Tasks:**

* Create install prompts  
* Implement update notifications  
* Add version management  
* Create splash screens

**Acceptance Criteria:**

* Install prompt appears appropriately  
* Updates download in background  
* Version displayed in settings  
* Splash screens match theme

## **Phase 7: Testing & Optimization (Week 7\)**

### **7.1 Performance Optimization**

**Tasks:**

* Profile and optimize render loops  
* Implement object pooling for animations  
* Optimize asset loading  
* Add performance monitoring

**Acceptance Criteria:**

* 60 FPS on modern devices  
* 30 FPS minimum on older devices  
* Initial load under 3 seconds  
* Memory usage stable

### **7.2 Testing Suite**

**Tasks:**

* Unit tests for all game logic  
* Integration tests for combat system  
* E2E tests for critical paths  
* Load testing for inventory/stash

**Acceptance Criteria:**

* 80% code coverage minimum  
* All game mechanics tested  
* No critical path failures  
* Performance benchmarks met

## **Future / Post-Launch Features**

This section contains features identified in the GDD that are planned for development after the core game loop is complete and stable.

* **"Delve-like" Mode:** A game mode where the player must keep pace with a moving objective while clearing encounters. This will require the implementation of a "Run Speed" stat and a different combat loop structure.  
* **Tower Defense Mode:** An alternative game mode where enemies attack a central point, requiring different character builds focused on DPS and area control.  
* **Idle System:** The late-game system allowing players to equip NPCs to run dungeons offline for passive rewards.

## **Technical Specifications**

### **State Management Structure**

interface GameState {  
  player: PlayerState  
  combat: CombatState  
  inventory: InventoryState  
  town: TownState  
  settings: SettingsState  
}

// Unified Effect System  
abstract class CombatEffect {  
  id: string  
  triggers: EffectTrigger\[\]  
  duration: DurationInfo  
  visible: boolean  
  abstract process(context: EffectContext): EffectResult  
}

// Combat State Machine  
enum CombatState {  
  INITIALIZING,  
  ROLL\_INITIATIVE,  
  PLAYER\_TURN\_START,  
  PLAYER\_ACTION\_SELECT,  
  PLAYER\_ACTION\_RESOLVE,  
  ENEMY\_TURN\_START,  
  ENEMY\_INTENT,  
  ENEMY\_ACTION\_RESOLVE,  
  BETWEEN\_TURNS,  
  CHECK\_VICTORY,  
  CHECK\_DEFEAT,  
  COMBAT\_END,  
  LOOT\_DISTRIBUTION  
}

// Effect Triggers  
enum EffectTrigger {  
  CONTINUOUS,  
  TURN\_START,  
  TURN\_END,  
  BEFORE\_ATTACK,  
  ON\_ATTACK,  
  AFTER\_ATTACK,  
  BEFORE\_DAMAGE\_TAKEN,  
  AFTER\_DAMAGE\_TAKEN,  
  ON\_KILL,  
  ON\_DEATH,  
  COMBAT\_START,  
  COMBAT\_END  
}

### **Key Design Patterns**

* **Factory Pattern**: Item/Enemy generation  
* **Strategy Pattern**: AI behaviors  
* **Observer Pattern**: Stat calculations  
* **State Machine**: Combat flow  
* **Singleton**: Managers (Sound, Asset)  
* **Computed Properties**: Stats calculated on-demand including all effects

### **Performance Targets**

* Initial load: \<3s on 3G  
* Frame rate: 60fps (animations)  
* Memory: \<100MB active  
* Battery: Minimal drain on mobile

### **Browser Support**

* Chrome 90+  
* Firefox 88+  
* Safari 14+  
* Edge 90+  
* Mobile browsers (iOS Safari, Chrome Android)

## **Risk Mitigation**

**Performance Risks:**

* Canvas rendering on low-end devices  
* Mitigation: Fallback to CSS animations

**Complexity Risks:**

* Combat system interactions  
* Mitigation: Extensive testing, clear state machine

**UX Risks:**

* Mobile drag-drop complexity  
* Mitigation: Alternative tap-to-select mode

**Content Risks:**

* Balancing item generation  
* Mitigation: Exposed JSON configs for easy tuning