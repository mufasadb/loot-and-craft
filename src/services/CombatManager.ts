// Combat Manager - State machine for turn-based combat system

import { makeObservable, observable, action } from 'mobx';
import {
  CombatManager as ICombatManager,
  PlayerAction,
  AttackAction,
  BlockAction,
  CastAbilityAction,
  ToggleAbilityAction,
  MoveAction,
  EscapeAction,
  DamageCalculation,
  CombatLogEntry,
  DamageRecord,
  CombatInitParams,
  CombatResult,
  DefeatPenaltyResult
} from '../types/combat';
import { Entity, Enemy, CombatParticipant } from '../types/entities';
import { Item, KeyModifier } from '../types/items';
import { EntityId } from '../types/base';
import { 
  CombatState, 
  CombatAction, 
  RangeState, 
  DamageType, 
  EffectTrigger,
  ItemType
 
} from '../types/enums';
import { EffectProcessor, EffectFactory } from './EffectProcessor';
import { Player as PlayerImpl, Enemy as EnemyImpl } from './Entity';
import { ItemFactory } from './ItemFactory';

export class CombatManager implements ICombatManager {
  // State machine
  currentState: CombatState;
  participants: CombatParticipant[];
  player: PlayerImpl;
  enemies: EnemyImpl[];
  
  // Combat settings
  keyModifiers: KeyModifier[];
  dungeonTier: number;
  
  // Turn management
  currentTurn: number;
  currentParticipantIndex: number;
  turnOrder: EntityId[];
  
  // Range states
  rangeStates: Map<EntityId, RangeState>;
  
  // Combat history
  combatLog: CombatLogEntry[];
  damageHistory: DamageRecord[];
  
  // Systems
  private effectProcessor: EffectProcessor;
  private itemFactory: ItemFactory;
  private pendingPlayerAction?: PlayerAction;
  // private _combatStartTime: number;  // Unused variable
  
  // Combat outcome tracking
  public escapedCombat: boolean = false;

  constructor(params: CombatInitParams) {
    this.player = params.player as PlayerImpl;
    this.enemies = params.enemies as EnemyImpl[];
    this.dungeonTier = params.dungeonTier;
    this.keyModifiers = params.keyModifiers;
    
    this.currentState = CombatState.INITIALIZING;
    this.currentTurn = 1;
    this.currentParticipantIndex = 0;
    this.turnOrder = [];
    this.participants = [];
    this.rangeStates = new Map();
    this.combatLog = [];
    this.damageHistory = [];
    // this._combatStartTime = Date.now();  // Unused variable
    
    this.effectProcessor = new EffectProcessor();
    this.itemFactory = new ItemFactory();

    makeObservable(this, {
      currentState: observable,
      participants: observable,
      currentTurn: observable,
      currentParticipantIndex: observable,
      turnOrder: observable,
      rangeStates: observable,
      combatLog: observable,
      damageHistory: observable,
      advanceState: action,
      setState: action,
      executePlayerAction: action,
      executeEnemyAction: action
    });
    
    this.initializeCombat();
  }

  private initializeCombat(): void {
    this.addLogEntry('Combat begins!', 'system');
    
    // Apply key modifiers to enemies
    this.applyKeyModifiersToEnemies();
    
    // Set up participants
    this.participants = [
      this.createParticipant(this.player),
      ...this.enemies.map(enemy => this.createParticipant(enemy))
    ];
    
    // Initialize range states
    this.initializeRangeStates();
    
    // Advance to initiative rolling
    this.setState(CombatState.ROLL_INITIATIVE);
  }

  private createParticipant(entity: Entity): CombatParticipant {
    return {
      entity,
      turnOrder: 0,
      hasActed: false,
      canMove: true,
      canAttack: true,
      canUseAbilities: true,
      damageThisTurn: 0,
      healingThisTurn: 0,
      effectsAppliedThisTurn: []
    };
  }

