// Register fluid-card for shadow DOM use — do not import FluidCard class directly.
// Custom Elements resolve by tag name at runtime; this side-effect import
// ensures fluid-card is defined before the shadow template is cloned.
import '../card/index'

import { FluidElement } from '../../core/element'
import type { FluidMaterial } from '../../core/element'
import type { FluidLayer } from '../../core/z-index'
import type { SpringConfig } from '../../core/spring'
import { SPRING_PRESETS } from '../../core/spring'
import { motion } from '../../core/motion'
import emptyStateStyles from './styles'

const DEV: boolean =
  typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'

const template = document.createElement('template')
template.innerHTML = /* html */ `
<style>${emptyStateStyles}</style>
<fluid-card part="surface">
  <div part="content-column">
    <div part="illustration-wrapper" hidden>
      <slot name="illustration"></slot>
      <img part="illustration-img" alt="" aria-hidden="true">
    </div>
    <div part="text-block">
      <p part="headline" role="heading" aria-level="2"></p>
      <p part="description" hidden></p>
    </div>
    <div part="actions-wrapper" hidden>
      <slot name="actions"></slot>
    </div>
  </div>
</fluid-card>
`

export class FluidEmptyState extends FluidElement {
  protected readonly layer: FluidLayer = 'surface'
  protected readonly material: FluidMaterial = 'thin'
  protected readonly spring: SpringConfig = SPRING_PRESETS.gentle

  static get observedAttributes(): string[] {
    return ['headline', 'description', 'illustration']
  }

  private _surface: HTMLElement | null = null
  private _contentColumn!: HTMLDivElement
  private _illustrationWrapper!: HTMLDivElement
  private _illustrationImg!: HTMLImageElement
  private _headlineEl!: HTMLParagraphElement
  private _descriptionEl!: HTMLParagraphElement
  private _actionsWrapper!: HTMLDivElement

  // ── Reflected properties ────────────────────────────────────────────────────

  get headline(): string { return this.getAttribute('headline') ?? '' }
  set headline(v: string) { this.setAttribute('headline', v) }

  get description(): string { return this.getAttribute('description') ?? '' }
  set description(v: string) {
    if (v) this.setAttribute('description', v)
    else this.removeAttribute('description')
  }

  get illustration(): string { return this.getAttribute('illustration') ?? '' }
  set illustration(v: string) {
    if (v) this.setAttribute('illustration', v)
    else this.removeAttribute('illustration')
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  attributeChangedCallback(
    name: string,
    _old: string | null,
    _next: string | null,
  ): void {
    if (!this._surface) return
    if (name === 'headline') {
      this._syncHeadline()
    } else if (name === 'description') {
      this._syncDescription()
    } else if (name === 'illustration') {
      this._syncIllustration()
    }
  }

  protected override onMount(): void {
    // First-connect: clone template and cache shadow refs.
    // The shadow root persists across reconnects; the guard prevents duplicate content.
    if (!this._surface) {
      this.root.appendChild(template.content.cloneNode(true))

      this._surface = this.root.querySelector('[part="surface"]') as HTMLElement
      this._contentColumn = this.root.querySelector('[part="content-column"]') as HTMLDivElement
      this._illustrationWrapper = this.root.querySelector('[part="illustration-wrapper"]') as HTMLDivElement
      this._illustrationImg = this.root.querySelector('[part="illustration-img"]') as HTMLImageElement
      this._headlineEl = this.root.querySelector('[part="headline"]') as HTMLParagraphElement
      this._descriptionEl = this.root.querySelector('[part="description"]') as HTMLParagraphElement
      this._actionsWrapper = this.root.querySelector('[part="actions-wrapper"]') as HTMLDivElement

      // Hide broken-image glyph on load failure; keep wrapper if slotted content is present.
      this._illustrationImg.onerror = (): void => {
        this._illustrationImg.setAttribute('hidden', '')
        const slot = this.root.querySelector('slot[name="illustration"]') as HTMLSlotElement
        if (slot.assignedElements({ flatten: true }).length === 0) {
          this._illustrationWrapper.setAttribute('hidden', '')
        }
      }
    } else {
      // Reconnect: clear leftover opacity/transform from prior recede().
      this._surface.style.opacity = ''
      this._surface.style.transform = ''
    }

    // Every connect: sync content, re-register disposable listeners, and re-emerge.
    this._syncHeadline()
    this._syncDescription()
    this._syncIllustration()
    this._setupSlotWatchers()
    this._emerge()
  }

  protected override onUnmount(): void {
    // Best-effort: typically non-visible on synchronous disconnect.
    // Leftover opacity/transform is reset in onMount() on reconnect.
    if (this._surface && this.caps.tier !== 'matte') {
      motion.animate(this._surface, motion.recede())
    }
  }

  // ── Internal: sync ──────────────────────────────────────────────────────────

  private _syncHeadline(): void {
    const text = this.headline
    this._headlineEl.textContent = text
    if (DEV && !text) {
      console.warn(
        "[fluid warn] fluid-empty-state: 'headline' attribute is required."
      )
    }
  }

  private _syncDescription(): void {
    const text = this.description
    this._descriptionEl.textContent = text
    if (text) {
      this._descriptionEl.removeAttribute('hidden')
    } else {
      this._descriptionEl.setAttribute('hidden', '')
    }
  }

  private _syncIllustration(): void {
    const url = this.illustration
    // Only show the attribute image if the slot has no assigned content
    const illustrationSlot = this.root.querySelector('slot[name="illustration"]') as HTMLSlotElement | null
    const hasSlottedContent = illustrationSlot
      ? illustrationSlot.assignedElements({ flatten: true }).length > 0
      : false

    if (hasSlottedContent) {
      this._illustrationImg.setAttribute('hidden', '')
      this._illustrationWrapper.removeAttribute('hidden')
    } else if (url) {
      this._illustrationImg.src = url
      this._illustrationImg.removeAttribute('hidden')
      this._illustrationWrapper.removeAttribute('hidden')
    } else {
      this._illustrationImg.setAttribute('hidden', '')
      this._illustrationWrapper.setAttribute('hidden', '')
    }
  }

  // ── Internal: slot watchers ──────────────────────────────────────────────────

  private _setupSlotWatchers(): void {
    const illustrationSlot = this.root.querySelector('slot[name="illustration"]') as HTMLSlotElement
    const actionsSlot = this.root.querySelector('slot[name="actions"]') as HTMLSlotElement

    const onIllustrationChange = (): void => {
      this._syncIllustration()
    }

    const onActionsChange = (): void => {
      const hasContent = actionsSlot.assignedElements({ flatten: true }).length > 0
      if (hasContent) {
        this._actionsWrapper.removeAttribute('hidden')
      } else {
        this._actionsWrapper.setAttribute('hidden', '')
      }
    }

    illustrationSlot.addEventListener('slotchange', onIllustrationChange)
    actionsSlot.addEventListener('slotchange', onActionsChange)

    this.disposers.push(
      () => illustrationSlot.removeEventListener('slotchange', onIllustrationChange),
      () => actionsSlot.removeEventListener('slotchange', onActionsChange),
    )

    // Sync initial state
    onActionsChange()
  }

  // ── Internal: emerge / recede ────────────────────────────────────────────────

  private _emerge(): void {
    if (this.caps.tier === 'matte') return
    motion.animate(this._surface!, motion.emerge())
  }
}

FluidEmptyState.define('fluid-empty-state')
