import { FluidElement } from '../../core/element'
import type { FluidMaterial } from '../../core/element'
import type { FluidLayer } from '../../core/z-index'
import type { SpringConfig } from '../../core/spring'
import { SPRING_PRESETS } from '../../core/spring'
import linkStyles from './styles'

const DEV: boolean =
  typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'

const template = document.createElement('template')
template.innerHTML = /* html */ `
<style>${linkStyles}</style>
<a part="anchor">
  <span part="icon"><slot name="icon"></slot></span>
  <span part="label"><slot></slot></span>
</a>
`

export class FluidLink extends FluidElement {
  protected readonly layer: FluidLayer = 'raised'
  // Spec: material = none, spring = none. FluidMaterial/SpringConfig have no 'none' variant,
  // so these are inert declarations to satisfy the abstract base. Neither is ever read by this component.
  protected readonly material: FluidMaterial = 'thin'
  protected readonly spring: SpringConfig = SPRING_PRESETS.gentle

  static get observedAttributes(): string[] {
    return ['href', 'target', 'current', 'disabled', 'aria-label']
  }

  private _anchor!: HTMLAnchorElement

  get href(): string | null {
    return this.getAttribute('href')
  }

  set href(value: string | null) {
    if (value == null) {
      this.removeAttribute('href')
    } else {
      this.setAttribute('href', value)
    }
  }

  get target(): string {
    return this.getAttribute('target') ?? ''
  }

  set target(value: string) {
    this.setAttribute('target', value)
  }

  get current(): boolean {
    return this.hasAttribute('current')
  }

  set current(value: boolean) {
    this.toggleAttribute('current', value)
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled')
  }

  set disabled(value: boolean) {
    this.toggleAttribute('disabled', value)
  }

  attributeChangedCallback(
    _name: string,
    _old: string | null,
    _next: string | null,
  ): void {
    if (this._anchor) this._syncState()
  }

  protected override onMount(): void {
    this.root.appendChild(template.content.cloneNode(true))
    this._anchor = this.root.querySelector('[part="anchor"]') as HTMLAnchorElement

    this._syncState()

    this._anchor.addEventListener('click', this._onClick)
    this._anchor.addEventListener('keydown', this._onKeyDown)

    this.disposers.push(() => {
      this._anchor.removeEventListener('click', this._onClick)
      this._anchor.removeEventListener('keydown', this._onKeyDown)
    })

    if (DEV) {
      const rafHandle = requestAnimationFrame(() => {
        this._validateSlotContent()
      })
      this.disposers.push(() => cancelAnimationFrame(rafHandle))
    }
  }

  private _syncState(): void {
    const href = this.href
    const target = this.getAttribute('target')
    const disabled = this.disabled
    const current = this.current

    // href — removed when disabled (non-navigable)
    if (href && !disabled) {
      this._anchor.setAttribute('href', href)
    } else {
      this._anchor.removeAttribute('href')
    }

    // No-href case: explicit role + tabindex for JS-nav accessibility
    if (!href) {
      this._anchor.setAttribute('role', 'link')
      this._anchor.setAttribute('tabindex', '0')
    } else {
      this._anchor.removeAttribute('role')
      this._anchor.removeAttribute('tabindex')
    }

    // disabled state
    if (disabled) {
      this._anchor.setAttribute('aria-disabled', 'true')
      this._anchor.setAttribute('tabindex', '-1')
    } else {
      this._anchor.removeAttribute('aria-disabled')
      // Restore tabindex for no-href case
      if (!href) {
        this._anchor.setAttribute('tabindex', '0')
      } else {
        this._anchor.removeAttribute('tabindex')
      }
    }

    // target + security
    if (target) {
      this._anchor.setAttribute('target', target)
      if (target === '_blank') {
        this._anchor.setAttribute('rel', 'noopener noreferrer')
      } else {
        this._anchor.removeAttribute('rel')
      }
    } else {
      this._anchor.removeAttribute('target')
      this._anchor.removeAttribute('rel')
    }

    // aria-current
    if (current) {
      this._anchor.setAttribute('aria-current', 'page')
    } else {
      this._anchor.removeAttribute('aria-current')
    }

    // Forward aria-label from host to inner anchor for icon-only accessibility
    const ariaLabel = this.getAttribute('aria-label')
    if (ariaLabel) {
      this._anchor.setAttribute('aria-label', ariaLabel)
    } else {
      this._anchor.removeAttribute('aria-label')
    }
  }

  private _onClick = (e: MouseEvent): void => {
    if (this.disabled) {
      e.preventDefault()
      return
    }
    this._dispatchActivate()
  }

  private _onKeyDown = (e: KeyboardEvent): void => {
    if (this.disabled) return
    // href links: browser synthesizes a click on Enter, so _onClick handles activation.
    // no-href links: no click synthesis, so we dispatch explicitly here.
    if (e.key === 'Enter' && !this.href) this._dispatchActivate()
  }

  private _dispatchActivate(): void {
    this.dispatchEvent(new CustomEvent('fluid:activate', {
      bubbles: true,
      composed: true,
      detail: { href: this.href },
    }))
  }

  private _validateSlotContent(): void {
    const defaultSlot = this.root.querySelector('slot:not([name])') as HTMLSlotElement | null
    const iconSlot = this.root.querySelector('slot[name="icon"]') as HTMLSlotElement | null

    const hasText = (defaultSlot?.assignedNodes({ flatten: true }) ?? [])
      .some(n => n.textContent?.trim())
    const hasIcon = (iconSlot?.assignedElements({ flatten: true }) ?? []).length > 0
    const hasAriaLabel = !!this.getAttribute('aria-label')?.trim()

    if (!hasText && !hasIcon) {
      console.warn('[fluid warn] fluid-link requires content in the default slot.')
      return
    }

    if (!hasText && hasIcon && !hasAriaLabel) {
      console.warn('[fluid warn] fluid-link has no text content; provide aria-label for an icon-only link.')
    }
  }
}

FluidLink.define('fluid-link')