  private initializeRangeStates(): void {
    // Set initial range states based on weapon types
    this.rangeStates.set(this.player.id, this.getInitialRangeForEntity(this.player));
    
    for (const enemy of this.enemies) {
      this.rangeStates.set(enemy.id, this.getInitialRangeForEntity(enemy));
    }
    
    // Handle bow user advantage (per GDD)
    this.handleBowAdvantage();
  }

  private getInitialRangeForEntity(_entity: Entity): RangeState {
    // Default to in range, but this could be determined by weapon type
    // Ranged vs ranged should start in range per GDD
    return RangeState.IN_RANGE;
  }

  private handleBowAdvantage(): void {
    // Per GDD: If bow user faces melee enemy, enemy uses first turn to close distance
    const playerHasBow = this.playerHasBowWeapon();
    const hasEnemyMelee = this.enemies.some(enemy => this.isEnemyMelee(enemy));
    
    if (playerHasBow && hasEnemyMelee) {
      this.addLogEntry('Bow user advantage: Melee enemies must close distance first', 'system');
      // This will be handled in enemy AI when they select actions
    }
  }

  private playerHasBowWeapon(): boolean {
    const weapon = this.player.equipment.weapon;
    return weapon?.equipment?.baseType === 'bow';
  }

  private isEnemyMelee(_enemy: Enemy): boolean {
    // This would check enemy weapon type or attack pattern
    return true; // Simplified for now
  }

  private applyKeyModifiersToEnemies(): void {
    for (const modifier of this.keyModifiers) {
      if (modifier.effects.enemyHealthMultiplier) {
        this.enemies.forEach(enemy => {
          enemy.baseStats.maxHealth = Math.floor(
            enemy.baseStats.maxHealth * modifier.effects.enemyHealthMultiplier!
          );
          enemy.currentHealth = enemy.baseStats.maxHealth;
        });
      }
      
      if (modifier.effects.enemyDamageMultiplier) {
        this.enemies.forEach(enemy => {
          enemy.baseStats.damage = Math.floor(
            enemy.baseStats.damage * modifier.effects.enemyDamageMultiplier!
          );
        });
      }
    }
  }

  // State machine implementation
  advanceState(): void {
    switch (this.currentState) {
      case CombatState.INITIALIZING:
        this.setState(CombatState.ROLL_INITIATIVE);
        break;
        
      case CombatState.ROLL_INITIATIVE:
        this.rollInitiative();
        this.setState(CombatState.PLAYER_TURN_START);
        break;
        
      case CombatState.PLAYER_TURN_START:
        this.processPlayerTurnStart();
        this.setState(CombatState.PLAYER_ACTION_SELECT);
        break;
        
      case CombatState.PLAYER_ACTION_SELECT:
        // Wait for player input - action will advance state
        break;
        
      case CombatState.PLAYER_ACTION_RESOLVE:
        this.resolvePlayerAction();
        this.setState(CombatState.ENEMY_TURN_START);
        break;
        
      case CombatState.ENEMY_TURN_START:
        this.processEnemyTurnStart();
        this.setState(CombatState.ENEMY_INTENT);
        break;
        
      case CombatState.ENEMY_INTENT:
        this.generateEnemyIntents();
        this.setState(CombatState.ENEMY_ACTION_RESOLVE);
        break;
        
      case CombatState.ENEMY_ACTION_RESOLVE:
        this.resolveEnemyActions();
        this.setState(CombatState.BETWEEN_TURNS);
        break;
        
      case CombatState.BETWEEN_TURNS:
        this.processBetweenTurns();
        this.setState(CombatState.CHECK_VICTORY);
        break;
        
      case CombatState.CHECK_VICTORY:
        if (this.checkVictory()) {
          this.setState(CombatState.COMBAT_END);
        } else {
          this.setState(CombatState.CHECK_DEFEAT);
        }
        break;
        
      case CombatState.CHECK_DEFEAT:
        if (this.checkDefeat()) {
          this.setState(CombatState.COMBAT_END);
        } else {
          this.nextTurn();
          this.setState(CombatState.PLAYER_TURN_START);
        }
        break;
        
      case CombatState.COMBAT_END:
        this.endCombat();
        this.setState(CombatState.LOOT_DISTRIBUTION);
        break;
        
      case CombatState.LOOT_DISTRIBUTION:
        this.distributeLoot();
        // Combat is complete
        break;
    }
  }

