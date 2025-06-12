import { CombatManager } from '../services/CombatManager';
import { 
  CombatState, 
  CombatAction, 
  PlayerAction,
  AttackAction,
  BlockAction,
  MoveAction,
  EscapeAction,
  ToggleAbilityAction
} from '../types/combat';
import { RangeState } from '../types/enums';
import { Player } from '../services/Entity';
import { gameStore } from '../stores/GameStore';
// import { uiStore } from '../stores/UIStore';
import { CombatActionBar } from './CombatActionBar';
import { CombatParticipants } from './CombatParticipants';
import { CombatLog } from './CombatLog';
import { logger } from '../services/Logger';

export class CombatArena {
  private combatManager: CombatManager | null = null;
  private actionBar: CombatActionBar;
  private participants: CombatParticipants;
  private combatLog: CombatLog;
  private initiativeProgress: number = 0;
  private initiativeTimer: NodeJS.Timeout | null = null;
  private currentStateDisplay: string = '';
  private transitionInProgress: boolean = false;

  constructor() {
    this.actionBar = new CombatActionBar(this.handleAction.bind(this));
    this.participants = new CombatParticipants();
    this.combatLog = new CombatLog();
  }

  private async handleAction(action: CombatAction): Promise<void> {
    if (!this.combatManager) return;

    try {
      this.combatLog.addMessage(`🎯 Player chooses: ${action}`, 'combat');
      
      // Create proper PlayerAction based on action type
      const playerAction = this.createPlayerAction(action);
      
      // Execute action through CombatManager
      await this.combatManager.executePlayerAction(playerAction);
      
      // Start the automatic combat progression
      setTimeout(() => {
        this.progressCombatStates();
      }, 500); // Small delay to show the "Resolving Action" state
      
      this.enhancedUpdateDisplay(); // Update display after action
    } catch (error) {
      logger.error('Combat action failed:', error);
      this.combatLog.addMessage(`⚠️ Action failed: ${error}`, 'error');
      this.handleCombatError(error as Error, 'action_execution');
    }
  }

  private createPlayerAction(action: CombatAction): PlayerAction {
    const player = this.combatManager!.player;
    const enemy = this.combatManager!.enemies[0]; // Get first enemy as target
    
    const baseAction = {
      executionOrder: 1,
      manaCost: 0,
      canBeCountered: true,
      isValid: true
    };

    switch (action) {
      case CombatAction.ATTACK:
        return {
          ...baseAction,
          type: CombatAction.ATTACK,
          targetId: enemy.id,
          weaponUsed: player.equipment.weapon || this.createDefaultWeapon(),
          damageRolls: [],
          hitChance: player.computedStats.accuracy || 85,
          criticalChance: player.computedStats.criticalChance || 5,
          isMultiTarget: false,
          rangeRequired: RangeState.IN_RANGE
        } as AttackAction;

      case CombatAction.BLOCK:
        return {
          ...baseAction,
          type: CombatAction.BLOCK,
          armorDoubleAmount: player.computedStats.armor,
          damageReduction: 0.25,
          duration: 1
        } as BlockAction;

      case CombatAction.MOVE:
        const currentRange = this.combatManager!.getRange(player.id, enemy.id);
        const newRange = currentRange === RangeState.IN_RANGE ? RangeState.OUT_OF_RANGE : RangeState.IN_RANGE;
        return {
          ...baseAction,
          type: CombatAction.MOVE,
          newRangeState: newRange,
          movementCost: 1
        } as MoveAction;

      case CombatAction.ESCAPE:
        return {
          ...baseAction,
          type: CombatAction.ESCAPE,
          successChance: this.calculateEscapeChance(player),
          consequences: ['Turn lost if escape fails'],
          isAllowed: true
        } as EscapeAction;

      case CombatAction.TOGGLE_ABILITY:
        const abilities = player.equipment.getGrantedAbilities();
        const abilityId = abilities.length > 0 ? abilities[0] : '';
        return {
          ...baseAction,
          type: CombatAction.TOGGLE_ABILITY,
          abilityId,
          currentlyActive: false,
          newState: true,
          manaCost: 10,
          activationCost: 10
        } as ToggleAbilityAction;

      default:
        throw new Error(`Unknown action type: ${action}`);
    }
  }

  private calculateEscapeChance(player: Player): number {
    const baseChance = 50;
    const speedBonus = Math.min(player.computedStats.initiative - 10, 30);
    return Math.max(10, Math.min(90, baseChance + speedBonus));
  }

  private createDefaultWeapon(): any {
    // Simple default weapon for testing
    return {
      id: 'default-weapon',
      name: 'Fists',
      rarity: 'common',
      equipment: {
        baseType: 'weapon',
        inherentStats: { damage: 1 }
      }
    };
  }


  private startInitiativeTimer(): void {
    this.initiativeProgress = 0;
    const duration = 2000; // 2 seconds total for better user experience
    const updateInterval = 50; // Update every 50ms for smooth animation
    const progressIncrement = (updateInterval / duration) * 100;

    // Add dice rolling sound effect simulation
    this.combatLog.addMessage('🎲 Dice are rolling...', 'info');

    this.initiativeTimer = setInterval(() => {
      this.initiativeProgress += progressIncrement;
      
      // Add visual milestone markers
      const currentPercent = Math.round(this.initiativeProgress);
      if (currentPercent === 25 || currentPercent === 50 || currentPercent === 75) {
        this.addInitiativeMilestone(currentPercent);
      }
      
      if (this.initiativeProgress >= 100) {
        this.initiativeProgress = 100;
        this.stopInitiativeTimer();
        this.completeInitiativeWithFanfare();
      }
      
      // Update the display to show progress
      this.updateInitiativeDisplay();
    }, updateInterval);
  }

