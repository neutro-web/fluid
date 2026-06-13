import { FluidElement } from '../../core/element'
import type { FluidMaterial } from '../../core/element'
import { zIndex } from '../../core/z-index'
import type { FluidLayer } from '../../core/z-index'
import type { SpringConfig } from '../../core/spring'
import { SPRING_PRESETS } from '../../core/spring'
import { motion } from '../../core/motion'
import type { MotionDef } from '../../core/motion'
import { generateFluidId } from '../../core/id'
import cardStyles from './styles'

const DEV: boolean =
  typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'

const template = document.createElement('template')
template.innerHTML = /* html */ `
<style>${cardStyles}</style>
<div part="surface">
  <div part="media"><slot name="media"></slot></div>
  <div part="header-area"><slot name="header"></slot></div>
  <div part="body"><slot></slot></div>
  <div part="actions-bar"><slot name="actions"></slot></div>
  <div part="error-banner" role="alert" aria-live="polite" aria-atomic="true" hidden></div>
  <button part="trigger" type="button" aria-hidden="true" tabindex="-1"></button>
</div>
<span part="border"></span>
`

export class FluidCard extends FluidElement {
  protected readonly layer: FluidLayer = 'surface'
  protected readonly material: FluidMaterial = 'thin'
  protected readonly spring: SpringConfig = SPRING_PRESETS.gentle

  static get observedAttributes(): string[] {
    return [
      'interactive', 'layout', 'loading', 'error', 'error-message',
      'transition-name', 'elevation',
    ]
  }

  private _surface!: HTMLDivElement
  private _trigger!: HTMLButtonElement
  private _mediaWrapper!: HTMLDivElement
  private _headerWrapper!: HTMLDivElement
  private _actionsBar!: HTMLDivElement
  private _errorBanner!: HTMLDivElement
  private _loadingOverlay: HTMLDivElement | null = null
  private _activePointerId: number | null = null
  private _intersectionObserver: IntersectionObserver | null = null
  private _floatingZIndex: number | null = null

  // ── Reflected properties ────────────────────────────────────────────────────

  get interactive(): boolean { return this.hasAttribute('interactive') }
  get layout(): boolean { return this.hasAttribute('layout') }
  get loading(): boolean { return this.hasAttribute('loading') }
  get error(): boolean { return this.hasAttribute('error') }
  get errorMessage(): string { return this.getAttribute('error-message') ?? '' }
  get transitionName(): string { return this.getAttribute('transition-name') ?? '' }
  get elevation(): string { return this.getAttribute('elevation') ?? 'raised' }

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  attributeChangedCallback(
    name: string,
    _old: string | null,
    _next: string | null,
  ): void {
    if (!this._surface) return
    if (name === 'transition-name') {
      this._syncTransitionName()
    } else {
      this._syncState()
    }
  }

  protected override onMount(): void {
    this.root.appendChild(template.content.cloneNode(true))

    this._surface = this.root.querySelector('[part="surface"]') as HTMLDivElement
    this._trigger = this.root.querySelector('[part="trigger"]') as HTMLButtonElement
    this._mediaWrapper = this.root.querySelector('[part="media"]') as HTMLDivElement
    this._headerWrapper = this.root.querySelector('[part="header-area"]') as HTMLDivElement
    this._actionsBar = this.root.querySelector('[part="actions-bar"]') as HTMLDivElement
    this._errorBanner = this.root.querySelector('[part="error-banner"]') as HTMLDivElement

    this._setupSlotWatchers()
    this._syncGlassState()
    this._syncState()
    this._syncTransitionName()
    this._setupInteraction()
    this._setupEmerge()

    const onTierChange = (): void => {
      this._syncGlassState()
      this._syncTransitionName()
    }
    document.addEventListener('fluidledger:tier-change', onTierChange)
    this.disposers.push(() =>
      document.removeEventListener('fluidledger:tier-change', onTierChange)
    )

    this._setupNestedGlassWarning()
  }

  protected override onUnmount(): void {
    this._intersectionObserver?.disconnect()
    this._intersectionObserver = null
    if (this._floatingZIndex !== null) {
      zIndex.release('surface')
      this._floatingZIndex = null
    }
  }

  // ── Public: FLIP layout animation ───────────────────────────────────────────

  // FLIP is intentionally manual — auto-detecting which DOM mutations affect position
  // is not feasible without ResizeObserver heuristics that would fire spuriously.
  runFLIP(mutate: () => void): Promise<void> {
    if (!this.layout) return Promise.resolve()
    return motion.flip(this, mutate)
  }

  // ── Internal: glass state ────────────────────────────────────────────────────

