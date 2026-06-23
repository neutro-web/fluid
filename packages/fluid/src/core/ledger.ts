export type FluidTier = 'matte' | 'frosted' | 'crystalline' | 'optical'

export interface FluidCapabilityLedger {
  tier: FluidTier
  backdropFilter: boolean
  waapi: boolean
  houdiniPaint: boolean
  prefersReducedMotion: boolean
  prefersContrast: boolean
  prefersReducedTransparency: boolean
  forcedColors: boolean
  deviceMemoryLow: boolean
  cpuCoresLow: boolean
  saveData: boolean
}

export const SSR_SAFE_DEFAULTS: FluidCapabilityLedger = {
  tier: 'matte',
  backdropFilter: false,
  waapi: false,
  houdiniPaint: false,
  prefersReducedMotion: false,
  prefersContrast: false,
  prefersReducedTransparency: false,
  forcedColors: false,
  deviceMemoryLow: false,
  cpuCoresLow: false,
  saveData: false,
}

const IS_BROWSER = typeof window !== 'undefined' && typeof document !== 'undefined'

// Bundler define plugins (Vite/esbuild/webpack) replace process.env.NODE_ENV at build time;
// the bare form is required so they match the AST node. Falls back to false (production-safe)
// when process is absent — which is the case in a plain browser without a bundler polyfill.
// Consequence: DEV features (?fluid-tier=, window.FluidLedger, CSP warn) require the
// dev-server to define process.env.NODE_ENV. Most Vite/webpack setups do this automatically.
const DEV: boolean =
  typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'

const VALID_TIERS: readonly FluidTier[] = ['matte', 'frosted', 'crystalline', 'optical']

function isValidTier(s: string): s is FluidTier {
  return (VALID_TIERS as readonly string[]).includes(s)
}

function assignTier(bf: boolean, wa: boolean, hp: boolean): FluidTier {
  if (!bf) return 'matte'
  if (!wa) return 'frosted'
  if (!hp) return 'crystalline'
  return 'optical'
}

// Guard: returns false when matchMedia is unavailable (some embedded/RN environments)
function mq(query: string): boolean {
  return typeof matchMedia === 'function' ? matchMedia(query).matches : false
}

function detectCapabilities(): FluidCapabilityLedger {
  // Safari 14–17 only exposes -webkit-backdrop-filter; unprefixed arrived in Safari 18.
  // §3.2 lists Safari 14+ as Frosted-eligible, so we must check both forms.
  const backdropFilter =
    typeof CSS !== 'undefined' && typeof CSS.supports === 'function'
      ? CSS.supports('backdrop-filter', 'blur(1px)') ||
        CSS.supports('-webkit-backdrop-filter', 'blur(1px)')
      : false

  // §3.2 gates Crystalline on commitStyles() (Chrome 84+, Safari 15.4+).
  // Element.prototype.animate alone goes back to Chrome 36 / Safari 9 — too broad.
  const waapi =
    typeof Animation !== 'undefined' && 'commitStyles' in Animation.prototype

  // houdiniPaint always false in sync phase; confirmed in async phase
  const houdiniPaint = false

  const prefersReducedMotion = mq('(prefers-reduced-motion: reduce)')
  const prefersContrast = mq('(prefers-contrast: more)')
  const prefersReducedTransparency = mq('(prefers-reduced-transparency: reduce)')
  const forcedColors = mq('(forced-colors: active)')

  // Non-standard navigator extensions — guard with in operator before access
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nav = navigator as any
  const deviceMemoryLow = 'deviceMemory' in navigator ? (nav.deviceMemory as number) < 2 : false
  const cpuCoresLow =
    'hardwareConcurrency' in navigator ? navigator.hardwareConcurrency <= 2 : false
  const saveData =
    'connection' in navigator
      ? !!((nav.connection as { saveData?: boolean } | undefined)?.saveData)
      : false

  return {
    tier: assignTier(backdropFilter, waapi, houdiniPaint),
    backdropFilter,
    waapi,
    houdiniPaint,
    prefersReducedMotion,
    prefersContrast,
    prefersReducedTransparency,
    forcedColors,
    deviceMemoryLow,
    cpuCoresLow,
    saveData,
  }
}

// Populated synchronously at module load — fully ready before any component mounts
export const ledger: FluidCapabilityLedger = IS_BROWSER
  ? detectCapabilities()
  : { ...SSR_SAFE_DEFAULTS }

// ---- matchMedia reactivity (P0-T2-03) ----

interface MqlEntry {
  mql: MediaQueryList
  fn: (e: MediaQueryListEvent) => void
}
const _mqlEntries: MqlEntry[] = []

function watchMedia(query: string, onChange: (matches: boolean) => void): void {
  if (typeof matchMedia !== 'function') return
  const mql = matchMedia(query)
  const fn = (e: MediaQueryListEvent): void => onChange(e.matches)
  mql.addEventListener('change', fn)
  _mqlEntries.push({ mql, fn })
}

