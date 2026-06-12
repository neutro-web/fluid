import { FluidElement } from '../../core/element'
import type { FluidMaterial } from '../../core/element'
import type { FluidLayer } from '../../core/z-index'
import { zIndex } from '../../core/z-index'
import type { SpringConfig } from '../../core/spring'
import { SPRING_PRESETS } from '../../core/spring'

const HOST_CSS = ':host { display: contents; }'

function snapshotTokens(el: Element): Record<string, string> {
  const result: Record<string, string> = {}
  const inlineStyle = (el as HTMLElement).style
  for (let i = 0; i < inlineStyle.length; i++) {
    const name = inlineStyle.item(i)
    if (name.startsWith('--fluid-')) {
      result[name] = inlineStyle.getPropertyValue(name).trim()
    }
  }
  const computed = getComputedStyle(el)
  for (let i = 0; i < computed.length; i++) {
    const name = computed.item(i)
    if (name.startsWith('--fluid-') && !(name in result)) {
      result[name] = computed.getPropertyValue(name).trim()
    }
  }
  return result
}

export class FluidPortal extends FluidElement {
  protected get layer(): FluidLayer {
    return (this.getAttribute('layer') as FluidLayer | null) ?? 'overlay'
  }

  protected readonly material: FluidMaterial = 'regular'
  protected readonly spring: SpringConfig = SPRING_PRESETS.snappy

  private portalRoot: HTMLElement | null = null
  private _allocatedLayer: FluidLayer | null = null

  static get observedAttributes(): string[] {
    return ['layer']
  }

  protected override onMount(): void {
    if (!this.root.querySelector('style')) {
      const styleEl = document.createElement('style')
      styleEl.textContent = HOST_CSS
      this.root.appendChild(styleEl)
    }

    const portalRoot = document.createElement('fluid-portal-root')
    this.portalRoot = portalRoot

    const themeEl = (this.closest('fluid-theme') ?? document.documentElement) as HTMLElement
    this._applyTokens(themeEl)

    const layer = this.layer
    this._allocatedLayer = layer
    const z = zIndex.allocate(layer)
    portalRoot.style.position = 'fixed'
    portalRoot.style.top = '0'
    portalRoot.style.left = '0'
    portalRoot.style.zIndex = String(z)

    document.body.appendChild(portalRoot)

    const moveChildren = (): void => {
      while (this.firstChild) {
        portalRoot.appendChild(this.firstChild)
      }
    }
    moveChildren()

    const childObserver = new MutationObserver(moveChildren)
    childObserver.observe(this, { childList: true })
    this.disposers.push(() => childObserver.disconnect())

    const resnapshot = (): void => this._applyTokens(themeEl)
    const themeObserver = new MutationObserver(resnapshot)
    themeObserver.observe(themeEl, {
      attributes: true,
      attributeFilter: ['style', 'class', 'brand-hue', 'font-family', 'data-theme'],
    })
    this.disposers.push(() => themeObserver.disconnect())

    themeEl.addEventListener('fluidtheme:change', resnapshot)
    this.disposers.push(() => themeEl.removeEventListener('fluidtheme:change', resnapshot))
  }

  protected override onUnmount(): void {
    if (this.portalRoot) {
      while (this.portalRoot.firstChild) {
        this.appendChild(this.portalRoot.firstChild)
      }
      this.portalRoot.remove()
      this.portalRoot = null
    }
    if (this._allocatedLayer) {
      zIndex.release(this._allocatedLayer)
      this._allocatedLayer = null
    }
  }

  private _applyTokens(themeEl: HTMLElement): void {
    if (!this.portalRoot) return
    const tokens = snapshotTokens(themeEl)
    for (const [k, v] of Object.entries(tokens)) {
      this.portalRoot.style.setProperty(k, v)
    }
  }
}

FluidPortal.define('fluid-portal')