  setState(newState: CombatState): void {
    if (this.canTransition(this.currentState, newState)) {
      this.currentState = newState;
      this.addLogEntry(`Combat state: ${newState}`, 'system');
    }
  }

  canTransition(fromState: CombatState, toState: CombatState): boolean {
    // Define valid state transitions
    const validTransitions: { [key in CombatState]: CombatState[] } = {
      [CombatState.INITIALIZING]: [CombatState.ROLL_INITIATIVE],
      [CombatState.ROLL_INITIATIVE]: [CombatState.PLAYER_TURN_START],
      [CombatState.PLAYER_TURN_START]: [CombatState.PLAYER_ACTION_SELECT],
      [CombatState.PLAYER_ACTION_SELECT]: [CombatState.PLAYER_ACTION_RESOLVE],
      [CombatState.PLAYER_ACTION_RESOLVE]: [CombatState.ENEMY_TURN_START],
      [CombatState.ENEMY_TURN_START]: [CombatState.ENEMY_INTENT],
      [CombatState.ENEMY_INTENT]: [CombatState.ENEMY_ACTION_RESOLVE],
      [CombatState.ENEMY_ACTION_RESOLVE]: [CombatState.BETWEEN_TURNS],
      [CombatState.BETWEEN_TURNS]: [CombatState.CHECK_VICTORY],
      [CombatState.CHECK_VICTORY]: [CombatState.CHECK_DEFEAT, CombatState.COMBAT_END],
      [CombatState.CHECK_DEFEAT]: [CombatState.PLAYER_TURN_START, CombatState.COMBAT_END],
      [CombatState.COMBAT_END]: [CombatState.LOOT_DISTRIBUTION],
      [CombatState.LOOT_DISTRIBUTION]: []
    };
    
    return validTransitions[fromState].includes(toState);
  }

  // Player action execution
  async executePlayerAction(action: PlayerAction): Promise<void> {
    if (this.currentState !== CombatState.PLAYER_ACTION_SELECT) {
      throw new Error('Cannot execute player action in current state');
    }
    
    if (!action.isValid) {
      this.addLogEntry(`Invalid action: ${action.invalidReason}`, 'system');
      return;
    }
    
    this.pendingPlayerAction = action;
    this.setState(CombatState.PLAYER_ACTION_RESOLVE);
  }

  // Enemy action execution
  async executeEnemyAction(enemy: EnemyImpl): Promise<void> {
    const intent = enemy.selectIntent();
    enemy.executeIntent([this.player, ...this.enemies]);
    
    this.addLogEntry(`${enemy.name} ${intent.description}`, 'action', enemy.id);
  }

  // Range management
  getRange(entityId1: EntityId, _entityId2: EntityId): RangeState {
    // For simplicity, use the attacker's range state
    return this.rangeStates.get(entityId1) || RangeState.IN_RANGE;
  }

  changeRange(entityId: EntityId, newRange: RangeState): void {
    this.rangeStates.set(entityId, newRange);
    this.addLogEntry(`${entityId} changed range to ${newRange}`, 'action');
  }

  // Victory/defeat checking
  checkVictory(): boolean {
    return this.enemies.every(enemy => enemy.currentHealth <= 0);
  }

  checkDefeat(): boolean {
    return this.player.currentHealth <= 0;
  }

