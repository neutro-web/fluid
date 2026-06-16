import { FluidTestUtils } from '../../testing/utils'
import { FluidAccessibilityUtils } from '../../testing/accessibility'

import './index'

describe('fluid-visually-hidden', () => {
  afterEach(() => {
    FluidTestUtils.cleanup()
    FluidTestUtils.restoreTier()
  })

  // ─── Visibility ───────────────────────────────────────────────────────────

  describe('visibility', () => {
    it('clips painted area to 1×1 px via bounding rect', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-visually-hidden>Screen reader only text</fluid-visually-hidden>'
      )
      const rect = el.getBoundingClientRect()
      if (rect.width > 1 || rect.height > 1) {
        throw new Error(
          `Expected bounding rect ≤ 1×1 px, got ${rect.width}×${rect.height}`
        )
      }
    })

    it('does not use display:none or visibility:hidden (keeps content in a11y tree)', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-visually-hidden>Screen reader only text</fluid-visually-hidden>'
      )
      const styles = window.getComputedStyle(el)
      if (styles.display === 'none') {
        throw new Error('Expected display !== none on fluid-visually-hidden host')
      }
      if (styles.visibility === 'hidden') {
        throw new Error('Expected visibility !== hidden on fluid-visually-hidden host')
      }
    })

    it('does not set aria-hidden on the host', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-visually-hidden>Screen reader only text</fluid-visually-hidden>'
      )
      if (el.getAttribute('aria-hidden') === 'true') {
        throw new Error('Expected aria-hidden not set on fluid-visually-hidden host')
      }
    })
  })

  // ─── Accessibility tree ───────────────────────────────────────────────────

  describe('accessibility tree', () => {
    it('passes axe-core with text content as direct child', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-visually-hidden>Activate account</fluid-visually-hidden>'
      )
      await FluidAccessibilityUtils.assertAccessible(el)
    })

    it('passes axe-core when used alongside a visible element', async () => {
      const container = await FluidTestUtils.mount(`
        <div>
          <button>
            <span aria-hidden="true">★</span>
            <fluid-visually-hidden>Add to favourites</fluid-visually-hidden>
          </button>
        </div>
      `)
      await FluidAccessibilityUtils.assertAccessible(container)
    })

    it('slotted text contributes to the accessible name of a wrapping button', async () => {
      const btn = await FluidTestUtils.mount(
        '<button type="button"><fluid-visually-hidden>Submit application</fluid-visually-hidden></button>'
      )
      // computedAccessibleName is AOM Phase 1 (Chrome 95+). The Chromium test runner
      // supports it; textContent is the fallback and also traverses light-DOM descendants.
      type WithAOM = Element & { computedAccessibleName?: string }
      const name =
        (btn as WithAOM).computedAccessibleName ??
        btn.textContent?.trim() ??
        ''
      if (!name.includes('Submit application')) {
        throw new Error(
          `Expected button accessible name to include "Submit application", got "${name}"`
        )
      }
    })
  })

  // ─── ARIA role ────────────────────────────────────────────────────────────

  describe('ARIA role', () => {
    it('has no role attribute on the host element', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-visually-hidden>Label</fluid-visually-hidden>'
      )
      if (el.getAttribute('role') !== null) {
        throw new Error(
          `Expected no role attribute on host, got "${el.getAttribute('role')}"`
        )
      }
    })
  })

  // ─── Light DOM structure ──────────────────────────────────────────────────

  describe('light DOM structure', () => {
    it('applies sr-only positioning via global stylesheet (no shadow root)', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-visually-hidden>Label</fluid-visually-hidden>'
      )
      if (el.shadowRoot) {
        throw new Error('Expected no shadow root — fluid-visually-hidden is a light DOM element')
      }
      const computed = window.getComputedStyle(el)
      if (computed.position !== 'absolute') {
        throw new Error(`Expected position:absolute from global stylesheet, got "${computed.position}"`)
      }
      if (computed.overflow !== 'hidden') {
        throw new Error(`Expected overflow:hidden from global stylesheet, got "${computed.overflow}"`)
      }
    })

    it('children are direct light-DOM descendants addressable from the document', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-visually-hidden><span id="vh-light">Screen reader text</span></fluid-visually-hidden>'
      )
      const found = document.getElementById('vh-light')
      if (!found) {
        throw new Error('Expected child to be reachable via document.getElementById (light DOM, no slot boundary)')
      }
      if (found.parentElement !== el) {
        throw new Error('Expected child to be a direct child of fluid-visually-hidden')
      }
    })
  })

  // ─── Tier compatibility ───────────────────────────────────────────────────

  describe('tier compatibility', () => {
    for (const tier of ['matte', 'frosted', 'crystalline', 'optical'] as const) {
      it(`renders without error at tier: ${tier}`, async () => {
        FluidTestUtils.mockTier(tier)
        const el = await FluidTestUtils.mount(
          `<fluid-visually-hidden>Label at ${tier}</fluid-visually-hidden>`
        )
        const rect = el.getBoundingClientRect()
        if (rect.width > 1 || rect.height > 1) {
          throw new Error(
            `At tier "${tier}": expected bounding rect ≤ 1×1 px, got ${rect.width}×${rect.height}`
          )
        }
      })
    }
  })
})
