import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { FluidCapabilityLedger, FluidTier } from './ledger'

// ---- helpers ----

function makeMql(matches: boolean) {
  return {
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }
}

type MqlMock = ReturnType<typeof makeMql>

interface BrowserGlobalsOptions {
  backdropFilterSupported?: boolean
  webkitBackdropFilterSupported?: boolean
  waapiSupported?: boolean   // commitStyles in Animation.prototype
  readyState?: DocumentReadyState
  prefersReducedMotion?: boolean
  prefersContrast?: boolean
  prefersReducedTransparency?: boolean
  forcedColors?: boolean
  deviceMemory?: number        // absent from navigator when undefined
  hardwareConcurrency?: number | null  // null = absent from navigator
  saveData?: boolean | null    // null = connection absent from navigator
  forceTierWindow?: string
  urlSearch?: string
  paintWorklet?: { addModule: ReturnType<typeof vi.fn> }
}

interface BrowserGlobalsResult {
  mockMatchMedia: ReturnType<typeof vi.fn>
  mockDocument: {
    readyState: string
    addEventListener: ReturnType<typeof vi.fn>
    dispatchEvent: ReturnType<typeof vi.fn>
  }
  mockWindow: Record<string, unknown>
  // Returns all MQLs created for a given query string — robust against insertion order changes.
  getMqls: (query: string) => MqlMock[]
}

function setupBrowserGlobals(opts: BrowserGlobalsOptions = {}): BrowserGlobalsResult {
  const {
    backdropFilterSupported = false,
    webkitBackdropFilterSupported = false,
    waapiSupported = false,
    readyState = 'complete',
    prefersReducedMotion = false,
    prefersContrast = false,
    prefersReducedTransparency = false,
    forcedColors = false,
    deviceMemory,
    hardwareConcurrency = 4,
    saveData = false,
    forceTierWindow,
    urlSearch = '',
    paintWorklet,
  } = opts

  const mqlsByQuery: Map<string, MqlMock[]> = new Map()

  const mockMatchMedia = vi.fn().mockImplementation((query: string) => {
    const mql = (() => {
      if (query === '(prefers-reduced-motion: reduce)') return makeMql(prefersReducedMotion)
      if (query === '(prefers-contrast: more)') return makeMql(prefersContrast)
      if (query === '(prefers-reduced-transparency: reduce)') return makeMql(prefersReducedTransparency)
      if (query === '(forced-colors: active)') return makeMql(forcedColors)
      return makeMql(false)
    })()
    const list = mqlsByQuery.get(query) ?? []
    list.push(mql)
    mqlsByQuery.set(query, list)
    return mql
  })

  const mockDocument = {
    readyState: readyState as string,
    addEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }

  const mockWindow: Record<string, unknown> = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }
  if (forceTierWindow !== undefined) {
    mockWindow.__FLUID_FORCE_TIER__ = forceTierWindow
  }

  const nav: Record<string, unknown> = {}
  if (hardwareConcurrency !== null) {
    nav.hardwareConcurrency = hardwareConcurrency
  }
  if (saveData !== null) {
    nav.connection = { saveData }
  }
  if (deviceMemory !== undefined) {
    nav.deviceMemory = deviceMemory
  }

  const animationProto: Record<string, unknown> = {}
  if (waapiSupported) {
    animationProto.commitStyles = vi.fn()
  }

  const cssSupports = vi.fn().mockImplementation((prop: string) => {
    if (prop === 'backdrop-filter') return backdropFilterSupported
    if (prop === '-webkit-backdrop-filter') return webkitBackdropFilterSupported
    return false
  })
  const cssObj: Record<string, unknown> = { supports: cssSupports }
  if (paintWorklet !== undefined) {
    cssObj.paintWorklet = paintWorklet
  }

  // Polyfill CustomEvent for Node.js environments where it may be absent
  if (typeof CustomEvent === 'undefined') {
    vi.stubGlobal(
      'CustomEvent',
      class extends Event {
        readonly detail: unknown
        constructor(type: string, init?: CustomEventInit) {
          super(type, init)
          this.detail = init?.detail ?? null
        }
      },
    )
  }

  vi.stubGlobal('window', mockWindow)
  vi.stubGlobal('document', mockDocument)
  vi.stubGlobal('matchMedia', mockMatchMedia)
  vi.stubGlobal('navigator', nav)
  vi.stubGlobal('Animation', { prototype: animationProto })
  vi.stubGlobal('CSS', cssObj)
  vi.stubGlobal('location', { search: urlSearch })

  return {
    mockMatchMedia,
    mockDocument,
    mockWindow,
    getMqls: (query: string) => mqlsByQuery.get(query) ?? [],
  }
}

