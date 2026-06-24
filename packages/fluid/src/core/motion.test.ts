import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SPRING_PRESETS } from './spring'
import { ledger } from './ledger'
import type { FluidTier } from './ledger'
import { driver } from './driver'
import { motion, startFluidTransition } from './motion'
import type { MotionDef, PropertyAnimation } from './motion'

// ─── rAF mock helpers (mirrors driver.test.ts) ───────────────────────────────

let pendingRaf: ((ts: number) => void) | null = null
let rafCounter = 0

function setupMockRaf() {
  pendingRaf = null
  rafCounter = 0
  vi.stubGlobal('requestAnimationFrame', (cb: (ts: number) => void) => {
    pendingRaf = cb
    return ++rafCounter
  })
  vi.stubGlobal('cancelAnimationFrame', () => { pendingRaf = null })
}

function flushRaf(ts: number): boolean {
  if (!pendingRaf) return false
  const cb = pendingRaf; pendingRaf = null; cb(ts); return true
}

function advanceUntilSettled(maxFrames = 600, dtMs = 16): void {
  let ts = 0
  for (let i = 0; i < maxFrames; i++) { ts += dtMs; if (!flushRaf(ts)) break }
}

async function driveUntilSettled(maxFrames = 1200, dtMs = 16): Promise<void> {
  let ts = 0
  for (let i = 0; i < maxFrames; i++) {
    ts += dtMs
    flushRaf(ts)
    for (let j = 0; j < 8; j++) await Promise.resolve()
    if (!pendingRaf) break
  }
}

function setupMockDocument() {
  vi.stubGlobal('document', {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    hidden: false,
  })
}

// ─── Mock element ─────────────────────────────────────────────────────────────

interface MockEl {
  isConnected: boolean
  scrollHeight: number
  scrollTop: number
  clientHeight: number
  style: {
    transform: string
    opacity: string
    clipPath: string
    maxHeight: string
    setProperty(k: string, v: string): void
    getPropertyValue(k: string): string
    removeProperty(k: string): void
  }
  _styles: Map<string, string>
  getBoundingClientRect: ReturnType<typeof vi.fn>
  addEventListener: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
  dispatchEvent: ReturnType<typeof vi.fn>
  _listeners: Map<string, EventListener[]>
}

function makeMockEl(opts?: {
  scrollHeight?: number
  isConnected?: boolean
  scrollTop?: number
  clientHeight?: number
}): MockEl {
  const styles = new Map<string, string>()
  const listeners = new Map<string, EventListener[]>()
  const style = {
    setProperty: (k: string, v: string) => { styles.set(k, v) },
    getPropertyValue: (k: string) => styles.get(k) ?? '',
    removeProperty: (k: string) => { styles.delete(k) },
    get transform() { return styles.get('transform') ?? '' },
    set transform(v: string) { styles.set('transform', v) },
    get opacity() { return styles.get('opacity') ?? '' },
    set opacity(v: string) { styles.set('opacity', v) },
    get clipPath() { return styles.get('clipPath') ?? '' },
    set clipPath(v: string) { styles.set('clipPath', v) },
    get maxHeight() { return styles.get('maxHeight') ?? '' },
    set maxHeight(v: string) { styles.set('maxHeight', v) },
  }
  const el: MockEl = {
    isConnected: opts?.isConnected ?? true,
    scrollHeight: opts?.scrollHeight ?? 200,
    scrollTop: opts?.scrollTop ?? 0,
    clientHeight: opts?.clientHeight ?? 100,
    style, _styles: styles, _listeners: listeners,
    getBoundingClientRect: vi.fn().mockReturnValue({
      x: 0, y: 0, width: 100, height: 50, top: 0, left: 0, bottom: 50, right: 100,
    }),
    addEventListener: vi.fn((event: string, handler: EventListener) => {
      if (!listeners.has(event)) listeners.set(event, [])
      listeners.get(event)!.push(handler)
    }),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn((e: Event) => {
      ;(listeners.get(e.type) ?? []).forEach(h => h(e))
    }),
  }
  return el
}

function findAnim(phase: { anims: PropertyAnimation[] }, kind: string): PropertyAnimation | undefined {
  return phase.anims.find(a => a.kind === kind)
}

// ─── Ledger state save / restore ─────────────────────────────────────────────

let savedTier: FluidTier
let savedPRM: boolean

beforeEach(() => {
  savedTier = ledger.tier
  savedPRM = ledger.prefersReducedMotion
  ledger.prefersReducedMotion = false
  ledger.tier = 'crystalline'
  setupMockRaf()
  setupMockDocument()
})

afterEach(() => {
  driver.destroy()
  vi.unstubAllGlobals()
  ledger.tier = savedTier
  ledger.prefersReducedMotion = savedPRM
})

// =============================================================================
// P0-T5-01: MOTION PRIMITIVES — MotionDef structure
// =============================================================================

describe('P0-T5-01: emerge', () => {
  it('id is "emerge"', () => expect(motion.emerge().id).toBe('emerge'))

  it('phase 0: scale 0.92→1.0 with smooth spring', () => {
    const anim = findAnim(motion.emerge().phases[0], 'scale')!
    expect(anim).toBeDefined()
    expect(anim.from).toBeCloseTo(0.92)
    expect(anim.to).toBeCloseTo(1.0)
    expect(anim.config).toEqual(SPRING_PRESETS.smooth)
  })

  it('phase 0: opacity 0→1 with smooth spring', () => {
    const anim = findAnim(motion.emerge().phases[0], 'opacity')!
    expect(anim).toBeDefined()
    expect(anim.from).toBe(0)
    expect(anim.to).toBe(1)
    expect(anim.config).toEqual(SPRING_PRESETS.smooth)
  })

  it('reducedPhases: opacity only — no scale', () => {
    const def = motion.emerge()
    expect(def.reducedPhases).not.toBeNull()
    const allAnims = def.reducedPhases!.flatMap(p => p.anims)
    expect(allAnims.some(a => a.kind === 'opacity')).toBe(true)
    expect(allAnims.some(a => a.kind === 'scale')).toBe(false)
  })
})

