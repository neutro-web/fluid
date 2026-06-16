import { FluidElement } from '../../core/element'
import type { FluidMaterial } from '../../core/element'
import type { FluidLayer } from '../../core/z-index'
import type { SpringConfig } from '../../core/spring'
import { SPRING_PRESETS } from '../../core/spring'
import { motion } from '../../core/motion'
import progressStyles from './styles'

const DEV: boolean =
  typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'

const template = document.createElement('template')
template.innerHTML = /* html */ `
<style>${progressStyles}</style>
<div part="linear-track">
  <div part="linear-fill"></div>
</div>
<svg part="circular-track" viewBox="0 0 36 36" fill="none" aria-hidden="true">
  <circle part="circular-bg" cx="18" cy="18" r="15.915" stroke-width="3"/>
  <circle part="circular-arc" cx="18" cy="18" r="15.915" stroke-width="3" stroke-linecap="round" stroke-dasharray="100" stroke-dashoffset="100"/>
</svg>
`

export class FluidProgress extends FluidElement {
  protected readonly layer: FluidLayer = 'surface'
  protected readonly material: FluidMaterial = 'thin'
  // spec: smooth spring drives fill advancement on value change
  protected readonly spring: SpringConfig = SPRING_PRESETS.smooth

  static get observedAttributes(): string[] {
    // spec: aria-valuetext is set directly on host by consumers — no JS handler needed, removed
    // spec: indeterminate is an explicit boolean presence attribute (not inferred from absent value)
    // spec: size controls physical dimensions (sm|md|lg)
    // spec: label sets aria-label on host
    return ['value', 'min', 'max', 'variant', 'indeterminate', 'size', 'label']
  }

  // First-connect guard: null until first onMount(); persists across reconnects
  private _linearTrack: HTMLElement | null = null
  private _fill: HTMLElement | null = null
  private _arc: SVGCircleElement | null = null
  // Track previous value to populate fluid:change detail
  private _prevValue: number | null = null

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  attributeChangedCallback(
    name: string,
    _old: string | null,
    _next: string | null,
  ): void {
    if (this._linearTrack === null) return
    if (name === 'label') {
      this._syncLabel()
    } else if (name === 'size') {
      this._syncSize()
    } else {
      this._syncState()
    }
  }

  protected override onMount(): void {
    if (!this._linearTrack) {
      // First connect: populate shadow DOM and cache refs
      this.root.appendChild(template.content.cloneNode(true))
      this._linearTrack = this.root.querySelector('[part="linear-track"]') as HTMLElement
      this._fill = this.root.querySelector('[part="linear-fill"]') as HTMLElement
      this._arc = this.root.querySelector('[part="circular-arc"]') as SVGCircleElement
    } else {
      // Reconnect: clear leftover emerge state so re-emerge starts from 0
      this._linearTrack.style.opacity = ''
      this._linearTrack.style.transform = ''
    }

    // ARIA role on host
    this.setAttribute('role', 'progressbar')

    // spec: dev warning if neither aria-label nor aria-labelledby is provided
    if (DEV) {
      const rafHandle = requestAnimationFrame(() => {
        if (!this.getAttribute('aria-label') && !this.getAttribute('aria-labelledby')) {
          console.warn(
            '[fluid warn] fluid-progress requires aria-label or aria-labelledby for accessibility.'
          )
        }
      })
      this.disposers.push(() => cancelAnimationFrame(rafHandle))
    }

    this._syncLabel()
    this._syncSize()
    this._syncState()

    // spec: emerge on mount (scale 0.92→1.0 + opacity 0→1 via smooth spring)
    this._emerge()
  }

  private _emerge(): void {
    if (this.caps.tier === 'matte') return
    motion.animate(this._linearTrack!, motion.emerge())
  }

  // ── Internal: state sync ─────────────────────────────────────────────────────

  private _syncLabel(): void {
    const label = this.getAttribute('label')
    if (label !== null) {
      this.setAttribute('aria-label', label)
    }
  }

  private _syncSize(): void {
    // spec: size defaults to 'md'
    const size = this.getAttribute('size') ?? 'md'
    this.setAttribute('data-size', size)
  }

  private _syncState(): void {
    // spec: value defaults to '0' (not null/indeterminate)
    const rawVal = this.getAttribute('value') ?? '0'
    const val = parseFloat(rawVal)
    const min = parseFloat(this.getAttribute('min') ?? '0')
    const max = parseFloat(this.getAttribute('max') ?? '100')
    const variant = this.getAttribute('variant') ?? 'linear'
    // spec: indeterminate is an explicit boolean presence attribute
    const isIndeterminate = this.hasAttribute('indeterminate')

    // ARIA attributes on host
    this.setAttribute('aria-valuemin', String(min))
    this.setAttribute('aria-valuemax', String(max))

    // data-variant drives CSS visibility of linear vs circular track
    this.setAttribute('data-variant', variant)

    if (isIndeterminate) {
      // spec: aria-valuenow is omitted when indeterminate is present
      this.removeAttribute('aria-valuenow')
      this.toggleAttribute('data-indeterminate', true)

      if (this._fill) {
        this._fill.style.removeProperty('--fluid-progress-fill')
      }
      // Partial arc: 75% dashoffset gives a 25% visible arc segment
      if (this._arc) {
        this._arc.setAttribute('stroke-dashoffset', '75')
      }
      return
    }

    // Determinate state
    this.toggleAttribute('data-indeterminate', false)

    // spec: dev warning when max <= min (division by zero / NaN guard)
    if (DEV && max <= min) {
      console.warn(
        `[fluid warn] fluid-progress: max (${max}) must be greater than min (${min}).`
      )
    }

    const pct = max <= min
      ? 0
      : Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100))

    this.setAttribute('aria-valuenow', String(val))

    // Linear fill
    if (this._fill) {
      this._fill.style.setProperty('--fluid-progress-fill', `${pct}%`)
    }

    // Circular arc: dashoffset = 100 - pct
    if (this._arc) {
      this._arc.setAttribute('stroke-dashoffset', String(100 - pct))
    }

    // spec: fluid:change fires when value changes and is valid
    const prev = this._prevValue
    this._prevValue = val
    if (prev !== null && prev !== val) {
      this.dispatchEvent(new CustomEvent('fluid:change', {
        bubbles: true,
        composed: true,
        detail: { value: val, previousValue: prev },
      }))
    } else if (prev === null) {
      // Initialize tracker on first render; do not fire on initial mount
      this._prevValue = val
    }
  }
}

FluidProgress.define('fluid-progress')