// ---- P0-T2-01: SSR path ----

describe('P0-T2-01: SSR path (no window)', () => {
  beforeEach(() => vi.resetModules())

  it('ledger has tier matte and all capabilities false', async () => {
    const { ledger } = await import('./ledger')
    expect(ledger.tier).toBe('matte')
    expect(ledger.backdropFilter).toBe(false)
    expect(ledger.waapi).toBe(false)
    expect(ledger.houdiniPaint).toBe(false)
    expect(ledger.prefersReducedMotion).toBe(false)
    expect(ledger.prefersContrast).toBe(false)
    expect(ledger.prefersReducedTransparency).toBe(false)
    expect(ledger.forcedColors).toBe(false)
    expect(ledger.deviceMemoryLow).toBe(false)
    expect(ledger.cpuCoresLow).toBe(false)
    expect(ledger.saveData).toBe(false)
  })

  it('ledger equals SSR_SAFE_DEFAULTS structurally but is a distinct object', async () => {
    const { ledger, SSR_SAFE_DEFAULTS } = await import('./ledger')
    expect(ledger).toEqual(SSR_SAFE_DEFAULTS)
    expect(ledger).not.toBe(SSR_SAFE_DEFAULTS)
  })

  it('SSR_SAFE_DEFAULTS is never mutated by the ledger', async () => {
    const { ledger, SSR_SAFE_DEFAULTS } = await import('./ledger')
    ledger.tier = 'frosted'
    expect(SSR_SAFE_DEFAULTS.tier).toBe('matte')
  })

  it('_houdiniPhase is null in SSR', async () => {
    const mod = await import('./ledger')
    expect(mod._houdiniPhase).toBeNull()
  })
})

// ---- P0-T2-01: Browser sync detection ----

