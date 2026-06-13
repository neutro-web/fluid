import { FluidElement } from '../../core/element'
import type { FluidMaterial } from '../../core/element'
import type { FluidLayer } from '../../core/z-index'
import type { SpringConfig } from '../../core/spring'
import { SPRING_PRESETS } from '../../core/spring'
import { FluidRipple } from '../../core/ripple'
import { motion } from '../../core/motion'
import { requestContext } from '../../core/context'
import buttonStyles from './styles'

const DEV: boolean =
  typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'

export const DISABLED_CONTEXT_KEY = 'fluid:disabled'

const template = document.createElement('template')
template.innerHTML = /* html */ `
<style>${buttonStyles}</style>
<button part="surface" type="button">
  <span part="icon"><slot name="icon"></slot></span>
  <span part="label"><slot></slot></span>
  <span part="trailing-icon"><slot name="trailing-icon"></slot></span>
  <span part="overlay"></span>
  <span part="border"></span>
</button>
`

export class FluidButton extends FluidElement {
  static readonly formAssociated = true

  protected readonly layer: FluidLayer = 'raised'
  protected readonly material: FluidMaterial = 'regular'
  protected readonly spring: SpringConfig = SPRING_PRESETS.snappy

  static get observedAttributes(): string[] {
    return ['variant', 'type', 'size', 'disabled', 'loading']
  }

  private _surface!: HTMLButtonElement
  private _ripple: FluidRipple | null = null
  private _contextDisabled = false
  private _activePointerId: number | null = null
  private _spinner: HTMLSpanElement | null = null
  private _loadingLabelCaptured = false

  get variant(): string {
    return this.getAttribute('variant') ?? 'secondary'
  }

  get type(): string {
    return this.getAttribute('type') ?? 'submit'
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

  private get _motionVariant(): 'primary' | 'secondary' {
    return this.variant === 'primary' ? 'primary' : 'secondary'
  }

  attributeChangedCallback(
    _name: string,
    _old: string | null,
    _next: string | null,
  ): void {
    if (this._surface) this._syncState()
  }

  protected override onMount(): void {
    this.root.appendChild(template.content.cloneNode(true))
    this._surface = this.root.querySelector('[part="surface"]') as HTMLButtonElement

    this._syncState()

    if (this.caps.tier !== 'matte' && !this.caps.deviceMemoryLow) {
      this._ripple = new FluidRipple(this.root)
    }

    // React to forceTier() calls (DEV only — Storybook / playground toolbar).
    // Crosses the matte ↔ frosted boundary by tearing down or creating the ripple.
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

    requestContext<boolean>(this, DISABLED_CONTEXT_KEY, (value) => {
      this._contextDisabled = value
      this._syncState()
    })

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

    if (DEV) {
      const rafHandle = requestAnimationFrame(() => {
        const slot = this.root.querySelector('slot:not([name])') as HTMLSlotElement | null
        if (slot && slot.assignedNodes({ flatten: true }).length === 0) {
          console.warn('[fluid warn] fluid-button requires content in the default slot.')
        }
      })
      this.disposers.push(() => cancelAnimationFrame(rafHandle))
    }
  }

  private _syncState(): void {
    const loading = this.loading
    const disabled = this.disabled || this._contextDisabled

    if (loading) {
      this._surface.setAttribute('aria-busy', 'true')
      this._surface.setAttribute('aria-disabled', 'true')
      // CSS hides the label/icon parts — preserve accessible name on the surface button
      this._captureLoadingLabel()
      this._ensureSpinner(true)
    } else {
      this._surface.removeAttribute('aria-busy')
      if (this._loadingLabelCaptured) {
        this._surface.removeAttribute('aria-label')
        this._loadingLabelCaptured = false
      }
      this._ensureSpinner(false)
      if (disabled) {
        this._surface.setAttribute('aria-disabled', 'true')
      } else {
        this._surface.removeAttribute('aria-disabled')
      }
    }
  }

  private _captureLoadingLabel(): void {
    if (this._loadingLabelCaptured) return
    // Use the host's explicit aria-label if present; otherwise pull from the default slot.
    // textContent on any node type (text or element) recursively collects all text,
    // so <fluid-button><span>Save</span></fluid-button> is handled correctly.
    const hostLabel = this.getAttribute('aria-label')
    if (hostLabel) {
      this._surface.setAttribute('aria-label', hostLabel)
    } else {
      const slot = this.root.querySelector('slot:not([name])') as HTMLSlotElement | null
      const text = slot
        ?.assignedNodes({ flatten: true })
        .map(n => (n.textContent ?? '').trim())
        .filter(Boolean)
        .join(' ')
        .trim() ?? ''
      if (text) this._surface.setAttribute('aria-label', text)
    }
    this._loadingLabelCaptured = true
  }

  private _ensureSpinner(show: boolean): void {
    if (show && !this._spinner) {
      this._spinner = document.createElement('span')
      this._spinner.className = 'fluid-spinner'
      this._spinner.setAttribute('aria-hidden', 'true')
      this._surface.insertBefore(this._spinner, this._surface.firstChild)
    } else if (!show && this._spinner) {
      this._spinner.remove()
      this._spinner = null
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

    motion.animate(this._surface, motion.depress(this._motionVariant))

    this.dispatchEvent(new CustomEvent('fluid:press', {
      bubbles: true,
      composed: true,
      detail: { x, y, pressure: e.pressure },
    }))
  }

  private _onPointerUp = (e: PointerEvent): void => {
    if (e.pointerId !== this._activePointerId) return
    this._activePointerId = null
    motion.animate(this._surface, motion.release(this._motionVariant))
    if (!this._isBlocked) {
      const rect = this.getBoundingClientRect()
      const inBounds =
        e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top && e.clientY <= rect.bottom
      if (inBounds) {
        this._dispatchActivate('pointer')
        this._handleFormAction()
      }
    }
  }

  private _onPointerCancel = (e: PointerEvent): void => {
    if (e.pointerId !== this._activePointerId) return
    this._activePointerId = null
    motion.animate(this._surface, motion.release(this._motionVariant))
  }

  private _onKeyDown = (e: KeyboardEvent): void => {
    if (this._isBlocked) return
    if (e.repeat) return
    if (e.key === 'Enter') {
      e.preventDefault()
      motion.animate(this._surface, motion.depress(this._motionVariant))
      this._dispatchActivate('keyboard')
      this._handleFormAction()
      setTimeout(() => {
        motion.animate(this._surface, motion.release(this._motionVariant))
      }, 80)
    } else if (e.key === ' ') {
      e.preventDefault()
      motion.animate(this._surface, motion.depress(this._motionVariant))
    }
  }

  private _onKeyUp = (e: KeyboardEvent): void => {
    if (e.key === ' ') {
      motion.animate(this._surface, motion.release(this._motionVariant))
      if (!this._isBlocked) {
        this._dispatchActivate('keyboard')
        this._handleFormAction()
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

  private _handleFormAction(): void {
    const form = this.internals.form
    if (!form) return
    if (this.type === 'submit') {
      form.requestSubmit(null)
    } else if (this.type === 'reset') {
      form.reset()
    }
  }
}

FluidButton.define('fluid-button')