describe('P0-T5-01: recede', () => {
  it('id is "recede"', () => expect(motion.recede().id).toBe('recede'))

  it('phase 0: scale 1.0→0.92 + opacity 1→0, smooth', () => {
    const def = motion.recede()
    const scale = findAnim(def.phases[0], 'scale')!
    const opacity = findAnim(def.phases[0], 'opacity')!
    expect(scale.from).toBeCloseTo(1.0); expect(scale.to).toBeCloseTo(0.92)
    expect(opacity.from).toBe(1); expect(opacity.to).toBe(0)
    expect(scale.config).toEqual(SPRING_PRESETS.smooth)
  })

  it('reducedPhases: opacity only', () => {
    const def = motion.recede()
    const allAnims = def.reducedPhases!.flatMap(p => p.anims)
    expect(allAnims.some(a => a.kind === 'scale')).toBe(false)
    expect(allAnims.some(a => a.kind === 'opacity')).toBe(true)
  })
})

describe('P0-T5-01: rise', () => {
  it('id is "rise"', () => expect(motion.rise().id).toBe('rise'))

  it('phase 0: translateY 0→-4 + shadow-depth increase, smooth', () => {
    const def = motion.rise()
    const ty = findAnim(def.phases[0], 'translateY')!
    const shadow = findAnim(def.phases[0], 'shadow-depth')!
    expect(ty).toBeDefined()
    expect(ty.from).toBe(0); expect(ty.to).toBe(-4)
    expect(shadow).toBeDefined()
    expect(shadow.from).toBeLessThan(shadow.to)
    expect(ty.config).toEqual(SPRING_PRESETS.smooth)
  })

  it('reducedPhases: no translateY (vestibular-safe)', () => {
    const def = motion.rise()
    if (def.reducedPhases !== null && def.reducedPhases.length > 0) {
      const allAnims = def.reducedPhases.flatMap(p => p.anims)
      expect(allAnims.some(a => a.kind === 'translateY')).toBe(false)
    }
  })
})

describe('P0-T5-01: sink', () => {
  it('id is "sink"', () => expect(motion.sink().id).toBe('sink'))

  it('phase 0: translateY -4→0 + shadow-depth decrease, smooth (reverse of rise)', () => {
    const def = motion.sink()
    const ty = findAnim(def.phases[0], 'translateY')!
    const shadow = findAnim(def.phases[0], 'shadow-depth')!
    expect(ty.from).toBe(-4); expect(ty.to).toBe(0)
    expect(shadow.from).toBeGreaterThan(shadow.to)
    expect(ty.config).toEqual(SPRING_PRESETS.smooth)
  })
})

describe('P0-T5-01: elevate', () => {
  it('id is "elevate"', () => expect(motion.elevate().id).toBe('elevate'))

  it('phase 0: blur-delta 0→4 + shadow-depth increase, NO translateY, smooth', () => {
    const def = motion.elevate()
    expect(findAnim(def.phases[0], 'translateY')).toBeUndefined()
    const blur = findAnim(def.phases[0], 'blur-delta')!
    const shadow = findAnim(def.phases[0], 'shadow-depth')!
    expect(blur).toBeDefined()
    expect(blur.from).toBeCloseTo(0); expect(blur.to).toBeCloseTo(4)
    expect(shadow).toBeDefined()
    expect(shadow.from).toBeLessThan(shadow.to)
    expect(blur.config).toEqual(SPRING_PRESETS.smooth)
  })

  it('reducedPhases: null (no-op — shadow only, skip entirely)', () => {
    expect(motion.elevate().reducedPhases).toBeNull()
  })
})

describe('P0-T5-01: flatten', () => {
  it('id is "flatten"', () => expect(motion.flatten().id).toBe('flatten'))

  it('phase 0: blur-delta 4→0 + shadow-depth decrease, smooth (reverse of elevate)', () => {
    const def = motion.flatten()
    const blur = findAnim(def.phases[0], 'blur-delta')!
    const shadow = findAnim(def.phases[0], 'shadow-depth')!
    expect(blur.from).toBeCloseTo(4); expect(blur.to).toBeCloseTo(0)
    expect(shadow.from).toBeGreaterThan(shadow.to)
    expect(shadow.config).toEqual(SPRING_PRESETS.smooth)
  })

  it('reducedPhases: null (no-op)', () => {
    expect(motion.flatten().reducedPhases).toBeNull()
  })
})

describe('P0-T5-01: float', () => {
  it('id is "float"', () => expect(motion.float().id).toBe('float'))

  it('phase 0: scale 1.0→1.04 + translateY 0→-8, bouncy', () => {
    const def = motion.float()
    const scale = findAnim(def.phases[0], 'scale')!
    const ty = findAnim(def.phases[0], 'translateY')!
    expect(scale.from).toBeCloseTo(1.0); expect(scale.to).toBeCloseTo(1.04)
    expect(ty.from).toBe(0); expect(ty.to).toBe(-8)
    expect(scale.config).toEqual(SPRING_PRESETS.bouncy)
  })

  it('reducedPhases: no scale or translateY', () => {
    const def = motion.float()
    if (def.reducedPhases !== null && def.reducedPhases.length > 0) {
      const allAnims = def.reducedPhases.flatMap(p => p.anims)
      expect(allAnims.some(a => a.kind === 'scale' || a.kind === 'translateY')).toBe(false)
    }
  })
})