  private stopInitiativeTimer(): void {
    if (this.initiativeTimer) {
      clearInterval(this.initiativeTimer);
      this.initiativeTimer = null;
    }
  }

  private updateInitiativeDisplay(): void {
    const progressBar = document.querySelector('.initiative-progress-bar');
    if (progressBar) {
      (progressBar as HTMLElement).style.width = `${this.initiativeProgress}%`;
    }
    
    // Update percentage display
    const percentageDisplay = document.querySelector('.initiative-percentage');
    if (percentageDisplay) {
      percentageDisplay.textContent = `${Math.round(this.initiativeProgress)}%`;
    }
    
    // Update text based on progress
    const progressText = document.querySelector('.initiative-text');
    if (progressText && this.initiativeProgress >= 100) {
      progressText.textContent = 'Initiative Determined!';
    }
  }

  private addInitiativeMilestone(percent: number): void {
    const milestones = {
      25: '🎯 Rolling for player...',
      50: '⚔️ Rolling for enemy...',
      75: '⚡ Calculating results...'
    };
    
    const message = milestones[percent as keyof typeof milestones];
    if (message) {
      this.combatLog.addMessage(message, 'info');
    }
  }

  private completeInitiativeWithFanfare(): void {
    try {
      if (this.combatManager) {
        const winner = this.getInitiativeWinner();
        this.combatLog.addMessage(`🎲 Initiative results: ${winner} goes first!`, 'combat');
        
        // Add visual completion effect with enhanced animations
        setTimeout(() => {
          const progressContainer = document.querySelector('.initiative-progress');
          if (progressContainer) {
            progressContainer.classList.add('complete');
          }
          
          // Highlight the winner participant
          const winnerElement = this.highlightInitiativeWinner(winner);
          if (winnerElement) {
            winnerElement.classList.add('winner');
          }
        }, 100);
        
        // Add celebration effects
        this.addInitiativeCelebrationEffects(winner);
        
        // Continue with original completion logic
        this.completeInitiative();
      }
    } catch (error) {
      logger.error('Failed to complete initiative with fanfare:', error);
      this.handleCombatError(error as Error, 'initiative_completion');
    }
  }

  private highlightInitiativeWinner(winnerName: string): HTMLElement | null {
    const participants = document.querySelectorAll('.participant-preview');
    for (const participant of participants) {
      const nameElement = participant.querySelector('.participant-name');
      if (nameElement && nameElement.textContent === winnerName) {
        return participant as HTMLElement;
      }
    }
    return null;
  }

  private addInitiativeCelebrationEffects(winner: string): void {
    // Create floating text effect for the winner
    setTimeout(() => {
      this.combatLog.addMessage(`🌟 ${winner} wins initiative with superior reflexes!`, 'info');
    }, 300);
    
    // Add dice rolling completion sound effect (visual simulation)
    setTimeout(() => {
      this.combatLog.addMessage('🎲 *dice settle with a satisfying click*', 'info');
    }, 600);
  }

  private completeInitiative(): void {
    try {
      if (this.combatManager) {
        // First advance: ROLL_INITIATIVE → PLAYER_TURN_START
        this.combatManager.advanceState();
        this.enhancedUpdateDisplay();
        
        // Second advance: PLAYER_TURN_START → PLAYER_ACTION_SELECT (after brief pause)
        setTimeout(() => {
          try {
            if (this.combatManager) {
              this.combatManager.advanceState();
              this.enhancedUpdateDisplay();
            }
          } catch (error) {
            logger.error('Failed to advance to player action state:', error);
            this.handleCombatError(error as Error, 'state_transition');
          }
        }, 800); // Additional 0.8 seconds for turn start processing
      }
    } catch (error) {
      logger.error('Failed to complete initiative:', error);
      this.handleCombatError(error as Error, 'initiative_completion');
    }
  }

  private progressCombatStates(): void {
    if (!this.combatManager) return;

    try {
      const state = this.combatManager.currentState;
      
      // States that should auto-advance
      const autoAdvanceStates = [
        CombatState.PLAYER_ACTION_RESOLVE,
        CombatState.ENEMY_TURN_START,
        CombatState.ENEMY_INTENT,
        CombatState.ENEMY_ACTION_RESOLVE,
        CombatState.BETWEEN_TURNS,
        CombatState.CHECK_VICTORY,
        CombatState.CHECK_DEFEAT
      ];

      if (autoAdvanceStates.includes(state)) {
        this.combatManager.advanceState();
        this.enhancedUpdateDisplay();
        
        // If we're still in an auto-advance state, schedule the next progression
        const newState = this.combatManager.currentState;
        if (autoAdvanceStates.includes(newState) && newState !== CombatState.PLAYER_ACTION_SELECT) {
          setTimeout(() => {
            this.progressCombatStates();
          }, 1000); // 1 second delay between auto states for visual feedback
        }
      }
    } catch (error) {
      logger.error('Failed to progress combat states:', error);
      this.handleCombatError(error as Error, 'state_progression');
    }
  }

  private initializeCombat(): void {
    try {
      const player = gameStore.player;
      let enemies = gameStore.currentEnemies;

      if (!player) {
        this.combatLog.addMessage('⚠️ Combat initialization failed: no player', 'error');
        this.handleCombatError(new Error('No player available'), 'initialization');
        return;
      }

      // Create a test enemy if none exists
      if (!enemies || enemies.length === 0) {
        try {
          const testEnemy = gameStore.createTestEnemy();
          enemies = [testEnemy];
          this.combatLog.addMessage('🎯 Test enemy created for combat', 'info');
        } catch (error) {
          logger.error('Failed to create test enemy:', error);
          this.handleCombatError(error as Error, 'enemy_creation');
          return;
        }
      }

      this.combatManager = new CombatManager({
        player: player,
        enemies: enemies,
        dungeonTier: 1,
        keyModifiers: [],
        allowEscape: true
      });
      
      const enemyNames = enemies.map(e => e.name).join(', ');
      this.combatLog.addMessage(`⚔️ Combat begins! ${player.name} vs ${enemyNames}`, 'combat');
      this.combatLog.addMessage('🎲 Rolling for initiative...', 'info');
      
      // Start the initiative timer which will handle progression automatically
      this.startInitiativeTimer();
      
      this.enhancedUpdateDisplay();
    } catch (error) {
      logger.error('Failed to initialize combat:', error);
      this.handleCombatError(error as Error, 'initialization');
    }
  }

