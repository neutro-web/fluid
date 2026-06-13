const DURATION_MS = 400

export class FluidRipple {
  private readonly canvas: HTMLCanvasElement | null
  private readonly ctx: CanvasRenderingContext2D | null
  private rafId: number | null = null

  constructor(shadowRoot: ShadowRoot) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) {
      this.canvas = null
      this.ctx = null
      return
    }

    const canvas = document.createElement('canvas')
    // z-index:2 places the canvas above [part="surface"] (z-index:1) so the
    // ripple gradient is visible on top of the button's opaque background.
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2'
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('FluidRipple: failed to acquire 2d rendering context')
    this.canvas = canvas
    this.ctx = ctx
    shadowRoot.appendChild(canvas)
  }

  trigger(originX: number, originY: number): void {
    if (!this.canvas || !this.ctx) return

    const w = this.canvas.offsetWidth
    const h = this.canvas.offsetHeight
    if (w === 0 || h === 0) return

    // Scale canvas bitmap to physical pixels for crisp rendering on HiDPI displays
    const dpr = window.devicePixelRatio || 1
    this.canvas.width = w * dpr
    this.canvas.height = h * dpr
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // Furthest corner distance = maximum radius the wave needs to reach
    const maxRadius = Math.sqrt(
      Math.max(originX, w - originX) ** 2 +
      Math.max(originY, h - originY) ** 2
    )

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }

    // start is captured inside the first rAF tick so the clock source
    // (rAF timestamp) matches all subsequent elapsed calculations.
    let start = -1
    const ctx = this.ctx

    const frame = (now: number): void => {
      if (start < 0) start = now
      const elapsed = now - start
      const t = Math.min(elapsed / DURATION_MS, 1)

      ctx.clearRect(0, 0, w, h)

      if (t < 1) {
        const radius = maxRadius * t
        // Overall envelope decays with time; peak alpha is at the wavefront ring
        const envelope = (1 - t) * 0.35

        // Radial gradient: transparent at origin → transparent at inner zone →
        // peak at wavefront ring (0.85 of radius) → transparent at outer edge.
        // This models a pressure wave that has passed through the interior,
        // leaving it calm, with energy concentrated at the expanding front.
        // White is intentional — glass surfaces use light highlights as interaction cues.
        const gradient = ctx.createRadialGradient(originX, originY, 0, originX, originY, radius)
        gradient.addColorStop(0,    `rgba(255,255,255,0)`)
        gradient.addColorStop(0.65, `rgba(255,255,255,0)`)
        gradient.addColorStop(0.85, `rgba(255,255,255,${envelope.toFixed(3)})`)
        gradient.addColorStop(1,    `rgba(255,255,255,0)`)

        ctx.beginPath()
        ctx.arc(originX, originY, radius, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()

        this.rafId = requestAnimationFrame(frame)
      } else {
        // Animation complete — canvas is already cleared, stop the loop
        this.rafId = null
      }
    }

    this.rafId = requestAnimationFrame(frame)
  }

  destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.canvas?.remove()
  }
}
