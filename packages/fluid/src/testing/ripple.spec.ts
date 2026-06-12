import { FluidRipple } from '../core/ripple'

describe('FluidRipple', () => {
  let host: HTMLElement
  let shadowRoot: ShadowRoot

  beforeEach(() => {
    host = document.createElement('div')
    host.style.cssText = 'position:relative;width:200px;height:100px'
    document.body.appendChild(host)
    shadowRoot = host.attachShadow({ mode: 'open' })
  })

  afterEach(() => {
    host.remove()
  })

  // ─── Construction ────────────────────────────────────────────────────────────

  it('appends a canvas element to the shadow root on construction', () => {
    const ripple = new FluidRipple(shadowRoot)
    const canvas = shadowRoot.querySelector('canvas')
    if (!canvas) throw new Error('Expected a <canvas> inside the shadow root')
    ripple.destroy()
  })

  it('canvas has position:absolute', () => {
    const ripple = new FluidRipple(shadowRoot)
    const canvas = shadowRoot.querySelector('canvas') as HTMLCanvasElement
    if (canvas.style.position !== 'absolute') {
      throw new Error(`Expected position:absolute, got "${canvas.style.position}"`)
    }
    ripple.destroy()
  })

  it('canvas has pointer-events:none', () => {
    const ripple = new FluidRipple(shadowRoot)
    const canvas = shadowRoot.querySelector('canvas') as HTMLCanvasElement
    if (canvas.style.pointerEvents !== 'none') {
      throw new Error(`Expected pointer-events:none, got "${canvas.style.pointerEvents}"`)
    }
    ripple.destroy()
  })

  it('canvas has z-index:0', () => {
    const ripple = new FluidRipple(shadowRoot)
    const canvas = shadowRoot.querySelector('canvas') as HTMLCanvasElement
    if (canvas.style.zIndex !== '0') {
      throw new Error(`Expected z-index:0, got "${canvas.style.zIndex}"`)
    }
    ripple.destroy()
  })

  it('canvas has inset:0', () => {
    const ripple = new FluidRipple(shadowRoot)
    const canvas = shadowRoot.querySelector('canvas') as HTMLCanvasElement
    if (canvas.style.inset !== '0px') {
      throw new Error(`Expected inset:0px, got "${canvas.style.inset}"`)
    }
    ripple.destroy()
  })

  // ─── destroy() ───────────────────────────────────────────────────────────────

  it('destroy() removes the canvas from the shadow root', () => {
    const ripple = new FluidRipple(shadowRoot)
    ripple.destroy()
    const canvas = shadowRoot.querySelector('canvas')
    if (canvas) throw new Error('Expected canvas to be removed after destroy()')
  })

  it('destroy() while no animation in progress does not throw', () => {
    const ripple = new FluidRipple(shadowRoot)
    ripple.destroy()
  })

  it('destroy() cancels an in-progress animation without throwing', async () => {
    const ripple = new FluidRipple(shadowRoot)
    ripple.trigger(50, 50)
    await new Promise<void>(r => requestAnimationFrame(() => r()))
    ripple.destroy()
    if (shadowRoot.querySelector('canvas')) {
      throw new Error('Canvas should be removed after destroy()')
    }
  })

  // ─── trigger() ───────────────────────────────────────────────────────────────

  it('trigger() does not throw', () => {
    const ripple = new FluidRipple(shadowRoot)
    ripple.trigger(50, 25)
    ripple.destroy()
  })

  it('trigger() paints at least one frame onto the canvas within two rAF ticks', async () => {
    const ripple = new FluidRipple(shadowRoot)
    ripple.trigger(50, 25)
    // Wait two frames so the first rAF callback has fired and drawn
    await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())))

    const canvas = shadowRoot.querySelector('canvas') as HTMLCanvasElement
    const ctx = canvas.getContext('2d')!
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const hasNonZeroPixel = imageData.data.some(v => v > 0)
    if (!hasNonZeroPixel) {
      throw new Error('Expected canvas to have painted pixels after trigger()')
    }
    ripple.destroy()
  })

  it('pixel alpha at the press origin is less than the wavefront peak (distance-decay physics)', async () => {
    // Trigger at the center of the 200x100 host so geometry is symmetric
    const ripple = new FluidRipple(shadowRoot)
    ripple.trigger(100, 50)

    // Wait enough frames for the ring to expand well past the origin pixel
    for (let i = 0; i < 6; i++) {
      await new Promise<void>(r => requestAnimationFrame(() => r()))
    }

    const canvas = shadowRoot.querySelector('canvas') as HTMLCanvasElement
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1

    // Alpha at the press origin — should be near zero (wave has passed through)
    const centerPx = ctx.getImageData(Math.floor(100 * dpr), Math.floor(50 * dpr), 1, 1)
    const originAlpha = centerPx.data[3]

    // Maximum alpha anywhere in the image — should be the wavefront ring
    const all = ctx.getImageData(0, 0, canvas.width, canvas.height)
    let maxAlpha = 0
    for (let i = 3; i < all.data.length; i += 4) {
      if (all.data[i] > maxAlpha) maxAlpha = all.data[i]
    }

    if (maxAlpha === 0) throw new Error('Expected painted pixels at 6 frames')
    if (originAlpha >= maxAlpha) {
      throw new Error(
        `Expected origin alpha (${originAlpha}) < wavefront max alpha (${maxAlpha})`
      )
    }
    ripple.destroy()
  })

  it('animation completes and clears the canvas within 600ms', async () => {
    const ripple = new FluidRipple(shadowRoot)
    ripple.trigger(50, 25)
    await new Promise<void>(r => setTimeout(r, 600))
    const canvas = shadowRoot.querySelector('canvas') as HTMLCanvasElement
    const ctx = canvas.getContext('2d')!
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const hasNonZeroPixel = imageData.data.some(v => v > 0)
    if (hasNonZeroPixel) {
      throw new Error('Expected canvas to be fully cleared after animation completes')
    }
    ripple.destroy()
  })

  it('a second trigger() supersedes the first without error', async () => {
    const ripple = new FluidRipple(shadowRoot)
    ripple.trigger(10, 10)
    await new Promise<void>(r => requestAnimationFrame(() => r()))
    ripple.trigger(100, 50)
    await new Promise<void>(r => setTimeout(r, 600))
    ripple.destroy()
  })

  it('trigger() on a zero-size host element is a no-op (no throw)', async () => {
    const zeroHost = document.createElement('div')
    zeroHost.style.cssText = 'position:relative;width:0;height:0'
    document.body.appendChild(zeroHost)
    const sr = zeroHost.attachShadow({ mode: 'open' })
    const ripple = new FluidRipple(sr)
    ripple.trigger(0, 0) // should silently return, not throw
    await new Promise<void>(r => requestAnimationFrame(() => r()))
    ripple.destroy()
    zeroHost.remove()
  })

  // ─── prefers-reduced-motion ──────────────────────────────────────────────────

  it('no canvas is created when prefers-reduced-motion is active', () => {
    const original = window.matchMedia
    try {
      ;(window as any).matchMedia = (query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      })
      const ripple = new FluidRipple(shadowRoot)
      const canvas = shadowRoot.querySelector('canvas')
      if (canvas) throw new Error('Expected no canvas under prefers-reduced-motion')
      ripple.destroy()
    } finally {
      ;(window as any).matchMedia = original
    }
  })

  it('trigger() is a no-op when prefers-reduced-motion is active', async () => {
    const original = window.matchMedia
    try {
      ;(window as any).matchMedia = (query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      })
      const ripple = new FluidRipple(shadowRoot)
      ripple.trigger(50, 25)
      await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())))
      // No canvas should have been created or painted
      const canvas = shadowRoot.querySelector('canvas')
      if (canvas) throw new Error('Expected no canvas under prefers-reduced-motion')
      ripple.destroy()
    } finally {
      ;(window as any).matchMedia = original
    }
  })

  it('destroy() is safe to call under prefers-reduced-motion (no canvas was created)', () => {
    const original = window.matchMedia
    try {
      ;(window as any).matchMedia = (query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      })
      const ripple = new FluidRipple(shadowRoot)
      ripple.destroy() // should not throw even with no canvas
    } finally {
      ;(window as any).matchMedia = original
    }
  })
})