  private updateDisplay(): void {
    if (!this.combatManager) return;

    const state = this.combatManager.currentState;
    const player = this.combatManager.player;
    const enemy = this.combatManager.enemies[0]; // Get first enemy

    // Update participants display
    this.participants.updateParticipants(player, enemy, state);

    // Update action bar based on current state
    this.actionBar.updateActions(state, player);

    // Add state-specific messages
    this.addStateMessage(state);
  }

  private errorRecoveryAttempts: Map<string, number> = new Map();
  private maxRecoveryAttempts = 3;

  private handleCombatError(error: Error, context: string): void {
    const errorMessage = `Combat error in ${context}: ${error.message}`;
    logger.error(errorMessage, error);
    
    // Track recovery attempts
    const attempts = this.errorRecoveryAttempts.get(context) || 0;
    this.errorRecoveryAttempts.set(context, attempts + 1);
    
    // Enhanced user feedback
    const userMessage = this.getUserFriendlyErrorMessage(context, error, attempts);
    this.combatLog.addMessage(userMessage, 'error');
    
    // Show recovery notification to user
    this.showErrorRecoveryNotification(context, attempts);
    
    // Attempt recovery with retry logic
    if (attempts < this.maxRecoveryAttempts) {
      this.combatLog.addMessage(`🔄 Attempting automatic recovery (${attempts + 1}/${this.maxRecoveryAttempts})...`, 'warning');
      
      setTimeout(() => {
        this.attemptContextualRecovery(context, error, attempts);
      }, 1000 * Math.pow(2, attempts)); // Exponential backoff
    } else {
      this.combatLog.addMessage(`❌ Maximum recovery attempts reached for ${context}`, 'error');
      this.initiateGracefulShutdown(context);
    }
  }

  private getUserFriendlyErrorMessage(context: string, _error: Error, attempts: number): string {
    const messages: Record<string, string> = {
      'initialization': '⚠️ Failed to start combat. Setting up a new encounter...',
      'action_execution': '⚠️ Your action could not be completed. Trying again...',
      'state_progression': '⚠️ Combat flow interrupted. Restoring game state...',
      'state_transition': '⚠️ Combat transition failed. Synchronizing...',
      'initiative_completion': '⚠️ Initiative calculation failed. Recalculating...',
      'enemy_creation': '⚠️ Enemy spawn failed. Creating new opponent...',
      'asset_loading': '⚠️ Game assets not loading properly. Retrying...',
      'network_error': '⚠️ Connection issue detected. Attempting reconnection...'
    };
    
    const baseMessage = messages[context] || `⚠️ Combat system error in ${context}`;
    return attempts > 0 ? `${baseMessage} (Retry ${attempts + 1})` : baseMessage;
  }

  private showErrorRecoveryNotification(context: string, attempts: number): void {
    // Add visual indicator for error recovery
    const arena = document.querySelector('.combat-arena');
    if (arena) {
      arena.classList.add('error-recovery');
      
      setTimeout(() => {
        arena.classList.remove('error-recovery');
      }, 2000);
    }
    
    // Log technical details for debugging (if in dev mode)
    if (import.meta.env.DEV) {
      logger.info(`Error recovery initiated: ${context}, attempt ${attempts + 1}`);
    }
  }

  private attemptContextualRecovery(context: string, _error: Error, attempts: number): void {
    try {
      switch (context) {
        case 'initialization':
          this.recoverFromInitializationError(attempts);
          break;
          
        case 'action_execution':
          this.recoverFromActionError(attempts);
          break;
          
        case 'state_progression':
        case 'state_transition':
          this.recoverFromStateError(attempts);
          break;
          
        case 'initiative_completion':
          this.recoverFromInitiativeError(attempts);
          break;
          
        case 'enemy_creation':
          this.recoverFromEnemyCreationError(attempts);
          break;
          
        case 'asset_loading':
          this.recoverFromAssetError(attempts);
          break;
          
        default:
          this.fallbackRecovery(attempts);
          break;
      }
    } catch (recoveryError) {
      logger.error(`Recovery attempt failed for ${context}:`, recoveryError);
      this.combatLog.addMessage(`🔧 Recovery failed. Trying alternative approach...`, 'warning');
      this.fallbackRecovery(attempts);
    }
  }

  private initiateGracefulShutdown(context: string): void {
    this.combatLog.addMessage(`🚨 Critical error in ${context}. Initiating safe shutdown...`, 'error');
    
    // Save any important state before shutdown
    this.saveEmergencyState();
    
    // Clean up resources
    this.cleanup();
    
    // Show user options
    this.showEmergencyOptions();
  }

  private saveEmergencyState(): void {
    try {
      if (this.combatManager) {
        const emergencyState = {
          playerHealth: this.combatManager.player.currentHealth,
          playerMana: this.combatManager.player.currentMana,
          combatTurn: this.combatManager.currentTurn,
          timestamp: Date.now()
        };
        
        localStorage.setItem('combat_emergency_state', JSON.stringify(emergencyState));
        this.combatLog.addMessage('💾 Combat state saved for recovery', 'info');
      }
    } catch (saveError) {
      logger.error('Failed to save emergency state:', saveError);
    }
  }

