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
      const dir = getComputedStyle(el).flexDirection
      if (dir !== 'column') {
        throw new Error(`Default: expected column, got ${dir}`)
      }
    })

    it('direction="horizontal" sets flex-direction: row', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack direction="horizontal"></fluid-stack>')
      const dir = getComputedStyle(el).flexDirection
      if (dir !== 'row') {
        throw new Error(`Expected row, got ${dir}`)
      }
    })

    it('direction="vertical" sets flex-direction: column', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack direction="vertical"></fluid-stack>')
      const dir = getComputedStyle(el).flexDirection
      if (dir !== 'column') {
        throw new Error(`Expected column, got ${dir}`)
      }
    })

    it('direction="horizontal" with dir="rtl" on host sets flex-direction: row-reverse', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-stack direction="horizontal" dir="rtl"></fluid-stack>',
      )
      const dir = getComputedStyle(el).flexDirection
      if (dir !== 'row-reverse') {
        throw new Error(`Expected row-reverse in RTL, got ${dir}`)
      }
    })

    it('updates flex-direction when direction attribute changes', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack direction="vertical"></fluid-stack>')
      el.setAttribute('direction', 'horizontal')
      await new Promise<void>(r => requestAnimationFrame(r))
      const dir = getComputedStyle(el).flexDirection
      if (dir !== 'row') {
        throw new Error(`After change: expected row, got ${dir}`)
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

  describe('FLIP layout animation', () => {
    const nextMutation = (): Promise<void> =>
      new Promise(r => requestAnimationFrame(() => r()))

    it('skips FLIP when prefers-reduced-motion is active', async () => {
      const orig = window.matchMedia
      window.matchMedia = () => ({ matches: true } as MediaQueryList)
      try {
        const stack = await FluidTestUtils.mount(`
          <fluid-stack layout direction="horizontal">
            <div style="width:60px;height:60px">A</div>
            <div style="width:60px;height:60px">B</div>
          </fluid-stack>
        `)
        const a = stack.children[0] as HTMLElement
        stack.appendChild(a)
        await nextMutation()
        if (a.style.transform !== '') {
          throw new Error(`reduced-motion: expected no transform, got "${a.style.transform}"`)
        }
        if (a.style.transition !== '') {
          throw new Error(`reduced-motion: expected no transition, got "${a.style.transition}"`)
        }
      } finally {
        window.matchMedia = orig
      }
    })

    it('suppresses FLIP and emits dev warning for >50 children', async () => {
      const warned: string[] = []
      const orig = console.warn
      console.warn = (...args: unknown[]): void => { warned.push(String(args[0])) }
      try {
        const children = Array.from({ length: 51 }, (_, i) => `<div style="width:4px;height:4px">${i}</div>`).join('')
        const stack = await FluidTestUtils.mount(`<fluid-stack layout direction="horizontal">${children}</fluid-stack>`)
        const first = stack.children[0] as HTMLElement
        stack.appendChild(first)
        await nextMutation()
        if (!warned.some(w => w.includes('50 children'))) {
          throw new Error('Expected >50 children dev warning — none found')
        }
        if (first.style.transform !== '') {
          throw new Error(`Expected no transform when capped, got "${first.style.transform}"`)
        }
      } finally {
        console.warn = orig
      }
    })

    it('matte: applies cubic-bezier CSS transition on child reorder', async () => {
      FluidTestUtils.mockTier('matte')
      const stack = await FluidTestUtils.mount(`
        <fluid-stack layout direction="horizontal">
          <div style="width:60px;height:60px">A</div>
          <div style="width:60px;height:60px">B</div>
        </fluid-stack>
      `)
      const a = stack.children[0] as HTMLElement
      stack.appendChild(a)
      await nextMutation()
      if (!a.style.transition.includes('cubic-bezier')) {
        throw new Error(`matte: expected cubic-bezier transition, got "${a.style.transition}"`)
      }
    })

    it('frosted: applies linear() CSS spring transition on child reorder', async () => {
      FluidTestUtils.mockTier('frosted')
      const stack = await FluidTestUtils.mount(`
        <fluid-stack layout direction="horizontal">
          <div style="width:60px;height:60px">A</div>
          <div style="width:60px;height:60px">B</div>
        </fluid-stack>
      `)
      const a = stack.children[0] as HTMLElement
      stack.appendChild(a)
      await nextMutation()
      if (!a.style.transition.includes('linear(')) {
        throw new Error(`frosted: expected linear() spring transition, got "${a.style.transition}"`)
      }
    })

    it('crystalline: drives child via AnimationDriver spring on reorder', async () => {
      FluidTestUtils.mockTier('crystalline')
      const stack = await FluidTestUtils.mount(`
        <fluid-stack layout direction="horizontal">
          <div style="width:60px;height:60px">A</div>
          <div style="width:60px;height:60px">B</div>
        </fluid-stack>
      `)
      const a = stack.children[0] as HTMLElement
      stack.appendChild(a)
      await nextMutation()
      if (!a.style.transform || a.style.transform === '') {
        throw new Error(`crystalline: expected spring transform on child, got "${a.style.transform}"`)
      }
    })

    it('crystalline: rapid double-reorder deregisters prior task and restores consumer transform on settle', async () => {
      FluidTestUtils.mockTier('crystalline')
      const stack = await FluidTestUtils.mount(`
        <fluid-stack layout direction="horizontal">
          <div style="width:60px;height:60px">A</div>
          <div style="width:60px;height:60px">B</div>
        </fluid-stack>
      `)
      const a = stack.children[0] as HTMLElement

      // Consumer-set transform — must be fully restored once both springs settle.
      // With the ghost-task bug the second task's savedTransform captured a transient
      // translate() value, so the element would be left permanently translated.
      a.style.transform = 'rotate(45deg)'

      // First reorder: spring starts, no prior task to interrupt
      stack.appendChild(a)
      await nextMutation()
      if (!a.style.willChange) throw new Error('Expected willChange set after first reorder')

      // Second reorder immediately — no double-rAF has fired so the snapshot map is empty.
      // This exercises the inFlight branch: prior task deregistered, velocity carried over,
      // realTransform taken from existing.realTransform (not the transient translate).
      stack.insertBefore(a, stack.children[0])
      await nextMutation()

      // Wait up to 1.5 s for the single surviving spring task to settle
      const deadline = Date.now() + 1500
      while (a.style.willChange !== '' && Date.now() < deadline) {
        await new Promise<void>(r => requestAnimationFrame(r))
      }

      // (a) willChange cleared — proves a single task ran to completion with no ghost leaking
      if (a.style.willChange !== '') {
        throw new Error(`Expected willChange '' on settle, got "${a.style.willChange}"`)
      }
      // (b) consumer transform preserved — proves realTransform was not the transient translate
      if (a.style.transform !== 'rotate(45deg)') {
        throw new Error(`Expected 'rotate(45deg)' restored on settle, got "${a.style.transform}"`)
      }
    })
  })
})