  private _syncGlassState(): void {
    if (this.caps.backdropFilter) {
      this._surface.setAttribute('data-glass', '')
    } else {
      this._surface.removeAttribute('data-glass')
    }
  }

  // ── Internal: full state sync ────────────────────────────────────────────────

  private _syncState(): void {
    this._syncInteractive()
    this._syncLoading()
    this._syncError()
    this._syncElevation()
  }

  private _syncInteractive(): void {
    const interactive = this.interactive

    if (interactive) {
      this._trigger.removeAttribute('aria-hidden')
      this._trigger.setAttribute('tabindex', '0')
      // Link accessible name: prefer host aria-label, then heading in header slot
      this._linkTriggerLabel()
    } else {
      this._trigger.setAttribute('aria-hidden', 'true')
      this._trigger.setAttribute('tabindex', '-1')
      this._trigger.removeAttribute('aria-label')
      this._trigger.removeAttribute('aria-labelledby')
    }
  }

  private _linkTriggerLabel(): void {
    const hostLabel = this.getAttribute('aria-label')
    if (hostLabel) {
      this._trigger.setAttribute('aria-label', hostLabel)
      this._trigger.removeAttribute('aria-labelledby')
      return
    }

    const labelledBy = this.getAttribute('aria-labelledby')
    if (labelledBy) {
      this._trigger.setAttribute('aria-labelledby', labelledBy)
      this._trigger.removeAttribute('aria-label')
      return
    }

    const headerSlot = this.root.querySelector('slot[name="header"]') as HTMLSlotElement
    const headings = headerSlot
      .assignedElements({ flatten: true })
      .flatMap(el => {
        const direct = el.matches('h1,h2,h3,h4,h5,h6') ? [el] : []
        return [...direct, ...Array.from(el.querySelectorAll('h1,h2,h3,h4,h5,h6'))]
      }) as HTMLElement[]

    if (headings.length > 0) {
      const heading = headings[0]!
      if (!heading.id) {
        heading.id = generateFluidId('card-heading', this)
      }
      this._trigger.setAttribute('aria-labelledby', heading.id)
      this._trigger.removeAttribute('aria-label')
    } else if (DEV) {
      console.warn(
        '[fluid warn] fluid-card[interactive] has no accessible name. ' +
        'Add aria-label or a heading in the header slot.'
      )
    }
  }

  private _syncLoading(): void {
    if (this.loading) {
      if (this.interactive) {
        this._trigger.setAttribute('aria-busy', 'true')
        this.removeAttribute('aria-busy')
      } else {
        this.setAttribute('aria-busy', 'true')
      }
      this._ensureLoadingOverlay(true)
    } else {
      this.removeAttribute('aria-busy')
      this._trigger.removeAttribute('aria-busy')
      this._ensureLoadingOverlay(false)
    }
  }

  private _syncError(): void {
    if (this.error) {
      this._errorBanner.textContent = this.errorMessage
      this._errorBanner.removeAttribute('hidden')
      this._surface.setAttribute('data-error', '')
    } else {
      this._errorBanner.setAttribute('hidden', '')
      this._surface.removeAttribute('data-error')
    }
  }

  private _syncElevation(): void {
    const elevation = this.elevation
    this._surface.setAttribute('data-elevation', elevation)

    if (elevation === 'floating' && this._floatingZIndex === null) {
      this._floatingZIndex = zIndex.allocate('surface')
      this.style.zIndex = String(this._floatingZIndex)
    } else if (elevation !== 'floating' && this._floatingZIndex !== null) {
      zIndex.release('surface')
      this._floatingZIndex = null
      this.style.zIndex = ''
    }
  }

  private _syncTransitionName(): void {
    const name = this.transitionName
    // View Transition API is only meaningful at Crystalline+; lower tiers skip it.
    const tier = this.caps.tier
    const isCrystallinePlus = tier === 'crystalline' || tier === 'optical'
    ;(this.style as unknown as Record<string, string>)['viewTransitionName'] = isCrystallinePlus ? name : ''
  }

  // ── Internal: loading overlay ────────────────────────────────────────────────

  private _ensureLoadingOverlay(show: boolean): void {
    if (show && !this._loadingOverlay) {
      this._loadingOverlay = document.createElement('div')
      this._loadingOverlay.className = 'loading-overlay'
      this._loadingOverlay.setAttribute('aria-hidden', 'true')
      // TODO: swap for <fluid-skeleton> once the component lands (see fluid-alert-banner fallback pattern)
      this._surface.appendChild(this._loadingOverlay)
    } else if (!show && this._loadingOverlay) {
      this._loadingOverlay.remove()
      this._loadingOverlay = null
    }
  }

