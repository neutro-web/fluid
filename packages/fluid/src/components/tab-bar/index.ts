import { FluidElement } from '../../core/element'
import type { FluidMaterial } from '../../core/element'
import type { FluidLayer } from '../../core/z-index'
import type { SpringConfig } from '../../core/spring'
import { SPRING_PRESETS } from '../../core/spring'
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

// ─── FluidTab placeholder (replaced in Task 4) ────────────────────────────────

export class FluidTab extends FluidElement {
  protected readonly layer: FluidLayer = 'raised'
  protected readonly material: FluidMaterial = 'none' as FluidMaterial
  protected readonly spring: SpringConfig = SPRING_PRESETS.snappy

  static get observedAttributes(): string[] {
    return ['tab-id', 'panel', 'disabled']
  }

  get tabId(): string { return this.getAttribute('tab-id') ?? '' }
  get panel(): string { return this.getAttribute('panel') ?? '' }
  get disabled(): boolean { return this.hasAttribute('disabled') }
  get active(): boolean { return this.getAttribute('aria-selected') === 'true' }

  attributeChangedCallback(_name: string, _old: string | null, _next: string | null): void {
    this._syncState()
  }

  protected override onMount(): void {
    this.root.innerHTML = /* html */ `
      <style>
        :host { display: inline-flex; align-items: center; padding: 10px 16px; cursor: pointer; }
        :host([disabled]) { pointer-events: none; opacity: 0.38; }
      </style>
      <span part="surface"><slot name="icon"></slot><slot></slot></span>
    `

    if (!this.getAttribute('tab-id')) {
      this.setAttribute('tab-id', generateFluidId('tab', this))
    }

    this.internals.role = 'tab'
    this.setAttribute('role', 'tab')
    this.setAttribute('aria-selected', 'false')
    this.setAttribute('tabindex', '-1')
    this._syncState()
  }

  private _syncState(): void {
    if (!this.root) return
    this.setAttribute('aria-disabled', this.disabled ? 'true' : 'false')
    const panelId = this.getAttribute('panel')
    if (panelId) this.setAttribute('aria-controls', panelId)
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
