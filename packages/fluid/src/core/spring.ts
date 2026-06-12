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

export interface SpringConfig {
  mass: number
  stiffness: number
  damping: number
}

export interface SpringState {
  value: number
  velocity: number
}

/**
 * Advances a spring one time step using the exact closed-form solution.
 *
 * Uses the foundation §II.4 equation:
 *   ζ  = damping / (2 × √(stiffness × mass))
 *   ω₀ = √(stiffness / mass)
 *
 * Underdamped (ζ < 1):
 *   x(t) = e^(−αt)[A·cos(ωdt) + B·sin(ωdt)] + x∞
 *   where α = ζω₀, ωd = ω₀√(1−ζ²), A = x₀−x∞, B = (ẋ₀+α·A)/ωd
 *
 * Critically damped (ζ = 1):
 *   x(t) = (A + Bt)e^(−ω₀t) + x∞
 *   where A = x₀−x∞, B = ẋ₀ + ω₀·A
 *
 * Overdamped (ζ > 1):
 *   x(t) = Ae^(r₁t) + Be^(r₂t) + x∞
 *   where r₁ = ω₀(−ζ+γ), r₂ = ω₀(−ζ−γ), γ = √(ζ²−1)
 *
 * dt is in real seconds — the caller provides the delta, never assume 60fps.
 */
export function stepSpring(
  config: SpringConfig,
  state: SpringState,
  target: number,
  dt: number,
): SpringState {
  const { mass, stiffness, damping } = config
  const { value, velocity } = state

  const omega0 = Math.sqrt(stiffness / mass)
  const zeta = damping / (2 * Math.sqrt(stiffness * mass))

  const d0 = value - target // displacement from equilibrium
  const v0 = velocity

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
