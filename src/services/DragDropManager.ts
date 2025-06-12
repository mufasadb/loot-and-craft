// Drag and Drop system for inventory and equipment management

import { makeObservable, observable, action } from 'mobx'
import { gameStore } from '../stores/GameStore'
import { Item } from '../types/items'
import { EquipmentSlot } from '../types/enums'

export interface DragData {
  item: Item
  sourceType: 'inventory' | 'equipment' | 'vendor' | 'stash'
  sourceIndex?: number
  sourceSlot?: EquipmentSlot
}

export interface DropTarget {
  type: 'inventory' | 'equipment' | 'vendor' | 'stash' | 'trash'
  slot?: EquipmentSlot
  index?: number
}

export class DragDropManager {
  // Current drag state
  isDragging = false
  dragData: DragData | null = null
  dragElement: HTMLElement | null = null
  ghostElement: HTMLElement | null = null
  
  // Drop zones and validation
  activeDropZones: HTMLElement[] = []
  hoveredDropZone: HTMLElement | null = null
  
  // Touch/mouse position
  currentPosition = { x: 0, y: 0 }
  
  // Settings
  dragThreshold = 15 // pixels to move before drag starts
  longPressDelay = 300 // ms for mobile long press

  constructor() {
    makeObservable(this, {
      isDragging: observable,
      dragData: observable,
      hoveredDropZone: observable,
      currentPosition: observable,
      startDrag: action,
      updateDrag: action,
      endDrag: action
    })
  }

  startDrag(item: Item, sourceElement: HTMLElement, sourceType: 'inventory' | 'equipment', sourceIndex?: number, sourceSlot?: EquipmentSlot) {
    if (this.isDragging) return

    this.isDragging = true
    this.dragData = {
      item,
      sourceType,
      sourceIndex,
      sourceSlot
    }
    this.dragElement = sourceElement

    // Create ghost element
    this.createGhostElement(item)
    
    // Add visual feedback to source
    sourceElement.classList.add('dragging')
    
    // Show drop zones
    this.highlightDropZones()
    
    console.log('Started dragging:', item.name)
  }

  updateDrag(x: number, y: number) {
    if (!this.isDragging || !this.ghostElement) return

    this.currentPosition = { x, y }
    
    // Update ghost position
    this.ghostElement.style.left = `${x - 20}px`
    this.ghostElement.style.top = `${y - 20}px`
    
    // Check for drop zone hover
    const element = document.elementFromPoint(x, y)
    const dropZone = element?.closest('[data-drop-zone]') as HTMLElement
    
    if (dropZone !== this.hoveredDropZone) {
      this.setHoveredDropZone(dropZone)
    }
  }

  endDrag() {
    if (!this.isDragging) return

    const success = this.attemptDrop()
    
    // Cleanup
    this.cleanup()
    
    console.log('Drag ended:', success ? 'success' : 'cancelled')
    return success
  }

  private attemptDrop(): boolean {
    if (!this.dragData || !this.hoveredDropZone) return false

    const dropTarget = this.parseDropTarget(this.hoveredDropZone)
    if (!dropTarget) return false

    return this.executeMove(this.dragData, dropTarget)
  }

  private executeMove(dragData: DragData, dropTarget: DropTarget): boolean {
    const player = gameStore.player
    if (!player) return false

    try {
      switch (dropTarget.type) {
        case 'inventory':
          return this.moveToInventory(dragData, dropTarget.index)
        
        case 'equipment':
          return this.moveToEquipment(dragData, dropTarget.slot!)
        
        case 'trash':
          return this.moveToTrash(dragData)
        
        default:
          return false
      }
    } catch (error) {
      console.error('Failed to execute move:', error)
      return false
    }
  }

  private moveToInventory(dragData: DragData, targetIndex?: number): boolean {
    const player = gameStore.player!
    
    if (dragData.sourceType === 'equipment' && dragData.sourceSlot) {
      // Unequip to inventory
      const item = player.unequipItem(dragData.sourceSlot)
      return item !== null
    }
    
    if (dragData.sourceType === 'inventory' && typeof targetIndex === 'number' && typeof dragData.sourceIndex === 'number') {
      // Reorder within inventory
      return this.reorderInventory(dragData.sourceIndex, targetIndex)
    }
    
    return false
  }