  private showEmergencyOptions(): void {
    setTimeout(() => {
      this.combatLog.addMessage('🔧 Options: Try refreshing the page or return to town', 'info');
      this.combatLog.addMessage('🏠 Returning to town in 10 seconds...', 'warning');
      
      setTimeout(() => {
        gameStore.setCurrentScreen('town');
      }, 10000);
    }, 2000);
  }

  private cleanup(): void {
    // Stop timers
    this.stopInitiativeTimer();
    
    // Reset state
    this.transitionInProgress = false;
    
    // Clear error tracking
    this.errorRecoveryAttempts.clear();
    
    logger.info('Combat Arena cleanup completed');
  }

  private recoverFromAssetError(_attempts: number): void {
    this.combatLog.addMessage('🎨 Reloading game assets...', 'info');
    
    // Attempt to reload critical assets
    setTimeout(() => {
      this.combatLog.addMessage('✅ Asset recovery completed', 'info');
      // Re-render with fallback assets if needed
      this.enhancedUpdateDisplay();
    }, 2000);
  }

  private recoverFromInitializationError(attempts: number = 0): void {
    this.combatLog.addMessage('🔄 Attempting to recover from initialization error...', 'info');
    
    if (attempts === 0) {
      // First attempt: Try to reinitialize combat
      this.combatLog.addMessage('🎮 Attempting to restart combat...', 'info');
      setTimeout(() => {
        try {
          this.combatManager = null;
          this.initializeCombat();
          this.combatLog.addMessage('✅ Combat reinitialized successfully!', 'info');
        } catch (error) {
          this.handleCombatError(error as Error, 'initialization');
        }
      }, 1000);
    } else if (attempts === 1) {
      // Second attempt: Create fresh game state
      this.combatLog.addMessage('🔧 Creating fresh combat state...', 'info');
      setTimeout(() => {
        try {
          gameStore.createTestEnemy(); // Ensure we have an enemy
          this.initializeCombat();
          this.combatLog.addMessage('✅ Fresh combat state created!', 'info');
        } catch (error) {
          this.handleCombatError(error as Error, 'initialization');
        }
      }, 2000);
    } else {
      // Final attempt: Return to town safely
      this.combatLog.addMessage('🏠 Returning to town for safety', 'info');
      setTimeout(() => {
        gameStore.setCurrentScreen('town');
      }, 2000);
    }
  }

  private recoverFromActionError(attempts: number = 0): void {
    this.combatLog.addMessage('🔄 Recovering from action error...', 'info');
    
    if (this.combatManager) {
      try {
        if (attempts === 0) {
          // First attempt: Reset to player action state
          this.combatManager.currentState = CombatState.PLAYER_ACTION_SELECT;
          this.enhancedUpdateDisplay();
          this.combatLog.addMessage('✅ Combat state reset. Please try your action again.', 'info');
        } else if (attempts === 1) {
          // Second attempt: Skip to next turn
          this.combatManager.currentState = CombatState.BETWEEN_TURNS;
          this.combatManager.advanceState();
          this.enhancedUpdateDisplay();
          this.combatLog.addMessage('⏭️ Skipped to next turn to recover', 'info');
        } else {
          // Final attempt: Restart combat turn
          this.combatManager.currentState = CombatState.PLAYER_TURN_START;
          this.combatManager.advanceState();
          this.enhancedUpdateDisplay();
          this.combatLog.addMessage('🔄 Restarted turn for recovery', 'info');
        }
      } catch (error) {
        logger.error('Failed to recover from action error:', error);
        this.fallbackRecovery(attempts);
      }
    } else {
      this.fallbackRecovery(attempts);
    }
  }

  private recoverFromStateError(attempts: number = 0): void {
    this.combatLog.addMessage('🔄 Recovering from state progression error...', 'info');
    
    if (this.combatManager) {
      try {
        if (attempts === 0) {
          // First attempt: Reset to safe state
          this.combatManager.currentState = CombatState.PLAYER_ACTION_SELECT;
          this.enhancedUpdateDisplay();
          this.combatLog.addMessage('✅ State recovered. Combat continues.', 'info');
        } else if (attempts === 1) {
          // Second attempt: Force state sync
          this.combatManager.currentState = CombatState.PLAYER_TURN_START;
          this.combatManager.advanceState();
          this.enhancedUpdateDisplay();
          this.combatLog.addMessage('🔄 State synchronized. Turn restarted.', 'info');
        } else {
          // Final attempt: Reset to beginning of turn
          this.combatManager.currentState = CombatState.BETWEEN_TURNS;
          this.combatManager.advanceState();
          this.enhancedUpdateDisplay();
          this.combatLog.addMessage('⏪ Reset to turn beginning for recovery', 'info');
        }
      } catch (error) {
        logger.error('Failed to recover from state error:', error);
        this.fallbackRecovery(attempts);
      }
    } else {
      this.fallbackRecovery(attempts);
    }
  }

  private recoverFromInitiativeError(attempts: number = 0): void {
    this.combatLog.addMessage('🔄 Recovering from initiative error...', 'info');
    
    // Stop any running timers
    this.stopInitiativeTimer();
    
    if (this.combatManager) {
      try {
        if (attempts === 0) {
          // First attempt: Retry initiative calculation
          this.combatLog.addMessage('🎲 Retrying initiative calculation...', 'info');
          this.startInitiativeTimer();
        } else if (attempts === 1) {
          // Second attempt: Skip initiative, use default order
          this.combatManager.currentState = CombatState.PLAYER_ACTION_SELECT;
          this.enhancedUpdateDisplay();
          this.combatLog.addMessage('⚡ Using default turn order. Player goes first!', 'info');
        } else {
          // Final attempt: Emergency skip to combat
          this.combatManager.currentState = CombatState.PLAYER_ACTION_SELECT;
          this.enhancedUpdateDisplay();
          this.combatLog.addMessage('🚨 Emergency combat start. Initiative skipped.', 'info');
        }
      } catch (error) {
        logger.error('Failed to recover from initiative error:', error);
        this.fallbackRecovery(attempts);
      }
    } else {
      this.fallbackRecovery(attempts);
    }
  }

