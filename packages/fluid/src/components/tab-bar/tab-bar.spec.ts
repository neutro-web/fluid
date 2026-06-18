import { FluidTestUtils } from '../../testing/utils'
// Registers all three elements — must happen before first test
import './index'

function waitFrames(n = 30): Promise<void> {
  return new Promise(resolve => {
    let rem = n
    const tick = () => { if (--rem <= 0) resolve(); else requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
  })
}

/** Mount bar + panels as a compound fixture, return the bar element. */
async function mountTabs(opts: {
  orientation?: string
  activation?: string
  controlledId?: string
} = {}): Promise<HTMLElement> {
  const orientation = opts.orientation ? ` orientation="${opts.orientation}"` : ''
  const activation = opts.activation ? ` activation="${opts.activation}"` : ''
  const controlled = opts.controlledId != null ? ` active-tab="${opts.controlledId}"` : ''
  const bar = await FluidTestUtils.mount(
    `<fluid-tab-bar aria-label="Test tabs"${orientation}${activation}${controlled}>` +
    `<fluid-tab tab-id="t1" panel="p1">Tab 1</fluid-tab>` +
    `<fluid-tab tab-id="t2" panel="p2">Tab 2</fluid-tab>` +
    `<fluid-tab tab-id="t3" panel="p3" disabled>Tab 3</fluid-tab>` +
    `<fluid-tab-panel slot="panel" panel-id="p1">Panel 1</fluid-tab-panel>` +
    `<fluid-tab-panel slot="panel" panel-id="p2">Panel 2</fluid-tab-panel>` +
    `<fluid-tab-panel slot="panel" panel-id="p3">Panel 3</fluid-tab-panel>` +
    `</fluid-tab-bar>`
  )
  await waitFrames(4)
  return bar
}

describe('fluid-tab-bar', () => {
  afterEach(() => {
    FluidTestUtils.cleanup()
    FluidTestUtils.restoreTier()
  })

  // ─── Shadow DOM structure ──────────────────────────────────────────────────

  describe('shadow DOM', () => {
    it('has [part="tablist"]', async () => {
      const bar = await mountTabs()
      if (!bar.shadowRoot!.querySelector('[part="tablist"]')) {
        throw new Error('Missing [part="tablist"]')
      }
    })
    it('has [part="indicator"]', async () => {
      const bar = await mountTabs()
      if (!bar.shadowRoot!.querySelector('[part="indicator"]')) {
        throw new Error('Missing [part="indicator"]')
      }
    })
    it('has [part="panels"]', async () => {
      const bar = await mountTabs()
      if (!bar.shadowRoot!.querySelector('[part="panels"]')) {
        throw new Error('Missing [part="panels"]')
      }
    })
  })

  // ─── ARIA ──────────────────────────────────────────────────────────────────

  describe('ARIA — bar', () => {
    it('tablist has aria-orientation reflecting orientation', async () => {
      const bar = await mountTabs({ orientation: 'vertical' })
      const tablist = bar.shadowRoot!.querySelector('[part="tablist"]')!
      if (tablist.getAttribute('aria-orientation') !== 'vertical') {
        throw new Error('Expected aria-orientation="vertical"')
      }
    })
    it('warns when aria-label/aria-labelledby is absent', async () => {
      const warnings: string[] = []
      const orig = console.warn
      console.warn = (...args: unknown[]) => warnings.push(String(args[0]))
      await FluidTestUtils.mount(
        `<fluid-tab-bar>` +
        `<fluid-tab tab-id="x" panel="y">X</fluid-tab>` +
        `<fluid-tab-panel slot="panel" panel-id="y">Y</fluid-tab-panel>` +
        `</fluid-tab-bar>`
      )
      console.warn = orig
      if (!warnings.some(w => w.includes('fluid-tab-bar'))) {
        throw new Error('Expected console.warn about unnamed tablist')
      }
    })
  })

  // ─── Criterion 4: aria-selected, never aria-current ───────────────────────

  describe('aria-selected / no aria-current (criterion 4)', () => {
    it('active tab has aria-selected="true"', async () => {
      const bar = await mountTabs()
      const t1 = bar.querySelector('fluid-tab[tab-id="t1"]')!
      if (t1.getAttribute('aria-selected') !== 'true') {
        throw new Error('Expected aria-selected="true" on first tab')
      }
    })
    it('inactive tabs have aria-selected="false"', async () => {
      const bar = await mountTabs()
      const t2 = bar.querySelector('fluid-tab[tab-id="t2"]')!
      if (t2.getAttribute('aria-selected') !== 'false') {
        throw new Error('Expected aria-selected="false" on non-active tab')
      }
    })
    it('no element ever has aria-current', async () => {
      const bar = await mountTabs()
      const allEls = [bar, ...Array.from(bar.querySelectorAll('*'))]
      if (allEls.some(el => el.hasAttribute('aria-current'))) {
        throw new Error('aria-current must never appear on tab elements')
      }
    })
  })

  // ─── Criterion 5: aria-controls / aria-labelledby ─────────────────────────

  describe('ARIA wiring (criterion 5)', () => {
    it('tab aria-controls equals its panel-id', async () => {
      const bar = await mountTabs()
      const t1 = bar.querySelector('fluid-tab[tab-id="t1"]')!
      const p1 = bar.querySelector('fluid-tab-panel[panel-id="p1"]')!
      if (t1.getAttribute('aria-controls') !== p1.getAttribute('panel-id')) {
        throw new Error('aria-controls on tab must equal panel-id of its panel')
      }
    })
    it('panel aria-labelledby equals its controlling tab-id', async () => {
      const bar = await mountTabs()
      const t1 = bar.querySelector('fluid-tab[tab-id="t1"]')!
      const p1 = bar.querySelector('fluid-tab-panel[panel-id="p1"]')!
      if (p1.getAttribute('aria-labelledby') !== t1.getAttribute('tab-id')) {
        throw new Error('aria-labelledby on panel must equal tab-id of controlling tab')
      }
    })
  })

  // ─── Criterion 6: roving tabindex ─────────────────────────────────────────

  describe('roving tabindex (criterion 6)', () => {
    it('exactly one tab has tabindex=0 (the active one)', async () => {
      const bar = await mountTabs()
      const tabs = Array.from(bar.querySelectorAll('fluid-tab'))
      const zeros = tabs.filter(t => t.getAttribute('tabindex') === '0')
      if (zeros.length !== 1) throw new Error(`Expected exactly 1 tabindex=0, got ${zeros.length}`)
      if (zeros[0]!.getAttribute('tab-id') !== 't1') throw new Error('tabindex=0 must be on the active tab')
    })
    it('disabled tab has tabindex=-1', async () => {
      const bar = await mountTabs()
      const t3 = bar.querySelector('fluid-tab[tab-id="t3"]')!
      if (t3.getAttribute('tabindex') !== '-1') throw new Error('disabled tab must have tabindex=-1')
    })
  })

  // ─── Criterion 7: panel visibility ────────────────────────────────────────

  describe('panel visibility (criterion 7)', () => {
    it('active panel is visible (no hidden attr), inactive panels have hidden attr', async () => {
      const bar = await mountTabs()
      const p1 = bar.querySelector('fluid-tab-panel[panel-id="p1"]')!
      const p2 = bar.querySelector('fluid-tab-panel[panel-id="p2"]')!
      if (p1.hasAttribute('hidden')) throw new Error('Active panel must not be hidden')
      if (!p2.hasAttribute('hidden')) throw new Error('Inactive panel must have hidden attribute')
    })
  })

  // ─── Criterion 8: activation + fluid:change ───────────────────────────────

  describe('activation (criterion 8)', () => {
    it('clicking tab 2 shows panel 2 and fires fluid:change with correct detail', async () => {
      const bar = await mountTabs()
      let detail: { activeId: string; previousId: string | null } | null = null
      bar.addEventListener('fluid:change', (e: Event) => {
        detail = (e as CustomEvent).detail
      })
      ;(bar.querySelector('fluid-tab[tab-id="t2"]') as HTMLElement).click()
      await waitFrames(4)
      if (!detail) throw new Error('fluid:change did not fire')
      if ((detail as any).activeId !== 't2') throw new Error(`Expected activeId="t2"`)
      if ((detail as any).previousId !== 't1') throw new Error(`Expected previousId="t1"`)
      const p2 = bar.querySelector('fluid-tab-panel[panel-id="p2"]')!
      if (p2.hasAttribute('hidden')) throw new Error('Panel 2 should be visible after activation')
      if (!bar.querySelector('fluid-tab-panel[panel-id="p1"]')!.hasAttribute('hidden')) {
        throw new Error('Panel 1 should be hidden after switching')
      }
    })
  })

  // ─── Criteria 9-10: controlled / uncontrolled ─────────────────────────────

  describe('controlled / uncontrolled (criteria 9–10)', () => {
    it('uncontrolled: clicking tab 2 self-selects it', async () => {
      const bar = await mountTabs()
      ;(bar.querySelector('fluid-tab[tab-id="t2"]') as HTMLElement).click()
      await waitFrames(4)
      const t2 = bar.querySelector('fluid-tab[tab-id="t2"]')!
      if (t2.getAttribute('aria-selected') !== 'true') {
        throw new Error('Expected aria-selected="true" on clicked tab in uncontrolled mode')
      }
    })
    it('controlled: clicking fires fluid:change but does NOT change selection', async () => {
      const bar = await mountTabs({ controlledId: 't1' })
      let fired = false
      bar.addEventListener('fluid:change', () => { fired = true })
      ;(bar.querySelector('fluid-tab[tab-id="t2"]') as HTMLElement).click()
      await waitFrames(4)
      if (!fired) throw new Error('fluid:change must fire even in controlled mode')
      const t1 = bar.querySelector('fluid-tab[tab-id="t1"]')!
      if (t1.getAttribute('aria-selected') !== 'true') {
        throw new Error('Controlled: t1 must remain selected')
      }
    })
    it('controlled: updating active-tab attribute changes selection', async () => {
      const bar = await mountTabs({ controlledId: 't1' })
      bar.setAttribute('active-tab', 't2')
      await waitFrames(4)
      const t2 = bar.querySelector('fluid-tab[tab-id="t2"]')!
      if (t2.getAttribute('aria-selected') !== 'true') {
        throw new Error('Expected t2 selected after programmatic active-tab update')
      }
    })
  })

  // ─── Criteria 11-17: Keyboard ─────────────────────────────────────────────

  describe('keyboard — APG (criteria 11-17)', () => {
    it('active tab has tabindex=0 (Tab-into lands on it)', async () => {
      const bar = await mountTabs()
      const t1 = bar.querySelector('fluid-tab[tab-id="t1"]')!
      if (t1.getAttribute('tabindex') !== '0') {
        throw new Error('Active tab must have tabindex=0')
      }
    })
    it('ArrowRight moves focus to t2 (skips disabled t3)', async () => {
      const bar = await mountTabs()
      const t1 = bar.querySelector('fluid-tab[tab-id="t1"]') as HTMLElement
      t1.focus()
      t1.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
      await waitFrames(2)
      if (document.activeElement !== bar.querySelector('fluid-tab[tab-id="t2"]')) {
        throw new Error('ArrowRight should focus t2')
      }
    })
    it('ArrowRight from t2 wraps to t1 (skips disabled t3)', async () => {
      const bar = await mountTabs()
      const t2 = bar.querySelector('fluid-tab[tab-id="t2"]') as HTMLElement
      t2.focus()
      t2.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
      await waitFrames(2)
      if (document.activeElement !== bar.querySelector('fluid-tab[tab-id="t1"]')) {
        throw new Error('ArrowRight from last enabled tab should wrap to t1')
      }
    })
    it('ArrowLeft from t1 wraps to t2', async () => {
      const bar = await mountTabs()
      const t1 = bar.querySelector('fluid-tab[tab-id="t1"]') as HTMLElement
      t1.focus()
      t1.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
      await waitFrames(2)
      if (document.activeElement !== bar.querySelector('fluid-tab[tab-id="t2"]')) {
        throw new Error('ArrowLeft from first tab should wrap to t2')
      }
    })
    it('automatic: ArrowRight activates t2', async () => {
      const bar = await mountTabs({ activation: 'automatic' })
      let detail: any = null
      bar.addEventListener('fluid:change', (e: Event) => { detail = (e as CustomEvent).detail })
      const t1 = bar.querySelector('fluid-tab[tab-id="t1"]') as HTMLElement
      t1.focus()
      t1.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
      await waitFrames(2)
      if (!detail || detail.activeId !== 't2') {
        throw new Error('automatic mode: ArrowRight should also activate focused tab')
      }
    })
    it('manual: ArrowRight moves focus but does NOT activate', async () => {
      const bar = await mountTabs({ activation: 'manual' })
      let fired = false
      bar.addEventListener('fluid:change', () => { fired = true })
      const t1 = bar.querySelector('fluid-tab[tab-id="t1"]') as HTMLElement
      t1.focus()
      t1.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
      await waitFrames(2)
      if (fired) throw new Error('manual mode: ArrowRight must NOT activate')
    })
    it('manual: Enter on focused tab activates it', async () => {
      const bar = await mountTabs({ activation: 'manual' })
      let detail: any = null
      bar.addEventListener('fluid:change', (e: Event) => { detail = (e as CustomEvent).detail })
      const t2 = bar.querySelector('fluid-tab[tab-id="t2"]') as HTMLElement
      t2.focus()
      t2.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await waitFrames(2)
      if (!detail || detail.activeId !== 't2') {
        throw new Error('manual mode: Enter should activate focused tab')
      }
    })
    it('Home focuses first enabled tab (t1) and activates in automatic mode', async () => {
      const bar = await mountTabs({ activation: 'automatic' })
      const t2 = bar.querySelector('fluid-tab[tab-id="t2"]') as HTMLElement
      t2.focus()
      let detail: any = null
      bar.addEventListener('fluid:change', (e: Event) => { detail = (e as CustomEvent).detail })
      t2.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }))
      await waitFrames(2)
      if (document.activeElement !== bar.querySelector('fluid-tab[tab-id="t1"]')) {
        throw new Error('Home should focus t1')
      }
      if (!detail || detail.activeId !== 't1') {
        throw new Error('automatic: Home should activate t1')
      }
    })
    it('End focuses last enabled tab (t2, not disabled t3) and activates in automatic mode', async () => {
      const bar = await mountTabs({ activation: 'automatic' })
      const t1 = bar.querySelector('fluid-tab[tab-id="t1"]') as HTMLElement
      t1.focus()
      let detail: any = null
      bar.addEventListener('fluid:change', (e: Event) => { detail = (e as CustomEvent).detail })
      t1.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
      await waitFrames(2)
      if (document.activeElement !== bar.querySelector('fluid-tab[tab-id="t2"]')) {
        throw new Error('End should focus last enabled tab (t2)')
      }
      if (!detail || detail.activeId !== 't2') {
        throw new Error('automatic: End should activate t2')
      }
    })
    it('vertical: ArrowDown moves focus, ArrowRight is inert', async () => {
      const bar = await mountTabs({ orientation: 'vertical' })
      const t1 = bar.querySelector('fluid-tab[tab-id="t1"]') as HTMLElement
      let fired = false
      bar.addEventListener('fluid:change', () => { fired = true })
      t1.focus()
      t1.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
      await waitFrames(1)
      if (fired) throw new Error('vertical: ArrowRight should be inert')
      t1.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await waitFrames(2)
      if (document.activeElement !== bar.querySelector('fluid-tab[tab-id="t2"]')) {
        throw new Error('vertical: ArrowDown should move to t2')
      }
    })
    it('active panel has tabindex=0 (Tab from tablist moves into it)', async () => {
      const bar = await mountTabs()
      const p1 = bar.querySelector('fluid-tab-panel[panel-id="p1"]')!
      if (p1.getAttribute('tabindex') !== '0') {
        throw new Error('Active panel must have tabindex=0')
      }
    })
  })

  // ─── Criterion 1: composed:false context protocol ─────────────────────────

  describe('context protocol (criterion 1)', () => {
    it('fluid:context-request uses composed:false', async () => {
      let capturedComposed: boolean | undefined
      const outer = document.createElement('div')
      document.body.appendChild(outer)
      outer.addEventListener('fluid:context-request', (e) => {
        capturedComposed = (e as CustomEvent).composed
      })
      const tab = document.createElement('fluid-tab') as HTMLElement
      tab.setAttribute('tab-id', 'solo')
      tab.setAttribute('panel', 'solo-panel')
      outer.appendChild(tab)
      await waitFrames(4)
      if (capturedComposed === true) {
        throw new Error('fluid:context-request must have composed:false')
      }
      outer.remove()
    })
    it('bar.tabs reflects registered tabs', async () => {
      const bar = await mountTabs() as any
      if (!Array.isArray(bar.tabs)) throw new Error('bar.tabs must be an array')
      const ids = (bar.tabs as any[]).map((t: any) => t.getAttribute('tab-id'))
      if (!ids.includes('t1') || !ids.includes('t2')) {
        throw new Error('t1 and t2 should be in bar.tabs')
      }
    })
  })

  // ─── Criterion 2: nearest-provider ────────────────────────────────────────

  describe('nested tab-bars (criterion 2)', () => {
    it('nested bar: inner tab registers with inner bar only', async () => {
      const outer = await FluidTestUtils.mount(
        `<fluid-tab-bar aria-label="Outer" id="outer-bar">` +
        `<fluid-tab tab-id="outer-tab" panel="outer-panel">Outer Tab</fluid-tab>` +
        `<fluid-tab-panel slot="panel" panel-id="outer-panel">` +
        `<fluid-tab-bar aria-label="Inner" id="inner-bar">` +
        `<fluid-tab tab-id="inner-tab" panel="inner-panel">Inner Tab</fluid-tab>` +
        `<fluid-tab-panel slot="panel" panel-id="inner-panel">Inner Content</fluid-tab-panel>` +
        `</fluid-tab-bar>` +
        `</fluid-tab-panel>` +
        `</fluid-tab-bar>`
      )
      await waitFrames(8)
      const innerBar = outer.querySelector('#inner-bar') as any
      const ids = ((innerBar.tabs as any[]) ?? []).map((t: any) => t.getAttribute('tab-id'))
      if (ids.includes('outer-tab')) throw new Error('outer-tab should not be in inner bar.tabs')
      if (!ids.includes('inner-tab')) throw new Error('inner-tab should be in inner bar.tabs')
    })
  })

  // ─── Standard matrix ──────────────────────────────────────────────────────

  describe('standard matrix', () => {
    it('fluid-tab has role="tab"', async () => {
      const bar = await mountTabs()
      const t1 = bar.querySelector('fluid-tab[tab-id="t1"]')!
      if (t1.getAttribute('role') !== 'tab') throw new Error('Expected role="tab"')
    })
    it('fluid-tab-panel has role="tabpanel"', async () => {
      const bar = await mountTabs()
      const p1 = bar.querySelector('fluid-tab-panel[panel-id="p1"]')!
      if (p1.getAttribute('role') !== 'tabpanel') throw new Error('Expected role="tabpanel"')
    })
    it('disabled tab has aria-disabled="true"', async () => {
      const bar = await mountTabs()
      const t3 = bar.querySelector('fluid-tab[tab-id="t3"]')!
      if (t3.getAttribute('aria-disabled') !== 'true') throw new Error('Expected aria-disabled="true"')
    })
    it('renders at Matte tier', async () => {
      FluidTestUtils.mockTier('matte')
      const bar = await mountTabs()
      if (!bar.shadowRoot) throw new Error('No shadow root at Matte tier')
    })
    it('renders at Frosted tier', async () => {
      FluidTestUtils.mockTier('frosted')
      const bar = await mountTabs()
      if (!bar.shadowRoot) throw new Error('No shadow root at Frosted tier')
    })
    it('renders at Crystalline tier', async () => {
      FluidTestUtils.mockTier('crystalline')
      const bar = await mountTabs()
      if (!bar.shadowRoot) throw new Error('No shadow root at Crystalline tier')
    })
    it('fluid:activate fires on fluid-tab click', async () => {
      const bar = await mountTabs()
      let activated = false
      bar.querySelector('fluid-tab[tab-id="t2"]')!
        .addEventListener('fluid:activate', () => { activated = true })
      ;(bar.querySelector('fluid-tab[tab-id="t2"]') as HTMLElement).click()
      await waitFrames(2)
      if (!activated) throw new Error('fluid:activate must fire on tab click')
    })
    it('disconnectedCallback runs without error', async () => {
      await mountTabs()
      FluidTestUtils.cleanup()
      // If disposers throw, this will throw. Passing = no leaks.
    })
  })
})
