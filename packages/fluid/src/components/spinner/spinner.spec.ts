import { FluidTestUtils } from '../../testing/utils'
import { FluidAccessibilityUtils } from '../../testing/accessibility'
import './index'

function waitFrames(n = 3): Promise<void> {
  return new Promise(resolve => {
    let remaining = n
    function tick() {
      if (--remaining <= 0) resolve()
      else requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}

describe('fluid-spinner', () => {
  afterEach(() => {
    FluidTestUtils.cleanup()
    FluidTestUtils.restoreTier()
  })

  // ─── ARIA ─────────────────────────────────────────────────────────────────

  describe('ARIA', () => {
    it('has role="status" on host', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-spinner></fluid-spinner>'
      )
      if (el.getAttribute('role') !== 'status') {
        throw new Error(
          `Expected role="status" on host, got "${el.getAttribute('role')}"`
        )
      }
    })

    it('has tabindex="-1" on host', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-spinner></fluid-spinner>'
      )
      if (el.getAttribute('tabindex') !== '-1') {
        throw new Error(
          `Expected tabindex="-1" on host, got "${el.getAttribute('tabindex')}"`
        )
      }
    })

    it('has aria-label="Loading" by default', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-spinner></fluid-spinner>'
      )
      if (el.getAttribute('aria-label') !== 'Loading') {
        throw new Error(
          `Expected aria-label="Loading" by default, got "${el.getAttribute('aria-label')}"`
        )
      }
    })

    it('uses label attribute as aria-label', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-spinner label="Uploading file"></fluid-spinner>'
      )
      if (el.getAttribute('aria-label') !== 'Uploading file') {
        throw new Error(
          `Expected aria-label="Uploading file", got "${el.getAttribute('aria-label')}"`
        )
      }
    })

    it('falls back to "Loading" when label attribute is absent', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-spinner></fluid-spinner>'
      )
      if (el.getAttribute('aria-label') !== 'Loading') {
        throw new Error(
          `Expected aria-label="Loading" fallback, got "${el.getAttribute('aria-label')}"`
        )
      }
    })

    it('updates aria-label when label attribute changes', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-spinner label="Loading"></fluid-spinner>'
      )
      el.setAttribute('label', 'Processing')
      if (el.getAttribute('aria-label') !== 'Processing') {
        throw new Error(
          `Expected aria-label="Processing" after setAttribute, got "${el.getAttribute('aria-label')}"`
        )
      }
    })

    it('has aria-live="polite" on [part="track"]', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-spinner></fluid-spinner>'
      )
      const track = el.shadowRoot!.querySelector('[part="track"]')
      if (!track) {
        throw new Error('Expected [part="track"] in shadow DOM')
      }
      if (track.getAttribute('aria-live') !== 'polite') {
        throw new Error(
          `Expected aria-live="polite" on [part="track"], got "${track.getAttribute('aria-live')}"`
        )
      }
    })

    it('passes axe-core in default state', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-spinner></fluid-spinner>'
      )
      await FluidAccessibilityUtils.assertAccessible(el)
    })

    it('passes axe-core with custom label', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-spinner label="Processing payment"></fluid-spinner>'
      )
      await FluidAccessibilityUtils.assertAccessible(el)
    })
  })

  // ─── Shadow DOM structure ──────────────────────────────────────────────────

  describe('shadow DOM structure', () => {
    it('has [part="track"] in shadow DOM', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-spinner></fluid-spinner>'
      )
      const track = el.shadowRoot!.querySelector('[part="track"]')
      if (!track) {
        throw new Error('Expected [part="track"] to exist in shadow DOM')
      }
    })

    it('has [part="arc"] in shadow DOM', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-spinner></fluid-spinner>'
      )
      const arc = el.shadowRoot!.querySelector('[part="arc"]')
      if (!arc) {
        throw new Error('Expected [part="arc"] to exist in shadow DOM')
      }
    })
  })

  // ─── Attributes ───────────────────────────────────────────────────────────

  describe('attributes', () => {
    it('reflects size to data-size attribute', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-spinner size="lg"></fluid-spinner>'
      )
      if (el.getAttribute('data-size') !== 'lg') {
        throw new Error(
          `Expected data-size="lg", got "${el.getAttribute('data-size')}"`
        )
      }
    })

    it('defaults size to "md"', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-spinner></fluid-spinner>'
      )
      if (el.getAttribute('data-size') !== 'md') {
        throw new Error(
          `Expected default data-size="md", got "${el.getAttribute('data-size')}"`
        )
      }
    })

    for (const size of ['sm', 'md', 'lg']) {
      it(`renders size="${size}" without error`, async () => {
        const el = await FluidTestUtils.mount(
          `<fluid-spinner size="${size}"></fluid-spinner>`
        )
        if (el.getAttribute('data-size') !== size) {
          throw new Error(
            `Expected data-size="${size}", got "${el.getAttribute('data-size')}"`
          )
        }
      })
    }

    it('defaults variant to "glass"', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-spinner></fluid-spinner>'
      )
      if (el.getAttribute('data-variant') !== 'glass') {
        throw new Error(
          `Expected default data-variant="glass", got "${el.getAttribute('data-variant')}"`
        )
      }
    })

    it('reflects variant to data-variant attribute', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-spinner variant="brand"></fluid-spinner>'
      )
      if (el.getAttribute('data-variant') !== 'brand') {
        throw new Error(
          `Expected data-variant="brand", got "${el.getAttribute('data-variant')}"`
        )
      }
    })

    for (const variant of ['glass', 'brand', 'neutral']) {
      it(`renders variant="${variant}" without error`, async () => {
        const el = await FluidTestUtils.mount(
          `<fluid-spinner variant="${variant}"></fluid-spinner>`
        )
        if (el.getAttribute('data-variant') !== variant) {
          throw new Error(
            `Expected data-variant="${variant}", got "${el.getAttribute('data-variant')}"`
          )
        }
      })
    }
  })

  // ─── Dev warnings ─────────────────────────────────────────────────────────

  describe('dev warnings', () => {
    it('warns when label attribute is explicitly set to empty string', async () => {
      const warnings: string[] = []
      const origWarn = console.warn
      console.warn = (...args: unknown[]) => { warnings.push(String(args[0])) }
      try {
        await FluidTestUtils.mount('<fluid-spinner label=""></fluid-spinner>')
        await waitFrames(3)
        const hasWarn = warnings.some(w => w.includes('[fluid warn]') && w.includes('fluid-spinner'))
        if (!hasWarn) {
          throw new Error(
            `Expected dev warning for empty label. Warnings: ${JSON.stringify(warnings)}`
          )
        }
      } finally {
        console.warn = origWarn
      }
    })

    it('does NOT warn when label attribute is absent (defaults to "Loading")', async () => {
      const warnings: string[] = []
      const origWarn = console.warn
      console.warn = (...args: unknown[]) => { warnings.push(String(args[0])) }
      try {
        await FluidTestUtils.mount('<fluid-spinner></fluid-spinner>')
        await waitFrames(3)
        const hasWarn = warnings.some(w => w.includes('[fluid warn]') && w.includes('fluid-spinner'))
        if (hasWarn) {
          throw new Error(
            `Expected no dev warning when label is absent. Warnings: ${JSON.stringify(warnings)}`
          )
        }
      } finally {
        console.warn = origWarn
      }
    })

    it('does NOT warn when label attribute is a non-empty string', async () => {
      const warnings: string[] = []
      const origWarn = console.warn
      console.warn = (...args: unknown[]) => { warnings.push(String(args[0])) }
      try {
        await FluidTestUtils.mount('<fluid-spinner label="Processing"></fluid-spinner>')
        await waitFrames(3)
        const hasWarn = warnings.some(w => w.includes('[fluid warn]') && w.includes('fluid-spinner'))
        if (hasWarn) {
          throw new Error(
            `Expected no dev warning for non-empty label. Warnings: ${JSON.stringify(warnings)}`
          )
        }
      } finally {
        console.warn = origWarn
      }
    })
  })

  // ─── Tier compatibility ───────────────────────────────────────────────────

  describe('tier compatibility', () => {
    for (const tier of ['matte', 'frosted', 'crystalline', 'optical'] as const) {
      it(`renders without error at tier: ${tier}`, async () => {
        FluidTestUtils.mockTier(tier)
        const el = await FluidTestUtils.mount(
          `<fluid-spinner label="Loading at ${tier}"></fluid-spinner>`
        )
        if (el.getAttribute('role') !== 'status') {
          throw new Error(
            `At tier "${tier}": expected role="status", got "${el.getAttribute('role')}"`
          )
        }
        const arc = el.shadowRoot!.querySelector('[part="arc"]')
        if (!arc) {
          throw new Error(`At tier "${tier}": expected [part="arc"] in shadow DOM`)
        }
      })
    }
  })
})