describe('P0-T5-01: settle', () => {
  it('id is "settle"', () => expect(motion.settle().id).toBe('settle'))

  it('phase 0: scale 1.04→1.0 + translateY -8→0, gentle (reverse of float)', () => {
    const def = motion.settle()
    const scale = findAnim(def.phases[0], 'scale')!
    const ty = findAnim(def.phases[0], 'translateY')!
    expect(scale.from).toBeCloseTo(1.04); expect(scale.to).toBeCloseTo(1.0)
    expect(ty.from).toBe(-8); expect(ty.to).toBe(0)
    expect(scale.config).toEqual(SPRING_PRESETS.gentle)
  })
})

describe('P0-T5-01: expand', () => {
  it('id is "expand"', () => expect(motion.expand().id).toBe('expand'))

  it('at crystalline: clip-inset 50→0, snappy', () => {
    ledger.tier = 'crystalline'
    const anim = findAnim(motion.expand().phases[0], 'clip-inset')!
    expect(anim).toBeDefined()
    expect(anim.from).toBe(50); expect(anim.to).toBe(0)
    expect(anim.config).toEqual(SPRING_PRESETS.snappy)
  })

  it('at frosted: max-height 0→sentinel, snappy', () => {
    ledger.tier = 'frosted'
    const anim = findAnim(motion.expand().phases[0], 'max-height')!
    expect(anim).toBeDefined()
    expect(anim.from).toBe(0)
    expect(anim.config).toEqual(SPRING_PRESETS.snappy)
  })

  it('reducedPhases === phases (structural — still animates)', () => {
    const def = motion.expand()
    expect(def.reducedPhases).not.toBeNull()
    // expand uses same phases in reduced-motion (structural, not vestibular)
    expect(JSON.stringify(def.reducedPhases)).toBe(JSON.stringify(def.phases))
  })
})

describe('P0-T5-01: collapse', () => {
  it('id is "collapse"', () => expect(motion.collapse().id).toBe('collapse'))

  it('at crystalline: clip-inset 0→50, snappy', () => {
    ledger.tier = 'crystalline'
    const anim = findAnim(motion.collapse().phases[0], 'clip-inset')!
    expect(anim.from).toBe(0); expect(anim.to).toBe(50)
    expect(anim.config).toEqual(SPRING_PRESETS.snappy)
  })

  it('reducedPhases === phases (structural)', () => {
    const def = motion.collapse()
    expect(JSON.stringify(def.reducedPhases)).toBe(JSON.stringify(def.phases))
  })
})

describe('P0-T5-01: depress', () => {
  it('id is "depress"', () => expect(motion.depress().id).toBe('depress'))

  it('primary: scale 1.0→0.96, snappy', () => {
    const scale = findAnim(motion.depress().phases[0], 'scale')!
    expect(scale.from).toBeCloseTo(1.0); expect(scale.to).toBeCloseTo(0.96)
    expect(scale.config).toEqual(SPRING_PRESETS.snappy)
  })

  it('secondary: scale 1.0→0.98', () => {
    const scale = findAnim(motion.depress('secondary').phases[0], 'scale')!
    expect(scale.to).toBeCloseTo(0.98)
  })

  it('reducedPhases: opacity 1.0→0.7, snappy', () => {
    const opacity = findAnim(motion.depress().reducedPhases![0], 'opacity')!
    expect(opacity.from).toBeCloseTo(1.0); expect(opacity.to).toBeCloseTo(0.7)
    expect(opacity.config).toEqual(SPRING_PRESETS.snappy)
  })
})

describe('P0-T5-01: release', () => {
  it('id is "release"', () => expect(motion.release().id).toBe('release'))

  it('primary: scale 0.96→1.0, bouncy', () => {
    const scale = findAnim(motion.release().phases[0], 'scale')!
    expect(scale.from).toBeCloseTo(0.96); expect(scale.to).toBeCloseTo(1.0)
    expect(scale.config).toEqual(SPRING_PRESETS.bouncy)
  })

  it('secondary: scale 0.98→1.0', () => {
    expect(findAnim(motion.release('secondary').phases[0], 'scale')!.from).toBeCloseTo(0.98)
  })

  it('reducedPhases: opacity 0.7→1.0, bouncy', () => {
    const opacity = findAnim(motion.release().reducedPhases![0], 'opacity')!
    expect(opacity.from).toBeCloseTo(0.7); expect(opacity.to).toBeCloseTo(1.0)
    expect(opacity.config).toEqual(SPRING_PRESETS.bouncy)
  })
})

describe('P0-T5-01: pulse', () => {
  it('id is "pulse"', () => expect(motion.pulse().id).toBe('pulse'))

  it('has exactly 2 phases', () => {
    expect(motion.pulse().phases).toHaveLength(2)
  })

  it('phase 0: scale 1.0→1.06, bouncy', () => {
    const scale = findAnim(motion.pulse().phases[0], 'scale')!
    expect(scale.from).toBeCloseTo(1.0); expect(scale.to).toBeCloseTo(1.06)
    expect(scale.config).toEqual(SPRING_PRESETS.bouncy)
  })

  it('phase 1: scale 1.06→1.0, bouncy', () => {
    const scale = findAnim(motion.pulse().phases[1], 'scale')!
    expect(scale.from).toBeCloseTo(1.06); expect(scale.to).toBeCloseTo(1.0)
    expect(scale.config).toEqual(SPRING_PRESETS.bouncy)
  })
})

