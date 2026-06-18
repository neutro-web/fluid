import { FluidElement } from '../../core/element'
import type { FluidMaterial } from '../../core/element'
import type { FluidLayer } from '../../core/z-index'
import type { SpringConfig } from '../../core/spring'
import { SPRING_PRESETS } from '../../core/spring'
import { FluidRipple } from '../../core/ripple'
import { motion } from '../../core/motion'
import { requestContext, provideContext } from '../../core/context'
import { generateFluidId } from '../../core/id'
import styles from './styles'

const DEV: boolean = typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'

// ─── Context key ───────────────────────────────────────────────────────────────

export const TABS_CONTEXT_KEY = 'fluid:tabs'

// ─── Context shape ─────────────────────────────────────────────────────────────

export interface TabsCtx {
  activeId: string
  orientation: 'horizontal' | 'vertical'
  activation: 'automatic' | 'manual'
  tabs: FluidTab[]
  panels: FluidTabPanel[]
  activate(tabId: string): void
  subscribe(fn: (ctx: TabsCtx) => void): () => void
  _notify(): void
}

// ─── Forward declarations (classes reference each other) ──────────────────────

// eslint-disable-next-line @typescript-eslint/no-use-before-define
export class FluidTabPanel extends FluidElement {
  protected readonly layer: FluidLayer = 'surface'
  protected readonly material: FluidMaterial = 'none' as FluidMaterial
  protected readonly spring: SpringConfig = SPRING_PRESETS.smooth

  static get observedAttributes(): string[] {
    return ['panel-id']
  }

  private _ctx: TabsCtx | null = null
  private _unsubCtx: (() => void) | null = null

  get panelId(): string {
    return this.getAttribute('panel-id') ?? ''
  }

  get active(): boolean {
    return !this.hasAttribute('hidden')
  }

  attributeChangedCallback(_name: string, _old: string | null, _next: string | null): void {
    this._syncId()
  }

  protected override onMount(): void {
    this.root.innerHTML = /* html */ `<slot></slot>`

    if (!this.getAttribute('panel-id')) {
      this.setAttribute('panel-id', generateFluidId('tabpanel', this))
    }

    this.internals.role = 'tabpanel'
    this.setAttribute('role', 'tabpanel')
    this.setAttribute('hidden', '')

    this._syncId()

    const unsubReq = requestContext<TabsCtx>(this, TABS_CONTEXT_KEY, (ctx) => {
      this._ctx = ctx
      ctx.panels.push(this)
      this._unsubCtx = ctx.subscribe((c) => this._onContextChange(c))
    })

    this.disposers.push(
      unsubReq,
      () => {
        this._unsubCtx?.()
        this._unsubCtx = null
        this._ctx = null
      }
    )
  }

  private _onContextChange(ctx: TabsCtx): void {
    const controllingTab = ctx.tabs.find(t => t.getAttribute('panel') === this.panelId)
    const isActive = controllingTab ? ctx.activeId === controllingTab.tabId : false
    if (isActive) {
      this.removeAttribute('hidden')
      this.setAttribute('tabindex', '0')
      if (controllingTab) {
        this.setAttribute('aria-labelledby', controllingTab.tabId)
      }
    } else {
      this.setAttribute('hidden', '')
      this.removeAttribute('tabindex')
    }
  }

  private _syncId(): void {
    const id = this.getAttribute('panel-id')
    if (id) this.id = id
  }
}

// ─── FluidTab ─────────────────────────────────────────────────────────────────

const tabTemplate = document.createElement('template')
tabTemplate.innerHTML = /* html */ `
<style>
:host {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  padding: 10px 16px;
  min-width: 48px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  border-radius: 4px 4px 0 0;
  flex-shrink: 0;
  white-space: nowrap;
  color: var(--fluid-color-text-secondary, rgba(255 255 255 / 0.6));
  font: inherit;
  font-size: 0.875rem;
  font-weight: 500;
}
:host([aria-selected="true"]) {
  color: var(--fluid-color-brand, #005FCC);
}
:host([disabled]) {
  pointer-events: none;
  opacity: 0.38;
  cursor: default;
}
:host(:focus-visible) {
  outline: 2px solid var(--fluid-focus-ring-color, var(--fluid-color-brand, #005FCC));
  outline-offset: -2px;
  border-radius: 4px;
}
[part="surface"] {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  position: relative;
  z-index: 1;
  pointer-events: none;
  transform-origin: center;
}
</style>
<span part="surface">
  <slot name="icon"></slot>
  <slot></slot>
</span>
`

export class FluidTab extends FluidElement {
  protected readonly layer: FluidLayer = 'raised'
  protected readonly material: FluidMaterial = 'none' as FluidMaterial
  protected readonly spring: SpringConfig = SPRING_PRESETS.snappy

  static get observedAttributes(): string[] {
    return ['tab-id', 'panel', 'disabled']
  }

  private _ctx: TabsCtx | null = null
  private _surface!: HTMLElement
  private _ripple: FluidRipple | null = null
  private _activePointerId: number | null = null
  private _pointerActivated = false

