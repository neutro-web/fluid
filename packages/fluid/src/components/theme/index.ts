import { FluidElement } from '../../core/element'
import type { FluidMaterial } from '../../core/element'
import type { FluidLayer } from '../../core/z-index'
import type { SpringConfig } from '../../core/spring'
import { SPRING_PRESETS } from '../../core/spring'
import themeStyles from './styles'

const DEV: boolean =
  typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'

const template = document.createElement('template')
template.innerHTML = `<style>${themeStyles}</style><slot></slot>`

export class FluidTheme extends FluidElement {
  protected readonly layer: FluidLayer = 'surface'
  protected readonly material: FluidMaterial = 'regular'
  protected readonly spring: SpringConfig = SPRING_PRESETS.snappy

  private _prevBrandHue: string | null = null
  private _mounted = false
  private _suppressStyleObserver = false
  private _samplingTimer: ReturnType<typeof setTimeout> | null = null
  private _rafId: number | null = null

  private _onTierChange = (): void => {
    this._stopSampling()
    this._startSampling()
  }

  static get observedAttributes(): string[] {
    return ['brand-hue', 'font-family', 'sampling', 'data-theme']
  }

  protected override onMount(): void {
    if (!this.root.querySelector('style')) {
      this.root.appendChild(template.content.cloneNode(true))
    }
    this._mounted = true

    // Watch own style attribute → dispatch fluidtheme:change for external setProperty() calls.
    // _suppressStyleObserver prevents double-dispatch when we set tokens internally.
    const selfObserver = new MutationObserver(() => {
      if (!this._suppressStyleObserver) {
        this._dispatchChange()
      }
    })
    selfObserver.observe(this, { attributes: true, attributeFilter: ['style'] })
    this.disposers.push(() => selfObserver.disconnect())

    this._syncAllAttributes()

    document.addEventListener('fluidledger:tier-change', this._onTierChange)
    this.disposers.push(() => {
      document.removeEventListener('fluidledger:tier-change', this._onTierChange)
    })
    this.disposers.push(() => this._stopSampling())
    this._startSampling()
  }

  protected override onUnmount(): void {
    this._mounted = false
  }

  attributeChangedCallback(
    name: string,
    old: string | null,
    next: string | null,
  ): void {
    if (old === next) return
    if (name === 'brand-hue') this._handleBrandHue(next)
    else if (name === 'font-family') this._handleFontFamily(next)
    else if (name === 'sampling') {
      if (this._mounted) { this._stopSampling(); this._startSampling() }
    } else if (name === 'data-theme') {
      this._handleDataTheme(next)
    }
    if (this._mounted) this._dispatchChange()
  }

  private _syncAllAttributes(): void {
    const hue = this.getAttribute('brand-hue')
    if (hue !== null) this._handleBrandHue(hue)
    const font = this.getAttribute('font-family')
    if (font !== null) this._handleFontFamily(font)
    const dataTheme = this.getAttribute('data-theme')
    if (dataTheme !== null) this._handleDataTheme(dataTheme)
  }

  private _handleBrandHue(value: string | null): void {
    if (value === null) {
      this._suppressStyleObserver = true
      this.style.removeProperty('--fluid-hue-brand')
      this._suppressStyleObserver = false
      this._prevBrandHue = null
      return
    }
    const n = parseFloat(value)
    if (isNaN(n) || n < 0 || n > 360) {
      if (DEV) {
        console.warn(
          `[fluid warn] brand-hue "${value}" invalid. Expected 0–360. Keeping previous value.`
        )
      }
      if (this._prevBrandHue !== null) {
        this._suppressStyleObserver = true
        this.style.setProperty('--fluid-hue-brand', this._prevBrandHue)
        this._suppressStyleObserver = false
      }
      return
    }
    this._prevBrandHue = String(n)
    this._suppressStyleObserver = true
    this.style.setProperty('--fluid-hue-brand', this._prevBrandHue)
    this._suppressStyleObserver = false
  }

