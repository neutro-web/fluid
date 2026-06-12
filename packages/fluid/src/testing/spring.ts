import { stepSpring, SPRING_PRESETS } from '../core/spring'
import type { SpringConfig } from '../core/spring'

type SpringPresetName = keyof typeof SPRING_PRESETS

export interface SpringSimulateResult {
  /** Value at the end of the simulation period. */
  finalValue: number
  /** True if the value ever crossed the target (underdamped overshoot). */
  didOvershoot: boolean
  /** Time in milliseconds at which the spring first settled within 0.1% of range. Equals durationMs if not settled. */
  settleTimeMs: number
}

export interface SpringSimulateOptions {
  from: number
  to: number
  durationMs: number
}

const SETTLE_THRESHOLD_RATIO = 0.001
const FRAME_DT = 1 / 60  // 60fps in seconds

export const FluidSpringUtils = {
  /**
   * Runs the spring solver synchronously at 60fps for durationMs.
   * Accepts a named preset ('snappy', 'bouncy', etc.) or a raw SpringConfig.
   */
  simulate(
    preset: SpringPresetName | SpringConfig,
    { from, to, durationMs }: SpringSimulateOptions,
  ): SpringSimulateResult {
    const config: SpringConfig = typeof preset === 'string'
      ? SPRING_PRESETS[preset]
      : preset

    const range = Math.abs(to - from) || 1
    const posThreshold = range * SETTLE_THRESHOLD_RATIO
    const velThreshold = posThreshold * 2

    let state = { value: from, velocity: 0 }
    let didOvershoot = false
    let settleTimeMs = durationMs  // default: not settled within duration

    const totalFrames = Math.ceil(durationMs / (FRAME_DT * 1000))

    for (let i = 0; i < totalFrames; i++) {
      state = stepSpring(config, state, to, FRAME_DT)

      // Detect overshoot: value crossed past the target
      if (to > from && state.value > to) didOvershoot = true
      if (to < from && state.value < to) didOvershoot = true

      // Detect settle: within threshold of target with near-zero velocity
      const settled =
        Math.abs(state.value - to) < posThreshold &&
        Math.abs(state.velocity) < velThreshold

      if (settled && settleTimeMs === durationMs) {
        settleTimeMs = (i + 1) * FRAME_DT * 1000
      }
    }

    return {
      finalValue: state.value,
      didOvershoot,
      settleTimeMs,
    }
  },
}
