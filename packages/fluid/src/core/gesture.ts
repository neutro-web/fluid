// P0-T4-01 through P0-T4-05: Gesture recognizers built on PointerEvents.
// setPointerCapture is non-optional for drag — without it events stop firing
// when the pointer leaves the element.

const ELASTIC_MAX = 100 // px — maximum elastic overshoot past bounds

// touch-action is set automatically per gesture type so the browser doesn't
// hijack pointer events before our recognizer can process them.
function manageTouchAction(el: Element, value: string): () => void {
  const s = (el as HTMLElement).style
  if (!s) return () => {}
  const prev = s.touchAction
  s.touchAction = value
  return () => {
    s.touchAction = prev
  }
}

function safeCapture(el: Element, pointerId: number): void {
  try {
    el.setPointerCapture(pointerId)
  } catch {
    // pointer already gone — stale id or detached element
  }
}

function safeRelease(el: Element, pointerId: number): void {
  try {
    el.releasePointerCapture(pointerId)
  } catch {
    // pointer already gone — stale id or detached element
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DragConstraints {
  bounds?: { top: number; left: number; bottom: number; right: number }
  axis?: 'x' | 'y' | 'both'
  snap?: number[]
  elastic?: boolean
  grid?: { x: number; y: number }
  transform?: (x: number, y: number) => { x: number; y: number }
}

export interface DragState {
  x: number
  y: number
  dx: number
  dy: number
  velocity: { x: number; y: number }
}

export interface PressOptions {
  onPress?: (e: PointerEvent) => void
  onRelease?: (e: PointerEvent) => void
  moveThreshold?: number
}

export interface HoverOptions {
  onEnter?: (e: PointerEvent) => void
  onLeave?: (e: PointerEvent) => void
  delay?: number
}

export interface DragOptions {
  constraints?: DragConstraints
  onDragStart?: (state: DragState) => void
  onDrag?: (state: DragState) => void
  onRelease?: (state: DragState) => void
  longPressThreshold?: number
}

export interface SwipeState {
  direction: 'up' | 'down' | 'left' | 'right'
  velocity: number
  flick: boolean
}

export interface SwipeOptions {
  onSwipe?: (state: SwipeState) => void
  velocityThreshold?: number
  flickThreshold?: number
}

export interface PinchState {
  scale: number
  midpoint: { x: number; y: number }
}

export interface PinchOptions {
  onPinch?: (state: PinchState) => void
  onPinchStart?: (state: PinchState) => void
  onPinchEnd?: (state: PinchState) => void
}

export interface LongPressOptions {
  onLongPress?: () => void
  onProgress?: (progress: number) => void
  duration?: number
  longPressThreshold?: number
}

// ---------------------------------------------------------------------------
// P0-T4-01: Pointer capture utilities
// ---------------------------------------------------------------------------

export function capturePointer(el: Element, pointerId: number): void {
  safeCapture(el, pointerId)
}

export function releasePointer(el: Element, pointerId: number): void {
  safeRelease(el, pointerId)
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function elasticResist(value: number, boundary: number, direction: 1 | -1): number {
  const pull = direction === 1 ? value - boundary : boundary - value
  return direction === 1
    ? boundary + ELASTIC_MAX * (1 - Math.exp(-pull / ELASTIC_MAX))
    : boundary - ELASTIC_MAX * (1 - Math.exp(-pull / ELASTIC_MAX))
}

function applyBounds(
  x: number,
  y: number,
  bounds: NonNullable<DragConstraints['bounds']>,
  elastic: boolean,
): { x: number; y: number } {
  let rx = x
  let ry = y
  if (elastic) {
    if (x < bounds.left) rx = elasticResist(x, bounds.left, -1)
    else if (x > bounds.right) rx = elasticResist(x, bounds.right, 1)
    if (y < bounds.top) ry = elasticResist(y, bounds.top, -1)
    else if (y > bounds.bottom) ry = elasticResist(y, bounds.bottom, 1)
  } else {
    rx = Math.max(bounds.left, Math.min(bounds.right, x))
    ry = Math.max(bounds.top, Math.min(bounds.bottom, y))
  }
  return { x: rx, y: ry }
}

function nearestSnap(value: number, points: number[]): number {
  if (points.length === 0) return value
  return points.reduce((best, p) =>
    Math.abs(p - value) < Math.abs(best - value) ? p : best,
  )
}

function snapGrid(value: number, step: number): number {
  return Math.round(value / step) * step
}

// ---------------------------------------------------------------------------
// P0-T4-02: FluidGesture.press  /  FluidGesture.hover
// P0-T4-03: FluidGesture.drag
// P0-T4-04: FluidGesture.swipe
// P0-T4-05: FluidGesture.pinch  /  FluidGesture.longPress
// ---------------------------------------------------------------------------

export class FluidGesture {
  // -------------------------------------------------------------------------
  // press
  // -------------------------------------------------------------------------
  static press(el: Element, opts: PressOptions): () => void {
    const moveThreshold = opts.moveThreshold ?? 8
    // manipulation: removes double-tap zoom delay while allowing scroll
    const restoreTouchAction = manageTouchAction(el, 'manipulation')
    let activeId: number | null = null
    let startX = 0
    let startY = 0
    let moved = false

    const onDown = (e: PointerEvent) => {
      if (activeId !== null) return
      activeId = e.pointerId
      startX = e.clientX
      startY = e.clientY
      moved = false
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== activeId) return
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      if (Math.sqrt(dx * dx + dy * dy) >= moveThreshold) moved = true
    }

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== activeId) return
      const wasMoved = moved
      activeId = null
      moved = false
      // onPress fires on pointerup (not pointerdown) so movement can be measured first
      if (!wasMoved) opts.onPress?.(e)
      opts.onRelease?.(e)
    }

    const onCancel = (e: PointerEvent) => {
      if (e.pointerId !== activeId) return
      activeId = null
      moved = false
      opts.onRelease?.(e)
    }

    el.addEventListener('pointerdown', onDown as EventListener)
    el.addEventListener('pointermove', onMove as EventListener)
    el.addEventListener('pointerup', onUp as EventListener)
    el.addEventListener('pointercancel', onCancel as EventListener)

    return () => {
      restoreTouchAction()
      el.removeEventListener('pointerdown', onDown as EventListener)
      el.removeEventListener('pointermove', onMove as EventListener)
      el.removeEventListener('pointerup', onUp as EventListener)
      el.removeEventListener('pointercancel', onCancel as EventListener)
    }
  }

  // -------------------------------------------------------------------------
  // hover
  // -------------------------------------------------------------------------
  static hover(el: Element, opts: HoverOptions): () => void {
    const delay = opts.delay ?? 50
    let leaveTimer: ReturnType<typeof setTimeout> | null = null

    const onEnter = (e: PointerEvent) => {
      if (leaveTimer !== null) {
        clearTimeout(leaveTimer)
        leaveTimer = null
      }
      opts.onEnter?.(e)
    }

    const onLeave = (e: PointerEvent) => {
      leaveTimer = setTimeout(() => {
        leaveTimer = null
        opts.onLeave?.(e)
      }, delay)
    }

    el.addEventListener('pointerenter', onEnter as EventListener)
    el.addEventListener('pointerleave', onLeave as EventListener)

    return () => {
      if (leaveTimer !== null) clearTimeout(leaveTimer)
      el.removeEventListener('pointerenter', onEnter as EventListener)
      el.removeEventListener('pointerleave', onLeave as EventListener)
    }
  }

  // -------------------------------------------------------------------------
  // drag
  // -------------------------------------------------------------------------
  static drag(el: Element, opts: DragOptions): () => void {
    const c = opts.constraints
    // none: prevents browser scroll/zoom from hijacking pointer events mid-drag
    const restoreTouchAction = manageTouchAction(el, 'none')

    const VEL_WINDOW = 100 // ms — rolling window for velocity computation

    let activeId: number | null = null
    let startX = 0
    let startY = 0
    let lastX = 0
    let lastY = 0
    let lastTime = 0
    let velX = 0
    let velY = 0
    // Move history for rolling-window velocity: avoids stale speed when user
    // pauses mid-drag then releases.
    let moveHist: Array<{ x: number; y: number; t: number }> = []

    const constrain = (rawX: number, rawY: number): { x: number; y: number } => {
      let x = rawX
      let y = rawY

      if (c?.axis === 'x') y = 0
      else if (c?.axis === 'y') x = 0

      if (c?.bounds) {
        // elastic defaults to true per spec (rubber-band beyond bounds)
        const res = applyBounds(x, y, c.bounds, c.elastic !== false)
        x = res.x
        y = res.y
      }

      if (c?.transform) {
        const res = c.transform(x, y)
        x = res.x
        y = res.y
      }

      return { x, y }
    }

    const constrainRelease = (rawX: number, rawY: number): { x: number; y: number } => {
      let x = rawX
      let y = rawY

      if (c?.axis === 'x') y = 0
      else if (c?.axis === 'y') x = 0

      // Hard-clamp to bounds on release (no elastic overshoot on final position)
      if (c?.bounds) {
        const b = c.bounds
        x = Math.max(b.left, Math.min(b.right, x))
        y = Math.max(b.top, Math.min(b.bottom, y))
      }

      if (c?.snap) {
        x = nearestSnap(x, c.snap)
        y = nearestSnap(y, c.snap)
      }

      if (c?.grid) {
        x = snapGrid(x, c.grid.x)
        y = snapGrid(y, c.grid.y)
      }

      if (c?.transform) {
        const res = c.transform(x, y)
        x = res.x
        y = res.y
      }

      return { x, y }
    }

    const onDown = (e: PointerEvent) => {
      if (activeId !== null) return
      activeId = e.pointerId
      safeCapture(el, e.pointerId) // required — non-negotiable per critical rules
      startX = e.clientX
      startY = e.clientY
      lastX = e.clientX
      lastY = e.clientY
      lastTime = e.timeStamp
      velX = 0
      velY = 0
      moveHist = []

      const pos = constrain(0, 0)
      opts.onDragStart?.({ ...pos, dx: 0, dy: 0, velocity: { x: 0, y: 0 } })
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== activeId) return

      const dx = e.clientX - lastX
      const dy = e.clientY - lastY

      // Rolling-window velocity: trim entries outside the window, then measure
      // over the surviving span. Falls back to point-sample on the first move.
      moveHist.push({ x: e.clientX, y: e.clientY, t: e.timeStamp })
      const cutoff = e.timeStamp - VEL_WINDOW
      let trim = 0
      while (trim < moveHist.length - 1 && (moveHist[trim]?.t ?? 0) < cutoff) trim++
      if (trim > 0) moveHist.splice(0, trim)

      const oldest = moveHist[0]
      const newest = moveHist[moveHist.length - 1]
      if (oldest !== undefined && newest !== undefined && newest.t > oldest.t) {
        velX = (newest.x - oldest.x) / (newest.t - oldest.t)
        velY = (newest.y - oldest.y) / (newest.t - oldest.t)
      } else {
        // Single sample or zero dt — point-sample from previous position
        const dt = e.timeStamp - lastTime
        if (dt > 0) {
          velX = dx / dt
          velY = dy / dt
        }
      }

      lastX = e.clientX
      lastY = e.clientY
      lastTime = e.timeStamp

      const rawX = e.clientX - startX
      const rawY = e.clientY - startY
      const pos = constrain(rawX, rawY)

      opts.onDrag?.({ ...pos, dx, dy, velocity: { x: velX, y: velY } })
    }

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== activeId) return
      safeRelease(el, e.pointerId)
      activeId = null

      // Decay velocity to zero when the pointer was held still before releasing
      if (e.timeStamp - lastTime > VEL_WINDOW) {
        velX = 0
        velY = 0
      }

      const rawX = e.clientX - startX
      const rawY = e.clientY - startY
      const pos = constrainRelease(rawX, rawY)

      opts.onRelease?.({ ...pos, dx: 0, dy: 0, velocity: { x: velX, y: velY } })
    }

    const onCancel = (e: PointerEvent) => {
      if (e.pointerId !== activeId) return
      safeRelease(el, e.pointerId)
      activeId = null
    }

    el.addEventListener('pointerdown', onDown as EventListener)
    el.addEventListener('pointermove', onMove as EventListener)
    el.addEventListener('pointerup', onUp as EventListener)
    el.addEventListener('pointercancel', onCancel as EventListener)

    return () => {
      restoreTouchAction()
      el.removeEventListener('pointerdown', onDown as EventListener)
      el.removeEventListener('pointermove', onMove as EventListener)
      el.removeEventListener('pointerup', onUp as EventListener)
      el.removeEventListener('pointercancel', onCancel as EventListener)
    }
  }

  // -------------------------------------------------------------------------
  // swipe
  // -------------------------------------------------------------------------
  static swipe(el: Element, opts: SwipeOptions): () => void {
    const velThreshold = opts.velocityThreshold ?? 0.5
    const flickThreshold = opts.flickThreshold ?? 1.5
    // none: prevents browser scroll from competing and firing pointercancel
    const restoreTouchAction = manageTouchAction(el, 'none')
    const VEL_WINDOW = 100 // ms — window for release-velocity computation

    let activeId: number | null = null
    let startX = 0
    let startY = 0
    let startTime = 0
    let moveHist: Array<{ x: number; y: number; t: number }> = []

    const onDown = (e: PointerEvent) => {
      if (activeId !== null) return
      activeId = e.pointerId
      startX = e.clientX
      startY = e.clientY
      startTime = e.timeStamp
      moveHist = []
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== activeId) return
      moveHist.push({ x: e.clientX, y: e.clientY, t: e.timeStamp })
    }

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== activeId) return
      activeId = null

      // Velocity uses the last VEL_WINDOW ms of movement so that a slow-start /
      // fast-end flick is not under-reported by whole-gesture averaging.
      // Include the down event so the window is always anchored even with no moves.
      const allPts = [{ x: startX, y: startY, t: startTime }, ...moveHist]
      const cutoff = e.timeStamp - VEL_WINDOW
      const recent = allPts.filter((p) => p.t >= cutoff)
      const anchor = recent[0] ?? allPts[0]!
      const velDx = e.clientX - anchor.x
      const velDy = e.clientY - anchor.y
      const velDt = e.timeStamp - anchor.t
      const velocity = velDt > 0 ? Math.sqrt(velDx * velDx + velDy * velDy) / velDt : 0

      if (velocity < velThreshold) return

      // Direction uses net displacement from gesture start (spec §5.1)
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      const adx = Math.abs(dx)
      const ady = Math.abs(dy)
      const direction: SwipeState['direction'] =
        adx >= ady ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'

      opts.onSwipe?.({ direction, velocity, flick: velocity > flickThreshold })
    }

    const onCancel = (e: PointerEvent) => {
      if (e.pointerId === activeId) activeId = null
    }

    el.addEventListener('pointerdown', onDown as EventListener)
    el.addEventListener('pointermove', onMove as EventListener)
    el.addEventListener('pointerup', onUp as EventListener)
    el.addEventListener('pointercancel', onCancel as EventListener)

    return () => {
      restoreTouchAction()
      el.removeEventListener('pointerdown', onDown as EventListener)
      el.removeEventListener('pointermove', onMove as EventListener)
      el.removeEventListener('pointerup', onUp as EventListener)
      el.removeEventListener('pointercancel', onCancel as EventListener)
    }
  }

  // -------------------------------------------------------------------------
  // pinch
  // -------------------------------------------------------------------------
  static pinch(el: Element, opts: PinchOptions): () => void {
    const ptrs = new Map<number, { x: number; y: number }>()
    let initialDist = 0
    // none: prevents browser pinch-zoom from competing with the recognizer
    const restoreTouchAction = manageTouchAction(el, 'none')

    const dist = (): number => {
      if (ptrs.size < 2) return 0
      const vals = Array.from(ptrs.values())
      const a = vals[0]
      const b = vals[1]
      if (a === undefined || b === undefined) return 0
      const dx = b.x - a.x
      const dy = b.y - a.y
      return Math.sqrt(dx * dx + dy * dy)
    }

    const mid = (): { x: number; y: number } => {
      if (ptrs.size < 2) return { x: 0, y: 0 }
      const vals = Array.from(ptrs.values())
      const a = vals[0]
      const b = vals[1]
      if (a === undefined || b === undefined) return { x: 0, y: 0 }
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    }

    const onDown = (e: PointerEvent) => {
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (ptrs.size === 2) {
        initialDist = dist()
        opts.onPinchStart?.({ scale: 1, midpoint: mid() })
      }
    }

    const onMove = (e: PointerEvent) => {
      if (!ptrs.has(e.pointerId)) return
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (ptrs.size < 2) return

      const scale = initialDist > 0 ? dist() / initialDist : 1
      opts.onPinch?.({ scale, midpoint: mid() })
    }

    const onUp = (e: PointerEvent) => {
      if (ptrs.size >= 2) {
        opts.onPinchEnd?.({ scale: 1, midpoint: mid() })
      }
      ptrs.delete(e.pointerId)
    }

    // Cancel: end the gesture silently — delete pointer without firing onPinchEnd
    const onCancel = (e: PointerEvent) => {
      ptrs.delete(e.pointerId)
    }

    el.addEventListener('pointerdown', onDown as EventListener)
    el.addEventListener('pointermove', onMove as EventListener)
    el.addEventListener('pointerup', onUp as EventListener)
    el.addEventListener('pointercancel', onCancel as EventListener)

    return () => {
      restoreTouchAction()
      el.removeEventListener('pointerdown', onDown as EventListener)
      el.removeEventListener('pointermove', onMove as EventListener)
      el.removeEventListener('pointerup', onUp as EventListener)
      el.removeEventListener('pointercancel', onCancel as EventListener)
    }
  }

  // -------------------------------------------------------------------------
  // longPress
  // -------------------------------------------------------------------------
  static longPress(el: Element, opts: LongPressOptions): () => void {
    const duration = opts.duration ?? 500
    const threshold = opts.longPressThreshold ?? 8
    const TICK = 16 // ms between progress ticks
    // none: prevents scroll from firing pointercancel before the timer fires
    const restoreTouchAction = manageTouchAction(el, 'none')

    let startX = 0
    let startY = 0
    let cancelled = false
    let longPressTimer: ReturnType<typeof setTimeout> | null = null
    let progressTimer: ReturnType<typeof setInterval> | null = null
    let ticks = 0
    const totalTicks = Math.ceil(duration / TICK)

    const cleanup = () => {
      if (longPressTimer !== null) {
        clearTimeout(longPressTimer)
        longPressTimer = null
      }
      if (progressTimer !== null) {
        clearInterval(progressTimer)
        progressTimer = null
      }
    }

    const onDown = (e: PointerEvent) => {
      startX = e.clientX
      startY = e.clientY
      cancelled = false
      ticks = 0

      longPressTimer = setTimeout(() => {
        if (!cancelled) {
          opts.onProgress?.(1)
          opts.onLongPress?.()
        }
        cleanup()
      }, duration)

      if (opts.onProgress) {
        progressTimer = setInterval(() => {
          if (cancelled) {
            cleanup()
            return
          }
          ticks++
          opts.onProgress!(Math.min(ticks / totalTicks, 1))
        }, TICK)
      }
    }

    const onMove = (e: PointerEvent) => {
      if (cancelled) return
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      if (Math.sqrt(dx * dx + dy * dy) > threshold) {
        cancelled = true
        cleanup()
      }
    }

    const onUp = () => {
      cleanup()
      // cancelled reset happens in onDown for the next gesture
    }

    el.addEventListener('pointerdown', onDown as EventListener)
    el.addEventListener('pointermove', onMove as EventListener)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)

    return () => {
      cleanup()
      restoreTouchAction()
      el.removeEventListener('pointerdown', onDown as EventListener)
      el.removeEventListener('pointermove', onMove as EventListener)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
    }
  }
}
