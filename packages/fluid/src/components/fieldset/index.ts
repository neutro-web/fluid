import { FluidElement } from '../../core/element'
import type { FluidMaterial } from '../../core/element'
import type { FluidLayer } from '../../core/z-index'
import type { SpringConfig } from '../../core/spring'
import { SPRING_PRESETS } from '../../core/spring'
import { motion } from '../../core/motion'
import { provideContext, DISABLED_CONTEXT_KEY } from '../../core/context'
import { generateFluidId } from '../../core/id'
import fieldsetStyles from './styles'

const DEV: boolean =
  typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'

const template = document.createElement('template')
template.innerHTML = /* html */ `
<style>${fieldsetStyles}</style>
<fieldset part="fieldset">
  <div part="header">
    <span part="legend">
      <span part="legend-text"></span>
      <slot name="legend"></slot>
    </span>
    <span part="header-actions"><slot name="header-actions"></slot></span>
  </div>
  <div part="body"><slot></slot></div>
</fieldset>
`

export class FluidFieldset extends FluidElement {
  protected readonly layer: FluidLayer = 'surface'
  protected readonly material: FluidMaterial = 'thin'
  protected readonly spring: SpringConfig = SPRING_PRESETS.gentle

  static get observedAttributes(): string[] {
    return ['disabled', 'legend']
  }

  private _fieldsetEl!: HTMLFieldSetElement
  private _header!: HTMLElement
  private _legendEl!: HTMLElement
  private _legendText!: HTMLElement
  private _contextDisposer: (() => void) | null = null

  get disabled(): boolean { return this.hasAttribute('disabled') }
  get legend(): string { return this.getAttribute('legend') ?? '' }
  get name(): string { return this.getAttribute('name') ?? '' }

  attributeChangedCallback(name: string, _old: string | null, _next: string | null): void {
    if (!this._fieldsetEl) return
    if (name === 'disabled') {
      this._syncDisabled()
    } else if (name === 'legend') {
      this._syncLegend()
    }
  }

  protected override onMount(): void {
    this.root.appendChild(template.content.cloneNode(true))

    this._fieldsetEl = this.root.querySelector('[part="fieldset"]') as HTMLFieldSetElement
    this._header = this.root.querySelector('[part="header"]') as HTMLElement
    this._legendEl = this.root.querySelector('[part="legend"]') as HTMLElement
    this._legendText = this.root.querySelector('[part="legend-text"]') as HTMLElement

    // Stable ARIA ID linking fieldset → legend
    const legendId = generateFluidId('legend', this)
    this._legendEl.id = legendId
    this._fieldsetEl.setAttribute('aria-labelledby', legendId)

    this._syncLegend()
    this._syncDisabled()
    this._syncGlassState()
    this._setupEmerge()
    this._setupSlotWatcher()

    const onTierChange = (): void => { this._syncGlassState() }
    document.addEventListener('fluidledger:tier-change', onTierChange)
    this.disposers.push(() =>
      document.removeEventListener('fluidledger:tier-change', onTierChange),
    )

    // Context listener is torn down on disconnect
    this.disposers.push(() => {
      this._contextDisposer?.()
      this._contextDisposer = null
    })

    if (DEV) {
      const rafHandle = requestAnimationFrame(() => {
        const legendSlot = this.root.querySelector('slot[name="legend"]') as HTMLSlotElement | null
        const hasSlotContent = (legendSlot?.assignedNodes({ flatten: true }).length ?? 0) > 0
        if (!this.getAttribute('legend') && !hasSlotContent) {
          console.warn(
            '[fluid warn] fluid-fieldset requires a legend attribute or legend slot for accessibility.',
          )
        }
      })
      this.disposers.push(() => cancelAnimationFrame(rafHandle))
    }
  }

  private _syncDisabled(): void {
    const disabled = this.disabled
    if (disabled) {
      this._fieldsetEl.setAttribute('aria-disabled', 'true')
    } else {
      this._fieldsetEl.removeAttribute('aria-disabled')
    }
    this._updateContext()
  }

  private _syncLegend(): void {
    this._legendText.textContent = this.getAttribute('legend') ?? ''
  }

  private _syncGlassState(): void {
    if (this.caps.tier !== 'matte') {
      this._header.setAttribute('data-glass', '')
    } else {
      this._header.removeAttribute('data-glass')
    }
  }

  private _updateContext(): void {
    this._contextDisposer?.()
    this._contextDisposer = provideContext(this, DISABLED_CONTEXT_KEY, this.disabled)
  }

  private _setupEmerge(): void {
    if (this.caps.tier === 'matte') return

    if (this.caps.tier === 'crystalline' || this.caps.tier === 'optical') {
      if (typeof IntersectionObserver !== 'undefined') {
        const obs = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting) {
                motion.animate(this._header, motion.emerge())
                obs.disconnect()
                break
              }
            }
          },
          { threshold: 0.1 },
        )
        obs.observe(this)
        this.disposers.push(() => obs.disconnect())
      }
    } else {
      // Frosted: trigger emerge on first paint
      motion.animate(this._header, motion.emerge())
    }
  }

  private _setupSlotWatcher(): void {
    const legendSlot = this.root.querySelector('slot[name="legend"]') as HTMLSlotElement | null
    if (!legendSlot) return

    const update = (): void => {
      const hasContent = legendSlot.assignedNodes({ flatten: true }).length > 0
      if (hasContent) {
        this._legendText.setAttribute('hidden', '')
      } else {
        this._legendText.removeAttribute('hidden')
      }
    }

    legendSlot.addEventListener('slotchange', update)
    this.disposers.push(() => legendSlot.removeEventListener('slotchange', update))
    update()
  }
}

FluidFieldset.define('fluid-fieldset')
