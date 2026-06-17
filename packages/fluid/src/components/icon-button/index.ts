import { FluidElement } from '../../core/element'
import type { FluidMaterial } from '../../core/element'
import type { FluidLayer } from '../../core/z-index'
import type { SpringConfig } from '../../core/spring'
import { FluidError, SPRING_PRESETS } from '../../core/spring'
import { FluidRipple } from '../../core/ripple'
import { motion } from '../../core/motion'
import type { MotionDef } from '../../core/motion'
import { requestContext, DISABLED_CONTEXT_KEY } from '../../core/context'
import iconButtonStyles from './styles'

const DEV: boolean =
  typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'

// scale 0.94 — tighter deformation for a smaller circular target than fluid-button (0.96)
const _DEPRESS: MotionDef = {
  id: 'depress',
  phases: [{ anims: [{ kind: 'scale', from: 1.0, to: 0.94, config: SPRING_PRESETS.snappy }] }],
  reducedPhases: [{ anims: [{ kind: 'opacity', from: 1.0, to: 0.7, config: SPRING_PRESETS.snappy }] }],
}

const _RELEASE: MotionDef = {
  id: 'release',
  phases: [{ anims: [{ kind: 'scale', from: 0.94, to: 1.0, config: SPRING_PRESETS.bouncy }] }],
  reducedPhases: [{ anims: [{ kind: 'opacity', from: 0.7, to: 1.0, config: SPRING_PRESETS.bouncy }] }],
}

const template = document.createElement('template')
template.innerHTML = /* html */ `
<style>${iconButtonStyles}</style>
<button part="surface" type="button">
  <span part="icon"><slot></slot></span>
  <span part="overlay"></span>
  <span part="border"></span>
</button>
`

export class FluidIconButton extends FluidElement {
  protected readonly layer: FluidLayer = 'raised'
  protected readonly material: FluidMaterial = 'regular'
  protected readonly spring: SpringConfig = SPRING_PRESETS.snappy

  static get observedAttributes(): string[] {
    return ['variant', 'size', 'disabled', 'loading', 'aria-label']
  }

  private _surface!: HTMLButtonElement
  private _ripple: FluidRipple | null = null
  private _contextDisabled = false
  private _activePointerId: number | null = null
  private _loadingRing: SVGSVGElement | null = null
  private _ariaLabelWarned = false
  private _enterReleaseTimer: ReturnType<typeof setTimeout> | null = null

  get variant(): string {
    return this.getAttribute('variant') ?? 'secondary'
  }

  get size(): string {
    return this.getAttribute('size') ?? 'md'
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled')
  }

  get loading(): boolean {
    return this.hasAttribute('loading')
  }

  private get _isBlocked(): boolean {
    return this.disabled || this.loading || this._contextDisabled
  }

  attributeChangedCallback(
    name: string,
    _old: string | null,
    _next: string | null,
  ): void {
    if (!this._surface) return
    if (name === 'aria-label') {
      this._syncAriaLabel()
    } else {
      this._syncState()
    }
  }

  protected override onMount(): void {
    this._validateAriaLabel()

    this.root.appendChild(template.content.cloneNode(true))
    this._surface = this.root.querySelector('[part="surface"]') as HTMLButtonElement

    this._syncAriaLabel()
    this._syncState()

    if (this.caps.tier !== 'matte' && !this.caps.deviceMemoryLow) {
      this._ripple = new FluidRipple(this.root)
    }

    const onTierChange = (): void => {
      const want = this.caps.tier !== 'matte' && !this.caps.deviceMemoryLow
      if (want && !this._ripple) {
        this._ripple = new FluidRipple(this.root)
      } else if (!want && this._ripple) {
        this._ripple.destroy()
        this._ripple = null
      }
    }
    document.addEventListener('fluidledger:tier-change', onTierChange)
    this.disposers.push(() => document.removeEventListener('fluidledger:tier-change', onTierChange))

    this._surface.addEventListener('pointerdown', this._onPointerDown)
    this._surface.addEventListener('pointerup', this._onPointerUp)
    this._surface.addEventListener('pointercancel', this._onPointerCancel)
    this._surface.addEventListener('keydown', this._onKeyDown)
    this._surface.addEventListener('keyup', this._onKeyUp)

    this.disposers.push(requestContext<boolean>(this, DISABLED_CONTEXT_KEY, (value) => {
      this._contextDisabled = value
      this._syncState()
    }, true))

    this.disposers.push(() => {
      this._surface.removeEventListener('pointerdown', this._onPointerDown)
      this._surface.removeEventListener('pointerup', this._onPointerUp)
      this._surface.removeEventListener('pointercancel', this._onPointerCancel)
      this._surface.removeEventListener('keydown', this._onKeyDown)
      this._surface.removeEventListener('keyup', this._onKeyUp)
    })
    this.disposers.push(() => {
      this._ripple?.destroy()
      this._ripple = null
    })
    this.disposers.push(() => {
      if (this._enterReleaseTimer !== null) {
        clearTimeout(this._enterReleaseTimer)
        this._enterReleaseTimer = null
      }
    })

    if (DEV) {
      const rafHandle = requestAnimationFrame(() => {
        const slot = this.root.querySelector('slot:not([name])') as HTMLSlotElement | null
        if (slot && slot.assignedNodes({ flatten: true }).length === 0) {
          console.warn('[fluid warn] fluid-icon-button requires content in the default slot.')
        }
      })
      this.disposers.push(() => cancelAnimationFrame(rafHandle))
    }
  }