  // Loot generation
  generateLoot(): Item[] {
    const loot: Item[] = [];
    
    for (const enemy of this.enemies) {
      // Generate loot based on enemy loot tier and type
      const lootRolls = this.calculateLootRolls(enemy);
      
      for (let i = 0; i < lootRolls; i++) {
        // 70% chance for equipment, 20% crafting materials, 10% keys
        const roll = Math.random();
        
        if (roll < 0.7) {
          // Generate equipment item
          try {
            const item = this.itemFactory.generateRandomItem(enemy.lootTier);
            loot.push(item);
          } catch (error) {
            // Fallback to crafting material if no templates available
            const material = this.generateCraftingMaterialForTier(enemy.lootTier);
            loot.push(material);
          }
        } else if (roll < 0.9) {
          // Generate crafting material
          const material = this.generateCraftingMaterialForTier(enemy.lootTier);
          loot.push(material);
        } else {
          // Generate dungeon key (rare)
          const key = this.itemFactory.generateDungeonKey(
            Math.min(enemy.lootTier + 1, 5), // Keys for next tier
            'generic'
          );
          loot.push(key);
        }
      }
      
      // Elite and boss enemies have guaranteed additional loot
      if (enemy.isElite) {
        const bonusItem = this.itemFactory.generateRandomItem(enemy.lootTier);
        loot.push(bonusItem);
      }
      
      if (enemy.isBoss) {
        // Bosses drop multiple guaranteed items
        for (let i = 0; i < 2 + Math.floor(enemy.lootTier / 2); i++) {
          const bossLoot = this.itemFactory.generateRandomItem(enemy.lootTier);
          loot.push(bossLoot);
        }
        
        // Bosses always drop a key for the next tier
        const bossKey = this.itemFactory.generateDungeonKey(
          Math.min(enemy.lootTier + 1, 5),
          'boss'
        );
        loot.push(bossKey);
      }
    }
    
    return loot;
  }

  private calculateLootRolls(enemy: EnemyImpl): number {
    // Base loot rolls based on enemy tier
    const baseLootRolls = Math.max(1, Math.floor(enemy.lootTier / 2));
    
    // Random variance (±1)
    const variance = Math.random() < 0.5 ? -1 : (Math.random() < 0.7 ? 0 : 1);
    
    return Math.max(1, baseLootRolls + variance);
  }

  private generateCraftingMaterialForTier(tier: number): Item {
    const materials = [
      'transmutation_orb',  // Tier 1-2
      'alteration_orb',     // Tier 2-3
      'alchemy_orb',        // Tier 3-4
      'chaos_orb',          // Tier 4-5
      'exalted_orb'         // Tier 5
    ];
    
    // Select appropriate material for tier
    const materialIndex = Math.min(Math.max(0, tier - 1), materials.length - 1);
    const materialType = materials[materialIndex];
    
    // Higher tiers have chance for higher-tier materials
    if (tier >= 3 && Math.random() < 0.3) {
      const upgradeIndex = Math.min(materialIndex + 1, materials.length - 1);
      return this.itemFactory.generateCraftingMaterial(materials[upgradeIndex]);
    }
    
    return this.itemFactory.generateCraftingMaterial(materialType);
  }

  applyKeyModifiers(loot: Item[]): Item[] {
    let modifiedLoot = [...loot];
    
    for (const modifier of this.keyModifiers) {
      if (modifier.effects.lootTierBonus) {
        // Upgrade existing loot to higher tiers
        modifiedLoot = modifiedLoot.map(item => {
          if (item.type === ItemType.WEAPON || item.type === ItemType.ARMOR) {
            try {
              const upgradedTier = Math.min(5, this.dungeonTier + modifier.effects.lootTierBonus!);
              return this.itemFactory.generateRandomItem(upgradedTier);
            } catch (error) {
              return item; // Keep original if upgrade fails
            }
          }
          return item;
        });
      }
      
      if (modifier.effects.lootQuantityMultiplier) {
        // Generate additional loot items
        const bonusCount = Math.floor(loot.length * (modifier.effects.lootQuantityMultiplier! - 1));
        for (let i = 0; i < bonusCount; i++) {
          try {
            const bonusItem = this.itemFactory.generateRandomItem(this.dungeonTier);
            modifiedLoot.push(bonusItem);
          } catch (error) {
            // Fallback to crafting material
            const material = this.generateCraftingMaterialForTier(this.dungeonTier);
            modifiedLoot.push(material);
          }
        }
      }
    }
    
    return modifiedLoot;
  }

