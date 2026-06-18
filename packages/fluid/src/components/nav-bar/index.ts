import { FluidElement } from '../../core/element'
import type { FluidMaterial } from '../../core/element'
import type { FluidLayer } from '../../core/z-index'
import type { SpringConfig } from '../../core/spring'
import { SPRING_PRESETS, FluidError } from '../../core/spring'
import { motion } from '../../core/motion'
import type { ReactiveValue } from '../../core/motion'
import { i18n } from '../../core/i18n'
import navBarStyles from './styles'

const DEV: boolean =
  typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'

class NavShrinkProgress implements ReactiveValue {
  private _current: number
  private _subs = new Set<(v: number) => void>()

  constructor(initial: number) { this._current = initial }

  get current() { return this._current }

  _set(value: number): void {
    this._current = value
    this._subs.forEach(fn => fn(value))
  }

  subscribe(fn: (v: number) => void): () => void {
    this._subs.add(fn)
    fn(this._current)
    return () => this._subs.delete(fn)
  }

  dispose(): void { this._subs.clear() }
}

const template = document.createElement('template')
template.innerHTML = /* html */ `
<style>${navBarStyles}</style>
<a part="skip-link" href="#fluid-main-content">Skip to main content</a>
<div part="surface">
  <div part="leading"><slot name="leading"></slot></div>
  <div part="content"><slot></slot></div>
  <div part="trailing"><slot name="trailing"></slot></div>
</div>
`

export class FluidNavBar extends FluidElement {
  protected readonly layer: FluidLayer = 'raised'
  protected readonly material: FluidMaterial = 'regular'
  protected readonly spring: SpringConfig = SPRING_PRESETS.smooth

  static get observedAttributes(): string[] {
    return ['shrink-start', 'shrink-amount', 'shrink-mode', 'expand-on-scroll-up', 'skip-target', 'aria-label']
  }

  private _progressValue = new NavShrinkProgress(0)
  private _shrunk = false
  private _lastScrollTop = 0
  private _ariaLabelWarned = false
  private _fullHeight = 64
  _scrollDisposers: Array<() => void> = []
  private _preventAttrLoop = false
  private _prevShrinkAmount = 0.6
  private _prevShrinkMode: 'continuous' | 'stepped' = 'continuous'
  private _cachedShrinkStart: number = 48
  private _cachedShrinkMode: 'continuous' | 'stepped' = 'continuous'
  private _cachedExpandOnScrollUp: boolean = false

  get shrinkStart(): number {
    const v = parseFloat(this.getAttribute('shrink-start') ?? '48')
    return isNaN(v) ? 48 : v
  }
  set shrinkStart(value: number) { this.setAttribute('shrink-start', String(value)) }

  get shrinkAmount(): number {
    const v = parseFloat(this.getAttribute('shrink-amount') ?? '0.6')
    return isNaN(v) ? 0.6 : v
  }
  set shrinkAmount(value: number) { this.setAttribute('shrink-amount', String(value)) }

  get shrinkMode(): 'continuous' | 'stepped' {
    const v = this.getAttribute('shrink-mode')
    return v === 'stepped' ? 'stepped' : 'continuous'
  }
  set shrinkMode(value: 'continuous' | 'stepped') { this.setAttribute('shrink-mode', value) }

  get expandOnScrollUp(): boolean { return this.hasAttribute('expand-on-scroll-up') }
  set expandOnScrollUp(value: boolean) { this.toggleAttribute('expand-on-scroll-up', value) }

  get skipTarget(): string { return this.getAttribute('skip-target') ?? '#fluid-main-content' }
  set skipTarget(value: string) { this.setAttribute('skip-target', value) }

  get shrinkProgress(): ReactiveValue { return this._progressValue }

  attributeChangedCallback(
    name: string,
    _old: string | null,
    next: string | null,
  ): void {
    if (!this.root) return
    if (this._preventAttrLoop) return
    switch (name) {
      case 'shrink-amount': this._validateAndApplyShrinkAmount(next); break
      case 'shrink-mode': this._validateAndApplyShrinkMode(next); break
      case 'skip-target': this._syncSkipLink(); break
      case 'aria-label': this._validateAriaLabel(); break
      case 'shrink-start': this._updateScrollDrivenRange(); this._cachedShrinkStart = this.shrinkStart; break
      case 'expand-on-scroll-up': this._cachedExpandOnScrollUp = this.expandOnScrollUp; break
    }
  }

  protected override onMount(): void {
    this._validateAriaLabel()
    this.internals.role = 'navigation'

    this.root.appendChild(template.content.cloneNode(true))
    this._syncSkipLink()
    this._syncShrinkAmount()
    this._syncShrinkMode()
    this._cachedShrinkStart = this.shrinkStart
    this._cachedShrinkMode = this.shrinkMode
    this._cachedExpandOnScrollUp = this.expandOnScrollUp
    // Seed _prevShrinkAmount / _prevShrinkMode from whatever attribute was set
    // before onMount() ran (attributeChangedCallback returns early when root is absent).
    this._prevShrinkAmount = this.shrinkAmount
    this._prevShrinkMode = this.shrinkMode

    const measured = this.offsetHeight
    this._fullHeight = measured > 0 ? measured : 64
    this.style.setProperty('--fluid-nav-full-height', `${this._fullHeight}px`)

    this._initScrollMechanism()
    this._applyCurrentScroll()

    const onTierChange = (): void => {
      this._teardownScrollMechanism()
      this._initScrollMechanism()
      this._applyCurrentScroll()
    }
    document.addEventListener('fluidledger:tier-change', onTierChange)
    this.disposers.push(() => document.removeEventListener('fluidledger:tier-change', onTierChange))
  }