  private _validateAriaLabel(): void {
    const label = this.getAttribute('aria-label')
    if (!label || label.trim() === '') {
      if (DEV) {
        throw new FluidError('[fluid error] fluid-icon-button requires aria-label.')
      }
      if (!this._ariaLabelWarned) {
        this._ariaLabelWarned = true
        console.warn('[fluid warn] fluid-icon-button requires aria-label.')
      }
    }
  }

  private _syncAriaLabel(): void {
    const label = this.getAttribute('aria-label')
    if (label) {
      this._surface.setAttribute('aria-label', label)
    } else {
      this._surface.removeAttribute('aria-label')
    }
  }

  private _syncState(): void {
    const loading = this.loading
    const disabled = this.disabled || this._contextDisabled

    if (loading) {
      this._surface.setAttribute('aria-busy', 'true')
      this._surface.setAttribute('aria-disabled', 'true')
      this._ensureLoadingRing(true)
    } else {
      this._surface.removeAttribute('aria-busy')
      this._ensureLoadingRing(false)
      if (disabled) {
        this._surface.setAttribute('aria-disabled', 'true')
      } else {
        this._surface.removeAttribute('aria-disabled')
      }
    }
  }

  private _ensureLoadingRing(show: boolean): void {
    if (show && !this._loadingRing) {
      const NS = 'http://www.w3.org/2000/svg'
      const svg = document.createElementNS(NS, 'svg')
      svg.setAttribute('class', 'fluid-loading-ring')
      svg.setAttribute('viewBox', '0 0 48 48')
      svg.setAttribute('fill', 'none')
      svg.setAttribute('aria-hidden', 'true')
      const circle = document.createElementNS(NS, 'circle')
      circle.setAttribute('cx', '24')
      circle.setAttribute('cy', '24')
      circle.setAttribute('r', '22')
      circle.setAttribute('stroke', 'currentColor')
      circle.setAttribute('stroke-width', '2.5')
      circle.setAttribute('stroke-dasharray', '30 108')
      circle.setAttribute('stroke-linecap', 'round')
      svg.appendChild(circle)
      this._loadingRing = svg
      this.root.appendChild(svg)
    } else if (!show && this._loadingRing) {
      this._loadingRing.remove()
      this._loadingRing = null
    }
  }

  private _onPointerDown = (e: PointerEvent): void => {
    if (this._isBlocked) return
    if (this._activePointerId !== null) return
    this._activePointerId = e.pointerId

    try {
      this._surface.setPointerCapture(e.pointerId)
    } catch {
      // Synthetic events in tests may not support pointer capture
    }

    const rect = this.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    this._ripple?.trigger(x, y)

    motion.animate(this._surface, _DEPRESS)

    this.dispatchEvent(new CustomEvent('fluid:press', {
      bubbles: true,
      composed: true,
      detail: { x, y, pressure: e.pressure },
    }))
  }

  private _onPointerUp = (e: PointerEvent): void => {
    if (e.pointerId !== this._activePointerId) return
    this._activePointerId = null
    motion.animate(this._surface, _RELEASE)
    if (!this._isBlocked) {
      const rect = this.getBoundingClientRect()
      const inBounds =
        e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top && e.clientY <= rect.bottom
      if (inBounds) {
        this._dispatchActivate('pointer')
      }
    }
  }

  private _onPointerCancel = (e: PointerEvent): void => {
    if (e.pointerId !== this._activePointerId) return
    this._activePointerId = null
    motion.animate(this._surface, _RELEASE)
  }

  private _onKeyDown = (e: KeyboardEvent): void => {
    if (this._isBlocked) return
    if (e.repeat) return
    if (e.key === 'Enter') {
      e.preventDefault()
      motion.animate(this._surface, _DEPRESS)
      this._dispatchActivate('keyboard')
      this._enterReleaseTimer = setTimeout(() => {
        this._enterReleaseTimer = null
        motion.animate(this._surface, _RELEASE)
      }, 80)
    } else if (e.key === ' ') {
      e.preventDefault()
      motion.animate(this._surface, _DEPRESS)
    }
  }

  private _onKeyUp = (e: KeyboardEvent): void => {
    if (e.key === ' ') {
      motion.animate(this._surface, _RELEASE)
      if (!this._isBlocked) {
        this._dispatchActivate('keyboard')
      }
    }
  }

  private _dispatchActivate(source: 'pointer' | 'keyboard' | 'programmatic'): void {
    this.dispatchEvent(new CustomEvent('fluid:activate', {
      bubbles: true,
      composed: true,
      detail: { source },
    }))
  }
}

FluidIconButton.define('fluid-icon-button')
