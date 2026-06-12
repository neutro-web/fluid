import { stepSpring, validateSpringConfig } from './spring'
import type { SpringConfig, SpringState } from './spring'
import { WillChangeManager } from './will-change'

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
  ;(globalThis as any)[DRIVER_KEY] = new AnimationDriver()
}
export const driver: AnimationDriver = (globalThis as any)[DRIVER_KEY]

interface ActiveAnimation {
  springState: SpringState
  target: number
  property: string
  config: SpringConfig
  settle: () => void
  id: symbol
}

const activeAnimations = new WeakMap<Element, Map<string, ActiveAnimation>>()

function applyValue(el: Element, property: string, value: number): void {
  (el as HTMLElement).style.setProperty(property, String(value))
}

function parseCurrentValue(el: Element, property: string): number {
  const raw = (el as HTMLElement).style.getPropertyValue(property)
  const n = parseFloat(raw)
  return Number.isFinite(n) ? n : 0
}

export function startSpring(
  el: Element,
  property: string,
  target: number,
  config: SpringConfig,
  options?: {
    velocityScale?: number
    maxVelocity?: number
    driver?: AnimationDriver
  },
): Promise<void> {
  const d = options?.driver ?? driver
  const cfg = validateSpringConfig(config)
  const existing = activeAnimations.get(el)?.get(property)

  // Read velocity and value from interrupted animation FIRST, then deregister it
  let initialVelocity = existing?.springState.velocity ?? 0
  const maxV = options?.maxVelocity ?? 2000
  initialVelocity = Math.max(-maxV, Math.min(maxV, initialVelocity))
  if (options?.velocityScale !== undefined && !Number.isNaN(options.velocityScale)) {
    initialVelocity *= options.velocityScale
  }

  const initialValue = existing?.springState.value ?? parseCurrentValue(el, property)

  // Deregister old task (if interrupting) — after reading velocity/value from it
  if (existing) {
    d.deregister(existing.id)
    WillChangeManager.release(el)
  }

  let resolve!: () => void
  const settled = new Promise<void>(r => { resolve = r })

  const id = Symbol()

  const animation: ActiveAnimation = {
    springState: { value: initialValue, velocity: initialVelocity },
    target,
    property,
    config: cfg,
    settle: resolve,
    id,
  }

  if (!activeAnimations.has(el)) activeAnimations.set(el, new Map())
  activeAnimations.get(el)!.set(property, animation)

  WillChangeManager.acquire(el)

  const range = Math.abs(target - initialValue) || 1
  const posThreshold = Math.max(range * 0.001, 0.0001)
  const velThreshold = posThreshold * 2

  d.register(id, {
    advance(dt: number): boolean {
      animation.springState = stepSpring(cfg, animation.springState, target, dt)
      applyValue(el, property, animation.springState.value)

      const isSettled =
        Math.abs(animation.springState.value - target) < posThreshold &&
        Math.abs(animation.springState.velocity) < velThreshold

      if (isSettled) {
        applyValue(el, property, target)
        WillChangeManager.release(el)
        animation.settle()
        activeAnimations.get(el)?.delete(property)
      }

      return isSettled
    },
  })

  return settled
}
