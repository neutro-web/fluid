// packages/fluid/src/components/stack/stack.spec.ts
import { FluidTestUtils } from '../../testing/utils'
import { FluidAccessibilityUtils } from '../../testing/accessibility'

// Registers both elements before any test runs
import './index'
import '../spacer/index'

// ─── fluid-stack ───────────────────────────────────────────────────────────────

describe('fluid-stack', () => {
  afterEach(() => {
    FluidTestUtils.cleanup()
    FluidTestUtils.restoreTier()
  })

  describe('display', () => {
    it('renders as a flex container', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack></fluid-stack>')
      const display = getComputedStyle(el).display
      if (display !== 'flex') throw new Error(`Expected display:flex, got ${display}`)
    })
  })

  describe('direction', () => {
    it('defaults to column (vertical)', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack></fluid-stack>')
      if (el.style.flexDirection !== 'column') {
        throw new Error(`Default: expected column, got ${el.style.flexDirection}`)
      }
    })

    it('direction="horizontal" sets flex-direction: row', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack direction="horizontal"></fluid-stack>')
      if (el.style.flexDirection !== 'row') {
        throw new Error(`Expected row, got ${el.style.flexDirection}`)
      }
    })

    it('direction="vertical" sets flex-direction: column', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack direction="vertical"></fluid-stack>')
      if (el.style.flexDirection !== 'column') {
        throw new Error(`Expected column, got ${el.style.flexDirection}`)
      }
    })

    it('direction="horizontal" with dir="rtl" on host sets flex-direction: row-reverse', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-stack direction="horizontal" dir="rtl"></fluid-stack>',
      )
      if (el.style.flexDirection !== 'row-reverse') {
        throw new Error(`Expected row-reverse in RTL, got ${el.style.flexDirection}`)
      }
    })

    it('updates flex-direction when direction attribute changes', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack direction="vertical"></fluid-stack>')
      el.setAttribute('direction', 'horizontal')
      if (el.style.flexDirection !== 'row') {
        throw new Error(`After change: expected row, got ${el.style.flexDirection}`)
      }
    })
  })

  describe('gap', () => {
    it('defaults to var(--fluid-space-4) when no gap attribute', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack></fluid-stack>')
      if (el.style.gap !== 'var(--fluid-space-4)') {
        throw new Error(`Default gap: expected var(--fluid-space-4), got ${el.style.gap}`)
      }
    })

    it('gap="xs" resolves to var(--fluid-space-1)', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack gap="xs"></fluid-stack>')
      if (el.style.gap !== 'var(--fluid-space-1)') {
        throw new Error(`Expected var(--fluid-space-1), got ${el.style.gap}`)
      }
    })

    it('gap="sm" resolves to var(--fluid-space-2)', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack gap="sm"></fluid-stack>')
      if (el.style.gap !== 'var(--fluid-space-2)') {
        throw new Error(`Expected var(--fluid-space-2), got ${el.style.gap}`)
      }
    })

    it('gap="md" resolves to var(--fluid-space-4)', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack gap="md"></fluid-stack>')
      if (el.style.gap !== 'var(--fluid-space-4)') {
        throw new Error(`Expected var(--fluid-space-4), got ${el.style.gap}`)
      }
    })

    it('gap="lg" resolves to var(--fluid-space-6)', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack gap="lg"></fluid-stack>')
      if (el.style.gap !== 'var(--fluid-space-6)') {
        throw new Error(`Expected var(--fluid-space-6), got ${el.style.gap}`)
      }
    })

    it('gap="xl" resolves to var(--fluid-space-10)', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack gap="xl"></fluid-stack>')
      if (el.style.gap !== 'var(--fluid-space-10)') {
        throw new Error(`Expected var(--fluid-space-10), got ${el.style.gap}`)
      }
    })

    it('arbitrary CSS gap value passes through unchanged', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack gap="20px"></fluid-stack>')
      if (el.style.gap !== '20px') {
        throw new Error(`Expected 20px, got ${el.style.gap}`)
      }
    })

    it('updates gap when attribute changes', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack gap="sm"></fluid-stack>')
      el.setAttribute('gap', 'xl')
      if (el.style.gap !== 'var(--fluid-space-10)') {
        throw new Error(`After change: expected var(--fluid-space-10), got ${el.style.gap}`)
      }
    })
  })

  describe('align', () => {
    it('defaults to stretch', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack></fluid-stack>')
      if (el.style.alignItems !== 'stretch') {
        throw new Error(`Default align: expected stretch, got ${el.style.alignItems}`)
      }
    })

    it('align="center" sets align-items: center', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack align="center"></fluid-stack>')
      if (el.style.alignItems !== 'center') {
        throw new Error(`Expected center, got ${el.style.alignItems}`)
      }
    })

    it('align="start" sets align-items: start', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack align="start"></fluid-stack>')
      if (el.style.alignItems !== 'start') {
        throw new Error(`Expected start, got ${el.style.alignItems}`)
      }
    })

    it('align="end" sets align-items: end', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack align="end"></fluid-stack>')
      if (el.style.alignItems !== 'end') {
        throw new Error(`Expected end, got ${el.style.alignItems}`)
      }
    })

    it('align="baseline" sets align-items: baseline', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack align="baseline"></fluid-stack>')
      if (el.style.alignItems !== 'baseline') {
        throw new Error(`Expected baseline, got ${el.style.alignItems}`)
      }
    })
  })

  describe('justify', () => {
    it('defaults to start', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack></fluid-stack>')
      if (el.style.justifyContent !== 'start') {
        throw new Error(`Default justify: expected start, got ${el.style.justifyContent}`)
      }
    })

    it('justify="center" sets justify-content: center', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack justify="center"></fluid-stack>')
      if (el.style.justifyContent !== 'center') {
        throw new Error(`Expected center, got ${el.style.justifyContent}`)
      }
    })

    it('justify="space-between" sets justify-content: space-between', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack justify="space-between"></fluid-stack>')
      if (el.style.justifyContent !== 'space-between') {
        throw new Error(`Expected space-between, got ${el.style.justifyContent}`)
      }
    })

    it('justify="end" sets justify-content: end', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack justify="end"></fluid-stack>')
      if (el.style.justifyContent !== 'end') {
        throw new Error(`Expected end, got ${el.style.justifyContent}`)
      }
    })
  })

  describe('wrap', () => {
    it('defaults to nowrap when wrap attribute is absent', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack></fluid-stack>')
      if (el.style.flexWrap !== 'nowrap') {
        throw new Error(`Default wrap: expected nowrap, got ${el.style.flexWrap}`)
      }
    })

    it('wrap attribute presence enables flex-wrap: wrap', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack wrap></fluid-stack>')
      if (el.style.flexWrap !== 'wrap') {
        throw new Error(`Expected wrap, got ${el.style.flexWrap}`)
      }
    })

    it('removing wrap attribute restores nowrap', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack wrap></fluid-stack>')
      el.removeAttribute('wrap')
      if (el.style.flexWrap !== 'nowrap') {
        throw new Error(`After remove: expected nowrap, got ${el.style.flexWrap}`)
      }
    })
  })

  describe('lifecycle events', () => {
    it('dispatches fluid:mounted on connectedCallback', async () => {
      let mounted = false
      const fixture = document.createElement('div')
      document.body.appendChild(fixture)
      try {
        const stack = document.createElement('fluid-stack')
        stack.addEventListener('fluid:mounted', () => { mounted = true }, { once: true })
        fixture.appendChild(stack)
        await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())))
      } finally {
        fixture.remove()
      }
      if (!mounted) throw new Error('fluid:mounted never fired')
    })

    it('dispatches fluid:unmounted on disconnectedCallback', async () => {
      let unmounted = false
      const el = await FluidTestUtils.mount('<fluid-stack></fluid-stack>')
      el.addEventListener('fluid:unmounted', () => { unmounted = true }, { once: true })
      FluidTestUtils.cleanup()
      await new Promise<void>(r => requestAnimationFrame(r))
      if (!unmounted) throw new Error('fluid:unmounted never fired')
    })
  })

  describe('accessibility', () => {
    it('has no axe violations with children', async () => {
      const el = await FluidTestUtils.mount(`
        <fluid-stack>
          <div>Item one</div>
          <div>Item two</div>
          <div>Item three</div>
        </fluid-stack>
      `)
      await FluidAccessibilityUtils.assertAccessible(el)
    })

    it('has no axe violations when empty', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack></fluid-stack>')
      await FluidAccessibilityUtils.assertAccessible(el)
    })
  })
})

