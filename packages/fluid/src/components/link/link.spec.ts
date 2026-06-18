import { FluidTestUtils } from '../../testing/utils'
import { FluidAccessibilityUtils } from '../../testing/accessibility'

// Registers fluid-link — must happen before first test
import './index'

const ICON_SVG = `<svg slot="icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
  <path d="M4 8h8M10 6l2 2-2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function waitFrames(n = 2): Promise<void> {
  return new Promise(resolve => {
    let remaining = n
    function tick() { if (--remaining <= 0) resolve(); else requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
  })
}

describe('fluid-link', () => {
  afterEach(() => {
    FluidTestUtils.cleanup()
    FluidTestUtils.restoreTier()
  })

  // ─── href attribute ──────────────────────────────────────────────────────

  describe('href attribute', () => {
    it('sets href on inner anchor', async () => {
      const el = await FluidTestUtils.mount(`<fluid-link href="/about">About</fluid-link>`)
      const anchor = el.shadowRoot!.querySelector('a')!
      assert(anchor.getAttribute('href') === '/about', `Expected href="/about" but got "${anchor.getAttribute('href')}"`)
    })

    it('reflects href property', async () => {
      const el = await FluidTestUtils.mount(`<fluid-link href="/about">About</fluid-link>`) as any
      assert(el.href === '/about', `Expected el.href === "/about" but got "${el.href}"`)
    })

    it('updates inner anchor when href attribute changes', async () => {
      const el = await FluidTestUtils.mount(`<fluid-link href="/about">About</fluid-link>`)
      const anchor = el.shadowRoot!.querySelector('a')!
      el.setAttribute('href', '/contact')
      assert(anchor.getAttribute('href') === '/contact', `Expected href to update to "/contact"`)
    })

    it('fires fluid:activate with href on click', async () => {
      const el = await FluidTestUtils.mount(`<fluid-link href="/about">About</fluid-link>`)
      const events: CustomEvent[] = []
      el.addEventListener('fluid:activate', (e) => events.push(e as CustomEvent))
      const anchor = el.shadowRoot!.querySelector('a')!
      anchor.addEventListener('click', (e) => e.preventDefault(), { capture: true, once: true })
      anchor.click()
      assert(events.length === 1, `Expected 1 fluid:activate event, got ${events.length}`)
      assert(events[0].detail.href === '/about', `Expected detail.href="/about" but got "${events[0].detail.href}"`)
      assert(events[0].bubbles === true, 'Expected bubbles=true')
      assert(events[0].composed === true, 'Expected composed=true')
    })
  })

  // ─── no href (JS-nav) ───────────────────────────────────────────────────

  describe('no href (JS-driven navigation)', () => {
    it('renders anchor still focusable with role="link" and tabindex="0"', async () => {
      const el = await FluidTestUtils.mount(`<fluid-link>Go</fluid-link>`)
      const anchor = el.shadowRoot!.querySelector('a')!
      assert(anchor.getAttribute('role') === 'link', 'Expected role="link" on href-less anchor')
      assert(anchor.getAttribute('tabindex') === '0', 'Expected tabindex="0" on href-less anchor')
      assert(!anchor.hasAttribute('href'), 'Expected no href attribute on href-less link')
    })

    it('fires fluid:activate with href=null on click', async () => {
      const el = await FluidTestUtils.mount(`<fluid-link>Go</fluid-link>`)
      const events: CustomEvent[] = []
      el.addEventListener('fluid:activate', (e) => events.push(e as CustomEvent))
      const anchor = el.shadowRoot!.querySelector('a')!
      anchor.addEventListener('click', (e) => e.preventDefault(), { capture: true, once: true })
      anchor.click()
      assert(events.length === 1, `Expected 1 event, got ${events.length}`)
      assert(events[0].detail.href === null, `Expected detail.href=null but got "${events[0].detail.href}"`)
    })
  })

  // ─── target="_blank" security ────────────────────────────────────────────

  describe('target="_blank"', () => {
    it('applies rel="noopener noreferrer" automatically', async () => {
      const el = await FluidTestUtils.mount(`<fluid-link href="https://example.com" target="_blank">Ext</fluid-link>`)
      const anchor = el.shadowRoot!.querySelector('a')!
      assert(anchor.getAttribute('target') === '_blank', 'Expected target="_blank"')
      assert(anchor.getAttribute('rel') === 'noopener noreferrer', `Expected rel="noopener noreferrer" but got "${anchor.getAttribute('rel')}"`)
    })

    it('does not set rel="noopener noreferrer" for other targets', async () => {
      const el = await FluidTestUtils.mount(`<fluid-link href="/page" target="_self">Page</fluid-link>`)
      const anchor = el.shadowRoot!.querySelector('a')!
      const rel = anchor.getAttribute('rel')
      assert(rel !== 'noopener noreferrer', `Expected no noopener rel for _self target but got "${rel}"`)
    })
  })

  // ─── current attribute ───────────────────────────────────────────────────

  describe('current attribute', () => {
    it('adds aria-current="page" when current is present', async () => {
      const el = await FluidTestUtils.mount(`<fluid-link href="/" current>Home</fluid-link>`)
      const anchor = el.shadowRoot!.querySelector('a')!
      assert(anchor.getAttribute('aria-current') === 'page', `Expected aria-current="page" but got "${anchor.getAttribute('aria-current')}"`)
    })

    it('removes aria-current when current is absent', async () => {
      const el = await FluidTestUtils.mount(`<fluid-link href="/">Home</fluid-link>`)
      const anchor = el.shadowRoot!.querySelector('a')!
      assert(!anchor.hasAttribute('aria-current'), 'Expected no aria-current when current is absent')
    })

    it('removes aria-current when current attribute is removed', async () => {
      const el = await FluidTestUtils.mount(`<fluid-link href="/" current>Home</fluid-link>`)
      const anchor = el.shadowRoot!.querySelector('a')!
      el.removeAttribute('current')
      assert(!anchor.hasAttribute('aria-current'), 'Expected aria-current removed when current removed')
    })

    it('reflects current property', async () => {
      const el = await FluidTestUtils.mount(`<fluid-link href="/" current>Home</fluid-link>`) as any
      assert(el.current === true, `Expected el.current === true but got ${el.current}`)
    })
  })

  // ─── disabled state ──────────────────────────────────────────────────────

  describe('disabled state', () => {
    it('sets aria-disabled="true" on inner anchor', async () => {
      const el = await FluidTestUtils.mount(`<fluid-link disabled>Link</fluid-link>`)
      const anchor = el.shadowRoot!.querySelector('a')!
      assert(anchor.getAttribute('aria-disabled') === 'true', `Expected aria-disabled="true" but got "${anchor.getAttribute('aria-disabled')}"`)
    })

    it('removes href from inner anchor when disabled', async () => {
      const el = await FluidTestUtils.mount(`<fluid-link href="/about" disabled>Link</fluid-link>`)
      const anchor = el.shadowRoot!.querySelector('a')!
      assert(!anchor.hasAttribute('href'), 'Expected href removed when disabled')
    })

    it('removes tabindex (sets -1) when disabled', async () => {
      const el = await FluidTestUtils.mount(`<fluid-link disabled>Link</fluid-link>`)
      const anchor = el.shadowRoot!.querySelector('a')!
      assert(anchor.getAttribute('tabindex') === '-1', `Expected tabindex="-1" when disabled but got "${anchor.getAttribute('tabindex')}"`)
    })

    it('does not fire fluid:activate when disabled', async () => {
      const el = await FluidTestUtils.mount(`<fluid-link href="/about" disabled>Link</fluid-link>`)
      const events: CustomEvent[] = []
      el.addEventListener('fluid:activate', (e) => events.push(e as CustomEvent))
      const anchor = el.shadowRoot!.querySelector('a')!
      anchor.addEventListener('click', (e) => e.preventDefault(), { capture: true, once: true })
      anchor.click()
      assert(events.length === 0, `Expected no fluid:activate when disabled but got ${events.length}`)
    })

    it('reflects disabled property', async () => {
      const el = await FluidTestUtils.mount(`<fluid-link disabled>Link</fluid-link>`) as any
      assert(el.disabled === true, `Expected el.disabled === true but got ${el.disabled}`)
    })
  })

  // ─── dev warnings ────────────────────────────────────────────────────────

  describe('dev warnings', () => {
    it('warns when default slot is empty', async () => {
      const warnings: string[] = []
      const orig = console.warn
      console.warn = (...args: any[]) => warnings.push(args.join(' '))
      await FluidTestUtils.mount(`<fluid-link href="/about"></fluid-link>`)
      await waitFrames(3)
      console.warn = orig
      const found = warnings.some(w => w.includes('fluid-link requires content in the default slot'))
      assert(found, `Expected empty-slot warning. Got: ${warnings.join('; ')}`)
    })

    it('warns when icon-only with no aria-label', async () => {
      const warnings: string[] = []
      const orig = console.warn
      console.warn = (...args: any[]) => warnings.push(args.join(' '))
      await FluidTestUtils.mount(`<fluid-link href="/about">${ICON_SVG}</fluid-link>`)
      await waitFrames(3)
      console.warn = orig
      const found = warnings.some(w => w.includes('provide aria-label for an icon-only link'))
      assert(found, `Expected icon-only warning. Got: ${warnings.join('; ')}`)
    })

    it('does not warn about icon-only when host has aria-label', async () => {
      const warnings: string[] = []
      const orig = console.warn
      console.warn = (...args: any[]) => warnings.push(args.join(' '))
      await FluidTestUtils.mount(`<fluid-link href="/about" aria-label="Home">${ICON_SVG}</fluid-link>`)
      await waitFrames(3)
      console.warn = orig
      const iconOnlyWarnings = warnings.filter(w => w.includes('provide aria-label for an icon-only link'))
      assert(iconOnlyWarnings.length === 0, `Expected no icon-only warning when aria-label set. Got: ${iconOnlyWarnings.join('; ')}`)
    })
  })

  // ─── keyboard activation ─────────────────────────────────────────────────

  describe('keyboard activation', () => {
    it('fires fluid:activate on Enter key', async () => {
      const el = await FluidTestUtils.mount(`<fluid-link href="/about">About</fluid-link>`)
      const events: CustomEvent[] = []
      el.addEventListener('fluid:activate', (e) => events.push(e as CustomEvent))
      const anchor = el.shadowRoot!.querySelector('a')!
      anchor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      assert(events.length === 1, `Expected 1 fluid:activate on Enter, got ${events.length}`)
      assert(events[0].detail.href === '/about', `Expected detail.href="/about" but got "${events[0].detail.href}"`)
    })

    it('does not fire fluid:activate on Enter when disabled', async () => {
      const el = await FluidTestUtils.mount(`<fluid-link href="/about" disabled>About</fluid-link>`)
      const events: CustomEvent[] = []
      el.addEventListener('fluid:activate', (e) => events.push(e as CustomEvent))
      const anchor = el.shadowRoot!.querySelector('a')!
      anchor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      assert(events.length === 0, `Expected no fluid:activate on Enter when disabled`)
    })
  })

  // ─── no tier behavior ────────────────────────────────────────────────────

  describe('no tier behavior', () => {
    const TIERS = ['matte', 'frosted', 'crystalline', 'optical'] as const

    TIERS.forEach(tier => {
      it(`renders identically at tier="${tier}" — shadow DOM structure present`, async () => {
        FluidTestUtils.mockTier(tier)
        const el = await FluidTestUtils.mount(`<fluid-link href="/page">Link</fluid-link>`)
        const anchor = el.shadowRoot!.querySelector('a')
        assert(anchor !== null, `Expected anchor element at tier="${tier}"`)
        assert(anchor!.getAttribute('href') === '/page', `Expected href="/page" at tier="${tier}"`)
      })
    })

    it('does not register a fluidledger:tier-change listener', async () => {
      let tierListenerCount = 0
      const origAdd = document.addEventListener.bind(document)
      const spy = (type: string, ...args: any[]) => {
        if (type === 'fluidledger:tier-change') tierListenerCount++
        return origAdd(type, ...(args as [any]))
      }
      document.addEventListener = spy as any

      await FluidTestUtils.mount(`<fluid-link href="/page">Link</fluid-link>`)

      document.addEventListener = origAdd

      assert(tierListenerCount === 0, `Expected 0 fluidledger:tier-change listeners, got ${tierListenerCount}`)
    })
  })

  // ─── accessibility (axe-core) ────────────────────────────────────────────

  describe('accessibility (axe-core)', () => {
    it('passes axe on default link with href', async () => {
      const el = await FluidTestUtils.mount(`<fluid-link href="/about">About</fluid-link>`)
      await FluidAccessibilityUtils.assertAccessible(el)
    })

    it('passes axe on link with current inside a nav', async () => {
      const nav = await FluidTestUtils.mount(`<nav><fluid-link href="/" current>Home</fluid-link></nav>`)
      await FluidAccessibilityUtils.assertAccessible(nav)
    })

    it('passes axe on disabled link', async () => {
      const el = await FluidTestUtils.mount(`<fluid-link disabled>Disabled</fluid-link>`)
      await FluidAccessibilityUtils.assertAccessible(el)
    })

    it('passes axe on icon-only link with aria-label', async () => {
      const el = await FluidTestUtils.mount(
        `<fluid-link href="/home" aria-label="Home">${ICON_SVG}</fluid-link>`
      )
      await FluidAccessibilityUtils.assertAccessible(el)
    })
  })
})
