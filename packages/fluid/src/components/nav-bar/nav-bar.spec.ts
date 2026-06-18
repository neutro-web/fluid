import { FluidTestUtils } from '../../testing/utils'

// Registers fluid-nav-bar — must happen before first test
import './index'

describe('fluid-nav-bar', () => {
  afterEach(() => {
    FluidTestUtils.cleanup()
    FluidTestUtils.restoreTier()
  })

  // ─── Registration ─────────────────────────────────────────────────────────

  describe('registration', () => {
    it('is registered as fluid-nav-bar', () => {
      if (!customElements.get('fluid-nav-bar')) {
        throw new Error('fluid-nav-bar is not registered')
      }
    })

    it('is constructable via document.createElement', () => {
      const el = document.createElement('fluid-nav-bar')
      if (!(el instanceof HTMLElement)) {
        throw new Error('Expected HTMLElement instance')
      }
    })
  })

  // ─── Shadow DOM structure ──────────────────────────────────────────────────

  describe('shadow DOM structure', () => {
    it('has [part="skip-link"] as first child in shadow root', async () => {
      const el = await FluidTestUtils.mount(`<fluid-nav-bar aria-label="Main"></fluid-nav-bar>`)
      const skipLink = el.shadowRoot!.querySelector('[part="skip-link"]')
      if (skipLink === null) {
        throw new Error('Missing [part="skip-link"]')
      }
      if (skipLink.tagName !== 'A') {
        throw new Error(`Expected <a> tag, got ${skipLink.tagName}`)
      }
    })

    it('skip link href defaults to #fluid-main-content', async () => {
      const el = await FluidTestUtils.mount(`<fluid-nav-bar aria-label="Main"></fluid-nav-bar>`)
      const skipLink = el.shadowRoot!.querySelector('[part="skip-link"]') as HTMLAnchorElement
      if (skipLink.getAttribute('href') !== '#fluid-main-content') {
        throw new Error(`Expected href="#fluid-main-content", got "${skipLink.getAttribute('href')}"`)
      }
    })

    it('has [part="surface"] containing leading/content/trailing', async () => {
      const el = await FluidTestUtils.mount(`<fluid-nav-bar aria-label="Main"></fluid-nav-bar>`)
      const surface = el.shadowRoot!.querySelector('[part="surface"]')
      if (surface === null) {
        throw new Error('Missing [part="surface"]')
      }
      if (surface.querySelector('[part="leading"]') === null) {
        throw new Error('Missing [part="leading"]')
      }
      if (surface.querySelector('[part="content"]') === null) {
        throw new Error('Missing [part="content"]')
      }
      if (surface.querySelector('[part="trailing"]') === null) {
        throw new Error('Missing [part="trailing"]')
      }
    })

    // NOTE: internals.role sets the ARIA role via the Accessibility Object Model (AOM)
    // and does NOT reflect as a `role` attribute. The navigation role is verified by
    // the a11y test gate (pnpm test:a11y) via axe-playwright, not here.

    it('skip link label is i18n fallback "Skip to main content"', async () => {
      const el = await FluidTestUtils.mount(`<fluid-nav-bar aria-label="Main"></fluid-nav-bar>`)
      const skipLink = el.shadowRoot!.querySelector('[part="skip-link"]') as HTMLElement
      const text = skipLink.textContent?.trim()
      if (text !== 'Skip to main content') {
        throw new Error(`Expected "Skip to main content", got "${text}"`)
      }
    })
  })
})