describe('P0-T2-01: browser sync detection', () => {
  beforeEach(() => vi.resetModules())
  afterEach(() => vi.unstubAllGlobals())

  it('tier is matte when backdropFilter is not supported', async () => {
    setupBrowserGlobals({ backdropFilterSupported: false })
    const { ledger } = await import('./ledger')
    expect(ledger.tier).toBe('matte')
    expect(ledger.backdropFilter).toBe(false)
  })

  it('detects -webkit-backdrop-filter (Safari 14–17) and assigns frosted', async () => {
    setupBrowserGlobals({
      backdropFilterSupported: false,
      webkitBackdropFilterSupported: true,
      waapiSupported: false,
    })
    const { ledger } = await import('./ledger')
    expect(ledger.backdropFilter).toBe(true)
    expect(ledger.tier).toBe('frosted')
  })

  it('tier is frosted when backdropFilter supported but WAAPI (commitStyles) absent', async () => {
    setupBrowserGlobals({ backdropFilterSupported: true, waapiSupported: false })
    const { ledger } = await import('./ledger')
    expect(ledger.tier).toBe('frosted')
    expect(ledger.backdropFilter).toBe(true)
    expect(ledger.waapi).toBe(false)
  })

  it('waapi requires commitStyles in Animation.prototype, not just Element.prototype.animate', async () => {
    // Element.prototype.animate present but no commitStyles — must stay frosted
    setupBrowserGlobals({ backdropFilterSupported: true, waapiSupported: false })
    const { ledger } = await import('./ledger')
    expect(ledger.waapi).toBe(false)
    expect(ledger.tier).toBe('frosted')
  })

  it('tier is crystalline when backdropFilter and commitStyles-WAAPI are present', async () => {
    setupBrowserGlobals({ backdropFilterSupported: true, waapiSupported: true })
    const { ledger } = await import('./ledger')
    expect(ledger.tier).toBe('crystalline')
    expect(ledger.backdropFilter).toBe(true)
    expect(ledger.waapi).toBe(true)
    expect(ledger.houdiniPaint).toBe(false) // always false in sync phase
  })

  it('detects prefersReducedMotion: true', async () => {
    setupBrowserGlobals({ prefersReducedMotion: true })
    const { ledger } = await import('./ledger')
    expect(ledger.prefersReducedMotion).toBe(true)
  })

  it('detects prefersContrast: true', async () => {
    setupBrowserGlobals({ prefersContrast: true })
    const { ledger } = await import('./ledger')
    expect(ledger.prefersContrast).toBe(true)
  })

  it('detects prefersReducedTransparency: true', async () => {
    setupBrowserGlobals({ prefersReducedTransparency: true })
    const { ledger } = await import('./ledger')
    expect(ledger.prefersReducedTransparency).toBe(true)
  })

  it('detects forcedColors: true', async () => {
    setupBrowserGlobals({ forcedColors: true })
    const { ledger } = await import('./ledger')
    expect(ledger.forcedColors).toBe(true)
  })

  it('deviceMemoryLow is true when deviceMemory < 2', async () => {
    setupBrowserGlobals({ deviceMemory: 1 })
    const { ledger } = await import('./ledger')
    expect(ledger.deviceMemoryLow).toBe(true)
  })

  it('deviceMemoryLow is false when deviceMemory >= 2', async () => {
    setupBrowserGlobals({ deviceMemory: 4 })
    const { ledger } = await import('./ledger')
    expect(ledger.deviceMemoryLow).toBe(false)
  })

  it('deviceMemoryLow is false when deviceMemory is absent from navigator', async () => {
    setupBrowserGlobals({ deviceMemory: undefined })
    const { ledger } = await import('./ledger')
    expect(ledger.deviceMemoryLow).toBe(false)
  })

  it('cpuCoresLow is true when hardwareConcurrency <= 2', async () => {
    setupBrowserGlobals({ hardwareConcurrency: 2 })
    const { ledger } = await import('./ledger')
    expect(ledger.cpuCoresLow).toBe(true)
  })

  it('cpuCoresLow is false when hardwareConcurrency > 2', async () => {
    setupBrowserGlobals({ hardwareConcurrency: 8 })
    const { ledger } = await import('./ledger')
    expect(ledger.cpuCoresLow).toBe(false)
  })

  it('cpuCoresLow is false when hardwareConcurrency is absent from navigator', async () => {
    setupBrowserGlobals({ hardwareConcurrency: null })
    const { ledger } = await import('./ledger')
    expect(ledger.cpuCoresLow).toBe(false)
  })

  it('saveData is true from navigator.connection.saveData', async () => {
    setupBrowserGlobals({ saveData: true })
    const { ledger } = await import('./ledger')
    expect(ledger.saveData).toBe(true)
  })

  it('saveData is false when connection.saveData is false', async () => {
    setupBrowserGlobals({ saveData: false })
    const { ledger } = await import('./ledger')
    expect(ledger.saveData).toBe(false)
  })

  it('saveData is false when navigator.connection is absent', async () => {
    setupBrowserGlobals({ saveData: null })
    const { ledger } = await import('./ledger')
    expect(ledger.saveData).toBe(false)
  })
})

// ---- P0-T2-02: Async phase ----