  // Private state processing methods
  private rollInitiative(): void {
    const allEntities = [this.player, ...this.enemies];
    
    // Calculate initiative for each entity
    const initiatives = allEntities.map(entity => ({
      id: entity.id,
      initiative: entity.computedStats.initiative + Math.random() * 20
    }));
    
    // Sort by initiative (highest first)
    initiatives.sort((a, b) => b.initiative - a.initiative);
    
    this.turnOrder = initiatives.map(i => i.id);
    this.addLogEntry('Initiative order determined', 'system');
  }

  private processPlayerTurnStart(): void {
    // Process turn start effects
    this.effectProcessor.processEffects(
      EffectTrigger.TURN_START,
      { trigger: EffectTrigger.TURN_START, targetId: this.player.id, sourceId: this.player.id },
      this.effectProcessor.getEffects(this.player.id)
    );
    
    // Reset player action flags
    this.player.canAct = true;
    this.player.clearTemporaryEffects();
    
    this.addLogEntry('Your turn begins', 'system');
  }

  private resolvePlayerAction(): void {
    if (!this.pendingPlayerAction) return;
    
    const action = this.pendingPlayerAction;
    
    switch (action.type) {
      case CombatAction.ATTACK:
        this.executeAttackAction(action as AttackAction);
        break;
      case CombatAction.BLOCK:
        this.executeBlockAction(action as BlockAction);
        break;
      case CombatAction.CAST_ABILITY:
        this.executeCastAbilityAction(action as CastAbilityAction);
        break;
      case CombatAction.TOGGLE_ABILITY:
        this.executeToggleAbilityAction(action as ToggleAbilityAction);
        break;
      case CombatAction.MOVE:
        this.executeMoveAction(action as MoveAction);
        break;
      case CombatAction.ESCAPE:
        this.executeEscapeAction(action as EscapeAction);
        break;
    }
    
    this.pendingPlayerAction = undefined;
  }

  private executeAttackAction(action: AttackAction): void {
    const target = this.enemies.find(e => e.id === action.targetId);
    if (!target) return;
    
    // Calculate damage
    const damage = this.calculateDamage(this.player, target, action.weaponUsed);
    
    // Apply damage
    const wasAlive = target.takeDamage(damage.finalDamage);
    
    // Record damage
    this.recordDamage(this.player.id, target.id, damage);
    
    if (!wasAlive) {
      this.addLogEntry(`${target.name} is defeated!`, 'damage');
    }
  }

  private executeBlockAction(_action: BlockAction): void {
    // Apply block effect exactly per GDD
    this.player.tempStatModifiers.armor = this.player.computedStats.armor; // Double current armor
    
    const blockEffect = EffectFactory.createBlock({ sourceId: this.player.id });
    this.player.addEffect(blockEffect);
    
    this.addLogEntry('You raise your guard, doubling armor and reducing damage by 25%', 'action');
  }

  private executeCastAbilityAction(action: CastAbilityAction): void {
    // Check mana cost
    if (this.player.currentMana < action.manaCost) {
      this.addLogEntry(`Not enough mana to cast ${action.abilityId}!`, 'error');
      return;
    }

    // Deduct mana cost
    this.player.takeMana(action.manaCost);

    // Execute ability based on target type
    switch (action.targetType) {
      case 'self':
        this.castSelfTargetedAbility(action);
        break;
      case 'single_enemy':
        this.castEnemyTargetedAbility(action);
        break;
      case 'all_enemies':
        this.castAreaAbility(action);
        break;
      default:
        this.addLogEntry(`Unknown target type: ${action.targetType}`, 'error');
    }
  }

