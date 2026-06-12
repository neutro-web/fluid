import { _hasActiveAnimations } from '../core/driver'
import { FluidLedger, ledger } from '../core/ledger'
import type { FluidTier } from '../core/ledger'

let _fixture: HTMLElement | null = null
let _savedTier: FluidTier | null = null

function applyTierToLedger(tier: FluidTier): void {
  // Directly mutate ledger so mockTier works regardless of DEV/production mode.
  // FluidLedger.forceTier is also called for completeness in DEV mode.
  ledger.tier = tier
  ledger.backdropFilter = tier !== 'matte'
  ledger.waapi = tier === 'crystalline' || tier === 'optical'
  ledger.houdiniPaint = tier === 'optical'
  FluidLedger.forceTier(tier)
}

export const FluidTestUtils = {
  /**
   * Parses `html` into a fixture container, attaches it to document.body, and
   * resolves once the first child element fires `fluid:mounted`. Falls back to
   * two animation frames for elements that don't emit the event (plain HTML).
   * Call `cleanup()` in afterEach.
   */
  mount(html: string): Promise<HTMLElement> {
    if (!_fixture) {
      _fixture = document.createElement('div')
      _fixture.id = 'fluid-test-fixture'
      document.body.appendChild(_fixture)
    }
    _fixture.innerHTML = html
    const el = _fixture.firstElementChild as HTMLElement | null
    if (!el) return Promise.reject(new Error('FluidTestUtils.mount: html produced no element'))

    return new Promise<HTMLElement>((resolve) => {
      let settled = false
      const finish = (): void => {
        if (!settled) {
          settled = true
          resolve(el)
        }
      }
      el.addEventListener('fluid:mounted', finish, { once: true })
      // Fallback: resolve after two rAFs for elements that don't emit fluid:mounted
      requestAnimationFrame(() => requestAnimationFrame(finish))
    })
  },

  /** Removes the fixture container from the DOM. */
  cleanup(): void {
    if (_fixture) {
      _fixture.remove()
      _fixture = null
    }
  },

  /**
   * Waits for all active spring animations on `el` to settle.
   * Polls every animation frame; throws if `timeoutMs` elapses first.
   */
  async waitForSpringSettle(el: Element, timeoutMs = 2000): Promise<void> {
    const deadline = performance.now() + timeoutMs
    while (_hasActiveAnimations(el)) {
      if (performance.now() > deadline) {
        throw new Error(`FluidTestUtils.waitForSpringSettle: spring on <${el.tagName.toLowerCase()}> did not settle within ${timeoutMs}ms`)
      }
      await new Promise<void>(r => { requestAnimationFrame(() => r()) })
    }
  },

  /**
   * Forces the Fluid capability tier for the duration of a test.
   * Saves the current tier and sets window.__FLUID_FORCE_TIER__ so
   * subsequently-mounted components see the same tier.
   */
  mockTier(tier: FluidTier): void {
    _savedTier = ledger.tier
    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>).__FLUID_FORCE_TIER__ = tier
    }
    applyTierToLedger(tier)
  },

  /**
   * Restores the tier saved by the last `mockTier()` call and clears
   * window.__FLUID_FORCE_TIER__.
   */
  restoreTier(): void {
    if (_savedTier !== null) {
      const saved = _savedTier
      _savedTier = null
      if (typeof window !== 'undefined') {
        delete (window as unknown as Record<string, unknown>).__FLUID_FORCE_TIER__
      }
      applyTierToLedger(saved)
    }
  },
}
