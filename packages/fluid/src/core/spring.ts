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

  // P0-T1-02: critically damped (ζ = 1) and overdamped (ζ > 1) — not yet implemented.
  throw new Error(`stepSpring: underdamped only in P0-T1-01 (ζ < 1). Got ζ = ${zeta.toFixed(4)}`)
}