  private _handleFontFamily(value: string | null): void {
    this._suppressStyleObserver = true
    if (value === null) this.style.removeProperty('--fluid-font-family')
    else this.style.setProperty('--fluid-font-family', value)
    this._suppressStyleObserver = false
  }

  private _handleDataTheme(value: string | null): void {
    if (value === null || value === 'system') {
      delete document.documentElement.dataset.theme
    } else if (value === 'dark' || value === 'light') {
      document.documentElement.dataset.theme = value
    }
  }

  private _dispatchChange(): void {
    this.dispatchEvent(new CustomEvent('fluidtheme:change', { bubbles: true }))
  }

  private _startSampling(): void {
    const mode = this.getAttribute('sampling') ?? 'debounced'
    const tier = this.caps.tier
    if (tier !== 'crystalline' && tier !== 'optical') return

    if (mode === 'mount-only') {
      this._sampleBackground()
    } else if (mode === 'live') {
      const loop = (): void => {
        this._sampleBackground()
        this._rafId = requestAnimationFrame(loop)
      }
      this._rafId = requestAnimationFrame(loop)
    } else {
      // debounced (default 100ms)
      this._scheduleSample()
    }
  }

  private _stopSampling(): void {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId)
      this._rafId = null
    }
    if (this._samplingTimer !== null) {
      clearTimeout(this._samplingTimer)
      this._samplingTimer = null
    }
  }

  private _scheduleSample(): void {
    if (this._samplingTimer !== null) clearTimeout(this._samplingTimer)
    this._samplingTimer = setTimeout(() => {
      this._samplingTimer = null
      this._sampleBackground()
    }, 100)
  }

  private _sampleBackground(): void {
    try {
      const bg = getComputedStyle(this).backgroundColor
      const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
      if (!match) return

      const r = parseInt(match[1], 10) / 255
      const g = parseInt(match[2], 10) / 255
      const b = parseInt(match[3], 10) / 255

      // WCAG relative luminance
      const lin = (c: number): number =>
        c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
      const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)

      // Approximate hue from RGB
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      let hue = 0
      if (max !== min) {
        const d = max - min
        let h: number
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        else if (max === g) h = ((b - r) / d + 2) / 6
        else h = ((r - g) / d + 4) / 6
        hue = Math.round(h * 360)
      }

      this._suppressStyleObserver = true
      this.style.setProperty('--fluid-env-luminance', luminance.toFixed(4))
      this.style.setProperty('--fluid-env-hue', String(hue))
      this._correctContrast(luminance)
      this._suppressStyleObserver = false
    } catch {
      // Silent — prefers-color-scheme fallback (no-op)
    }
  }

  private _correctContrast(bgLuminance: number): void {
    const tintLuminance = 0.9
    const raw = getComputedStyle(this).getPropertyValue('--fluid-tint-alpha').trim()
    let alpha = parseFloat(raw || '0.15')
    if (isNaN(alpha)) alpha = 0.15

    for (let i = 0; i < 20; i++) {
      const surfaceL = alpha * tintLuminance + (1 - alpha) * bgLuminance
      const lighter = Math.max(surfaceL, 0)
      const contrast = (lighter + 0.05) / 0.05
      if (contrast >= 4.5) break
      alpha = Math.min(alpha + 0.05, 1)
    }

    this.style.setProperty('--fluid-tint-alpha', alpha.toFixed(2))
  }

  static snapshotTokens(el: HTMLElement): Record<string, string> {
    const result: Record<string, string> = {}
    const inline = el.style
    for (let i = 0; i < inline.length; i++) {
      const name = inline.item(i)
      if (name.startsWith('--fluid-')) {
        result[name] = inline.getPropertyValue(name).trim()
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

  static setGlobalMode(mode: 'dark' | 'light' | 'system'): void {
    if (mode === 'system') {
      delete document.documentElement.dataset.theme
    } else {
      document.documentElement.dataset.theme = mode
    }
  }
}

FluidTheme.define('fluid-theme')