  // ── Internal: slot watchers ──────────────────────────────────────────────────

  private _setupSlotWatchers(): void {
    const watch = (slotEl: HTMLSlotElement, wrapper: HTMLElement): void => {
      const update = (): void => {
        wrapper.hidden = slotEl.assignedNodes({ flatten: true }).length === 0
      }
      update()
      slotEl.addEventListener('slotchange', update)
      this.disposers.push(() => slotEl.removeEventListener('slotchange', update))
    }

    const mediaSlot = this.root.querySelector('slot[name="media"]') as HTMLSlotElement
    const headerSlot = this.root.querySelector('slot[name="header"]') as HTMLSlotElement
    const actionsSlot = this.root.querySelector('slot[name="actions"]') as HTMLSlotElement

    watch(mediaSlot, this._mediaWrapper)
    watch(headerSlot, this._headerWrapper)
    watch(actionsSlot, this._actionsBar)

    // Re-link label when header slot content changes (heading ID may appear)
    headerSlot.addEventListener('slotchange', () => {
      if (this.interactive) this._linkTriggerLabel()
    })

    if (DEV) {
      const defaultSlot = this.root.querySelector('slot:not([name])') as HTMLSlotElement
      const warnNestedButtons = (): void => {
        if (!this.interactive) return
        const check = (slot: HTMLSlotElement): void => {
          for (const el of slot.assignedElements({ flatten: true })) {
            if (
              el.tagName === 'FLUID-BUTTON' ||
              el.matches('fluid-button') ||
              el.querySelector('fluid-button')
            ) {
              console.warn(
                '[fluid warn] fluid-card[interactive]: fluid-button detected in default/header slot. ' +
                'Move buttons to the actions slot to avoid nested interactive elements (invalid per ARIA 1.2).'
              )
              break
            }
          }
        }
        check(defaultSlot)
        check(headerSlot)
      }
      defaultSlot.addEventListener('slotchange', warnNestedButtons)
      headerSlot.addEventListener('slotchange', warnNestedButtons)
      this.disposers.push(
        () => defaultSlot.removeEventListener('slotchange', warnNestedButtons),
        () => headerSlot.removeEventListener('slotchange', warnNestedButtons),
      )
    }
  }

  // ── Internal: press motion (uses gentle spring per spec §Classification) ─────

  private _cardDepress(): MotionDef {
    return {
      id: 'depress',
      phases: [{ anims: [{ kind: 'scale', from: 1.0, to: 0.98, config: this.spring }] }],
      reducedPhases: [{ anims: [{ kind: 'opacity', from: 1.0, to: 0.7, config: this.spring }] }],
    }
  }

  private _cardRelease(): MotionDef {
    return {
      id: 'release',
      phases: [{ anims: [{ kind: 'scale', from: 0.98, to: 1.0, config: this.spring }] }],
      reducedPhases: [{ anims: [{ kind: 'opacity', from: 0.7, to: 1.0, config: this.spring }] }],
    }
  }

  // ── Internal: interaction ────────────────────────────────────────────────────

  private _setupInteraction(): void {
    this._trigger.addEventListener('pointerenter', this._onPointerEnter)
    this._trigger.addEventListener('pointerleave', this._onPointerLeave)
    this._trigger.addEventListener('pointerdown', this._onPointerDown)
    this._trigger.addEventListener('pointerup', this._onPointerUp)
    this._trigger.addEventListener('pointercancel', this._onPointerCancel)
    this._trigger.addEventListener('keydown', this._onKeyDown)
    this._trigger.addEventListener('keyup', this._onKeyUp)

    this.disposers.push(() => {
      this._trigger.removeEventListener('pointerenter', this._onPointerEnter)
      this._trigger.removeEventListener('pointerleave', this._onPointerLeave)
      this._trigger.removeEventListener('pointerdown', this._onPointerDown)
      this._trigger.removeEventListener('pointerup', this._onPointerUp)
      this._trigger.removeEventListener('pointercancel', this._onPointerCancel)
      this._trigger.removeEventListener('keydown', this._onKeyDown)
      this._trigger.removeEventListener('keyup', this._onKeyUp)
    })
  }

  private _onPointerEnter = (): void => {
    if (!this.interactive || this.loading) return
    motion.animate(this._surface, motion.elevate())
  }

  private _onPointerLeave = (): void => {
    if (!this.interactive) return
    motion.animate(this._surface, motion.flatten())
  }

