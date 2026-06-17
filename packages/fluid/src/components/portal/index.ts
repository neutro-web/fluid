import { FluidElement } from '../../core/element'
import type { FluidMaterial } from '../../core/element'
import type { FluidLayer } from '../../core/z-index'
import { zIndex } from '../../core/z-index'
import type { SpringConfig } from '../../core/spring'
import { SPRING_PRESETS } from '../../core/spring'
import { FluidTheme } from '../theme'

const HOST_CSS = ':host { display: contents; }'

export class FluidPortal extends FluidElement {
  protected get layer(): FluidLayer {
    return (this.getAttribute('layer') as FluidLayer | null) ?? 'overlay'
  }

  protected readonly material: FluidMaterial = 'regular'
  protected readonly spring: SpringConfig = SPRING_PRESETS.snappy

  private portalRoot: HTMLElement | null = null
  private _allocatedLayer: FluidLayer | null = null

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
    const style = this.portalRoot.style
    // Collect current --fluid-* props before overwriting (to detect removals)
    const before = new Set<string>()
    for (let i = 0; i < style.length; i++) {
      const name = style.item(i)
      if (name.startsWith('--fluid-')) before.add(name)
    }
    const tokens = FluidTheme.snapshotTokens(themeEl)
    for (const [k, v] of Object.entries(tokens)) {
      style.setProperty(k, v)
    }
    // Remove stale tokens that disappeared from the theme
    for (const name of before) {
      if (!(name in tokens)) style.removeProperty(name)
    }
  }
}

FluidPortal.define('fluid-portal')