describe('P0-T5-01: shake', () => {
  it('id is "shake"', () => expect(motion.shake().id).toBe('shake'))

  it('has exactly 5 translateX phases: 0→-6→6→-4→4→0', () => {
    const def = motion.shake()
    expect(def.phases).toHaveLength(5)
    const targets = def.phases.map(p => findAnim(p, 'translateX')!.to)
    expect(targets).toEqual([-6, 6, -4, 4, 0])
  })

  it('from values chain across phases', () => {
    const def = motion.shake()
    const froms = def.phases.map(p => findAnim(p, 'translateX')!.from)
    expect(froms).toEqual([0, -6, 6, -4, 4])
  })

  it('all phases use snappy spring', () => {
    motion.shake().phases.forEach(p => {
      expect(findAnim(p, 'translateX')!.config).toEqual(SPRING_PRESETS.snappy)
    })
  })
})

describe('P0-T5-01: grow', () => {
  it('id is "grow"', () => expect(motion.grow().id).toBe('grow'))

  it('at crystalline: clip-inset, smooth', () => {
    ledger.tier = 'crystalline'
    const anim = findAnim(motion.grow().phases[0], 'clip-inset')!
    expect(anim).toBeDefined()
    expect(anim.to).toBe(0)
    expect(anim.config).toEqual(SPRING_PRESETS.smooth)
  })

  it('at frosted: max-height, smooth', () => {
    ledger.tier = 'frosted'
    const anim = findAnim(motion.grow().phases[0], 'max-height')!
    expect(anim).toBeDefined()
    expect(anim.config).toEqual(SPRING_PRESETS.smooth)
  })
})

describe('P0-T5-01: shrink', () => {
  it('id is "shrink"', () => expect(motion.shrink().id).toBe('shrink'))

  it('at crystalline: clip-inset 0→50, smooth', () => {
    ledger.tier = 'crystalline'
    const anim = findAnim(motion.shrink().phases[0], 'clip-inset')!
    expect(anim.from).toBe(0); expect(anim.to).toBe(50)
    expect(anim.config).toEqual(SPRING_PRESETS.smooth)
  })

  it('at frosted: max-height decreases to 0, smooth', () => {
    ledger.tier = 'frosted'
    const anim = findAnim(motion.shrink().phases[0], 'max-height')!
    expect(anim.to).toBe(0)
    expect(anim.config).toEqual(SPRING_PRESETS.smooth)
  })
})

// =============================================================================
// P0-T5-01: motion.animate() — execution
// =============================================================================

describe('P0-T5-01: motion.animate() — execution', () => {
  it('emerge: opacity settles at 1', async () => {
    const el = makeMockEl()
    const p = motion.animate(el as unknown as Element, motion.emerge())
    advanceUntilSettled()
    await p
    expect(parseFloat(el.style.opacity)).toBeCloseTo(1, 2)
  })

  it('emerge: transform settles at scale(1) or identity', async () => {
    const el = makeMockEl()
    const p = motion.animate(el as unknown as Element, motion.emerge())
    advanceUntilSettled()
    await p
    const t = el.style.transform
    // scale at 1.0 → either empty string or explicitly scale(1)
    expect(t === '' || t === 'scale(1)' || /scale\(1(?:\.0+)?\)/.test(t)).toBe(true)
  })

  it('depress: transform settles near scale(0.96)', async () => {
    const el = makeMockEl()
    const p = motion.animate(el as unknown as Element, motion.depress())
    advanceUntilSettled()
    await p
    const t = el.style.transform
    const m = t.match(/scale\(([^)]+)\)/)
    expect(m).not.toBeNull()
    expect(parseFloat(m![1])).toBeCloseTo(0.96, 2)
  })

  it('release: transform settles at scale(1)', async () => {
    const el = makeMockEl()
    const p = motion.animate(el as unknown as Element, motion.release())
    advanceUntilSettled()
    await p
    const t = el.style.transform
    expect(t === '' || t === 'scale(1)' || /scale\(1(?:\.0+)?\)/.test(t)).toBe(true)
  })

  it('resolves Promise when animation settles', async () => {
    const el = makeMockEl()
    const p = motion.animate(el as unknown as Element, motion.emerge())
    advanceUntilSettled()
    await expect(p).resolves.toBeUndefined()
  })

  it('multi-phase (pulse): runs phase 0 then phase 1, settles at scale(1)', async () => {
    const el = makeMockEl()
    const p = motion.animate(el as unknown as Element, motion.pulse())
    await driveUntilSettled(1200)
    await p
    const t = el.style.transform
    expect(t === '' || /scale\(1(?:\.0+)?\)/.test(t)).toBe(true)
  })

  it('multi-phase (shake): runs all 5 phases, settles with no translateX', async () => {
    const el = makeMockEl()
    const p = motion.animate(el as unknown as Element, motion.shake())
    await driveUntilSettled(3000)
    await p
    const t = el.style.transform
    const m = t.match(/translateX\(([^)]+)\)/)
    if (m) {
      expect(parseFloat(m[1])).toBeCloseTo(0, 1)
    }
    // else: no translateX in transform = already at 0
  })

  it('expand at crystalline: clears clip-path (settles at inset(0%))', async () => {
    ledger.tier = 'crystalline'
    const el = makeMockEl()
    const p = motion.animate(el as unknown as Element, motion.expand())
    advanceUntilSettled()
    await p
    const cp = el.style.clipPath
    expect(cp === '' || cp === 'inset(0%)' || cp === 'none').toBe(true)
  })

  it('expand at frosted: max-height settles at scrollHeight', async () => {
    ledger.tier = 'frosted'
    const el = makeMockEl({ scrollHeight: 150 })
    const p = motion.animate(el as unknown as Element, motion.expand())
    advanceUntilSettled()
    await p
    expect(parseFloat(el.style.maxHeight)).toBeCloseTo(150, 0)
  })

  it('collapse at frosted: max-height settles at 0', async () => {
    ledger.tier = 'frosted'
    const el = makeMockEl({ scrollHeight: 150 })
    // Start from expanded state
    el._styles.set('maxHeight', '150px')
    const p = motion.animate(el as unknown as Element, motion.collapse())
    advanceUntilSettled()
    await p
    expect(parseFloat(el.style.maxHeight)).toBeCloseTo(0, 0)
  })
})