export function _cleanupMediaListeners(): void {
  for (const { mql, fn } of _mqlEntries) {
    mql.removeEventListener('change', fn)
  }
  _mqlEntries.length = 0
}

function dispatchA11yChange(): void {
  document.dispatchEvent(
    new CustomEvent('fluidledger:accessibility-change', {
      detail: {
        prefersReducedMotion: ledger.prefersReducedMotion,
        prefersContrast: ledger.prefersContrast,
      },
    }),
  )
}

function initA11yListeners(): void {
  watchMedia('(prefers-reduced-motion: reduce)', (matches) => {
    ledger.prefersReducedMotion = matches
    dispatchA11yChange()
  })
  watchMedia('(prefers-contrast: more)', (matches) => {
    ledger.prefersContrast = matches
    dispatchA11yChange()
  })
}

// ---- Async phase: Houdini worklet (P0-T2-02) ----

// Set to true when FluidLedger.forceTier() is called, preventing the async phase
// from clobbering the forced tier.
let _forced = false

async function runHoudiniUpgrade(): Promise<void> {
  // Short-circuit if a tier was forced — deterministic test/dev state must be preserved
  if (_forced) return
  if (!ledger.backdropFilter || !ledger.waapi) return
  if (typeof CSS === 'undefined' || !('paintWorklet' in CSS)) return

  // Prefer blob: URL for the probe — less likely to be blocked by strict CSP policies
  // than data: URLs. Blob URL is revoked after the probe regardless of outcome.
  // Note: CSS.paintWorklet exists since Chrome 65; actual Optical worklets require 128+.
  // Definitive version gating happens when the real worklets load (they degrade gracefully).
  let probeUrl = 'data:text/javascript,registerPaint("fluid-noop",class{paint(){}})'
  let isBlobUrl = false
  try {
    probeUrl = URL.createObjectURL(
      new Blob(['registerPaint("fluid-noop",class{paint(){}})'], { type: 'text/javascript' }),
    )
    isBlobUrl = true
  } catch {
    // URL.createObjectURL unavailable — fall back to data: URL
  }

  try {
    await (CSS as unknown as { paintWorklet: { addModule(url: string): Promise<void> } })
      .paintWorklet.addModule(probeUrl)
    const previousTier = ledger.tier
    ledger.houdiniPaint = true
    ledger.tier = 'optical'
    document.dispatchEvent(
      new CustomEvent('fluidledger:upgrade', {
        detail: { previousTier, newTier: 'optical' },
      }),
    )
  } catch {
    if (DEV) {
      console.warn(
        '[fluid] Houdini Paint Worklet registration failed — likely blocked by CSP. ' +
          'Staying at crystalline tier.',
      )
    }
  } finally {
    if (isBlobUrl) {
      try {
        URL.revokeObjectURL(probeUrl)
      } catch {
        // Ignore
      }
    }
  }
}

// Resolves when the async upgrade phase settles. null until initAsyncPhase runs.
// Exported for testing only.
export let _houdiniPhase: Promise<void> | null = null

function initAsyncPhase(): void {
  const run = (): void => {
    _houdiniPhase = runHoudiniUpgrade()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true })
  } else {
    run()
  }
}

// ---- FluidLedger API (P0-T2-02) ----

export const FluidLedger = {
  forceReducedMotion(enabled: boolean): void {
    if (!DEV) return
    ledger.prefersReducedMotion = enabled
  },

  forceTier(tier: FluidTier): void {
    if (!DEV) return
    const previousTier = ledger.tier
    _forced = true
    ledger.tier = tier
    // Keep capability flags consistent with the forced tier so downstream
    // code checking individual flags (e.g. ledger.waapi) stays coherent.
    ledger.backdropFilter = tier !== 'matte'
    ledger.waapi = tier === 'crystalline' || tier === 'optical'
    ledger.houdiniPaint = tier === 'optical'
    // Notify already-mounted components so they can react (e.g. tear down
    // or create ripple when crossing the matte ↔ frosted boundary).
    document.dispatchEvent(
      new CustomEvent('fluidledger:tier-change', {
        detail: { previousTier, newTier: tier },
      }),
    )
  },
}

// ---- Browser initialization ----

if (IS_BROWSER) {
  if (DEV) {
    // E2E hook: set window.__FLUID_FORCE_TIER__ before page load
    const winForce = (window as unknown as Record<string, unknown>).__FLUID_FORCE_TIER__
    if (typeof winForce === 'string' && isValidTier(winForce)) {
      FluidLedger.forceTier(winForce)
    } else {
      // URL param: ?fluid-tier=frosted
      try {
        const param = new URLSearchParams(location.search).get('fluid-tier')
        if (param !== null && isValidTier(param)) {
          FluidLedger.forceTier(param)
        }
      } catch {
        // Ignore — URLSearchParams unavailable
      }
    }

    // Attach to window so `FluidLedger.forceTier('frosted')` works from devtools console
    ;(window as unknown as Record<string, unknown>).FluidLedger = FluidLedger
  }

  initA11yListeners()
  initAsyncPhase()
  window.addEventListener('pagehide', _cleanupMediaListeners, { once: true })
}