  private moveToEquipment(dragData: DragData, targetSlot: EquipmentSlot): boolean {
    const player = gameStore.player!
    
    if (dragData.sourceType === 'inventory') {
      // Equip from inventory
      return player.equipItem(dragData.item, targetSlot)
    }
    
    if (dragData.sourceType === 'equipment' && dragData.sourceSlot) {
      // Swap equipment slots
      return this.swapEquipmentSlots(dragData.sourceSlot, targetSlot)
    }
    
    return false
  }

  private moveToTrash(dragData: DragData): boolean {
    const player = gameStore.player!
    
    if (dragData.sourceType === 'inventory' && typeof dragData.sourceIndex === 'number') {
      // Remove from inventory
      const removed = player.removeFromInventory(dragData.item.id)
      return removed !== null
    }
    
    if (dragData.sourceType === 'equipment' && dragData.sourceSlot) {
      // Unequip and delete
      const item = player.equipment.getEquippedItem(dragData.sourceSlot)
      if (item) {
        (player.equipment as any)[dragData.sourceSlot] = undefined
        return true
      }
    }
    
    return false
  }

  private reorderInventory(fromIndex: number, toIndex: number): boolean {
    const player = gameStore.player!
    const items = player.inventory.items
    
    if (fromIndex === toIndex) return true
    if (fromIndex < 0 || fromIndex >= items.length) return false
    if (toIndex < 0 || toIndex >= player.inventory.maxSize) return false
    
    // Move item
    const [item] = items.splice(fromIndex, 1)
    items.splice(toIndex, 0, item)
    
    return true
  }

  private swapEquipmentSlots(fromSlot: EquipmentSlot, toSlot: EquipmentSlot): boolean {
    const player = gameStore.player!
    const equipment = player.equipment as any
    
    const fromItem = equipment[fromSlot]
    const toItem = equipment[toSlot]
    
    // Validate that items can be equipped in target slots
    if (fromItem && !player.canEquip(fromItem, toSlot)) return false
    if (toItem && !player.canEquip(toItem, fromSlot)) return false
    
    // Swap
    equipment[fromSlot] = toItem
    equipment[toSlot] = fromItem
    
    return true
  }

  private createGhostElement(item: Item) {
    this.ghostElement = document.createElement('div')
    this.ghostElement.className = 'drag-ghost'
    this.ghostElement.innerHTML = `
      <div class="item-icon" style="background-color: ${this.getItemRarityColor(item.rarity)}">
        ${item.name.charAt(0).toUpperCase()}
      </div>
    `
    
    document.body.appendChild(this.ghostElement)
  }

  private highlightDropZones() {
    if (!this.dragData) return
    
    // Find all valid drop zones
    this.activeDropZones = Array.from(document.querySelectorAll('[data-drop-zone]')) as HTMLElement[]
    
    this.activeDropZones.forEach(zone => {
      if (this.isValidDropZone(zone)) {
        zone.classList.add('drop-zone-active')
      } else {
        zone.classList.add('drop-zone-invalid')
      }
    })
  }

  private isValidDropZone(zone: HTMLElement): boolean {
    if (!this.dragData) return false
    
    const dropTarget = this.parseDropTarget(zone)
    if (!dropTarget) return false
    
    const player = gameStore.player
    if (!player) return false
    
    switch (dropTarget.type) {
      case 'inventory':
        return dropTarget.index === undefined || dropTarget.index < player.inventory.maxSize
      
      case 'equipment':
        return dropTarget.slot !== undefined && 
               player.canEquip(this.dragData.item, dropTarget.slot)
      
      case 'trash':
        return true
      
      default:
        return false
    }
  }

  private parseDropTarget(element: HTMLElement): DropTarget | null {
    const dropZone = element.getAttribute('data-drop-zone')
    if (!dropZone) return null
    
    try {
      return JSON.parse(dropZone)
    } catch {
      return null
    }
  }

