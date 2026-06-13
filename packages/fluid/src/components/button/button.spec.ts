import { FluidTestUtils } from '../../testing/utils'
import { FluidAccessibilityUtils } from '../../testing/accessibility'
import { ledger } from '../../core/ledger'

// Registers fluid-button — must happen before first test
import './index'

/** Wait N animation frames (default 25 ≈ 400ms at 60fps — enough for bouncy spring) */
function waitFrames(n = 25): Promise<void> {
  return new Promise(resolve => {
    let remaining = n
    function tick() { if (--remaining <= 0) resolve(); else requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
  })
}

describe('fluid-button', () => {
  afterEach(() => {
    FluidTestUtils.cleanup()
    FluidTestUtils.restoreTier()
  })

  // ─── Shadow DOM structure ──────────────────────────────────────────────────

  describe('shadow DOM structure', () => {
    it('renders <button part="surface"> as the interactive root', async () => {
      const el = await FluidTestUtils.mount('<fluid-button>Click</fluid-button>')
      const surface = el.shadowRoot!.querySelector('[part="surface"]')
      if (!surface || surface.tagName !== 'BUTTON') {
        throw new Error('Expected <button part="surface"> in shadow DOM')
      }
    })

    const PARTS = ['icon', 'label', 'trailing-icon', 'overlay', 'border']
    for (const part of PARTS) {
      it(`has [part="${part}"] in shadow DOM`, async () => {
        const el = await FluidTestUtils.mount('<fluid-button>Click</fluid-button>')
        if (!el.shadowRoot!.querySelector(`[part="${part}"]`)) {
          throw new Error(`Expected [part="${part}"] in shadow DOM`)
        }
      })
    }
  })

  // ─── ARIA ──────────────────────────────────────────────────────────────────

  describe('ARIA', () => {
    it('uses native button role — no role override on surface', async () => {
      const el = await FluidTestUtils.mount('<fluid-button>Click</fluid-button>')
      const surface = el.shadowRoot!.querySelector('[part="surface"]')!
      if (surface.getAttribute('role')) {
        throw new Error('Should not override role on native <button>')
      }
    })

    it('sets aria-disabled="true" on surface when disabled attribute is present', async () => {
      const el = await FluidTestUtils.mount('<fluid-button disabled>Click</fluid-button>')
      const surface = el.shadowRoot!.querySelector('[part="surface"]')!
      if (surface.getAttribute('aria-disabled') !== 'true') {
        throw new Error('Expected aria-disabled="true" on surface when disabled')
      }
    })

    it('sets aria-busy="true" and aria-disabled="true" on surface when loading', async () => {
      const el = await FluidTestUtils.mount('<fluid-button loading>Click</fluid-button>')
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
      const el = await FluidTestUtils.mount('<fluid-button>Click</fluid-button>')
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
      const el = await FluidTestUtils.mount('<fluid-button>Click</fluid-button>')
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
      const el = await FluidTestUtils.mount('<fluid-button>Click</fluid-button>')
      const surface = el.shadowRoot!.querySelector('[part="surface"]') as HTMLElement
      let activateCount = 0
      let detail: Record<string, unknown> | null = null
      el.addEventListener('fluid:activate', e => {
        activateCount++
        detail = (e as CustomEvent).detail
      })

      // keydown must NOT fire activate
      surface.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, composed: true }))
      if (activateCount !== 0) throw new Error('fluid:activate must NOT fire on Space keydown')

      // keyup must fire activate
      surface.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true, composed: true }))
      if (!detail) throw new Error('Expected fluid:activate to fire on Space keyup')
      if (detail['source'] !== 'keyboard') {
        throw new Error(`Expected source="keyboard", got "${detail['source']}"`)
      }
    })

    it('does NOT fire fluid:activate when key event is repeating (e.repeat=true)', async () => {
      const el = await FluidTestUtils.mount('<fluid-button>Click</fluid-button>')
      const surface = el.shadowRoot!.querySelector('[part="surface"]') as HTMLElement
      let fired = false
      el.addEventListener('fluid:activate', () => { fired = true })

      surface.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter', bubbles: true, composed: true, repeat: true,
      }))

      if (fired) throw new Error('fluid:activate must not fire on repeated keydown (held key)')
    })

    it('does NOT fire fluid:activate on pointerup outside element bounds', async () => {
      const el = await FluidTestUtils.mount('<fluid-button>Click</fluid-button>')
      const surface = el.shadowRoot!.querySelector('[part="surface"]') as HTMLElement
      let fired = false
      el.addEventListener('fluid:activate', () => { fired = true })

      const rect = el.getBoundingClientRect()
      const cx = rect.left + (rect.width / 2 || 0)
      const cy = rect.top + (rect.height / 2 || 0)

      // Down inside
      surface.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, composed: true, pointerId: 1, clientX: cx, clientY: cy,
      }))
      // Up far outside (negative coords are always outside any real element)
      surface.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true, composed: true, pointerId: 1,
        clientX: rect.left - 500, clientY: rect.top - 500,
      }))

      if (fired) throw new Error('fluid:activate must not fire when pointerup is outside the element')
    })

    it('does NOT fire when disabled attribute is present', async () => {
      const el = await FluidTestUtils.mount('<fluid-button disabled>Click</fluid-button>')
      const surface = el.shadowRoot!.querySelector('[part="surface"]') as HTMLElement
      let fired = false
      el.addEventListener('fluid:activate', () => { fired = true })

      surface.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      surface.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }))
      surface.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }))

      if (fired) throw new Error('fluid:activate must not fire when disabled')
    })

    it('does NOT fire when loading attribute is present', async () => {
      const el = await FluidTestUtils.mount('<fluid-button loading>Click</fluid-button>')
      const surface = el.shadowRoot!.querySelector('[part="surface"]') as HTMLElement
      let fired = false
      el.addEventListener('fluid:activate', () => { fired = true })

      surface.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      surface.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }))
      surface.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }))

      if (fired) throw new Error('fluid:activate must not fire when loading')
    })

    it('dispatches fluid:press on pointerdown with component-relative x, y and pressure', async () => {
      const el = await FluidTestUtils.mount('<fluid-button>Click</fluid-button>')
      const surface = el.shadowRoot!.querySelector('[part="surface"]') as HTMLElement
      let detail: Record<string, unknown> | null = null
      el.addEventListener('fluid:press', e => { detail = (e as CustomEvent).detail })

      const rect = el.getBoundingClientRect()
      const clientX = rect.left + 10
      const clientY = rect.top + 5

      surface.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, composed: true, pointerId: 1,
        clientX, clientY, pressure: 0.5,
      }))

      if (!detail) throw new Error('Expected fluid:press to fire on pointerdown')
      if (typeof detail['x'] !== 'number') throw new Error('Expected detail.x to be a number')
      if (typeof detail['y'] !== 'number') throw new Error('Expected detail.y to be a number')
      if (typeof detail['pressure'] !== 'number') throw new Error('Expected detail.pressure to be a number')
      // x/y must be component-relative (offset from host's top-left), not viewport coords
      const expectedX = clientX - rect.left
      const expectedY = clientY - rect.top
      if (Math.abs((detail['x'] as number) - expectedX) > 1) {
        throw new Error(`Expected component-relative x=${expectedX}, got ${detail['x']}`)
      }
      if (Math.abs((detail['y'] as number) - expectedY) > 1) {
        throw new Error(`Expected component-relative y=${expectedY}, got ${detail['y']}`)
      }
    })
  })

  // ─── Form association ───────────────────────────────────────────────────────

  describe('form association', () => {
    it('submits the form when type="submit" and activated via keyboard', async () => {
      const form = await FluidTestUtils.mount(`
        <form>
          <fluid-button type="submit">Submit</fluid-button>
        </form>
      `)
      const btn = form.querySelector('fluid-button') as HTMLElement
      const surface = btn.shadowRoot!.querySelector('[part="surface"]') as HTMLElement

      let submitted = false
      form.addEventListener('submit', e => { e.preventDefault(); submitted = true })

      surface.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter', bubbles: true, composed: true,
      }))

      if (!submitted) throw new Error('Expected form submit when type="submit" and Enter pressed')
    })

    it('resets the form when type="reset" and activated via keyboard', async () => {
      const form = await FluidTestUtils.mount(`
        <form>
          <input name="field" value="original">
          <fluid-button type="reset">Reset</fluid-button>
        </form>
      `)
      const btn = form.querySelector('fluid-button') as HTMLElement
      const surface = btn.shadowRoot!.querySelector('[part="surface"]') as HTMLElement
      const input = form.querySelector('input') as HTMLInputElement

      input.value = 'changed'

      let resetFired = false
      form.addEventListener('reset', () => { resetFired = true })

      surface.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter', bubbles: true, composed: true,
      }))

      if (!resetFired) throw new Error('Expected form reset when type="reset" and Enter pressed')
    })
  })

  // ─── FluidRipple gating ─────────────────────────────────────────────────────

  describe('FluidRipple gating', () => {
    it('does NOT create a <canvas> at matte tier', async () => {
      FluidTestUtils.mockTier('matte')
      const el = await FluidTestUtils.mount('<fluid-button>Click</fluid-button>')
      if (el.shadowRoot!.querySelector('canvas')) {
        throw new Error('<canvas> must not be created at matte tier')
      }
    })

    it('creates a <canvas> at frosted tier', async () => {
      FluidTestUtils.mockTier('frosted')
      const el = await FluidTestUtils.mount('<fluid-button>Click</fluid-button>')
      if (!el.shadowRoot!.querySelector('canvas')) {
        throw new Error('Expected <canvas> to be created at frosted tier')
      }
    })

    it('does NOT create a <canvas> when ledger.deviceMemoryLow is true', async () => {
      FluidTestUtils.mockTier('frosted')
      const orig = ledger.deviceMemoryLow
      ledger.deviceMemoryLow = true
      try {
        const el = await FluidTestUtils.mount('<fluid-button>Click</fluid-button>')
        if (el.shadowRoot!.querySelector('canvas')) {
          throw new Error('<canvas> must not be created when deviceMemoryLow')
        }
      } finally {
        ledger.deviceMemoryLow = orig
      }
    })
  })

  // ─── Press physics ──────────────────────────────────────────────────────────

  describe('press physics', () => {
    it('applies depress scale ~0.96 for primary variant after pointerdown', async () => {
      FluidTestUtils.mockTier('crystalline')
      const el = await FluidTestUtils.mount('<fluid-button variant="primary">Click</fluid-button>')
      const surface = el.shadowRoot!.querySelector('[part="surface"]') as HTMLElement

      surface.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, composed: true, pointerId: 1, clientX: 50, clientY: 25,
      }))

      await waitFrames(25) // snappy spring settles in ~200ms ≈ 12 frames at 60fps

      const t = surface.style.transform
      const match = t.match(/scale\(([\d.]+)\)/)
      if (!match) throw new Error(`Expected scale() transform on surface, got: "${t}"`)
      const scale = parseFloat(match[1]!)
      if (Math.abs(scale - 0.96) > 0.01) {
        throw new Error(`Expected depress scale ~0.96, got ${scale}`)
      }
    })

    it('returns to scale ~1.0 after pointerup (bouncy release)', async () => {
      FluidTestUtils.mockTier('crystalline')
      const el = await FluidTestUtils.mount('<fluid-button variant="primary">Click</fluid-button>')
      const surface = el.shadowRoot!.querySelector('[part="surface"]') as HTMLElement

      surface.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, composed: true, pointerId: 1, clientX: 50, clientY: 25,
      }))
      await waitFrames(15)
      surface.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true, composed: true, pointerId: 1,
      }))
      await waitFrames(40) // bouncy spring takes longer to settle

      const t = surface.style.transform
      // Empty transform means scale=1.0 (identity); or explicit scale(1)
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

  // ─── Loading state ──────────────────────────────────────────────────────────

  describe('loading state', () => {
    it('blocks pointer interaction when loading', async () => {
      const el = await FluidTestUtils.mount('<fluid-button loading>Click</fluid-button>')
      const surface = el.shadowRoot!.querySelector('[part="surface"]') as HTMLElement
      let fired = false
      el.addEventListener('fluid:activate', () => { fired = true })

      surface.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }))
      surface.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }))

      if (fired) throw new Error('Interaction must be blocked while loading')
    })

    it('has aria-busy="true" while loading', async () => {
      const el = await FluidTestUtils.mount('<fluid-button loading>Click</fluid-button>')
      const surface = el.shadowRoot!.querySelector('[part="surface"]')!
      if (surface.getAttribute('aria-busy') !== 'true') {
        throw new Error('Expected aria-busy="true" on loading button')
      }
    })
  })

  // ─── Attribute reflection ───────────────────────────────────────────────────

  describe('attribute reflection', () => {
    it('reflects variant from attribute', async () => {
      const el = await FluidTestUtils.mount('<fluid-button variant="primary">Click</fluid-button>')
      if ((el as any).variant !== 'primary') {
        throw new Error(`Expected variant="primary", got "${(el as any).variant}"`)
      }
    })

    it('reflects type from attribute', async () => {
      const el = await FluidTestUtils.mount('<fluid-button type="button">Click</fluid-button>')
      if ((el as any).type !== 'button') {
        throw new Error(`Expected type="button", got "${(el as any).type}"`)
      }
    })

    it('defaults type to "submit" when absent', async () => {
      const el = await FluidTestUtils.mount('<fluid-button>Click</fluid-button>')
      if ((el as any).type !== 'submit') {
        throw new Error(`Expected default type="submit", got "${(el as any).type}"`)
      }
    })

    it('reflects disabled as boolean', async () => {
      const el = await FluidTestUtils.mount('<fluid-button disabled>Click</fluid-button>')
      if (!(el as any).disabled) throw new Error('Expected disabled to be true')
    })

    it('reflects loading as boolean', async () => {
      const el = await FluidTestUtils.mount('<fluid-button loading>Click</fluid-button>')
      if (!(el as any).loading) throw new Error('Expected loading to be true')
    })
  })

  // ─── Tier rendering ─────────────────────────────────────────────────────────

  describe('renders without error at all four tiers', () => {
    const TIERS = ['matte', 'frosted', 'crystalline', 'optical'] as const
    for (const tier of TIERS) {
      it(`renders at ${tier} tier`, async () => {
        FluidTestUtils.mockTier(tier)
        const el = await FluidTestUtils.mount(`<fluid-button>Tier: ${tier}</fluid-button>`)
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
      const el = await FluidTestUtils.mount('<fluid-button>Click</fluid-button>')
      if (!el.shadowRoot!.querySelector('canvas')) {
        throw new Error('Precondition: expected canvas at frosted tier')
      }
      el.remove()
      if (el.shadowRoot!.querySelector('canvas')) {
        throw new Error('Expected canvas to be removed after disconnect')
      }
    })
  })

  // ─── Accessibility (axe-core) ───────────────────────────────────────────────

  describe('accessibility', () => {
    it('passes axe in default state', async () => {
      const el = await FluidTestUtils.mount('<fluid-button>Submit</fluid-button>')
      await FluidAccessibilityUtils.assertAccessible(el)
    })

    it('passes axe in disabled state', async () => {
      const el = await FluidTestUtils.mount('<fluid-button disabled>Submit</fluid-button>')
      await FluidAccessibilityUtils.assertAccessible(el)
    })

    it('passes axe in loading state', async () => {
      const el = await FluidTestUtils.mount('<fluid-button loading>Submit</fluid-button>')
      await FluidAccessibilityUtils.assertAccessible(el)
    })

    it('passes axe for all variants', async () => {
      const VARIANTS = ['primary', 'secondary', 'destructive', 'ghost'] as const
      for (const variant of VARIANTS) {
        const el = await FluidTestUtils.mount(`<fluid-button variant="${variant}">Action</fluid-button>`)
        await FluidAccessibilityUtils.assertAccessible(el)
        FluidTestUtils.cleanup()
      }
    })
  })
})