describe('P0-T2-02: async phase — Houdini upgrade', () => {
  beforeEach(() => vi.resetModules())
  afterEach(() => vi.unstubAllGlobals())

  it('upgrades tier to optical on successful worklet registration', async () => {
    const addModule = vi.fn().mockResolvedValue(undefined)
    setupBrowserGlobals({
      backdropFilterSupported: true,
      waapiSupported: true,
      paintWorklet: { addModule },
    })

    const mod = await import('./ledger')
    await mod._houdiniPhase

    expect(mod.ledger.tier).toBe('optical')
    expect(mod.ledger.houdiniPaint).toBe(true)
    expect(addModule).toHaveBeenCalledOnce()
  })

  it('dispatches fluidledger:upgrade with previousTier and newTier', async () => {
    const addModule = vi.fn().mockResolvedValue(undefined)
    const { mockDocument } = setupBrowserGlobals({
      backdropFilterSupported: true,
      waapiSupported: true,
      paintWorklet: { addModule },
    })

    const mod = await import('./ledger')
    await mod._houdiniPhase

    expect(mockDocument.dispatchEvent).toHaveBeenCalledOnce()
    const event = mockDocument.dispatchEvent.mock.calls[0]?.[0] as CustomEvent
    expect(event.type).toBe('fluidledger:upgrade')
    expect(event.detail).toEqual({ previousTier: 'crystalline', newTier: 'optical' })
  })

  it('stays at crystalline and skips event when worklet registration fails', async () => {
    const addModule = vi.fn().mockRejectedValue(new Error('CSP blocked'))
    const { mockDocument } = setupBrowserGlobals({
      backdropFilterSupported: true,
      waapiSupported: true,
      paintWorklet: { addModule },
    })

    const mod = await import('./ledger')
    await mod._houdiniPhase

    expect(mod.ledger.tier).toBe('crystalline')
    expect(mod.ledger.houdiniPaint).toBe(false)
    expect(mockDocument.dispatchEvent).not.toHaveBeenCalled()
  })

  it('logs a warning containing "CSP" on worklet failure', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const addModule = vi.fn().mockRejectedValue(new Error('blocked'))
    setupBrowserGlobals({
      backdropFilterSupported: true,
      waapiSupported: true,
      paintWorklet: { addModule },
    })

    const mod = await import('./ledger')
    await mod._houdiniPhase

    const [msg] = warnSpy.mock.calls[0] ?? []
    expect(typeof msg === 'string' && msg.includes('CSP')).toBe(true)
    warnSpy.mockRestore()
  })

  it('does not attempt upgrade when backdropFilter is false', async () => {
    const addModule = vi.fn().mockResolvedValue(undefined)
    setupBrowserGlobals({ backdropFilterSupported: false, waapiSupported: true, paintWorklet: { addModule } })

    const mod = await import('./ledger')
    await mod._houdiniPhase

    expect(addModule).not.toHaveBeenCalled()
    expect(mod.ledger.tier).toBe('matte')
  })

  it('does not attempt upgrade when waapi is false', async () => {
    const addModule = vi.fn().mockResolvedValue(undefined)
    setupBrowserGlobals({ backdropFilterSupported: true, waapiSupported: false, paintWorklet: { addModule } })

    const mod = await import('./ledger')
    await mod._houdiniPhase

    expect(addModule).not.toHaveBeenCalled()
    expect(mod.ledger.tier).toBe('frosted')
  })

  it('does not attempt upgrade when paintWorklet is absent from CSS', async () => {
    setupBrowserGlobals({ backdropFilterSupported: true, waapiSupported: true, paintWorklet: undefined })

    const mod = await import('./ledger')
    await mod._houdiniPhase

    expect(mod.ledger.tier).toBe('crystalline')
  })

  it('defers upgrade until DOMContentLoaded when readyState is loading', async () => {
    const addModule = vi.fn().mockResolvedValue(undefined)
    const { mockDocument } = setupBrowserGlobals({
      backdropFilterSupported: true,
      waapiSupported: true,
      paintWorklet: { addModule },
      readyState: 'loading',
    })

    const mod = await import('./ledger')

    expect(mod._houdiniPhase).toBeNull()
    expect(addModule).not.toHaveBeenCalled()

    // Simulate DOMContentLoaded
    const calls = (mockDocument.addEventListener as ReturnType<typeof vi.fn>).mock.calls
    const handler = calls.find((c: unknown[]) => c[0] === 'DOMContentLoaded')?.[1] as
      | (() => void)
      | undefined
    expect(handler).toBeDefined()
    handler!()

    await mod._houdiniPhase

    expect(mod.ledger.tier).toBe('optical')
    expect(addModule).toHaveBeenCalledOnce()
  })

  it('forced tier is not clobbered by the async upgrade phase', async () => {
    const addModule = vi.fn().mockResolvedValue(undefined)
    // forceTierWindow sets _forced = true before initAsyncPhase runs
    setupBrowserGlobals({
      backdropFilterSupported: true,
      waapiSupported: true,
      forceTierWindow: 'frosted',
      paintWorklet: { addModule },
    })

    const mod = await import('./ledger')
    await mod._houdiniPhase

    expect(mod.ledger.tier).toBe('frosted')
    // Async phase short-circuits when _forced — worklet probe is never attempted
    expect(addModule).not.toHaveBeenCalled()
  })
})

