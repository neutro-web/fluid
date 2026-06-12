import { stepSpring, validateSpringConfig, SPRING_PRESETS } from './spring'
import type { SpringConfig } from './spring'
import { driver, AnimationDriver } from './driver'
import type { SpringTask } from './driver'
import { ledger } from './ledger'
import { WillChangeManager } from './will-change'

// ─── Public types ─────────────────────────────────────────────────────────────

export type AnimatablePropertyKind =
  | 'scale' | 'translateX' | 'translateY' | 'opacity'
  | 'clip-inset' | 'max-height' | 'blur-delta' | 'shadow-depth'

export interface PropertyAnimation {
  kind: AnimatablePropertyKind
  from: number
  to: number
  config: SpringConfig
}

export interface MotionPhase {
  anims: PropertyAnimation[]
}

export interface MotionDef {
  id: string
  phases: MotionPhase[]
  /** null = skip entirely under prefers-reduced-motion (no-op) */
  reducedPhases: MotionPhase[] | null
}

export interface ReactiveValue {
  readonly current: number
  subscribe(fn: (value: number) => void): () => void
  dispose(): void
}

// ─── Internal sentinel ────────────────────────────────────────────────────────

/** Resolved to el.scrollHeight at animation time. */
const SENTINEL_SCROLL_HEIGHT = -1

// ─── Transform state cache ────────────────────────────────────────────────────

interface TransformState {
  scale: number
  tx: number
  ty: number
}

const transformCache = new WeakMap<Element, TransformState>()

function getTransform(el: Element): TransformState {
  let state = transformCache.get(el)
  if (!state) { state = { scale: 1, tx: 0, ty: 0 }; transformCache.set(el, state) }
  return state
}

function applyTransform(el: Element, state: TransformState): void {
  const parts: string[] = []
  if (Math.abs(state.scale - 1) > 0.00001) parts.push(`scale(${state.scale})`)
  if (Math.abs(state.ty) > 0.00001) parts.push(`translateY(${state.ty}px)`)
  if (Math.abs(state.tx) > 0.00001) parts.push(`translateX(${state.tx}px)`)
  ;(el as HTMLElement).style.transform = parts.join(' ') || ''
}

// ─── Motion velocity registry ─────────────────────────────────────────────────

interface MotionTrack {
  value: number
  velocity: number
  taskId: symbol | null
}

const motionRegistry = new WeakMap<Element, Map<string, MotionTrack>>()

function getOrCreateTrack(el: Element, key: string, defaultValue: number): MotionTrack {
  if (!motionRegistry.has(el)) motionRegistry.set(el, new Map())
  const map = motionRegistry.get(el)!
  if (!map.has(key)) map.set(key, { value: defaultValue, velocity: 0, taskId: null })
  return map.get(key)!
}

// ─── Custom spring runner ─────────────────────────────────────────────────────

function springMotionProp(
  el: Element,
  key: string,
  from: number,
  to: number,
  config: SpringConfig,
  onValue: (el: Element, value: number) => void,
  d: AnimationDriver = driver,
): Promise<void> {
  const cfg = validateSpringConfig(config)
  const track = getOrCreateTrack(el, key, from)

  const initialVelocity = Math.max(-2000, Math.min(2000, track.velocity))

  // Capture interrupt state BEFORE deregistering (taskId becomes null after)
  const wasInterrupt = track.taskId !== null
  if (wasInterrupt) {
    d.deregister(track.taskId!)
    WillChangeManager.release(el) // release the cancelled task's acquire
    track.taskId = null
  }

  // H2: honor declared from on cold start; carry current position on interrupt
  const startValue = wasInterrupt ? track.value : from
  if (!wasInterrupt) track.value = from

  const range = Math.abs(to - startValue) || 1
  const posThreshold = Math.max(range * 0.001, 0.0001)
  const velThreshold = posThreshold * 2

  // Fast-path: already at target with no velocity
  if (Math.abs(to - startValue) < posThreshold && Math.abs(initialVelocity) < velThreshold) {
    onValue(el, to)
    return Promise.resolve()
  }

  WillChangeManager.acquire(el)
  let resolve!: () => void
  const settled = new Promise<void>(r => { resolve = r })
  const id = Symbol()
  track.taskId = id

  let state = { value: startValue, velocity: initialVelocity }

  const task: SpringTask = {
    advance(dt: number): boolean {
      state = stepSpring(cfg, state, to, dt)
      track.value = state.value
      track.velocity = state.velocity
      onValue(el, state.value)

      const isSettled =
        Math.abs(state.value - to) < posThreshold &&
        Math.abs(state.velocity) < velThreshold

      if (isSettled) {
        track.value = to
        track.velocity = 0
        track.taskId = null
        onValue(el, to)
        WillChangeManager.release(el)
        resolve()
      }

      return isSettled
    },
  }

  d.register(id, task)
  return settled
}