// ─── fluid-spacer ──────────────────────────────────────────────────────────────

describe('fluid-spacer', () => {
  afterEach(() => {
    FluidTestUtils.cleanup()
  })

  describe('aria-hidden', () => {
    it('sets aria-hidden="true" automatically on connect', async () => {
      const el = await FluidTestUtils.mount('<fluid-spacer></fluid-spacer>')
      if (el.getAttribute('aria-hidden') !== 'true') {
        throw new Error(`Expected aria-hidden="true", got "${el.getAttribute('aria-hidden')}"`)
      }
    })
  })

  describe('default state (no attributes)', () => {
    it('has no intrinsic size by default', async () => {
      const el = await FluidTestUtils.mount('<fluid-spacer></fluid-spacer>')
      if (el.style.flex !== '') throw new Error(`Expected empty flex, got ${el.style.flex}`)
      if (el.style.width !== '') throw new Error(`Expected empty width, got ${el.style.width}`)
      if (el.style.height !== '') throw new Error(`Expected empty height, got ${el.style.height}`)
    })
  })

  describe('grow mode', () => {
    it('grow attribute sets flex: 1 1 0', async () => {
      const el = await FluidTestUtils.mount('<fluid-spacer grow></fluid-spacer>')
      if (el.style.flex !== '1 1 0px') {
        throw new Error(`Expected flex:1 1 0px, got ${el.style.flex}`)
      }
    })

    it('grow takes precedence over size', async () => {
      const el = await FluidTestUtils.mount('<fluid-spacer grow size="md"></fluid-spacer>')
      if (el.style.flex !== '1 1 0px') {
        throw new Error(`grow+size: expected flex:1 1 0px, got ${el.style.flex}`)
      }
    })

    it('removing grow attribute clears flex', async () => {
      const el = await FluidTestUtils.mount('<fluid-spacer grow></fluid-spacer>')
      el.removeAttribute('grow')
      if (el.style.flex !== '') {
        throw new Error(`After removing grow: expected empty flex, got ${el.style.flex}`)
      }
    })
  })

  describe('fixed size mode', () => {
    it('size="xs" sets width and height to var(--fluid-space-1) (axis=both default)', async () => {
      const el = await FluidTestUtils.mount('<fluid-spacer size="xs"></fluid-spacer>')
      if (el.style.width !== 'var(--fluid-space-1)') {
        throw new Error(`Expected width var(--fluid-space-1), got ${el.style.width}`)
      }
      if (el.style.height !== 'var(--fluid-space-1)') {
        throw new Error(`Expected height var(--fluid-space-1), got ${el.style.height}`)
      }
    })

    it('size="sm" sets width and height to var(--fluid-space-2)', async () => {
      const el = await FluidTestUtils.mount('<fluid-spacer size="sm"></fluid-spacer>')
      if (el.style.width !== 'var(--fluid-space-2)') throw new Error(`Expected var(--fluid-space-2), got ${el.style.width}`)
      if (el.style.height !== 'var(--fluid-space-2)') throw new Error(`Expected var(--fluid-space-2), got ${el.style.height}`)
    })

    it('size="md" sets width and height to var(--fluid-space-4)', async () => {
      const el = await FluidTestUtils.mount('<fluid-spacer size="md"></fluid-spacer>')
      if (el.style.width !== 'var(--fluid-space-4)') throw new Error(`Expected var(--fluid-space-4), got ${el.style.width}`)
      if (el.style.height !== 'var(--fluid-space-4)') throw new Error(`Expected var(--fluid-space-4), got ${el.style.height}`)
    })

    it('size="lg" sets width and height to var(--fluid-space-6)', async () => {
      const el = await FluidTestUtils.mount('<fluid-spacer size="lg"></fluid-spacer>')
      if (el.style.width !== 'var(--fluid-space-6)') throw new Error(`Expected var(--fluid-space-6), got ${el.style.width}`)
      if (el.style.height !== 'var(--fluid-space-6)') throw new Error(`Expected var(--fluid-space-6), got ${el.style.height}`)
    })

    it('size="xl" sets width and height to var(--fluid-space-10)', async () => {
      const el = await FluidTestUtils.mount('<fluid-spacer size="xl"></fluid-spacer>')
      if (el.style.width !== 'var(--fluid-space-10)') throw new Error(`Expected var(--fluid-space-10), got ${el.style.width}`)
      if (el.style.height !== 'var(--fluid-space-10)') throw new Error(`Expected var(--fluid-space-10), got ${el.style.height}`)
    })

    it('arbitrary CSS size value passes through to width and height', async () => {
      const el = await FluidTestUtils.mount('<fluid-spacer size="20px"></fluid-spacer>')
      if (el.style.width !== '20px') throw new Error(`Expected width:20px, got ${el.style.width}`)
      if (el.style.height !== '20px') throw new Error(`Expected height:20px, got ${el.style.height}`)
    })

    it('removing size attribute clears width and height', async () => {
      const el = await FluidTestUtils.mount('<fluid-spacer size="md"></fluid-spacer>')
      el.removeAttribute('size')
      if (el.style.width !== '') throw new Error(`After remove: expected empty width, got ${el.style.width}`)
      if (el.style.height !== '') throw new Error(`After remove: expected empty height, got ${el.style.height}`)
    })
  })

  describe('axis', () => {
    it('axis="horizontal" with size only sets width', async () => {
      const el = await FluidTestUtils.mount('<fluid-spacer size="md" axis="horizontal"></fluid-spacer>')
      if (el.style.width !== 'var(--fluid-space-4)') throw new Error(`Expected width var(--fluid-space-4), got ${el.style.width}`)
      if (el.style.height !== '') throw new Error(`Expected empty height with axis=horizontal, got ${el.style.height}`)
    })

    it('axis="vertical" with size only sets height', async () => {
      const el = await FluidTestUtils.mount('<fluid-spacer size="md" axis="vertical"></fluid-spacer>')
      if (el.style.height !== 'var(--fluid-space-4)') throw new Error(`Expected height var(--fluid-space-4), got ${el.style.height}`)
      if (el.style.width !== '') throw new Error(`Expected empty width with axis=vertical, got ${el.style.width}`)
    })

    it('axis="both" with size sets both width and height', async () => {
      const el = await FluidTestUtils.mount('<fluid-spacer size="sm" axis="both"></fluid-spacer>')
      if (el.style.width !== 'var(--fluid-space-2)') throw new Error(`Expected width var(--fluid-space-2), got ${el.style.width}`)
      if (el.style.height !== 'var(--fluid-space-2)') throw new Error(`Expected height var(--fluid-space-2), got ${el.style.height}`)
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
          <fluid-spacer grow></fluid-spacer>
          <div>Right</div>
        </fluid-stack>
      `)
      await FluidAccessibilityUtils.assertAccessible(el)
    })
  })
})
