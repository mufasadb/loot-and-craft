import { Player, Enemy } from '../services/Entity';
import { CombatState } from '../types/enums';
import { assetManager } from '../services/AssetManager';

export class CombatParticipants {
  
  public updateParticipants(_player: Player, _enemy: Enemy, _state: CombatState): void {
    // This method is called to update the internal state
    // The actual rendering happens in render() method
  }

  public render(player?: Player, enemy?: Enemy, state?: CombatState): string {
    if (!player) {
      return '<div class="combat-participants"><p>Loading participants...</p></div>';
    }

    return `
      <div class="combat-participants">
        ${this.renderPlayer(player, state)}
        <div class="vs-indicator">
          <span class="vs-text">VS</span>
        </div>
        ${enemy ? this.renderEnemy(enemy, state) : this.renderEnemyPlaceholder(state)}
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

    const intent = enemy.currentIntent;
    const intentData = this.getEnhancedIntentData(intent);

    return `
      <div class="enemy-intent ${intentData.className}" data-intent="${intent.action}">
        <div class="intent-icon-container">
          <img 
            src="${intentData.iconPath}" 
            alt="${intent.action}" 
            class="intent-icon ${intentData.animationClass}"
            onerror="this.style.display='none'; this.nextSibling.style.display='inline';"
          />
          <span class="intent-fallback-icon" style="display: none;">${intentData.fallbackIcon}</span>
        </div>
        
        ${intent.estimatedDamage && intent.estimatedDamage[0] > 0 ? `
          <div class="damage-prediction">
            <span class="damage-range">${intent.estimatedDamage[0]}-${intent.estimatedDamage[1]}</span>
            <span class="damage-type">${intent.damageType || 'Physical'}</span>
          </div>
        ` : ''}
        
        ${intent.additionalEffects && intent.additionalEffects.length > 0 ? `
          <div class="additional-effects">
            ${intent.additionalEffects.map(effect => `
              <span class="effect-indicator" title="${effect}">⚡</span>
            `).join('')}
          </div>
        ` : ''}
        
        ${intent.isMultiTarget ? `
          <div class="multi-target-indicator" title="Targets multiple enemies">
            <span class="multi-icon">⚡⚡</span>
          </div>
        ` : ''}
        
        <div class="intent-tooltip">
          <span class="tooltip-text">${intent.description}</span>
        </div>
      </div>
    `;
  }

  private getEnhancedIntentData(intent: any): {
    iconPath: string;
    fallbackIcon: string;
    className: string;
    animationClass: string;
  } {
    const intentData: Record<string, any> = {
      'attack': {
        iconPath: '/assets/ui/icons/sword.png',
        fallbackIcon: '⚔️',
        className: 'intent-attack',
        animationClass: 'intent-pulse-red'
      },
      'defend': {
        iconPath: '/assets/ui/icons/shield.png', 
        fallbackIcon: '🛡️',
        className: 'intent-defend',
        animationClass: 'intent-pulse-blue'
      },
      'ability': {
        iconPath: '/assets/ui/icons/magic.png',
        fallbackIcon: '✨',
        className: 'intent-ability',
        animationClass: 'intent-pulse-purple'
      },
      'move': {
        iconPath: '/assets/ui/icons/move.png',
        fallbackIcon: '🏃',
        className: 'intent-move',
        animationClass: 'intent-slide'
      },
      'nothing': {
        iconPath: '/assets/ui/icons/wait.png',
        fallbackIcon: '⏸️',
        className: 'intent-wait',
        animationClass: 'intent-fade'
      }
    };

    return intentData[intent.action] || {
      iconPath: '/assets/ui/icons/unknown.png',
      fallbackIcon: '❓',
      className: 'intent-unknown',
      animationClass: 'intent-pulse-gray'
    };
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

  private renderEnemyPlaceholder(state?: CombatState): string {
    const stateConfig = this.getEnemyPlaceholderConfig(state);
    
    return `
      <div class="participant enemy-participant placeholder ${stateConfig.cssClass}">
        <div class="participant-portrait">
          <div class="placeholder-portrait ${stateConfig.portraitClass}">
            <span class="placeholder-icon">${stateConfig.icon}</span>
            ${stateConfig.showPulse ? '<div class="placeholder-pulse"></div>' : ''}
          </div>
        </div>
        
        <div class="participant-info">
          <h3 class="participant-name">${stateConfig.title}</h3>
          <div class="enemy-type">${stateConfig.subtitle}</div>
          
          <div class="placeholder-stats">
            ${stateConfig.showProgress ? `
              <div class="enemy-preparation-progress">
                <div class="prep-label">${stateConfig.progressLabel}</div>
                <div class="prep-bar-container">
                  <div class="prep-bar animated"></div>
                </div>
              </div>
            ` : ''}
            
            <div class="placeholder-message">
              <span class="message-text">${stateConfig.message}</span>
            </div>
            
            ${stateConfig.showStats ? `
              <div class="estimated-stats">
                <div class="stat-preview">
                  <span class="stat-icon">⚔️</span>
                  <span class="stat-label">Est. Damage</span>
                  <span class="stat-value">8-12</span>
                </div>
                <div class="stat-preview">
                  <span class="stat-icon">🛡️</span>
                  <span class="stat-label">Est. Armor</span>
                  <span class="stat-value">3-6</span>
                </div>
                <div class="stat-preview">
                  <span class="stat-icon">💨</span>
                  <span class="stat-label">Est. Initiative</span>
                  <span class="stat-value">6-10</span>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  private getEnemyPlaceholderConfig(state?: CombatState) {
    switch (state) {
      case CombatState.INITIALIZING:
        return {
          cssClass: 'initializing',
          portraitClass: 'loading',
          icon: '⚙️',
          title: 'Spawning Enemy...',
          subtitle: 'Initializing Combat',
          message: '🎮 Setting up combat encounter',
          showPulse: true,
          showProgress: true,
          showStats: false,
          progressLabel: 'Spawning...'
        };
        
      case CombatState.ROLL_INITIATIVE:
        return {
          cssClass: 'initiative-enemy',
          portraitClass: 'rolling',
          icon: '🎲',
          title: 'Mystery Opponent',
          subtitle: 'Rolling Initiative',
          message: '🎯 Enemy is preparing for battle!',
          showPulse: true,
          showProgress: true,
          showStats: true,
          progressLabel: 'Rolling dice...'
        };
        
      case CombatState.PLAYER_TURN_START:
      case CombatState.PLAYER_ACTION_SELECT:
        return {
          cssClass: 'waiting',
          portraitClass: 'watching',
          icon: '👁️',
          title: 'Enemy Watching',
          subtitle: 'Awaiting Your Move',
          message: '⏳ Enemy observes your actions carefully',
          showPulse: false,
          showProgress: false,
          showStats: true,
          progressLabel: ''
        };
        
      case CombatState.ENEMY_TURN_START:
      case CombatState.ENEMY_INTENT:
      case CombatState.ENEMY_ACTION_RESOLVE:
        return {
          cssClass: 'active-enemy',
          portraitClass: 'active',
          icon: '👹',
          title: 'Enemy Acting',
          subtitle: 'Planning Attack',
          message: '⚔️ Enemy is making their move!',
          showPulse: true,
          showProgress: true,
          showStats: true,
          progressLabel: 'Calculating attack...'
        };
        
      default:
        return {
          cssClass: 'loading',
          portraitClass: 'loading',
          icon: '❓',
          title: 'Enemy Loading...',
          subtitle: 'Preparing...',
          message: '🔄 Loading enemy data',
          showPulse: true,
          showProgress: false,
          showStats: false,
          progressLabel: ''
        };
    }
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