  get tabId(): string { return this.getAttribute('tab-id') ?? '' }
  get panel(): string { return this.getAttribute('panel') ?? '' }
  get disabled(): boolean { return this.hasAttribute('disabled') }
  get active(): boolean { return this.getAttribute('aria-selected') === 'true' }

  attributeChangedCallback(_name: string, _old: string | null, _next: string | null): void {
    if (this._surface) this._syncState()
  }

  protected override onMount(): void {
    this.root.appendChild(tabTemplate.content.cloneNode(true))
    this._surface = this.root.querySelector('[part="surface"]') as HTMLElement

    if (!this.getAttribute('tab-id')) {
      this.setAttribute('tab-id', generateFluidId('tab', this))
    }

    this.internals.role = 'tab'
    this.setAttribute('role', 'tab')
    this.setAttribute('aria-selected', 'false')
    this.setAttribute('tabindex', '-1')
    this._syncState()

    if (this.caps.tier !== 'matte' && !this.caps.deviceMemoryLow) {
      this._ripple = new FluidRipple(this.root)
    }

    const onTierChange = (): void => {
      const want = this.caps.tier !== 'matte' && !this.caps.deviceMemoryLow
      if (want && !this._ripple) {
        this._ripple = new FluidRipple(this.root)
      } else if (!want && this._ripple) {
        this._ripple.destroy()
        this._ripple = null
      }
    }
    document.addEventListener('fluidledger:tier-change', onTierChange)
    this.disposers.push(() => document.removeEventListener('fluidledger:tier-change', onTierChange))

    this.addEventListener('pointerdown', this._onPointerDown)
    this.addEventListener('pointerup', this._onPointerUp)
    this.addEventListener('pointercancel', this._onPointerCancel)
    this.addEventListener('keydown', this._onKeyDown)
    this.addEventListener('click', this._onClick)
    this.disposers.push(() => {
      this.removeEventListener('pointerdown', this._onPointerDown)
      this.removeEventListener('pointerup', this._onPointerUp)
      this.removeEventListener('pointercancel', this._onPointerCancel)
      this.removeEventListener('keydown', this._onKeyDown)
      this.removeEventListener('click', this._onClick)
    })

    const unsubReq = requestContext<TabsCtx>(this, TABS_CONTEXT_KEY, (ctx) => {
      this._ctx = ctx
      ctx.tabs.push(this)
      const unsub = ctx.subscribe((c) => this._onContextChange(c))
      this.disposers.push(unsub)
    })
    this.disposers.push(unsubReq, () => { this._ctx = null })
  }

  private _onContextChange(ctx: TabsCtx): void {
    const isActive = ctx.activeId === this.tabId
    this.setAttribute('aria-selected', isActive ? 'true' : 'false')
    this.setAttribute('tabindex', isActive && !this.disabled ? '0' : '-1')
  }

  private _syncState(): void {
    this.setAttribute('aria-disabled', this.disabled ? 'true' : 'false')
    const panelId = this.getAttribute('panel')
    if (panelId) this.setAttribute('aria-controls', panelId)
  }

  private _onPointerDown = (e: PointerEvent): void => {
    if (this.disabled || this._activePointerId !== null) return
    this._activePointerId = e.pointerId
    motion.animate(this._surface, motion.depress('secondary'))
    const rect = this.getBoundingClientRect()
    this._ripple?.trigger(e.clientX - rect.left, e.clientY - rect.top)
  }

  private _onPointerUp = (e: PointerEvent): void => {
    if (e.pointerId !== this._activePointerId) return
    this._activePointerId = null
    motion.animate(this._surface, motion.release('secondary'))
    if (!this.disabled) {
      this._pointerActivated = true
      this._activate()
    }
  }

  private _onClick = (): void => {
    // Pointer sequence (pointerdown→pointerup→click) already activated via _onPointerUp.
    // Only handle click when it originates from keyboard (.click() / Enter synthesised click)
    // or a direct programmatic .click() call — not from a real pointer interaction.
    if (this._pointerActivated) {
      this._pointerActivated = false
      return
    }
    if (!this.disabled) this._activate()
  }

  private _onPointerCancel = (e: PointerEvent): void => {
    if (e.pointerId !== this._activePointerId) return
    this._activePointerId = null
    motion.animate(this._surface, motion.release('secondary'))
  }

