import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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
}

function setupMockDocument(hidden = false) {
  const listeners = new Map<string, EventListenerOrEventListenerObject>()
  let _hidden = hidden
  const doc = {
    get hidden() { return _hidden },
    set hidden(v: boolean) { _hidden = v },
    addEventListener(event: string, handler: EventListenerOrEventListenerObject) {
      listeners.set(event, handler)
    },
    removeEventListener: vi.fn(),
    _listeners: listeners,
  }
  vi.stubGlobal('document', doc)
  return doc as typeof doc & { hidden: boolean; _listeners: typeof listeners }
}

function flushRaf(ts: number): boolean {
  if (!pendingRaf) return false
  const cb = pendingRaf
  pendingRaf = null
  cb(ts)
  return true
}

beforeEach(() => {
  setupMockRaf()
  setupMockDocument()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AnimationDriver — P0-T1-04', () => {
  describe('rAF loop lifecycle', () => {
    it('starts rAF when first task is registered', () => {
      const d = new AnimationDriver()
      const task = { advance: vi.fn().mockReturnValue(false) }
      d.register(Symbol(), task)
      expect(pendingRaf).not.toBeNull()
    })

    it('does not start rAF when no tasks are registered', () => {
      new AnimationDriver()
      expect(pendingRaf).toBeNull()
    })

    it('calls task.advance on tick', () => {
      const d = new AnimationDriver()
      const task = { advance: vi.fn().mockReturnValue(false) }
      d.register(Symbol(), task)
      flushRaf(16)
      expect(task.advance).toHaveBeenCalledOnce()
    })

    it('stops rAF when the last settled task is removed', () => {
      const d = new AnimationDriver()
      const task = { advance: vi.fn().mockReturnValue(true) } // settles immediately
      d.register(Symbol(), task)
      flushRaf(16)
      expect(pendingRaf).toBeNull()
    })

    it('continues rAF while tasks remain', () => {
      const d = new AnimationDriver()
      const task = { advance: vi.fn().mockReturnValue(false) }
      d.register(Symbol(), task)
      flushRaf(16)
      expect(pendingRaf).not.toBeNull() // still scheduled
    })

    it('deregister() removes a task and cancels rAF when empty', () => {
      const d = new AnimationDriver()
      const id = Symbol()
      const task = { advance: vi.fn().mockReturnValue(false) }
      d.register(id, task)
      d.deregister(id)
      expect(pendingRaf).toBeNull()
    })
  })

  describe('dt calculation', () => {
    it('uses 16ms for the very first frame (no previous timestamp)', () => {
      const d = new AnimationDriver()
      let receivedDt = 0
      const task = { advance: vi.fn((dt: number) => { receivedDt = dt; return true }) }
      d.register(Symbol(), task)
      flushRaf(1000) // arbitrary first timestamp
      expect(receivedDt).toBeCloseTo(0.016, 4)
    })

    it('uses real dt between frames', () => {
      const d = new AnimationDriver()
      let receivedDt = 0
      let callCount = 0
      const task = {
        advance: vi.fn((dt: number) => {
          callCount++
          if (callCount === 2) receivedDt = dt
          return callCount >= 2
        }),
      }
      d.register(Symbol(), task)
      flushRaf(1000)  // first frame: dt = 16ms (no prior)
      flushRaf(1032)  // second frame: dt = (1032-1000)/1000 = 32ms
      expect(receivedDt).toBeCloseTo(0.032, 4)
    })

    it('caps dt at 64ms even when the gap is large', () => {
      const d = new AnimationDriver()
      let receivedDt = 0
      let callCount = 0
      const task = {
        advance: vi.fn((dt: number) => {
          callCount++
          if (callCount === 2) receivedDt = dt
          return callCount >= 2
        }),
      }
      d.register(Symbol(), task)
      flushRaf(1000)
      flushRaf(2000) // 1000ms gap — must be capped at 64ms
      expect(receivedDt).toBeLessThanOrEqual(0.064)
    })
  })

  describe('visibility handling', () => {
    it('pauses the loop when document becomes hidden', () => {
      const mockDoc = setupMockDocument(false)
      const d = new AnimationDriver()
      const task = { advance: vi.fn().mockReturnValue(false) }
      d.register(Symbol(), task)
      expect(pendingRaf).not.toBeNull()

      // Trigger visibilitychange hidden
      mockDoc.hidden = true
      const handler = mockDoc._listeners.get('visibilitychange') as () => void
      handler()
      expect(pendingRaf).toBeNull()
    })

    it('resets dt to 16ms when resuming from hidden', () => {
      const mockDoc = setupMockDocument(false)
      const d = new AnimationDriver()
      const receivedDts: number[] = []
      let callCount = 0
      const task = {
        advance: vi.fn((dt: number) => {
          receivedDts.push(dt)
          return ++callCount >= 3
        }),
      }
      d.register(Symbol(), task)

      // Frame 1 at t=1000 (dt=16ms default)
      flushRaf(1000)

      // Tab hidden
      const handler = mockDoc._listeners.get('visibilitychange') as () => void
      mockDoc.hidden = true
      handler()

      // Tab visible again
      mockDoc.hidden = false
      handler()

      // Frame 2 — first frame after resume should have dt=16ms, not the large gap
      flushRaf(60000)
      expect(receivedDts[1]).toBeCloseTo(0.016, 4)
    })
  })

  describe('multiple tasks', () => {
    it('advances all registered tasks each tick', () => {
      const d = new AnimationDriver()
      const t1 = { advance: vi.fn().mockReturnValue(false) }
      const t2 = { advance: vi.fn().mockReturnValue(false) }
      d.register(Symbol(), t1)
      d.register(Symbol(), t2)
      flushRaf(16)
      expect(t1.advance).toHaveBeenCalledOnce()
      expect(t2.advance).toHaveBeenCalledOnce()
    })

    it('removes a settled task without stopping unsettled ones', () => {
      const d = new AnimationDriver()
      const t1 = { advance: vi.fn().mockReturnValue(true) }  // settles on first tick
      const t2 = { advance: vi.fn().mockReturnValue(false) } // never settles
      d.register(Symbol(), t1)
      d.register(Symbol(), t2)
      flushRaf(16)
      expect(pendingRaf).not.toBeNull() // t2 still running
      flushRaf(32)
      expect(t1.advance).toHaveBeenCalledOnce() // only called once, then removed
      expect(t2.advance).toHaveBeenCalledTimes(2)
    })
  })

  describe('destroy()', () => {
    it('cancels rAF and clears active tasks', () => {
      const d = new AnimationDriver()
      const task = { advance: vi.fn().mockReturnValue(false) }
      d.register(Symbol(), task)
      expect(pendingRaf).not.toBeNull()
      d.destroy()
      expect(pendingRaf).toBeNull()
    })

    it('removes visibilitychange listener', () => {
      const mockDoc = setupMockDocument()
      const d = new AnimationDriver()
      const removeSpy = vi.spyOn(mockDoc, 'removeEventListener')
      d.destroy()
      expect(removeSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
    })

    it('is safe to call when no tasks are registered', () => {
      const d = new AnimationDriver()
      expect(() => d.destroy()).not.toThrow()
    })
  })
})
