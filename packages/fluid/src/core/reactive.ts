import { stepSpring } from './spring'
import type { SpringConfig } from './spring'
import { SPRING_PRESETS } from './spring'
import { AnimationDriver, driver } from './driver'

type PresetKey = keyof typeof SPRING_PRESETS

export interface ReactiveSpring {
  to(target: number): void
  subscribe(fn: (value: number) => void): () => void
  settled(): Promise<void>
  dispose(): void
}

class ReactiveSpringImpl implements ReactiveSpring {
  /** @internal */ _value: number
  /** @internal */ _velocity: number = 0
  private _config: SpringConfig
  private _driver: AnimationDriver
  private _taskId: symbol | null = null
  private _subscribers = new Set<(v: number) => void>()
  private _settleResolve: (() => void) | null = null
  private _settlePromise: Promise<void> | null = null

  constructor(initial: number, config: SpringConfig, d: AnimationDriver) {
    this._value = initial
    this._config = config
    this._driver = d
  }

  to(target: number): void {
    const maxV = 2000
    this._velocity = Math.max(-maxV, Math.min(maxV, this._velocity))

    // Cancel running task
    if (this._taskId !== null) {
      this._driver.deregister(this._taskId)
      this._taskId = null
    }

    // New settled promise — resolve previous if interrupting
    const prevResolve = this._settleResolve
    let resolve!: () => void
    const promise = new Promise<void>(r => { resolve = r })
    this._settleResolve = resolve
    this._settlePromise = promise
    if (prevResolve) prevResolve()

    const id = Symbol()
    this._taskId = id

    const startValue = this._value
    const startVelocity = this._velocity
    const range = Math.abs(target - startValue) || 1
    const posThreshold = Math.max(range * 0.001, 0.0001)
    const velThreshold = posThreshold * 2

    let state = { value: startValue, velocity: startVelocity }

    this._driver.register(id, {
      advance: (dt: number): boolean => {
        state = stepSpring(this._config, state, target, dt)
        this._value = state.value
        this._velocity = state.velocity

        const isSettled =
          Math.abs(state.value - target) < posThreshold &&
          Math.abs(state.velocity) < velThreshold

        if (isSettled) {
          this._value = target
          this._velocity = 0
          this._taskId = null
        }

        for (const fn of this._subscribers) fn(this._value)

        if (isSettled) {
          resolve()
          this._settleResolve = null
        }

        return isSettled
      },
    })
  }

  subscribe(fn: (v: number) => void): () => void {
    this._subscribers.add(fn)
    fn(this._value) // immediate call with current value
    return () => this._subscribers.delete(fn)
  }

  settled(): Promise<void> {
    if (this._settlePromise === null || this._taskId === null) {
      return Promise.resolve()
    }
    return this._settlePromise
  }

  dispose(): void {
    if (this._taskId !== null) {
      this._driver.deregister(this._taskId)
      this._taskId = null
    }
    this._subscribers.clear()
    if (this._settleResolve) {
      this._settleResolve()
      this._settleResolve = null
    }
    this._settlePromise = null
  }
}

export function spring(
  initial: number,
  preset: PresetKey | SpringConfig,
  d: AnimationDriver = driver,
): ReactiveSpring {
  const config = typeof preset === 'string' ? SPRING_PRESETS[preset] : preset
  return new ReactiveSpringImpl(initial, config, d)
}
