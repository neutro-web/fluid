export interface SpringTask {
  advance(dt: number): boolean
}

export class AnimationDriver {
  private active = new Map<symbol, SpringTask>()
  private rafId: number | null = null
  private lastTimestamp: number | null = null

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibilityChange)
    }
  }

  private onVisibilityChange = (): void => {
    if (document.hidden) {
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId)
        this.rafId = null
      }
      this.lastTimestamp = null // resets dt to 16ms on resume — no giant step
    } else {
      if (this.active.size > 0) {
        this.rafId = requestAnimationFrame(this.tick)
      }
    }
  }

  register(id: symbol, task: SpringTask): void {
    this.active.set(id, task)
    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(this.tick)
    }
  }

  deregister(id: symbol): void {
    this.active.delete(id)
    if (this.active.size === 0 && this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
      this.lastTimestamp = null
    }
  }

  destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.active.clear()
    this.lastTimestamp = null
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibilityChange)
    }
  }

  private tick = (timestamp: number): void => {
    const dt = this.lastTimestamp !== null
      ? Math.min((timestamp - this.lastTimestamp) / 1000, 0.064)
      : 0.016
    this.lastTimestamp = timestamp

    for (const [id, task] of this.active) {
      const settled = task.advance(dt)
      if (settled) this.active.delete(id)
    }

    if (this.active.size > 0) {
      this.rafId = requestAnimationFrame(this.tick)
    } else {
      this.rafId = null
      this.lastTimestamp = null
    }
  }
}

// Module-federation-safe singleton
const DRIVER_KEY = Symbol.for('neutro.fluid.driver')
if (!(globalThis as any)[DRIVER_KEY]) {
  if (typeof document !== 'undefined' && typeof requestAnimationFrame !== 'undefined') {
    ;(globalThis as any)[DRIVER_KEY] = new AnimationDriver()
  }
}
export const driver: AnimationDriver = (globalThis as any)[DRIVER_KEY] ?? new AnimationDriver()
