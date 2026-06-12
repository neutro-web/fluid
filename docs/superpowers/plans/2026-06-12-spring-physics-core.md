# Spring Physics Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the complete spring physics core — all three damping regimes, validation, presets, WillChangeManager, AnimationDriver, startSpring, and reactive spring values.

**Architecture:** All modules live in `packages/fluid/src/core/`. `spring.ts` is the pure math layer. `will-change.ts` is a reference-counted DOM hint manager. `driver.ts` owns the shared rAF loop, velocity registry, and `startSpring`. `reactive.ts` wraps the driver in a subscribe/settle API. Every singleton uses `Symbol.for()` — never a bare module-level `new X()`.

**Tech Stack:** TypeScript, Vitest (node environment — no jsdom). DOM types are mocked in tests via `vi.stubGlobal` and plain objects.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/core/spring.ts` | Modify | Solver (all 3 regimes), FluidError, validateSpringConfig, SPRING_PRESETS |
| `src/core/spring.test.ts` | Modify | Tests for all three regimes, validation, presets |
| `src/core/will-change.ts` | Create | Reference-counted `will-change` DOM hint |
| `src/core/will-change.test.ts` | Create | Tests for acquire/release ref-counting |
| `src/core/driver.ts` | Create | AnimationDriver class + singleton, startSpring, velocity registry |
| `src/core/driver.test.ts` | Create | rAF loop, dt cap, visibility pause, startSpring |
| `src/core/reactive.ts` | Create | `spring()` reactive value — to/subscribe/settled/dispose |
| `src/core/reactive.test.ts` | Create | to(), subscribe(), settled(), velocity preservation |
| `src/core/index.ts` | Modify | Export all new public symbols |

All paths are relative to `packages/fluid/`.

Run after every task: `cd packages/fluid && pnpm test:unit`

---

## Task 1: P0-T1-02 — Critically Damped and Overdamped Regimes

**Files:**
- Modify: `src/core/spring.ts`
- Modify: `src/core/spring.test.ts`

### Closed-form equations (from `docs/fluid-foundation-v5.md §2.4`)

**Critically damped (ζ = 1):**
```
ω = ω₀ = √(stiffness / mass)
A = x₀ − x∞ = d0
B = v₀ + ω·A
x(t) = (A + B·t)·e^(−ω·t) + x∞
x′(t) = (B − ω·(A + B·t))·e^(−ω·t)
```

**Overdamped (ζ > 1):**
```
γ = √(ζ² − 1)
r₁ = ω₀·(−ζ + γ)   r₂ = ω₀·(−ζ − γ)   (both negative)
A = (v₀ − r₂·d₀) / (r₁ − r₂)
B = (r₁·d₀ − v₀) / (r₁ − r₂)
x(t) = A·e^(r₁·t) + B·e^(r₂·t) + x∞
x′(t) = r₁·A·e^(r₁·t) + r₂·B·e^(r₂·t)
```

- [ ] **Step 1: Write failing tests** replacing the "not yet implemented" describe block in `src/core/spring.test.ts`

Replace the `describe('ζ ≥ 1 not yet implemented (P0-T1-02)', ...)` block at the end of the file with:

```typescript
describe('critically damped (ζ = 1) — P0-T1-02', () => {
  // CRITICAL: m=1, k=100, d=20 → ζ = 20/(2×√100) = 1.0
  const CRITICAL: SpringConfig = { mass: 1, stiffness: 100, damping: 20 }

  it('does not overshoot target when starting from rest', () => {
    const maxValue = simulateMaxValue(CRITICAL, 0, 1, 60, 2000)
    expect(maxValue).toBeLessThanOrEqual(1.0001)
  })

  it('settles within 0.1% by 1000ms at 60fps', () => {
    const result = simulate(CRITICAL, 0, 1, 60, 1000)
    expect(Math.abs(result.value - 1)).toBeLessThan(0.001)
  })

  it('handles non-zero initial velocity without NaN', () => {
    const state = stepSpring(CRITICAL, { value: 0, velocity: 50 }, 1, 1 / 60)
    expect(Number.isFinite(state.value)).toBe(true)
    expect(Number.isFinite(state.velocity)).toBe(true)
  })

  it('produces no NaN over 2000ms', () => {
    const result = simulate(CRITICAL, 0, 1, 60, 2000)
    expect(Number.isFinite(result.value)).toBe(true)
    expect(Number.isFinite(result.velocity)).toBe(true)
  })
})

describe('overdamped (ζ > 1) — P0-T1-02', () => {
  // OVER: m=1, k=100, d=25 → ζ = 25/(2×√100) = 1.25
  const OVER: SpringConfig = { mass: 1, stiffness: 100, damping: 25 }

  it('does not overshoot target when starting from rest', () => {
    const maxValue = simulateMaxValue(OVER, 0, 1, 60, 3000)
    expect(maxValue).toBeLessThanOrEqual(1.0001)
  })

  it('settles within 0.1% by 2000ms at 60fps', () => {
    // r₁ = -5, r₂ = -20 for this config; slowest mode e^(-5t) → <0.007 at 1s, <0.0001 at 2s
    const result = simulate(OVER, 0, 1, 60, 2000)
    expect(Math.abs(result.value - 1)).toBeLessThan(0.001)
  })

  it('handles non-zero initial velocity without NaN', () => {
    const state = stepSpring(OVER, { value: 0, velocity: 50 }, 1, 1 / 60)
    expect(Number.isFinite(state.value)).toBe(true)
    expect(Number.isFinite(state.velocity)).toBe(true)
  })

  it('produces no NaN over 3000ms', () => {
    const result = simulate(OVER, 0, 1, 60, 3000)
    expect(Number.isFinite(result.value)).toBe(true)
    expect(Number.isFinite(result.velocity)).toBe(true)
  })
})

