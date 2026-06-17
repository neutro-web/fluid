import { FluidTestUtils } from '../../testing/utils'
import { FluidAccessibilityUtils } from '../../testing/accessibility'
import { DISABLED_CONTEXT_KEY, requestContext } from '../../core/context'

// Registers fluid-fieldset — must happen before first test
import './index'

describe('fluid-fieldset', () => {
  afterEach(() => {
    FluidTestUtils.cleanup()
    FluidTestUtils.restoreTier()
  })

  // ─── Shadow DOM structure ──────────────────────────────────────────────────

  describe('shadow DOM structure', () => {
    it('renders <fieldset part="fieldset"> as the grouping root', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-fieldset legend="Personal info">Content</fluid-fieldset>',
      )
      const root = el.shadowRoot!.querySelector('[part="fieldset"]')
      if (!root || root.tagName !== 'FIELDSET') {
        throw new Error('Expected <fieldset part="fieldset"> in shadow DOM')
      }
    })

    for (const part of ['header', 'legend', 'legend-text', 'header-actions', 'body']) {
      it(`has [part="${part}"] in shadow DOM`, async () => {
        const el = await FluidTestUtils.mount(
          '<fluid-fieldset legend="Settings">Content</fluid-fieldset>',
        )
        if (!el.shadowRoot!.querySelector(`[part="${part}"]`)) {
          throw new Error(`Expected [part="${part}"] in shadow DOM`)
        }
      })
    }
  })

  // ─── ARIA ──────────────────────────────────────────────────────────────────

  describe('ARIA', () => {
    it('sets aria-labelledby on <fieldset> pointing to [part="legend"] id', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-fieldset legend="Contact details">Content</fluid-fieldset>',
      )
      const fieldsetEl = el.shadowRoot!.querySelector('[part="fieldset"]')!
      const legendEl = el.shadowRoot!.querySelector('[part="legend"]')!
      const labelledBy = fieldsetEl.getAttribute('aria-labelledby')
      if (!labelledBy || labelledBy !== legendEl.id) {
        throw new Error(
          `Expected aria-labelledby="${legendEl.id}" on <fieldset>, got "${labelledBy}"`,
        )
      }
    })

    it('does not set aria-disabled when not disabled', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-fieldset legend="Settings">Content</fluid-fieldset>',
      )
      const fieldsetEl = el.shadowRoot!.querySelector('[part="fieldset"]')!
      if (fieldsetEl.hasAttribute('aria-disabled')) {
        throw new Error('Expected no aria-disabled when fieldset is not disabled')
      }
    })

    it('sets aria-disabled="true" on <fieldset> when disabled attribute is present', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-fieldset legend="Settings" disabled>Content</fluid-fieldset>',
      )
      const fieldsetEl = el.shadowRoot!.querySelector('[part="fieldset"]')!
      if (fieldsetEl.getAttribute('aria-disabled') !== 'true') {
        throw new Error('Expected aria-disabled="true" on <fieldset> when disabled')
      }
    })

    it('removes aria-disabled when disabled attribute is removed', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-fieldset legend="Settings" disabled>Content</fluid-fieldset>',
      )
      el.removeAttribute('disabled')
      await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      const fieldsetEl = el.shadowRoot!.querySelector('[part="fieldset"]')!
      if (fieldsetEl.hasAttribute('aria-disabled')) {
        throw new Error('Expected aria-disabled to be removed when disabled is removed')
      }
    })
  })

  // ─── Legend content ────────────────────────────────────────────────────────

  describe('legend content', () => {
    it('renders legend attribute text in [part="legend-text"]', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-fieldset legend="Personal details">Content</fluid-fieldset>',
      )
      const legendText = el.shadowRoot!.querySelector('[part="legend-text"]') as HTMLElement | null
      if (!legendText || legendText.textContent !== 'Personal details') {
        throw new Error(
          `Expected legend-text to contain "Personal details", got "${legendText?.textContent}"`,
        )
      }
    })

    it('updates legend-text when legend attribute changes', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-fieldset legend="Old legend">Content</fluid-fieldset>',
      )
      el.setAttribute('legend', 'New legend')
      await new Promise<void>(r => requestAnimationFrame(r))
      const legendText = el.shadowRoot!.querySelector('[part="legend-text"]') as HTMLElement | null
      if (legendText?.textContent !== 'New legend') {
        throw new Error(`Expected legend-text to update to "New legend", got "${legendText?.textContent}"`)
      }
    })

    it('generates a stable non-empty id on [part="legend"]', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-fieldset legend="Preferences">Content</fluid-fieldset>',
      )
      const legendEl = el.shadowRoot!.querySelector('[part="legend"]')!
      if (!legendEl.id || legendEl.id.trim() === '') {
        throw new Error('Expected [part="legend"] to have a non-empty id')
      }
    })
  })

  // ─── Disabled context propagation ──────────────────────────────────────────

  describe('disabled context propagation', () => {
    it('provides DISABLED_CONTEXT_KEY=true when disabled attribute is set', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-fieldset legend="Form" disabled></fluid-fieldset>',
      )
      let contextValue: boolean | undefined
      const child = document.createElement('div')
      el.appendChild(child)
      child.dispatchEvent(
        new CustomEvent('fluid:context-request', {
          detail: {
            contextKey: DISABLED_CONTEXT_KEY,
            callback: (v: boolean) => { contextValue = v },
          },
          bubbles: true,
          composed: false,
        }),
      )
      if (contextValue !== true) {
        throw new Error(`Expected DISABLED_CONTEXT_KEY to provide true, got ${contextValue}`)
      }
    })

    it('provides DISABLED_CONTEXT_KEY=false when disabled attribute is removed', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-fieldset legend="Form" disabled></fluid-fieldset>',
      )
      el.removeAttribute('disabled')
      await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(r)))

      let contextValue: boolean | undefined
      const child = document.createElement('div')
      el.appendChild(child)
      child.dispatchEvent(
        new CustomEvent('fluid:context-request', {
          detail: {
            contextKey: DISABLED_CONTEXT_KEY,
            callback: (v: boolean) => { contextValue = v },
          },
          bubbles: true,
          composed: false,
        }),
      )
      if (contextValue !== false) {
        throw new Error(
          `Expected DISABLED_CONTEXT_KEY to provide false after removing disabled, got ${contextValue}`,
        )
      }
    })

    it('pushes updated DISABLED_CONTEXT_KEY to subscribed consumers when disabled changes', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-fieldset legend="Form"></fluid-fieldset>',
      )
      const values: boolean[] = []
      const child = document.createElement('div')
      el.appendChild(child)

      // Pull + subscribe to future pushes
      requestContext<boolean>(child, DISABLED_CONTEXT_KEY, (v) => values.push(v), true)

      el.setAttribute('disabled', '')
      await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      // Push: disabled=true

      el.removeAttribute('disabled')
      await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      // Push: disabled=false

      if (values.length !== 3 || values[0] !== false || values[1] !== true || values[2] !== false) {
        throw new Error(
          `Expected push sequence [false, true, false], got ${JSON.stringify(values)}`,
        )
      }
    })

    it('does not intercept context requests for other keys', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-fieldset legend="Form" disabled></fluid-fieldset>',
      )
      let called = false
      const child = document.createElement('div')
      const wrapper = document.createElement('div')
      wrapper.addEventListener('fluid:context-request', (e: Event) => {
        const ce = e as CustomEvent<{ contextKey: string; callback: () => void }>
        if (ce.detail.contextKey === 'some:other-key') {
          called = true
        }
      })
      wrapper.appendChild(el)
      el.appendChild(child)
      child.dispatchEvent(
        new CustomEvent('fluid:context-request', {
          detail: { contextKey: 'some:other-key', callback: () => {} },
          bubbles: true,
          composed: false,
        }),
      )
      if (!called) {
        throw new Error('Expected context request for other key to bubble past fieldset')
      }
      wrapper.remove()
    })
  })

  // ─── Tier rendering ────────────────────────────────────────────────────────

  describe('tier rendering', () => {
    for (const tier of ['matte', 'frosted', 'crystalline', 'optical'] as const) {
      it(`renders without error at ${tier} tier`, async () => {
        FluidTestUtils.mockTier(tier)
        const el = await FluidTestUtils.mount(
          '<fluid-fieldset legend="Settings">Content</fluid-fieldset>',
        )
        if (!el.shadowRoot) {
          throw new Error(`Expected shadow root at ${tier} tier`)
        }
        const fieldsetEl = el.shadowRoot.querySelector('[part="fieldset"]')
        if (!fieldsetEl) {
          throw new Error(`Expected [part="fieldset"] at ${tier} tier`)
        }
      })
    }
  })

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  describe('lifecycle', () => {
    it('fires fluid:mounted event after connectedCallback', async () => {
      // Add listener BEFORE connecting to the DOM so we don't miss the synchronous dispatch
      let mounted = false
      const el = document.createElement('fluid-fieldset')
      el.setAttribute('legend', 'Test')
      el.textContent = 'Content'
      el.addEventListener('fluid:mounted', () => { mounted = true }, { once: true })
      const container = document.createElement('div')
      document.body.appendChild(container)
      container.appendChild(el)
      await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      container.remove()
      if (!mounted) throw new Error('Expected fluid:mounted to fire after connectedCallback')
    })

    it('cleans up context listener on disconnect', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-fieldset legend="Form" disabled></fluid-fieldset>',
      )
      // Disconnect — disposers (including context listener) are called
      el.remove()

      // Verify: dispatching from a child in the disconnected tree should NOT call callback
      // because the listener was removed during disconnectedCallback
      let callbackCalled = false
      const child = document.createElement('div')
      el.appendChild(child)  // el is disconnected — no connectedCallback fires
      child.dispatchEvent(
        new CustomEvent('fluid:context-request', {
          detail: { contextKey: DISABLED_CONTEXT_KEY, callback: () => { callbackCalled = true } },
          bubbles: true,
          composed: false,
        }),
      )
      if (callbackCalled) {
        throw new Error('Expected context listener to be removed after disconnect')
      }
    })
  })

  // ─── Accessibility ─────────────────────────────────────────────────────────

  describe('accessibility', () => {
    function waitFrames(n = 30): Promise<void> {
      return new Promise(resolve => {
        let remaining = n
        function tick() { if (--remaining <= 0) resolve(); else requestAnimationFrame(tick) }
        requestAnimationFrame(tick)
      })
    }

    it('passes axe-core in default (enabled) state', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-fieldset legend="Personal information">Content</fluid-fieldset>',
      )
      await waitFrames(30)
      await FluidAccessibilityUtils.assertAccessible(el)
    })

    it('passes axe-core in disabled state', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-fieldset legend="Personal information" disabled>Content</fluid-fieldset>',
      )
      await waitFrames(30)
      await FluidAccessibilityUtils.assertAccessible(el)
    })
  })
})