// =============================================================================
// M1: Velocity preservation on interrupt
// =============================================================================

describe('M1: interrupt velocity carry', () => {
  it('scale overshoots midpoint briefly when emerge is interrupted by recede', () => {
    const el = makeMockEl()

    // Start emerge (scale 0.92→1.0, smooth spring — positive velocity)
    motion.animate(el as unknown as Element, motion.emerge())

    // Drive 6 frames: significant positive velocity toward 1.0
    let ts = 0
    for (let i = 0; i < 6; i++) { ts += 16; flushRaf(ts) }

    const getScale = () => {
      const m = el.style.transform.match(/scale\(([^)]+)\)/)
      return m ? parseFloat(m[1]) : 1.0
    }
    const midScale = getScale()
    expect(midScale).toBeGreaterThan(0.92) // confirmed in-flight
    expect(midScale).toBeLessThan(1.0)

    // Interrupt with recede (target: 0.92); carried positive velocity means
    // scale briefly increases beyond midScale before spring reverses
    motion.animate(el as unknown as Element, motion.recede())
    ts += 16; flushRaf(ts)

    const scaleAfterInterrupt = getScale()
    // With velocity carry: spring overshoots midScale briefly (> midScale)
    // Without velocity carry (zero start): scale would immediately drop below midScale
    expect(scaleAfterInterrupt).toBeGreaterThan(midScale - 0.001)
  })

  it('re-emerge from scratch starts at declared from=0.92, not settled 1.0', async () => {
    const el = makeMockEl()

    // First emerge: scale goes 0.92→1.0 and settles
    const p1 = motion.animate(el as unknown as Element, motion.emerge())
    advanceUntilSettled()
    await p1
    expect(el.style.transform).toBe('') // scale(1) → omitted

    // Second emerge: with H2 fix, re-animation honours declared from=0.92
    // The track starts fresh at 0.92, not at the settled 1.0
    const p2 = motion.animate(el as unknown as Element, motion.emerge())
    // Immediately after calling animate, 1 rAF hasn't fired yet
    // but the track should have reset — advance 1 frame to see movement
    flushRaf(16)
    const scaleAfterFirst = getScale(el)

    // If from is honoured, scale is somewhere between 0.92 and 1.0 (not stuck at 1.0)
    expect(scaleAfterFirst).toBeLessThan(1.0)

    advanceUntilSettled()
    await p2
  })
})

function getScale(el: MockEl): number {
  const m = el.style.transform.match(/scale\(([^)]+)\)/)
  return m ? parseFloat(m[1]) : 1.0
}

// =============================================================================
// M2: Execution coverage — untested primitives
// =============================================================================

describe('M2: execution — rise / sink', () => {
  it('rise: settles with translateY(-4px) and --fluid-shadow-depth near 1', async () => {
    const el = makeMockEl()
    const p = motion.animate(el as unknown as Element, motion.rise())
    advanceUntilSettled()
    await p
    expect(el.style.transform).toContain('translateY(-4px)')
    expect(parseFloat(el._styles.get('--fluid-shadow-depth') ?? '0')).toBeCloseTo(1, 1)
  })

  it('sink: settles with no translateY and --fluid-shadow-depth near 0', async () => {
    const el = makeMockEl()
    const p = motion.animate(el as unknown as Element, motion.sink())
    advanceUntilSettled()
    await p
    // ty→0 is omitted from transform string
    expect(el.style.transform).not.toContain('translateY')
    expect(parseFloat(el._styles.get('--fluid-shadow-depth') ?? '1')).toBeCloseTo(0, 1)
  })
})

describe('M2: execution — elevate / flatten (non-reduced)', () => {
  it('elevate: settles with --fluid-blur-delta=4 and --fluid-shadow-depth=1, no transform', async () => {
    const el = makeMockEl()
    const p = motion.animate(el as unknown as Element, motion.elevate())
    advanceUntilSettled()
    await p
    expect(parseFloat(el._styles.get('--fluid-blur-delta') ?? '0')).toBeCloseTo(4, 1)
    expect(parseFloat(el._styles.get('--fluid-shadow-depth') ?? '0')).toBeCloseTo(1, 1)
    expect(el.style.transform).not.toContain('translateY')
  })

  it('flatten: settles with --fluid-blur-delta≈0 and --fluid-shadow-depth≈0', async () => {
    const el = makeMockEl()
    const p = motion.animate(el as unknown as Element, motion.flatten())
    advanceUntilSettled()
    await p
    expect(parseFloat(el._styles.get('--fluid-blur-delta') ?? '0')).toBeCloseTo(0, 1)
    expect(parseFloat(el._styles.get('--fluid-shadow-depth') ?? '0')).toBeCloseTo(0, 1)
  })
})

describe('M2: execution — float / settle', () => {
  it('float: settles at scale(1.04) and translateY(-8px)', async () => {
    const el = makeMockEl()
    const p = motion.animate(el as unknown as Element, motion.float())
    advanceUntilSettled()
    await p
    expect(el.style.transform).toContain('scale(1.04)')
    expect(el.style.transform).toContain('translateY(-8px)')
  })

  it('settle: settles at scale(1) and no translateY', async () => {
    const el = makeMockEl()
    const p = motion.animate(el as unknown as Element, motion.settle())
    advanceUntilSettled()
    await p
    const t = el.style.transform
    expect(t === '' || /scale\(1(?:\.0+)?\)/.test(t)).toBe(true)
    expect(t).not.toContain('translateY')
  })
})

