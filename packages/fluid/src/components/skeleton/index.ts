import { FluidElement } from '../../core/element'
import type { FluidMaterial } from '../../core/element'
import type { FluidLayer } from '../../core/z-index'
import type { SpringConfig } from '../../core/spring'
import { SPRING_PRESETS } from '../../core/spring'
import { startSpring } from '../../core/driver'
import { motion } from '../../core/motion'
import skeletonStyles from './styles'

const template = document.createElement('template')
template.innerHTML = /* html */ `
<style>${skeletonStyles}</style>
<div part="surface" aria-hidden="true"></div>
<slot></slot>
`

// spec: variant enum is 'rectangular' | 'circular' | 'text'
export type FluidSkeletonVariant = 'rectangular' | 'circular' | 'text'

export class FluidSkeleton extends FluidElement {
  protected readonly layer: FluidLayer = 'surface'
  protected readonly material: FluidMaterial = 'thin'
  // spec: primary interaction spring is gentle (fade-out only)
  protected readonly spring: SpringConfig = SPRING_PRESETS.gentle

  static get observedAttributes(): string[] {
    // spec: animate (boolean presence, default true), lines (integer string, default '1')
    return ['width', 'height', 'variant', 'lines', 'animate']
  }

  // First-connect guard: null until first onMount(); persists across reconnects
  private _surfaceEl: HTMLElement | null = null
  private _slot: HTMLSlotElement | null = null
  // spec: animate default is true — shimmer starts enabled by default
  private _shimmerEnabled = true

  // ── Reflected properties ──────────────────────────────────────────────────────

  get variant(): FluidSkeletonVariant {
    const v = this.getAttribute('variant')
    if (v === 'circular' || v === 'text') return v
    return 'rectangular'
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  attributeChangedCallback(
    name: string,
    _old: string | null,
    next: string | null,
  ): void {
    if (!this._surfaceEl) return
    if (name === 'width' || name === 'height') {
      this._syncDimensions()
    } else if (name === 'variant') {
      this._syncVariant()
      this._syncDimensions()
      this._renderContent()
    } else if (name === 'lines') {
      this._renderContent()
    } else if (name === 'animate') {
      // spec: removing animate attribute stops shimmer; presence enables shimmer
      this._shimmerEnabled = next !== null
      this._syncShimmer()
    }
  }

  protected override onMount(): void {
    if (!this._surfaceEl) {
      // First connect: populate shadow DOM and cache refs
      this.root.appendChild(template.content.cloneNode(true))
      this._surfaceEl = this.root.querySelector('[part="surface"]') as HTMLElement
      this._slot = this.root.querySelector('slot') as HTMLSlotElement
    } else {
      // Reconnect: clear leftover emerge state so re-emerge starts from 0
      this._surfaceEl.style.opacity = ''
      this._surfaceEl.style.transform = ''
    }

    // ARIA: skeleton is purely decorative — set on every connect
    this.setAttribute('aria-hidden', 'true')
    this.setAttribute('tabindex', '-1')

    // Default slot: receiving slotted content triggers fade-out spring
    this._slot!.addEventListener('slotchange', this._onSlotChange)
    this.disposers.push(() => {
      this._slot?.removeEventListener('slotchange', this._onSlotChange)
    })

    // Tier-change: shimmer is Frosted+ only; re-gate when tier changes
    document.addEventListener('fluidledger:tier-change', this._onTierChange)
    this.disposers.push(() => {
      document.removeEventListener('fluidledger:tier-change', this._onTierChange)
    })

    this._syncDimensions()
    this._syncVariant()
    this._renderContent()

    // spec: animate defaults to true — set attribute so removeAttribute() is detectable
    // Without this, attributeChangedCallback would not fire when 'animate' was never set
    if (!this.hasAttribute('animate')) {
      this.setAttribute('animate', '')
    }
    this._syncShimmer()

    // spec: emerge on mount (scale 0.92→1.0 + opacity 0→1 via smooth spring)
    // spec: no recede — skeleton is replaced by content, not dismissed
    this._emerge()
  }

  // ── Internal ──────────────────────────────────────────────────────────────────

  private _syncDimensions(): void {
    const w = this.getAttribute('width')
    const h = this.getAttribute('height')
    // spec: default width '100%', default height '1em' for text, '40px' for others
    const variant = this.getAttribute('variant') ?? 'rectangular'
    this.style.width = w ?? '100%'
    this.style.height = h ?? (variant === 'text' ? '1em' : '40px')
  }

  private _syncVariant(): void {
    this.dataset['variant'] = this.variant
  }

  private _renderContent(): void {
    const surface = this._surfaceEl
    if (!surface) return

    const variant = this.getAttribute('variant') ?? 'rectangular'
    if (variant !== 'text') {
      surface.innerHTML = ''
      return
    }

    const lines = Math.max(1, parseInt(this.getAttribute('lines') ?? '1', 10))
    if (lines <= 1) {
      surface.innerHTML = ''
      return
    }

    // spec: lines > 1 → N skeleton bars in flex column with gap 0.3em; last bar 60% width
    surface.innerHTML = ''
    for (let i = 0; i < lines; i++) {
      const line = document.createElement('div')
      line.setAttribute('part', 'line')
      if (i === lines - 1) {
        line.style.width = '60%'
      }
      surface.appendChild(line)
    }
  }

  private _syncShimmer(): void {
    // spec: shimmer requires Frosted+ tier AND animate not explicitly removed
    const tierOk = this.caps.tier !== 'matte'
    this.toggleAttribute('data-shimmer', this._shimmerEnabled && tierOk)
  }

  private _emerge(): void {
    if (this.caps.tier === 'matte') return
    motion.animate(this._surfaceEl!, motion.emerge())
  }

  private _onSlotChange = (): void => {
    const slot = this._slot
    if (!slot) return
    const nodes = slot.assignedNodes({ flatten: true })
    if (nodes.length === 0) return
    // spec: fade-out uses startSpring on host opacity; removes self from DOM on settle
    // spec: Matte/Frosted tier should use CSS transition:opacity — using startSpring for all tiers
    startSpring(this, 'opacity', 0, SPRING_PRESETS.gentle).then(() => {
      this.remove()
    })
  }

  private _onTierChange = (): void => {
    this._syncShimmer()
  }
}

FluidSkeleton.define('fluid-skeleton')
