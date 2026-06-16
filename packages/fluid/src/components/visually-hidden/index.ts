import { VH_STYLE_ID, visuallyHiddenStyles } from './styles'

function injectStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(VH_STYLE_ID)) return
  const s = document.createElement('style')
  s.id = VH_STYLE_ID
  s.textContent = visuallyHiddenStyles
  document.head.appendChild(s)
}

export class FluidVisuallyHidden extends HTMLElement {
  connectedCallback(): void {
    injectStyles()
    this.dispatchEvent(new CustomEvent('fluid:mounted', { bubbles: true, composed: true }))
  }

  disconnectedCallback(): void {
    this.dispatchEvent(new CustomEvent('fluid:unmounted', { bubbles: true, composed: true }))
  }
}

if (!customElements.get('fluid-visually-hidden')) {
  customElements.define('fluid-visually-hidden', FluidVisuallyHidden)
}