  private _onPointerDown = (e: PointerEvent): void => {
    if (!this.interactive || this.loading) return
    if (this._activePointerId !== null) return
    this._activePointerId = e.pointerId
    try {
      this._trigger.setPointerCapture(e.pointerId)
    } catch {
      // Synthetic events in tests may not support pointer capture
    }
    motion.animate(this._surface, this._cardDepress())
  }

  private _onPointerUp = (e: PointerEvent): void => {
    if (e.pointerId !== this._activePointerId) return
    this._activePointerId = null
    motion.animate(this._surface, this._cardRelease())
    if (this.interactive && !this.loading) {
      const rect = this.getBoundingClientRect()
      const inBounds =
        e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top && e.clientY <= rect.bottom
      if (inBounds) {
        this._dispatchActivate('pointer')
      }
    }
  }

  private _onPointerCancel = (e: PointerEvent): void => {
    if (e.pointerId !== this._activePointerId) return
    this._activePointerId = null
    motion.animate(this._surface, this._cardRelease())
  }

  private _onKeyDown = (e: KeyboardEvent): void => {
    if (!this.interactive || this.loading) return
    if (e.repeat) return
    if (e.key === 'Enter') {
      e.preventDefault()
      motion.animate(this._surface, this._cardDepress())
      this._dispatchActivate('keyboard')
      setTimeout(() => {
        motion.animate(this._surface, this._cardRelease())
      }, 80)
    } else if (e.key === ' ') {
      e.preventDefault()
      motion.animate(this._surface, this._cardDepress())
    }
  }

  private _onKeyUp = (e: KeyboardEvent): void => {
    if (!this.interactive) return
    if (e.key === ' ') {
      motion.animate(this._surface, this._cardRelease())
      if (!this.loading) {
        this._dispatchActivate('keyboard')
      }
    }
  }

  private _dispatchActivate(
    source: 'pointer' | 'keyboard' | 'programmatic',
  ): void {
    this.dispatchEvent(new CustomEvent('fluid:activate', {
      bubbles: true,
      composed: true,
      detail: { source },
    }))
  }

  // ── Internal: emerge animation ───────────────────────────────────────────────

  private _setupEmerge(): void {
    if (this.caps.tier === 'matte') return

    if (this.caps.tier === 'crystalline' || this.caps.tier === 'optical') {
      if (typeof IntersectionObserver !== 'undefined') {
        this._intersectionObserver = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting) {
                motion.animate(this._surface, motion.emerge())
                this._intersectionObserver?.disconnect()
                this._intersectionObserver = null
                break
              }
            }
          },
          { threshold: 0.1 },
        )
        this._intersectionObserver.observe(this)
        this.disposers.push(() => {
          this._intersectionObserver?.disconnect()
          this._intersectionObserver = null
        })
      }
    } else {
      // Frosted: trigger emerge on first paint
      motion.animate(this._surface, motion.emerge())
    }
  }

  // ── Internal: nested glass warning ──────────────────────────────────────────

  private _setupNestedGlassWarning(): void {
    const LAYER_ORDER: Record<string, number> = {
      background: 0, surface: 1, raised: 2, overlay: 3, sheet: 4, system: 5,
    }

    const checkSlottedElements = (): void => {
      // Only check content slots — actions slot is the documented home for interactive
      // controls (fluid-button, etc.); nested glass there is expected and must not warn.
      const contentSlots = Array.from(
        this.root.querySelectorAll('slot:not([name="actions"])')
      ) as HTMLSlotElement[]

      for (const slot of contentSlots) {
        for (const el of slot.assignedElements({ flatten: true })) {
          const instance = el as unknown as Record<string, unknown>
          const layerVal = instance['layer']
          if (
            typeof layerVal === 'string' &&
            LAYER_ORDER[layerVal] !== undefined &&
            LAYER_ORDER[layerVal]! > 1
          ) {
            console.warn(
              `[fluid warn] fluid-card: glass component <${el.tagName.toLowerCase()}> ` +
              `(layer="${layerVal}") detected inside card. ` +
              `Nested glass layers above Surface can cause blur stacking artifacts. ` +
              `Consider reducing --fluid-blur-current on the nested component.`
            )
          }
        }
      }
    }

    // Watch content slots only (not actions — see checkSlottedElements above)
    const contentSlots = Array.from(
      this.root.querySelectorAll('slot:not([name="actions"])')
    ) as HTMLSlotElement[]

    for (const slot of contentSlots) {
      slot.addEventListener('slotchange', checkSlottedElements)
      this.disposers.push(() =>
        slot.removeEventListener('slotchange', checkSlottedElements)
      )
    }
  }
}

FluidCard.define('fluid-card')