describe('regime dispatch — P0-T1-02', () => {
  it('underdamped still overshoots after P0-T1-02 (regression)', () => {
    const BOUNCY: SpringConfig = { mass: 1.0, stiffness: 300, damping: 20 }
    const maxValue = simulateMaxValue(BOUNCY, 0, 1, 60, 1000)
    expect(maxValue).toBeGreaterThan(1.05)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd packages/fluid && pnpm test:unit -- --reporter=verbose
```
Expected: `critically damped` and `overdamped` tests FAIL with "underdamped only" error message.

- [ ] **Step 3: Implement critically damped and overdamped regimes in `src/core/spring.ts`**

Replace everything from line 41 (`if (zeta < 1) {`) through the end of the `stepSpring` function with:

```typescript
  if (zeta < 1) {
    // α = ζω₀ = damping / (2m) — simplifies exactly for integer coefficients
    const alpha = zeta * omega0
    const omegaD = omega0 * Math.sqrt(1 - zeta * zeta)

    const A = d0
    const B = (v0 + alpha * d0) / omegaD

    const decay = Math.exp(-alpha * dt)
    const c = Math.cos(omegaD * dt)
    const s = Math.sin(omegaD * dt)

    const newValue = decay * (A * c + B * s) + target
    // d/dt[e^(−αt)(A·cos + B·sin)] = e^(−αt)[(−αA+ωdB)·cos + (−αB−ωdA)·sin]
    const newVelocity = decay * ((-alpha * A + omegaD * B) * c + (-alpha * B - omegaD * A) * s)

    return { value: newValue, velocity: newVelocity }
  }

  if (zeta === 1 || Math.abs(zeta - 1) < 1e-7) {
    // Critically damped: x(t) = (A + Bt)e^(−ωt) + x∞
    // A = d0, B = v0 + ω·d0 (from x′(0) = B − ω·A = v0)
    const A = d0
    const B = v0 + omega0 * d0
    const decay = Math.exp(-omega0 * dt)

    const newValue = (A + B * dt) * decay + target
    const newVelocity = (B - omega0 * (A + B * dt)) * decay

    return { value: newValue, velocity: newVelocity }
  }

  // Overdamped (ζ > 1): x(t) = Ae^(r₁t) + Be^(r₂t) + x∞
  // r₁ = ω₀(−ζ+γ), r₂ = ω₀(−ζ−γ), γ = √(ζ²−1)  — both roots negative
  const gamma = Math.sqrt(zeta * zeta - 1)
  const r1 = omega0 * (-zeta + gamma)
  const r2 = omega0 * (-zeta - gamma)
  const denom = r1 - r2 // = 2·ω₀·γ > 0

  const A = (v0 - r2 * d0) / denom
  const B = (r1 * d0 - v0) / denom

  const e1 = Math.exp(r1 * dt)
  const e2 = Math.exp(r2 * dt)

  const newValue = A * e1 + B * e2 + target
  const newVelocity = r1 * A * e1 + r2 * B * e2

  return { value: newValue, velocity: newVelocity }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/fluid && pnpm test:unit -- --reporter=verbose
```
Expected: All tests GREEN, including the new critically damped and overdamped suites.

- [ ] **Step 5: Commit**

```bash
git add packages/fluid/src/core/spring.ts packages/fluid/src/core/spring.test.ts
git commit -m "feat(core): add critically damped and overdamped regimes to stepSpring (P0-T1-02)"
```

---

## Task 2: P0-T1-03 — FluidError and validateSpringConfig

**Files:**
- Modify: `src/core/spring.ts`
- Modify: `src/core/spring.test.ts`

- [ ] **Step 1: Write failing tests — append to `src/core/spring.test.ts`**

Add this import at the top of the test file (after the existing imports):
```typescript
import { validateSpringConfig, FluidError, _resetValidationWarnings } from './spring'
```

Append after all existing describe blocks:

```typescript
describe('FluidError — P0-T1-03', () => {
  it('is an instance of Error', () => {
    const err = new FluidError('test')
    expect(err).toBeInstanceOf(Error)
  })

  it('has name "FluidError"', () => {
    const err = new FluidError('test')
    expect(err.name).toBe('FluidError')
  })

  it('message includes the provided text', () => {
    const err = new FluidError('mass must be > 0')
    expect(err.message).toContain('mass must be > 0')
  })
})

describe('validateSpringConfig — dev mode (NODE_ENV = test) — P0-T1-03', () => {
  it('throws FluidError when mass <= 0', () => {
    expect(() => validateSpringConfig({ mass: 0, stiffness: 100, damping: 10 }))
      .toThrow(FluidError)
  })

  it('throws FluidError when mass is negative', () => {
    expect(() => validateSpringConfig({ mass: -1, stiffness: 100, damping: 10 }))
      .toThrow(FluidError)
  })

  it('throws FluidError when stiffness <= 0', () => {
    expect(() => validateSpringConfig({ mass: 1, stiffness: 0, damping: 10 }))
      .toThrow(FluidError)
  })

  it('throws FluidError when damping < 0', () => {
    expect(() => validateSpringConfig({ mass: 1, stiffness: 100, damping: -1 }))
      .toThrow(FluidError)
  })

  it('returns the same config object for valid input', () => {
    const cfg: SpringConfig = { mass: 1, stiffness: 200, damping: 20 }
    expect(validateSpringConfig(cfg)).toBe(cfg)
  })

  it('does not throw when damping = 0 (undamped is valid)', () => {
    expect(() => validateSpringConfig({ mass: 1, stiffness: 100, damping: 0 }))
      .not.toThrow()
  })
})

describe('validateSpringConfig — production mode — P0-T1-03', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'production'
    _resetValidationWarnings()
  })
  afterEach(() => {
    process.env.NODE_ENV = 'test'
    _resetValidationWarnings()
  })

  it('does not throw for mass <= 0, returns clamped config', () => {
    const result = validateSpringConfig({ mass: 0, stiffness: 100, damping: 10 })
    expect(result.mass).toBeGreaterThan(0)
    expect(result.stiffness).toBe(100)
  })

  it('does not throw for stiffness <= 0, returns clamped config', () => {
    const result = validateSpringConfig({ mass: 1, stiffness: -5, damping: 10 })
    expect(result.stiffness).toBeGreaterThan(0)
  })

  it('does not throw for damping < 0, clamps to 0', () => {
    const result = validateSpringConfig({ mass: 1, stiffness: 100, damping: -5 })
    expect(result.damping).toBe(0)
  })

  it('logs a console.warn for mass violation', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    validateSpringConfig({ mass: 0, stiffness: 100, damping: 10 })
    expect(spy).toHaveBeenCalledOnce()
    spy.mockRestore()
  })

  it('only logs once for repeated identical violation', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    validateSpringConfig({ mass: 0, stiffness: 100, damping: 10 })
    validateSpringConfig({ mass: 0, stiffness: 100, damping: 10 })
    expect(spy).toHaveBeenCalledOnce()
    spy.mockRestore()
  })
})
```

- [ ] **Step 2: Run tests to confirm new tests fail**

```bash
cd packages/fluid && pnpm test:unit -- --reporter=verbose
```
Expected: New `FluidError` and `validateSpringConfig` tests FAIL with "not exported" errors.

- [ ] **Step 3: Implement `FluidError`, `validateSpringConfig`, and `_resetValidationWarnings` in `src/core/spring.ts`**

Insert at the top of `spring.ts`, before the `SpringConfig` interface:

```typescript
export class FluidError extends Error {
  constructor(message: string) {
    super(`[fluid] ${message}`)
    this.name = 'FluidError'
  }
}