describe('M2: execution — grow / shrink', () => {
  it('grow at crystalline: clip-path touched (settled at 0 → cleared)', async () => {
    ledger.tier = 'crystalline'
    const el = makeMockEl()
    const p = motion.animate(el as unknown as Element, motion.grow())
    advanceUntilSettled()
    await p
    // clip-inset 50→0 clears clipPath at settle; verify property was exercised
    expect(el._styles.has('clipPath')).toBe(true)
    const cp = el.style.clipPath
    expect(cp === '' || cp === 'inset(0%)').toBe(true)
  })

  it('shrink at crystalline: clip-path settles at inset(50%)', async () => {
    ledger.tier = 'crystalline'
    const el = makeMockEl()
    const p = motion.animate(el as unknown as Element, motion.shrink())
    advanceUntilSettled()
    await p
    expect(el.style.clipPath).toContain('inset(50%)')
  })
})

describe('M2: execution — stagger with delay > 0', () => {
  it('all elements animate and settle even with delay between them', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      const els = [makeMockEl(), makeMockEl(), makeMockEl()]
      els.forEach(el => motion.variants(el as unknown as Element, { in: motion.emerge() }))

      const p = motion.stagger(els.map(e => e as unknown as Element), 'in', { delay: 50 })

      // Element 0 starts immediately
      advanceUntilSettled()

      // Element 1 fires at 50ms
      vi.advanceTimersByTime(50)
      advanceUntilSettled()

      // Element 2 fires at 100ms
      vi.advanceTimersByTime(50)
      advanceUntilSettled()

      await p

      for (const el of els) {
        expect(parseFloat(el.style.opacity)).toBeCloseTo(1, 1)
      }
    } finally {
      vi.useRealTimers()
    }
  })
})

// =============================================================================
// P0-T5-01: prefers-reduced-motion
// =============================================================================

describe('P0-T5-01: prefers-reduced-motion', () => {
  it('emerge: opacity-only — no scale in transform', async () => {
    ledger.prefersReducedMotion = true
    const el = makeMockEl()
    const p = motion.animate(el as unknown as Element, motion.emerge())
    advanceUntilSettled()
    await p
    expect(parseFloat(el.style.opacity)).toBeCloseTo(1, 2)
    expect(el.style.transform).not.toMatch(/scale/)
  })

  it('depress: opacity 1.0→0.7, no scale', async () => {
    ledger.prefersReducedMotion = true
    const el = makeMockEl()
    const p = motion.animate(el as unknown as Element, motion.depress())
    advanceUntilSettled()
    await p
    expect(parseFloat(el.style.opacity)).toBeCloseTo(0.7, 1)
    expect(el.style.transform).not.toMatch(/scale/)
  })

  it('release: opacity 0.7→1.0, no scale', async () => {
    ledger.prefersReducedMotion = true
    const el = makeMockEl()
    const p = motion.animate(el as unknown as Element, motion.release())
    advanceUntilSettled()
    await p
    expect(parseFloat(el.style.opacity)).toBeCloseTo(1.0, 1)
    expect(el.style.transform).not.toMatch(/scale/)
  })

  it('elevate: complete no-op — nothing applied to element', async () => {
    ledger.prefersReducedMotion = true
    const el = makeMockEl()
    const p = motion.animate(el as unknown as Element, motion.elevate())
    advanceUntilSettled()
    await p
    expect(el._styles.size).toBe(0)
  })

  it('flatten: complete no-op', async () => {
    ledger.prefersReducedMotion = true
    const el = makeMockEl()
    await motion.animate(el as unknown as Element, motion.flatten())
    expect(el._styles.size).toBe(0)
  })

  it('expand: still animates (structural, not vestibular)', async () => {
    ledger.prefersReducedMotion = true
    const el = makeMockEl()
    const p = motion.animate(el as unknown as Element, motion.expand())
    advanceUntilSettled()
    await p
    // expand (clip-inset 50→0) clears clipPath at settle — check the property was touched
    const hasAnim = el._styles.has('clipPath') || el._styles.has('maxHeight')
    expect(hasAnim).toBe(true)
  })

  it('collapse: still animates', async () => {
    ledger.prefersReducedMotion = true
    const el = makeMockEl()
    const p = motion.animate(el as unknown as Element, motion.collapse())
    advanceUntilSettled()
    await p
    // collapsed — clip-path set OR max-height set
    expect(el._styles.size).toBeGreaterThan(0)
  })
})

// =============================================================================
// P0-T5-02: Orchestration
// =============================================================================

describe('P0-T5-02: motion.sequence()', () => {
  it('step 2 starts only after step 1 resolves', async () => {
    const order: number[] = []
    let step1Resolve!: () => void
    const step1Promise = new Promise<void>(r => { step1Resolve = r })

    const p = motion.sequence([
      () => { order.push(1); return step1Promise },
      () => { order.push(2); return Promise.resolve() },
    ])

    expect(order).toEqual([1])
    await Promise.resolve()
    expect(order).toEqual([1]) // still waiting for step1

    step1Resolve()
    await Promise.resolve()
    await Promise.resolve()

    expect(order).toEqual([1, 2])
    await p
  })

  it('resolves after all steps complete', async () => {
    const p = motion.sequence([
      () => Promise.resolve(),
      () => Promise.resolve(),
      () => Promise.resolve(),
    ])
    await expect(p).resolves.toBeUndefined()
  })

  it('with real animations: step 2 waits for step 1 spring to settle', async () => {
    const el = makeMockEl()
    const order: string[] = []

    const p = motion.sequence([
      () => {
        const a = motion.animate(el as unknown as Element, motion.depress())
        a.then(() => order.push('depress-done'))
        return a
      },
      () => {
        order.push('release-start')
        return motion.animate(el as unknown as Element, motion.release())
      },
    ])

    await driveUntilSettled(1200)
    await p

    expect(order.indexOf('depress-done')).toBeLessThan(order.indexOf('release-start'))
  })
})

