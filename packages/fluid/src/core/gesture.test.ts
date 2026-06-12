/**
 * TESTING STRATEGY NOTE
 *
 * The task spec says: "This module requires real browser PointerEvents — run
 * tests with pnpm test:component (uses real browser via @web/test-runner)."
 *
 * @web/test-runner infrastructure does not yet exist in this package
 * (no web-test-runner.config, no test:component script). Rather than silently
 * substituting Vitest mocks and claiming full coverage, this file uses hand-
 * rolled mock elements in a Vitest/Node environment as an interim measure.
 *
 * What this covers well:
 *  - Logic correctness (thresholds, elastic formula, snap, velocity math)
 *  - Event routing and multi-touch policy (which pointerId is tracked)
 *  - Timer-based behaviour (longPress, hover debounce)
 *  - Dispose / listener cleanup
 *
 * What this does NOT cover (requires a real browser):
 *  - setPointerCapture actually re-routing subsequent events to the element
 *  - pointercancel fired by scroll detection on iOS/Android
 *  - touch-action CSS preventing browser scroll/zoom from competing
 *  - Real PointerEvent coalescing and pressure/tiltX fields
 *
 * When test:component infrastructure is added, a gesture.browser.test.ts
 * should be written to cover the above gaps. Until then these Vitest tests
 * act as a logic gate, not a full integration gate.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { capturePointer, releasePointer, FluidGesture } from './gesture'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeMockEl() {
  const listeners: Record<string, Array<(e: any) => void>> = {}

  const addEventListener = vi.fn((type: string, handler: any) => {
    if (!listeners[type]) listeners[type] = []
    listeners[type].push(handler)
  })

  const removeEventListener = vi.fn((type: string, handler: any) => {
    if (listeners[type]) {
      listeners[type] = listeners[type].filter((h) => h !== handler)
    }
  })

  function fire(type: string, data: Record<string, any> = {}) {
    const event = { type, preventDefault: vi.fn(), stopPropagation: vi.fn(), ...data }
    ;(listeners[type] ?? []).forEach((h) => h(event))
    return event
  }

  return {
    addEventListener,
    removeEventListener,
    setPointerCapture: vi.fn(),
    releasePointerCapture: vi.fn(),
    fire,
  }
}

function ptr(overrides: Record<string, any> = {}): Record<string, any> {
  return {
    pointerId: 1,
    clientX: 0,
    clientY: 0,
    timeStamp: 0,
    preventDefault: vi.fn(),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// P0-T4-01: Pointer capture utilities
// ---------------------------------------------------------------------------

describe('capturePointer', () => {
  it('calls setPointerCapture on the element', () => {
    const el = makeMockEl()
    capturePointer(el as any, 1)
    expect(el.setPointerCapture).toHaveBeenCalledWith(1)
  })
})

describe('releasePointer', () => {
  it('calls releasePointerCapture on the element', () => {
    const el = makeMockEl()
    releasePointer(el as any, 1)
    expect(el.releasePointerCapture).toHaveBeenCalledWith(1)
  })
})

// ---------------------------------------------------------------------------
// P0-T4-02: FluidGesture.press
// ---------------------------------------------------------------------------

describe('FluidGesture.press', () => {
  it('fires onPress when pointer moved less than 8px', () => {
    const el = makeMockEl()
    const onPress = vi.fn()
    const onRelease = vi.fn()
    FluidGesture.press(el as any, { onPress, onRelease })

    el.fire('pointerdown', ptr({ pointerId: 1, clientX: 0, clientY: 0 }))
    el.fire('pointermove', ptr({ pointerId: 1, clientX: 3, clientY: 3 }))
    el.fire('pointerup', ptr({ pointerId: 1, clientX: 3, clientY: 3 }))

    expect(onPress).toHaveBeenCalledTimes(1)
    expect(onRelease).toHaveBeenCalledTimes(1)
  })

  it('does not fire onPress when pointer moved 8px or more', () => {
    const el = makeMockEl()
    const onPress = vi.fn()
    const onRelease = vi.fn()
    FluidGesture.press(el as any, { onPress, onRelease })

    el.fire('pointerdown', ptr({ pointerId: 1, clientX: 0, clientY: 0 }))
    el.fire('pointermove', ptr({ pointerId: 1, clientX: 10, clientY: 0 }))
    el.fire('pointerup', ptr({ pointerId: 1, clientX: 10, clientY: 0 }))

    expect(onPress).not.toHaveBeenCalled()
    expect(onRelease).toHaveBeenCalledTimes(1)
  })

  it('fires onRelease on every pointerup regardless of movement', () => {
    const el = makeMockEl()
    const onPress = vi.fn()
    const onRelease = vi.fn()
    FluidGesture.press(el as any, { onPress, onRelease })

    el.fire('pointerdown', ptr({ pointerId: 1, clientX: 0, clientY: 0 }))
    el.fire('pointermove', ptr({ pointerId: 1, clientX: 100, clientY: 100 }))
    el.fire('pointerup', ptr({ pointerId: 1, clientX: 100, clientY: 100 }))

    expect(onRelease).toHaveBeenCalledTimes(1)
    expect(onPress).not.toHaveBeenCalled()
  })

  it('ignores additional pointers while first pointer is active', () => {
    const el = makeMockEl()
    const onPress = vi.fn()
    FluidGesture.press(el as any, { onPress })

    el.fire('pointerdown', ptr({ pointerId: 1, clientX: 0, clientY: 0 }))
    el.fire('pointerdown', ptr({ pointerId: 2, clientX: 5, clientY: 5 }))
    el.fire('pointerup', ptr({ pointerId: 2, clientX: 5, clientY: 5 }))
    el.fire('pointerup', ptr({ pointerId: 1, clientX: 0, clientY: 0 }))

    expect(onPress).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// P0-T4-02: FluidGesture.hover
// ---------------------------------------------------------------------------

describe('FluidGesture.hover', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('fires onEnter on pointerenter', () => {
    const el = makeMockEl()
    const onEnter = vi.fn()
    FluidGesture.hover(el as any, { onEnter })

    el.fire('pointerenter', ptr())

    expect(onEnter).toHaveBeenCalledTimes(1)
  })

  it('fires onLeave after debounce delay (default 50ms)', () => {
    const el = makeMockEl()
    const onLeave = vi.fn()
    FluidGesture.hover(el as any, { onLeave })

    el.fire('pointerenter', ptr())
    el.fire('pointerleave', ptr())

    expect(onLeave).not.toHaveBeenCalled()

    vi.advanceTimersByTime(50)

    expect(onLeave).toHaveBeenCalledTimes(1)
  })

  it('cancels onLeave if pointer re-enters within delay', () => {
    const el = makeMockEl()
    const onLeave = vi.fn()
    FluidGesture.hover(el as any, { onLeave, delay: 100 })

    el.fire('pointerenter', ptr())
    el.fire('pointerleave', ptr())

    vi.advanceTimersByTime(50)
    el.fire('pointerenter', ptr()) // re-enter cancels pending leave

    vi.advanceTimersByTime(100)

    expect(onLeave).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// P0-T4-03: FluidGesture.drag
// ---------------------------------------------------------------------------

describe('FluidGesture.drag', () => {
  it('calls setPointerCapture on pointerdown', () => {
    const el = makeMockEl()
    FluidGesture.drag(el as any, {})

    el.fire('pointerdown', ptr({ pointerId: 5 }))

    expect(el.setPointerCapture).toHaveBeenCalledWith(5)
  })

  it('constrains to x-axis when axis is "x"', () => {
    const el = makeMockEl()
    const onDrag = vi.fn()
    FluidGesture.drag(el as any, { constraints: { axis: 'x' }, onDrag })

    el.fire('pointerdown', ptr({ clientX: 0, clientY: 0, timeStamp: 0 }))
    el.fire('pointermove', ptr({ clientX: 50, clientY: 30, timeStamp: 100 }))

    expect(onDrag).toHaveBeenCalledWith(expect.objectContaining({ y: 0 }))
  })

  it('constrains to y-axis when axis is "y"', () => {
    const el = makeMockEl()
    const onDrag = vi.fn()
    FluidGesture.drag(el as any, { constraints: { axis: 'y' }, onDrag })

    el.fire('pointerdown', ptr({ clientX: 0, clientY: 0, timeStamp: 0 }))
    el.fire('pointermove', ptr({ clientX: 50, clientY: 30, timeStamp: 100 }))

    expect(onDrag).toHaveBeenCalledWith(expect.objectContaining({ x: 0 }))
  })

  it('clamps position within bounds when elastic is false', () => {
    const el = makeMockEl()
    const onDrag = vi.fn()
    FluidGesture.drag(el as any, {
      constraints: { bounds: { left: 0, right: 100, top: 0, bottom: 100 }, elastic: false },
      onDrag,
    })

    el.fire('pointerdown', ptr({ clientX: 50, clientY: 50, timeStamp: 0 }))
    el.fire('pointermove', ptr({ clientX: 200, clientY: 200, timeStamp: 100 }))

    const { x, y } = onDrag.mock.calls[0][0]
    expect(x).toBeLessThanOrEqual(100)
    expect(y).toBeLessThanOrEqual(100)
  })

  it('applies elastic resistance past bounds', () => {
    const el = makeMockEl()
    const onDrag = vi.fn()
    FluidGesture.drag(el as any, {
      constraints: { bounds: { left: 0, right: 100, top: 0, bottom: 100 }, elastic: true },
      onDrag,
    })

    el.fire('pointerdown', ptr({ clientX: 50, clientY: 50, timeStamp: 0 }))
    el.fire('pointermove', ptr({ clientX: 250, clientY: 50, timeStamp: 100 }))

    const { x } = onDrag.mock.calls[0][0]
    expect(x).toBeGreaterThan(100)
    expect(x).toBeLessThan(200)
  })

  it('outputs velocity in px/ms', () => {
    const el = makeMockEl()
    const onDrag = vi.fn()
    FluidGesture.drag(el as any, { onDrag })

    el.fire('pointerdown', ptr({ clientX: 0, clientY: 0, timeStamp: 0 }))
    el.fire('pointermove', ptr({ clientX: 100, clientY: 0, timeStamp: 100 }))

    const { velocity } = onDrag.mock.calls[0][0]
    expect(velocity.x).toBeCloseTo(1)
    expect(velocity.y).toBeCloseTo(0)
  })

  it('snaps to nearest snap point on release', () => {
    const el = makeMockEl()
    const onRelease = vi.fn()
    FluidGesture.drag(el as any, {
      constraints: { snap: [0, 50, 100] },
      onRelease,
    })

    el.fire('pointerdown', ptr({ clientX: 0, clientY: 0, timeStamp: 0 }))
    el.fire('pointermove', ptr({ clientX: 60, clientY: 0, timeStamp: 100 }))
    el.fire('pointerup', ptr({ clientX: 60, clientY: 0, timeStamp: 200 }))

    expect(onRelease.mock.calls[0][0].x).toBe(50)
  })

  it('snaps to grid on release', () => {
    const el = makeMockEl()
    const onRelease = vi.fn()
    FluidGesture.drag(el as any, {
      constraints: { grid: { x: 25, y: 25 } },
      onRelease,
    })

    el.fire('pointerdown', ptr({ clientX: 0, clientY: 0, timeStamp: 0 }))
    el.fire('pointermove', ptr({ clientX: 33, clientY: 18, timeStamp: 100 }))
    el.fire('pointerup', ptr({ clientX: 33, clientY: 18, timeStamp: 200 }))

    const { x, y } = onRelease.mock.calls[0][0]
    expect(x).toBe(25)
    expect(y).toBe(25)
  })

  it('applies transform constraint', () => {
    const el = makeMockEl()
    const onDrag = vi.fn()
    FluidGesture.drag(el as any, {
      constraints: { transform: (x, y) => ({ x: x * 2, y: y * 2 }) },
      onDrag,
    })

    el.fire('pointerdown', ptr({ clientX: 0, clientY: 0, timeStamp: 0 }))
    el.fire('pointermove', ptr({ clientX: 10, clientY: 5, timeStamp: 100 }))

    const { x, y } = onDrag.mock.calls[0][0]
    expect(x).toBe(20)
    expect(y).toBe(10)
  })
})

// ---------------------------------------------------------------------------
// P0-T4-04: FluidGesture.swipe
// ---------------------------------------------------------------------------

describe('FluidGesture.swipe', () => {
  it('does not fire onSwipe when velocity is below 0.5 px/ms', () => {
    const el = makeMockEl()
    const onSwipe = vi.fn()
    FluidGesture.swipe(el as any, { onSwipe })

    el.fire('pointerdown', ptr({ clientX: 0, clientY: 0, timeStamp: 0 }))
    el.fire('pointermove', ptr({ clientX: 40, clientY: 0, timeStamp: 200 }))
    el.fire('pointerup', ptr({ clientX: 40, clientY: 0, timeStamp: 200 }))

    expect(onSwipe).not.toHaveBeenCalled()
  })

  it('fires onSwipe when velocity meets the 0.5 px/ms threshold', () => {
    const el = makeMockEl()
    const onSwipe = vi.fn()
    FluidGesture.swipe(el as any, { onSwipe })

    el.fire('pointerdown', ptr({ clientX: 0, clientY: 0, timeStamp: 0 }))
    el.fire('pointermove', ptr({ clientX: 100, clientY: 0, timeStamp: 100 }))
    el.fire('pointerup', ptr({ clientX: 100, clientY: 0, timeStamp: 100 }))

    expect(onSwipe).toHaveBeenCalledTimes(1)
  })

  it('sets flick true when velocity exceeds 1.5 px/ms', () => {
    const el = makeMockEl()
    const onSwipe = vi.fn()
    FluidGesture.swipe(el as any, { onSwipe })

    el.fire('pointerdown', ptr({ clientX: 0, clientY: 0, timeStamp: 0 }))
    el.fire('pointermove', ptr({ clientX: 200, clientY: 0, timeStamp: 100 }))
    el.fire('pointerup', ptr({ clientX: 200, clientY: 0, timeStamp: 100 }))

    expect(onSwipe).toHaveBeenCalledWith(expect.objectContaining({ flick: true }))
  })

  it('sets flick false when velocity is between thresholds', () => {
    const el = makeMockEl()
    const onSwipe = vi.fn()
    FluidGesture.swipe(el as any, { onSwipe })

    // 80px / 100ms = 0.8 px/ms — above swipe threshold, below flick
    el.fire('pointerdown', ptr({ clientX: 0, clientY: 0, timeStamp: 0 }))
    el.fire('pointermove', ptr({ clientX: 80, clientY: 0, timeStamp: 100 }))
    el.fire('pointerup', ptr({ clientX: 80, clientY: 0, timeStamp: 100 }))

    expect(onSwipe).toHaveBeenCalledWith(expect.objectContaining({ flick: false }))
  })

  it('computes direction right from net displacement', () => {
    const el = makeMockEl()
    const onSwipe = vi.fn()
    FluidGesture.swipe(el as any, { onSwipe })

    el.fire('pointerdown', ptr({ clientX: 0, clientY: 0, timeStamp: 0 }))
    el.fire('pointermove', ptr({ clientX: 100, clientY: 20, timeStamp: 100 }))
    el.fire('pointerup', ptr({ clientX: 100, clientY: 20, timeStamp: 100 }))

    expect(onSwipe).toHaveBeenCalledWith(expect.objectContaining({ direction: 'right' }))
  })

  it('computes direction up from net displacement', () => {
    const el = makeMockEl()
    const onSwipe = vi.fn()
    FluidGesture.swipe(el as any, { onSwipe })

    el.fire('pointerdown', ptr({ clientX: 0, clientY: 100, timeStamp: 0 }))
    el.fire('pointermove', ptr({ clientX: 10, clientY: 0, timeStamp: 100 }))
    el.fire('pointerup', ptr({ clientX: 10, clientY: 0, timeStamp: 100 }))

    expect(onSwipe).toHaveBeenCalledWith(expect.objectContaining({ direction: 'up' }))
  })

  it('computes direction left', () => {
    const el = makeMockEl()
    const onSwipe = vi.fn()
    FluidGesture.swipe(el as any, { onSwipe })

    el.fire('pointerdown', ptr({ clientX: 200, clientY: 0, timeStamp: 0 }))
    el.fire('pointermove', ptr({ clientX: 0, clientY: 10, timeStamp: 100 }))
    el.fire('pointerup', ptr({ clientX: 0, clientY: 10, timeStamp: 100 }))

    expect(onSwipe).toHaveBeenCalledWith(expect.objectContaining({ direction: 'left' }))
  })

  it('computes direction down', () => {
    const el = makeMockEl()
    const onSwipe = vi.fn()
    FluidGesture.swipe(el as any, { onSwipe })

    el.fire('pointerdown', ptr({ clientX: 0, clientY: 0, timeStamp: 0 }))
    el.fire('pointermove', ptr({ clientX: 10, clientY: 200, timeStamp: 100 }))
    el.fire('pointerup', ptr({ clientX: 10, clientY: 200, timeStamp: 100 }))

    expect(onSwipe).toHaveBeenCalledWith(expect.objectContaining({ direction: 'down' }))
  })
})

// ---------------------------------------------------------------------------
// Dispose / cleanup tests
// ---------------------------------------------------------------------------

describe('FluidGesture dispose', () => {
  it('press: no callbacks fire after dispose', () => {
    const el = makeMockEl()
    const onPress = vi.fn()
    const dispose = FluidGesture.press(el as any, { onPress })
    dispose()

    el.fire('pointerdown', ptr({ pointerId: 1, clientX: 0, clientY: 0 }))
    el.fire('pointerup', ptr({ pointerId: 1, clientX: 0, clientY: 0 }))

    expect(onPress).not.toHaveBeenCalled()
  })

  it('drag: no callbacks fire after dispose', () => {
    const el = makeMockEl()
    const onDrag = vi.fn()
    const dispose = FluidGesture.drag(el as any, { onDrag })
    dispose()

    el.fire('pointerdown', ptr({ clientX: 0, clientY: 0, timeStamp: 0 }))
    el.fire('pointermove', ptr({ clientX: 10, clientY: 0, timeStamp: 100 }))

    expect(onDrag).not.toHaveBeenCalled()
  })

  it('drag: calls releasePointerCapture on pointercancel', () => {
    const el = makeMockEl()
    FluidGesture.drag(el as any, {})

    el.fire('pointerdown', ptr({ pointerId: 3 }))
    el.fire('pointercancel', ptr({ pointerId: 3 }))

    expect(el.releasePointerCapture).toHaveBeenCalledWith(3)
  })
})

// ---------------------------------------------------------------------------
// P0-T4-05: FluidGesture.pinch
// ---------------------------------------------------------------------------

describe('FluidGesture.pinch', () => {
  it('computes scale as current_distance / initial_distance', () => {
    const el = makeMockEl()
    const onPinch = vi.fn()
    FluidGesture.pinch(el as any, { onPinch })

    el.fire('pointerdown', ptr({ pointerId: 1, clientX: 0, clientY: 0 }))
    el.fire('pointerdown', ptr({ pointerId: 2, clientX: 100, clientY: 0 }))

    el.fire('pointermove', ptr({ pointerId: 1, clientX: 0, clientY: 0 }))
    el.fire('pointermove', ptr({ pointerId: 2, clientX: 200, clientY: 0 }))

    expect(onPinch).toHaveBeenCalledWith(expect.objectContaining({ scale: 2 }))
  })

  it('ignores pointermove before second pointerdown arrives', () => {
    const el = makeMockEl()
    const onPinch = vi.fn()
    FluidGesture.pinch(el as any, { onPinch })

    el.fire('pointerdown', ptr({ pointerId: 1, clientX: 0, clientY: 0 }))
    // second pointer not yet down — move from first pointer should not fire
    el.fire('pointermove', ptr({ pointerId: 1, clientX: 50, clientY: 0 }))

    expect(onPinch).not.toHaveBeenCalled()
  })

  it('computes midpoint as average of two pointer positions', () => {
    const el = makeMockEl()
    const onPinch = vi.fn()
    FluidGesture.pinch(el as any, { onPinch })

    el.fire('pointerdown', ptr({ pointerId: 1, clientX: 0, clientY: 0 }))
    el.fire('pointerdown', ptr({ pointerId: 2, clientX: 100, clientY: 100 }))

    el.fire('pointermove', ptr({ pointerId: 1, clientX: 20, clientY: 20 }))
    el.fire('pointermove', ptr({ pointerId: 2, clientX: 80, clientY: 80 }))

    expect(onPinch).toHaveBeenCalledWith(expect.objectContaining({
      midpoint: { x: 50, y: 50 },
    }))
  })
})

// ---------------------------------------------------------------------------
// P0-T4-05: FluidGesture.longPress
// ---------------------------------------------------------------------------

describe('FluidGesture.longPress', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('fires onLongPress after duration ms (default 500)', () => {
    const el = makeMockEl()
    const onLongPress = vi.fn()
    FluidGesture.longPress(el as any, { onLongPress })

    el.fire('pointerdown', ptr({ clientX: 0, clientY: 0 }))

    vi.advanceTimersByTime(499)
    expect(onLongPress).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(onLongPress).toHaveBeenCalledTimes(1)
  })

  it('fires onProgress with values 0–1 over duration', () => {
    const el = makeMockEl()
    const onProgress = vi.fn()
    FluidGesture.longPress(el as any, { onProgress, duration: 1000 })

    el.fire('pointerdown', ptr({ clientX: 0, clientY: 0 }))

    vi.advanceTimersByTime(500)

    const values = onProgress.mock.calls.map(([p]: [number]) => p)
    expect(values.some((p) => p > 0 && p < 1)).toBe(true)
  })

  it('cancels when pointer moves more than longPressThreshold (default 8px)', () => {
    const el = makeMockEl()
    const onLongPress = vi.fn()
    FluidGesture.longPress(el as any, { onLongPress })

    el.fire('pointerdown', ptr({ clientX: 0, clientY: 0 }))
    el.fire('pointermove', ptr({ clientX: 9, clientY: 0 }))

    vi.advanceTimersByTime(500)

    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('does not cancel when movement stays within threshold', () => {
    const el = makeMockEl()
    const onLongPress = vi.fn()
    FluidGesture.longPress(el as any, { onLongPress })

    el.fire('pointerdown', ptr({ clientX: 0, clientY: 0 }))
    el.fire('pointermove', ptr({ clientX: 5, clientY: 0 }))

    vi.advanceTimersByTime(500)

    expect(onLongPress).toHaveBeenCalledTimes(1)
  })

  it('respects custom duration', () => {
    const el = makeMockEl()
    const onLongPress = vi.fn()
    FluidGesture.longPress(el as any, { onLongPress, duration: 1000 })

    el.fire('pointerdown', ptr({ clientX: 0, clientY: 0 }))

    vi.advanceTimersByTime(999)
    expect(onLongPress).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(onLongPress).toHaveBeenCalledTimes(1)
  })
})
