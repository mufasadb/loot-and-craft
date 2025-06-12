export type CombatLogMessageType = 'info' | 'combat' | 'damage' | 'healing' | 'effect' | 'victory' | 'defeat' | 'warning' | 'error' | 'loot' | 'penalty';

export interface CombatLogMessage {
  id: string;
  text: string;
  type: CombatLogMessageType;
  timestamp: Date;
}

export class CombatLog {
  private messages: CombatLogMessage[] = [];
  private maxMessages: number = 50;

  constructor() {
    this.addMessage('⚔️ Combat log initialized', 'info');
  }

  public addMessage(text: string, type: CombatLogMessageType = 'info'): void {
    const message: CombatLogMessage = {
      id: this.generateId(),
      text,
      type,
      timestamp: new Date()
    };

    this.messages.push(message);

    // Keep only the last maxMessages
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(-this.maxMessages);
    }

    // Auto-scroll to bottom if container exists
    this.scrollToBottom();
  }

  public clearLog(): void {
    this.messages = [];
    this.addMessage('⚔️ Combat log cleared', 'info');
  }

  public render(): string {
    return `
      <div class="combat-log">
        <div class="combat-log-header">
          <h4>Combat Log</h4>
          <div class="log-controls">
            <button class="btn btn-small" data-action="clear-combat-log" title="Clear log">🗑️</button>
            <button class="btn btn-small" data-action="scroll-to-top" title="Scroll to top">⬆️</button>
            <button class="btn btn-small" data-action="scroll-to-bottom" title="Scroll to bottom">⬇️</button>
          </div>
        </div>
        <div class="combat-log-messages" data-combat-log-container>
          ${this.messages.map(message => this.renderMessage(message)).join('')}
        </div>
      </div>
    `;
  }

  private renderMessage(message: CombatLogMessage): string {
    const timeStr = message.timestamp.toLocaleTimeString([], { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });

    const messageClass = `log-message log-${message.type}`;
    const icon = this.getMessageIcon(message.type);

    return `
      <div class="${messageClass}" data-message-id="${message.id}">
        <span class="log-timestamp">[${timeStr}]</span>
        <span class="log-icon">${icon}</span>
        <span class="log-text">${message.text}</span>
      </div>
    `;
  }

  private getMessageIcon(type: CombatLogMessageType): string {
    const icons: Record<CombatLogMessageType, string> = {
      'info': 'ℹ️',
      'combat': '⚔️',
      'damage': '💥',
      'healing': '💚',
      'effect': '✨',
      'victory': '🏆',
      'defeat': '💀',
      'warning': '⚠️',
      'error': '❌',
      'loot': '💰',
      'penalty': '💸'
    };
    return icons[type] || 'ℹ️';
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public setupEventListeners(): void {
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const action = target.getAttribute('data-action');

      switch (action) {
        case 'clear-combat-log':
          this.clearLog();
          this.refreshDisplay();
          break;
        case 'scroll-to-top':
          this.scrollToTop();
          break;
        case 'scroll-to-bottom':
          this.scrollToBottom();
          break;
      }
    });
  }

  private refreshDisplay(): void {
    const container = document.querySelector('[data-combat-log-container]');
    if (container) {
      container.innerHTML = this.messages.map(message => this.renderMessage(message)).join('');
      this.scrollToBottom();
    }
  }

  private scrollToBottom(): void {
    // Use setTimeout to ensure DOM is updated
    setTimeout(() => {
      const container = document.querySelector('[data-combat-log-container]');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 0);
  }

  private scrollToTop(): void {
    const container = document.querySelector('[data-combat-log-container]');
    if (container) {
      container.scrollTop = 0;
    }
  }

  public getMessages(): CombatLogMessage[] {
    return [...this.messages];
  }

  public getRecentMessages(count: number = 10): CombatLogMessage[] {
    return this.messages.slice(-count);
  }

  public exportLog(): string {
    return this.messages
      .map(msg => `[${msg.timestamp.toISOString()}] ${msg.type.toUpperCase()}: ${msg.text}`)
      .join('\n');
  }

  // Predefined message helpers for common combat events
  public logDamage(attacker: string, target: string, damage: number, isCritical: boolean = false): void {
    const critText = isCritical ? ' (CRITICAL HIT!)' : '';
    this.addMessage(`${attacker} deals ${damage} damage to ${target}${critText}`, 'damage');
  }

  public logHealing(target: string, amount: number): void {
    this.addMessage(`${target} recovers ${amount} health`, 'healing');
  }

  public logEffectApplied(target: string, effectName: string): void {
    this.addMessage(`${effectName} applied to ${target}`, 'effect');
  }

  public logEffectRemoved(target: string, effectName: string): void {
    this.addMessage(`${effectName} removed from ${target}`, 'effect');
  }

  public logBlock(defender: string, damage: number, reducedDamage: number): void {
    const blocked = damage - reducedDamage;
    this.addMessage(`${defender} blocks ${blocked} damage (${reducedDamage} received)`, 'combat');
  }

  public logMiss(attacker: string, target: string): void {
    this.addMessage(`${attacker}'s attack misses ${target}`, 'combat');
  }

  public logAbilityUsed(user: string, abilityName: string, manaCost?: number): void {
    const costText = manaCost ? ` (${manaCost} mana)` : '';
    this.addMessage(`${user} uses ${abilityName}${costText}`, 'combat');
  }

  public logTurnStart(participant: string, turnNumber: number): void {
    this.addMessage(`--- Turn ${turnNumber}: ${participant}'s turn begins ---`, 'info');
  }

  public logEscape(participant: string, success: boolean): void {
    if (success) {
      this.addMessage(`${participant} successfully escapes from combat!`, 'info');
    } else {
      this.addMessage(`${participant} fails to escape!`, 'warning');
    }
  }

  public destroy(): void {
    this.messages = [];
  }
}