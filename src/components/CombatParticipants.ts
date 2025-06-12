import { Player, Enemy } from '../services/Entity';
import { CombatState } from '../types/enums';
import { assetManager } from '../services/AssetManager';

export class CombatParticipants {
  
  public updateParticipants(_player: Player, _enemy: Enemy, _state: CombatState): void {
    // This method is called to update the internal state
    // The actual rendering happens in render() method
  }

  public render(player?: Player, enemy?: Enemy, state?: CombatState): string {
    if (!player || !enemy) {
      return '<div class="combat-participants"><p>Loading participants...</p></div>';
    }

    return `
      <div class="combat-participants">
        ${this.renderPlayer(player, state)}
        <div class="vs-indicator">
          <span class="vs-text">VS</span>
        </div>
        ${this.renderEnemy(enemy, state)}
      </div>
    `;
  }

  private renderPlayer(player: Player, state?: CombatState): string {
    const healthPercent = (player.currentHealth / player.computedStats.maxHealth) * 100;
    const manaPercent = player.computedStats.maxMana > 0 ? (player.currentMana / player.computedStats.maxMana) * 100 : 0;
    
    // Get player portrait from assets
    const portraitAsset = assetManager.getCachedAsset('character-portraits/player-default.png') || 
                         assetManager.getCachedAsset('icons/player.png');
    const portraitUrl = portraitAsset?.data?.src || '';

    const isPlayerTurn = state === CombatState.PLAYER_ACTION_SELECT;
    const playerEffects = [...player.effects.statusEffects, ...player.effects.abilityEffects];

    return `
      <div class="participant player-participant ${isPlayerTurn ? 'active-turn' : ''}">
        <div class="participant-portrait">
          <img src="${portraitUrl}" alt="${player.name}" class="portrait-image" />
          ${this.renderEffectOverlays(playerEffects)}
          ${isPlayerTurn ? '<div class="turn-indicator">⭐</div>' : ''}
        </div>
        
        <div class="participant-info">
          <h3 class="participant-name">${player.name}</h3>
          <div class="level-info">Level ${player.level}</div>
          
          <div class="health-bar-container">
            <div class="stat-label">Health</div>
            <div class="health-bar">
              <div class="health-fill" style="width: ${healthPercent}%"></div>
              <span class="health-text">${player.currentHealth}/${player.computedStats.maxHealth}</span>
            </div>
          </div>
          
          ${player.computedStats.maxMana > 0 ? `
            <div class="mana-bar-container">
              <div class="stat-label">Mana</div>
              <div class="mana-bar">
                <div class="mana-fill" style="width: ${manaPercent}%"></div>
                <span class="mana-text">${player.currentMana}/${player.computedStats.maxMana}</span>
              </div>
            </div>
          ` : ''}
          
          <div class="combat-stats">
            <div class="stat-item">
              <span class="stat-icon">⚔️</span>
              <span class="stat-value">${player.computedStats.damage}</span>
            </div>
            <div class="stat-item">
              <span class="stat-icon">🛡️</span>
              <span class="stat-value">${player.computedStats.armor}</span>
            </div>
            <div class="stat-item">
              <span class="stat-icon">💨</span>
              <span class="stat-value">${player.computedStats.initiative}</span>
            </div>
          </div>
          
          ${playerEffects.length > 0 ? this.renderActiveEffects(playerEffects) : ''}
        </div>
      </div>
    `;
  }

