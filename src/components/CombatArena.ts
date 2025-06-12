import { CombatManager } from '../services/CombatManager';
import { CombatState, CombatAction } from '../types/combat';
import { gameStore } from '../stores/GameStore';
// import { uiStore } from '../stores/UIStore';
import { CombatActionBar } from './CombatActionBar';
import { CombatParticipants } from './CombatParticipants';
import { CombatLog } from './CombatLog';

export class CombatArena {
  private combatManager: CombatManager | null = null;
  private actionBar: CombatActionBar;
  private participants: CombatParticipants;
  private combatLog: CombatLog;

  constructor() {
    this.actionBar = new CombatActionBar(this.handleAction.bind(this));
    this.participants = new CombatParticipants();
    this.combatLog = new CombatLog();
  }

  private handleAction(action: CombatAction): void {
    if (!this.combatManager) return;

    try {
      // TODO: Implement action handling with the correct CombatManager method
      this.combatLog.addMessage(`🎯 Player chooses: ${action}`, 'combat');
      // For now, just advance the state
      this.combatManager.advanceState();
      this.render(); // Re-render after action
    } catch (error) {
      console.error('Combat action failed:', error);
      this.combatLog.addMessage(`⚠️ Action failed: ${error}`, 'error');
    }
  }

  private initializeCombat(): void {
    const player = gameStore.player;
    let enemies = gameStore.currentEnemies;

    if (!player) {
      this.combatLog.addMessage('⚠️ Combat initialization failed: no player', 'error');
      return;
    }

    // Create a test enemy if none exists
    if (!enemies || enemies.length === 0) {
      const testEnemy = gameStore.createTestEnemy();
      enemies = [testEnemy];
      // Don't call gameStore.setCurrentEnemy during render to avoid infinite loop
      this.combatLog.addMessage('🎯 Test enemy created for combat', 'info');
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
    this.updateDisplay();
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
    if (state === CombatState.CHECK_VICTORY || state === CombatState.COMBAT_END) {
      this.combatLog.addMessage('💰 Victory rewards will be calculated!', 'victory');
      // Return to town after 3 seconds
      setTimeout(() => {
        gameStore.setCurrentScreen('town');
      }, 3000);
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
    this.updateDisplay();

    // Set up action bar event listeners after rendering
    setTimeout(() => {
      this.actionBar.setupEventListeners();
    }, 0);

    return `
      <div class="combat-arena">
        <div class="combat-header">
          <h2>⚔️ Combat Arena</h2>
          <div class="combat-state">
            <span class="state-indicator state-${state.toString().toLowerCase()}">${this.getStateDisplayName(state)}</span>
            <span class="turn-counter">Turn ${this.combatManager.currentTurn || 1}</span>
          </div>
        </div>
        
        <div class="combat-main">
          <div class="combat-participants">
            ${this.participants.render(this.combatManager.player, this.combatManager.enemies[0], this.combatManager.currentState)}
          </div>
          
          <div class="combat-actions">
            ${this.actionBar.render(this.combatManager.currentState, this.combatManager.player)}
          </div>
        </div>
        
        <div class="combat-log-container">
          ${this.combatLog.render()}
        </div>
        
        <div class="combat-controls">
          <button class="btn btn-secondary" data-action="go-town" ${state === CombatState.PLAYER_ACTION_SELECT ? '' : 'disabled'}>
            🏃 Escape
          </button>
        </div>
      </div>
    `;
  }

  private getStateDisplayName(state: CombatState): string {
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

  public destroy(): void {
    this.combatManager = null;
  }
}