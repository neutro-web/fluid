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
 * dt is in real seconds — the caller provides the delta, never assume 60fps.
 * P0-T1-02 will add critically damped (ζ=1) and overdamped (ζ>1) regimes.
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