// ---- P0-T2-02: Tier forcing ----

describe('P0-T2-02: tier forcing — dev API', () => {
  beforeEach(() => vi.resetModules())
  afterEach(() => vi.unstubAllGlobals())

  it('FluidLedger.forceTier overrides ledger.tier', async () => {
    setupBrowserGlobals({ backdropFilterSupported: true, waapiSupported: true })
    const { ledger, FluidLedger } = await import('./ledger')
    expect(ledger.tier).toBe('crystalline')
    FluidLedger.forceTier('frosted')
    expect(ledger.tier).toBe('frosted')
  })

  it('forceTier updates capability flags consistently', async () => {
    setupBrowserGlobals({ backdropFilterSupported: true, waapiSupported: true })
    const { ledger, FluidLedger } = await import('./ledger')

    FluidLedger.forceTier('matte')
    expect(ledger.backdropFilter).toBe(false)
    expect(ledger.waapi).toBe(false)
    expect(ledger.houdiniPaint).toBe(false)

    FluidLedger.forceTier('frosted')
    expect(ledger.backdropFilter).toBe(true)
    expect(ledger.waapi).toBe(false)
    expect(ledger.houdiniPaint).toBe(false)

    FluidLedger.forceTier('crystalline')
    expect(ledger.backdropFilter).toBe(true)
    expect(ledger.waapi).toBe(true)
    expect(ledger.houdiniPaint).toBe(false)

    FluidLedger.forceTier('optical')
    expect(ledger.backdropFilter).toBe(true)
    expect(ledger.waapi).toBe(true)
    expect(ledger.houdiniPaint).toBe(true)
  })

  it('forceTier accepts all four valid tiers', async () => {
    setupBrowserGlobals()
    const { ledger, FluidLedger } = await import('./ledger')
    const tiers: FluidTier[] = ['matte', 'frosted', 'crystalline', 'optical']
    for (const t of tiers) {
      FluidLedger.forceTier(t)
      expect(ledger.tier).toBe(t)
    }
  })

  it('applies window.__FLUID_FORCE_TIER__ at init', async () => {
    setupBrowserGlobals({
      backdropFilterSupported: true,
      waapiSupported: true,
      forceTierWindow: 'frosted',
    })
    const { ledger } = await import('./ledger')
    expect(ledger.tier).toBe('frosted')
  })

  it('ignores invalid window.__FLUID_FORCE_TIER__ values', async () => {
    setupBrowserGlobals({
      backdropFilterSupported: true,
      waapiSupported: true,
      forceTierWindow: 'ultra',
    })
    const { ledger } = await import('./ledger')
    expect(ledger.tier).toBe('crystalline')
  })

  it('applies URL param ?fluid-tier at init', async () => {
    setupBrowserGlobals({
      backdropFilterSupported: true,
      waapiSupported: true,
      urlSearch: '?fluid-tier=matte',
    })
    const { ledger } = await import('./ledger')
    expect(ledger.tier).toBe('matte')
  })

  it('ignores invalid URL param values', async () => {
    setupBrowserGlobals({
      backdropFilterSupported: true,
      waapiSupported: true,
      urlSearch: '?fluid-tier=invalid',
    })
    const { ledger } = await import('./ledger')
    expect(ledger.tier).toBe('crystalline')
  })

  it('window.__FLUID_FORCE_TIER__ takes precedence over URL param', async () => {
    setupBrowserGlobals({
      backdropFilterSupported: true,
      waapiSupported: true,
      forceTierWindow: 'optical',
      urlSearch: '?fluid-tier=matte',
    })
    const { ledger } = await import('./ledger')
    expect(ledger.tier).toBe('optical')
  })

  it('forceTier is a no-op when NODE_ENV is production', async () => {
    const origEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    vi.resetModules()
    try {
      setupBrowserGlobals({ backdropFilterSupported: true, waapiSupported: true })
      const { ledger, FluidLedger } = await import('./ledger')
      FluidLedger.forceTier('matte')
      expect(ledger.tier).toBe('crystalline') // unchanged
    } finally {
      process.env.NODE_ENV = origEnv
    }
  })

  it('URL param is ignored in production (NODE_ENV=production)', async () => {
    const origEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    vi.resetModules()
    try {
      setupBrowserGlobals({
        backdropFilterSupported: true,
        waapiSupported: true,
        urlSearch: '?fluid-tier=matte',
      })
      const { ledger } = await import('./ledger')
      expect(ledger.tier).toBe('crystalline') // URL param not applied
    } finally {
      process.env.NODE_ENV = origEnv
    }
  })

  it('FluidLedger is attached to window in DEV', async () => {
    const { mockWindow } = setupBrowserGlobals()
    const { FluidLedger } = await import('./ledger')
    expect(mockWindow.FluidLedger).toBe(FluidLedger)
  })

  it('FluidLedger is not attached to window in production', async () => {
    const origEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    vi.resetModules()
    try {
      const { mockWindow } = setupBrowserGlobals()
      await import('./ledger')
      expect(mockWindow.FluidLedger).toBeUndefined()
    } finally {
      process.env.NODE_ENV = origEnv
    }
  })
})