// ─── fluid-spacer ──────────────────────────────────────────────────────────────

describe('fluid-spacer', () => {
  afterEach(() => {
    FluidTestUtils.cleanup()
  })

  describe('grow mode (no size attribute)', () => {
    it('has flex: 1 1 auto by default', async () => {
      const el = await FluidTestUtils.mount('<fluid-spacer></fluid-spacer>')
      if (el.style.flex !== '1 1 auto') {
        throw new Error(`Expected flex:1 1 auto, got ${el.style.flex}`)
      }
    })
  })

  describe('fixed size mode', () => {
    it('size="xs" sets flex: 0 0 var(--fluid-space-1)', async () => {
      const el = await FluidTestUtils.mount('<fluid-spacer size="xs"></fluid-spacer>')
      if (el.style.flex !== '0 0 var(--fluid-space-1)') {
        throw new Error(`Expected 0 0 var(--fluid-space-1), got ${el.style.flex}`)
      }
    })

    it('size="sm" sets flex: 0 0 var(--fluid-space-2)', async () => {
      const el = await FluidTestUtils.mount('<fluid-spacer size="sm"></fluid-spacer>')
      if (el.style.flex !== '0 0 var(--fluid-space-2)') {
        throw new Error(`Expected 0 0 var(--fluid-space-2), got ${el.style.flex}`)
      }
    })

    it('size="md" sets flex: 0 0 var(--fluid-space-4)', async () => {
      const el = await FluidTestUtils.mount('<fluid-spacer size="md"></fluid-spacer>')
      if (el.style.flex !== '0 0 var(--fluid-space-4)') {
        throw new Error(`Expected 0 0 var(--fluid-space-4), got ${el.style.flex}`)
      }
    })

    it('size="lg" sets flex: 0 0 var(--fluid-space-6)', async () => {
      const el = await FluidTestUtils.mount('<fluid-spacer size="lg"></fluid-spacer>')
      if (el.style.flex !== '0 0 var(--fluid-space-6)') {
        throw new Error(`Expected 0 0 var(--fluid-space-6), got ${el.style.flex}`)
      }
    })

    it('size="xl" sets flex: 0 0 var(--fluid-space-10)', async () => {
      const el = await FluidTestUtils.mount('<fluid-spacer size="xl"></fluid-spacer>')
      if (el.style.flex !== '0 0 var(--fluid-space-10)') {
        throw new Error(`Expected 0 0 var(--fluid-space-10), got ${el.style.flex}`)
      }
    })

    it('removing size attribute restores grow mode', async () => {
      const el = await FluidTestUtils.mount('<fluid-spacer size="lg"></fluid-spacer>')
      el.removeAttribute('size')
      if (el.style.flex !== '1 1 auto') {
        throw new Error(`After remove: expected 1 1 auto, got ${el.style.flex}`)
      }
    })
  })

  describe('lifecycle events', () => {
    it('dispatches fluid:mounted on connect', async () => {
      let mounted = false
      const sp = document.createElement('fluid-spacer')
      sp.addEventListener('fluid:mounted', () => { mounted = true }, { once: true })
      document.body.appendChild(sp)
      try {
        await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())))
      } finally {
        document.body.removeChild(sp)
      }
      if (!mounted) throw new Error('fluid:mounted never fired')
    })

    it('dispatches fluid:unmounted on disconnect', async () => {
      let unmounted = false
      const el = await FluidTestUtils.mount('<fluid-spacer></fluid-spacer>')
      el.addEventListener('fluid:unmounted', () => { unmounted = true }, { once: true })
      FluidTestUtils.cleanup()
      await new Promise<void>(r => requestAnimationFrame(r))
      if (!unmounted) throw new Error('fluid:unmounted never fired')
    })
  })

  describe('accessibility', () => {
    it('has no axe violations inside a fluid-stack', async () => {
      const el = await FluidTestUtils.mount(`
        <fluid-stack direction="horizontal">
          <div>Left</div>
          <fluid-spacer></fluid-spacer>
          <div>Right</div>
        </fluid-stack>
      `)
      await FluidAccessibilityUtils.assertAccessible(el)
    })
  })
})