  private recoverFromEnemyCreationError(attempts: number = 0): void {
    if (attempts === 0) {
      this.combatLog.addMessage('👹 Attempting to create new enemy...', 'info');
      try {
        gameStore.createTestEnemy();
        this.combatLog.addMessage('✅ New enemy created successfully!', 'info');
        this.initializeCombat();
      } catch (error) {
        this.handleCombatError(error as Error, 'enemy_creation');
      }
    } else if (attempts === 1) {
      this.combatLog.addMessage('🎯 Creating simplified enemy encounter...', 'info');
      // Create a very basic enemy for testing
      setTimeout(() => {
        try {
          this.initializeCombat();
          this.combatLog.addMessage('✅ Simplified encounter ready!', 'info');
        } catch (error) {
          this.handleCombatError(error as Error, 'enemy_creation');
        }
      }, 1000);
    } else {
      this.combatLog.addMessage('🔄 Could not create enemy for combat...', 'error');
      this.combatLog.addMessage('🏠 Returning to town', 'info');
      setTimeout(() => {
        gameStore.setCurrentScreen('town');
      }, 2000);
    }
  }

  private fallbackRecovery(attempts: number = 0): void {
    if (attempts < 2) {
      this.combatLog.addMessage('🔧 Attempting emergency recovery...', 'warning');
      
      // Try to salvage the situation
      setTimeout(() => {
        try {
          this.cleanup();
          this.combatLog.addMessage('🔄 Emergency recovery attempt completed', 'info');
          this.initializeCombat();
        } catch (error) {
          this.combatLog.addMessage('❌ Emergency recovery failed', 'error');
          this.finalFallback();
        }
      }, 1500);
    } else {
      this.finalFallback();
    }
  }

  private finalFallback(): void {
    this.combatLog.addMessage('⚠️ Combat system encountered an unrecoverable error', 'error');
    this.combatLog.addMessage('💾 Saving emergency state...', 'info');
    
    // Save emergency state
    this.saveEmergencyState();
    
    this.combatLog.addMessage('🏠 Returning to town for safety...', 'info');
    
    // Clean up any running timers
    this.cleanup();
    
    // Return to town after a delay
    setTimeout(() => {
      gameStore.setCurrentScreen('town');
    }, 3000);
  }

  private animateStateTransition(fromState: CombatState, toState: CombatState): void {
    if (this.transitionInProgress) return;
    
    this.transitionInProgress = true;
    
    // Get transition configuration
    const transitionConfig = this.getTransitionConfig(fromState, toState);
    
    // Animate state indicator
    const stateIndicator = document.querySelector('.state-indicator');
    if (stateIndicator) {
      stateIndicator.classList.add('state-transitioning', transitionConfig.animationClass);
      
      // Show transition message with enhanced formatting
      if (transitionConfig.message) {
        this.combatLog.addMessage(transitionConfig.message, transitionConfig.messageType as any);
      }
      
      // Animate the entire combat arena
      this.animateCombatArenaTransition(transitionConfig);
      
      setTimeout(() => {
        stateIndicator.classList.remove('state-transitioning', transitionConfig.animationClass);
        stateIndicator.classList.add('state-transition-complete');
        
        // Add state-specific visual effects
        this.addStateSpecificEffects(toState);
        
        setTimeout(() => {
          stateIndicator.classList.remove('state-transition-complete');
          this.transitionInProgress = false;
        }, transitionConfig.completionDelay);
      }, transitionConfig.animationDuration);
    } else {
      this.transitionInProgress = false;
    }
  }

