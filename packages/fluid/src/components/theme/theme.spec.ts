import { FluidTestUtils } from '../../testing/utils'
import { FluidAccessibilityUtils } from '../../testing/accessibility'

import './index'

function nextFrame(): Promise<void> {
  return new Promise(r => requestAnimationFrame(() => r()))
}

function waitForEvent(el: Element, event: string): Promise<void> {
  return new Promise(r => el.addEventListener(event, () => r(), { once: true }))
}

describe('fluid-theme', () => {
  afterEach(() => {
    FluidTestUtils.cleanup()
    FluidTestUtils.restoreTier()
    delete document.documentElement.dataset.theme
  })

  // ─── AC 1: brand-hue → --fluid-hue-brand ─────────────────────────────────

  describe('brand-hue attribute', () => {
    it('sets --fluid-hue-brand on the element when brand-hue="280" is set', async () => {
      const el = await FluidTestUtils.mount('<fluid-theme brand-hue="280"></fluid-theme>')
      const val = el.style.getPropertyValue('--fluid-hue-brand')
      if (val !== '280') {
        throw new Error(`Expected --fluid-hue-brand: 280, got: "${val}"`)
      }
    })

    it('updates --fluid-hue-brand when brand-hue changes', async () => {
      const el = await FluidTestUtils.mount('<fluid-theme brand-hue="100"></fluid-theme>')
      el.setAttribute('brand-hue', '200')
      await nextFrame()
      const val = el.style.getPropertyValue('--fluid-hue-brand')
      if (val !== '200') {
        throw new Error(`Expected --fluid-hue-brand: 200 after attribute change, got: "${val}"`)
      }
    })

    it('removes --fluid-hue-brand when brand-hue attribute is removed', async () => {
      const el = await FluidTestUtils.mount('<fluid-theme brand-hue="180"></fluid-theme>')
      el.removeAttribute('brand-hue')
      await nextFrame()
      const val = el.style.getPropertyValue('--fluid-hue-brand')
      if (val !== '') {
        throw new Error(`Expected --fluid-hue-brand to be removed, got: "${val}"`)
      }
    })
  })

  // ─── AC 2: invalid brand-hue → warn, keep previous value ─────────────────

  describe('brand-hue validation', () => {
    it('logs exact §XIV warning for non-numeric brand-hue and retains prior value', async () => {
      const warnings: string[] = []
      const origWarn = console.warn
      console.warn = (...args: unknown[]) => warnings.push(args.join(' '))

      const el = await FluidTestUtils.mount('<fluid-theme brand-hue="220"></fluid-theme>')
      el.setAttribute('brand-hue', 'banana')
      await nextFrame()

      console.warn = origWarn

      const val = el.style.getPropertyValue('--fluid-hue-brand')
      if (val !== '220') {
        throw new Error(`Expected --fluid-hue-brand to retain 220, got: "${val}"`)
      }
      const warnMatch = warnings.some(w =>
        w.includes('[fluid warn]') &&
        w.includes('brand-hue') &&
        w.includes('"banana"') &&
        w.includes('Expected 0–360') &&
        w.includes('Keeping previous value')
      )
      if (!warnMatch) {
        throw new Error(`Expected §XIV warning string, got: ${JSON.stringify(warnings)}`)
      }
    })

    it('logs warning and retains prior for out-of-range brand-hue="999"', async () => {
      const warnings: string[] = []
      const origWarn = console.warn
      console.warn = (...args: unknown[]) => warnings.push(args.join(' '))

      const el = await FluidTestUtils.mount('<fluid-theme brand-hue="180"></fluid-theme>')
      el.setAttribute('brand-hue', '999')
      await nextFrame()

      console.warn = origWarn

      const val = el.style.getPropertyValue('--fluid-hue-brand')
      if (val !== '180') {
        throw new Error(`Expected --fluid-hue-brand to retain 180, got: "${val}"`)
      }
      if (!warnings.some(w => w.includes('[fluid warn]'))) {
        throw new Error('Expected dev warning for out-of-range value')
      }
    })

    it('accepts brand-hue="0" and brand-hue="360" as valid boundaries', async () => {
      const el = await FluidTestUtils.mount('<fluid-theme brand-hue="0"></fluid-theme>')
      if (el.style.getPropertyValue('--fluid-hue-brand') !== '0') {
        throw new Error('Expected brand-hue="0" to be valid')
      }
      el.setAttribute('brand-hue', '360')
      await nextFrame()
      if (el.style.getPropertyValue('--fluid-hue-brand') !== '360') {
        throw new Error('Expected brand-hue="360" to be valid')
      }
    })
  })

  // ─── AC 3: MutationObserver on style → fluidtheme:change ─────────────────

  describe('MutationObserver on self style', () => {
    it('dispatches fluidtheme:change when style.setProperty() is called externally', async () => {
      const el = await FluidTestUtils.mount('<fluid-theme></fluid-theme>')
      let fired = false
      el.addEventListener('fluidtheme:change', () => { fired = true }, { once: true })

      el.style.setProperty('--fluid-hue-brand', '100')
      await nextFrame()

      if (!fired) {
        throw new Error('Expected fluidtheme:change to fire after style.setProperty()')
      }
    })

    it('fluidtheme:change bubbles', async () => {
      const el = await FluidTestUtils.mount('<fluid-theme></fluid-theme>')
      let fired = false
      const handler = () => { fired = true }
      document.addEventListener('fluidtheme:change', handler, { once: true })

      el.style.setProperty('--fluid-hue-brand', '55')
      await nextFrame()

      document.removeEventListener('fluidtheme:change', handler)

      if (!fired) {
        throw new Error('Expected fluidtheme:change to bubble to document')
      }
    })
  })

  // ─── AC 4: attributeChangedCallback → fluidtheme:change ──────────────────

  describe('attributeChangedCallback dispatches fluidtheme:change', () => {
    const attrs: Array<[string, string]> = [
      ['brand-hue', '300'],
      ['font-family', "'Inter', sans-serif"],
      ['data-theme', 'dark'],
    ]
    for (const [attr, val] of attrs) {
      it(`fires fluidtheme:change when ${attr} changes`, async () => {
        const el = await FluidTestUtils.mount('<fluid-theme></fluid-theme>')
        let fired = false
        el.addEventListener('fluidtheme:change', () => { fired = true }, { once: true })

        el.setAttribute(attr, val)
        await nextFrame()

        if (!fired) {
          throw new Error(`Expected fluidtheme:change after ${attr} change`)
        }
      })
    }
  })

  // ─── AC 5: background sampling ────────────────────────────────────────────

  describe('background sampling', () => {
    it('sets --fluid-env-luminance and --fluid-env-hue at Crystalline tier (mount-only)', async () => {
      FluidTestUtils.mockTier('crystalline')
      const fixture = document.createElement('div')
      fixture.style.backgroundColor = 'rgb(255, 255, 255)'
      document.body.appendChild(fixture)

      const el = document.createElement('fluid-theme') as HTMLElement
      el.setAttribute('sampling', 'mount-only')
      const mountedP = waitForEvent(el, 'fluid:mounted')
      fixture.appendChild(el)
      await mountedP
      await nextFrame()

      const luminance = el.style.getPropertyValue('--fluid-env-luminance')
      const hue = el.style.getPropertyValue('--fluid-env-hue')

      fixture.remove()

      if (!luminance) {
        throw new Error('Expected --fluid-env-luminance to be set at Crystalline tier')
      }
      if (hue === undefined) {
        throw new Error('Expected --fluid-env-hue to be set at Crystalline tier')
      }
    })

    it('does NOT set --fluid-env-luminance at Matte tier', async () => {
      FluidTestUtils.mockTier('matte')
      const el = await FluidTestUtils.mount('<fluid-theme sampling="mount-only"></fluid-theme>')
      await nextFrame()
      const luminance = el.style.getPropertyValue('--fluid-env-luminance')
      if (luminance) {
        throw new Error(`Expected no sampling at Matte, got luminance="${luminance}"`)
      }
    })
  })

  // ─── AC 6: setGlobalMode ─────────────────────────────────────────────────

  describe('FluidTheme.setGlobalMode', () => {
    it('sets data-theme="dark" on documentElement for dark mode', async () => {
      const { FluidTheme } = await import('./index')
      FluidTheme.setGlobalMode('dark')
      if (document.documentElement.dataset.theme !== 'dark') {
        throw new Error(`Expected data-theme="dark", got "${document.documentElement.dataset.theme}"`)
      }
    })

    it('sets data-theme="light" on documentElement for light mode', async () => {
      const { FluidTheme } = await import('./index')
      FluidTheme.setGlobalMode('light')
      if (document.documentElement.dataset.theme !== 'light') {
        throw new Error(`Expected data-theme="light", got "${document.documentElement.dataset.theme}"`)
      }
    })

    it('removes data-theme attribute for system mode', async () => {
      const { FluidTheme } = await import('./index')
      document.documentElement.dataset.theme = 'dark'
      FluidTheme.setGlobalMode('system')
      if ('theme' in document.documentElement.dataset) {
        throw new Error(`Expected data-theme to be removed, got "${document.documentElement.dataset.theme}"`)
      }
    })
  })

  // ─── AC 7: contrast auto-correction ──────────────────────────────────────

  describe('contrast auto-correction', () => {
    it('does not throw when sampling and correcting contrast', async () => {
      FluidTestUtils.mockTier('crystalline')
      let threw = false
      try {
        const el = await FluidTestUtils.mount('<fluid-theme sampling="mount-only"></fluid-theme>')
        await nextFrame()
        void el
      } catch {
        threw = true
      }
      if (threw) {
        throw new Error('contrast auto-correction must not throw')
      }
    })
  })

  // ─── AC 8: axe-core ───────────────────────────────────────────────────────

  describe('accessibility', () => {
    it('passes axe-core in default state', async () => {
      const el = await FluidTestUtils.mount('<fluid-theme><p>Content</p></fluid-theme>')
      await FluidAccessibilityUtils.assertAccessible(el)
    })
  })

  // ─── AC 9: tier-change reactivity ────────────────────────────────────────

  describe('tier-change reactivity', () => {
    it('stops re-sampling after fluidledger:tier-change to Matte', async () => {
      FluidTestUtils.mockTier('crystalline')
      const el = await FluidTestUtils.mount('<fluid-theme sampling="mount-only"></fluid-theme>')
      await nextFrame()

      // Force tier to matte, fire tier-change
      FluidTestUtils.mockTier('matte')
      document.dispatchEvent(new CustomEvent('fluidledger:tier-change'))
      await nextFrame()

      // Remove any previously set env props
      el.style.removeProperty('--fluid-env-luminance')

      // Fire tier-change again at matte — should NOT re-set env props
      document.dispatchEvent(new CustomEvent('fluidledger:tier-change'))
      await nextFrame()

      const after = el.style.getPropertyValue('--fluid-env-luminance')
      if (after !== '') {
        throw new Error(`Expected no sampling at Matte after tier-change, got "${after}"`)
      }
    })
  })

  // ─── AC 10: disposer hygiene + reconnect ─────────────────────────────────

  describe('disposer hygiene', () => {
    it('does not dispatch fluidtheme:change after disconnect', async () => {
      const el = await FluidTestUtils.mount('<fluid-theme></fluid-theme>')
      const unmountedP = waitForEvent(el, 'fluid:unmounted')
      el.remove()
      await unmountedP

      let fired = false
      el.addEventListener('fluidtheme:change', () => { fired = true })
      el.style.setProperty('--fluid-hue-brand', '999')
      await nextFrame()

      if (fired) {
        throw new Error('fluidtheme:change should not fire after disconnect')
      }
    })

    it('re-registers observer on reconnect (React Strict Mode)', async () => {
      const el = await FluidTestUtils.mount('<fluid-theme></fluid-theme>')
      const host = el.parentElement!

      const unmountedP = waitForEvent(el, 'fluid:unmounted')
      el.remove()
      await unmountedP

      const remountedP = waitForEvent(el, 'fluid:mounted')
      host.appendChild(el)
      await remountedP

      let fired = false
      el.addEventListener('fluidtheme:change', () => { fired = true }, { once: true })
      el.style.setProperty('--fluid-hue-brand', '50')
      await nextFrame()

      if (!fired) {
        throw new Error('Expected fluidtheme:change after reconnect')
      }
    })
  })

  // ─── AC 11: data-theme scoping (no documentElement mutation) ─────────────

  describe('data-theme scoping', () => {
    it('does NOT set document.documentElement.dataset.theme when data-theme is set on element', async () => {
      const el = await FluidTestUtils.mount('<fluid-theme data-theme="dark"></fluid-theme>')
      await nextFrame()
      if (document.documentElement.dataset.theme === 'dark') {
        throw new Error(
          'fluid-theme data-theme must not propagate to <html> — use FluidTheme.setGlobalMode() for that'
        )
      }
      void el
    })
  })

  // ─── AC 12: sampling mode coverage ───────────────────────────────────────

  describe('sampling mode coverage', () => {
    it('fires debounced sample after ~100ms at Crystalline tier', async () => {
      FluidTestUtils.mockTier('crystalline')
      const el = await FluidTestUtils.mount('<fluid-theme></fluid-theme>')
      // Clear any env prop that may have been set by the initial debounced timer from onMount
      el.style.removeProperty('--fluid-env-luminance')
      await new Promise<void>(r => setTimeout(r, 150))
      const luminance = el.style.getPropertyValue('--fluid-env-luminance')
      if (!luminance) {
        throw new Error('Expected --fluid-env-luminance to be set after 100ms debounce at Crystalline tier')
      }
    })

    it('sets env props in live mode at Crystalline tier', async () => {
      FluidTestUtils.mockTier('crystalline')
      const el = await FluidTestUtils.mount('<fluid-theme sampling="live"></fluid-theme>')
      await nextFrame()
      await nextFrame()
      const luminance = el.style.getPropertyValue('--fluid-env-luminance')
      if (!luminance) {
        throw new Error('Expected --fluid-env-luminance to be set in live (rAF) mode at Crystalline tier')
      }
    })
  })

  // ─── AC 13: contrast correction quality ──────────────────────────────────

  describe('contrast correction quality', () => {
    it('achieves >= 4.5:1 WCAG AA when dark-mode alpha triggers correction', async () => {
      FluidTestUtils.mockTier('crystalline')

      const el = document.createElement('fluid-theme') as HTMLElement
      // Simulate dark.css --fluid-tint-alpha: 0.12. The test-runner does not load the full
      // token stylesheet, so set it inline. With tint L=1.0 and transparent BG (L≈0):
      // surfaceL = 0.10, contrast = 3.0 < 4.5 — correction must fire.
      el.style.setProperty('--fluid-tint-alpha', '0.10')
      el.setAttribute('sampling', 'mount-only')
      const mountedP = waitForEvent(el, 'fluid:mounted')
      document.body.appendChild(el)
      await mountedP
      await nextFrame()

      const alphaStr = el.style.getPropertyValue('--fluid-tint-alpha')
      const envLumStr = el.style.getPropertyValue('--fluid-env-luminance')
      el.remove()

      if (!alphaStr || !envLumStr) {
        throw new Error(
          `Expected both --fluid-tint-alpha and --fluid-env-luminance to be set, ` +
          `got alpha="${alphaStr}" lum="${envLumStr}"`
        )
      }

      const alpha = parseFloat(alphaStr)
      const bgLuminance = parseFloat(envLumStr) // component's measured background luminance

      // --fluid-tint-light is hsl(0 0% 100% / …) = pure white, luminance 1.0 (tokens/themes/default.css).
      // WCAG AA formula: (L_lighter + 0.05) / (L_darker + 0.05).
      // Foreground = black text (L=0), so denominator = 0 + 0.05 = 0.05.
      const TINT_LUMINANCE = 1.0 // pure white, from --fluid-tint-light token
      const surfaceL = alpha * TINT_LUMINANCE + (1 - alpha) * bgLuminance
      const wcagRatio = (surfaceL + 0.05) / (0 + 0.05)
      if (wcagRatio < 4.5) {
        throw new Error(
          `WCAG AA contrast ${wcagRatio.toFixed(2)} < 4.5 ` +
          `(alpha=${alpha}, bgLuminance=${bgLuminance.toFixed(4)})`
        )
      }
    })

    it('does NOT set --fluid-tint-alpha when contrast is already sufficient (bright background on element)', async () => {
      FluidTestUtils.mockTier('crystalline')

      const el = document.createElement('fluid-theme') as HTMLElement
      // Set a bright background directly on the element (not a parent) so getComputedStyle
      // returns a high-luminance value. fluid-theme uses display:contents so parent bg-color
      // is not inherited — we must set it on the element itself.
      el.style.backgroundColor = 'rgb(255, 255, 255)'
      el.setAttribute('sampling', 'mount-only')
      const mountedP = waitForEvent(el, 'fluid:mounted')
      document.body.appendChild(el)
      await mountedP
      await nextFrame()

      const alpha = el.style.getPropertyValue('--fluid-tint-alpha')
      el.remove()

      if (alpha) {
        throw new Error(
          `Expected --fluid-tint-alpha NOT to be set against bright background, got "${alpha}"`
        )
      }
    })
  })

  // ─── snapshotTokens static method ─────────────────────────────────────────

  describe('FluidTheme.snapshotTokens', () => {
    it('captures inline --fluid-* properties and excludes non-fluid props', async () => {
      const { FluidTheme } = await import('./index')
      const el = document.createElement('div')
      el.style.setProperty('--fluid-hue-brand', '180')
      el.style.setProperty('--not-fluid', 'skip')
      document.body.appendChild(el)

      const tokens = FluidTheme.snapshotTokens(el)
      el.remove()

      if (tokens['--fluid-hue-brand'] !== '180') {
        throw new Error(`Expected --fluid-hue-brand: 180, got: "${tokens['--fluid-hue-brand']}"`)
      }
      if ('--not-fluid' in tokens) {
        throw new Error('Expected non-fluid props to be excluded')
      }
    })
  })
})
