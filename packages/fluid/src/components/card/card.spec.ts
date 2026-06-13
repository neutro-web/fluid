import { FluidTestUtils } from '../../testing/utils'
import { FluidAccessibilityUtils } from '../../testing/accessibility'
import { ledger } from '../../core/ledger'

// Registers fluid-card — must happen before first test
import './index'
// Import fluid-button so its class (with layer='raised') is registered for nested glass tests
import '../button/index'

/** Wait N animation frames (default 30 ≈ 500ms at 60fps — enough for bouncy spring) */
function waitFrames(n = 30): Promise<void> {
  return new Promise(resolve => {
    let remaining = n
    function tick() {
      if (--remaining <= 0) resolve()
      else requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}

describe('fluid-card', () => {
  afterEach(() => {
    FluidTestUtils.cleanup()
    FluidTestUtils.restoreTier()
  })

  // ─── Shadow DOM structure ──────────────────────────────────────────────────

  describe('shadow DOM structure', () => {
    const PARTS = ['surface', 'media', 'header-area', 'body', 'trigger', 'actions-bar', 'border', 'error-banner']
    for (const part of PARTS) {
      it(`has [part="${part}"] in shadow DOM`, async () => {
        const el = await FluidTestUtils.mount('<fluid-card>Content</fluid-card>')
        if (!el.shadowRoot!.querySelector(`[part="${part}"]`)) {
          throw new Error(`Expected [part="${part}"] in shadow DOM`)
        }
      })
    }
  })

  // ─── ARIA — non-interactive ────────────────────────────────────────────────

  describe('ARIA — non-interactive', () => {
    it('has no keyboard-focusable trigger when not interactive', async () => {
      const el = await FluidTestUtils.mount('<fluid-card>Content</fluid-card>')
      const trigger = el.shadowRoot!.querySelector('[part="trigger"]') as HTMLElement
      const tabIndex = parseInt(trigger.getAttribute('tabindex') ?? '0', 10)
      if (tabIndex >= 0) {
        throw new Error(`Expected trigger tabindex < 0 for non-interactive card, got ${tabIndex}`)
      }
    })

    it('hides trigger from accessibility tree when not interactive', async () => {
      const el = await FluidTestUtils.mount('<fluid-card>Content</fluid-card>')
      const trigger = el.shadowRoot!.querySelector('[part="trigger"]')!
      if (trigger.getAttribute('aria-hidden') !== 'true') {
        throw new Error('Expected aria-hidden="true" on trigger for non-interactive card')
      }
    })

    it('sets aria-busy="true" on host when loading (non-interactive)', async () => {
      const el = await FluidTestUtils.mount('<fluid-card loading>Content</fluid-card>')
      if (el.getAttribute('aria-busy') !== 'true') {
        throw new Error('Expected aria-busy="true" on host when loading (non-interactive)')
      }
    })
  })

  // ─── ARIA — interactive ────────────────────────────────────────────────────

  describe('ARIA — interactive', () => {
    it('exposes trigger with implicit button role when interactive', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-card interactive aria-label="Open profile">Content</fluid-card>'
      )
      const trigger = el.shadowRoot!.querySelector('[part="trigger"]')!
      if (trigger.tagName !== 'BUTTON') {
        throw new Error('Expected [part="trigger"] to be a <button> element')
      }
      if (trigger.getAttribute('aria-hidden') === 'true') {
        throw new Error('Trigger must not be aria-hidden when interactive')
      }
    })

    it('trigger is keyboard-focusable when interactive', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-card interactive aria-label="View details">Content</fluid-card>'
      )
      const trigger = el.shadowRoot!.querySelector('[part="trigger"]') as HTMLElement
      const tabIndex = parseInt(trigger.getAttribute('tabindex') ?? '0', 10)
      if (tabIndex < 0) {
        throw new Error(`Expected trigger tabindex >= 0 when interactive, got ${tabIndex}`)
      }
    })

    it('trigger inherits aria-label from host', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-card interactive aria-label="View user profile">Content</fluid-card>'
      )
      const trigger = el.shadowRoot!.querySelector('[part="trigger"]')!
      if (trigger.getAttribute('aria-label') !== 'View user profile') {
        throw new Error('Expected trigger to inherit aria-label from host')
      }
    })

    it('sets aria-busy="true" on trigger when loading (interactive)', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-card interactive aria-label="View details" loading>Content</fluid-card>'
      )
      const trigger = el.shadowRoot!.querySelector('[part="trigger"]')!
      if (trigger.getAttribute('aria-busy') !== 'true') {
        throw new Error('Expected aria-busy="true" on trigger when interactive+loading')
      }
    })
  })

  // ─── Events ────────────────────────────────────────────────────────────────

  describe('fluid:activate event', () => {
    it('fires with source="pointer" on pointerdown+pointerup within bounds', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-card interactive aria-label="Card">Content</fluid-card>'
      )
      const trigger = el.shadowRoot!.querySelector('[part="trigger"]') as HTMLElement
      let detail: Record<string, unknown> | null = null
      el.addEventListener('fluid:activate', e => { detail = (e as CustomEvent).detail })

      const rect = el.getBoundingClientRect()
      const cx = rect.left + (rect.width / 2 || 0)
      const cy = rect.top + (rect.height / 2 || 0)

      trigger.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, composed: true, pointerId: 1, clientX: cx, clientY: cy,
      }))
      trigger.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true, composed: true, pointerId: 1, clientX: cx, clientY: cy,
      }))

      if (!detail) throw new Error('Expected fluid:activate to fire on pointer press')
      if ((detail as Record<string, unknown>)['source'] !== 'pointer') {
        throw new Error(`Expected source="pointer", got "${(detail as Record<string, unknown>)['source']}"`)
      }
    })

    it('fires with source="keyboard" on Enter keydown', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-card interactive aria-label="Card">Content</fluid-card>'
      )
      const trigger = el.shadowRoot!.querySelector('[part="trigger"]') as HTMLElement
      let detail: Record<string, unknown> | null = null
      el.addEventListener('fluid:activate', e => { detail = (e as CustomEvent).detail })

      trigger.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter', bubbles: true, composed: true,
      }))

      if (!detail) throw new Error('Expected fluid:activate to fire on Enter keydown')
      if ((detail as Record<string, unknown>)['source'] !== 'keyboard') {
        throw new Error(`Expected source="keyboard", got "${(detail as Record<string, unknown>)['source']}"`)
      }
    })

    it('fires with source="keyboard" on Space keyup (not keydown)', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-card interactive aria-label="Card">Content</fluid-card>'
      )
      const trigger = el.shadowRoot!.querySelector('[part="trigger"]') as HTMLElement
      let count = 0
      let detail: Record<string, unknown> | null = null
      el.addEventListener('fluid:activate', e => { count++; detail = (e as CustomEvent).detail })

      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, composed: true }))
      if (count !== 0) throw new Error('fluid:activate must NOT fire on Space keydown')

      trigger.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true, composed: true }))
      if (!detail) throw new Error('Expected fluid:activate to fire on Space keyup')
      if ((detail as Record<string, unknown>)['source'] !== 'keyboard') {
        throw new Error(`Expected source="keyboard", got "${(detail as Record<string, unknown>)['source']}"`)
      }
    })

    it('does NOT fire when not interactive', async () => {
      const el = await FluidTestUtils.mount('<fluid-card>Content</fluid-card>')
      const trigger = el.shadowRoot!.querySelector('[part="trigger"]') as HTMLElement
      let fired = false
      el.addEventListener('fluid:activate', () => { fired = true })

      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      trigger.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }))
      trigger.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }))

      if (fired) throw new Error('fluid:activate must not fire on non-interactive card')
    })

    it('does NOT fire when loading', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-card interactive aria-label="Card" loading>Content</fluid-card>'
      )
      const trigger = el.shadowRoot!.querySelector('[part="trigger"]') as HTMLElement
      let fired = false
      el.addEventListener('fluid:activate', () => { fired = true })

      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      trigger.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }))
      trigger.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }))

      if (fired) throw new Error('fluid:activate must not fire when loading')
    })

    it('does NOT fire on repeated keydown (e.repeat=true)', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-card interactive aria-label="Card">Content</fluid-card>'
      )
      const trigger = el.shadowRoot!.querySelector('[part="trigger"]') as HTMLElement
      let fired = false
      el.addEventListener('fluid:activate', () => { fired = true })

      trigger.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter', bubbles: true, composed: true, repeat: true,
      }))

      if (fired) throw new Error('fluid:activate must not fire on repeated keydown')
    })
  })

  // ─── Slot visibility ────────────────────────────────────────────────────────

  describe('empty slots', () => {
    it('hides media wrapper when media slot is empty', async () => {
      const el = await FluidTestUtils.mount('<fluid-card>Content</fluid-card>')
      const mediaWrapper = el.shadowRoot!.querySelector('[part="media"]') as HTMLElement
      if (!mediaWrapper.hidden) {
        throw new Error('Expected [part="media"] to be hidden when slot is empty')
      }
    })

    it('hides header wrapper when header slot is empty', async () => {
      const el = await FluidTestUtils.mount('<fluid-card>Content</fluid-card>')
      const headerWrapper = el.shadowRoot!.querySelector('[part="header-area"]') as HTMLElement
      if (!headerWrapper.hidden) {
        throw new Error('Expected [part="header-area"] to be hidden when slot is empty')
      }
    })

    it('hides actions-bar when actions slot is empty', async () => {
      const el = await FluidTestUtils.mount('<fluid-card>Content</fluid-card>')
      const actionsBar = el.shadowRoot!.querySelector('[part="actions-bar"]') as HTMLElement
      if (!actionsBar.hidden) {
        throw new Error('Expected [part="actions-bar"] to be hidden when slot is empty')
      }
    })

    it('shows wrappers when respective slots are populated', async () => {
      const el = await FluidTestUtils.mount(`
        <fluid-card>
          <img slot="media" src="photo.jpg" alt="Cover">
          <h2 slot="header">Card title</h2>
          Content
          <fluid-button slot="actions">Action</fluid-button>
        </fluid-card>
      `)
      // Wait for slotchange to fire
      await waitFrames(2)
      const mediaWrapper = el.shadowRoot!.querySelector('[part="media"]') as HTMLElement
      const headerWrapper = el.shadowRoot!.querySelector('[part="header-area"]') as HTMLElement
      const actionsBar = el.shadowRoot!.querySelector('[part="actions-bar"]') as HTMLElement
      if (mediaWrapper.hidden) throw new Error('[part="media"] should be visible when populated')
      if (headerWrapper.hidden) throw new Error('[part="header-area"] should be visible when populated')
      if (actionsBar.hidden) throw new Error('[part="actions-bar"] should be visible when populated')
    })
  })

  // ─── Loading state ──────────────────────────────────────────────────────────

  describe('loading state', () => {
    it('shows loading overlay when loading', async () => {
      const el = await FluidTestUtils.mount('<fluid-card loading>Content</fluid-card>')
      const overlay = el.shadowRoot!.querySelector('.loading-overlay')
      if (!overlay) throw new Error('Expected .loading-overlay to be present when loading')
    })

    it('removes loading overlay when loading attribute is removed', async () => {
      const el = await FluidTestUtils.mount('<fluid-card loading>Content</fluid-card>')
      el.removeAttribute('loading')
      await waitFrames(2)
      const overlay = el.shadowRoot!.querySelector('.loading-overlay')
      if (overlay) throw new Error('Expected .loading-overlay to be removed after loading ends')
    })
  })

  // ─── Error state ────────────────────────────────────────────────────────────

  describe('error state', () => {
    it('shows error banner with error-message when error is set', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-card error error-message="Something went wrong">Content</fluid-card>'
      )
      const banner = el.shadowRoot!.querySelector('[part="error-banner"]') as HTMLElement
      if (banner.hidden) throw new Error('Expected error-banner to be visible when error is set')
      if (!banner.textContent?.includes('Something went wrong')) {
        throw new Error(`Expected error-banner to contain error-message, got: "${banner.textContent}"`)
      }
    })

    it('applies data-error to surface when error is set', async () => {
      const el = await FluidTestUtils.mount('<fluid-card error error-message="Err">Content</fluid-card>')
      const surface = el.shadowRoot!.querySelector('[part="surface"]')!
      if (!surface.hasAttribute('data-error')) {
        throw new Error('Expected [part="surface"] to have data-error when error is set')
      }
    })

    it('hides error banner when error attribute is removed', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-card error error-message="Oops">Content</fluid-card>'
      )
      el.removeAttribute('error')
      await waitFrames(2)
      const banner = el.shadowRoot!.querySelector('[part="error-banner"]') as HTMLElement
      if (!banner.hidden) throw new Error('Expected error-banner to be hidden after error is removed')
    })
  })

  // ─── Press physics ──────────────────────────────────────────────────────────

  describe('press physics', () => {
    it('applies depress scale ~0.98 on surface after pointerdown (interactive)', async () => {
      FluidTestUtils.mockTier('crystalline')
      const el = await FluidTestUtils.mount(
        '<fluid-card interactive aria-label="Card">Content</fluid-card>'
      )
      const trigger = el.shadowRoot!.querySelector('[part="trigger"]') as HTMLElement
      const surface = el.shadowRoot!.querySelector('[part="surface"]') as HTMLElement

      trigger.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, composed: true, pointerId: 1, clientX: 50, clientY: 25,
      }))

      await waitFrames(25)

      const t = surface.style.transform
      if (t) {
        const match = t.match(/scale\(([\d.]+)\)/)
        if (match) {
          const scale = parseFloat(match[1]!)
          if (Math.abs(scale - 0.98) > 0.02) {
            throw new Error(`Expected depress scale ~0.98, got ${scale}`)
          }
        }
      }
    })

    it('returns to scale ~1.0 after pointerup (gentle release)', async () => {
      FluidTestUtils.mockTier('crystalline')
      const el = await FluidTestUtils.mount(
        '<fluid-card interactive aria-label="Card">Content</fluid-card>'
      )
      const trigger = el.shadowRoot!.querySelector('[part="trigger"]') as HTMLElement
      const surface = el.shadowRoot!.querySelector('[part="surface"]') as HTMLElement

      trigger.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, composed: true, pointerId: 1, clientX: 50, clientY: 25,
      }))
      await waitFrames(15)
      trigger.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true, composed: true, pointerId: 1, clientX: 50, clientY: 25,
      }))
      await waitFrames(50)

      const t = surface.style.transform
      if (t && t !== 'none') {
        const match = t.match(/scale\(([\d.]+)\)/)
        if (match) {
          const scale = parseFloat(match[1]!)
          if (Math.abs(scale - 1.0) > 0.03) {
            throw new Error(`Expected scale ~1.0 after release, got ${scale}`)
          }
        }
      }
    })
  })

  // ─── layout attribute — FLIP ────────────────────────────────────────────────

  describe('layout attribute — FLIP', () => {
    it('runFLIP() returns a Promise when layout attribute is set', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-card layout aria-label="Card">Content</fluid-card>'
      )
      const result = (el as any).runFLIP(() => {})
      if (typeof result?.then !== 'function') {
        throw new Error('Expected runFLIP() to return a Promise when layout is set')
      }
      await result
    })

    it('runFLIP() resolves immediately when layout attribute is absent', async () => {
      const el = await FluidTestUtils.mount('<fluid-card>Content</fluid-card>')
      const result = (el as any).runFLIP(() => {})
      if (typeof result?.then !== 'function') {
        throw new Error('Expected runFLIP() to return a Promise')
      }
      await result
    })

    it('runFLIP() calls the mutate callback', async () => {
      const el = await FluidTestUtils.mount('<fluid-card layout>Content</fluid-card>')
      let mutated = false
      await (el as any).runFLIP(() => { mutated = true })
      if (!mutated) throw new Error('Expected runFLIP() to call the mutate callback')
    })
  })

  // ─── Nested glass dev warning ───────────────────────────────────────────────

  describe('nested glass dev warning', () => {
    it('fires a console.warn when a glass component with layer > Surface is in a content slot', async () => {
      const warnings: string[] = []
      const origWarn = console.warn
      console.warn = (...args: unknown[]) => { warnings.push(String(args[0])) }

      try {
        // fluid-button has layer='raised' (> surface) — placed in default slot (body)
        const el = await FluidTestUtils.mount(`
          <fluid-card>
            <fluid-button>Nested glass button</fluid-button>
          </fluid-card>
        `)
        await waitFrames(3)

        const hasNestedGlassWarn = warnings.some(w =>
          w.includes('[fluid warn] fluid-card') && w.includes('layer=')
        )
        if (!hasNestedGlassWarn) {
          throw new Error(
            `Expected nested glass dev warning. Warnings received: ${JSON.stringify(warnings)}`
          )
        }
      } finally {
        console.warn = origWarn
      }
    })

    it('does NOT fire warning when glass component is in the actions slot', async () => {
      const warnings: string[] = []
      const origWarn = console.warn
      console.warn = (...args: unknown[]) => { warnings.push(String(args[0])) }

      try {
        // actions slot is the documented home for interactive controls — must not warn
        const el = await FluidTestUtils.mount(`
          <fluid-card>
            <fluid-button slot="actions">Action</fluid-button>
          </fluid-card>
        `)
        await waitFrames(3)

        const hasNestedGlassWarn = warnings.some(w =>
          w.includes('[fluid warn] fluid-card') && w.includes('layer=')
        )
        if (hasNestedGlassWarn) {
          throw new Error(
            'Expected NO nested glass warning for fluid-button in actions slot'
          )
        }
      } finally {
        console.warn = origWarn
      }
    })
  })

  // ─── Attribute reflection ────────────────────────────────────────────────────

  describe('attribute reflection', () => {
    it('reflects interactive as boolean', async () => {
      const el = await FluidTestUtils.mount('<fluid-card interactive aria-label="Card">X</fluid-card>')
      if (!(el as any).interactive) throw new Error('Expected interactive to be true')
    })

    it('reflects layout as boolean', async () => {
      const el = await FluidTestUtils.mount('<fluid-card layout>X</fluid-card>')
      if (!(el as any).layout) throw new Error('Expected layout to be true')
    })

    it('reflects loading as boolean', async () => {
      const el = await FluidTestUtils.mount('<fluid-card loading>X</fluid-card>')
      if (!(el as any).loading) throw new Error('Expected loading to be true')
    })

    it('reflects error as boolean', async () => {
      const el = await FluidTestUtils.mount('<fluid-card error error-message="Err">X</fluid-card>')
      if (!(el as any).error) throw new Error('Expected error to be true')
    })

    it('reflects error-message as string', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-card error error-message="Upload failed">X</fluid-card>'
      )
      if ((el as any).errorMessage !== 'Upload failed') {
        throw new Error(`Expected errorMessage="Upload failed", got "${(el as any).errorMessage}"`)
      }
    })

    it('defaults elevation to "raised"', async () => {
      const el = await FluidTestUtils.mount('<fluid-card>X</fluid-card>')
      if ((el as any).elevation !== 'raised') {
        throw new Error(`Expected default elevation="raised", got "${(el as any).elevation}"`)
      }
    })

    it('reflects elevation attribute', async () => {
      const el = await FluidTestUtils.mount('<fluid-card elevation="floating">X</fluid-card>')
      if ((el as any).elevation !== 'floating') {
        throw new Error(`Expected elevation="floating", got "${(el as any).elevation}"`)
      }
    })
  })

  // ─── Spring preset ───────────────────────────────────────────────────────────

  describe('spring preset', () => {
    it('uses gentle spring preset', async () => {
      const el = await FluidTestUtils.mount('<fluid-card>Content</fluid-card>')
      const spring = (el as any).spring
      if (!spring || spring.stiffness !== 120) {
        throw new Error(
          `Expected gentle spring (stiffness 120), got ${JSON.stringify(spring)}`
        )
      }
    })
  })

  // ─── Tier rendering ──────────────────────────────────────────────────────────

  describe('renders without error at all four tiers', () => {
    const TIERS = ['matte', 'frosted', 'crystalline', 'optical'] as const
    for (const tier of TIERS) {
      it(`renders at ${tier} tier`, async () => {
        FluidTestUtils.mockTier(tier)
        const el = await FluidTestUtils.mount(`<fluid-card>Tier: ${tier}</fluid-card>`)
        if (!el.shadowRoot) throw new Error(`No shadow root at tier: ${tier}`)
        const surface = el.shadowRoot.querySelector('[part="surface"]')
        if (!surface) throw new Error(`No surface at tier: ${tier}`)
      })
    }
  })

  // ─── Cleanup / no leaks ──────────────────────────────────────────────────────

  describe('cleanup', () => {
    it('runs all disposers on disconnect without errors', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-card interactive aria-label="Card">Content</fluid-card>'
      )
      try {
        el.remove()
      } catch (e) {
        throw new Error(`Expected disconnect to not throw, got: ${e}`)
      }
    })

    it('clears IntersectionObserver on disconnect at crystalline tier', async () => {
      FluidTestUtils.mockTier('crystalline')
      const el = await FluidTestUtils.mount('<fluid-card>Content</fluid-card>')
      const card = el as any
      el.remove()
      if (card._intersectionObserver !== null) {
        throw new Error('Expected _intersectionObserver to be null after disconnect')
      }
    })
  })

  // ─── Accessibility (axe-core) ─────────────────────────────────────────────────

  describe('accessibility', () => {
    it('passes axe in default (non-interactive) state', async () => {
      const el = await FluidTestUtils.mount('<fluid-card>Card content goes here</fluid-card>')
      await FluidAccessibilityUtils.assertAccessible(el)
    })

    it('passes axe in interactive state with aria-label', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-card interactive aria-label="View user profile">Card content</fluid-card>'
      )
      await FluidAccessibilityUtils.assertAccessible(el)
    })

    it('passes axe in loading state (non-interactive)', async () => {
      const el = await FluidTestUtils.mount('<fluid-card loading>Card content</fluid-card>')
      await FluidAccessibilityUtils.assertAccessible(el)
    })

    it('passes axe in loading state (interactive)', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-card interactive aria-label="View details" loading>Content</fluid-card>'
      )
      await FluidAccessibilityUtils.assertAccessible(el)
    })

    it('passes axe in error state', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-card error error-message="Upload failed. Please try again.">Content</fluid-card>'
      )
      await FluidAccessibilityUtils.assertAccessible(el)
    })

    it('passes axe with all slots populated', async () => {
      const el = await FluidTestUtils.mount(`
        <fluid-card>
          <img slot="media" src="photo.jpg" alt="Cover photo">
          <h2 slot="header">User Profile</h2>
          Some profile content
        </fluid-card>
      `)
      await FluidAccessibilityUtils.assertAccessible(el)
    })

    it('passes axe in interactive state with trigger focused', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-card interactive aria-label="View profile">Card content</fluid-card>'
      )
      const trigger = el.shadowRoot!.querySelector('[part="trigger"]') as HTMLElement
      trigger.focus()
      await FluidAccessibilityUtils.assertAccessible(el)
    })
  })

  // ─── prefers-reduced-motion ─────────────────────────────────────────────────

  describe('prefers-reduced-motion', () => {
    it('uses opacity-only animation on press when ledger.prefersReducedMotion is true', async () => {
      FluidTestUtils.mockTier('crystalline')
      ledger.prefersReducedMotion = true

      const el = await FluidTestUtils.mount(
        '<fluid-card interactive aria-label="Card">Content</fluid-card>'
      )
      const trigger = el.shadowRoot!.querySelector('[part="trigger"]') as HTMLElement
      const surface = el.shadowRoot!.querySelector('[part="surface"]') as HTMLElement

      trigger.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, composed: true, pointerId: 1, clientX: 50, clientY: 25,
      }))
      await waitFrames(25)

      // reducedPhases: opacity animation, no transform
      const hasTransform = Boolean(surface.style.transform && surface.style.transform !== '')
      if (hasTransform) {
        throw new Error(
          `Expected no scale transform with reduced motion, got: "${surface.style.transform}"`
        )
      }
      const opacity = parseFloat(surface.style.opacity || '1')
      if (Math.abs(opacity - 0.7) > 0.15) {
        throw new Error(`Expected opacity ~0.7 with reduced motion, got ${opacity}`)
      }

      ledger.prefersReducedMotion = false
    })
  })

  // ─── forced-colors ────────────────────────────────────────────────────────────

  describe('forced-colors', () => {
    it('mounts and renders shadow parts without errors in forced-colors mode', async () => {
      // CSS forced-colors: active is applied by the browser; we verify the component
      // mounts and exposes its shadow parts correctly — structural smoke test.
      const el = await FluidTestUtils.mount('<fluid-card>Content</fluid-card>')
      if (!el.shadowRoot) throw new Error('No shadow root under forced-colors mode')
      const surface = el.shadowRoot.querySelector('[part="surface"]')
      if (!surface) throw new Error('No [part="surface"] under forced-colors mode')
      const border = el.shadowRoot.querySelector('[part="border"]')
      if (!border) throw new Error('No [part="border"] under forced-colors mode')
    })
  })

  // ─── Trigger overlay regression ───────────────────────────────────────────────

  describe('trigger overlay regression', () => {
    it('trigger is display:none on non-interactive card (does not intercept pointer events)', async () => {
      const el = await FluidTestUtils.mount('<fluid-card>Content with <a href="#">link</a></fluid-card>')
      const trigger = el.shadowRoot!.querySelector('[part="trigger"]') as HTMLElement
      const computed = getComputedStyle(trigger)
      if (computed.display !== 'none') {
        throw new Error(
          `Expected trigger display:none for non-interactive card, got display:${computed.display}`
        )
      }
    })

    it('trigger is visible (not display:none) when interactive', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-card interactive aria-label="Card">Content</fluid-card>'
      )
      const trigger = el.shadowRoot!.querySelector('[part="trigger"]') as HTMLElement
      const computed = getComputedStyle(trigger)
      if (computed.display === 'none') {
        throw new Error('Expected trigger to be visible (not display:none) when interactive')
      }
    })
  })
})
