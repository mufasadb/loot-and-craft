import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Item } from '../types/items';
import { gameStore } from '../stores/GameStore';
import { AssetService } from '../services/AssetService';

@customElement('item-tooltip')
export class ItemTooltip extends LitElement {
  @property({ type: Object }) item: Item | null = null;
  @property({ type: Number }) x = 0;
  @property({ type: Number }) y = 0;
  @property({ type: Boolean }) visible = false;
  
  @state() private frameAssets: { corner?: string; border?: string } = {};
  
  private assetsLoaded = false;

  static styles = css`
    :host {
      position: fixed;
      z-index: 2000;
      background: var(--bg-primary);
      border: 2px solid var(--border-color);
      border-radius: 8px;
      padding: 10px;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
      pointer-events: none;
      font-size: 12px;
      display: none;
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
    }

    :host(.rpg-styled) {
      border-image-source: var(--tooltip-border-image);
      border-image-slice: 10 fill;
      border-image-width: 10px;
      border-image-repeat: stretch;
      background-blend-mode: overlay;
    }

    :host(.visible) {
      display: block;
    }

    .tooltip-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-color);
    }

    .tooltip-header.rarity-rare {
      border-bottom-color: #FFD700;
    }

    .tooltip-header.rarity-magic {
      border-bottom-color: #4169E1;
    }

    .tooltip-header.rarity-unique {
      border-bottom-color: #8B4513;
    }

    .tooltip-icon {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      border-radius: 4px;
      flex-shrink: 0;
    }

    .tooltip-title h3 {
      margin: 0;
      font-size: 14px;
      color: var(--text-light);
    }

    .tooltip-title .item-type {
      margin: 2px 0 0 0;
      font-size: 11px;
      color: var(--text-muted);
    }

    .tooltip-section {
      margin-bottom: 8px;
    }

    .tooltip-section:last-child {
      margin-bottom: 0;
    }

    .tooltip-section h4 {
      margin: 0 0 4px 0;
      font-size: 12px;
      color: var(--accent-color);
    }

    .stat-line {
      margin: 2px 0;
      font-size: 11px;
    }

    .stat-line.positive {
      color: var(--success-color);
    }

    .stat-line.negative {
      color: var(--error-color);
    }

    .description p {
      margin: 0;
      font-size: 11px;
      color: var(--text-muted);
      font-style: italic;
    }

    .requirement {
      margin: 2px 0;
      font-size: 11px;
      color: var(--text-muted);
    }

    .requirement.negative {
      color: var(--error-color);
    }

    .item-value {
      font-size: 11px;
      color: var(--accent-color);
      text-align: right;
    }

    .tooltip-header.enhanced {
      background: linear-gradient(135deg, rgba(255,215,0,0.1), rgba(0,0,0,0.1));
      border-radius: 4px;
      padding: 8px;
    }

    .tooltip-section.enhanced {
      background: rgba(0,0,0,0.3);
      border-radius: 4px;
      padding: 6px;
      margin: 4px 0;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.loadTooltipAssets();
  }

  private async loadTooltipAssets() {
    if (this.assetsLoaded) return;
    
    try {
      // Search for tooltip/frame assets from Classic RPG GUI collection
      const frameAssets = await AssetService.searchAssets({
        tags: ['frame', 'border', 'ui', 'panel'],
        usage: ['ui_element', 'frame', 'background'],
        pathContains: 'classic',
        limit: 5
      });

      const backgroundAssets = await AssetService.searchAssets({
        tags: ['background', 'panel', 'parchment', 'paper'],
        usage: ['ui_element', 'background'],
        pathContains: 'classic',
        limit: 5
      });

      // Use the first suitable assets found
      if (frameAssets.length > 0) {
        this.frameAssets.border = frameAssets[0].path;
        this.style.setProperty('--tooltip-border-image', `url('${frameAssets[0].path}')`);
      }

      if (backgroundAssets.length > 0) {
        this.style.backgroundImage = `url('${backgroundAssets[0].path}')`;
        this.classList.add('rpg-styled');
      }

      this.assetsLoaded = true;
      this.requestUpdate();
    } catch (error) {
      console.warn('Failed to load tooltip assets:', error);
      this.assetsLoaded = true;
    }
  }

  updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);
    
    if (changedProperties.has('visible') || changedProperties.has('x') || changedProperties.has('y')) {
      if (this.visible) {
        this.classList.add('visible');
        this.style.left = `${this.x}px`;
        this.style.top = `${this.y}px`;
        this.adjustPosition();
      } else {
        this.classList.remove('visible');
      }
    }
  }

  private adjustPosition() {
    const rect = this.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    // Adjust horizontal position
    if (rect.right > viewport.width) {
      const overflow = rect.right - viewport.width;
      this.style.left = `${this.x - overflow - 10}px`;
    }

    // Adjust vertical position
    if (rect.bottom > viewport.height) {
      const overflow = rect.bottom - viewport.height;
      this.style.top = `${this.y - overflow - 10}px`;
    }
  }

  private getItemTypeText(item: Item): string {
    if (item.equipment) {
      return `${item.equipment.baseType || item.equipment.slot}`;
    }
    if (item.crafting) {
      return item.crafting.materialType;
    }
    if (item.key) {
      return `Tier ${item.key.tier} Key`;
    }
    return item.type.charAt(0).toUpperCase() + item.type.slice(1);
  }

  private renderStats(item: Item) {
    if (!item.equipment?.inherentStats || Object.keys(item.equipment.inherentStats).length === 0) {
      return '';
    }

    const statLines = Object.entries(item.equipment.inherentStats)
      .map(([stat, value]) => {
        if (value === undefined) return '';
        const displayName = this.getStatDisplayName(stat);
        const isPositive = value > 0;
        return html`<div class="stat-line ${isPositive ? 'positive' : 'negative'}">
          ${isPositive ? '+' : ''}${value} ${displayName}
        </div>`;
      })
      .filter(line => line !== '');

    if (statLines.length === 0) return '';

    const enhancedClass = this.assetsLoaded ? 'enhanced' : '';

    return html`
      <div class="tooltip-section ${enhancedClass}">
        <h4>Stats</h4>
        ${statLines}
      </div>
    `;
  }

  private getStatDisplayName(stat: string): string {
    const statNames: { [key: string]: string } = {
      damage: 'Damage',
      armor: 'Armor',
      maxHealth: 'Max Health',
      maxMana: 'Max Mana',
      maxEnergyShield: 'Max Energy Shield',
      initiative: 'Initiative',
      level: 'Level'
    };
    return statNames[stat] || stat;
  }

  private renderRequirements(item: Item) {
    if (!item.equipment?.levelRequirement) {
      return '';
    }

    const player = gameStore.player;
    const meetsRequirement = !player || player.level >= item.equipment.levelRequirement;
    const enhancedClass = this.assetsLoaded ? 'enhanced' : '';
    
    return html`
      <div class="tooltip-section ${enhancedClass}">
        <h4>Requirements</h4>
        <div class="requirement ${meetsRequirement ? '' : 'negative'}">
          Level ${item.equipment.levelRequirement}
        </div>
      </div>
    `;
  }

  private getItemRarityColor(rarity: string): string {
    switch (rarity) {
      case 'normal': return '#808080';
      case 'magic': return '#4169E1';
      case 'rare': return '#FFD700';
      case 'unique': return '#8B4513';
      case 'set': return '#00FF00';
      default: return '#808080';
    }
  }

  render() {
    if (!this.item) return html``;

    const enhancedClass = this.assetsLoaded ? 'enhanced' : '';

    return html`
      <div class="tooltip-header rarity-${this.item.rarity} ${enhancedClass}">
        <div class="tooltip-icon" style="background-color: ${this.getItemRarityColor(this.item.rarity)}">
          ${this.item.name.charAt(0).toUpperCase()}
        </div>
        <div class="tooltip-title">
          <h3>${this.item.name}</h3>
          <p class="item-type">${this.getItemTypeText(this.item)}</p>
        </div>
      </div>
      
      ${this.renderStats(this.item)}
      ${this.renderRequirements(this.item)}
      
      ${this.item.description ? html`
        <div class="tooltip-section description ${enhancedClass}">
          <p>${this.item.description}</p>
        </div>
      ` : ''}
    `;
  }
}

// Global tooltip instance for easy access
let globalTooltip: ItemTooltip | null = null;

export const itemTooltip = {
  show(item: Item, x: number, y: number) {
    if (!globalTooltip) {
      globalTooltip = document.createElement('item-tooltip') as ItemTooltip;
      document.body.appendChild(globalTooltip);
    }
    
    globalTooltip.item = item;
    globalTooltip.x = x;
    globalTooltip.y = y;
    globalTooltip.visible = true;
  },
  
  hide() {
    if (globalTooltip) {
      globalTooltip.visible = false;
    }
  }
};

declare global {
  interface HTMLElementTagNameMap {
    'item-tooltip': ItemTooltip;
  }
}