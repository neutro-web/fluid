import { FluidTestUtils } from '../../testing/utils'
import { FluidAccessibilityUtils } from '../../testing/accessibility'
import './index'

describe('fluid-skeleton', () => {
  afterEach(() => {
    FluidTestUtils.cleanup()
    FluidTestUtils.restoreTier()
  })

  // ─── ARIA ─────────────────────────────────────────────────────────────────────

  describe('ARIA', () => {
    it('has aria-hidden="true" on host', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-skeleton width="200px" height="20px"></fluid-skeleton>'
      )
      if (el.getAttribute('aria-hidden') !== 'true') {
        throw new Error(
          `Expected aria-hidden="true" on host, got "${el.getAttribute('aria-hidden')}"`
        )
      }
    })

    it('has tabindex="-1" on host', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-skeleton width="200px" height="20px"></fluid-skeleton>'
      )
      if (el.getAttribute('tabindex') !== '-1') {
        throw new Error(
          `Expected tabindex="-1" on host, got "${el.getAttribute('tabindex')}"`
        )
      }
    })

    it('passes axe-core in default state', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-skeleton width="200px" height="20px"></fluid-skeleton>'
      )
      await FluidAccessibilityUtils.assertAccessible(el)
    })
  })

  // ─── Shadow DOM structure ──────────────────────────────────────────────────────

  describe('shadow DOM structure', () => {
    it('has [part="surface"] in shadow root', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-skeleton width="200px" height="20px"></fluid-skeleton>'
      )
      const surface = el.shadowRoot?.querySelector('[part="surface"]')
      if (!surface) {
        throw new Error('Expected [part="surface"] inside shadow root')
      }
    })

    it('has a shadow root (not light DOM)', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-skeleton width="200px" height="20px"></fluid-skeleton>'
      )
      if (!el.shadowRoot) {
        throw new Error('Expected fluid-skeleton to have an open shadow root')
      }
    })

    it('has a default slot in shadow root', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-skeleton width="200px" height="20px"></fluid-skeleton>'
      )
      const slot = el.shadowRoot?.querySelector('slot')
      if (!slot) {
        throw new Error('Expected default <slot> inside shadow root')
      }
    })
  })

  // ─── Attributes ───────────────────────────────────────────────────────────────

  describe('attributes', () => {
    it('applies width attribute as inline style', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-skeleton width="320px" height="20px"></fluid-skeleton>'
      )
      if (el.style.width !== '320px') {
        throw new Error(
          `Expected style.width="320px", got "${el.style.width}"`
        )
      }
    })

    it('applies height attribute as inline style', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-skeleton width="200px" height="48px"></fluid-skeleton>'
      )
      if (el.style.height !== '48px') {
        throw new Error(
          `Expected style.height="48px", got "${el.style.height}"`
        )
      }
    })

    it('defaults width to "100%"', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-skeleton height="20px"></fluid-skeleton>'
      )
      if (el.style.width !== '100%') {
        throw new Error(
          `Expected default style.width="100%", got "${el.style.width}"`
        )
      }
    })

    it('defaults height to "40px" for rectangular variant', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-skeleton></fluid-skeleton>'
      )
      if (el.style.height !== '40px') {
        throw new Error(
          `Expected default style.height="40px" for rectangular, got "${el.style.height}"`
        )
      }
    })

    it('defaults height to "1em" for text variant', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-skeleton variant="text"></fluid-skeleton>'
      )
      if (el.style.height !== '1em') {
        throw new Error(
          `Expected default style.height="1em" for text variant, got "${el.style.height}"`
        )
      }
    })

    it('reflects variant="circular" to data-variant', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-skeleton variant="circular" width="48px" height="48px"></fluid-skeleton>'
      )
      if (el.getAttribute('data-variant') !== 'circular') {
        throw new Error(
          `Expected data-variant="circular", got "${el.getAttribute('data-variant')}"`
        )
      }
    })

    it('defaults variant to "rectangular"', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-skeleton width="200px" height="20px"></fluid-skeleton>'
      )
      if (el.getAttribute('data-variant') !== 'rectangular') {
        throw new Error(
          `Expected default data-variant="rectangular", got "${el.getAttribute('data-variant')}"`
        )
      }
    })

    it('updates variant when attribute changes', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-skeleton width="200px" height="20px"></fluid-skeleton>'
      )
      el.setAttribute('variant', 'text')
      await new Promise<void>(r => requestAnimationFrame(() => r()))
      if (el.getAttribute('data-variant') !== 'text') {
        throw new Error(
          `Expected data-variant="text" after setAttribute, got "${el.getAttribute('data-variant')}"`
        )
      }
    })

    it('updates dimensions when attributes change', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-skeleton width="100px" height="20px"></fluid-skeleton>'
      )
      el.setAttribute('width', '500px')
      await new Promise<void>(r => requestAnimationFrame(() => r()))
      if (el.style.width !== '500px') {
        throw new Error(
          `Expected style.width="500px" after setAttribute, got "${el.style.width}"`
        )
      }
    })
  })

  // ─── Animate attribute ─────────────────────────────────────────────────────────

  describe('animate attribute', () => {
    it('sets data-shimmer by default at Frosted+ tier', async () => {
      FluidTestUtils.mockTier('frosted')
      const el = await FluidTestUtils.mount(
        '<fluid-skeleton width="200px" height="20px"></fluid-skeleton>'
      )
      if (!el.hasAttribute('data-shimmer')) {
        throw new Error('Expected data-shimmer to be set by default at Frosted tier')
      }
    })

    it('does not set data-shimmer at Matte tier', async () => {
      FluidTestUtils.mockTier('matte')
      const el = await FluidTestUtils.mount(
        '<fluid-skeleton width="200px" height="20px"></fluid-skeleton>'
      )
      if (el.hasAttribute('data-shimmer')) {
        throw new Error('Expected data-shimmer to be absent at Matte tier')
      }
    })

    it('removes data-shimmer when animate attribute is removed at Frosted+ tier', async () => {
      FluidTestUtils.mockTier('frosted')
      const el = await FluidTestUtils.mount(
        '<fluid-skeleton width="200px" height="20px"></fluid-skeleton>'
      )
      if (!el.hasAttribute('data-shimmer')) {
        throw new Error('Precondition: data-shimmer should be set')
      }
      el.removeAttribute('animate')
      if (el.hasAttribute('data-shimmer')) {
        throw new Error('Expected data-shimmer to be removed after removeAttribute("animate")')
      }
    })
  })

  // ─── Lines attribute ───────────────────────────────────────────────────────────

  describe('lines attribute', () => {
    it('renders multiple [part="line"] elements when variant="text" and lines > 1', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-skeleton variant="text" lines="3"></fluid-skeleton>'
      )
      const surface = el.shadowRoot!.querySelector('[part="surface"]') as HTMLElement
      const lines = surface.querySelectorAll('[part="line"]')
      if (lines.length !== 3) {
        throw new Error(`Expected 3 [part="line"] elements, got ${lines.length}`)
      }
    })

    it('last line has width 60% for multi-line text', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-skeleton variant="text" lines="3"></fluid-skeleton>'
      )
      const surface = el.shadowRoot!.querySelector('[part="surface"]') as HTMLElement
      const lines = surface.querySelectorAll('[part="line"]')
      const last = lines[lines.length - 1] as HTMLElement
      if (last.style.width !== '60%') {
        throw new Error(`Expected last line width="60%", got "${last.style.width}"`)
      }
    })

    it('does not render line elements for non-text variants', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-skeleton variant="rectangular" lines="3"></fluid-skeleton>'
      )
      const surface = el.shadowRoot!.querySelector('[part="surface"]') as HTMLElement
      const lines = surface.querySelectorAll('[part="line"]')
      if (lines.length !== 0) {
        throw new Error(`Expected 0 [part="line"] for rectangular variant, got ${lines.length}`)
      }
    })
  })

  // ─── Tier compatibility ────────────────────────────────────────────────────────

  describe('tier compatibility', () => {
    for (const tier of ['matte', 'frosted', 'crystalline', 'optical'] as const) {
      it(`renders without error at tier: ${tier}`, async () => {
        FluidTestUtils.mockTier(tier)
        const el = await FluidTestUtils.mount(
          `<fluid-skeleton width="200px" height="20px"></fluid-skeleton>`
        )
        if (!el.shadowRoot) {
          throw new Error(`At tier "${tier}": expected shadow root to exist`)
        }
        const surface = el.shadowRoot.querySelector('[part="surface"]')
        if (!surface) {
          throw new Error(
            `At tier "${tier}": expected [part="surface"] inside shadow root`
          )
        }
      })
    }
  })
})