describe('P0-T5-02: motion.stagger()', () => {
  it('resolves when all elements finish (delay: 0)', async () => {
    const els = [makeMockEl(), makeMockEl(), makeMockEl()]
    els.forEach(el => motion.variants(el as unknown as Element, { in: motion.emerge() }))

    const p = motion.stagger(
      els.map(e => e as unknown as Element),
      'in',
      { delay: 0 },
    )

    await driveUntilSettled(600)
    await p

    for (const el of els) {
      expect(parseFloat(el.style.opacity)).toBeCloseTo(1, 1)
    }
  })
})

describe('P0-T5-02: motion.variants() and motion.set()', () => {
  it('set() applies the registered state', async () => {
    const el = makeMockEl()
    motion.variants(el as unknown as Element, {
      visible: motion.emerge(),
      hidden: motion.recede(),
    })

    const p = motion.set(el as unknown as Element, 'visible')
    advanceUntilSettled()
    await p

    expect(parseFloat(el.style.opacity)).toBeCloseTo(1, 2)
  })

  it('set() before connected: queues and applies on fluid:mounted', async () => {
    const el = makeMockEl({ isConnected: false })
    motion.variants(el as unknown as Element, {
      visible: motion.emerge(),
    })

    const p = motion.set(el as unknown as Element, 'visible')

    // Animation must NOT have started before fluid:mounted
    expect(pendingRaf).toBeNull()

    // Simulate element mounting
    el.isConnected = true
    el.dispatchEvent({ type: 'fluid:mounted' } as unknown as Event)

    advanceUntilSettled()
    await p

    expect(parseFloat(el.style.opacity)).toBeCloseTo(1, 2)
  })
})

// =============================================================================
// P0-T5-03: Scroll-linked values
// =============================================================================

describe('P0-T5-03: motion.scrollProgress()', () => {
  it('progress is 0 when scrollTop is 0', () => {
    const container = makeMockEl({ scrollTop: 0, scrollHeight: 300, clientHeight: 100 })
    const { progress } = motion.scrollProgress(container as unknown as Element)
    let value = -1
    const unsub = progress.subscribe(v => { value = v })
    expect(value).toBeCloseTo(0, 2)
    unsub()
    progress.dispose()
  })

  it('progress is 1 when scrolled to bottom', () => {
    const container = makeMockEl({ scrollTop: 200, scrollHeight: 300, clientHeight: 100 })
    const { progress } = motion.scrollProgress(container as unknown as Element)
    let value = -1
    const unsub = progress.subscribe(v => { value = v })
    expect(value).toBeCloseTo(1, 2)
    unsub()
    progress.dispose()
  })

  it('progress updates on scroll event', () => {
    const container = makeMockEl({ scrollTop: 0, scrollHeight: 300, clientHeight: 100 })
    const { progress } = motion.scrollProgress(container as unknown as Element)
    let value = 0
    progress.subscribe(v => { value = v })

    container.scrollTop = 100
    container.dispatchEvent({ type: 'scroll' } as unknown as Event)

    expect(value).toBeCloseTo(0.5, 1)
    progress.dispose()
  })

  it('velocity starts at 0 on initial subscribe', () => {
    const container = makeMockEl({ scrollTop: 0, scrollHeight: 200, clientHeight: 100 })
    const { velocity } = motion.scrollProgress(container as unknown as Element)
    let v = 999
    velocity.subscribe(val => { v = val })
    expect(v).toBe(0)
    velocity.dispose()
  })
})

describe('P0-T5-03: motion.bind()', () => {
  it('sets CSS property to initial source value immediately', () => {
    const el = makeMockEl()
    const container = makeMockEl({ scrollTop: 0, scrollHeight: 200, clientHeight: 100 })
    const { progress } = motion.scrollProgress(container as unknown as Element)

    const dispose = motion.bind(
      el as unknown as Element,
      '--scroll-progress',
      progress,
    )

    expect(el._styles.get('--scroll-progress')).toBe('0')
    dispose()
    progress.dispose()
  })

  it('clamps value to [min, max] when clamp option provided', () => {
    const el = makeMockEl()
    const container = makeMockEl({ scrollTop: 200, scrollHeight: 300, clientHeight: 100 })
    const { progress } = motion.scrollProgress(container as unknown as Element)

    const dispose = motion.bind(
      el as unknown as Element,
      '--progress',
      progress,
      { clamp: [0, 0.5] },
    )

    const bound = parseFloat(el._styles.get('--progress') ?? '0')
    expect(bound).toBeCloseTo(0.5, 2)
    dispose()
    progress.dispose()
  })

  it('returns a disposer that stops updates', () => {
    const el = makeMockEl()
    const container = makeMockEl({ scrollTop: 0, scrollHeight: 200, clientHeight: 100 })
    const { progress } = motion.scrollProgress(container as unknown as Element)

    const dispose = motion.bind(el as unknown as Element, '--p', progress)
    dispose()

    // After dispose, scroll should not update the property
    container.scrollTop = 100
    container.dispatchEvent({ type: 'scroll' } as unknown as Event)

    // value stays at initial 0, not updated to 0.5
    expect(parseFloat(el._styles.get('--p') ?? '0')).toBeCloseTo(0, 2)
    progress.dispose()
  })
})

