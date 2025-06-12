import { makeObservable, observable, action, computed } from 'mobx'
import { Item } from '../types/items'

export type CenterContent = 'town' | 'combat' | 'dungeon' | 'craft' | 'trade' | 'disenchant' | 'character'
export type InventoryFilter = 'all' | 'equipment' | 'crafting' | 'keys' | 'consumables'

export class UIStore {
  // Mobile panel states
  leftPanelOpen = true
  rightPanelOpen = false
  
  // Center panel content
  centerContent: CenterContent = 'town'
  
  // Screen dimensions for responsive design
  screenWidth = window.innerWidth
  screenHeight = window.innerHeight
  
  // Inventory management
  inventoryFilter: InventoryFilter = 'all'
  selectedItem: Item | null = null
  showItemTooltip = false
  tooltipPosition = { x: 0, y: 0 }
  
  // Drag and drop state
  isDragMode = false

  constructor() {
    makeObservable(this, {
      leftPanelOpen: observable,
      rightPanelOpen: observable,
      centerContent: observable,
      screenWidth: observable,
      screenHeight: observable,
      inventoryFilter: observable,
      selectedItem: observable,
      showItemTooltip: observable,
      tooltipPosition: observable,
      isDragMode: observable,
      isMobile: computed,
      setLeftPanelOpen: action,
      setRightPanelOpen: action,
      setCenterContent: action,
      updateScreenSize: action,
      setInventoryFilter: action,
      setSelectedItem: action,
      showTooltip: action,
      hideTooltip: action,
      setDragMode: action
    })

    // Note: resize listener is handled in main.ts to avoid multiple listeners
  }

  get isMobile() {
    return this.screenWidth < 768
  }

  setLeftPanelOpen(open: boolean) {
    this.leftPanelOpen = open
  }

  setRightPanelOpen(open: boolean) {
    this.rightPanelOpen = open
  }

  setCenterContent(content: CenterContent) {
    this.centerContent = content
  }

  updateScreenSize = () => {
    this.screenWidth = window.innerWidth
    this.screenHeight = window.innerHeight
  }

  toggleLeftPanel() {
    this.setLeftPanelOpen(!this.leftPanelOpen)
  }

  toggleRightPanel() {
    this.setRightPanelOpen(!this.rightPanelOpen)
  }

  // Auto-close inventory panel when entering combat on mobile
  enterCombat() {
    this.setCenterContent('combat')
    if (this.isMobile) {
      this.setRightPanelOpen(false)
    }
    
    // Enemy creation will be handled by the CombatArena component
    // to avoid circular imports
  }

  // Navigation helpers
  goToTown() {
    this.setCenterContent('town')
  }

  goToDungeon() {
    this.setCenterContent('dungeon')
  }

  goToCraft() {
    this.setCenterContent('craft')
  }

  goToTrade() {
    this.setCenterContent('trade')
  }

  goToCharacter() {
    this.setCenterContent('character')
  }

  // Inventory management actions
  setInventoryFilter(filter: InventoryFilter) {
    this.inventoryFilter = filter
  }

  setSelectedItem(item: Item | null) {
    this.selectedItem = item
  }

  showTooltip(item: Item, x: number, y: number) {
    this.selectedItem = item
    this.tooltipPosition = { x, y }
    this.showItemTooltip = true
  }

  hideTooltip() {
    this.showItemTooltip = false
    this.selectedItem = null
  }

  setDragMode(enabled: boolean) {
    this.isDragMode = enabled
  }

  // Computed filter for inventory items
  filterItems(items: Item[]): Item[] {
    if (this.inventoryFilter === 'all') {
      return items
    }

    return items.filter(item => {
      switch (this.inventoryFilter) {
        case 'equipment':
          return item.type === 'equipment'
        case 'crafting':
          return item.type === 'crafting'
        case 'keys':
          return item.type === 'key'
        case 'consumables':
          return item.type === 'crafting' && item.crafting?.materialType === 'potion'
        default:
          return true
      }
    })
  }
}

export const uiStore = new UIStore()

// Add action to make observable changes trigger re-renders
export const makeUIObserver = () => {
  return {
    observe: (fn: () => void) => {
      fn()
      // Simple observer pattern for DOM updates
      const updateHandler = () => fn()
      uiStore.screenWidth // Access observable to trigger
      uiStore.centerContent // Access observable to trigger
      uiStore.leftPanelOpen // Access observable to trigger
      uiStore.rightPanelOpen // Access observable to trigger
      return updateHandler
    }
  }
}