  private renderEnemy(enemy: Enemy, state?: CombatState): string {
    const healthPercent = (enemy.currentHealth / enemy.computedStats.maxHealth) * 100;
    const manaPercent = enemy.computedStats.maxMana > 0 ? (enemy.currentMana / enemy.computedStats.maxMana) * 100 : 0;
    
    // Get enemy portrait from assets based on enemy type/name
    const portraitUrl = this.getEnemyPortrait(enemy) || '';

    const isEnemyTurn = state === CombatState.ENEMY_TURN_START || state === CombatState.ENEMY_ACTION_RESOLVE;
    const enemyEffects = [...enemy.effects.statusEffects, ...enemy.effects.abilityEffects];

    return `
      <div class="participant enemy-participant ${isEnemyTurn ? 'active-turn' : ''}">
        <div class="participant-portrait">
          <img src="${portraitUrl}" alt="${enemy.name}" class="portrait-image" />
          ${this.renderEffectOverlays(enemyEffects)}
          ${isEnemyTurn ? '<div class="turn-indicator">⭐</div>' : ''}
          ${this.renderEnemyIntent(enemy)}
        </div>
        
        <div class="participant-info">
          <h3 class="participant-name">${enemy.name}</h3>
          <div class="enemy-type">${enemy.enemyType} Enemy</div>
          
          <div class="health-bar-container">
            <div class="stat-label">Health</div>
            <div class="health-bar enemy-health">
              <div class="health-fill" style="width: ${healthPercent}%"></div>
              <span class="health-text">${enemy.currentHealth}/${enemy.computedStats.maxHealth}</span>
            </div>
          </div>
          
          ${enemy.computedStats.maxMana > 0 ? `
            <div class="mana-bar-container">
              <div class="stat-label">Mana</div>
              <div class="mana-bar enemy-mana">
                <div class="mana-fill" style="width: ${manaPercent}%"></div>
                <span class="mana-text">${enemy.currentMana}/${enemy.computedStats.maxMana}</span>
              </div>
            </div>
          ` : ''}
          
          <div class="combat-stats">
            <div class="stat-item">
              <span class="stat-icon">⚔️</span>
              <span class="stat-value">${enemy.computedStats.damage}</span>
            </div>
            <div class="stat-item">
              <span class="stat-icon">🛡️</span>
              <span class="stat-value">${enemy.computedStats.armor}</span>
            </div>
            <div class="stat-item">
              <span class="stat-icon">💨</span>
              <span class="stat-value">${enemy.computedStats.initiative}</span>
            </div>
          </div>
          
          ${enemyEffects.length > 0 ? this.renderActiveEffects(enemyEffects) : ''}
        </div>
      </div>
    `;
  }

  private getEnemyPortrait(enemy: Enemy): string | null {
    // Try to find enemy-specific portraits
    const enemyName = enemy.name.toLowerCase().replace(/\s+/g, '-');
    
    // First try specific enemy portraits
    let portraitAsset = assetManager.getCachedAsset(`enemy-portraits/${enemyName}.png`);
    if (portraitAsset?.data?.src) return portraitAsset.data.src;

    // Try by enemy type
    portraitAsset = assetManager.getCachedAsset(`enemy-portraits/${enemy.enemyType.toLowerCase()}.png`);
    if (portraitAsset?.data?.src) return portraitAsset.data.src;

    // Use placeholder for now
    return null;
  }


  private renderEnemyIntent(enemy: Enemy): string {
    // Get enemy's intended action from current intent
    if (!enemy.currentIntent) return '';

    const intentIcons: Record<string, string> = {
      'attack': '⚔️',
      'block': '🛡️',
      'ability': '✨',
      'move': '🏃',
      'escape': '🚪'
    };

    return `
      <div class="enemy-intent">
        <span class="intent-icon">${intentIcons[enemy.currentIntent.action] || '❓'}</span>
      </div>
    `;
  }

  private renderEffectOverlays(effects: any[]): string {
    if (effects.length === 0) return '';

    const effectIcons: Record<string, string> = {
      'ignite': '🔥',
      'chill': '❄️',
      'freeze': '🧊',
      'poison': '☠️',
      'regeneration': '💚',
      'shield': '🛡️',
      'haste': '💨',
      'slow': '🐌'
    };

    return `
      <div class="effect-overlays">
        ${effects.map(effect => `
          <div class="effect-overlay" title="${effect.name}: ${effect.description}">
            <span class="effect-icon">${effectIcons[effect.type] || '✨'}</span>
            ${effect.remainingTurns ? `<span class="effect-duration">${effect.remainingTurns}</span>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  private renderActiveEffects(effects: any[]): string {
    return `
      <div class="active-effects">
        <div class="effects-label">Active Effects:</div>
        <div class="effects-list">
          ${effects.map(effect => `
            <div class="effect-item" title="${effect.description}">
              <span class="effect-name">${effect.name}</span>
              ${effect.remainingTurns ? `<span class="effect-turns">(${effect.remainingTurns})</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
}