import { CombatAction, CombatState } from '../types/combat';
import { Player } from '../services/Entity';

export class CombatActionBar {
  private onActionCallback: (action: CombatAction) => void;

  constructor(onAction: (action: CombatAction) => void) {
    this.onActionCallback = onAction;
  }

  public updateActions(_state: CombatState, _player: Player): void {
    // This method is called to update the internal state
    // The actual rendering happens in render() method
  }

  public render(state?: CombatState, player?: Player): string {
    if (!state || !player) {
      return '<div class="combat-action-bar"><p>Loading actions...</p></div>';
    }

    // Only show actions during player turn
    if (state !== CombatState.PLAYER_ACTION_SELECT) {
      return this.renderWaitingState(state);
    }

    const availableActions = this.getAvailableActions(player, state);
    
    return `
      <div class="combat-action-bar">
        <div class="action-bar-header">
          <h4>Choose your action:</h4>
        </div>
        <div class="action-buttons">
          ${availableActions.map(action => this.renderActionButton(action, player)).join('')}
        </div>
        ${this.renderActionTooltips()}
      </div>
    `;
  }

  private renderWaitingState(state: CombatState): string {
    const stateMessages: Partial<Record<CombatState, string>> = {
      [CombatState.ENEMY_TURN_START]: '👹 Enemy is choosing their action...',
      [CombatState.ENEMY_ACTION_RESOLVE]: '👹 Enemy is acting...',
      [CombatState.BETWEEN_TURNS]: '⏭️ Between turns...',
      [CombatState.CHECK_VICTORY]: '🏆 Victory achieved!',
      [CombatState.CHECK_DEFEAT]: '💀 You have been defeated...',
      [CombatState.ROLL_INITIATIVE]: '🎲 Rolling initiative...',
      [CombatState.PLAYER_TURN_START]: '▶️ Starting turn...',
      [CombatState.PLAYER_ACTION_RESOLVE]: '🎯 Resolving actions...',
      [CombatState.ENEMY_INTENT]: '🤔 Enemy is planning...',
      [CombatState.COMBAT_END]: '🏁 Combat ended',
      [CombatState.LOOT_DISTRIBUTION]: '💰 Distributing loot...',
      [CombatState.INITIALIZING]: '⚙️ Initializing combat...'
    };

    const message = stateMessages[state] || 'Processing...';

    return `
      <div class="combat-action-bar waiting-state">
        <div class="waiting-message">
          <span class="waiting-text">${message}</span>
          <div class="waiting-spinner">⏳</div>
        </div>
      </div>
    `;
  }

  private getAvailableActions(player: Player, _state: CombatState): CombatAction[] {
    const actions: CombatAction[] = [CombatAction.ATTACK, CombatAction.BLOCK];

    // Add TOGGLE_ABILITY if player has abilities
    const abilities = player.equipment.getGrantedAbilities();
    if (abilities && abilities.length > 0) {
      actions.push(CombatAction.TOGGLE_ABILITY);
    }

    // Add MOVE if range mechanics are active (for now always available)
    actions.push(CombatAction.MOVE);

    // ESCAPE is always available during player turn
    actions.push(CombatAction.ESCAPE);

    return actions;
  }

  private renderActionButton(action: CombatAction, player: Player): string {
    const actionConfig = this.getActionConfig(action, player);
    const disabled = !actionConfig.available;
    const cost = actionConfig.cost;

    return `
      <button 
        class="action-btn ${action.toLowerCase()}-btn ${disabled ? 'disabled' : ''}" 
        data-action="combat-action" 
        data-combat-action="${action}"
        ${disabled ? 'disabled' : ''}
        title="${actionConfig.tooltip}"
      >
        <div class="action-icon">${actionConfig.icon}</div>
        <div class="action-label">${actionConfig.label}</div>
        ${cost ? `<div class="action-cost">${cost}</div>` : ''}
        ${actionConfig.cooldown ? `<div class="action-cooldown">${actionConfig.cooldown}</div>` : ''}
      </button>
    `;
  }

  private getActionConfig(action: CombatAction, player: Player): {
    icon: string;
    label: string;
    tooltip: string;
    available: boolean;
    cost?: string;
    cooldown?: string;
  } {
    switch (action) {
      case CombatAction.ATTACK:
        return {
          icon: '⚔️',
          label: 'Attack',
          tooltip: `Deal ${player.computedStats.damage} damage to the enemy`,
          available: true
        };

      case CombatAction.BLOCK:
        return {
          icon: '🛡️',
          label: 'Block',
          tooltip: `Double armor (${player.computedStats.armor * 2}) and reduce damage by 25%`,
          available: true
        };

      case CombatAction.TOGGLE_ABILITY:
        // Check equipment for available abilities
        const abilities = player.equipment.getGrantedAbilities();
        const hasAbilities = abilities.length > 0;
        
        if (hasAbilities && player.currentMana >= 10) { // Assume basic mana cost
          return {
            icon: '✨',
            label: 'Use Ability',
            tooltip: `Use equipment ability (10 mana)`,
            available: true,
            cost: '10💧'
          };
        } else {
          return {
            icon: '✨',
            label: 'Ability',
            tooltip: hasAbilities ? 'Insufficient mana' : 'No abilities available',
            available: false
          };
        }

      case CombatAction.MOVE:
        return {
          icon: '🏃',
          label: 'Move',
          tooltip: 'Change your position (in range ↔ out of range)',
          available: true
        };

      case CombatAction.ESCAPE:
        const escapeChance = this.calculateEscapeChance(player);
        return {
          icon: '🚪',
          label: 'Escape',
          tooltip: `Attempt to flee from combat (${escapeChance}% chance)`,
          available: true
        };

      default:
        return {
          icon: '❓',
          label: 'Unknown',
          tooltip: 'Unknown action',
          available: false
        };
    }
  }

  private calculateEscapeChance(player: Player): number {
    // Basic escape chance calculation (could be more sophisticated)
    const baseChance = 50;
    const speedBonus = Math.min(player.computedStats.initiative - 10, 30); // Max 30% bonus from initiative
    return Math.max(10, Math.min(90, baseChance + speedBonus));
  }

  private renderActionTooltips(): string {
    return `
      <div class="action-tooltips">
        <div class="tooltip-section">
          <h5>Combat Actions:</h5>
          <ul>
            <li><strong>Attack:</strong> Deal damage to the enemy</li>
            <li><strong>Block:</strong> Double armor and reduce incoming damage by 25%</li>
            <li><strong>Ability:</strong> Use or toggle special abilities (costs mana)</li>
            <li><strong>Move:</strong> Change position (affects range-based combat)</li>
            <li><strong>Escape:</strong> Attempt to flee from combat</li>
          </ul>
        </div>
      </div>
    `;
  }

  public setupEventListeners(): void {
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const button = target.closest('[data-action="combat-action"]') as HTMLButtonElement;
      
      if (button && !button.disabled) {
        const action = button.getAttribute('data-combat-action') as CombatAction;
        if (action) {
          this.handleActionClick(action);
        }
      }
    });
  }

  private handleActionClick(action: CombatAction): void {
    // Add visual feedback
    const button = document.querySelector(`[data-combat-action="${action}"]`) as HTMLButtonElement;
    if (button) {
      button.classList.add('action-clicked');
      setTimeout(() => {
        button.classList.remove('action-clicked');
      }, 200);
    }

    // Execute the action
    this.onActionCallback(action);
  }

  public destroy(): void {
    // Clean up event listeners if needed
    // (In a real app, you'd want to track and remove specific listeners)
  }
}