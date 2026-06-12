import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ScrollLockManager } from './scroll-lock'

type BodyStyle = Record<string, string>

function makeBodyStyle(initial: Record<string, string> = {}): BodyStyle {
  const store: Record<string, string> = { ...initial }
  return new Proxy(store, {
    get: (t, k: string) => (k in t ? t[k] : ''),
    set: (t, k: string, v: string) => { t[k] = v; return true },
  })
}

interface DOMSetup {
  bodyStyle: BodyStyle
  scrollTo: ReturnType<typeof vi.fn>
}

function setupDOM(scrollbarWidth = 16, scrollY = 0, isIOS = false): DOMSetup {
  const bodyStyle = makeBodyStyle()
  const scrollTo = vi.fn()

  vi.stubGlobal('window', {
    innerWidth: 1024,
    scrollY,
    pageYOffset: scrollY,
    scrollTo,
  })
  vi.stubGlobal('document', {
    documentElement: { clientWidth: 1024 - scrollbarWidth },
    body: { style: bodyStyle },
  })
  vi.stubGlobal('navigator', {
    userAgent: isIOS
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  })

  return { bodyStyle, scrollTo }
}

describe('ScrollLockManager', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  describe('basic lock/unlock', () => {
    it('sets overflow hidden on lock', () => {
      const { bodyStyle } = setupDOM(16)
      const mgr = new ScrollLockManager()
      mgr.lock()
      expect(bodyStyle['overflow']).toBe('hidden')
    })

    it('sets padding-right equal to scrollbar width on lock', () => {
      const { bodyStyle } = setupDOM(16)
      const mgr = new ScrollLockManager()
      mgr.lock()
      expect(bodyStyle['paddingRight']).toBe('16px')
    })

    it('restores overflow on unlock', () => {
      const { bodyStyle } = setupDOM(16)
      bodyStyle['overflow'] = 'auto'
      const mgr = new ScrollLockManager()
      mgr.lock()
      mgr.unlock()
      expect(bodyStyle['overflow']).toBe('auto')
    })

    it('restores padding-right on unlock', () => {
      const { bodyStyle } = setupDOM(16)
      bodyStyle['paddingRight'] = '8px'
      const mgr = new ScrollLockManager()
      mgr.lock()
      mgr.unlock()
      expect(bodyStyle['paddingRight']).toBe('8px')
    })

    it('unlock is a no-op when not locked', () => {
      setupDOM(16)
      const mgr = new ScrollLockManager()
      expect(() => mgr.unlock()).not.toThrow()
    })
  })

  describe('reference counting', () => {
    it('requires two unlocks after two locks', () => {
      const { bodyStyle } = setupDOM(16)
      const mgr = new ScrollLockManager()
      mgr.lock()
      mgr.lock()
      mgr.unlock()
      // still locked after one unlock
      expect(bodyStyle['overflow']).toBe('hidden')
      mgr.unlock()
      // restored after second unlock
      expect(bodyStyle['overflow']).toBe('')
    })

    it('applies DOM styles only on the first lock', () => {
      const { bodyStyle } = setupDOM(8)
      const mgr = new ScrollLockManager()
      mgr.lock()
      bodyStyle['paddingRight'] = 'SENTINEL' // mutate after first lock
      mgr.lock() // second lock must not re-apply
      expect(bodyStyle['paddingRight']).toBe('SENTINEL')
    })
  })

  describe('iOS handling', () => {
    it('sets position fixed and top on lock for iOS UA', () => {
      const { bodyStyle } = setupDOM(0, 300, true)
      const mgr = new ScrollLockManager()
      mgr.lock()
      expect(bodyStyle['position']).toBe('fixed')
      expect(bodyStyle['top']).toBe('-300px')
    })

    it('restores scroll position via scrollTo on unlock for iOS', () => {
      const { scrollTo } = setupDOM(0, 300, true)
      const mgr = new ScrollLockManager()
      mgr.lock()
      mgr.unlock()
      expect(scrollTo).toHaveBeenCalledWith(0, 300)
    })

    it('restores position and top on unlock for iOS', () => {
      const { bodyStyle } = setupDOM(0, 300, true)
      bodyStyle['position'] = 'static'
      bodyStyle['top'] = 'auto'
      const mgr = new ScrollLockManager()
      mgr.lock()
      mgr.unlock()
      expect(bodyStyle['position']).toBe('static')
      expect(bodyStyle['top']).toBe('auto')
    })

    it('does not set position fixed on non-iOS UA', () => {
      const { bodyStyle } = setupDOM(16, 0, false)
      const mgr = new ScrollLockManager()
      mgr.lock()
      expect(bodyStyle['position']).toBe('')
    })
  })
})