  protected override onUnmount(): void {
    this._teardownScrollMechanism()
    this._progressValue.dispose()
  }

  private _isCrystallinePlus(): boolean {
    return this.caps.tier === 'crystalline' || this.caps.tier === 'optical'
  }

  private _initScrollMechanism(): void {
    const crystalline = this._isCrystallinePlus()
    const scrollEl = (document.scrollingElement ?? document.documentElement) as HTMLElement

    if (crystalline) {
      this.setAttribute('data-scroll-driven', '')
      this._updateScrollDrivenRange()
    } else {
      this.removeAttribute('data-scroll-driven')
    }

    const onScroll = (): void => { this._handleScroll(scrollEl, crystalline) }
    scrollEl.addEventListener('scroll', onScroll, { passive: true } as AddEventListenerOptions)
    this._scrollDisposers.push(() => scrollEl.removeEventListener('scroll', onScroll))
  }

  private _teardownScrollMechanism(): void {
    this._scrollDisposers.forEach(d => d())
    this._scrollDisposers = []
    this.removeAttribute('data-scroll-driven')
    this.style.removeProperty('--fluid-nav-shrink-progress')
  }

  private _handleScroll(scrollEl: HTMLElement, crystallinePlus: boolean): void {
    const scrollTop = scrollEl.scrollTop
    const delta = scrollTop - this._lastScrollTop
    this._lastScrollTop = scrollTop

    const start = this._cachedShrinkStart
    // zone = shrink range; using shrinkStart px gives a natural 2× threshold feel
    const zone = start

    let progress: number
    if (this._cachedShrinkMode === 'stepped') {
      progress = scrollTop > start ? 1 : 0
    } else {
      progress = Math.max(0, Math.min(1, (scrollTop - start) / Math.max(1, zone)))
    }

    if (this._cachedExpandOnScrollUp && delta < 0 && this._shrunk) {
      progress = 0
    }

    this._setProgress(progress, crystallinePlus)
  }

  private _setProgress(progress: number, crystallinePlus: boolean): void {
    this._progressValue._set(progress)

    if (!crystallinePlus) {
      this.style.setProperty('--fluid-nav-shrink-progress', String(progress))
    }

    const nowShrunk = progress > 0
    if (nowShrunk !== this._shrunk) {
      this._shrunk = nowShrunk
      this.dispatchEvent(new CustomEvent('fluid:shrink-change', {
        detail: { shrunk: nowShrunk, progress },
        bubbles: true,
        composed: true,
      }))
      void motion.animate(this, nowShrunk ? motion.flatten() : motion.elevate())
    }
  }

  private _updateScrollDrivenRange(): void {
    if (!this._isCrystallinePlus()) return
    const start = this._cachedShrinkStart
    const stepped = this._cachedShrinkMode === 'stepped'
    // zone: 1px for stepped snap, shrinkStart px for smooth continuous transition
    const zone = stepped ? 1 : start
    this.style.setProperty('--fluid-nav-shrink-start-px', `${start}px`)
    this.style.setProperty('--fluid-nav-shrink-end-px', `${start + zone}px`)
  }

  private _applyCurrentScroll(): void {
    const scrollEl = (document.scrollingElement ?? document.documentElement) as HTMLElement
    this._lastScrollTop = scrollEl.scrollTop
    this._handleScroll(scrollEl, this._isCrystallinePlus())
  }

  private _validateAriaLabel(): void {
    const label = this.getAttribute('aria-label')
    if (!label || label.trim() === '') {
      if (DEV) {
        throw new FluidError('[fluid error] fluid-nav-bar requires aria-label.')
      }
      if (!this._ariaLabelWarned) {
        this._ariaLabelWarned = true
        console.warn('[fluid error] fluid-nav-bar requires aria-label.')
      }
    }
  }

  private _syncSkipLink(): void {
    const a = this.root?.querySelector('[part="skip-link"]') as HTMLAnchorElement | null
    if (!a) return
    a.href = this.skipTarget
    a.textContent = i18n.t('navbar.skipLink', 'Skip to main content')
  }

  private _syncShrinkAmount(): void {
    this.style.setProperty('--fluid-nav-shrink-amount', String(this.shrinkAmount))
  }

  private _syncShrinkMode(): void {
    const mode = this.getAttribute('shrink-mode') ?? 'continuous'
    this.setAttribute('data-shrink-mode', mode)
  }

  private _validateAndApplyShrinkAmount(next: string | null): void {
    const v = parseFloat(next ?? '')
    if (isNaN(v) || v < 0.1 || v > 1.0) {
      console.warn(`[fluid warn]  shrink-amount "${next}" out of range. Expected 0.1–1.0. Keeping previous value.`)
      this._preventAttrLoop = true
      this.setAttribute('shrink-amount', String(this._prevShrinkAmount))
      this._preventAttrLoop = false
      return
    }
    this._prevShrinkAmount = v
    this._syncShrinkAmount()
    this._updateScrollDrivenRange()
  }

  private _validateAndApplyShrinkMode(next: string | null): void {
    if (next !== 'continuous' && next !== 'stepped') {
      console.warn(`[fluid warn]  shrink-mode "${next}" invalid. Expected "continuous" or "stepped". Keeping previous value.`)
      this._preventAttrLoop = true
      this.setAttribute('shrink-mode', this._prevShrinkMode)
      this._preventAttrLoop = false
      return
    }
    this._prevShrinkMode = next
    this._cachedShrinkMode = next
    this._syncShrinkMode()
    this._updateScrollDrivenRange()
  }
}

FluidNavBar.define('fluid-nav-bar')