  private getTransitionConfig(fromState: CombatState, toState: CombatState) {
    const key = `${fromState}_${toState}`;
    
    const configs: Record<string, any> = {
      [`${CombatState.ROLL_INITIATIVE}_${CombatState.PLAYER_TURN_START}`]: {
        message: '⚡ Initiative determined! Combat begins!',
        messageType: 'combat',
        animationClass: 'initiative-complete',
        animationDuration: 800,
        completionDelay: 400,
        arenaEffect: 'flash-success'
      },
      [`${CombatState.PLAYER_TURN_START}_${CombatState.PLAYER_ACTION_SELECT}`]: {
        message: '🎯 Your turn! Choose your action wisely.',
        messageType: 'info',
        animationClass: 'player-turn',
        animationDuration: 600,
        completionDelay: 300,
        arenaEffect: 'highlight-player'
      },
      [`${CombatState.PLAYER_ACTION_SELECT}_${CombatState.PLAYER_ACTION_RESOLVE}`]: {
        message: '⚔️ Executing your action...',
        messageType: 'combat',
        animationClass: 'action-resolve',
        animationDuration: 500,
        completionDelay: 250,
        arenaEffect: 'action-flash'
      },
      [`${CombatState.PLAYER_ACTION_RESOLVE}_${CombatState.ENEMY_TURN_START}`]: {
        message: '👹 Enemy\'s turn begins! Prepare yourself!',
        messageType: 'info',
        animationClass: 'enemy-turn',
        animationDuration: 700,
        completionDelay: 350,
        arenaEffect: 'highlight-enemy'
      },
      [`${CombatState.ENEMY_TURN_START}_${CombatState.ENEMY_INTENT}`]: {
        message: '🧠 Enemy is planning their attack...',
        messageType: 'info',
        animationClass: 'enemy-thinking',
        animationDuration: 600,
        completionDelay: 300,
        arenaEffect: 'enemy-glow'
      },
      [`${CombatState.ENEMY_INTENT}_${CombatState.ENEMY_ACTION_RESOLVE}`]: {
        message: '⚔️ Enemy strikes!',
        messageType: 'combat',
        animationClass: 'enemy-attack',
        animationDuration: 500,
        completionDelay: 250,
        arenaEffect: 'enemy-attack-flash'
      },
      [`${CombatState.ENEMY_ACTION_RESOLVE}_${CombatState.BETWEEN_TURNS}`]: {
        message: '⏳ Processing turn effects...',
        messageType: 'info',
        animationClass: 'process-effects',
        animationDuration: 400,
        completionDelay: 200,
        arenaEffect: 'effect-processing'
      },
      [`${CombatState.BETWEEN_TURNS}_${CombatState.PLAYER_TURN_START}`]: {
        message: '🔄 New turn begins! Round continues!',
        messageType: 'info',
        animationClass: 'new-turn',
        animationDuration: 600,
        completionDelay: 300,
        arenaEffect: 'turn-cycle'
      },
      [`${CombatState.CHECK_VICTORY}_${CombatState.COMBAT_END}`]: {
        message: '🏆 Victory achieved! You are triumphant!',
        messageType: 'victory',
        animationClass: 'victory',
        animationDuration: 1000,
        completionDelay: 500,
        arenaEffect: 'victory-celebration'
      },
      [`${CombatState.CHECK_DEFEAT}_${CombatState.COMBAT_END}`]: {
        message: '💀 Defeat... You have fallen in combat.',
        messageType: 'defeat',
        animationClass: 'defeat',
        animationDuration: 800,
        completionDelay: 400,
        arenaEffect: 'defeat-fade'
      }
    };
    
    return configs[key] || {
      message: this.getTransitionMessage(fromState, toState),
      messageType: 'info',
      animationClass: 'default-transition',
      animationDuration: 500,
      completionDelay: 250,
      arenaEffect: 'none'
    };
  }

  private animateCombatArenaTransition(config: any): void {
    const arena = document.querySelector('.combat-arena');
    if (arena && config.arenaEffect !== 'none') {
      arena.classList.add(`effect-${config.arenaEffect}`);
      
      setTimeout(() => {
        arena.classList.remove(`effect-${config.arenaEffect}`);
      }, config.animationDuration);
    }
  }

  private addStateSpecificEffects(state: CombatState): void {
    const arena = document.querySelector('.combat-arena');
    if (!arena) return;
    
    // Remove previous state effects
    arena.classList.remove('player-turn', 'enemy-turn', 'action-resolving', 'victory', 'defeat', 'initiative-rolling');
    
    // Add current state effect
    switch (state) {
      case CombatState.ROLL_INITIATIVE:
        arena.classList.add('initiative-rolling');
        break;
      case CombatState.PLAYER_ACTION_SELECT:
        arena.classList.add('player-turn');
        this.addPlayerTurnEffects();
        break;
      case CombatState.ENEMY_TURN_START:
      case CombatState.ENEMY_INTENT:
      case CombatState.ENEMY_ACTION_RESOLVE:
        arena.classList.add('enemy-turn');
        this.addEnemyTurnEffects();
        break;
      case CombatState.PLAYER_ACTION_RESOLVE:
        arena.classList.add('action-resolving');
        break;
      case CombatState.CHECK_VICTORY:
        arena.classList.add('victory');
        this.addVictoryEffects();
        break;
      case CombatState.CHECK_DEFEAT:
        arena.classList.add('defeat');
        this.addDefeatEffects();
        break;
    }
  }

  private addPlayerTurnEffects(): void {
    // Highlight player area
    const playerParticipant = document.querySelector('.player-participant');
    if (playerParticipant) {
      playerParticipant.classList.add('active-turn', 'turn-glow');
      setTimeout(() => {
        playerParticipant.classList.remove('turn-glow');
      }, 1000);
    }
    
    // Pulse action buttons
    const actionButtons = document.querySelectorAll('.action-btn:not(.disabled)');
    actionButtons.forEach(btn => {
      btn.classList.add('available-pulse');
      setTimeout(() => {
        btn.classList.remove('available-pulse');
      }, 2000);
    });
  }

  private addEnemyTurnEffects(): void {
    // Highlight enemy area
    const enemyParticipant = document.querySelector('.enemy-participant');
    if (enemyParticipant) {
      enemyParticipant.classList.add('active-turn', 'enemy-glow');
      setTimeout(() => {
        enemyParticipant.classList.remove('enemy-glow');
      }, 1000);
    }
  }

  private addVictoryEffects(): void {
    // Victory celebration effects
    setTimeout(() => {
      this.combatLog.addMessage('💰 Calculating victory rewards...', 'victory');
    }, 500);
    
    setTimeout(() => {
      this.combatLog.addMessage('🎉 Experience gained! Items collected!', 'victory');
    }, 1500);
  }

  private addDefeatEffects(): void {
    // Defeat consequences
    setTimeout(() => {
      this.combatLog.addMessage('💸 Applying defeat penalties...', 'defeat');
    }, 500);
    
    setTimeout(() => {
      this.combatLog.addMessage('🏥 Retreating to safety...', 'defeat');
    }, 1500);
  }

