function isIOS(): boolean {
  return typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)
}

export class ScrollLockManager {
  private lockCount = 0
  private savedPaddingRight = ''
  private savedOverflow = ''
  private savedPosition = ''
  private savedTop = ''
  private savedScrollY = 0

  lock(): void {
    this.lockCount++
    if (this.lockCount > 1) return
    if (typeof window === 'undefined' || typeof document === 'undefined') return

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    this.savedPaddingRight = document.body.style.paddingRight
    this.savedOverflow = document.body.style.overflow

    document.body.style.paddingRight = `${scrollbarWidth}px`
    document.body.style.overflow = 'hidden'

    if (isIOS()) {
      this.savedScrollY = window.scrollY ?? (window as any).pageYOffset ?? 0
      this.savedPosition = document.body.style.position
      this.savedTop = document.body.style.top
      document.body.style.position = 'fixed'
      document.body.style.top = `-${this.savedScrollY}px`
    }
  }

  unlock(): void {
    if (this.lockCount <= 0) return
    this.lockCount--
    if (this.lockCount > 0) return
    if (typeof window === 'undefined' || typeof document === 'undefined') return

    if (isIOS()) {
      document.body.style.top = this.savedTop
      document.body.style.position = this.savedPosition
      window.scrollTo(0, this.savedScrollY)
    }

    document.body.style.overflow = this.savedOverflow
    document.body.style.paddingRight = this.savedPaddingRight
  }
}
