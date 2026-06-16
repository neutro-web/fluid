import { FluidTestUtils } from '../../testing/utils'
import { FluidAccessibilityUtils } from '../../testing/accessibility'
import { ledger } from '../../core/ledger'

// Registers fluid-empty-state — must happen before first test
import './index'
import '../button/index'
import '../card/index'

describe('fluid-empty-state', () => {
  afterEach(() => {
    FluidTestUtils.cleanup()
    FluidTestUtils.restoreTier()
  })

  // ─── Shadow DOM structure ──────────────────────────────────────────────────

  describe('shadow DOM structure', () => {
    const PARTS = ['surface', 'content-column', 'illustration-wrapper', 'headline', 'description', 'actions-wrapper']
    for (const part of PARTS) {
      it(`has [part="${part}"] in shadow DOM`, async () => {
        const el = await FluidTestUtils.mount('<fluid-empty-state headline="Nothing here"></fluid-empty-state>')
        if (!el.shadowRoot!.querySelector(`[part="${part}"]`)) {
          throw new Error(`Expected [part="${part}"] in shadow DOM`)
        }
      })
    }
  })

  // ─── Headline attribute ────────────────────────────────────────────────────

  describe('headline attribute', () => {
    it('renders headline text in the headline part', async () => {
      const el = await FluidTestUtils.mount('<fluid-empty-state headline="No results found"></fluid-empty-state>')
      const headlineEl = el.shadowRoot!.querySelector('[part="headline"]')!
      if (!headlineEl.textContent?.includes('No results found')) {
        throw new Error(`Expected headline part to contain "No results found", got "${headlineEl.textContent}"`)
      }
    })

    it('has role="heading" aria-level="2" on the headline element', async () => {
      const el = await FluidTestUtils.mount('<fluid-empty-state headline="No results found"></fluid-empty-state>')
      const headlineEl = el.shadowRoot!.querySelector('[part="headline"]')!
      if (headlineEl.getAttribute('role') !== 'heading') {
        throw new Error(`Expected role="heading" on headline, got "${headlineEl.getAttribute('role')}"`)
      }
      if (headlineEl.getAttribute('aria-level') !== '2') {
        throw new Error(`Expected aria-level="2" on headline, got "${headlineEl.getAttribute('aria-level')}"`)
      }
    })

    it('reflects headline attribute as a property', async () => {
      const el = await FluidTestUtils.mount('<fluid-empty-state headline="Empty inbox"></fluid-empty-state>') as HTMLElement & { headline: string }
      if ((el as unknown as Record<string, unknown>)['headline'] !== 'Empty inbox') {
        throw new Error('Expected headline property to reflect the attribute value')
      }
    })

    it('updates headline text when attribute changes', async () => {
      const el = await FluidTestUtils.mount('<fluid-empty-state headline="Old headline"></fluid-empty-state>')
      el.setAttribute('headline', 'New headline')
      await new Promise(r => requestAnimationFrame(r))
      const headlineEl = el.shadowRoot!.querySelector('[part="headline"]')!
      if (!headlineEl.textContent?.includes('New headline')) {
        throw new Error(`Expected updated headline "New headline", got "${headlineEl.textContent}"`)
      }
    })
  })

  // ─── Headline required — dev warning ──────────────────────────────────────

  describe('missing headline warning', () => {
    it('logs a dev warning when headline attribute is absent', async () => {
      const warns: string[] = []
      const original = console.warn
      console.warn = (...args: unknown[]) => { warns.push(String(args[0])) }
      try {
        await FluidTestUtils.mount('<fluid-empty-state></fluid-empty-state>')
        const hit = warns.some(w => w.includes('fluid-empty-state') && w.includes('headline'))
        if (!hit) {
          throw new Error(`Expected a dev warning about missing headline, got: ${JSON.stringify(warns)}`)
        }
      } finally {
        console.warn = original
      }
    })

    it('logs a dev warning when headline attribute is empty string', async () => {
      const warns: string[] = []
      const original = console.warn
      console.warn = (...args: unknown[]) => { warns.push(String(args[0])) }
      try {
        await FluidTestUtils.mount('<fluid-empty-state headline=""></fluid-empty-state>')
        const hit = warns.some(w => w.includes('fluid-empty-state') && w.includes('headline'))
        if (!hit) {
          throw new Error(`Expected a dev warning about empty headline, got: ${JSON.stringify(warns)}`)
        }
      } finally {
        console.warn = original
      }
    })
  })

  // ─── Description attribute ─────────────────────────────────────────────────

  describe('description attribute', () => {
    it('renders description text when the attribute is set', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-empty-state headline="No results" description="Try adjusting your search"></fluid-empty-state>'
      )
      const descEl = el.shadowRoot!.querySelector('[part="description"]')!
      if (!descEl.textContent?.includes('Try adjusting your search')) {
        throw new Error(`Expected description text, got "${descEl.textContent}"`)
      }
    })

    it('hides the description part when the attribute is absent', async () => {
      const el = await FluidTestUtils.mount('<fluid-empty-state headline="Nothing here"></fluid-empty-state>')
      const descEl = el.shadowRoot!.querySelector('[part="description"]') as HTMLElement
      if (!descEl) throw new Error('Expected [part="description"] to exist in shadow DOM')
      if (!descEl.hasAttribute('hidden')) {
        throw new Error('Expected description to have [hidden] attribute when attribute is absent')
      }
    })

    it('updates description text when attribute changes', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-empty-state headline="No results" description="Old text"></fluid-empty-state>'
      )
      el.setAttribute('description', 'Updated description text')
      await new Promise(r => requestAnimationFrame(r))
      const descEl = el.shadowRoot!.querySelector('[part="description"]')!
      if (!descEl.textContent?.includes('Updated description text')) {
        throw new Error(`Expected updated description, got "${descEl.textContent}"`)
      }
    })
  })

  // ─── Illustration attribute ────────────────────────────────────────────────

  describe('illustration attribute', () => {
    it('renders an img when illustration attribute is set', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-empty-state headline="No results" illustration="/icons/empty.svg"></fluid-empty-state>'
      )
      const wrapper = el.shadowRoot!.querySelector('[part="illustration-wrapper"]')!
      const img = wrapper.querySelector('img')
      if (!img) {
        throw new Error('Expected an <img> in illustration-wrapper when illustration attribute is set')
      }
      if (img.getAttribute('src') !== '/icons/empty.svg') {
        throw new Error(`Expected img src="/icons/empty.svg", got "${img.getAttribute('src')}"`)
      }
    })

    it('hides the illustration wrapper when illustration attribute is absent and no slot content', async () => {
      const el = await FluidTestUtils.mount('<fluid-empty-state headline="Nothing here"></fluid-empty-state>')
      const wrapper = el.shadowRoot!.querySelector('[part="illustration-wrapper"]') as HTMLElement | null
      if (wrapper && !wrapper.hasAttribute('hidden')) {
        throw new Error('Expected illustration-wrapper to be hidden when no illustration is set')
      }
    })

    it('does not render the attribute img when illustration slot has content', async () => {
      const el = await FluidTestUtils.mount(`
        <fluid-empty-state headline="No results" illustration="/icons/empty.svg">
          <span slot="illustration">Custom icon</span>
        </fluid-empty-state>
      `)
      const wrapper = el.shadowRoot!.querySelector('[part="illustration-wrapper"]')!
      const img = wrapper.querySelector('img')
      if (img && !img.hasAttribute('hidden')) {
        throw new Error('Expected attribute img to be hidden when illustration slot has content')
      }
    })
  })

  // ─── Actions slot ──────────────────────────────────────────────────────────

  describe('actions slot', () => {
    it('renders slotted fluid-button in the actions slot', async () => {
      const el = await FluidTestUtils.mount(`
        <fluid-empty-state headline="No results">
          <fluid-button slot="actions" variant="primary">Try again</fluid-button>
        </fluid-empty-state>
      `)
      const actionsWrapper = el.shadowRoot!.querySelector('[part="actions-wrapper"]')!
      const slot = actionsWrapper.querySelector('slot[name="actions"]') as HTMLSlotElement | null
      if (!slot) {
        throw new Error('Expected a slot[name="actions"] in actions-wrapper')
      }
      const assigned = slot.assignedElements({ flatten: true })
      if (assigned.length === 0) {
        throw new Error('Expected fluid-button to be assigned to actions slot')
      }
    })

    it('hides the actions wrapper when no actions are slotted', async () => {
      const el = await FluidTestUtils.mount('<fluid-empty-state headline="Nothing here"></fluid-empty-state>')
      const wrapper = el.shadowRoot!.querySelector('[part="actions-wrapper"]') as HTMLElement | null
      if (wrapper && !wrapper.hasAttribute('hidden')) {
        throw new Error('Expected actions-wrapper to be hidden when no actions are slotted')
      }
    })

    it('makes slotted fluid-button keyboard accessible (tabindex not negative)', async () => {
      const el = await FluidTestUtils.mount(`
        <fluid-empty-state headline="No results">
          <fluid-button slot="actions" variant="primary">Retry</fluid-button>
        </fluid-empty-state>
      `)
      const btn = el.querySelector('fluid-button[slot="actions"]') as HTMLElement | null
      if (!btn) throw new Error('Expected fluid-button in light DOM')
      // fluid-button uses [part="surface"] (a <button>) — verify it's keyboard-reachable
      const inner = btn.shadowRoot?.querySelector('[part="surface"]') as HTMLElement | null
      if (!inner) throw new Error('Expected fluid-button to have [part="surface"] in shadow DOM')
      const tabIndex = parseInt(inner.getAttribute('tabindex') ?? '0', 10)
      if (tabIndex < 0) {
        throw new Error(`Expected fluid-button to be keyboard-reachable (tabindex >= 0), got ${tabIndex}`)
      }
    })
  })

  // ─── Accessibility ─────────────────────────────────────────────────────────

  describe('accessibility', () => {
    it('has no axe violations in default state', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-empty-state headline="No results found" description="Try a different search"></fluid-empty-state>'
      )
      await FluidAccessibilityUtils.assertAccessible(el)
    })

    it('has no axe violations with illustration attribute', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-empty-state headline="Empty inbox" illustration="/icons/empty.svg"></fluid-empty-state>'
      )
      await FluidAccessibilityUtils.assertAccessible(el)
    })

    it('has no axe violations with actions slot', async () => {
      const el = await FluidTestUtils.mount(`
        <fluid-empty-state headline="No results" description="Create something to get started">
          <fluid-button slot="actions" variant="primary">Create new</fluid-button>
        </fluid-empty-state>
      `)
      await FluidAccessibilityUtils.assertAccessible(el)
    })

    it('has no axe violations with custom illustration slot', async () => {
      const el = await FluidTestUtils.mount(`
        <fluid-empty-state headline="Nothing to see">
          <span slot="illustration" aria-hidden="true" style="font-size:3rem">📭</span>
        </fluid-empty-state>
      `)
      await FluidAccessibilityUtils.assertAccessible(el)
    })
  })

  // ─── No loading / error state ──────────────────────────────────────────────

  describe('no loading or error state', () => {
    it('does not set aria-busy on the host', async () => {
      const el = await FluidTestUtils.mount('<fluid-empty-state headline="Nothing here"></fluid-empty-state>')
      if (el.hasAttribute('aria-busy')) {
        throw new Error('fluid-empty-state must not set aria-busy — it has no loading state')
      }
    })

    it('does not render an error region', async () => {
      const el = await FluidTestUtils.mount('<fluid-empty-state headline="Nothing here"></fluid-empty-state>')
      const errorEl = el.shadowRoot!.querySelector('[part="error-banner"]')
      if (errorEl) {
        throw new Error('fluid-empty-state must not have an error-banner — it has no error state')
      }
    })
  })

  // ─── Tier rendering ────────────────────────────────────────────────────────

  describe('renders without error at all tiers', () => {
    const tiers = ['matte', 'frosted', 'crystalline', 'optical'] as const
    for (const tier of tiers) {
      it(`renders at tier="${tier}"`, async () => {
        FluidTestUtils.mockTier(tier)
        const el = await FluidTestUtils.mount(
          '<fluid-empty-state headline="No items found" description="Create one to get started"></fluid-empty-state>'
        )
        if (!el.shadowRoot!.querySelector('[part="surface"]')) {
          throw new Error(`Expected [part="surface"] at tier="${tier}"`)
        }
      })
    }
  })

  // ─── fluid:mounted event ───────────────────────────────────────────────────

  describe('lifecycle events', () => {
    it('dispatches fluid:mounted after connectedCallback', async () => {
      let fired = false
      const fixture = document.createElement('div')
      document.body.appendChild(fixture)
      // Attach listener BEFORE connecting to DOM so it catches the synchronous dispatch
      const el = document.createElement('fluid-empty-state')
      el.setAttribute('headline', 'No results')
      el.addEventListener('fluid:mounted', () => { fired = true }, { once: true })
      fixture.appendChild(el)
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      fixture.remove()
      if (!fired) {
        throw new Error('Expected fluid:mounted event to fire after connectedCallback')
      }
    })
  })

  // ─── Tier-change reactivity ────────────────────────────────────────────────

  describe('tier-change reactivity', () => {
    it('does not replay emerge animation on tier-change (surface stays at opacity ≈ 1)', async () => {
      FluidTestUtils.mockTier('frosted')
      const el = await FluidTestUtils.mount(
        '<fluid-empty-state headline="No items" description="Try again"></fluid-empty-state>'
      )
      const surface = el.shadowRoot!.querySelector('[part="surface"]') as HTMLElement
      if (!surface) throw new Error('Expected [part="surface"]')
      // Wait for initial emerge to settle
      const emergeDeadline = performance.now() + 3000
      while (parseFloat(getComputedStyle(surface).opacity) < 0.99) {
        if (performance.now() > emergeDeadline) throw new Error('Initial emerge did not settle')
        await new Promise(r => requestAnimationFrame(r))
      }
      // Dispatch tier change — must not reset opacity to 0 and re-animate
      document.dispatchEvent(
        new CustomEvent('fluidledger:tier-change', { detail: { previousTier: 'frosted', newTier: 'matte' } }),
      )
      await new Promise(r => requestAnimationFrame(r))
      const opacity = parseFloat(getComputedStyle(surface).opacity)
      if (opacity < 0.99) {
        throw new Error(`Expected surface to stay visible after tier-change (opacity ≈ 1), got ${opacity}`)
      }
    })
  })

  // ─── Reconnect guard ───────────────────────────────────────────────────────

  describe('reconnect guard', () => {
    it('re-connects without duplicating shadow content and recovers to opacity ≈ 1', async () => {
      FluidTestUtils.mockTier('frosted')
      const fixture = document.createElement('div')
      document.body.appendChild(fixture)
      try {
        const el = document.createElement('fluid-empty-state') as HTMLElement
        el.setAttribute('headline', 'Original')
        fixture.appendChild(el)
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

        // Disconnect (triggers recede — strands surface at opacity < 1)
        fixture.removeChild(el)
        await new Promise(r => requestAnimationFrame(r))

        // Reconnect
        fixture.appendChild(el)
        await new Promise(r => requestAnimationFrame(r))

        // Exactly one [part="surface"] — no duplicate from re-cloning the template
        const surfaces = el.shadowRoot!.querySelectorAll('[part="surface"]')
        if (surfaces.length !== 1) {
          throw new Error(`Expected exactly 1 [part="surface"] after reconnect, got ${surfaces.length}`)
        }

        // Headline must survive across the DOM move
        const headlineEl = el.shadowRoot!.querySelector('[part="headline"]')!
        if (!headlineEl.textContent?.includes('Original')) {
          throw new Error(`Expected headline "Original" after reconnect, got "${headlineEl.textContent}"`)
        }

        // Surface must re-emerge to opacity ≈ 1 (reconnect resets leftover recede state)
        const surface = surfaces[0] as HTMLElement
        const deadline = performance.now() + 3000
        while (parseFloat(getComputedStyle(surface).opacity) < 0.99) {
          if (performance.now() > deadline) {
            const opacity = parseFloat(getComputedStyle(surface).opacity)
            throw new Error(`Surface opacity stuck at ${opacity} after reconnect`)
          }
          await new Promise(r => requestAnimationFrame(r))
        }
      } finally {
        fixture.remove()
      }
    })
  })

  // ─── Reduced-motion ────────────────────────────────────────────────────────

  describe('reduced motion', () => {
    it('renders visible at final state under prefers-reduced-motion', async () => {
      FluidTestUtils.mockTier('frosted')
      const savedReduced = ledger.prefersReducedMotion
      ledger.prefersReducedMotion = true
      try {
        const el = await FluidTestUtils.mount(
          '<fluid-empty-state headline="No items"></fluid-empty-state>'
        )
        const surface = el.shadowRoot!.querySelector('[part="surface"]') as HTMLElement
        if (!surface) throw new Error('Expected [part="surface"] in shadow DOM')
        // Poll until the spring settle — motion.animate uses a separate task registry
        // from startSpring, so waitForSpringSettle won't detect it. Poll directly.
        const deadline = performance.now() + 3000
        while (parseFloat(getComputedStyle(surface).opacity) < 0.99) {
          if (performance.now() > deadline) {
            const opacity = parseFloat(getComputedStyle(surface).opacity)
            throw new Error(`Surface opacity stuck at ${opacity} — expected ≈ 1 after reduced-motion emerge`)
          }
          await new Promise(r => requestAnimationFrame(r))
        }
      } finally {
        ledger.prefersReducedMotion = savedReduced
      }
    })
  })
})