  private castSelfTargetedAbility(action: CastAbilityAction): void {
    this.addLogEntry(`You cast ${action.abilityId}!`, 'action');

    // Apply status effect if specified
    if (action.statusEffect && action.statusEffectChance > 0) {
      const chance = Math.random() * 100;
      if (chance <= action.statusEffectChance) {
        // Apply the status effect to the player
        this.effectProcessor.applyStatusEffect(
          this.player.id,
          action.statusEffect,
          action.duration || 3
        );
        this.addLogEntry(`${action.statusEffect} effect applied!`, 'buff');
      }
    }
  }

  private castEnemyTargetedAbility(action: CastAbilityAction): void {
    // Find target enemy (for now, target first alive enemy)
    const target = this.enemies.find(e => e.currentHealth > 0);
    if (!target) {
      this.addLogEntry('No valid targets!', 'error');
      return;
    }

    this.addLogEntry(`You cast ${action.abilityId} at ${target.name}!`, 'action');

    // Calculate damage if it's a damage ability
    if (action.effectType === 'magical_damage' || action.effectType === 'damage') {
      const baseDamage = this.player.computedStats.damage * action.magnitude;
      const finalDamage = Math.max(1, baseDamage - target.computedStats.armor);
      
      target.takeDamage(finalDamage);
      this.addLogEntry(`${target.name} takes ${finalDamage} damage!`, 'damage');

      // Apply status effect if specified
      if (action.statusEffect && action.statusEffectChance > 0) {
        const chance = Math.random() * 100;
        if (chance <= action.statusEffectChance) {
          this.effectProcessor.applyStatusEffect(
            target.id,
            action.statusEffect,
            action.duration || 3
          );
          this.addLogEntry(`${target.name} is affected by ${action.statusEffect}!`, 'debuff');
        }
      }
    }
  }

  private castAreaAbility(action: CastAbilityAction): void {
    this.addLogEntry(`You cast ${action.abilityId} affecting all enemies!`, 'action');

    for (const enemy of this.enemies.filter(e => e.currentHealth > 0)) {
      // Calculate damage if it's a damage ability
      if (action.effectType === 'magical_damage' || action.effectType === 'damage') {
        const baseDamage = this.player.computedStats.damage * action.magnitude;
        const finalDamage = Math.max(1, baseDamage - enemy.computedStats.armor);
        
        enemy.takeDamage(finalDamage);
        this.addLogEntry(`${enemy.name} takes ${finalDamage} damage!`, 'damage');
      }

      // Apply status effect if specified
      if (action.statusEffect && action.statusEffectChance > 0) {
        const chance = Math.random() * 100;
        if (chance <= action.statusEffectChance) {
          this.effectProcessor.applyStatusEffect(
            enemy.id,
            action.statusEffect,
            action.duration || 3
          );
          this.addLogEntry(`${enemy.name} is affected by ${action.statusEffect}!`, 'debuff');
        }
      }
    }
  }

  private executeToggleAbilityAction(action: ToggleAbilityAction): void {
    // Toggle ability on/off
    this.addLogEntry(`Toggled ${action.abilityId} ${action.newState ? 'on' : 'off'}`, 'action');
  }

  private executeMoveAction(action: MoveAction): void {
    this.changeRange(this.player.id, action.newRangeState);
  }

  private executeEscapeAction(action: EscapeAction): void {
    if (Math.random() < action.successChance) {
      this.escapedCombat = true;
      this.addLogEntry('Successfully escaped from combat!', 'system');
      this.setState(CombatState.COMBAT_END);
    } else {
      this.addLogEntry('Failed to escape!', 'system');
    }
  }

  private processEnemyTurnStart(): void {
    for (const enemy of this.enemies.filter(e => e.currentHealth > 0)) {
      // Process turn start effects for each enemy
      this.effectProcessor.processEffects(
        EffectTrigger.TURN_START,
        { trigger: EffectTrigger.TURN_START, targetId: enemy.id, sourceId: enemy.id },
        this.effectProcessor.getEffects(enemy.id)
      );
      
      enemy.clearTemporaryEffects();
    }
  }