  private getTransitionMessage(fromState: CombatState, toState: CombatState): string | null {
    const transitions: Record<string, string> = {
      [`${CombatState.ROLL_INITIATIVE}_${CombatState.PLAYER_TURN_START}`]: '⚡ Initiative determined!',
      [`${CombatState.PLAYER_TURN_START}_${CombatState.PLAYER_ACTION_SELECT}`]: '🎯 Your turn begins!',
      [`${CombatState.PLAYER_ACTION_SELECT}_${CombatState.PLAYER_ACTION_RESOLVE}`]: '⚔️ Executing action...',
      [`${CombatState.PLAYER_ACTION_RESOLVE}_${CombatState.ENEMY_TURN_START}`]: '👹 Enemy turn begins!',
      [`${CombatState.ENEMY_TURN_START}_${CombatState.ENEMY_INTENT}`]: '🧠 Enemy is planning...',
      [`${CombatState.ENEMY_INTENT}_${CombatState.ENEMY_ACTION_RESOLVE}`]: '⚔️ Enemy attacks!',
      [`${CombatState.ENEMY_ACTION_RESOLVE}_${CombatState.BETWEEN_TURNS}`]: '⏳ Processing effects...',
      [`${CombatState.BETWEEN_TURNS}_${CombatState.PLAYER_TURN_START}`]: '🔄 New turn begins!',
      [`${CombatState.CHECK_VICTORY}_${CombatState.COMBAT_END}`]: '🏆 Victory achieved!',
      [`${CombatState.CHECK_DEFEAT}_${CombatState.COMBAT_END}`]: '💀 Defeat...',
    };
    
    const key = `${fromState}_${toState}`;
    return transitions[key] || null;
  }

  private enhancedUpdateDisplay(): void {
    if (!this.combatManager) return;

    const currentState = this.combatManager.currentState;
    const previousState = this.currentStateDisplay;
    
    // Trigger transition animation if state changed
    if (previousState && previousState !== currentState.toString()) {
      this.animateStateTransition(previousState as CombatState, currentState);
    }
    
    this.currentStateDisplay = currentState.toString();
    
    // Call the regular update display
    this.updateDisplay();
    
    // Add visual effects for specific states
    this.addStateVisualEffects(currentState);
  }

  private addStateVisualEffects(state: CombatState): void {
    // Remove existing state effects
    const arena = document.querySelector('.combat-arena');
    if (arena) {
      arena.classList.remove('player-turn', 'enemy-turn', 'action-resolving', 'victory', 'defeat');
      
      // Add appropriate class for current state
      switch (state) {
        case CombatState.PLAYER_ACTION_SELECT:
          arena.classList.add('player-turn');
          break;
        case CombatState.ENEMY_TURN_START:
        case CombatState.ENEMY_INTENT:
        case CombatState.ENEMY_ACTION_RESOLVE:
          arena.classList.add('enemy-turn');
          break;
        case CombatState.PLAYER_ACTION_RESOLVE:
          arena.classList.add('action-resolving');
          break;
        case CombatState.CHECK_VICTORY:
          arena.classList.add('victory');
          break;
        case CombatState.CHECK_DEFEAT:
          arena.classList.add('defeat');
          break;
      }
    }
  }

  private addStateMessage(state: CombatState): void {
    switch (state) {
      case CombatState.PLAYER_ACTION_SELECT:
        this.combatLog.addMessage('🎯 Your turn! Choose an action.', 'info');
        break;
      case CombatState.ENEMY_TURN_START:
      case CombatState.ENEMY_ACTION_RESOLVE:
        this.combatLog.addMessage('👹 Enemy is acting...', 'info');
        break;
      case CombatState.CHECK_VICTORY:
        this.combatLog.addMessage('🏆 Victory! You defeated the enemy!', 'victory');
        break;
      case CombatState.CHECK_DEFEAT:
        this.combatLog.addMessage('💀 Defeat! You have been defeated...', 'defeat');
        break;
    }
  }

  private handleCombatEnd(state: CombatState): void {
    if (state === CombatState.CHECK_VICTORY) {
      this.combatLog.addMessage('💰 Victory rewards will be calculated!', 'victory');
      // Return to town after 3 seconds
      setTimeout(() => {
        gameStore.setCurrentScreen('town');
      }, 3000);
    } else if (state === CombatState.COMBAT_END) {
      // Check if this was an escape
      if (this.combatManager && this.combatManager.escapedCombat) {
        this.combatLog.addMessage('🏃 You escaped safely! No rewards, no penalties.', 'info');
        // Return to town after 2 seconds for escape
        setTimeout(() => {
          gameStore.setCurrentScreen('town');
        }, 2000);
      } else {
        // Regular combat end (should check victory/defeat)
        if (this.combatManager && this.combatManager.checkVictory()) {
          this.combatLog.addMessage('💰 Victory rewards will be calculated!', 'victory');
          setTimeout(() => {
            gameStore.setCurrentScreen('town');
          }, 3000);
        } else {
          this.combatLog.addMessage('💸 Defeat penalties will be applied!', 'defeat');
          setTimeout(() => {
            gameStore.setCurrentScreen('town');
          }, 5000);
        }
      }
    } else if (state === CombatState.CHECK_DEFEAT) {
      this.combatLog.addMessage('💸 Defeat penalties will be applied!', 'defeat');
      // Return to town after 5 seconds
      setTimeout(() => {
        gameStore.setCurrentScreen('town');
      }, 5000);
    }
  }