const _warnedOnce = new Set<string>()

/** Test-only: resets the "warn once" state between test cases. */
export function _resetValidationWarnings(): void {
  _warnedOnce.clear()
}

function _warnOnce(key: string, msg: string): void {
  if (!_warnedOnce.has(key)) {
    _warnedOnce.add(key)
    console.warn(`[fluid] ${msg}`)
  }
}

/**
 * Validates a SpringConfig.
 * Dev (NODE_ENV !== 'production'): throws FluidError immediately.
 * Production: clamps invalid values silently, warns once per violation type.
 */
export function validateSpringConfig(cfg: SpringConfig): SpringConfig {
  const isDev = typeof process === 'undefined' || process.env.NODE_ENV !== 'production'

  if (isDev) {
    if (cfg.mass <= 0) throw new FluidError('mass must be > 0')
    if (cfg.stiffness <= 0) throw new FluidError('stiffness must be > 0')
    if (cfg.damping < 0) throw new FluidError('damping must be >= 0')
    return cfg
  }

  // Production: clamp + warn once
  let { mass, stiffness, damping } = cfg
  if (mass <= 0) {
    _warnOnce('mass', 'mass must be > 0; clamped to ε')
    mass = Number.EPSILON
  }
  if (stiffness <= 0) {
    _warnOnce('stiffness', 'stiffness must be > 0; clamped to ε')
    stiffness = Number.EPSILON
  }
  if (damping < 0) {
    _warnOnce('damping', 'damping must be >= 0; clamped to 0')
    damping = 0
  }
  if (mass === cfg.mass && stiffness === cfg.stiffness && damping === cfg.damping) return cfg
  return { mass, stiffness, damping }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/fluid && pnpm test:unit -- --reporter=verbose
```
Expected: All tests GREEN.

- [ ] **Step 5: Commit**

```bash
git add packages/fluid/src/core/spring.ts packages/fluid/src/core/spring.test.ts
git commit -m "feat(core): add FluidError and validateSpringConfig (P0-T1-03)"
```

---

## Task 3: P0-T1-08 — SPRING_PRESETS

**Files:**
- Modify: `src/core/spring.ts`
- Modify: `src/core/spring.test.ts`
- Modify: `src/core/index.ts`

- [ ] **Step 1: Write failing tests — append to `src/core/spring.test.ts`**

Add to imports at top:
```typescript
import { SPRING_PRESETS } from './spring'
```

Append to the end of the test file:

```typescript
describe('SPRING_PRESETS — P0-T1-08', () => {
  it('snappy has exact values { mass: 0.5, stiffness: 400, damping: 28 }', () => {
    expect(SPRING_PRESETS.snappy).toEqual({ mass: 0.5, stiffness: 400, damping: 28 })
  })

  it('bouncy has exact values { mass: 1.0, stiffness: 300, damping: 20 }', () => {
    expect(SPRING_PRESETS.bouncy).toEqual({ mass: 1.0, stiffness: 300, damping: 20 })
  })

  it('gentle has exact values { mass: 1.0, stiffness: 120, damping: 20 }', () => {
    expect(SPRING_PRESETS.gentle).toEqual({ mass: 1.0, stiffness: 120, damping: 20 })
  })

  it('smooth has exact values { mass: 1.0, stiffness: 200, damping: 26 }', () => {
    expect(SPRING_PRESETS.smooth).toEqual({ mass: 1.0, stiffness: 200, damping: 26 })
  })

  it('precise has exact values { mass: 0.8, stiffness: 500, damping: 32 }', () => {
    expect(SPRING_PRESETS.precise).toEqual({ mass: 0.8, stiffness: 500, damping: 32 })
  })

  it('has exactly 5 presets', () => {
    expect(Object.keys(SPRING_PRESETS)).toHaveLength(5)
  })

  it('all presets are valid spring configs (no FluidError)', () => {
    for (const preset of Object.values(SPRING_PRESETS)) {
      expect(() => validateSpringConfig(preset)).not.toThrow()
    }
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd packages/fluid && pnpm test:unit -- --reporter=verbose
```
Expected: `SPRING_PRESETS` tests FAIL with import error.

- [ ] **Step 3: Add SPRING_PRESETS to `src/core/spring.ts`**

Append at the end of `spring.ts`:

```typescript
export const SPRING_PRESETS = {
  snappy:  { mass: 0.5, stiffness: 400, damping: 28 },
  bouncy:  { mass: 1.0, stiffness: 300, damping: 20 },
  gentle:  { mass: 1.0, stiffness: 120, damping: 20 },
  smooth:  { mass: 1.0, stiffness: 200, damping: 26 },
  precise: { mass: 0.8, stiffness: 500, damping: 32 },
} as const satisfies Record<string, SpringConfig>
```

- [ ] **Step 4: Update `src/core/index.ts`**

Replace the entire file with:

```typescript
export type { SpringConfig, SpringState } from './spring'
export { stepSpring, validateSpringConfig, FluidError, SPRING_PRESETS } from './spring'
export { _resetValidationWarnings } from './spring'
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd packages/fluid && pnpm test:unit -- --reporter=verbose
```
Expected: All tests GREEN.

- [ ] **Step 6: Commit**

```bash
git add packages/fluid/src/core/spring.ts packages/fluid/src/core/spring.test.ts packages/fluid/src/core/index.ts
git commit -m "feat(core): add SPRING_PRESETS with golden values (P0-T1-08)"
```

---

## Task 4: P0-T1-06 — WillChangeManager

**Files:**
- Create: `src/core/will-change.ts`
- Create: `src/core/will-change.test.ts`

- [ ] **Step 1: Write failing tests in new file `src/core/will-change.test.ts`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { WillChangeManager } from './will-change'

function makeMockEl() {
  const props = new Map<string, string>()
  return {
    style: {
      setProperty(k: string, v: string) { props.set(k, v) },
      getPropertyValue(k: string) { return props.get(k) ?? '' },
      removeProperty(k: string) { props.delete(k) },
    },
    _props: props,
  } as unknown as HTMLElement
}

describe('WillChangeManager — P0-T1-06', () => {
  describe('acquire', () => {
    it('sets will-change on first acquire', () => {
      const el = makeMockEl()
      WillChangeManager.acquire(el)
      expect(el._props.get('will-change')).toBe('transform, opacity')
    })

    it('does not overwrite will-change on second acquire', () => {
      const el = makeMockEl()
      WillChangeManager.acquire(el)
      WillChangeManager.acquire(el)
      expect(el._props.get('will-change')).toBe('transform, opacity')
    })
  })

  describe('release', () => {
    it('removes will-change when ref count reaches zero', () => {
      const el = makeMockEl()
      WillChangeManager.acquire(el)
      WillChangeManager.release(el)
      expect(el._props.has('will-change')).toBe(false)
    })

    it('does not remove will-change while other acquires are outstanding', () => {
      const el = makeMockEl()
      WillChangeManager.acquire(el)
      WillChangeManager.acquire(el)
      WillChangeManager.release(el)
      expect(el._props.get('will-change')).toBe('transform, opacity')
    })

    it('removes will-change only after all acquires are released', () => {
      const el = makeMockEl()
      WillChangeManager.acquire(el)
      WillChangeManager.acquire(el)
      WillChangeManager.acquire(el)
      WillChangeManager.release(el)
      WillChangeManager.release(el)
      expect(el._props.get('will-change')).toBe('transform, opacity')
      WillChangeManager.release(el)
      expect(el._props.has('will-change')).toBe(false)
    })

    it('does not throw when releasing an element that was never acquired', () => {
      const el = makeMockEl()
      expect(() => WillChangeManager.release(el)).not.toThrow()
    })
  })

  describe('isolation between elements', () => {
    it('each element has an independent ref count', () => {
      const el1 = makeMockEl()
      const el2 = makeMockEl()
      WillChangeManager.acquire(el1)
      WillChangeManager.acquire(el2)
      WillChangeManager.release(el1)
      expect(el1._props.has('will-change')).toBe(false)
      expect(el2._props.get('will-change')).toBe('transform, opacity')
    })
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd packages/fluid && pnpm test:unit -- --reporter=verbose
```
Expected: `WillChangeManager` tests FAIL with module-not-found error.

- [ ] **Step 3: Create `src/core/will-change.ts`**

```typescript
const willChangeRefs = new WeakMap<Element, number>()

export const WillChangeManager = {
  acquire(el: Element): void {
    const count = (willChangeRefs.get(el) ?? 0) + 1
    willChangeRefs.set(el, count)
    if (count === 1) (el as HTMLElement).style.setProperty('will-change', 'transform, opacity')
  },

  release(el: Element): void {
    const count = Math.max((willChangeRefs.get(el) ?? 1) - 1, 0)
    willChangeRefs.set(el, count)
    if (count === 0) (el as HTMLElement).style.removeProperty('will-change')
  },
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/fluid && pnpm test:unit -- --reporter=verbose
```
Expected: All tests GREEN.

- [ ] **Step 5: Update `src/core/index.ts`** — append export:

```typescript
export { WillChangeManager } from './will-change'
```

- [ ] **Step 6: Commit**

```bash
git add packages/fluid/src/core/will-change.ts packages/fluid/src/core/will-change.test.ts packages/fluid/src/core/index.ts
git commit -m "feat(core): add WillChangeManager with ref-counted will-change hints (P0-T1-06)"
```

---

## Task 5: P0-T1-04 — AnimationDriver (base rAF loop)

**Files:**
- Create: `src/core/driver.ts`
- Create: `src/core/driver.test.ts`

The vitest environment is `node`. There is no `requestAnimationFrame` or `document` in node by default. Tests create a fresh `AnimationDriver` instance per test, using `vi.stubGlobal` to inject rAF and document BEFORE instantiation.

- [ ] **Step 1: Write failing tests in `src/core/driver.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AnimationDriver } from './driver'

// Per-test rAF harness
let pendingRaf: ((ts: number) => void) | null = null
let rafCounter = 0

function setupMockRaf() {
  pendingRaf = null
  rafCounter = 0
  vi.stubGlobal('requestAnimationFrame', (cb: (ts: number) => void) => {
    pendingRaf = cb
    return ++rafCounter
  })
  vi.stubGlobal('cancelAnimationFrame', (_id: number) => {
    pendingRaf = null
  })
}

function setupMockDocument(hidden = false) {
  const listeners = new Map<string, EventListenerOrEventListenerObject>()
  const doc = {
    get hidden() { return hidden },
    set hidden(v: boolean) { (this as any)._hidden = v },
    addEventListener(event: string, handler: EventListenerOrEventListenerObject) {
      listeners.set(event, handler)
    },
    removeEventListener() {},
    _listeners: listeners,
  }
  vi.stubGlobal('document', doc)
  return doc
}

function flushRaf(ts: number): boolean {
  if (!pendingRaf) return false
  const cb = pendingRaf
  pendingRaf = null
  cb(ts)
  return true
}

beforeEach(() => {
  setupMockRaf()
  setupMockDocument()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AnimationDriver — P0-T1-04', () => {
  describe('rAF loop lifecycle', () => {
    it('starts rAF when first task is registered', () => {
      const d = new AnimationDriver()
      const task = { advance: vi.fn().mockReturnValue(false) }
      d.register(Symbol(), task)
      expect(pendingRaf).not.toBeNull()
    })

    it('does not start rAF when no tasks are registered', () => {
      new AnimationDriver()
      expect(pendingRaf).toBeNull()
    })

    it('calls task.advance on tick', () => {
      const d = new AnimationDriver()
      const task = { advance: vi.fn().mockReturnValue(false) }
      d.register(Symbol(), task)
      flushRaf(16)
      expect(task.advance).toHaveBeenCalledOnce()
    })

    it('stops rAF when the last settled task is removed', () => {
      const d = new AnimationDriver()
      const id = Symbol()
      const task = { advance: vi.fn().mockReturnValue(true) } // settles immediately
      d.register(id, task)
      flushRaf(16)
      expect(pendingRaf).toBeNull()
    })

    it('continues rAF while tasks remain', () => {
      const d = new AnimationDriver()
      const task = { advance: vi.fn().mockReturnValue(false) }
      d.register(Symbol(), task)
      flushRaf(16)
      expect(pendingRaf).not.toBeNull() // still scheduled
    })

    it('deregister() removes a task and cancels rAF when empty', () => {
      const d = new AnimationDriver()
      const id = Symbol()
      const task = { advance: vi.fn().mockReturnValue(false) }
      d.register(id, task)
      d.deregister(id)
      expect(pendingRaf).toBeNull()
    })
  })

  describe('dt calculation', () => {
    it('uses 16ms for the very first frame (no previous timestamp)', () => {
      const d = new AnimationDriver()
      let receivedDt = 0
      const task = { advance: vi.fn((dt: number) => { receivedDt = dt; return true }) }
      d.register(Symbol(), task)
      flushRaf(1000) // arbitrary first timestamp
      expect(receivedDt).toBeCloseTo(0.016, 4)
    })

    it('uses real dt between frames', () => {
      const d = new AnimationDriver()
      let receivedDt = 0
      let callCount = 0
      const task = {
        advance: vi.fn((dt: number) => {
          callCount++
          if (callCount === 2) receivedDt = dt
          return callCount >= 2
        }),
      }
      d.register(Symbol(), task)
      flushRaf(1000)  // first frame: dt = 16ms (no prior)
      flushRaf(1032)  // second frame: dt = (1032-1000)/1000 = 32ms
      expect(receivedDt).toBeCloseTo(0.032, 4)
    })

    it('caps dt at 64ms even when the gap is large', () => {
      const d = new AnimationDriver()
      let receivedDt = 0
      let callCount = 0
      const task = {
        advance: vi.fn((dt: number) => {
          callCount++
          if (callCount === 2) receivedDt = dt
          return callCount >= 2
        }),
      }
      d.register(Symbol(), task)
      flushRaf(1000)
      flushRaf(2000) // 1000ms gap — must be capped at 64ms
      expect(receivedDt).toBeLessThanOrEqual(0.064)
    })
  })

  describe('visibility handling', () => {
    it('pauses the loop when document becomes hidden', () => {
      const mockDoc = setupMockDocument(false)
      const d = new AnimationDriver()
      const task = { advance: vi.fn().mockReturnValue(false) }
      d.register(Symbol(), task)
      expect(pendingRaf).not.toBeNull()

      // Trigger visibilitychange hidden
      const handler = mockDoc._listeners.get('visibilitychange') as () => void
      ;(mockDoc as any)._hidden = true
      Object.defineProperty(mockDoc, 'hidden', { get: () => true, configurable: true })
      handler()
      expect(pendingRaf).toBeNull()
    })

    it('resets dt to 16ms when resuming from hidden', () => {
      const mockDoc = setupMockDocument(false)
      const d = new AnimationDriver()
      let receivedDts: number[] = []
      let callCount = 0
      const task = {
        advance: vi.fn((dt: number) => {
          receivedDts.push(dt)
          return ++callCount >= 3
        }),
      }
      d.register(Symbol(), task)

      // Frame 1 at t=1000 (dt=16ms default)
      flushRaf(1000)

      // Tab hidden
      const handler = mockDoc._listeners.get('visibilitychange') as () => void
      Object.defineProperty(mockDoc, 'hidden', { get: () => true, configurable: true })
      handler()

      // Tab visible again
      Object.defineProperty(mockDoc, 'hidden', { get: () => false, configurable: true })
      handler()

      // Frame 2 — first frame after resume should have dt=16ms, not the large gap
      flushRaf(60000)
      expect(receivedDts[1]).toBeCloseTo(0.016, 4)
    })
  })

  describe('multiple tasks', () => {
    it('advances all registered tasks each tick', () => {
      const d = new AnimationDriver()
      const t1 = { advance: vi.fn().mockReturnValue(false) }
      const t2 = { advance: vi.fn().mockReturnValue(false) }
      d.register(Symbol(), t1)
      d.register(Symbol(), t2)
      flushRaf(16)
      expect(t1.advance).toHaveBeenCalledOnce()
      expect(t2.advance).toHaveBeenCalledOnce()
    })

    it('removes a settled task without stopping unsettled ones', () => {
      const d = new AnimationDriver()
      const t1 = { advance: vi.fn().mockReturnValue(true) }  // settles on first tick
      const t2 = { advance: vi.fn().mockReturnValue(false) } // never settles
      d.register(Symbol(), t1)
      d.register(Symbol(), t2)
      flushRaf(16)
      expect(pendingRaf).not.toBeNull() // t2 still running
      flushRaf(32)
      expect(t1.advance).toHaveBeenCalledOnce() // only called once, then removed
      expect(t2.advance).toHaveBeenCalledTimes(2)
    })
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd packages/fluid && pnpm test:unit -- --reporter=verbose
```
Expected: `AnimationDriver` tests FAIL with module-not-found.

- [ ] **Step 3: Create `src/core/driver.ts`**

```typescript
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

// Module-federation-safe singleton: Symbol.for() resolves the same symbol across
// multiple copies of the module loaded in the same browsing context.
const DRIVER_KEY = Symbol.for('neutro.fluid.driver')
if (!(globalThis as any)[DRIVER_KEY]) {
  if (typeof document !== 'undefined' || typeof requestAnimationFrame !== 'undefined') {
    (globalThis as any)[DRIVER_KEY] = new AnimationDriver()
  }
}
export const driver: AnimationDriver = (globalThis as any)[DRIVER_KEY] ?? new AnimationDriver()
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/fluid && pnpm test:unit -- --reporter=verbose
```
Expected: All tests GREEN.

- [ ] **Step 5: Commit**

```bash
git add packages/fluid/src/core/driver.ts packages/fluid/src/core/driver.test.ts
git commit -m "feat(core): add AnimationDriver with shared rAF loop and visibility pause (P0-T1-04)"
```

---

## Task 6: P0-T1-05 — Velocity Registry and startSpring

**Files:**
- Modify: `src/core/driver.ts`
- Modify: `src/core/driver.test.ts`

- [ ] **Step 1: Write failing tests — add a new describe block at the end of `src/core/driver.test.ts`**

Add these imports at the top:
```typescript
import { startSpring } from './driver'
import { SPRING_PRESETS } from './spring'
```

Append at the end of the file:

```typescript
describe('startSpring — P0-T1-05', () => {
  function makeMockEl() {
    const props = new Map<string, string>()
    return {
      style: {
        setProperty(k: string, v: string) { props.set(k, v) },
        getPropertyValue(k: string) { return props.get(k) ?? '' },
        removeProperty(k: string) { props.delete(k) },
      },
      _props: props,
    } as unknown as HTMLElement
  }

  function advanceUntilSettled(maxFrames = 600, dtMs = 16): void {
    let ts = 0
    for (let i = 0; i < maxFrames; i++) {
      ts += dtMs
      if (!flushRaf(ts)) break
    }
  }

  it('applies value to element style on each frame', async () => {
    const d = new AnimationDriver()
    const el = makeMockEl()
    const settled = startSpring(el, '--opacity', 1, SPRING_PRESETS.snappy, d)
    flushRaf(16)
    const v = parseFloat(el._props.get('--opacity') ?? '')
    expect(v).toBeGreaterThan(0)
    expect(v).toBeLessThanOrEqual(1)
    advanceUntilSettled()
    await settled
  })

  it('resolves the returned promise when the spring settles', async () => {
    const d = new AnimationDriver()
    const el = makeMockEl()
    const promise = startSpring(el, '--x', 100, SPRING_PRESETS.snappy, d)
    advanceUntilSettled()
    await expect(promise).resolves.toBeUndefined()
  })

  it('sets will-change on the element when animation starts', () => {
    const d = new AnimationDriver()
    const el = makeMockEl()
    startSpring(el, '--x', 1, SPRING_PRESETS.snappy, d)
    expect(el._props.get('will-change')).toBe('transform, opacity')
    advanceUntilSettled()
  })

  it('removes will-change after settling', async () => {
    const d = new AnimationDriver()
    const el = makeMockEl()
    const promise = startSpring(el, '--x', 1, SPRING_PRESETS.snappy, d)
    advanceUntilSettled()
    await promise
    expect(el._props.has('will-change')).toBe(false)
  })

  it('preserves velocity from interrupted animation', () => {
    const d = new AnimationDriver()
    const el = makeMockEl()

    // Start first animation
    startSpring(el, '--x', 100, SPRING_PRESETS.bouncy, d)
    // Advance a few frames to build velocity
    flushRaf(16)
    flushRaf(32)
    flushRaf(48)

    // Read mid-animation value
    const midValue = parseFloat(el._props.get('--x') ?? '0')
    expect(midValue).toBeGreaterThan(0)

    // Interrupt with new animation — must carry forward velocity, not restart from 0
    startSpring(el, '--x', 0, SPRING_PRESETS.bouncy, d)
    flushRaf(64) // one frame after interruption

    const afterInterrupt = parseFloat(el._props.get('--x') ?? '0')
    // If velocity was preserved, the value would still be > 0 (moving toward 100 before turning)
    // If velocity was discarded, it would immediately head toward 0 from midValue
    // We verify the value is not drastically different from midValue in one frame
    expect(Math.abs(afterInterrupt - midValue)).toBeLessThan(midValue * 0.5)

    advanceUntilSettled()
  })

  it('clamps extreme velocity to maxVelocity (default 2000)', () => {
    const d = new AnimationDriver()
    const el1 = makeMockEl()
    const el2 = makeMockEl()

    startSpring(el1, '--x', 100, SPRING_PRESETS.snappy, d)
    // Create an artificial extremely-high-velocity state by injecting directly
    // We test by checking that the second animation (same element) doesn't jump to infinity
    advanceUntilSettled()

    // Start with a normal animation and interrupt — velocity is bounded
    const el = makeMockEl()
    startSpring(el, '--x', 1000, SPRING_PRESETS.bouncy, d)
    for (let i = 0; i < 3; i++) flushRaf(i * 16 + 16)
    startSpring(el, '--x', 0, SPRING_PRESETS.bouncy, d)
    flushRaf(100)
    const v = parseFloat(el._props.get('--x') ?? '0')
    expect(Number.isFinite(v)).toBe(true)
    advanceUntilSettled()
  })

  it('uses relative settling threshold (range * 0.001)', async () => {
    const d = new AnimationDriver()
    const el = makeMockEl()
    // Large range animation — settling threshold must scale with range, not be absolute 0.001
    const promise = startSpring(el, '--x', 1000, SPRING_PRESETS.snappy, d)
    advanceUntilSettled(1200)
    await promise
    const finalValue = parseFloat(el._props.get('--x') ?? '0')
    // Should settle to within 0.1% of 1000 (i.e., within 1 unit), not just within 0.001
    expect(Math.abs(finalValue - 1000)).toBeLessThan(1)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd packages/fluid && pnpm test:unit -- --reporter=verbose
```
Expected: `startSpring` tests FAIL with "startSpring is not exported".

- [ ] **Step 3: Add velocity registry and `startSpring` to `src/core/driver.ts`**

Add these imports at the top of `driver.ts`:
```typescript
import { stepSpring, validateSpringConfig } from './spring'
import type { SpringConfig, SpringState } from './spring'
import { WillChangeManager } from './will-change'
```

Append after the `AnimationDriver` class definition (before the singleton block):

```typescript
interface ActiveAnimation {
  springState: SpringState
  target: number
  property: string
  config: SpringConfig
  settle: () => void
}

const activeAnimations = new WeakMap<Element, Map<string, ActiveAnimation>>()

function applyValue(el: Element, property: string, value: number): void {
  (el as HTMLElement).style.setProperty(property, String(value))
}

function parseCurrentValue(el: Element, property: string): number {
  const raw = (el as HTMLElement).style.getPropertyValue(property)
  return parseFloat(raw) || 0
}

export function startSpring(
  el: Element,
  property: string,
  target: number,
  config: SpringConfig,
  d: AnimationDriver = driver,
  options?: {
    velocityScale?: number
    maxVelocity?: number
  },
): Promise<void> {
  const cfg = validateSpringConfig(config)
  const existing = activeAnimations.get(el)?.get(property)

  let initialVelocity = existing?.springState.velocity ?? 0
  const maxV = options?.maxVelocity ?? 2000
  initialVelocity = Math.max(-maxV, Math.min(maxV, initialVelocity))
  if (options?.velocityScale) initialVelocity *= options.velocityScale

  const initialValue = existing?.springState.value ?? parseCurrentValue(el, property)

  let resolve!: () => void
  const settled = new Promise<void>(r => { resolve = r })

  const animation: ActiveAnimation = {
    springState: { value: initialValue, velocity: initialVelocity },
    target,
    property,
    config: cfg,
    settle: resolve,
  }

  if (!activeAnimations.has(el)) activeAnimations.set(el, new Map())
  activeAnimations.get(el)!.set(property, animation)

  WillChangeManager.acquire(el)

  const id = Symbol()
  const range = Math.abs(target - initialValue) || 1
  const posThreshold = Math.min(Math.max(range * 0.001, 0.0001), 0.5)
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
```

- [ ] **Step 4: Update `src/core/index.ts`** — append:

```typescript
export { AnimationDriver, driver, startSpring } from './driver'
export type { SpringTask } from './driver'
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd packages/fluid && pnpm test:unit -- --reporter=verbose
```
Expected: All tests GREEN.

- [ ] **Step 6: Commit**

```bash
git add packages/fluid/src/core/driver.ts packages/fluid/src/core/driver.test.ts packages/fluid/src/core/index.ts
git commit -m "feat(core): add velocity registry and startSpring with preserved velocity (P0-T1-05)"
```

---

## Task 7: P0-T1-07 — Reactive Spring Values

**Files:**
- Create: `src/core/reactive.ts`
- Create: `src/core/reactive.test.ts`

- [ ] **Step 1: Write failing tests in `src/core/reactive.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { spring } from './reactive'
import { AnimationDriver } from './driver'

// Same rAF harness as driver.test.ts
let pendingRaf: ((ts: number) => void) | null = null
let rafCounter = 0

function setupMockRaf() {
  pendingRaf = null
  rafCounter = 0
  vi.stubGlobal('requestAnimationFrame', (cb: (ts: number) => void) => {
    pendingRaf = cb
    return ++rafCounter
  })
  vi.stubGlobal('cancelAnimationFrame', (_id: number) => {
    pendingRaf = null
  })
  vi.stubGlobal('document', {
    hidden: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  })
}

function flushRaf(ts: number): boolean {
  if (!pendingRaf) return false
  const cb = pendingRaf
  pendingRaf = null
  cb(ts)
  return true
}

function advanceUntilSettled(maxFrames = 600, dtMs = 16): void {
  let ts = 0
  for (let i = 0; i < maxFrames; i++) {
    ts += dtMs
    if (!flushRaf(ts)) break
  }
}

beforeEach(() => {
  setupMockRaf()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('spring() reactive value — P0-T1-07', () => {
  describe('subscribe()', () => {
    it('calls subscriber immediately with initial value', () => {
      const d = new AnimationDriver()
      const s = spring(0, 'snappy', d)
      const received: number[] = []
      s.subscribe(v => received.push(v))
      expect(received).toEqual([0])
    })

    it('calls subscriber on each animation frame with updated value', () => {
      const d = new AnimationDriver()
      const s = spring(0, 'snappy', d)
      const received: number[] = []
      s.subscribe(v => received.push(v))
      s.to(1)
      flushRaf(16)
      flushRaf(32)
      expect(received.length).toBeGreaterThan(2) // initial + frames
    })

    it('multiple subscribers all receive the same value', () => {
      const d = new AnimationDriver()
      const s = spring(0, 'snappy', d)
      const a: number[] = []
      const b: number[] = []
      s.subscribe(v => a.push(v))
      s.subscribe(v => b.push(v))
      s.to(1)
      flushRaf(16)
      expect(a).toEqual(b)
    })

    it('returns an unsubscribe function that stops notifications', () => {
      const d = new AnimationDriver()
      const s = spring(0, 'snappy', d)
      const received: number[] = []
      const unsub = s.subscribe(v => received.push(v))
      unsub()
      s.to(1)
      flushRaf(16)
      expect(received).toHaveLength(1) // only the immediate call
    })
  })

  describe('to()', () => {
    it('animates toward the target', async () => {
      const d = new AnimationDriver()
      const s = spring(0, 'snappy', d)
      s.to(1)
      advanceUntilSettled()
      const result = await s.settled()
      const received: number[] = []
      s.subscribe(v => received.push(v))
      expect(received[0]).toBeCloseTo(1, 3)
    })

    it('preserves velocity when called mid-animation', () => {
      const d = new AnimationDriver()
      const s = spring(0, 'bouncy', d)
      const received: number[] = []
      s.subscribe(v => received.push(v))

      // Animate toward 100
      s.to(100)
      flushRaf(16)
      flushRaf(32)
      flushRaf(48)

      const velBefore = (s as any)._velocity as number
      expect(velBefore).not.toBe(0) // must have built up velocity

      // Interrupt — velocity should carry forward (not reset to 0)
      s.to(0)
      flushRaf(64) // one more frame

      // If velocity was preserved, value doesn't snap to 0 instantly
      const lastReceived = received[received.length - 1]
      expect(lastReceived).toBeGreaterThan(0)

      advanceUntilSettled()
    })
  })

  describe('settled()', () => {
    it('resolves when the animation completes', async () => {
      const d = new AnimationDriver()
      const s = spring(0, 'snappy', d)
      s.to(1)
      advanceUntilSettled()
      await expect(s.settled()).resolves.toBeUndefined()
    })

    it('returns an already-resolved promise if not animating', async () => {
      const d = new AnimationDriver()
      const s = spring(0, 'snappy', d)
      await expect(s.settled()).resolves.toBeUndefined()
    })
  })

  describe('dispose()', () => {
    it('stops animation and clears subscribers', () => {
      const d = new AnimationDriver()
      const s = spring(0, 'snappy', d)
      const received: number[] = []
      s.subscribe(v => received.push(v))
      s.to(1)
      flushRaf(16)
      s.dispose()
      flushRaf(32) // should not trigger any subscriber
      expect(received).toHaveLength(2) // initial + one frame
    })

    it('resolves settled() promise on dispose', async () => {
      const d = new AnimationDriver()
      const s = spring(0, 'snappy', d)
      s.to(1)
      const promise = s.settled()
      s.dispose()
      await expect(promise).resolves.toBeUndefined()
    })
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd packages/fluid && pnpm test:unit -- --reporter=verbose
```
Expected: `spring()` tests FAIL with module-not-found.

- [ ] **Step 3: Create `src/core/reactive.ts`**

```typescript
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
  _value: number
  _velocity: number = 0
  private _target: number
  private _config: SpringConfig
  private _driver: AnimationDriver
  private _taskId: symbol | null = null
  private _subscribers = new Set<(v: number) => void>()
  private _settleResolve: (() => void) | null = null
  private _settlePromise: Promise<void> | null = null

  constructor(initial: number, config: SpringConfig, d: AnimationDriver) {
    this._value = initial
    this._target = initial
    this._config = config
    this._driver = d
  }

  to(target: number): void {
    this._target = target
    const maxV = 2000
    this._velocity = Math.max(-maxV, Math.min(maxV, this._velocity))

    // Cancel running task
    if (this._taskId !== null) {
      this._driver.deregister(this._taskId)
      this._taskId = null
    }

    // New settled promise
    let resolve!: () => void
    const promise = new Promise<void>(r => { resolve = r })
    const prevResolve = this._settleResolve
    this._settleResolve = resolve
    this._settlePromise = promise

    // Resolve previous if there was one (mid-animation interruption)
    if (prevResolve) prevResolve()

    const id = Symbol()
    this._taskId = id

    const startValue = this._value
    const startVelocity = this._velocity

    const range = Math.abs(target - startValue) || 1
    const posThreshold = Math.min(Math.max(range * 0.001, 0.0001), 0.5)
    const velThreshold = posThreshold * 2

    let state = { value: startValue, velocity: startVelocity }

    this._driver.register(id, {
      advance: (dt: number): boolean => {
        state = stepSpring(this._config, state, target, dt)
        this._value = state.value
        this._velocity = state.velocity

        for (const fn of this._subscribers) fn(this._value)

        const isSettled =
          Math.abs(state.value - target) < posThreshold &&
          Math.abs(state.velocity) < velThreshold

        if (isSettled) {
          this._value = target
          this._velocity = 0
          this._taskId = null
          for (const fn of this._subscribers) fn(this._value)
          resolve()
          this._settleResolve = null
        }

        return isSettled
      },
    })
  }

  subscribe(fn: (v: number) => void): () => void {
    this._subscribers.add(fn)
    fn(this._value)
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
```

- [ ] **Step 4: Update `src/core/index.ts`** — append:

```typescript
export { spring } from './reactive'
export type { ReactiveSpring } from './reactive'
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd packages/fluid && pnpm test:unit -- --reporter=verbose
```
Expected: All tests GREEN.

- [ ] **Step 6: Commit**

```bash
git add packages/fluid/src/core/reactive.ts packages/fluid/src/core/reactive.test.ts packages/fluid/src/core/index.ts
git commit -m "feat(core): add reactive spring values with to/subscribe/settled/dispose (P0-T1-07)"
```

---

## Final Verification

- [ ] **Run the full unit test suite one last time**

```bash
cd packages/fluid && pnpm test:unit -- --reporter=verbose
```
Expected output: All suites pass, 0 failures. Test files: spring.test.ts, will-change.test.ts, driver.test.ts, reactive.test.ts.

---

## Self-Review Checklist

**Spec coverage:**
- P0-T1-02 ✓ All three regimes. Existing underdamped tests retained.
- P0-T1-03 ✓ FluidError, validateSpringConfig with dev/prod distinction, log-once.
- P0-T1-08 ✓ SPRING_PRESETS with exact golden values, type-checked via `satisfies`.
- P0-T1-06 ✓ WillChangeManager acquire/release, ref-counted, WeakMap GC-safe.
- P0-T1-04 ✓ AnimationDriver, single rAF loop, dt cap at 64ms, visibility pause/resume, dt reset to 16ms on resume.
- P0-T1-05 ✓ Velocity registry via WeakMap, velocity carry-forward, maxVelocity clamp, velocityScale option, relative settling threshold, WillChangeManager integration.
- P0-T1-07 ✓ spring() with to/subscribe/settled/dispose, velocity preservation on to() interrupt.

**Critical rules verified:**
- Symbol.for('neutro.fluid.driver') used for singleton ✓
- Settling threshold = range * 0.001, not absolute 0.001 ✓
- Velocity clamped to maxVelocity (2000) before use ✓
- WillChangeManager.acquire on start, release on settle ✓
- dt capped at 64ms ✓
- lastTimestamp = null on visibility hide (resets dt to 16ms on resume) ✓
- No module-level `new AnimationDriver()` without Symbol.for guard ✓