  private generateEnemyIntents(): void {
    const allTargets = [this.player, ...this.enemies.filter(e => e.currentHealth > 0)];
    
    for (const enemy of this.enemies.filter(e => e.currentHealth > 0)) {
      const intent = enemy.selectIntent(allTargets);
      this.addLogEntry(`${enemy.name}: ${intent.description}`, 'action');
    }
  }

  private resolveEnemyActions(): void {
    for (const enemy of this.enemies.filter(e => e.currentHealth > 0)) {
      this.executeEnemyAction(enemy);
    }
  }

  private processBetweenTurns(): void {
    // Advance effect durations
    this.effectProcessor.advanceDurations(EffectTrigger.TURN_END);
    this.effectProcessor.cleanupExpiredEffects();
    
    // Process any end-of-turn effects
    for (const entity of [this.player, ...this.enemies]) {
      this.effectProcessor.processEffects(
        EffectTrigger.TURN_END,
        { trigger: EffectTrigger.TURN_END, targetId: entity.id, sourceId: entity.id },
        this.effectProcessor.getEffects(entity.id)
      );
    }
  }

  private nextTurn(): void {
    this.currentTurn++;
    this.addLogEntry(`Turn ${this.currentTurn}`, 'system');
  }

  private endCombat(): void {
    if (this.checkVictory()) {
      this.addLogEntry('Victory! All enemies defeated.', 'system');
    } else if (this.checkDefeat()) {
      this.addLogEntry('Defeat! You have been overcome.', 'system');
      this.applyDefeatPenalties();
    }
  }

  private distributeLoot(): void {
    if (this.checkVictory()) {
      const loot = this.generateLoot();
      const modifiedLoot = this.applyKeyModifiers(loot);
      
      // Add loot to player inventory
      for (const item of modifiedLoot) {
        if (this.player.addToInventory(item)) {
          this.addLogEntry(`Found: ${item.name}`, 'system');
        }
      }
    }
  }

  private applyDefeatPenalties(): void {
    // Per GDD: lose key, lose backpack items, chance to lose equipped item
    const penalties: DefeatPenaltyResult = {
      keyLost: true, // Always lose the key
      backpackItemsLost: [...this.player.inventory.items], // Lose all backpack items
      penaltyMessages: [],
      totalValueLost: 0
    };
    
    // Clear backpack
    this.player.inventory.items = [];
    penalties.penaltyMessages.push('All items in your backpack are lost');
    
    // Chance to lose equipped item (high risk per GDD)
    const equippedItemLossChance = 0.25; // 25% chance, to be tuned
    if (Math.random() < equippedItemLossChance) {
      const equippedItems = this.player.equipment.getAllEquipped();
      if (equippedItems.length > 0) {
        const randomItem = equippedItems[Math.floor(Math.random() * equippedItems.length)];
        penalties.equippedItemLost = randomItem;
        penalties.penaltyMessages.push(`Lost equipped item: ${randomItem.name}`);
        
        // Remove from equipment (implementation would need to find and clear the slot)
      }
    }
    
    for (const message of penalties.penaltyMessages) {
      this.addLogEntry(message, 'system');
    }
  }

