import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { reaction } from 'mobx';
import { dragDropManager } from '../services/DragDropManager';
import { gameStore } from '../stores/GameStore';
import { Item } from '../types/items';
import { AssetService, Asset } from '../services/AssetService';
import './ItemTooltip';

@customElement('inventory-grid')
export class InventoryGrid extends LitElement {
  @property({ type: Number }) gridSize = 20;
  @property({ type: Number }) columns = 5;
  
  @state() private items: Item[] = [];
  @state() private itemIcons: Map<string, string> = new Map();

  private disposer?: () => void;
  private dragCleanupFunctions: (() => void)[] = [];
  private iconLoadingCache = new Set<string>();

  static styles = css`
    :host {
      display: block;
      user-select: none;
    }

    .grid-container {
      display: grid;
      grid-template-columns: repeat(var(--columns), 60px);
      gap: 2px;
      padding: 8px;
      background: var(--bg-secondary);
      border: 2px solid var(--border-color);
      border-radius: 4px;
    }

    .grid-slot {
      width: 60px;
      height: 60px;
      border: 1px solid var(--border-dark);
      border-radius: 4px;
      background: var(--bg-primary);
      position: relative;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .grid-slot:hover {
      border-color: var(--accent-color);
      background: var(--bg-hover);
    }

    .grid-slot.drag-over {
      border-color: var(--success-color);
      background: var(--success-bg);
      transform: scale(1.05);
    }

    .grid-slot.occupied {
      background: var(--bg-tertiary);
    }

    .item-icon {
      width: 48px;
      height: 48px;
      object-fit: contain;
      pointer-events: none;
    }

    .item-stack {
      position: absolute;
      bottom: 2px;
      right: 2px;
      background: var(--bg-dark);
      color: var(--text-light);
      font-size: 10px;
      padding: 1px 4px;
      border-radius: 2px;
      min-width: 12px;
      text-align: center;
    }

    .rarity-normal {
      filter: none;
    }

    .rarity-magic {
      filter: sepia(1) hue-rotate(200deg) saturate(1.5);
    }

    .rarity-rare {
      filter: sepia(1) hue-rotate(50deg) saturate(2);
    }

    .rarity-unique {
      filter: sepia(1) hue-rotate(280deg) saturate(2);
    }

    .dragging {
      opacity: 0.5;
      transform: scale(0.9);
    }

    .empty-message {
      grid-column: 1 / -1;
      text-align: center;
      color: var(--text-muted);
      font-style: italic;
      padding: 20px;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.setupReactions();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.disposer?.();
    this.cleanupDragListeners();
  }

  private setupReactions() {
    this.disposer = reaction(
      () => gameStore.player?.inventory.items || [],
      (items) => {
        this.items = [...items];
        this.loadItemIcons(items);
        this.requestUpdate();
      },
      { fireImmediately: true }
    );
  }

  private async loadItemIcons(items: Item[]) {
    // Load icons for items that don't have iconPath or need better icons
    for (const item of items) {
      if (!item.iconPath || item.iconPath === '/assets/icons/default-item.svg') {
        await this.findSmartIcon(item);
      }
    }
  }

  private async findSmartIcon(item: Item) {
    // Avoid loading the same item multiple times
    const cacheKey = `${item.type}_${item.name}`;
    if (this.iconLoadingCache.has(cacheKey)) return;
    this.iconLoadingCache.add(cacheKey);

    try {
      // Build search tags based on item properties
      const searchTags = [
        item.type.toLowerCase(),
        ...item.name.toLowerCase().split(' '),
        item.rarity?.toLowerCase()
      ].filter(Boolean);

      // Search for appropriate icon
      let assets = await AssetService.searchAssets({
        tags: searchTags,
        usage: ['inventory_icon', 'equipment_display', 'game_icon'],
        limit: 3
      });

      // If no results by tags, try searching by item type
      if (!assets.length) {
        assets = await AssetService.searchAssets({
          pathContains: item.type.toLowerCase(),
          usage: ['inventory_icon', 'equipment_display', 'game_icon'],
          limit: 3
        });
      }

      // If still no results, try broader search by name parts
      if (!assets.length && item.name) {
        const nameKeywords = item.name.toLowerCase().split(' ')[0]; // Use first word
        assets = await AssetService.searchAssets({
          pathContains: nameKeywords,
          usage: ['inventory_icon', 'equipment_display', 'game_icon'],
          limit: 3
        });
      }

      if (assets.length > 0) {
        // Prefer assets with more specific tags that match our item
        const bestAsset = this.selectBestAsset(assets, item);
        this.itemIcons.set(item.id, bestAsset.path);
        this.requestUpdate();
      }
    } catch (error) {
      console.warn(`Failed to find smart icon for item ${item.name}:`, error);
    }
  }

  private selectBestAsset(assets: Asset[], item: Item): Asset {
    // Score assets based on relevance to the item
    const scoredAssets = assets.map(asset => {
      let score = 0;
      const itemType = item.type.toLowerCase();
      const itemName = item.name.toLowerCase();

      // Higher score for exact type match in tags
      if (asset.tags.some(tag => tag.toLowerCase() === itemType)) {
        score += 10;
      }

      // Score for name keywords in tags
      itemName.split(' ').forEach(word => {
        if (asset.tags.some(tag => tag.toLowerCase().includes(word))) {
          score += 5;
        }
      });

      // Score for rarity match
      if (item.rarity && asset.tags.some(tag => tag.toLowerCase() === item.rarity?.toLowerCase())) {
        score += 3;
      }

      // Prefer equipment_display usage for equipment items
      if (item.type === 'equipment' && asset.usage.includes('equipment_display')) {
        score += 2;
      }

      return { asset, score };
    });

    // Return the highest scoring asset
    scoredAssets.sort((a, b) => b.score - a.score);
    return scoredAssets[0].asset;
  }

  private getItemIcon(item: Item): string {
    // Use smart icon if available, otherwise use item's iconPath or fallback
    const smartIcon = this.itemIcons.get(item.id);
    return smartIcon || item.iconPath || '/assets/icons/default-item.svg';
  }

  private cleanupDragListeners() {
    this.dragCleanupFunctions.forEach(cleanup => cleanup());
    this.dragCleanupFunctions = [];
  }

  private handleSlotClick(index: number, item?: Item) {
    if (item) {
      // Show item tooltip or context menu
      this.dispatchEvent(new CustomEvent('item-selected', {
        detail: { item, slot: index },
        bubbles: true
      }));
    }
  }

  private setupDragListeners() {
    this.cleanupDragListeners();
    
    this.items.forEach((item, index) => {
      const itemElement = this.shadowRoot?.querySelector(`[data-item-id="${item.id}"]`) as HTMLElement;
      if (itemElement) {
        const cleanup = dragDropManager.attachDragListeners(
          itemElement,
          item,
          'inventory',
          index
        );
        this.dragCleanupFunctions.push(cleanup);
      }
    });
  }

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    
    // Update CSS custom property for grid columns
    this.style.setProperty('--columns', this.columns.toString());
    
    // Setup drag listeners after render
    setTimeout(() => this.setupDragListeners(), 0);
  }

  render() {
    const slots = Array.from({ length: this.gridSize }, (_, index) => {
      const item = this.items[index];

      return html`
        <div 
          class="grid-slot ${item ? 'occupied' : ''}"
          data-drop-zone=${JSON.stringify({ type: 'inventory', index })}
          @click=${() => this.handleSlotClick(index, item)}
        >
          ${item ? html`
            <img 
              class="item-icon rarity-${item.rarity}"
              data-item-id=${item.id}
              src=${this.getItemIcon(item)}
              alt=${item.name}
            />
            ${item.stackSize > 1 ? html`
              <div class="item-stack">${item.stackSize}</div>
            ` : ''}
          ` : ''}
        </div>
      `;
    });

    return html`
      <div class="grid-container">
        ${this.items.length === 0 ? html`
          <div class="empty-message">
            Inventory is empty
          </div>
        ` : slots}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'inventory-grid': InventoryGrid;
  }
}