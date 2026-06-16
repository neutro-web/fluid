import { FluidElement } from '../../core/element'
import type { FluidMaterial } from '../../core/element'
import type { FluidLayer } from '../../core/z-index'
import type { SpringConfig } from '../../core/spring'
import { SPRING_PRESETS } from '../../core/spring'
import { motion } from '../../core/motion'
import spinnerStyles from './styles'

const DEV: boolean =
  typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'

const template = document.createElement('template')
template.innerHTML = /* html */ `
<style>${spinnerStyles}</style>
<div part="track" aria-live="polite">
  <div part="arc" aria-hidden="true"></div>
</div>
`

// spec: variant is 'glass' | 'brand' | 'neutral', default 'glass'
export type FluidSpinnerVariant = 'glass' | 'brand' | 'neutral'

export class FluidSpinner extends FluidElement {
  protected readonly layer: FluidLayer = 'surface'
  protected readonly material: FluidMaterial = 'thin'
  // spec: primary interaction spring is smooth (emerge on mount, recede on unmount)
  protected readonly spring: SpringConfig = SPRING_PRESETS.smooth

  static get observedAttributes(): string[] {
    // spec: label maps to aria-label; variant controls arc color style
    return ['size', 'label', 'variant']
  }

  // First-connect guard: null until first onMount(); persists across reconnects
  private _trackEl: HTMLElement | null = null
  private _arc: HTMLElement | null = null

  get size(): string {
    return this.getAttribute('size') ?? 'md'
  }

  attributeChangedCallback(
    name: string,
    _old: string | null,
    _next: string | null,
  ): void {
    if (name === 'size') {
      this._syncSize()
    } else if (name === 'label') {
      this._syncLabel()
    } else if (name === 'variant') {
      this._syncVariant()
    }
  }

  protected override onMount(): void {
    if (!this._trackEl) {
      // First connect: populate shadow DOM and cache refs
      this.root.appendChild(template.content.cloneNode(true))
      this._trackEl = this.root.querySelector('[part="track"]') as HTMLElement
      this._arc = this.root.querySelector('[part="arc"]') as HTMLElement
    } else {
      // Reconnect: clear leftover recede state so re-emerge starts from 0
      this._trackEl.style.opacity = ''
      this._trackEl.style.transform = ''
    }

    // ARIA — set role and default label on host
    this.setAttribute('role', 'status')
    // spec: not keyboard-focusable
    this.setAttribute('tabindex', '-1')

    // spec: dev warning fires if label is explicitly set to empty string
    // Check BEFORE applying the default so the warning can fire on empty label
    if (DEV) {
      const rafHandle = requestAnimationFrame(() => {
        const labelAttr = this.getAttribute('label')
        if (labelAttr !== null && labelAttr.trim() === '') {
          console.warn('[fluid warn] fluid-spinner: label attribute must not be empty.')
        }
      })
      this.disposers.push(() => cancelAnimationFrame(rafHandle))
    }

    this._syncLabel()
    this._syncSize()
    this._syncVariant()

    // spec: pause spin animation when document becomes hidden (performance)
    document.addEventListener('visibilitychange', this._onVisibilityChange)
    this.disposers.push(() => {
      document.removeEventListener('visibilitychange', this._onVisibilityChange)
    })

    // spec: emerge on mount (scale 0.92→1.0 + opacity 0→1 via smooth spring)
    this._emerge()
  }

  protected override onUnmount(): void {
    // spec: recede on unmount (scale 1.0→0.92 + opacity 1→0 via smooth spring)
    this._recede()
  }

  private _syncLabel(): void {
    const labelAttr = this.getAttribute('label')
    // spec: label defaults to 'Loading'; empty string triggers dev warning but still uses default
    const effective = (labelAttr !== null && labelAttr.trim() !== '') ? labelAttr : 'Loading'
    this.setAttribute('aria-label', effective)
  }

  private _syncSize(): void {
    const size = this.size
    this.setAttribute('data-size', size)
  }

  private _syncVariant(): void {
    // spec: variant defaults to 'glass'
    const v = this.getAttribute('variant') ?? 'glass'
    this.setAttribute('data-variant', v)
  }

  private _emerge(): void {
    if (this.caps.tier === 'matte') return
    motion.animate(this._trackEl!, motion.emerge())
  }

  private _recede(): void {
    if (this.caps.tier === 'matte') return
    motion.animate(this._trackEl!, motion.recede())
  }

  // spec: pause CSS spin animation when document is hidden; resume when visible
  private _onVisibilityChange = (): void => {
    if (this._arc) {
      this._arc.style.animationPlayState = document.hidden ? 'paused' : 'running'
    }
  }
}

FluidSpinner.define('fluid-spinner')
