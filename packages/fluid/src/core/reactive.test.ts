import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { spring } from './reactive'
import { AnimationDriver } from './driver'

let pendingRaf: ((ts: number) => void) | null = null
let rafCounter = 0

function setupMockRaf() {
  pendingRaf = null
  rafCounter = 0
  vi.stubGlobal('requestAnimationFrame', (cb: (ts: number) => void) => {
    pendingRaf = cb
    return ++rafCounter
  })
  vi.stubGlobal('cancelAnimationFrame', (_id: number) => {
    pendingRaf = null
  })
  vi.stubGlobal('document', {
    hidden: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })
}

function flushRaf(ts: number): boolean {
  if (!pendingRaf) return false
  const cb = pendingRaf
  pendingRaf = null
  cb(ts)
  return true
}

function advanceUntilSettled(maxFrames = 600, dtMs = 16): void {
  let ts = 0
  for (let i = 0; i < maxFrames; i++) {
    ts += dtMs
    if (!flushRaf(ts)) break
  }
}

beforeEach(() => {
  setupMockRaf()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('spring() reactive value — P0-T1-07', () => {
  describe('subscribe()', () => {
    it('calls subscriber immediately with initial value', () => {
      const d = new AnimationDriver()
      const s = spring(0, 'snappy', d)
      const received: number[] = []
      s.subscribe(v => received.push(v))
      expect(received).toEqual([0])
    })

    it('calls subscriber on each animation frame with updated value', () => {
      const d = new AnimationDriver()
      const s = spring(0, 'snappy', d)
      const received: number[] = []
      s.subscribe(v => received.push(v))
      s.to(1)
      flushRaf(16)
      flushRaf(32)
      expect(received.length).toBeGreaterThan(2) // initial + frames
    })

    it('multiple subscribers all receive the same value', () => {
      const d = new AnimationDriver()
      const s = spring(0, 'snappy', d)
      const a: number[] = []
      const b: number[] = []
      s.subscribe(v => a.push(v))
      s.subscribe(v => b.push(v))
      s.to(1)
      flushRaf(16)
      expect(a).toEqual(b)
    })

    it('returns an unsubscribe function that stops notifications', () => {
      const d = new AnimationDriver()
      const s = spring(0, 'snappy', d)
      const received: number[] = []
      const unsub = s.subscribe(v => received.push(v))
      unsub()
      s.to(1)
      flushRaf(16)
      expect(received).toHaveLength(1) // only the immediate call
    })
  })

  describe('to()', () => {
    it('animates toward the target and settles', async () => {
      const d = new AnimationDriver()
      const s = spring(0, 'snappy', d)
      s.to(1)
      advanceUntilSettled()
      await s.settled()
      const received: number[] = []
      s.subscribe(v => received.push(v))
      expect(received[0]).toBeCloseTo(1, 3)
    })

    it('preserves velocity when called mid-animation', () => {
      const d = new AnimationDriver()
      const s = spring(0, 'bouncy', d)
      const received: number[] = []
      s.subscribe(v => received.push(v))

      s.to(100)
      flushRaf(16)
      flushRaf(32)
      flushRaf(48)

      // Must have built velocity
      const velBefore = (s as any)._velocity as number
      expect(velBefore).not.toBe(0)

      // Interrupt — velocity should carry forward
      s.to(0)
      flushRaf(64)

      // Value shouldn't snap to 0 instantly
      const lastReceived = received[received.length - 1]
      expect(lastReceived).toBeGreaterThan(0)

      advanceUntilSettled()
    })
  })

  describe('settled()', () => {
    it('resolves when the animation completes', async () => {
      const d = new AnimationDriver()
      const s = spring(0, 'snappy', d)
      s.to(1)
      advanceUntilSettled()
      await expect(s.settled()).resolves.toBeUndefined()
    })

    it('returns an already-resolved promise if not animating', async () => {
      const d = new AnimationDriver()
      const s = spring(0, 'snappy', d)
      await expect(s.settled()).resolves.toBeUndefined()
    })
  })

  describe('dispose()', () => {
    it('stops animation and clears subscribers', () => {
      const d = new AnimationDriver()
      const s = spring(0, 'snappy', d)
      const received: number[] = []
      s.subscribe(v => received.push(v))
      s.to(1)
      flushRaf(16)
      s.dispose()
      flushRaf(32) // should not trigger any subscriber
      expect(received).toHaveLength(2) // initial + one frame
    })

    it('resolves settled() promise on dispose', async () => {
      const d = new AnimationDriver()
      const s = spring(0, 'snappy', d)
      s.to(1)
      const promise = s.settled()
      s.dispose()
      await expect(promise).resolves.toBeUndefined()
    })
  })

  describe('spring() factory', () => {
    it('accepts a preset string key', () => {
      const d = new AnimationDriver()
      expect(() => spring(0, 'snappy', d)).not.toThrow()
      expect(() => spring(0, 'bouncy', d)).not.toThrow()
      expect(() => spring(0, 'gentle', d)).not.toThrow()
      expect(() => spring(0, 'smooth', d)).not.toThrow()
      expect(() => spring(0, 'precise', d)).not.toThrow()
    })

    it('accepts a SpringConfig object directly', () => {
      const d = new AnimationDriver()
      expect(() => spring(0, { mass: 1, stiffness: 100, damping: 20 }, d)).not.toThrow()
    })
  })
})
