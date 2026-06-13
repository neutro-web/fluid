import { FluidTestUtils } from '../../testing/utils'
import { FluidAccessibilityUtils } from '../../testing/accessibility'
import { ledger } from '../../core/ledger'
import { DISABLED_CONTEXT_KEY } from '../button/index'

// Registers fluid-icon-button — must happen before first test
import './index'

/** Wait N animation frames (default 25 ≈ 400ms at 60fps — enough for bouncy spring) */
function waitFrames(n = 25): Promise<void> {
  return new Promise(resolve => {
    let remaining = n
    function tick() { if (--remaining <= 0) resolve(); else requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
  })
}

/** Minimal SVG icon fixture */
const ICON_SVG = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
  <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2"/>
</svg>`

describe('fluid-icon-button', () => {
  afterEach(() => {
    FluidTestUtils.cleanup()
    FluidTestUtils.restoreTier()
  })

  // ─── aria-label validation ─────────────────────────────────────────────────

  describe('aria-label validation', () => {
    /*
     * When connectedCallback throws, the browser catches it and fires a global
     * 'error' event instead of propagating the throw to JS callers. We use
     * window.__expectFluidError() — a one-shot resolver registered in
     * web-test-runner.config.mjs BEFORE mocha loads — so it fires first and
     * calls stopImmediatePropagation() before mocha's listener can fail the test.
     */
    const expectFluidError: () => Promise<Error> =
      (window as any).__expectFluidError ??
      (() => Promise.reject(new Error('__expectFluidError not available — check testRunnerHtml')))

    it('reports FluidError in dev when aria-label is absent', async () => {
      const errorPromise = expectFluidError()
      await FluidTestUtils.mount(`<fluid-icon-button>${ICON_SVG}</fluid-icon-button>`)
      const err = await errorPromise
      if (!err || err.name !== 'FluidError') {
        throw new Error(`Expected FluidError, got: ${err?.name}`)
      }
    })

    it('reports FluidError in dev when aria-label is empty string', async () => {
      const errorPromise = expectFluidError()
      await FluidTestUtils.mount(`<fluid-icon-button aria-label="">${ICON_SVG}</fluid-icon-button>`)
      const err = await errorPromise
      if (!err || err.name !== 'FluidError') {
        throw new Error(`Expected FluidError, got: ${err?.name}`)
      }
    })

    it('mounts without error when aria-label is provided', async () => {
      const el = await FluidTestUtils.mount(
        `<fluid-icon-button aria-label="Close">${ICON_SVG}</fluid-icon-button>`,
      )
      if (!el.shadowRoot) throw new Error('Expected shadow root')
    })

    it('forwards aria-label to the inner <button>', async () => {
      const el = await FluidTestUtils.mount(
        `<fluid-icon-button aria-label="Delete item">${ICON_SVG}</fluid-icon-button>`,
      )
      const surface = el.shadowRoot!.querySelector('[part="surface"]')!
      if (surface.getAttribute('aria-label') !== 'Delete item') {
        throw new Error(`Expected inner button aria-label="Delete item", got "${surface.getAttribute('aria-label')}"`)
      }
    })

    it('updates forwarded aria-label when host attribute changes', async () => {
      const el = await FluidTestUtils.mount(
        `<fluid-icon-button aria-label="Edit">${ICON_SVG}</fluid-icon-button>`,
      )
      el.setAttribute('aria-label', 'Save')
      const surface = el.shadowRoot!.querySelector('[part="surface"]')!
      if (surface.getAttribute('aria-label') !== 'Save') {
        throw new Error(`Expected updated aria-label="Save", got "${surface.getAttribute('aria-label')}"`)
      }
    })
  })

  // ─── Shadow DOM structure ──────────────────────────────────────────────────

  describe('shadow DOM structure', () => {
    it('renders <button part="surface"> as the interactive root', async () => {
      const el = await FluidTestUtils.mount(
        `<fluid-icon-button aria-label="Close">${ICON_SVG}</fluid-icon-button>`,
      )
      const surface = el.shadowRoot!.querySelector('[part="surface"]')
      if (!surface || surface.tagName !== 'BUTTON') {
        throw new Error('Expected <button part="surface"> in shadow DOM')
      }
    })

    const PARTS = ['icon', 'overlay', 'border']
    for (const part of PARTS) {
      it(`has [part="${part}"] in shadow DOM`, async () => {
        const el = await FluidTestUtils.mount(
          `<fluid-icon-button aria-label="Close">${ICON_SVG}</fluid-icon-button>`,
        )
        if (!el.shadowRoot!.querySelector(`[part="${part}"]`)) {
          throw new Error(`Expected [part="${part}"] in shadow DOM`)
        }
      })
    }

    it('does NOT have [part="label"] or [part="trailing-icon"] (icon-only component)', async () => {
      const el = await FluidTestUtils.mount(
        `<fluid-icon-button aria-label="Close">${ICON_SVG}</fluid-icon-button>`,
      )
      if (el.shadowRoot!.querySelector('[part="label"]')) {
        throw new Error('icon-button must not have [part="label"]')
      }
      if (el.shadowRoot!.querySelector('[part="trailing-icon"]')) {
        throw new Error('icon-button must not have [part="trailing-icon"]')
      }
    })
  })

  // ─── Touch target (WCAG 2.5.5) ────────────────────────────────────────────

  describe('touch target', () => {
    it('has a minimum rendered size of 48×48px (WCAG 2.5.5)', async () => {
      const el = await FluidTestUtils.mount(
        `<fluid-icon-button aria-label="Close" size="sm">${ICON_SVG}</fluid-icon-button>`,
      )
      const rect = el.getBoundingClientRect()
      if (rect.width < 48) {
        throw new Error(`Touch target width must be ≥ 48px, got ${rect.width}px`)
      }
      if (rect.height < 48) {
        throw new Error(`Touch target height must be ≥ 48px, got ${rect.height}px`)
      }
    })

    it('lg size renders larger than 48×48px', async () => {
      const el = await FluidTestUtils.mount(
        `<fluid-icon-button aria-label="Close" size="lg">${ICON_SVG}</fluid-icon-button>`,
      )
      const rect = el.getBoundingClientRect()
      if (rect.width < 48 || rect.height < 48) {
        throw new Error(`lg size must be ≥ 48px, got ${rect.width}×${rect.height}px`)
      }
    })
  })

  // ─── ARIA ──────────────────────────────────────────────────────────────────

  describe('ARIA', () => {
    it('uses native button role — no role override on surface', async () => {
      const el = await FluidTestUtils.mount(
        `<fluid-icon-button aria-label="Close">${ICON_SVG}</fluid-icon-button>`,
      )
      const surface = el.shadowRoot!.querySelector('[part="surface"]')!
      if (surface.getAttribute('role')) {
        throw new Error('Should not override role on native <button>')
      }
    })

    it('sets aria-disabled="true" on surface when disabled', async () => {
      const el = await FluidTestUtils.mount(
        `<fluid-icon-button aria-label="Close" disabled>${ICON_SVG}</fluid-icon-button>`,
      )
      const surface = el.shadowRoot!.querySelector('[part="surface"]')!
      if (surface.getAttribute('aria-disabled') !== 'true') {
        throw new Error('Expected aria-disabled="true" on surface when disabled')
      }
    })

    it('sets aria-busy="true" and aria-disabled="true" on surface when loading', async () => {
      const el = await FluidTestUtils.mount(
        `<fluid-icon-button aria-label="Close" loading>${ICON_SVG}</fluid-icon-button>`,
      )
      const surface = el.shadowRoot!.querySelector('[part="surface"]')!
      if (surface.getAttribute('aria-busy') !== 'true') {
        throw new Error('Expected aria-busy="true" on surface when loading')
      }
      if (surface.getAttribute('aria-disabled') !== 'true') {
        throw new Error('Expected aria-disabled="true" on surface when loading')
      }
    })
  })

  // ─── Events ────────────────────────────────────────────────────────────────

  describe('fluid:activate event', () => {
    it('fires with source="pointer" on pointerdown+pointerup within bounds', async () => {
      const el = await FluidTestUtils.mount(
        `<fluid-icon-button aria-label="Close">${ICON_SVG}</fluid-icon-button>`,
      )
      const surface = el.shadowRoot!.querySelector('[part="surface"]') as HTMLElement
      let detail: Record<string, unknown> | null = null
      el.addEventListener('fluid:activate', e => { detail = (e as CustomEvent).detail })

      const rect = el.getBoundingClientRect()
      const cx = rect.left + (rect.width / 2 || 0)
      const cy = rect.top + (rect.height / 2 || 0)

      surface.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, composed: true, pointerId: 1, clientX: cx, clientY: cy,
      }))
      surface.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true, composed: true, pointerId: 1, clientX: cx, clientY: cy,
      }))

      if (!detail) throw new Error('Expected fluid:activate to fire on pointer press')
      if (detail['source'] !== 'pointer') {
        throw new Error(`Expected source="pointer", got "${detail['source']}"`)
      }
    })

    it('fires with source="keyboard" on Enter keydown', async () => {
      const el = await FluidTestUtils.mount(
        `<fluid-icon-button aria-label="Close">${ICON_SVG}</fluid-icon-button>`,
      )
      const surface = el.shadowRoot!.querySelector('[part="surface"]') as HTMLElement
      let detail: Record<string, unknown> | null = null
      el.addEventListener('fluid:activate', e => { detail = (e as CustomEvent).detail })

      surface.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter', bubbles: true, composed: true,
      }))

      if (!detail) throw new Error('Expected fluid:activate to fire on Enter keydown')
      if (detail['source'] !== 'keyboard') {
        throw new Error(`Expected source="keyboard", got "${detail['source']}"`)
      }
    })

    it('fires with source="keyboard" on Space keyup (not keydown)', async () => {
      const el = await FluidTestUtils.mount(
        `<fluid-icon-button aria-label="Close">${ICON_SVG}</fluid-icon-button>`,
      )
      const surface = el.shadowRoot!.querySelector('[part="surface"]') as HTMLElement
      let activateCount = 0
      let detail: Record<string, unknown> | null = null
      el.addEventListener('fluid:activate', e => {
        activateCount++
        detail = (e as CustomEvent).detail
      })

      surface.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, composed: true }))
      if (activateCount !== 0) throw new Error('fluid:activate must NOT fire on Space keydown')

      surface.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true, composed: true }))
      if (!detail) throw new Error('Expected fluid:activate to fire on Space keyup')
      if (detail['source'] !== 'keyboard') {
        throw new Error(`Expected source="keyboard", got "${detail['source']}"`)
      }
    })

    it('does NOT fire fluid:activate when key event is repeating', async () => {
      const el = await FluidTestUtils.mount(
        `<fluid-icon-button aria-label="Close">${ICON_SVG}</fluid-icon-button>`,
      )
      const surface = el.shadowRoot!.querySelector('[part="surface"]') as HTMLElement
      let fired = false
      el.addEventListener('fluid:activate', () => { fired = true })

      surface.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter', bubbles: true, composed: true, repeat: true,
      }))

      if (fired) throw new Error('fluid:activate must not fire on repeated keydown')
    })

    it('does NOT fire fluid:activate on pointerup outside element bounds', async () => {
      const el = await FluidTestUtils.mount(
        `<fluid-icon-button aria-label="Close">${ICON_SVG}</fluid-icon-button>`,
      )
      const surface = el.shadowRoot!.querySelector('[part="surface"]') as HTMLElement
      let fired = false
      el.addEventListener('fluid:activate', () => { fired = true })

      const rect = el.getBoundingClientRect()
      const cx = rect.left + (rect.width / 2 || 0)
      const cy = rect.top + (rect.height / 2 || 0)

      surface.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, composed: true, pointerId: 1, clientX: cx, clientY: cy,
      }))
      surface.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true, composed: true, pointerId: 1,
        clientX: rect.left - 500, clientY: rect.top - 500,
      }))

      if (fired) throw new Error('fluid:activate must not fire when pointerup is outside the element')
    })

    it('does NOT fire when disabled', async () => {
      const el = await FluidTestUtils.mount(
        `<fluid-icon-button aria-label="Close" disabled>${ICON_SVG}</fluid-icon-button>`,
      )
      const surface = el.shadowRoot!.querySelector('[part="surface"]') as HTMLElement
      let fired = false
      el.addEventListener('fluid:activate', () => { fired = true })

      surface.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      surface.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }))
      surface.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }))

      if (fired) throw new Error('fluid:activate must not fire when disabled')
    })

    it('does NOT fire when loading', async () => {
      const el = await FluidTestUtils.mount(
        `<fluid-icon-button aria-label="Close" loading>${ICON_SVG}</fluid-icon-button>`,
      )
      const surface = el.shadowRoot!.querySelector('[part="surface"]') as HTMLElement
      let fired = false
      el.addEventListener('fluid:activate', () => { fired = true })

      surface.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      surface.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }))
      surface.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }))

      if (fired) throw new Error('fluid:activate must not fire when loading')
    })

    it('multi-touch: only first pointer registers', async () => {
      const el = await FluidTestUtils.mount(
        `<fluid-icon-button aria-label="Close">${ICON_SVG}</fluid-icon-button>`,
      )
      const surface = el.shadowRoot!.querySelector('[part="surface"]') as HTMLElement
      let activateCount = 0
      el.addEventListener('fluid:activate', () => { activateCount++ })

      const rect = el.getBoundingClientRect()
      const cx = rect.left + (rect.width / 2 || 0)
      const cy = rect.top + (rect.height / 2 || 0)

      // First pointer down
      surface.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, composed: true, pointerId: 1, clientX: cx, clientY: cy,
      }))
      // Second pointer down (should be ignored)
      surface.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, composed: true, pointerId: 2, clientX: cx, clientY: cy,
      }))
      // First pointer up
      surface.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true, composed: true, pointerId: 1, clientX: cx, clientY: cy,
      }))

      if (activateCount !== 1) {
        throw new Error(`Expected exactly 1 activate, got ${activateCount}`)
      }
    })
  })

  // ─── Press physics ──────────────────────────────────────────────────────────

  describe('press physics', () => {
    it('applies depress scale ~0.94 after pointerdown', async () => {
      FluidTestUtils.mockTier('crystalline')
      const el = await FluidTestUtils.mount(
        `<fluid-icon-button aria-label="Close">${ICON_SVG}</fluid-icon-button>`,
      )
      const surface = el.shadowRoot!.querySelector('[part="surface"]') as HTMLElement

      const rect = el.getBoundingClientRect()
      const cx = rect.left + (rect.width / 2 || 24)
      const cy = rect.top + (rect.height / 2 || 24)

      surface.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, composed: true, pointerId: 1, clientX: cx, clientY: cy,
      }))

      await waitFrames(25)

      const t = surface.style.transform
      const match = t.match(/scale\(([\d.]+)\)/)
      if (!match) throw new Error(`Expected scale() transform on surface, got: "${t}"`)
      const scale = parseFloat(match[1]!)
      if (Math.abs(scale - 0.94) > 0.01) {
        throw new Error(`Expected depress scale ~0.94, got ${scale}`)
      }
    })

    it('returns to scale ~1.0 after pointerup (bouncy release)', async () => {
      FluidTestUtils.mockTier('crystalline')
      const el = await FluidTestUtils.mount(
        `<fluid-icon-button aria-label="Close">${ICON_SVG}</fluid-icon-button>`,
      )
      const surface = el.shadowRoot!.querySelector('[part="surface"]') as HTMLElement

      const rect = el.getBoundingClientRect()
      const cx = rect.left + (rect.width / 2 || 24)
      const cy = rect.top + (rect.height / 2 || 24)

      surface.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, composed: true, pointerId: 1, clientX: cx, clientY: cy,
      }))
      await waitFrames(15)
      surface.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true, composed: true, pointerId: 1, clientX: cx, clientY: cy,
      }))
      await waitFrames(40)

      const t = surface.style.transform
      if (t !== '' && t !== 'none') {
        const match = t.match(/scale\(([\d.]+)\)/)
        if (match) {
          const scale = parseFloat(match[1]!)
          if (Math.abs(scale - 1.0) > 0.02) {
            throw new Error(`Expected scale ~1.0 after release, got ${scale}`)
          }
        }
      }
    })
  })

  // ─── FluidRipple gating ─────────────────────────────────────────────────────

  describe('FluidRipple gating', () => {
    it('does NOT create a <canvas> at matte tier', async () => {
      FluidTestUtils.mockTier('matte')
      const el = await FluidTestUtils.mount(
        `<fluid-icon-button aria-label="Close">${ICON_SVG}</fluid-icon-button>`,
      )
      if (el.shadowRoot!.querySelector('canvas')) {
        throw new Error('<canvas> must not be created at matte tier')
      }
    })

    it('creates a <canvas> at frosted tier', async () => {
      FluidTestUtils.mockTier('frosted')
      const el = await FluidTestUtils.mount(
        `<fluid-icon-button aria-label="Close">${ICON_SVG}</fluid-icon-button>`,
      )
      if (!el.shadowRoot!.querySelector('canvas')) {
        throw new Error('Expected <canvas> to be created at frosted tier')
      }
    })

    it('does NOT create a <canvas> when deviceMemoryLow', async () => {
      FluidTestUtils.mockTier('frosted')
      const orig = ledger.deviceMemoryLow
      ledger.deviceMemoryLow = true
      try {
        const el = await FluidTestUtils.mount(
          `<fluid-icon-button aria-label="Close">${ICON_SVG}</fluid-icon-button>`,
        )
        if (el.shadowRoot!.querySelector('canvas')) {
          throw new Error('<canvas> must not be created when deviceMemoryLow')
        }
      } finally {
        ledger.deviceMemoryLow = orig
      }
    })
  })

  // ─── Loading state ──────────────────────────────────────────────────────────

  describe('loading state', () => {
    it('blocks pointer interaction when loading', async () => {
      const el = await FluidTestUtils.mount(
        `<fluid-icon-button aria-label="Close" loading>${ICON_SVG}</fluid-icon-button>`,
      )
      const surface = el.shadowRoot!.querySelector('[part="surface"]') as HTMLElement
      let fired = false
      el.addEventListener('fluid:activate', () => { fired = true })

      surface.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }))
      surface.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }))

      if (fired) throw new Error('Interaction must be blocked while loading')
    })

    it('has aria-busy="true" and shows loading ring while loading', async () => {
      const el = await FluidTestUtils.mount(
        `<fluid-icon-button aria-label="Close" loading>${ICON_SVG}</fluid-icon-button>`,
      )
      const surface = el.shadowRoot!.querySelector('[part="surface"]')!
      if (surface.getAttribute('aria-busy') !== 'true') {
        throw new Error('Expected aria-busy="true" when loading')
      }
      const spinner = el.shadowRoot!.querySelector('.fluid-loading-ring')
      if (!spinner) throw new Error('Expected .fluid-loading-ring to exist while loading')
      if (spinner.getAttribute('aria-hidden') !== 'true') {
        throw new Error('Loading ring must carry aria-hidden="true"')
      }
    })
  })

  // ─── Attribute reflection ───────────────────────────────────────────────────

  describe('attribute reflection', () => {
    it('reflects variant from attribute', async () => {
      const el = await FluidTestUtils.mount(
        `<fluid-icon-button aria-label="Close" variant="primary">${ICON_SVG}</fluid-icon-button>`,
      )
      if ((el as any).variant !== 'primary') {
        throw new Error(`Expected variant="primary", got "${(el as any).variant}"`)
      }
    })

    it('defaults variant to "secondary" when absent', async () => {
      const el = await FluidTestUtils.mount(
        `<fluid-icon-button aria-label="Close">${ICON_SVG}</fluid-icon-button>`,
      )
      if ((el as any).variant !== 'secondary') {
        throw new Error(`Expected default variant="secondary", got "${(el as any).variant}"`)
      }
    })

    it('reflects size from attribute', async () => {
      const el = await FluidTestUtils.mount(
        `<fluid-icon-button aria-label="Close" size="lg">${ICON_SVG}</fluid-icon-button>`,
      )
      if ((el as any).size !== 'lg') {
        throw new Error(`Expected size="lg", got "${(el as any).size}"`)
      }
    })

    it('reflects disabled as boolean', async () => {
      const el = await FluidTestUtils.mount(
        `<fluid-icon-button aria-label="Close" disabled>${ICON_SVG}</fluid-icon-button>`,
      )
      if (!(el as any).disabled) throw new Error('Expected disabled to be true')
    })

    it('reflects loading as boolean', async () => {
      const el = await FluidTestUtils.mount(
        `<fluid-icon-button aria-label="Close" loading>${ICON_SVG}</fluid-icon-button>`,
      )
      if (!(el as any).loading) throw new Error('Expected loading to be true')
    })
  })

  // ─── Tier rendering ─────────────────────────────────────────────────────────

  describe('renders without error at all four tiers', () => {
    const TIERS = ['matte', 'frosted', 'crystalline', 'optical'] as const
    for (const tier of TIERS) {
      it(`renders at ${tier} tier`, async () => {
        FluidTestUtils.mockTier(tier)
        const el = await FluidTestUtils.mount(
          `<fluid-icon-button aria-label="Close">${ICON_SVG}</fluid-icon-button>`,
        )
        if (!el.shadowRoot) throw new Error(`No shadow root at tier: ${tier}`)
        const surface = el.shadowRoot.querySelector('[part="surface"]')
        if (!surface) throw new Error(`No surface at tier: ${tier}`)
      })
    }
  })

  // ─── Cleanup / no leaks ─────────────────────────────────────────────────────

  describe('cleanup', () => {
    it('removes ripple canvas from shadow root on disconnect', async () => {
      FluidTestUtils.mockTier('frosted')
      const el = await FluidTestUtils.mount(
        `<fluid-icon-button aria-label="Close">${ICON_SVG}</fluid-icon-button>`,
      )
      if (!el.shadowRoot!.querySelector('canvas')) {
        throw new Error('Precondition: expected canvas at frosted tier')
      }
      el.remove()
      if (el.shadowRoot!.querySelector('canvas')) {
        throw new Error('Expected canvas to be removed after disconnect')
      }
    })
  })

  // ─── Fieldset disabled context ──────────────────────────────────────────────

  describe('fieldset disabled context', () => {
    it('blocks activation when context signals disabled', async () => {
      const wrapper = document.createElement('div')
      document.body.appendChild(wrapper)

      wrapper.addEventListener('fluid:context-request', (e: Event) => {
        const ce = e as CustomEvent<{ contextKey: string; callback: (v: boolean) => void }>
        if (ce.detail.contextKey === DISABLED_CONTEXT_KEY) {
          ce.detail.callback(true)
          e.stopPropagation()
        }
      })

      wrapper.innerHTML = `<fluid-icon-button aria-label="Close">${ICON_SVG}</fluid-icon-button>`
      const el = wrapper.querySelector('fluid-icon-button') as Element
      await Promise.resolve()

      const surface = el.shadowRoot!.querySelector('[part="surface"]') as HTMLElement
      let fired = false
      el.addEventListener('fluid:activate', () => { fired = true })

      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2

      surface.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, composed: true, pointerId: 1, clientX: cx, clientY: cy,
      }))
      surface.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true, composed: true, pointerId: 1, clientX: cx, clientY: cy,
      }))

      wrapper.remove()

      if (fired) throw new Error('Expected activation to be blocked when context provides disabled=true')
    })
  })

  // ─── Empty slot dev warning ─────────────────────────────────────────────────

  describe('empty slot dev warning', () => {
    it('warns in dev when no icon is slotted', async () => {
      const warnMessages: string[] = []
      const origWarn = console.warn
      console.warn = (...args: unknown[]) => {
        warnMessages.push(String(args[0]))
        origWarn.apply(console, args)
      }

      await FluidTestUtils.mount(`<fluid-icon-button aria-label="Close"></fluid-icon-button>`)
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))

      console.warn = origWarn

      if (!warnMessages.some(m => m.includes('default slot'))) {
        throw new Error('Expected dev warning about empty default slot')
      }
    })
  })

  // ─── pointercancel ──────────────────────────────────────────────────────────

  describe('pointercancel', () => {
    it('releases press state and does not fire fluid:activate on pointercancel', async () => {
      FluidTestUtils.mockTier('crystalline')
      const el = await FluidTestUtils.mount(
        `<fluid-icon-button aria-label="Close">${ICON_SVG}</fluid-icon-button>`,
      )
      const surface = el.shadowRoot!.querySelector('[part="surface"]') as HTMLElement
      let fired = false
      el.addEventListener('fluid:activate', () => { fired = true })

      const rect = el.getBoundingClientRect()
      const cx = rect.left + (rect.width / 2 || 24)
      const cy = rect.top + (rect.height / 2 || 24)

      surface.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, composed: true, pointerId: 1, clientX: cx, clientY: cy,
      }))
      await waitFrames(10)
      surface.dispatchEvent(new PointerEvent('pointercancel', {
        bubbles: true, composed: true, pointerId: 1,
      }))
      await waitFrames(30)

      if (fired) throw new Error('fluid:activate must not fire after pointercancel')

      const t = surface.style.transform
      if (t && t !== 'none') {
        const match = t.match(/scale\(([\d.]+)\)/)
        if (match && Math.abs(parseFloat(match[1]!) - 1.0) > 0.02) {
          throw new Error(`Expected scale near 1.0 after pointercancel, got ${match[1]}`)
        }
      }
    })
  })

  // ─── Loading → idle restore ─────────────────────────────────────────────────

  describe('loading → idle transition', () => {
    it('removes aria-busy and spinner when loading attribute is removed', async () => {
      const el = await FluidTestUtils.mount(
        `<fluid-icon-button aria-label="Close" loading>${ICON_SVG}</fluid-icon-button>`,
      )
      const surface = el.shadowRoot!.querySelector('[part="surface"]')!

      if (surface.getAttribute('aria-busy') !== 'true') {
        throw new Error('Precondition: expected aria-busy="true" while loading')
      }
      if (!el.shadowRoot!.querySelector('.fluid-loading-ring')) {
        throw new Error('Precondition: expected spinner while loading')
      }

      el.removeAttribute('loading')

      if (surface.getAttribute('aria-busy')) {
        throw new Error('Expected aria-busy to be absent after loading stops')
      }
      if (el.shadowRoot!.querySelector('.fluid-loading-ring')) {
        throw new Error('Expected spinner to be removed after loading stops')
      }
      if (surface.getAttribute('aria-disabled')) {
        throw new Error('Expected aria-disabled to be absent after loading stops on a non-disabled button')
      }
    })
  })

  // ─── Accessibility (axe-core) ───────────────────────────────────────────────

  describe('accessibility', () => {
    it('passes axe in default state', async () => {
      const el = await FluidTestUtils.mount(
        `<fluid-icon-button aria-label="Close">${ICON_SVG}</fluid-icon-button>`,
      )
      await FluidAccessibilityUtils.assertAccessible(el)
    })

    it('passes axe in disabled state', async () => {
      const el = await FluidTestUtils.mount(
        `<fluid-icon-button aria-label="Close" disabled>${ICON_SVG}</fluid-icon-button>`,
      )
      await FluidAccessibilityUtils.assertAccessible(el)
    })

    it('passes axe in loading state', async () => {
      const el = await FluidTestUtils.mount(
        `<fluid-icon-button aria-label="Close" loading>${ICON_SVG}</fluid-icon-button>`,
      )
      await FluidAccessibilityUtils.assertAccessible(el)
    })

    it('passes axe for all variants', async () => {
      const VARIANTS = ['primary', 'secondary', 'ghost'] as const
      for (const variant of VARIANTS) {
        const el = await FluidTestUtils.mount(
          `<fluid-icon-button aria-label="Close" variant="${variant}">${ICON_SVG}</fluid-icon-button>`,
        )
        await FluidAccessibilityUtils.assertAccessible(el)
        FluidTestUtils.cleanup()
      }
    })
  })
})
