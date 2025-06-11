import { makeObservable, observable, action, computed } from 'mobx'

export class UIStore {
  // Mobile panel states
  leftPanelOpen = true
  rightPanelOpen = false
  
  // Screen dimensions for responsive design
  screenWidth = window.innerWidth
  screenHeight = window.innerHeight

  constructor() {
    makeObservable(this, {
      leftPanelOpen: observable,
      rightPanelOpen: observable,
      screenWidth: observable,
      screenHeight: observable,
      isMobile: computed,
      setLeftPanelOpen: action,
      setRightPanelOpen: action,
      updateScreenSize: action
    })

    // Listen for window resize
    window.addEventListener('resize', this.updateScreenSize)
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
    if (this.isMobile) {
      this.setRightPanelOpen(false)
    }
  }
}

export const uiStore = new UIStore()