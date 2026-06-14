import { ledger } from '../../core/ledger'
import { driver } from '../../core/driver'
import type { SpringTask } from '../../core/driver'
import { stepSpring, SPRING_PRESETS } from '../../core/spring'
import type { SpringState } from '../../core/spring'
import { STACK_STYLE_ID, stackStyles } from './styles'

interface ActiveFlip {
  id: symbol
  stateX: SpringState
  stateY: SpringState
  realTransform: string
}

// Module-level, keyed per element — same safety profile as `driver` (intentional singleton).
const activeFlips = new WeakMap<HTMLElement, ActiveFlip>()
// Maps each CSS-FLIP element to its cancel function. Using a Map (not WeakSet) so
// _onTierChange can call cancel() explicitly rather than relying on transitioncancel,
// which Safari does not fire reliably when transition is removed synchronously in JS.
const activeCssFlipCleanup = new Map<HTMLElement, () => void>()

const DEV = typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'

const GAP_MAP: Record<string, string> = {
  xs: 'var(--fluid-space-1)',
  sm: 'var(--fluid-space-2)',
  md: 'var(--fluid-space-4)',
  lg: 'var(--fluid-space-6)',
  xl: 'var(--fluid-space-10)',
}

// CSS linear() approximation of the smooth spring preset sampled at 50ms intervals over 450ms.
// Values represent animation progress (0 = start position, 1 = final position).
const FROSTED_EASING =
  'linear(0, 0.162 11.1%, 0.433 22.2%, 0.658 33.3%, 0.812 44.4%, 0.904 55.6%, 0.956 66.7%, 0.981 77.8%, 0.993 88.9%, 1)'

const MATTE_EASING = 'cubic-bezier(0.34, 1.56, 0.64, 1.0)'

function resolveGap(val: string): string {
  return GAP_MAP[val] ?? val
}

function injectStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STACK_STYLE_ID)) return
  const s = document.createElement('style')
  s.id = STACK_STYLE_ID
  s.textContent = stackStyles
  document.head.appendChild(s)
}

function springFlipChild(el: HTMLElement, dx: number, dy: number): void {
  const config = SPRING_PRESETS.smooth

  // Interrupt any running spring for this element: carry over velocity so motion is continuous.
  const existing = activeFlips.get(el)
  const initVx = existing ? existing.stateX.velocity : 0
  const initVy = existing ? existing.stateY.velocity : 0
  // Capture the consumer's real transform before we start animating (not a transient translate).
  const realTransform = existing ? existing.realTransform : el.style.transform
  if (existing) driver.deregister(existing.id)

  let stateX: SpringState = { value: dx, velocity: initVx }
  let stateY: SpringState = { value: dy, velocity: initVy }
  const threshX = Math.max(Math.abs(dx) * 0.001, 0.1)
  const threshY = Math.max(Math.abs(dy) * 0.001, 0.1)

  el.style.willChange = 'transform'
  el.style.transform = `translate(${dx}px, ${dy}px)`

  const id = Symbol()
  const flip: ActiveFlip = { id, stateX, stateY, realTransform }
  activeFlips.set(el, flip)

  const task: SpringTask = {
    advance(dt: number): boolean {
      stateX = stepSpring(config, stateX, 0, dt)
      stateY = stepSpring(config, stateY, 0, dt)
      flip.stateX = stateX
      flip.stateY = stateY
      const sx = Math.abs(stateX.value) < threshX && Math.abs(stateX.velocity) < threshX * 2
      const sy = Math.abs(stateY.value) < threshY && Math.abs(stateY.velocity) < threshY * 2
      if (sx && sy) {
        el.style.transform = realTransform
        el.style.willChange = ''
        activeFlips.delete(el)
        return true
      }
      el.style.transform = `translate(${sx ? 0 : stateX.value}px, ${sy ? 0 : stateY.value}px)`
      return false
    },
  }

  driver.register(id, task)
}

function cssFlipChild(el: HTMLElement, dx: number, dy: number, easing: string, duration: number): void {
  // Cancel any running CSS FLIP on this element before starting a new one.
  // This removes the old event listeners and prevents double-registration.
  activeCssFlipCleanup.get(el)?.()

  el.style.transition = 'none'
  el.style.transform = `translate(${dx}px, ${dy}px)`
  el.getBoundingClientRect()
  el.style.transition = `transform ${duration}ms ${easing}`
  el.style.transform = ''

  const cancel = (): void => {
    el.style.transition = ''
    activeCssFlipCleanup.delete(el)
    el.removeEventListener('transitionend', cancel)
    el.removeEventListener('transitioncancel', cancel)
  }
  activeCssFlipCleanup.set(el, cancel)
  el.addEventListener('transitionend', cancel, { once: true })
  el.addEventListener('transitioncancel', cancel, { once: true })
}

export class FluidStack extends HTMLElement {
  static get observedAttributes() {
    return ['direction', 'gap', 'align', 'justify', 'wrap', 'layout']
  }

  private _mutationObs: MutationObserver | null = null
  private _snapshots = new Map<Element, DOMRect>()

  connectedCallback(): void {
    injectStyles()
    this._syncStyles()
    if (this.hasAttribute('layout')) this._startObserver()
    document.addEventListener('fluidledger:tier-change', this._onTierChange)
    this.dispatchEvent(new CustomEvent('fluid:mounted', { bubbles: true, composed: true }))
  }

