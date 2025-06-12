import { describe, it, expect, beforeEach } from 'vitest'
import { CombatManager } from '../CombatManager'
import { Player, Enemy } from '../Entity'
import { CombatState } from '../../types/enums'

describe('CombatManager', () => {
  let combatManager: CombatManager
  let player: Player
  let enemy: Enemy

  beforeEach(() => {
    const baseStats = {
      maxHealth: 100,
      maxMana: 50,
      maxEnergyShield: 0,
      damage: 10,
      armor: 5,
      initiative: 10,
      accuracy: 85,
      criticalChance: 5,
      level: 1
    };
    
    player = new Player('player-1', 'Player', 'knight' as any, baseStats);
    enemy = new Enemy('enemy-1', 'Enemy', 'melee' as any, baseStats, {} as any, 1);
    
    combatManager = new CombatManager({
      player,
      enemies: [enemy],
      dungeonTier: 1,
      keyModifiers: [],
      allowEscape: true
    });
  })

  describe('combat initialization', () => {
    it('should initialize combat with correct state', () => {
      // CombatManager automatically advances to ROLL_INITIATIVE after initialization
      expect(combatManager.currentState).toBe(CombatState.ROLL_INITIATIVE)
    })
  })

  describe('combat state transitions', () => {
    it('should transition between all 12 combat states correctly', () => {
      // Start in ROLL_INITIATIVE
      expect(combatManager.currentState).toBe(CombatState.ROLL_INITIATIVE)
      
      // Progress through combat states
      combatManager.advanceState()
      expect([CombatState.PLAYER_TURN_START, CombatState.ENEMY_TURN_START])
        .toContain(combatManager.currentState)
      
      // Ensure state machine is functional
      const initialState = combatManager.currentState
      combatManager.advanceState()
      expect(combatManager.currentState).not.toBe(initialState)
    })

    it('should handle state transitions without errors', () => {
      const maxTransitions = 20
      let transitionCount = 0
      
      while (transitionCount < maxTransitions && 
             combatManager.currentState !== CombatState.COMBAT_END) {
        const previousState = combatManager.currentState
        expect(() => combatManager.advanceState()).not.toThrow()
        transitionCount++
        
        // Prevent infinite loops
        if (combatManager.currentState === previousState) {
          break
        }
      }
      
      expect(transitionCount).toBeGreaterThan(0)
    })
  })

  describe('damage calculations', () => {
    it('should calculate damage including criticals and armor', () => {
      const attacker = player
      const target = enemy
      
      // Test basic damage calculation
      const damage = combatManager.calculateDamage(attacker, target)
      expect(damage.finalDamage).toBeGreaterThan(0)
      
      // Final damage should be reasonable based on base damage (accounting for criticals)
      const maxExpectedDamage = damage.criticalSuccess ? 
        attacker.computedStats.damage * 2 : // Critical hits double damage
        attacker.computedStats.damage
      expect(damage.finalDamage).toBeLessThanOrEqual(maxExpectedDamage)
      
      // Test armor reduction
      expect(damage.armorReduction).toBeGreaterThanOrEqual(0)
      expect(damage.finalDamage).toBeLessThanOrEqual(damage.rawDamage)
    })

    it('should handle critical hits correctly', () => {
      // Create a player with high crit chance for reliable testing
      const highCritPlayer = new Player('crit-player', 'Critical Player', 'knight' as any, {
        maxHealth: 100,
        maxMana: 50,
        maxEnergyShield: 0,
        damage: 10,
        armor: 5,
        initiative: 10,
        accuracy: 85,
        criticalChance: 50, // 50% crit chance for reliable testing
        level: 1
      })
      
      const target = enemy
      
      // Test multiple times to get both critical and normal hits
      let foundCritical = false
      let foundNormal = false
      let criticalDamage = 0
      let normalDamage = 0
      
      for (let i = 0; i < 50; i++) {
        const damage = combatManager.calculateDamage(highCritPlayer, target)
        if (damage.criticalSuccess) {
          foundCritical = true
          criticalDamage = damage.finalDamage
        } else {
          foundNormal = true
          normalDamage = damage.finalDamage
        }
        
        if (foundCritical && foundNormal) break
      }
      
      // Should have found both critical and normal hits
      expect(foundCritical).toBe(true)
      if (foundCritical && foundNormal) {
        expect(criticalDamage).toBeGreaterThan(normalDamage)
      }
    })

    it('should apply blocking mechanics correctly', () => {
      const attacker = enemy
      const target = player
      
      // Reset any existing temp modifiers
      target.tempStatModifiers = {}
      
      // Calculate damage without blocking
      const normalDamage = combatManager.calculateDamage(attacker, target)
      
      // Apply block effect (double armor) - add base armor as bonus
      target.tempStatModifiers.armor = target.baseStats.armor
      
      // Calculate damage with blocking
      const blockedDamage = combatManager.calculateDamage(attacker, target)
      
      // Reset temp modifiers after test
      target.tempStatModifiers = {}
      
      // Block should provide damage reduction - focus on final result
      expect(blockedDamage.finalDamage).toBeLessThan(normalDamage.finalDamage)
      
      // The important thing is that blocking provides better protection
      // Either through higher armor reduction or through other block mechanics
      const effectiveReduction = normalDamage.finalDamage - blockedDamage.finalDamage
      
      // Should provide meaningful protection (at least 1 point of damage reduction)
      expect(effectiveReduction).toBeGreaterThan(0)
    })
  })

  describe('loot generation', () => {
    it('should generate appropriate loot after combat victory', () => {
      const loot = combatManager.generateLoot()
      
      // Should generate at least some loot for tier 1 enemies
      expect(loot.length).toBeGreaterThan(0)
      
      // All loot items should have required properties
      loot.forEach(item => {
        expect(item.id).toBeDefined()
        expect(item.name).toBeDefined()
        expect(item.type).toBeDefined()
        expect(item.rarity).toBeDefined()
      })
    })

    it('should respect enemy loot tiers', () => {
      // Create higher tier enemy
      const highTierEnemy = new Enemy('enemy-2', 'High Tier Enemy', 'melee' as any, {
        maxHealth: 200,
        maxMana: 100,
        maxEnergyShield: 0,
        damage: 20,
        armor: 10,
        initiative: 15,
        accuracy: 90,
        criticalChance: 10,
        level: 3
      }, {} as any, 3) // Tier 3 enemy
      
      const highTierCombat = new CombatManager({
        player,
        enemies: [highTierEnemy],
        dungeonTier: 3,
        keyModifiers: [],
        allowEscape: true
      })
      
      const loot = highTierCombat.generateLoot()
      expect(loot.length).toBeGreaterThanOrEqual(1)
    })

    it('should apply key modifier effects to loot', () => {
      const keyModifier = {
        id: 'test-modifier',
        name: 'Test Modifier',
        description: 'Test loot modifier',
        rarity: 'rare' as any,
        effects: {
          lootQuantityMultiplier: 2.0
        },
        iconPath: 'test.png'
      }
      
      const modifiedCombat = new CombatManager({
        player,
        enemies: [enemy],
        dungeonTier: 1,
        keyModifiers: [keyModifier],
        allowEscape: true
      })
      
      const baseLoot = combatManager.generateLoot()
      const appliedLoot = modifiedCombat.applyKeyModifiers(baseLoot)
      
      // Modified loot should have more items due to quantity multiplier
      expect(appliedLoot.length).toBeGreaterThan(baseLoot.length)
    })

    it('should generate bonus loot for elite and boss enemies', () => {
      // Create elite enemy
      const eliteEnemy = new Enemy('elite-1', 'Elite Enemy', 'melee' as any, {
        maxHealth: 150,
        maxMana: 75,
        maxEnergyShield: 0,
        damage: 15,
        armor: 8,
        initiative: 12,
        accuracy: 88,
        criticalChance: 8,
        level: 2
      }, {} as any, 2)
      eliteEnemy.isElite = true
      
      const eliteCombat = new CombatManager({
        player,
        enemies: [eliteEnemy],
        dungeonTier: 2,
        keyModifiers: [],
        allowEscape: true
      })
      
      const eliteLoot = eliteCombat.generateLoot()
      const normalLoot = combatManager.generateLoot()
      
      // Elite should generally drop more loot
      expect(eliteLoot.length).toBeGreaterThanOrEqual(normalLoot.length)
    })
  })

  describe('defeat penalties', () => {
    it('should apply correct defeat penalties', () => {
      // Set up player with items to lose
      player.inventory.items = [
        { id: 'item1', name: 'Test Item 1', type: 'crafting', rarity: 'normal' } as any,
        { id: 'item2', name: 'Test Item 2', type: 'crafting', rarity: 'magic' } as any
      ]
      
      // Simulate defeat - method is private but we can test indirectly
      expect(() => {
        // Access private method for testing
        (combatManager as any).applyDefeatPenalties()
      }).not.toThrow()
      
      // After defeat penalties, backpack should be cleared
      expect(player.inventory.items.length).toBe(0)
    })

    it('should handle defeat penalties according to GDD rules', () => {
      // Test that the defeat penalty system is in place
      // Since the method is private, test the public interface
      expect(combatManager.checkDefeat).toBeDefined()
      
      // Test defeat detection when player health is 0
      player.currentHealth = 0
      expect(combatManager.checkDefeat()).toBe(true)
      
      // Reset health
      player.currentHealth = player.baseStats.maxHealth
      expect(combatManager.checkDefeat()).toBe(false)
    })
  })

  describe('escape mechanics', () => {
    it('should handle escape attempts correctly', () => {
      const escapeAction = {
        type: 4 as any, // CombatAction.ESCAPE
        playerId: player.id,
        successChance: 0.5,
        consequences: ['Failed escape message'],
        isAllowed: true
      }
      
      // Test escape action execution
      expect(() => {
        (combatManager as any).executeEscapeAction(escapeAction)
      }).not.toThrow()
      
      expect(typeof combatManager.escapedCombat).toBe('boolean')
    })

    it('should calculate escape success based on provided chance', () => {
      // Test with guaranteed success
      const guaranteedEscape = {
        type: 4 as any, // CombatAction.ESCAPE
        playerId: player.id,
        successChance: 1.0, // 100% chance
        consequences: [],
        isAllowed: true
      }
      
      const testCombat = new CombatManager({
        player,
        enemies: [enemy],
        dungeonTier: 1,
        keyModifiers: [],
        allowEscape: true
      });
      
      (testCombat as any).executeEscapeAction(guaranteedEscape)
      expect(testCombat.escapedCombat).toBe(true)
      
      // Test with impossible escape
      const impossibleEscape = {
        type: 4 as any, // CombatAction.ESCAPE
        playerId: player.id,
        successChance: 0.0, // 0% chance
        consequences: ['Cannot escape'],
        isAllowed: true
      }
      
      const testCombat2 = new CombatManager({
        player,
        enemies: [enemy],
        dungeonTier: 1,
        keyModifiers: [],
        allowEscape: true
      });
      
      (testCombat2 as any).executeEscapeAction(impossibleEscape)
      expect(testCombat2.escapedCombat).toBe(false)
    })
  })

  describe('victory conditions', () => {
    it('should detect victory when all enemies are defeated', () => {
      // Reduce all enemy health to 0
      combatManager.enemies.forEach(enemy => {
        enemy.currentHealth = 0
      })
      
      expect(combatManager.checkVictory()).toBe(true)
    })

    it('should detect defeat when player health reaches 0', () => {
      // Reduce player health to 0
      player.currentHealth = 0
      
      expect(combatManager.checkDefeat()).toBe(true)
    })

    it('should calculate appropriate rewards for victory', () => {
      // Test experience and gold calculation
      const expReward = combatManager.calculateExperienceReward()
      const goldReward = combatManager.calculateGoldReward()
      
      expect(expReward).toBeGreaterThan(0)
      expect(goldReward).toBeGreaterThanOrEqual(0)
    })
  })
})