  private setHoveredDropZone(zone: HTMLElement | null) {
    // Remove previous hover
    if (this.hoveredDropZone) {
      this.hoveredDropZone.classList.remove('drop-zone-hover')
    }
    
    // Set new hover
    this.hoveredDropZone = zone
    if (zone && this.isValidDropZone(zone)) {
      zone.classList.add('drop-zone-hover')
    }
  }

  private cleanup() {
    // Reset state
    this.isDragging = false
    this.dragData = null
    this.hoveredDropZone = null
    
    // Remove drag element styling
    if (this.dragElement) {
      this.dragElement.classList.remove('dragging')
      this.dragElement = null
    }
    
    // Remove ghost element
    if (this.ghostElement) {
      document.body.removeChild(this.ghostElement)
      this.ghostElement = null
    }
    
    // Clear drop zone highlights
    this.activeDropZones.forEach(zone => {
      zone.classList.remove('drop-zone-active', 'drop-zone-invalid', 'drop-zone-hover')
    })
    this.activeDropZones = []
  }

  private getItemRarityColor(rarity: string): string {
    switch (rarity) {
      case 'normal': return '#808080'
      case 'magic': return '#4169E1'
      case 'rare': return '#FFD700'
      case 'unique': return '#8B4513'
      case 'set': return '#00FF00'
      default: return '#808080'
    }
  }

  // Public API for components
  attachDragListeners(element: HTMLElement, item: Item, sourceType: 'inventory' | 'equipment', sourceIndex?: number, sourceSlot?: EquipmentSlot) {
    let startPos = { x: 0, y: 0 }
    let dragStarted = false
    let longPressTimer: number | null = null
    let isPressed = false
    let hasMovedThreshold = false

    const onStart = (x: number, y: number, _e: Event) => {
      // Prevent if already dragging something else
      if (this.isDragging) return
      
      startPos = { x, y }
      dragStarted = false
      isPressed = true
      hasMovedThreshold = false
      
      // Start long press timer for mobile
      if ('ontouchstart' in window) {
        longPressTimer = window.setTimeout(() => {
          if (isPressed && !hasMovedThreshold) {
            this.startDrag(item, element, sourceType, sourceIndex, sourceSlot)
            dragStarted = true
          }
        }, this.longPressDelay)
      }
    }

    const onMove = (x: number, y: number) => {
      if (!isPressed) return
      
      const distance = Math.sqrt(Math.pow(x - startPos.x, 2) + Math.pow(y - startPos.y, 2))
      
      if (distance > this.dragThreshold) {
        hasMovedThreshold = true
        
        if (!this.isDragging && !dragStarted) {
          // Clear long press timer if we're starting drag via movement
          if (longPressTimer) {
            clearTimeout(longPressTimer)
            longPressTimer = null
          }
          
          // Only start drag on desktop (non-touch) or if long press already triggered
          if (!('ontouchstart' in window) || dragStarted) {
            this.startDrag(item, element, sourceType, sourceIndex, sourceSlot)
            dragStarted = true
          }
        }
      }
      
      if (this.isDragging) {
        this.updateDrag(x, y)
      }
    }

    const onEnd = () => {
      isPressed = false
      
      if (longPressTimer) {
        clearTimeout(longPressTimer)
        longPressTimer = null
      }
      
      if (this.isDragging) {
        this.endDrag()
      }
      
      dragStarted = false
      hasMovedThreshold = false
    }

    // Mouse events
    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault()
      onStart(e.clientX, e.clientY, e)
    }

    // Touch events
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      const touch = e.touches[0]
      onStart(touch.clientX, touch.clientY, e)
    }

    element.addEventListener('mousedown', handleMouseDown)
    element.addEventListener('touchstart', handleTouchStart)

    // Global move and end events
    const handleMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY)
    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0]
      onMove(touch.clientX, touch.clientY)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('touchmove', handleTouchMove)
    document.addEventListener('mouseup', onEnd)
    document.addEventListener('touchend', onEnd)

    // Return cleanup function
    return () => {
      element.removeEventListener('mousedown', handleMouseDown)
      element.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('mouseup', onEnd)
      document.removeEventListener('touchend', onEnd)
    }
  }
}

// Create singleton instance
export const dragDropManager = new DragDropManager()