  disconnectedCallback(): void {
    this._stopObserver()
    document.removeEventListener('fluidledger:tier-change', this._onTierChange)
    this.dispatchEvent(new CustomEvent('fluid:unmounted', { bubbles: true, composed: true }))
  }

  attributeChangedCallback(name: string, _old: string | null, _next: string | null): void {
    if (!this.isConnected) return
    this._syncStyles()
    if (name === 'layout') {
      if (this.hasAttribute('layout')) this._startObserver()
      else this._stopObserver()
    }
  }

  private _syncStyles(): void {
    // flex-direction is driven by CSS attribute selectors in styles.ts ([direction="horizontal"])
    // RTL handled by :dir(rtl) and explicit [dir="rtl"] selectors — no inline style needed
    this.style.gap = resolveGap(this.getAttribute('gap') ?? 'md')
    this.style.alignItems = this.getAttribute('align') ?? 'stretch'
    this.style.justifyContent = this.getAttribute('justify') ?? 'start'
    this.style.flexWrap = this.hasAttribute('wrap') ? 'wrap' : 'nowrap'
  }

  private _startObserver(): void {
    if (this._mutationObs) return
    this._mutationObs = new MutationObserver(() => this._handleMutation())
    this._mutationObs.observe(this, { childList: true })
    // Two-path snapshot init — mirrors fluid-button's "initialize at mount" pattern:
    //
    // • Upgrade path  (element defined AFTER innerHTML parse): children are already in the
    //   DOM and CSS is fully applied when connectedCallback fires → snapshot immediately.
    //
    // • Mid-parse path (element defined BEFORE innerHTML runs): connectedCallback fires as
    //   the parser builds the subtree, so children aren't present yet → defer one rAF so
    //   the fragment <style> block and layout are both resolved before we read positions.
    if (this.children.length > 0) {
      this._takeSnapshot()
    } else {
      requestAnimationFrame(() => this._takeSnapshot())
    }
  }

  private _stopObserver(): void {
    this._mutationObs?.disconnect()
    this._mutationObs = null
    this._snapshots.clear()
  }

  private _takeSnapshot(): void {
    this._snapshots.clear()
    for (const child of this.children) {
      this._snapshots.set(child, child.getBoundingClientRect())
    }
  }

  // Arrow function so `this` is bound without an explicit bind() call.
  private _onTierChange = (): void => {
    // Cancel every in-flight animation for this element — they were started for
    // the previous tier and conflict with whatever the new tier expects.
    for (const child of this.children) {
      const el = child as HTMLElement
      // Spring (Crystalline / Optical)
      const inFlight = activeFlips.get(el)
      if (inFlight) {
        driver.deregister(inFlight.id)
        el.style.transform = inFlight.realTransform
        el.style.willChange = ''
        activeFlips.delete(el)
      }
      // CSS transition (Frosted / Matte) — forcibly settle to the final position.
      // Call cancel() explicitly rather than relying on transitioncancel, which
      // Safari does not fire reliably when transition is removed synchronously in JS.
      const cancelCss = activeCssFlipCleanup.get(el)
      if (cancelCss) {
        el.style.transition = 'none'
        el.getBoundingClientRect()
        el.style.transform = ''
        cancelCss()
      }
    }
    // Refresh snapshot so the next mutation has accurate pre-mutation positions.
    if (this._mutationObs) this._takeSnapshot()
  }

  private _handleMutation(): void {
    const children = [...this.children]

    if (children.length > 50) {
      if (DEV) {
        console.warn('[fluid warn] fluid-stack[layout] has >50 children — FLIP suppressed for performance.')
      }
      this._takeSnapshot()
      return
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this._takeSnapshot()
      return
    }

    const tier = ledger.tier

    for (const child of children) {
      const el = child as HTMLElement
      const last = child.getBoundingClientRect()

      let dx: number
      let dy: number
      const first = this._snapshots.get(child)
      const inFlight = activeFlips.get(el)

      if (first) {
        // Standard FLIP delta. getBoundingClientRect includes the current spring transform,
        // so this correctly captures the full visual displacement (layout shift + spring residual)
        // even for mid-spring elements. Preferred over inFlight residual alone.
        dx = first.left - last.left
        dy = first.top - last.top
      } else if (inFlight) {
        // No snapshot yet (rapid re-order within the 2-frame double-rAF window).
        // Use the live spring residual as a best approximation of the visual position.
        dx = inFlight.stateX.value
        dy = inFlight.stateY.value
      } else {
        continue
      }

      if (dx === 0 && dy === 0) continue

      if (tier === 'crystalline' || tier === 'optical') {
        springFlipChild(el, dx, dy)
      } else if (tier === 'frosted') {
        cssFlipChild(el, dx, dy, FROSTED_EASING, 450)
      } else {
        // matte: bezier CSS transition
        cssFlipChild(el, dx, dy, MATTE_EASING, 250)
      }
    }

    this._snapshots.clear()
    requestAnimationFrame(() => requestAnimationFrame(() => this._takeSnapshot()))
  }
}

if (!customElements.get('fluid-stack')) {
  customElements.define('fluid-stack', FluidStack)
}