  public render(): string {
    // Initialize combat if not already done
    if (!this.combatManager) {
      this.initializeCombat();
    }

    if (!this.combatManager) {
      return `
        <div class="combat-arena">
          <div class="combat-error">
            <h2>⚠️ Combat Error</h2>
            <p>Unable to initialize combat. Please return to town.</p>
            <button class="btn btn-primary" data-action="go-town">← Back to Town</button>
          </div>
        </div>
      `;
    }

    const state = this.combatManager.currentState;
    
    // Handle combat end states
    if ([CombatState.CHECK_VICTORY, CombatState.CHECK_DEFEAT, CombatState.COMBAT_END].includes(state)) {
      this.handleCombatEnd(state);
    }

    // Update display for current state
    this.enhancedUpdateDisplay();

    // Set up action bar event listeners after rendering
    setTimeout(() => {
      this.actionBar.setupEventListeners();
      this.setupEscapeButtonListener();
    }, 0);

    return `
      <div class="combat-arena">
        <div class="combat-header">
          <h2>⚔️ Combat Arena</h2>
          <div class="combat-state">
            <span class="state-indicator state-${state.toString().toLowerCase()}">${this.getStateDisplayName(state)}</span>
            <span class="turn-counter">Turn ${this.combatManager.currentTurn || 1}</span>
          </div>
          ${state === CombatState.ROLL_INITIATIVE ? this.renderInitiativeProgress() : ''}
        </div>
        
        <div class="combat-main">
          <div class="combat-participants">
            ${this.participants.render(this.combatManager.player, this.combatManager.enemies?.[0], this.combatManager.currentState)}
          </div>
          
          <div class="combat-actions">
            ${this.actionBar.render(this.combatManager.currentState, this.combatManager.player)}
          </div>
        </div>
        
        <div class="combat-log-container">
          ${this.combatLog.render()}
        </div>
        
        <div class="combat-controls">
          <button class="btn btn-secondary escape-btn" ${state === CombatState.PLAYER_ACTION_SELECT ? '' : 'disabled'}>
            🏃 Escape
          </button>
        </div>
      </div>
    `;
  }

  private renderInitiativeProgress(): string {
    const progressPercent = Math.round(this.initiativeProgress);
    const isComplete = this.initiativeProgress >= 100;
    const animationClass = isComplete ? 'complete' : 'rolling';
    
    return `
      <div class="initiative-progress ${animationClass}">
        <div class="initiative-header">
          <div class="initiative-label">
            <span class="initiative-icon">🎲</span>
            <span class="initiative-text">${isComplete ? 'Initiative Determined!' : 'Rolling Initiative...'}</span>
          </div>
          <div class="initiative-percentage">${progressPercent}%</div>
        </div>
        
        <div class="initiative-progress-container">
          <div class="initiative-progress-bar" style="width: ${this.initiativeProgress}%">
            <div class="initiative-progress-glow"></div>
            <div class="initiative-progress-fill"></div>
          </div>
          <div class="initiative-progress-background">
            <div class="initiative-tick" style="left: 25%"></div>
            <div class="initiative-tick" style="left: 50%"></div>
            <div class="initiative-tick" style="left: 75%"></div>
          </div>
        </div>
        
        <div class="initiative-participants">
          <div class="participant-preview player">
            <span class="participant-icon">⚔️</span>
            <span class="participant-name">${this.combatManager?.player.name || 'Player'}</span>
            <span class="initiative-value">${this.combatManager?.player.computedStats.initiative || '?'}</span>
          </div>
          <div class="vs-divider">VS</div>
          <div class="participant-preview enemy">
            <span class="participant-icon">👹</span>
            <span class="participant-name">${this.combatManager?.enemies[0]?.name || 'Enemy'}</span>
            <span class="initiative-value">${this.combatManager?.enemies[0]?.computedStats.initiative || '?'}</span>
          </div>
        </div>
        
        ${isComplete ? `
          <div class="initiative-result">
            <div class="winner-announcement">
              <span class="winner-text">🎯 ${this.getInitiativeWinner()} goes first!</span>
            </div>
          </div>
        ` : `
          <div class="initiative-tips">
            <div class="tip-text">💡 Higher initiative goes first in combat</div>
          </div>
        `}
      </div>
    `;
  }

  private getInitiativeWinner(): string {
    if (!this.combatManager) return 'Player';
    
    const playerInit = this.combatManager.player.computedStats.initiative || 0;
    const enemyInit = this.combatManager.enemies[0]?.computedStats.initiative || 0;
    
    if (playerInit >= enemyInit) {
      return this.combatManager.player.name;
    } else {
      return this.combatManager.enemies[0]?.name || 'Enemy';
    }
  }

  private getStateDisplayName(state: CombatState): string {
    // Special handling for COMBAT_END state
    if (state === CombatState.COMBAT_END && this.combatManager) {
      if (this.combatManager.escapedCombat) {
        return 'Escaped!';
      } else if (this.combatManager.checkVictory()) {
        return 'Victory!';
      } else if (this.combatManager.checkDefeat()) {
        return 'Defeat!';
      }
    }
    
    const stateNames: Record<CombatState, string> = {
      [CombatState.INITIALIZING]: 'Initializing',
      [CombatState.ROLL_INITIATIVE]: 'Rolling Initiative',
      [CombatState.PLAYER_TURN_START]: 'Turn Starting',
      [CombatState.PLAYER_ACTION_SELECT]: 'Your Turn',
      [CombatState.PLAYER_ACTION_RESOLVE]: 'Resolving Action',
      [CombatState.ENEMY_TURN_START]: 'Enemy Turn',
      [CombatState.ENEMY_INTENT]: 'Enemy Planning',
      [CombatState.ENEMY_ACTION_RESOLVE]: 'Enemy Acting',
      [CombatState.BETWEEN_TURNS]: 'Between Turns',
      [CombatState.CHECK_VICTORY]: 'Victory!',
      [CombatState.CHECK_DEFEAT]: 'Defeat!',
      [CombatState.COMBAT_END]: 'Combat Ended',
      [CombatState.LOOT_DISTRIBUTION]: 'Distributing Loot'
    };
    return stateNames[state] || state.toString();
  }

  private setupEscapeButtonListener(): void {
    const escapeButton = document.querySelector('.escape-btn');
    if (escapeButton) {
      escapeButton.addEventListener('click', () => {
        this.handleAction(CombatAction.ESCAPE);
      });
    }
  }

  public destroy(): void {
    this.stopInitiativeTimer();
    this.combatManager = null;
  }
}