  private _onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (!this.disabled) {
        motion.animate(this._surface, motion.depress('secondary'))
        requestAnimationFrame(() => {
          motion.animate(this._surface, motion.release('secondary'))
          this._activate()
        })
      }
      return
    }
    this._handleArrowKey(e)
  }

  private _activate(): void {
    this.dispatchEvent(new CustomEvent('fluid:activate', {
      detail: { tabId: this.tabId },
      bubbles: true,
      composed: true,
    }))
    this._ctx?.activate(this.tabId)
  }

  private _handleArrowKey(e: KeyboardEvent): void {
    if (!this._ctx) return
    const { tabs, orientation, activation } = this._ctx
    const isH = orientation !== 'vertical'

    const fwdKey = isH ? 'ArrowRight' : 'ArrowDown'
    const bwdKey = isH ? 'ArrowLeft' : 'ArrowUp'

    if (e.key === 'Home') {
      e.preventDefault()
      const firstIdx = tabs.findIndex(t => !t.disabled)
      this._moveFocusTo(firstIdx, activation)
      return
    }
    if (e.key === 'End') {
      e.preventDefault()
      const lastIdx = tabs.length - 1 - [...tabs].reverse().findIndex(t => !t.disabled)
      this._moveFocusTo(lastIdx, activation)
      return
    }

    let dir: 1 | -1 | null = null
    if (e.key === fwdKey) dir = this._rtlDir === -1 ? -1 : 1
    else if (e.key === bwdKey) dir = this._rtlDir === -1 ? 1 : -1
    else return

    e.preventDefault()
    const idx = tabs.indexOf(this)
    const targetIdx = this._findNextEnabled(tabs, idx, dir)
    if (targetIdx !== -1) this._moveFocusTo(targetIdx, activation)
  }

  private get _rtlDir(): 1 | -1 {
    const val = getComputedStyle(this).getPropertyValue('--fluid-dir').trim()
    return val === '-1' ? -1 : 1
  }

  private _findNextEnabled(tabs: FluidTab[], from: number, dir: 1 | -1): number {
    let idx = from
    for (let i = 0; i < tabs.length; i++) {
      idx = (idx + dir + tabs.length) % tabs.length
      if (!tabs[idx]!.disabled) return idx
    }
    return -1
  }

  private _moveFocusTo(tabIdx: number, activation: string): void {
    const target = this._ctx!.tabs[tabIdx]
    if (!target) return
    target.focus()
    if (activation === 'automatic') {
      this._ctx!.activate(target.tabId)
    }
  }
}

// ─── FluidTabBar placeholder (replaced in Task 5) ────────────────────────────

export class FluidTabBar extends FluidElement {
  protected readonly layer: FluidLayer = 'raised'
  protected readonly material: FluidMaterial = 'regular'
  protected readonly spring: SpringConfig = SPRING_PRESETS.smooth

  static get observedAttributes(): string[] {
    return ['active-tab', 'orientation', 'activation']
  }

  private _ctx: TabsCtx | null = null

  get tabs(): readonly FluidTab[] { return this._ctx?.tabs ?? [] }

  get orientation(): 'horizontal' | 'vertical' {
    return this.getAttribute('orientation') === 'vertical' ? 'vertical' : 'horizontal'
  }

  get activation(): 'automatic' | 'manual' {
    return this.getAttribute('activation') === 'manual' ? 'manual' : 'automatic'
  }

  get activeTab(): string { return this.getAttribute('active-tab') ?? '' }

  attributeChangedCallback(_name: string, _old: string | null, _next: string | null): void {
    // handled in Task 5
  }

  protected override onMount(): void {
    this.root.innerHTML = /* html */ `
      <style>${styles}</style>
      <div part="tablist" role="tablist"></div>
      <div part="panels"><slot name="panel"></slot></div>
      <span part="indicator"></span>
    `

    const tablist = this.root.querySelector('[part="tablist"]') as HTMLElement
    tablist.innerHTML = /* html */ `<slot></slot>`

    this.internals.role = 'tablist'
    tablist.setAttribute('aria-orientation', this.orientation)

    if (DEV && !this.getAttribute('aria-label') && !this.getAttribute('aria-labelledby')) {
      console.warn('[fluid warn] fluid-tab-bar should have aria-label or aria-labelledby (unnamed tablist).')
    }

    const subscribers = new Set<(ctx: TabsCtx) => void>()
    const ctx: TabsCtx = {
      activeId: '',
      orientation: this.orientation,
      activation: this.activation,
      tabs: [],
      panels: [],
      activate: (_tabId: string) => { /* Task 5 */ },
      subscribe: (fn) => {
        subscribers.add(fn)
        fn(ctx)
        return () => subscribers.delete(fn)
      },
      _notify: () => { for (const fn of subscribers) fn(ctx) },
    }
    this._ctx = ctx

    this.disposers.push(provideContext(this, TABS_CONTEXT_KEY, ctx))

    // Two-path init: if children already present, init immediately; else defer one rAF
    if (this.children.length > 0) {
      this._initActive()
    } else {
      requestAnimationFrame(() => this._initActive())
    }
  }

  private _initActive(): void {
    const ctx = this._ctx
    if (!ctx) return
    if (DEV && ctx.tabs.length === 0) {
      console.warn('[fluid warn] fluid-tab-bar requires at least one fluid-tab in the default slot.')
    }
    const attrId = this.getAttribute('active-tab')
    const firstEnabled = ctx.tabs.find(t => !t.disabled)?.tabId ?? ''
    const initial = (attrId && ctx.tabs.some(t => t.tabId === attrId)) ? attrId : firstEnabled
    if (initial) {
      ctx.activeId = initial
      ctx._notify()
    }
  }
}

// ─── Register ─────────────────────────────────────────────────────────────────

FluidTabPanel.define('fluid-tab-panel')
FluidTab.define('fluid-tab')
FluidTabBar.define('fluid-tab-bar')
