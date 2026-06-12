export interface ToastOptions {
  variant?: 'default' | 'info' | 'destructive' | 'success'
  duration?: number
  action?: { label: string; onActivate: () => void }
}

export interface ToastHandle {
  dismiss(): void
  update(message: string): void
}

export interface ToastManagerOptions {
  maxSimultaneous?: number
  announcementGap?: number
  onAnnounce?: (message: string) => void
}

interface ToastEntry {
  id: number
  message: string
  duration: number
}

export class ToastManager {
  private readonly announcementGap: number
  private readonly onAnnounce?: (message: string) => void
  private queue: ToastEntry[] = []
  private active: ToastEntry | null = null
  private durationTimer: ReturnType<typeof setTimeout> | null = null
  private nextId = 0

  constructor(options: ToastManagerOptions = {}) {
    this.announcementGap = options.announcementGap ?? 200
    this.onAnnounce = options.onAnnounce
  }

  add(message: string, options: ToastOptions = {}): ToastHandle {
    const id = ++this.nextId
    const duration = options.duration ?? 5000
    this.queue.push({ id, message, duration })
    this._processQueue()
    return {
      dismiss: () => this._dismiss(id),
      update: (msg: string) => this._update(id, msg),
    }
  }

  private _processQueue(): void {
    if (this.active !== null || this.queue.length === 0) return
    const entry = this.queue.shift()!
    this.active = entry
    this._announce(entry.message)
    if (entry.duration > 0) {
      this.durationTimer = setTimeout(() => {
        this.durationTimer = null
        this.active = null
        setTimeout(() => this._processQueue(), this.announcementGap)
      }, entry.duration)
    }
  }

  private _announce(message: string): void {
    if (this.onAnnounce) {
      this.onAnnounce(message)
      return
    }
    if (typeof document === 'undefined') return
    const region = (document as any).getElementById?.('fluid-toast-live')
    if (!region) return
    region.textContent = ''
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => { region.textContent = message })
    } else {
      region.textContent = message
    }
  }

  private _dismiss(id: number): void {
    if (this.active?.id === id) {
      if (this.durationTimer !== null) {
        clearTimeout(this.durationTimer)
        this.durationTimer = null
      }
      this.active = null
      setTimeout(() => this._processQueue(), this.announcementGap)
    } else {
      this.queue = this.queue.filter(e => e.id !== id)
    }
  }

  private _update(id: number, message: string): void {
    if (this.active?.id === id) {
      this.active.message = message
      this._announce(message)
    } else {
      const entry = this.queue.find(e => e.id === id)
      if (entry) entry.message = message
    }
  }
}

const TOAST_KEY = Symbol.for('neutro.fluid.toastmanager')
if (!(globalThis as any)[TOAST_KEY]) {
  (globalThis as any)[TOAST_KEY] = new ToastManager({ maxSimultaneous: 1, announcementGap: 200 })
}
export const toastManager: ToastManager = (globalThis as any)[TOAST_KEY]

export function toast(message: string, options?: ToastOptions): ToastHandle {
  return toastManager.add(message, options)
}