describe('P0-T5-03: motion.flip()', () => {
  it('applies inverse translateY immediately before rAF', () => {
    const el = makeMockEl()
    el.getBoundingClientRect
      .mockReturnValueOnce({ top: 0, left: 0, width: 100, height: 50, x: 0, y: 0 })
      .mockReturnValueOnce({ top: 100, left: 0, width: 100, height: 50, x: 0, y: 100 })

    let mutated = false
    motion.flip(el as unknown as Element, () => { mutated = true })

    expect(mutated).toBe(true)
    // Inverse: element moved down 100px in DOM → apply -100px to cancel it
    expect(el.style.transform).toMatch(/translateY\(-100px\)/)
  })

  it('applies inverse translateX immediately', () => {
    const el = makeMockEl()
    el.getBoundingClientRect
      .mockReturnValueOnce({ top: 0, left: 0, width: 100, height: 50 })
      .mockReturnValueOnce({ top: 0, left: 50, width: 100, height: 50 })

    motion.flip(el as unknown as Element, () => {})
    expect(el.style.transform).toMatch(/translateX\(-50px\)/)
  })

  it('springs inverse transform to identity', async () => {
    const el = makeMockEl()
    el.getBoundingClientRect
      .mockReturnValueOnce({ top: 0, left: 0, width: 100, height: 50 })
      .mockReturnValueOnce({ top: 80, left: 30, width: 100, height: 50 })

    const p = motion.flip(el as unknown as Element, () => {})
    advanceUntilSettled()
    await p

    const t = el.style.transform
    // Both translateX and translateY should settle to 0 (or be absent)
    const txMatch = t.match(/translateX\(([^)]+)\)/)
    const tyMatch = t.match(/translateY\(([^)]+)\)/)
    if (txMatch) expect(parseFloat(txMatch[1])).toBeCloseTo(0, 1)
    if (tyMatch) expect(parseFloat(tyMatch[1])).toBeCloseTo(0, 1)
  })

  it('calls mutate() synchronously', () => {
    const el = makeMockEl()
    el.getBoundingClientRect.mockReturnValue({ top: 0, left: 0, width: 100, height: 50 })

    const spy = vi.fn()
    motion.flip(el as unknown as Element, spy)
    expect(spy).toHaveBeenCalledOnce()
  })
})

describe('motion.cancelFlip()', () => {
  it('releases WillChangeManager ref for a single in-flight axis', () => {
    const el = makeMockEl()
    // Only horizontal movement — ty task never created
    el.getBoundingClientRect
      .mockReturnValueOnce({ top: 0, left: 0, width: 100, height: 50 })
      .mockReturnValueOnce({ top: 0, left: 50, width: 100, height: 50 })

    motion.flip(el as unknown as Element, () => {})
    expect(el.style.getPropertyValue('will-change')).not.toBe('')

    motion.cancelFlip(el as unknown as Element)
    expect(el.style.getPropertyValue('will-change')).toBe('')
    expect(el.style.transform).toBe('')
  })

  it('releases both WillChangeManager refs when tx and ty are both in-flight', () => {
    const el = makeMockEl()
    // Both axes move
    el.getBoundingClientRect
      .mockReturnValueOnce({ top: 0, left: 0, width: 100, height: 50 })
      .mockReturnValueOnce({ top: 80, left: 30, width: 100, height: 50 })

    motion.flip(el as unknown as Element, () => {})
    expect(el.style.getPropertyValue('will-change')).not.toBe('')

    motion.cancelFlip(el as unknown as Element)
    expect(el.style.getPropertyValue('will-change')).toBe('')
    expect(el.style.transform).toBe('')
  })

  it('is a no-op when no flip is in-flight', () => {
    const el = makeMockEl()
    expect(() => motion.cancelFlip(el as unknown as Element)).not.toThrow()
    expect(el.style.getPropertyValue('will-change')).toBe('')
    expect(el.style.transform).toBe('')
  })
})

// =============================================================================
// P0-T5-04: View Transitions
// =============================================================================

describe('P0-T5-04: startFluidTransition()', () => {
  it('calls updateFn directly when startViewTransition not available', async () => {
    // document already set up without startViewTransition in setupMockDocument
    let called = false
    await startFluidTransition(() => { called = true })
    expect(called).toBe(true)
  })

  it('wraps updateFn in startViewTransition when available', async () => {
    let capturedFn: (() => void) | null = null
    vi.stubGlobal('document', {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      hidden: false,
      startViewTransition: vi.fn((fn: () => void) => {
        capturedFn = fn
        fn()
        return { ready: Promise.resolve(), finished: Promise.resolve() }
      }),
    })

    let called = false
    await startFluidTransition(() => { called = true })
    expect(capturedFn).not.toBeNull()
    expect(called).toBe(true)
  })

  it('second concurrent call applies updateFn directly — no second transition started', async () => {
    let finishedResolve!: () => void
    const finished = new Promise<void>(r => { finishedResolve = r })
    const calls: string[] = []

    vi.stubGlobal('document', {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      hidden: false,
      startViewTransition: vi.fn((fn: () => void) => {
        calls.push('transition')
        fn()
        return { ready: Promise.resolve(), finished }
      }),
    })

    let firstDone = false
    let secondDone = false

    const p1 = startFluidTransition(() => { firstDone = true })
    const p2 = startFluidTransition(() => { secondDone = true })

    // Second call's updateFn must be invoked while first is still in flight
    await Promise.resolve()
    expect(secondDone).toBe(true)

    // Finish first transition
    finishedResolve()
    await p1
    await p2

    expect(firstDone).toBe(true)
    // Only one real transition was started
    expect(calls).toHaveLength(1)
  })

  it('subsequent call after first completes starts a new transition', async () => {
    const calls: string[] = []
    vi.stubGlobal('document', {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      hidden: false,
      startViewTransition: vi.fn((fn: () => void) => {
        calls.push('transition')
        fn()
        return { ready: Promise.resolve(), finished: Promise.resolve() }
      }),
    })

    await startFluidTransition(() => {})
    await startFluidTransition(() => {})

    expect(calls).toHaveLength(2)
  })
})