// ─── Property application ─────────────────────────────────────────────────────

function animateProperty(el: Element, anim: PropertyAnimation, d?: AnimationDriver): Promise<void> {
  const htmlEl = el as HTMLElement

  switch (anim.kind) {
    case 'scale':
      return springMotionProp(el, 'scale', anim.from, anim.to, anim.config, (e, v) => {
        const ts = getTransform(e); ts.scale = v; transformCache.set(e, ts); applyTransform(e, ts)
      }, d)

    case 'translateX':
      return springMotionProp(el, 'tx', anim.from, anim.to, anim.config, (e, v) => {
        const ts = getTransform(e); ts.tx = v; transformCache.set(e, ts); applyTransform(e, ts)
      }, d)

    case 'translateY':
      return springMotionProp(el, 'ty', anim.from, anim.to, anim.config, (e, v) => {
        const ts = getTransform(e); ts.ty = v; transformCache.set(e, ts); applyTransform(e, ts)
      }, d)

    case 'opacity':
      return springMotionProp(el, 'opacity', anim.from, anim.to, anim.config, (e, v) => {
        ;(e as HTMLElement).style.opacity = String(v)
      }, d)

    case 'clip-inset':
      return springMotionProp(el, 'clip-inset', anim.from, anim.to, anim.config, (e, v) => {
        // Clamp spring overshoot to valid inset range; clear when fully revealed
        const clamped = Math.max(0, Math.min(100, v))
        ;(e as HTMLElement).style.clipPath = clamped < 0.01 ? '' : `inset(${clamped}%)`
      }, d)

    case 'max-height': {
      const from = anim.from === SENTINEL_SCROLL_HEIGHT ? htmlEl.scrollHeight : anim.from
      const to = anim.to === SENTINEL_SCROLL_HEIGHT ? htmlEl.scrollHeight : anim.to
      return springMotionProp(el, 'max-height', from, to, anim.config, (e, v) => {
        ;(e as HTMLElement).style.maxHeight = `${v}px`
      }, d)
    }

    case 'blur-delta':
      // --fluid-blur-delta: a delta owned by the motion engine, not a token mutation.
      // Consuming components read this via calc() to adjust their backdrop-filter.
      return springMotionProp(el, 'blur-delta', anim.from, anim.to, anim.config, (e, v) => {
        ;(e as HTMLElement).style.setProperty('--fluid-blur-delta', String(v))
      }, d)

    case 'shadow-depth':
      // --fluid-shadow-depth: elevation tier offset; components apply via calc() on shadow tokens.
      return springMotionProp(el, 'shadow-depth', anim.from, anim.to, anim.config, (e, v) => {
        ;(e as HTMLElement).style.setProperty('--fluid-shadow-depth', String(v))
      }, d)

    default:
      return Promise.resolve()
  }
}

async function runPhases(el: Element, phases: MotionPhase[]): Promise<void> {
  for (const phase of phases) {
    await Promise.all(phase.anims.map(a => animateProperty(el, a)))
  }
}

// ─── Tier helper ──────────────────────────────────────────────────────────────

function crystallinePlus(): boolean {
  return ledger.tier === 'crystalline' || ledger.tier === 'optical'
}

// ─── Variant registry ─────────────────────────────────────────────────────────

const variantRegistry = new WeakMap<Element, Record<string, MotionDef>>()

// ─── P0-T5-01 Primitives ─────────────────────────────────────────────────────

const S = SPRING_PRESETS

