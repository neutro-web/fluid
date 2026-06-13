// packages/fluid/src/components/spacer/index.ts
import { SPACER_STYLE_ID, spacerStyles } from './styles'

const SIZE_MAP: Record<string, string> = {
  xs: 'var(--fluid-space-1)',
  sm: 'var(--fluid-space-2)',
  md: 'var(--fluid-space-4)',
  lg: 'var(--fluid-space-6)',
  xl: 'var(--fluid-space-10)',
}

function resolveSize(val: string): string {
  return SIZE_MAP[val] ?? val
}

function injectStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(SPACER_STYLE_ID)) return
  const s = document.createElement('style')
  s.id = SPACER_STYLE_ID
  s.textContent = spacerStyles
  document.head.appendChild(s)
}

export class FluidSpacer extends HTMLElement {
  static get observedAttributes() {
    return ['size']
  }

  connectedCallback(): void {
    injectStyles()
    this._syncStyles()
    this.dispatchEvent(new CustomEvent('fluid:mounted', { bubbles: true, composed: true }))
  }

  disconnectedCallback(): void {
    this.dispatchEvent(new CustomEvent('fluid:unmounted', { bubbles: true, composed: true }))
  }

  attributeChangedCallback(_name: string, _old: string | null, _next: string | null): void {
    if (!this.isConnected) return
    this._syncStyles()
  }

  private _syncStyles(): void {
    const size = this.getAttribute('size')
    if (size !== null) {
      this.style.flex = `0 0 ${resolveSize(size)}`
    } else {
      this.style.flex = '1 1 auto'
    }
  }
}

if (!customElements.get('fluid-spacer')) {
  customElements.define('fluid-spacer', FluidSpacer)
}
