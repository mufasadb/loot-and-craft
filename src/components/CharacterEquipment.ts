import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { reaction } from 'mobx';
import { dragDropManager } from '../services/DragDropManager';
import { gameStore } from '../stores/GameStore';
import { Item } from '../types/items';
import { EquipmentSlot } from '../types/enums';
import { AssetService } from '../services/AssetService';
import './ItemTooltip';
import './InventoryGrid';

@customElement('character-equipment')
export class CharacterEquipment extends LitElement {
  @state() private equipment: Partial<Record<EquipmentSlot, Item>> = {};
  @state() private playerStats: any = {};
  @state() private slotIcons: Partial<Record<EquipmentSlot, string>> = {};

  private disposer?: () => void;
  private dragCleanupFunctions: (() => void)[] = [];
  private assetsLoaded = false;

  static styles = css`
    :host {
      display: block;
      user-select: none;
    }

    .equipment-container {
      display: grid;
      grid-template-columns: 1fr 200px 1fr;
      grid-template-rows: repeat(4, 80px);
      gap: 8px;
      padding: 16px;
      background: var(--bg-secondary);
      border: 2px solid var(--border-color);
      border-radius: 8px;
      min-height: 400px;
    }

    .equipment-slot {
      width: 80px;
      height: 80px;
      border: 2px solid var(--border-dark);
      border-radius: 8px;
      background: var(--bg-primary);
      position: relative;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
    }

    .equipment-slot:hover {
      border-color: var(--accent-color);
      background: var(--bg-hover);
    }

    .equipment-slot.occupied {
      background: var(--bg-tertiary);
      border-color: var(--border-light);
    }

    .equipment-slot.drop-zone-hover {
      border-color: var(--success-color);
      background: var(--success-bg);
      transform: scale(1.05);
    }

    .equipment-slot.drop-zone-active {
      border-color: var(--accent-color);
      border-style: dashed;
    }

    .equipment-slot.drop-zone-invalid {
      border-color: var(--error-color);
      background: var(--error-bg);
    }

    /* Equipment slot positioning */
    .slot-helmet { grid-column: 2; grid-row: 1; }
    .slot-amulet { grid-column: 1; grid-row: 2; }
    .slot-weapon { grid-column: 1; grid-row: 3; }
    .slot-gloves { grid-column: 1; grid-row: 4; }
    
    .slot-chest { grid-column: 2; grid-row: 2; }
    .slot-shield { grid-column: 2; grid-row: 3; }
    .slot-boots { grid-column: 2; grid-row: 4; }
    
    .slot-ring1 { grid-column: 3; grid-row: 2; }
    .slot-ring2 { grid-column: 3; grid-row: 3; }

    .item-icon {
      width: 64px;
      height: 64px;
      object-fit: contain;
      pointer-events: none;
    }

    .slot-label {
      position: absolute;
      bottom: 2px;
      left: 2px;
      right: 2px;
      background: var(--bg-dark);
      color: var(--text-light);
      font-size: 10px;
      text-align: center;
      padding: 2px;
      border-radius: 2px;
      opacity: 0.9;
    }

    .slot-icon {
      width: 32px;
      height: 32px;
      opacity: 0.3;
      filter: grayscale(1);
    }

    .character-stats {
      grid-column: 1 / -1;
      grid-row: 5;
      margin-top: 16px;
      padding: 12px;
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 4px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }

    .stat-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 8px;
      background: var(--bg-secondary);
      border-radius: 4px;
      font-size: 12px;
    }

    .stat-label {
      color: var(--text-muted);
    }

    .stat-value {
      color: var(--text-light);
      font-weight: bold;
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

    .layout-container {
      display: flex;
      gap: 16px;
      align-items: flex-start;
    }

    .equipment-section {
      flex: 0 0 auto;
    }

    .inventory-section {
      flex: 1;
      min-width: 300px;
    }

    .section-title {
      color: var(--text-light);
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 8px;
      text-align: center;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.setupReactions();
    this.loadSlotIcons();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.disposer?.();
    this.cleanupDragListeners();
  }

  private setupReactions() {
    this.disposer = reaction(
      () => {
        const player = gameStore.player;
        return {
          equipment: player?.equipment ? { ...player.equipment } : {},
          stats: player?.computedStats || {}
        };
      },
      ({ equipment, stats }) => {
        this.equipment = equipment;
        this.playerStats = stats;
        this.requestUpdate();
      },
      { fireImmediately: true }
    );
  }

  private async loadSlotIcons() {
    if (this.assetsLoaded) return;
    
    try {
      // Search for equipment slot icons by tags and usage
      const slotMappings = [
        { slot: EquipmentSlot.WEAPON, tags: ['weapon', 'sword', 'melee'], searchTerms: 'sword' },
        { slot: EquipmentSlot.SHIELD, tags: ['shield', 'defense'], searchTerms: 'shield' },
        { slot: EquipmentSlot.HELMET, tags: ['helmet', 'hat', 'head'], searchTerms: 'helmet' },
        { slot: EquipmentSlot.CHEST, tags: ['armor', 'chest', 'torso'], searchTerms: 'armor' },
        { slot: EquipmentSlot.GLOVES, tags: ['gloves', 'hands'], searchTerms: 'gloves' },
        { slot: EquipmentSlot.BOOTS, tags: ['boots', 'feet'], searchTerms: 'boots' },
        { slot: EquipmentSlot.AMULET, tags: ['amulet', 'necklace'], searchTerms: 'amulet' },
        { slot: EquipmentSlot.RING1, tags: ['ring', 'jewelry'], searchTerms: 'ring' },
        { slot: EquipmentSlot.RING2, tags: ['ring', 'jewelry'], searchTerms: 'ring' }
      ];

      const newSlotIcons: Partial<Record<EquipmentSlot, string>> = {};

      for (const mapping of slotMappings) {
        try {
          // Try searching by tags first
          let assets = await AssetService.searchAssets({
            tags: mapping.tags,
            usage: ['inventory_icon', 'equipment_display', 'ui_element'],
            limit: 5
          });

          // If no results by tags, try searching by path contains
          if (!assets.length) {
            assets = await AssetService.searchAssets({
              pathContains: mapping.searchTerms,
              usage: ['inventory_icon', 'equipment_display', 'ui_element'],
              limit: 5
            });
          }

          // Use the first found asset or fallback to original icon
          if (assets.length > 0) {
            newSlotIcons[mapping.slot] = assets[0].path;
          } else {
            newSlotIcons[mapping.slot] = this.getFallbackIcon(mapping.slot);
          }
        } catch (error) {
          console.warn(`Failed to load icon for ${mapping.slot}:`, error);
          newSlotIcons[mapping.slot] = this.getFallbackIcon(mapping.slot);
        }
      }

      this.slotIcons = newSlotIcons;
      this.assetsLoaded = true;
      this.requestUpdate();
    } catch (error) {
      console.error('Failed to load slot icons:', error);
      // Use fallback icons
      const fallbackIcons: Partial<Record<EquipmentSlot, string>> = {};
      Object.values(EquipmentSlot).forEach(slot => {
        fallbackIcons[slot] = this.getFallbackIcon(slot);
      });
      this.slotIcons = fallbackIcons;
      this.assetsLoaded = true;
      this.requestUpdate();
    }
  }

  private cleanupDragListeners() {
    this.dragCleanupFunctions.forEach(cleanup => cleanup());
    this.dragCleanupFunctions = [];
  }

  private setupDragListeners() {
    this.cleanupDragListeners();
    
    Object.entries(this.equipment).forEach(([slot, item]) => {
      if (item) {
        const itemElement = this.shadowRoot?.querySelector(`[data-equipment-slot="${slot}"] .item-icon`) as HTMLElement;
        if (itemElement) {
          const cleanup = dragDropManager.attachDragListeners(
            itemElement,
            item,
            'equipment',
            undefined,
            slot as EquipmentSlot
          );
          this.dragCleanupFunctions.push(cleanup);
        }
      }
    });
  }

  private handleSlotClick(slot: EquipmentSlot, item?: Item) {
    if (item) {
      // Show item tooltip or context menu
      this.dispatchEvent(new CustomEvent('equipment-item-selected', {
        detail: { item, slot },
        bubbles: true
      }));
    }
  }

  private getFallbackIcon(slot: EquipmentSlot): string {
    const iconMap: Record<EquipmentSlot, string> = {
      [EquipmentSlot.WEAPON]: '/assets/ui/icons/weapon.svg',
      [EquipmentSlot.SHIELD]: '/assets/ui/icons/shield.svg',
      [EquipmentSlot.HELMET]: '/assets/ui/icons/helmet.svg',
      [EquipmentSlot.CHEST]: '/assets/ui/icons/chest.svg',
      [EquipmentSlot.GLOVES]: '/assets/ui/icons/gloves.svg',
      [EquipmentSlot.BOOTS]: '/assets/ui/icons/boots.svg',
      [EquipmentSlot.AMULET]: '/assets/ui/icons/amulet.svg',
      [EquipmentSlot.RING1]: '/assets/ui/icons/ring.svg',
      [EquipmentSlot.RING2]: '/assets/ui/icons/ring.svg'
    };
    return iconMap[slot] || '/assets/ui/icons/empty-slot.svg';
  }

  private getSlotIcon(slot: EquipmentSlot): string {
    // Use dynamic asset if loaded, otherwise fallback to original icons
    return this.slotIcons[slot] || this.getFallbackIcon(slot);
  }

  private getSlotLabel(slot: EquipmentSlot): string {
    const labelMap: Record<EquipmentSlot, string> = {
      [EquipmentSlot.WEAPON]: 'Weapon',
      [EquipmentSlot.SHIELD]: 'Shield',
      [EquipmentSlot.HELMET]: 'Helmet',
      [EquipmentSlot.CHEST]: 'Chest',
      [EquipmentSlot.GLOVES]: 'Gloves',
      [EquipmentSlot.BOOTS]: 'Boots',
      [EquipmentSlot.AMULET]: 'Amulet',
      [EquipmentSlot.RING1]: 'Ring 1',
      [EquipmentSlot.RING2]: 'Ring 2'
    };
    return labelMap[slot] || slot;
  }

  protected updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);
    setTimeout(() => this.setupDragListeners(), 0);
  }

  render() {
    const equipmentSlots = Object.values(EquipmentSlot).map(slot => {
      const item = this.equipment[slot];
      return html`
        <div 
          class="equipment-slot slot-${slot} ${item ? 'occupied' : ''}"
          data-equipment-slot=${slot}
          data-drop-zone=${JSON.stringify({ type: 'equipment', slot })}
          @click=${() => this.handleSlotClick(slot, item)}
        >
          ${item ? html`
            <img 
              class="item-icon rarity-${item.rarity}"
              src=${item.iconPath || '/assets/icons/default-item.svg'}
              alt=${item.name}
            />
          ` : html`
            <img 
              class="slot-icon"
              src=${this.getSlotIcon(slot)}
              alt=${this.getSlotLabel(slot)}
            />
          `}
          <div class="slot-label">${this.getSlotLabel(slot)}</div>
        </div>
      `;
    });

    const stats = [
      { label: 'Health', value: `${this.playerStats.maxHealth || 0}` },
      { label: 'Mana', value: `${this.playerStats.maxMana || 0}` },
      { label: 'Damage', value: `${this.playerStats.damage || 0}` },
      { label: 'Armor', value: `${this.playerStats.armor || 0}` },
      { label: 'Initiative', value: `${this.playerStats.initiative || 0}` },
      { label: 'Level', value: `${gameStore.player?.level || 1}` }
    ];

    return html`
      <div class="layout-container">
        <div class="equipment-section">
          <div class="section-title">Equipment</div>
          <div class="equipment-container">
            ${equipmentSlots}
            
            <div class="character-stats">
              <div class="stats-grid">
                ${stats.map(stat => html`
                  <div class="stat-item">
                    <span class="stat-label">${stat.label}:</span>
                    <span class="stat-value">${stat.value}</span>
                  </div>
                `)}
              </div>
            </div>
          </div>
        </div>
        
        <div class="inventory-section">
          <div class="section-title">Inventory</div>
          <inventory-grid .gridSize=${20} .columns=${5}></inventory-grid>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-equipment': CharacterEquipment;
  }
}