export const motion = {

  // ── Primitives ──────────────────────────────────────────────────────────────

  emerge(): MotionDef {
    return {
      id: 'emerge',
      phases: [{ anims: [
        { kind: 'scale', from: 0.92, to: 1.0, config: S.smooth },
        { kind: 'opacity', from: 0, to: 1, config: S.smooth },
      ] }],
      reducedPhases: [{ anims: [
        { kind: 'opacity', from: 0, to: 1, config: S.smooth },
      ] }],
    }
  },

  recede(): MotionDef {
    return {
      id: 'recede',
      phases: [{ anims: [
        { kind: 'scale', from: 1.0, to: 0.92, config: S.smooth },
        { kind: 'opacity', from: 1, to: 0, config: S.smooth },
      ] }],
      reducedPhases: [{ anims: [
        { kind: 'opacity', from: 1, to: 0, config: S.smooth },
      ] }],
    }
  },

  rise(): MotionDef {
    return {
      id: 'rise',
      phases: [{ anims: [
        { kind: 'translateY', from: 0, to: -4, config: S.smooth },
        { kind: 'shadow-depth', from: 0, to: 1, config: S.smooth },
      ] }],
      reducedPhases: [{ anims: [
        { kind: 'opacity', from: 0.85, to: 1.0, config: S.smooth },
      ] }],
    }
  },

  sink(): MotionDef {
    return {
      id: 'sink',
      phases: [{ anims: [
        { kind: 'translateY', from: -4, to: 0, config: S.smooth },
        { kind: 'shadow-depth', from: 1, to: 0, config: S.smooth },
      ] }],
      reducedPhases: [{ anims: [
        { kind: 'opacity', from: 1.0, to: 0.85, config: S.smooth },
      ] }],
    }
  },

  elevate(): MotionDef {
    return {
      id: 'elevate',
      phases: [{ anims: [
        { kind: 'shadow-depth', from: 0, to: 1, config: S.smooth },
        { kind: 'blur-delta', from: 0, to: 4, config: S.smooth },
      ] }],
      reducedPhases: null,
    }
  },

  flatten(): MotionDef {
    return {
      id: 'flatten',
      phases: [{ anims: [
        { kind: 'shadow-depth', from: 1, to: 0, config: S.smooth },
        { kind: 'blur-delta', from: 4, to: 0, config: S.smooth },
      ] }],
      reducedPhases: null,
    }
  },

  float(): MotionDef {
    return {
      id: 'float',
      phases: [{ anims: [
        { kind: 'scale', from: 1.0, to: 1.04, config: S.bouncy },
        { kind: 'translateY', from: 0, to: -8, config: S.bouncy },
      ] }],
      reducedPhases: [{ anims: [
        { kind: 'opacity', from: 0, to: 1, config: S.bouncy },
      ] }],
    }
  },

  settle(): MotionDef {
    return {
      id: 'settle',
      phases: [{ anims: [
        { kind: 'scale', from: 1.04, to: 1.0, config: S.gentle },
        { kind: 'translateY', from: -8, to: 0, config: S.gentle },
      ] }],
      reducedPhases: [{ anims: [
        { kind: 'opacity', from: 1.0, to: 1.0, config: S.gentle },
      ] }],
    }
  },

  expand(): MotionDef {
    const phases: MotionPhase[] = crystallinePlus()
      ? [{ anims: [{ kind: 'clip-inset', from: 50, to: 0, config: S.snappy }] }]
      : [{ anims: [{ kind: 'max-height', from: 0, to: SENTINEL_SCROLL_HEIGHT, config: S.snappy }] }]
    return { id: 'expand', phases, reducedPhases: phases }
  },

  collapse(): MotionDef {
    const phases: MotionPhase[] = crystallinePlus()
      ? [{ anims: [{ kind: 'clip-inset', from: 0, to: 50, config: S.snappy }] }]
      : [{ anims: [{ kind: 'max-height', from: SENTINEL_SCROLL_HEIGHT, to: 0, config: S.snappy }] }]
    return { id: 'collapse', phases, reducedPhases: phases }
  },

  depress(variant: 'primary' | 'secondary' = 'primary'): MotionDef {
    const to = variant === 'primary' ? 0.96 : 0.98
    return {
      id: 'depress',
      phases: [{ anims: [{ kind: 'scale', from: 1.0, to, config: S.snappy }] }],
      reducedPhases: [{ anims: [{ kind: 'opacity', from: 1.0, to: 0.7, config: S.snappy }] }],
    }
  },

  release(variant: 'primary' | 'secondary' = 'primary'): MotionDef {
    const from = variant === 'primary' ? 0.96 : 0.98
    return {
      id: 'release',
      phases: [{ anims: [{ kind: 'scale', from, to: 1.0, config: S.bouncy }] }],
      reducedPhases: [{ anims: [{ kind: 'opacity', from: 0.7, to: 1.0, config: S.bouncy }] }],
    }
  },

  pulse(): MotionDef {
    return {
      id: 'pulse',
      phases: [
        { anims: [{ kind: 'scale', from: 1.0, to: 1.06, config: S.bouncy }] },
        { anims: [{ kind: 'scale', from: 1.06, to: 1.0, config: S.bouncy }] },
      ],
      reducedPhases: [
        { anims: [{ kind: 'opacity', from: 1.0, to: 0.85, config: S.bouncy }] },
        { anims: [{ kind: 'opacity', from: 0.85, to: 1.0, config: S.bouncy }] },
      ],
    }
  },

  shake(): MotionDef {
    const targets = [-6, 6, -4, 4, 0]
    return {
      id: 'shake',
      phases: targets.map((to, i) => ({
        anims: [{ kind: 'translateX' as AnimatablePropertyKind, from: i === 0 ? 0 : targets[i - 1]!, to, config: S.snappy }],
      })),
      reducedPhases: [
        { anims: [{ kind: 'opacity', from: 1.0, to: 0.7, config: S.snappy }] },
        { anims: [{ kind: 'opacity', from: 0.7, to: 1.0, config: S.snappy }] },
      ],
    }
  },

  grow(): MotionDef {
    const phases: MotionPhase[] = crystallinePlus()
      ? [{ anims: [{ kind: 'clip-inset', from: 50, to: 0, config: S.smooth }] }]
      : [{ anims: [{ kind: 'max-height', from: 0, to: SENTINEL_SCROLL_HEIGHT, config: S.smooth }] }]
    return { id: 'grow', phases, reducedPhases: phases }
  },

  shrink(): MotionDef {
    const phases: MotionPhase[] = crystallinePlus()
      ? [{ anims: [{ kind: 'clip-inset', from: 0, to: 50, config: S.smooth }] }]
      : [{ anims: [{ kind: 'max-height', from: SENTINEL_SCROLL_HEIGHT, to: 0, config: S.smooth }] }]
    return { id: 'shrink', phases, reducedPhases: phases }
  },

  // ── Execute ──────────────────────────────────────────────────────────────────

  async animate(el: Element, def: MotionDef): Promise<void> {
    const phases = ledger.prefersReducedMotion ? def.reducedPhases : def.phases
    if (phases === null) return
    await runPhases(el, phases)
  },

  // ── P0-T5-02: Orchestration ──────────────────────────────────────────────────

  async sequence(steps: Array<() => Promise<void>>): Promise<void> {
    for (const step of steps) await step()
  },

  async stagger(
    els: Element[],
    stateName: string,
    opts?: { delay?: number },
  ): Promise<void> {
    const delay = opts?.delay ?? 50
    await Promise.all(
      els.map((el, i) => {
        if (delay > 0 && i > 0) {
          return new Promise<void>(resolve => {
            setTimeout(() => { motion.set(el, stateName).then(resolve) }, i * delay)
          })
        }
        return motion.set(el, stateName)
      })
    )
  },

  variants(el: Element, states: Record<string, MotionDef>): void {
    variantRegistry.set(el, states)
  },

  async set(el: Element, stateName: string): Promise<void> {
    const states = variantRegistry.get(el)
    if (!states || !(stateName in states)) return
    const def = states[stateName]
    if (!def) return

    if (!(el as HTMLElement).isConnected) {
      // fluid:mounted listener stays attached until the element mounts.
      // Callers that destroy the element before mounting should call dispose() to clean up.
      return new Promise<void>(resolve => {
        const handler = () => {
          el.removeEventListener('fluid:mounted', handler)
          motion.animate(el, def).then(resolve)
        }
        el.addEventListener('fluid:mounted', handler)
      })
    }

    return motion.animate(el, def)
  },

  // ── P0-T5-03: Scroll-linked values ───────────────────────────────────────────

  scrollProgress(container: Element): { progress: ReactiveValue; velocity: ReactiveValue } {
    const progressVal = new SimpleReactiveValue(0)
    const velocityVal = new SimpleReactiveValue(0)
    let lastScrollTop = -1
    let lastScrollTs = -1

    function compute() {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
      const el = container as HTMLElement
      const scrollable = el.scrollHeight - el.clientHeight
      const clamped = scrollable > 0
        ? Math.max(0, Math.min(1, el.scrollTop / scrollable))
        : 0
      progressVal._set(clamped)

      if (lastScrollTop >= 0 && lastScrollTs >= 0) {
        const dtSec = (now - lastScrollTs) / 1000
        velocityVal._set(dtSec > 0 ? (el.scrollTop - lastScrollTop) / dtSec : 0)
      }
      lastScrollTop = el.scrollTop
      lastScrollTs = now
    }

    compute()
    container.addEventListener('scroll', compute, { passive: true } as AddEventListenerOptions)

    let disposed = false
    const doDispose = () => {
      if (disposed) return
      disposed = true
      container.removeEventListener('scroll', compute)
      progressVal._subs.clear()
      velocityVal._subs.clear()
    }
    progressVal.dispose = doDispose
    velocityVal.dispose = doDispose

    return { progress: progressVal, velocity: velocityVal }
  },

  bind(
    el: Element,
    property: string,
    source: ReactiveValue,
    opts?: { clamp?: [number, number] },
  ): () => void {
    const clamp = opts?.clamp
    return source.subscribe(value => {
      let v = value
      if (clamp) v = Math.max(clamp[0], Math.min(clamp[1], v))
      ;(el as HTMLElement).style.setProperty(property, String(v))
    })
  },

  flip(el: Element, mutate: () => void): Promise<void> {
    const before = el.getBoundingClientRect()
    mutate()
    const after = el.getBoundingClientRect()

    const dx = before.left - after.left
    const dy = before.top - after.top

    const ts = getTransform(el)
    ts.tx = dx
    ts.ty = dy
    transformCache.set(el, ts)
    applyTransform(el, ts)

    const promises: Promise<void>[] = []

    if (dx !== 0) {
      promises.push(springMotionProp(el, 'tx', dx, 0, S.smooth, (e, v) => {
        const s = getTransform(e); s.tx = v; transformCache.set(e, s); applyTransform(e, s)
      }))
    }

    if (dy !== 0) {
      promises.push(springMotionProp(el, 'ty', dy, 0, S.smooth, (e, v) => {
        const s = getTransform(e); s.ty = v; transformCache.set(e, s); applyTransform(e, s)
      }))
    }

    return promises.length > 0 ? Promise.all(promises).then(() => {}) : Promise.resolve()
  },
}