// ---- P0-T2-03: A11y runtime reactivity ----

describe('P0-T2-03: accessibility flag reactivity', () => {
  beforeEach(() => vi.resetModules())
  afterEach(() => vi.unstubAllGlobals())

  // Helper: get the a11y change handler registered by initA11yListeners for a query.
  // The listener MQL for a given query is the SECOND one created (first is detectCapabilities).
  function getListenerHandler(
    getMqls: (q: string) => MqlMock[],
    query: string,
  ): (e: { matches: boolean }) => void {
    const mqls = getMqls(query)
    // Index 1 = the MQL created by initA11yListeners (after detectCapabilities already created index 0)
    const listenerMql = mqls[1]
    expect(listenerMql).toBeDefined()
    const calls = (listenerMql!.addEventListener as ReturnType<typeof vi.fn>).mock.calls
    const entry = calls.find((c: unknown[]) => c[0] === 'change')
    expect(entry).toBeDefined()
    return entry![1] as (e: { matches: boolean }) => void
  }

  it('updates prefersReducedMotion and dispatches accessibility-change event', async () => {
    const { mockDocument, getMqls } = setupBrowserGlobals({
      backdropFilterSupported: true,
      waapiSupported: true,
    })

    const mod = await import('./ledger')
    expect(mod.ledger.prefersReducedMotion).toBe(false)

    const handler = getListenerHandler(getMqls, '(prefers-reduced-motion: reduce)')
    handler({ matches: true })

    expect(mod.ledger.prefersReducedMotion).toBe(true)
    expect(mockDocument.dispatchEvent).toHaveBeenCalledOnce()
    const event = mockDocument.dispatchEvent.mock.calls[0]?.[0] as CustomEvent
    expect(event.type).toBe('fluidledger:accessibility-change')
    expect(event.detail).toMatchObject({ prefersReducedMotion: true })
  })

  it('updates prefersContrast and dispatches accessibility-change event', async () => {
    const { mockDocument, getMqls } = setupBrowserGlobals()

    const mod = await import('./ledger')
    expect(mod.ledger.prefersContrast).toBe(false)

    const handler = getListenerHandler(getMqls, '(prefers-contrast: more)')
    handler({ matches: true })

    expect(mod.ledger.prefersContrast).toBe(true)
    expect(mockDocument.dispatchEvent).toHaveBeenCalledOnce()
    const event = mockDocument.dispatchEvent.mock.calls[0]?.[0] as CustomEvent
    expect(event.type).toBe('fluidledger:accessibility-change')
    expect(event.detail).toMatchObject({ prefersContrast: true })
  })

  it('tier capability flags are immutable after init — only a11y flags update', async () => {
    const { getMqls } = setupBrowserGlobals({
      backdropFilterSupported: true,
      waapiSupported: true,
    })

    const mod = await import('./ledger')
    const tierBefore = mod.ledger.tier
    const backdropBefore = mod.ledger.backdropFilter
    const waapiBefore = mod.ledger.waapi

    const handler = getListenerHandler(getMqls, '(prefers-reduced-motion: reduce)')
    handler({ matches: true })

    expect(mod.ledger.tier).toBe(tierBefore)
    expect(mod.ledger.backdropFilter).toBe(backdropBefore)
    expect(mod.ledger.waapi).toBe(waapiBefore)
  })

  it('cleanup removes all matchMedia listeners', async () => {
    const { getMqls } = setupBrowserGlobals()
    const { _cleanupMediaListeners } = await import('./ledger')

    const rmMqls = getMqls('(prefers-reduced-motion: reduce)')
    const contrastMqls = getMqls('(prefers-contrast: more)')

    _cleanupMediaListeners()

    // The listener MQLs are at index 1 for each query
    const listenerMqls = [rmMqls[1], contrastMqls[1]].filter(Boolean)
    for (const mql of listenerMqls) {
      expect(mql!.removeEventListener).toHaveBeenCalledOnce()
    }
  })

  it('cleanup is idempotent — calling twice does not throw', async () => {
    setupBrowserGlobals()
    const { _cleanupMediaListeners } = await import('./ledger')
    expect(() => {
      _cleanupMediaListeners()
      _cleanupMediaListeners()
    }).not.toThrow()
  })

  it('registers pagehide listener on window for cleanup', async () => {
    const { mockWindow } = setupBrowserGlobals()

    await import('./ledger')

    const calls = (mockWindow.addEventListener as ReturnType<typeof vi.fn>).mock.calls
    const pagehideCall = calls.find((c: unknown[]) => c[0] === 'pagehide')
    expect(pagehideCall).toBeDefined()
  })

  it('accessibility-change detail reflects current values of both flags', async () => {
    const { mockDocument, getMqls } = setupBrowserGlobals({
      prefersReducedMotion: true, // initial: already true
    })

    const mod = await import('./ledger')

    // Trigger contrast change while reduced-motion is already true
    const handler = getListenerHandler(getMqls, '(prefers-contrast: more)')
    handler({ matches: true })

    const event = mockDocument.dispatchEvent.mock.calls[0]?.[0] as CustomEvent
    expect(event.detail).toEqual({
      prefersReducedMotion: true,
      prefersContrast: true,
    })
  })
})

// ---- type contract ----

describe('type contract', () => {
  it('SSR_SAFE_DEFAULTS satisfies full FluidCapabilityLedger shape', async () => {
    vi.resetModules()
    const { SSR_SAFE_DEFAULTS } = await import('./ledger')
    const keys: (keyof FluidCapabilityLedger)[] = [
      'tier',
      'backdropFilter',
      'waapi',
      'houdiniPaint',
      'prefersReducedMotion',
      'prefersContrast',
      'prefersReducedTransparency',
      'forcedColors',
      'deviceMemoryLow',
      'cpuCoresLow',
      'saveData',
    ]
    for (const k of keys) {
      expect(k in SSR_SAFE_DEFAULTS).toBe(true)
    }
  })
})