  // Damage calculation
  calculateDamage(attacker: Entity, target: Entity, weapon?: Item): DamageCalculation {
    const baseDamage = attacker.computedStats.damage + (weapon?.equipment?.inherentStats.damage || 0);
    
    // Hit calculation
    const hitRoll = Math.random() * 100;
    const hitChance = attacker.computedStats.accuracy || 85;
    const hitSuccess = hitRoll <= hitChance;
    
    if (!hitSuccess) {
      return {
        attacker,
        target,
        baseDamage,
        damageType: DamageType.PHYSICAL,
        rawDamage: baseDamage,
        hitRoll,
        hitSuccess: false,
        criticalRoll: 0,
        criticalSuccess: false,
        finalDamage: 0,
        armorReduction: 0,
        resistanceReduction: 0,
        dodgeRoll: 0,
        dodgeSuccess: false,
        blockReduction: 0,
        damageDealt: 0,
        healthDamage: 0,
        energyShieldDamage: 0,
        onHitEffects: [],
        statusesApplied: [],
        showCritical: false,
        showDodge: false,
        showBlock: false,
        combatMessage: 'Attack missed!'
      };
    }
    
    // Critical calculation
    const criticalRoll = Math.random() * 100;
    const criticalChance = attacker.computedStats.criticalChance || 5;
    const criticalSuccess = criticalRoll <= criticalChance;
    
    let finalDamage = baseDamage;
    if (criticalSuccess) {
      finalDamage *= 2; // Double damage on crit
    }
    
    // Armor reduction
    const armorReduction = Math.floor(target.computedStats.armor * 0.5); // Simplified armor calculation
    finalDamage = Math.max(1, finalDamage - armorReduction);
    
    return {
      attacker,
      target,
      baseDamage,
      damageType: DamageType.PHYSICAL,
      rawDamage: baseDamage,
      hitRoll,
      hitSuccess,
      criticalRoll,
      criticalSuccess,
      finalDamage,
      armorReduction,
      resistanceReduction: 0,
      dodgeRoll: 0,
      dodgeSuccess: false,
      blockReduction: 0,
      damageDealt: finalDamage,
      healthDamage: finalDamage,
      energyShieldDamage: 0,
      onHitEffects: [],
      statusesApplied: [],
      showCritical: criticalSuccess,
      showDodge: false,
      showBlock: false,
      combatMessage: criticalSuccess ? `Critical hit for ${finalDamage} damage!` : `Hit for ${finalDamage} damage`
    };
  }

  private recordDamage(attackerId: EntityId, targetId: EntityId, damage: DamageCalculation): void {
    const record: DamageRecord = {
      turn: this.currentTurn,
      attackerId,
      targetId,
      damage: {
        amount: damage.baseDamage,
        type: damage.damageType,
        isCritical: damage.criticalSuccess || false,
        source: attackerId
      },
      finalDamage: damage.finalDamage,
      wasCritical: damage.criticalSuccess,
      wasBlocked: damage.showBlock,
      wasDodged: damage.dodgeSuccess,
      timestamp: Date.now()
    };
    
    this.damageHistory.push(record);
    this.addLogEntry(damage.combatMessage, 'damage', attackerId);
  }

  private addLogEntry(message: string, type: CombatLogEntry['type'], entityId?: EntityId): void {
    this.combatLog.push({
      turn: this.currentTurn,
      message,
      type,
      entityId,
      timestamp: Date.now()
    });
  }

  // Public utility methods
  getCombatResult(): CombatResult {
    const isVictory = this.checkVictory();
    const isDefeat = this.checkDefeat();
    
    return {
      outcome: isVictory ? 'victory' : isDefeat ? 'defeat' : 'escape',
      loot: isVictory ? this.generateLoot() : undefined,
      experience: isVictory ? this.calculateExperienceReward() : undefined,
      gold: isVictory ? this.calculateGoldReward() : undefined,
      totalDamageDealt: this.damageHistory.filter(d => d.attackerId === this.player.id)
        .reduce((sum, d) => sum + d.finalDamage, 0),
      totalDamageTaken: this.damageHistory.filter(d => d.targetId === this.player.id)
        .reduce((sum, d) => sum + d.finalDamage, 0),
      turnsElapsed: this.currentTurn,
      abilitiesUsed: [], // Track abilities used
      combatLog: this.combatLog
    };
  }

  calculateExperienceReward(): number {
    return this.enemies.reduce((sum, enemy) => sum + enemy.experienceReward, 0);
  }

  calculateGoldReward(): number {
    return this.enemies.reduce((sum, enemy) => {
      const [min, max] = enemy.goldReward;
      return sum + Math.floor(Math.random() * (max - min + 1)) + min;
    }, 0);
  }
}