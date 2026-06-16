import { FluidTestUtils } from '../../testing/utils'
import { FluidAccessibilityUtils } from '../../testing/accessibility'

// Registers fluid-progress — must happen before first test
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

describe('fluid-progress', () => {
  afterEach(() => {
    FluidTestUtils.cleanup()
    FluidTestUtils.restoreTier()
  })

  // ─── ARIA ────────────────────────────────────────────────────────────────────

  describe('ARIA', () => {
    it('has role="progressbar" on host', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-progress aria-label="Loading" value="50"></fluid-progress>'
      )
      if (el.getAttribute('role') !== 'progressbar') {
        throw new Error(`Expected role="progressbar", got "${el.getAttribute('role')}"`)
      }
    })

    it('has aria-valuemin="0" by default', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-progress aria-label="Loading" value="50"></fluid-progress>'
      )
      if (el.getAttribute('aria-valuemin') !== '0') {
        throw new Error(`Expected aria-valuemin="0", got "${el.getAttribute('aria-valuemin')}"`)
      }
    })

    it('has aria-valuemax="100" by default', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-progress aria-label="Loading" value="50"></fluid-progress>'
      )
      if (el.getAttribute('aria-valuemax') !== '100') {
        throw new Error(`Expected aria-valuemax="100", got "${el.getAttribute('aria-valuemax')}"`)
      }
    })

    it('has aria-valuenow when value is set', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-progress aria-label="Loading" value="42"></fluid-progress>'
      )
      if (el.getAttribute('aria-valuenow') !== '42') {
        throw new Error(`Expected aria-valuenow="42", got "${el.getAttribute('aria-valuenow')}"`)
      }
    })

    it('does NOT have aria-valuenow when indeterminate attribute is present', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-progress aria-label="Loading" indeterminate></fluid-progress>'
      )
      if (el.hasAttribute('aria-valuenow')) {
        throw new Error('Expected aria-valuenow to be absent when indeterminate is present')
      }
    })

    it('aria-valuenow reflects value attribute changes', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-progress aria-label="Loading" value="0"></fluid-progress>'
      )
      if (el.getAttribute('aria-valuenow') !== '0') {
        throw new Error(`Expected initial aria-valuenow="0", got "${el.getAttribute('aria-valuenow')}"`)
      }
      el.setAttribute('value', '50')
      if (el.getAttribute('aria-valuenow') !== '50') {
        throw new Error(`Expected aria-valuenow="50" after setAttribute, got "${el.getAttribute('aria-valuenow')}"`)
      }
    })

    it('passes axe-core in determinate state with aria-label', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-progress aria-label="Upload progress" value="60"></fluid-progress>'
      )
      await FluidAccessibilityUtils.assertAccessible(el)
    })

    it('passes axe-core in indeterminate state with aria-label', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-progress aria-label="Loading content" indeterminate></fluid-progress>'
      )
      await FluidAccessibilityUtils.assertAccessible(el)
    })

    it('respects custom min and max attributes', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-progress aria-label="Steps" min="1" max="10" value="5"></fluid-progress>'
      )
      if (el.getAttribute('aria-valuemin') !== '1') {
        throw new Error(`Expected aria-valuemin="1", got "${el.getAttribute('aria-valuemin')}"`)
      }
      if (el.getAttribute('aria-valuemax') !== '10') {
        throw new Error(`Expected aria-valuemax="10", got "${el.getAttribute('aria-valuemax')}"`)
      }
      if (el.getAttribute('aria-valuenow') !== '5') {
        throw new Error(`Expected aria-valuenow="5", got "${el.getAttribute('aria-valuenow')}"`)
      }
    })

    it('sets aria-label from label attribute', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-progress label="Upload progress" value="50"></fluid-progress>'
      )
      if (el.getAttribute('aria-label') !== 'Upload progress') {
        throw new Error(`Expected aria-label="Upload progress", got "${el.getAttribute('aria-label')}"`)
      }
    })
  })

  // ─── Shadow DOM structure ───────────────────────────────────────────────────

  describe('shadow DOM structure', () => {
    it('has [part="linear-track"] and [part="linear-fill"]', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-progress aria-label="Loading" value="50"></fluid-progress>'
      )
      const track = el.shadowRoot!.querySelector('[part="linear-track"]')
      const fill = el.shadowRoot!.querySelector('[part="linear-fill"]')
      if (!track) throw new Error('Expected [part="linear-track"] in shadow DOM')
      if (!fill) throw new Error('Expected [part="linear-fill"] in shadow DOM')
    })

    it('has [part="circular-track"] SVG', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-progress aria-label="Loading" variant="circular" value="50"></fluid-progress>'
      )
      const track = el.shadowRoot!.querySelector('[part="circular-track"]')
      if (!track) throw new Error('Expected [part="circular-track"] SVG in shadow DOM')
      if (track.tagName.toLowerCase() !== 'svg') {
        throw new Error(`Expected [part="circular-track"] to be an SVG, got ${track.tagName}`)
      }
    })

    it('has [part="circular-bg"] and [part="circular-arc"] circles', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-progress aria-label="Loading" value="50"></fluid-progress>'
      )
      const bg = el.shadowRoot!.querySelector('[part="circular-bg"]')
      const arc = el.shadowRoot!.querySelector('[part="circular-arc"]')
      if (!bg) throw new Error('Expected [part="circular-bg"] in shadow DOM')
      if (!arc) throw new Error('Expected [part="circular-arc"] in shadow DOM')
    })
  })

  // ─── Variants ───────────────────────────────────────────────────────────────

  describe('variants', () => {
    it('sets data-variant="linear" by default', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-progress aria-label="Loading" value="50"></fluid-progress>'
      )
      if (el.getAttribute('data-variant') !== 'linear') {
        throw new Error(`Expected data-variant="linear", got "${el.getAttribute('data-variant')}"`)
      }
    })

    it('sets data-variant="circular" when variant attribute is circular', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-progress aria-label="Loading" variant="circular" value="50"></fluid-progress>'
      )
      if (el.getAttribute('data-variant') !== 'circular') {
        throw new Error(`Expected data-variant="circular", got "${el.getAttribute('data-variant')}"`)
      }
    })

    it('updates data-variant when variant attribute changes', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-progress aria-label="Loading" value="50"></fluid-progress>'
      )
      if (el.getAttribute('data-variant') !== 'linear') {
        throw new Error(`Expected initial data-variant="linear"`)
      }
      el.setAttribute('variant', 'circular')
      if (el.getAttribute('data-variant') !== 'circular') {
        throw new Error(`Expected data-variant="circular" after setAttribute`)
      }
    })
  })

  // ─── Value sync ─────────────────────────────────────────────────────────────

  describe('value sync', () => {
    it('clamps value above max to 100%', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-progress aria-label="Loading" value="150"></fluid-progress>'
      )
      const fill = el.shadowRoot!.querySelector('[part="linear-fill"]') as HTMLElement
      const fillPct = fill.style.getPropertyValue('--fluid-progress-fill')
      if (fillPct !== '100%') {
        throw new Error(`Expected --fluid-progress-fill to be "100%" for value=150, got "${fillPct}"`)
      }
    })

    it('clamps value below min to 0%', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-progress aria-label="Loading" value="-10"></fluid-progress>'
      )
      const fill = el.shadowRoot!.querySelector('[part="linear-fill"]') as HTMLElement
      const fillPct = fill.style.getPropertyValue('--fluid-progress-fill')
      if (fillPct !== '0%') {
        throw new Error(`Expected --fluid-progress-fill to be "0%" for value=-10, got "${fillPct}"`)
      }
    })

    it('sets data-indeterminate when indeterminate attribute is present', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-progress aria-label="Loading" indeterminate></fluid-progress>'
      )
      if (!el.hasAttribute('data-indeterminate')) {
        throw new Error('Expected data-indeterminate attribute when indeterminate is present')
      }
    })

    it('removes data-indeterminate when indeterminate attribute is removed', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-progress aria-label="Loading" indeterminate></fluid-progress>'
      )
      if (!el.hasAttribute('data-indeterminate')) {
        throw new Error('Precondition: expected data-indeterminate to be set')
      }
      el.removeAttribute('indeterminate')
      if (el.hasAttribute('data-indeterminate')) {
        throw new Error('Expected data-indeterminate to be removed after removeAttribute("indeterminate")')
      }
    })

    it('computes correct fill percentage with custom min/max', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-progress aria-label="Steps" min="0" max="10" value="5"></fluid-progress>'
      )
      const fill = el.shadowRoot!.querySelector('[part="linear-fill"]') as HTMLElement
      const fillPct = fill.style.getPropertyValue('--fluid-progress-fill')
      if (fillPct !== '50%') {
        throw new Error(`Expected --fluid-progress-fill to be "50%" for value=5 min=0 max=10, got "${fillPct}"`)
      }
    })

    it('sets circular arc stroke-dashoffset correctly', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-progress aria-label="Loading" variant="circular" value="25"></fluid-progress>'
      )
      const arc = el.shadowRoot!.querySelector('[part="circular-arc"]') as SVGCircleElement
      // 25% → dashoffset = 100 - 25 = 75
      if (arc.getAttribute('stroke-dashoffset') !== '75') {
        throw new Error(`Expected stroke-dashoffset="75" for value=25, got "${arc.getAttribute('stroke-dashoffset')}"`)
      }
    })

    it('sets indeterminate arc to dashoffset 75', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-progress aria-label="Loading" variant="circular" indeterminate></fluid-progress>'
      )
      const arc = el.shadowRoot!.querySelector('[part="circular-arc"]') as SVGCircleElement
      if (arc.getAttribute('stroke-dashoffset') !== '75') {
        throw new Error(`Expected stroke-dashoffset="75" for indeterminate circular, got "${arc.getAttribute('stroke-dashoffset')}"`)
      }
    })

    it('defaults value to 0 when value attribute is absent', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-progress aria-label="Loading"></fluid-progress>'
      )
      if (el.getAttribute('aria-valuenow') !== '0') {
        throw new Error(`Expected aria-valuenow="0" when value absent (default), got "${el.getAttribute('aria-valuenow')}"`)
      }
    })
  })

  // ─── Size attribute ─────────────────────────────────────────────────────────

  describe('size attribute', () => {
    it('defaults size to "md"', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-progress aria-label="Loading" value="50"></fluid-progress>'
      )
      if (el.getAttribute('data-size') !== 'md') {
        throw new Error(`Expected default data-size="md", got "${el.getAttribute('data-size')}"`)
      }
    })

    for (const size of ['sm', 'md', 'lg']) {
      it(`reflects size="${size}" to data-size`, async () => {
        const el = await FluidTestUtils.mount(
          `<fluid-progress aria-label="Loading" size="${size}" value="50"></fluid-progress>`
        )
        if (el.getAttribute('data-size') !== size) {
          throw new Error(`Expected data-size="${size}", got "${el.getAttribute('data-size')}"`)
        }
      })
    }
  })

  // ─── fluid:change event ──────────────────────────────────────────────────────

  describe('fluid:change event', () => {
    it('fires fluid:change when value attribute changes', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-progress aria-label="Loading" value="0"></fluid-progress>'
      )
      let eventDetail: { value: number; previousValue: number } | null = null
      el.addEventListener('fluid:change', (e: Event) => {
        eventDetail = (e as CustomEvent).detail
      })
      el.setAttribute('value', '50')
      if (eventDetail === null) {
        throw new Error('Expected fluid:change to fire when value changes')
      }
      if ((eventDetail as { value: number; previousValue: number }).value !== 50) {
        throw new Error(`Expected fluid:change detail.value=50, got ${(eventDetail as any).value}`)
      }
      if ((eventDetail as { value: number; previousValue: number }).previousValue !== 0) {
        throw new Error(`Expected fluid:change detail.previousValue=0, got ${(eventDetail as any).previousValue}`)
      }
    })
  })

  // ─── Dev warnings ────────────────────────────────────────────────────────────

  describe('dev warnings', () => {
    it('warns at mount when neither aria-label nor aria-labelledby is provided', async () => {
      const warnings: string[] = []
      const origWarn = console.warn
      console.warn = (...args: unknown[]) => { warnings.push(String(args[0])) }
      try {
        await FluidTestUtils.mount('<fluid-progress value="50"></fluid-progress>')
        await waitFrames(3)
        const hasWarn = warnings.some(w =>
          w.includes('[fluid warn]') && w.includes('fluid-progress')
        )
        if (!hasWarn) {
          throw new Error(
            `Expected accessibility dev warning. Warnings: ${JSON.stringify(warnings)}`
          )
        }
      } finally {
        console.warn = origWarn
      }
    })

    it('does NOT warn when aria-label is provided', async () => {
      const warnings: string[] = []
      const origWarn = console.warn
      console.warn = (...args: unknown[]) => { warnings.push(String(args[0])) }
      try {
        await FluidTestUtils.mount('<fluid-progress aria-label="Upload" value="50"></fluid-progress>')
        await waitFrames(3)
        const hasWarn = warnings.some(w =>
          w.includes('[fluid warn]') && w.includes('fluid-progress')
        )
        if (hasWarn) {
          throw new Error(
            `Expected no accessibility warning when aria-label provided. Warnings: ${JSON.stringify(warnings)}`
          )
        }
      } finally {
        console.warn = origWarn
      }
    })

    it('warns when max is not greater than min', async () => {
      const warnings: string[] = []
      const origWarn = console.warn
      console.warn = (...args: unknown[]) => { warnings.push(String(args[0])) }
      try {
        await FluidTestUtils.mount(
          '<fluid-progress aria-label="Loading" min="10" max="10" value="10"></fluid-progress>'
        )
        await waitFrames(3)
        const hasWarn = warnings.some(w =>
          w.includes('[fluid warn]') && w.includes('max') && w.includes('min')
        )
        if (!hasWarn) {
          throw new Error(
            `Expected max<=min dev warning. Warnings: ${JSON.stringify(warnings)}`
          )
        }
      } finally {
        console.warn = origWarn
      }
    })

    it('does NOT warn when max is greater than min', async () => {
      const warnings: string[] = []
      const origWarn = console.warn
      console.warn = (...args: unknown[]) => { warnings.push(String(args[0])) }
      try {
        await FluidTestUtils.mount(
          '<fluid-progress aria-label="Loading" min="0" max="100" value="50"></fluid-progress>'
        )
        await waitFrames(3)
        const hasWarn = warnings.some(w =>
          w.includes('[fluid warn]') && w.includes('max') && w.includes('min')
        )
        if (hasWarn) {
          throw new Error(
            `Expected no max<=min warning for valid range. Warnings: ${JSON.stringify(warnings)}`
          )
        }
      } finally {
        console.warn = origWarn
      }
    })
  })

  // ─── Tier compatibility ─────────────────────────────────────────────────────

  describe('tier compatibility', () => {
    for (const tier of ['matte', 'frosted', 'crystalline', 'optical'] as const) {
      it(`renders without error at tier: ${tier}`, async () => {
        FluidTestUtils.mockTier(tier)
        const el = await FluidTestUtils.mount(
          '<fluid-progress aria-label="Loading" value="50"></fluid-progress>'
        )
        if (el.getAttribute('role') !== 'progressbar') {
          throw new Error(`Expected role="progressbar" at tier="${tier}"`)
        }
      })
    }
  })
})