// ─── SimpleReactiveValue ──────────────────────────────────────────────────────

class SimpleReactiveValue implements ReactiveValue {
  _current: number
  _subs = new Set<(v: number) => void>()

  constructor(initial: number) { this._current = initial }

  get current() { return this._current }

  _set(value: number) {
    this._current = value
    for (const fn of this._subs) fn(value)
  }

  subscribe(fn: (v: number) => void): () => void {
    this._subs.add(fn)
    fn(this._current)
    return () => this._subs.delete(fn)
  }

  dispose(): void { this._subs.clear() }
}

// ─── P0-T5-04: View Transitions ──────────────────────────────────────────────
//
// Residual (non-blocking, out of brief scope):
// §5.6 specifies that startFluidTransition should replace the browser's default
// View Transition animation with the configured spring preset, carrying over
// velocity. The current implementation is a lock + ready-await only — it does
// not inject spring-driven pseudo-element animations. The brief scoped View
// Transitions to the lock wrapper, so this is deferred to the components phase.

let activeTransition: ViewTransition | null = null

export async function startFluidTransition(updateFn: () => void): Promise<void> {
  const doc = typeof document !== 'undefined' ? document : null
  if (!doc || typeof (doc as any).startViewTransition !== 'function') {
    updateFn()
    return
  }

  if (activeTransition) {
    // Wait for the current transition's capture phase before applying the DOM update,
    // so the concurrent mutation lands at the correct visual checkpoint.
    // Use try/await instead of .catch() to avoid an extra microtask from the intermediate promise.
    try { await activeTransition.ready } catch (_) { /* transition may be skipped */ }
    updateFn()
    return
  }

  activeTransition = (doc as any).startViewTransition(updateFn) as ViewTransition
  try {
    await activeTransition!.finished
  } finally {
    activeTransition = null
  }
}
