// packages/fluid/src/components/stack/index.ts
import { ledger } from '../../core/ledger'
import { STACK_STYLE_ID, stackStyles } from './styles'

const DEV = typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'

const GAP_MAP: Record<string, string> = {
  xs: 'var(--fluid-space-1)',
  sm: 'var(--fluid-space-2)',
  md: 'var(--fluid-space-4)',
  lg: 'var(--fluid-space-6)',
  xl: 'var(--fluid-space-10)',
}

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
    this.dispatchEvent(new CustomEvent('fluid:mounted', { bubbles: true, composed: true }))
  }

  disconnectedCallback(): void {
    this._stopObserver()
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
    const dir = this.getAttribute('direction') ?? 'vertical'
    this.style.flexDirection = dir === 'horizontal' ? (this._isRTL() ? 'row-reverse' : 'row') : 'column'
    this.style.gap = resolveGap(this.getAttribute('gap') ?? 'md')
    this.style.alignItems = this.getAttribute('align') ?? 'stretch'
    this.style.justifyContent = this.getAttribute('justify') ?? 'start'
    this.style.flexWrap = this.hasAttribute('wrap') ? 'wrap' : 'nowrap'
  }

  private _isRTL(): boolean {
    return (
      this.dir === 'rtl' ||
      this.closest('[dir="rtl"]') !== null ||
      getComputedStyle(this).direction === 'rtl'
    )
  }

  private _startObserver(): void {
    if (this._mutationObs) return
    this._takeSnapshot()
    this._mutationObs = new MutationObserver(() => this._handleMutation())
    this._mutationObs.observe(this, { childList: true })
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
      const first = this._snapshots.get(child)
      if (!first) continue

      const last = child.getBoundingClientRect()
      const dx = first.left - last.left
      const dy = first.top - last.top
      if (dx === 0 && dy === 0) continue

      const el = child as HTMLElement

      if (tier === 'crystalline' || tier === 'optical') {
        el.animate(
          [
            { transform: `translate(${dx}px, ${dy}px)` },
            { transform: 'translate(0, 0)' },
          ],
          { duration: 450, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1.0)', fill: 'none' },
        )
      } else {
        const duration = tier === 'frosted' ? 350 : 250
        el.style.transition = 'none'
        el.style.transform = `translate(${dx}px, ${dy}px)`
        el.getBoundingClientRect()
        el.style.transition = `transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`
        el.style.transform = ''
        const cleanup = (): void => { el.style.transition = '' }
        el.addEventListener('transitionend', cleanup, { once: true })
        el.addEventListener('transitioncancel', cleanup, { once: true })
      }
    }

    this._snapshots.clear()
    requestAnimationFrame(() => requestAnimationFrame(() => this._takeSnapshot()))
  }
}

if (!customElements.get('fluid-stack')) {
  customElements.define('fluid-stack', FluidStack)
}
