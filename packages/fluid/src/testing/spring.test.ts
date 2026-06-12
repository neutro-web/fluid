import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { FluidSpringUtils } from './spring'

describe('FluidSpringUtils.simulate', () => {
  // snappy (ζ ≈ 0.99): nearly critically-damped, converges fast, no meaningful overshoot
  it('snappy preset: finalValue converges to target within 300ms', () => {
    const result = FluidSpringUtils.simulate('snappy', { from: 0, to: 1, durationMs: 300 })
    expect(result.finalValue).toBeCloseTo(1.0, 2)
  })

  it('snappy preset: settleTimeMs is under 500ms', () => {
    const result = FluidSpringUtils.simulate('snappy', { from: 0, to: 1, durationMs: 500 })
    expect(result.settleTimeMs).toBeLessThan(500)
    expect(result.finalValue).toBeCloseTo(1.0, 2)
  })

  // bouncy (ζ ≈ 0.58): clearly underdamped, overshoots by ~10%
  it('bouncy preset: didOvershoot is true (clearly underdamped, ζ ≈ 0.58)', () => {
    const result = FluidSpringUtils.simulate('bouncy', { from: 0, to: 1, durationMs: 800 })
    expect(result.didOvershoot).toBe(true)
    expect(result.finalValue).toBeCloseTo(1.0, 1)
  })

  // precise (ζ = 0.8): moderately underdamped, small overshoot
  it('precise preset: didOvershoot is true (ζ = 0.8, small overshoot)', () => {
    const result = FluidSpringUtils.simulate('precise', { from: 0, to: 1, durationMs: 800 })
    expect(result.didOvershoot).toBe(true)
  })

  it('returns finite values for all fields', () => {
    const result = FluidSpringUtils.simulate('snappy', { from: 0, to: 1, durationMs: 300 })
    expect(isFinite(result.finalValue)).toBe(true)
    expect(isFinite(result.settleTimeMs)).toBe(true)
  })

  it('works with negative from/to range', () => {
    const result = FluidSpringUtils.simulate('gentle', { from: 100, to: -50, durationMs: 1500 })
    expect(result.finalValue).toBeCloseTo(-50, 1)
  })

  it('settleTimeMs equals durationMs when spring has not settled within that period', () => {
    // 1ms is far too short to settle any spring
    const result = FluidSpringUtils.simulate('gentle', { from: 0, to: 1, durationMs: 1 })
    expect(result.settleTimeMs).toBe(1)
  })

  it('accepts a raw SpringConfig instead of a named preset', () => {
    const config = { mass: 0.5, stiffness: 400, damping: 28 }  // same as snappy
    const fromPreset = FluidSpringUtils.simulate('snappy', { from: 0, to: 1, durationMs: 300 })
    const fromRaw    = FluidSpringUtils.simulate(config,   { from: 0, to: 1, durationMs: 300 })
    expect(fromRaw.finalValue).toBeCloseTo(fromPreset.finalValue, 6)
  })

  it('property-based: any valid SpringConfig always produces finite, non-NaN values', () => {
    fc.assert(
      fc.property(
        fc.record({
          mass:      fc.float({ min: Math.fround(0.1), max: Math.fround(10),   noNaN: true }),
          stiffness: fc.float({ min: Math.fround(10),  max: Math.fround(1000), noNaN: true }),
          damping:   fc.float({ min: Math.fround(1),   max: Math.fround(100),  noNaN: true }),
        }),
        fc.float({ min: Math.fround(-1000), max: Math.fround(1000), noNaN: true }),
        fc.float({ min: Math.fround(-1000), max: Math.fround(1000), noNaN: true }),
        (config, from, to) => {
          const result = FluidSpringUtils.simulate(config, { from, to, durationMs: 2000 })
          // Core invariant: no NaN or Infinity produced for any valid spring config
          expect(isFinite(result.finalValue)).toBe(true)
          expect(isFinite(result.settleTimeMs)).toBe(true)
        }
      ),
      { numRuns: 200 }
    )
  })

  it('all five presets converge to target within 2 seconds', () => {
    const presets = ['snappy', 'bouncy', 'gentle', 'smooth', 'precise'] as const
    for (const preset of presets) {
      const result = FluidSpringUtils.simulate(preset, { from: 0, to: 100, durationMs: 2000 })
      expect(Math.abs(result.finalValue - 100)).toBeLessThan(0.5)
    }
  })
})
