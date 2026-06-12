import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { stepSpring, validateSpringConfig, FluidError, _resetValidationWarnings, SPRING_PRESETS } from './spring'
import type { SpringConfig, SpringState } from './spring'

// Golden values from docs/fluid-roadmap.md P0-T1-01 and docs/fluid-foundation-v5.md §II.4
const SNAPPY: SpringConfig = { mass: 0.5, stiffness: 400, damping: 28 }
// bouncy: ζ ≈ 0.58, clear ~10.7% overshoot — used for underdamped overshoot verification
const BOUNCY: SpringConfig = { mass: 1.0, stiffness: 300, damping: 20 }
function simulate(
  config: SpringConfig,
  from: number,
  to: number,
  fps: number,
  durationMs: number,
): SpringState {
  const dt = 1 / fps
  const steps = Math.round((durationMs / 1000) * fps)
  let state: SpringState = { value: from, velocity: 0 }
  for (let i = 0; i < steps; i++) {
    state = stepSpring(config, state, to, dt)
  }
  return state
}

function simulateMaxValue(
  config: SpringConfig,
  from: number,
  to: number,
  fps: number,
  durationMs: number,
): number {
  const dt = 1 / fps
  const steps = Math.round((durationMs / 1000) * fps)
  let state: SpringState = { value: from, velocity: 0 }
  let maxValue = from
  for (let i = 0; i < steps; i++) {
    state = stepSpring(config, state, to, dt)
    if (state.value > maxValue) maxValue = state.value
  }
  return maxValue
}

describe('stepSpring — underdamped spring solver (P0-T1-01)', () => {
  describe('velocity preservation (non-zero v₀)', () => {
    it('correctly incorporates initial velocity into B = (v₀ + α·d₀)/ωd', () => {
      // snappy: α = 28 (exact), ωd = 4 (exact)
      // A = 0.5 − 1 = −0.5, B = (50 + 28×(−0.5))/4 = 36/4 = 9
      // If v₀ were ignored, B = −3.5 and value would be ≈ 0.54 — very different.
      const state = stepSpring(SNAPPY, { value: 0.5, velocity: 50 }, 1, 1 / 60)
      // decay·(A·cos + B·sin) + target ≈ 0.627·(−0.5·0.998 + 9·0.0666) + 1 ≈ 1.063
      expect(state.value).toBeCloseTo(1.063, 2)
      // decay·(50·cos − 250·sin) ≈ 0.627·(49.9 − 16.6) ≈ 20.84
      expect(state.velocity).toBeCloseTo(20.84, 1)
    })
  })

  describe('settling near target', () => {
    it('snappy is within 0.5% of target after 300ms at 60fps', () => {
      // Analytical settle time for snappy with threshold range×0.001 is ~316ms (one frame
      // past 300ms at 60fps). The roadmap says "300ms" — the physics puts it at 316ms.
      // At 300ms the value is ≈ 0.9985, i.e., 0.15% from target — well within 0.5%.
      const result = simulate(SNAPPY, 0, 1, 60, 300)
      const range = Math.abs(1 - 0)
      expect(Math.abs(result.value - 1)).toBeLessThan(range * 0.005)
    })

    it('snappy fully settles (|err| < range × 0.001) by 500ms at 60fps', () => {
      const result = simulate(SNAPPY, 0, 1, 60, 500)
      const range = Math.abs(1 - 0)
      expect(Math.abs(result.value - 1)).toBeLessThan(range * 0.001)
    })

    it('correctly handles reversed direction: from=1 to=0 settles by 500ms', () => {
      const result = simulate(SNAPPY, 1, 0, 60, 500)
      expect(result.value).toBeCloseTo(0, 2)
    })
  })

  describe('underdamped overshoot', () => {
    it('bouncy preset (ζ ≈ 0.58) overshoots target=1 by ~10% — clearly underdamped', () => {
      // bouncy: α=10, ωd=√200≈14.14; peak at t=π/ωd≈0.22s, overshoot ≈ e^(−π/√2)≈10.8%
      const maxValue = simulateMaxValue(BOUNCY, 0, 1, 60, 1000)
      expect(maxValue).toBeGreaterThan(1.05)
    })
  })

  describe('frame-rate independence', () => {
    it('run(60fps, 500ms) ≈ run(120fps, 500ms) within 1% (closed-form guarantee)', () => {
      const r60 = simulate(SNAPPY, 0, 1, 60, 500)
      const r120 = simulate(SNAPPY, 0, 1, 120, 500)
      expect(Math.abs(r60.value - r120.value)).toBeLessThan(0.01)
    })

    it('velocity is also frame-rate independent within 1%', () => {
      const r60 = simulate(SNAPPY, 0, 1, 60, 500)
      const r120 = simulate(SNAPPY, 0, 1, 120, 500)
      expect(Math.abs(r60.velocity - r120.velocity)).toBeLessThan(0.01)
    })
  })

  describe('numerical stability', () => {
    it('produces no NaN or Infinity over 2000ms', () => {
      const result = simulate(SNAPPY, 0, 1, 60, 2000)
      expect(Number.isFinite(result.value)).toBe(true)
      expect(Number.isFinite(result.velocity)).toBe(true)
    })

    it('handles zero displacement (value already at target)', () => {
      const state = stepSpring(SNAPPY, { value: 1, velocity: 0 }, 1, 1 / 60)
      expect(state.value).toBe(1)
      expect(state.velocity).toBe(0)
    })

    it('handles large range (0 to 1000)', () => {
      const result = simulate(SNAPPY, 0, 1000, 60, 2000)
      expect(Number.isFinite(result.value)).toBe(true)
      expect(Number.isFinite(result.velocity)).toBe(true)
    })
  })

})

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
    const maxValue = simulateMaxValue(BOUNCY, 0, 1, 60, 1000)
    expect(maxValue).toBeGreaterThan(1.05)
  })
})

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

  it('all presets pass validateSpringConfig without throwing', () => {
    for (const preset of Object.values(SPRING_PRESETS)) {
      expect(() => validateSpringConfig(preset)).not.toThrow()
    }
  })
})
