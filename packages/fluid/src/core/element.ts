import { provideContext, requestContext } from './context'
import type { FluidCapabilityLedger } from './ledger'
import { ledger } from './ledger'
import type { FluidLayer } from './z-index'
import type { SpringConfig } from './spring'

// Bundler define plugins replace process.env.NODE_ENV at build time.
// Falls back to false (production-safe) when process is absent in a plain browser.
const DEV: boolean =
  typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'

/**
 * Glass material weight class. Drives `--fluid-blur-current` and the
 * `backdrop-filter` value applied to each glass surface.
 *
 * - `thin`    → `--fluid-blur-thin`   (blur: 8px)
 * - `regular` → `--fluid-blur-regular` (blur: 20px)
 * - `thick`   → `--fluid-blur-thick`  (blur: 40px)
 *
 * @property (non-reflected — never written to an attribute)
 */
export type FluidMaterial = 'thin' | 'regular' | 'thick'

/**
 * The `fluid-theme` custom element (HTMLElement subclass).
 * Typed as HTMLElement until the concrete class is defined.
 * Used as the parameter type for `onThemeChange()`.
 */
export type FluidTheme = HTMLElement

/**
 * Abstract base class for all `@neutro/fluid` custom elements.
 *
 * ## Shadow DOM
 * `this.root` is set in `connectedCallback()` with the DSD hydration guard:
 * ```ts
 * this.root = this.shadowRoot ?? this.attachShadow({ mode: 'open' })
 * ```
 * If a `<template shadowrootmode="open">` was parsed server-side, the existing
 * shadow root is reused — `attachShadow()` is not called a second time.
 *
 * ## ElementInternals
 * `this.internals` is available for all subclasses after `connectedCallback()`.
 * Input-type subclasses MUST declare `static formAssociated = true` to enable
 * form participation (setFormValue, setValidity, etc.).
 *
 * ## ARIA IDs
 * All `aria-describedby`, `aria-labelledby`, and `aria-controls` IDs in
 * subclasses MUST use `generateFluidId(prefix, hostElement)` from `core/id.ts`.
 * Never use `Math.random()`, `Date.now()`, or incrementing counters — they
 * break SSR/hydration parity.
 *
 * ## Context protocol
 * Compound components use `provideContext` / `requestContext` from `core/context.ts`
 * (WCCG pattern). Call both inside `onMount()` and push cleanup into
 * `this.disposers` so the context re-registers on every reconnect:
 * ```ts
 * protected override onMount(): void {
 *   this.disposers.push(provideContext(this, MY_KEY, this.ctx))
 * }
 * ```
 *
 * ## Reflected vs non-reflected properties
 * - **Reflected** (`@reflected`): getter reads from `getAttribute()`; setter
 *   writes to `setAttribute()`. Never maintain duplicate state.
 * - **Non-reflected** (`@property`): private backing field; never touches
 *   attributes (used for objects, arrays, functions, typed values).
 */
export abstract class FluidElement extends HTMLElement {
  /**
   * Capability ledger — tier and media-query state.
   * Gate tier-specific behavior on `this.caps.tier`.
   *
   * @property (non-reflected)
   */
  protected readonly caps: FluidCapabilityLedger = ledger

  /**
   * Z-index layer for this component.
   * Override with a value from the `FluidLayer` union in each subclass.
   *
   * @property (non-reflected)
   */
  protected abstract readonly layer: FluidLayer

  /**
   * Glass material weight class ('thin' | 'regular' | 'thick').
   *
   * @property (non-reflected)
   */
  protected abstract readonly material: FluidMaterial

  /**
   * Spring configuration for the primary animation.
   * Use a `SPRING_PRESETS` value or a custom `{ mass, stiffness, damping }` object.
   *
   * @property (non-reflected)
   */
  protected abstract readonly spring: SpringConfig

  /**
   * Cleanup callbacks pushed in `onMount()`.
   * All run and the array is cleared in `disconnectedCallback()`.
   * Subclasses push functions here; never replace the reference.
   *
   * @example
   * this.disposers.push(
   *   provideContext(this, KEY, value),
   *   () => observer.disconnect(),
   * )
   */
  protected readonly disposers: Array<() => void> = []

  /**
   * Open shadow root. Set in `connectedCallback()` via the DSD hydration guard.
   * Available in `onMount()` and thereafter.
   */
  protected root!: ShadowRoot

  // Backing field prevents double-initialization on reconnect.
  // attachInternals() throws a DOMException if called more than once per instance.
  private _internals: ElementInternals | null = null

  /**
   * ElementInternals for this element. Available after `connectedCallback()`.
   * Provides ARIA reflection helpers and (for `formAssociated` subclasses)
   * `setFormValue`, `setValidity`, etc.
   */
  protected get internals(): ElementInternals {
    return this._internals!
  }

  private _initialized = false

  connectedCallback(): void {
    // DSD hydration guard: reuse an already-attached shadow root (from a
    // <template shadowrootmode="open"> parsed server-side). Only call
    // attachShadow() when no shadow root is present.
    this.root = this.shadowRoot ?? this.attachShadow({ mode: 'open' })

    // Guard: attachInternals() throws if called more than once per instance.
    // This allows safe reconnect (React Strict Mode, DOM moves, etc.).
    this._internals ??= this.attachInternals()

    if (DEV && this._initialized) {
      console.warn(
        `[fluid warn] <${this.tagName.toLowerCase()}> re-connected without a prior ` +
        `disconnectedCallback. Ensure onMount() is idempotent.`
      )
    }
    this._initialized = true
    this.onMount()

    // Lifecycle event — the reliable "component is ready" signal for consumers,
    // test utilities, and composition orchestration. Dispatched AFTER onMount()
    // so springs, sampling, and context protocol are fully initialized.
    // Queued as a microtask so that callers who add the listener immediately
    // after an appendChild() call can still receive the event.
    queueMicrotask(() => {
      this.dispatchEvent(new CustomEvent('fluid:mounted', { bubbles: true, composed: true }))
    })
  }

  disconnectedCallback(): void {
    this.disposers.forEach(d => d())
    this.disposers.length = 0
    this._initialized = false
    this.onUnmount()
    this.dispatchEvent(new CustomEvent('fluid:unmounted', { bubbles: true, composed: true }))
  }

  /**
   * Register this class under the given custom element tag name.
   * Silently skips registration if the name is already taken — safe to call
   * from both module top-level and lazy-init paths.
   *
   * @example
   * FluidButton.define('fluid-button')
   */
  static define(name: string): void {
    // Cast required: TypeScript sees the static `this` as an abstract constructor,
    // but `define()` is only ever called on concrete subclasses at runtime.
    if (!customElements.get(name)) customElements.define(name, this as unknown as CustomElementConstructor)
  }

  /**
   * Called once per connection, after `this.root` and `this.internals` are ready.
   * Override to initialize springs, attach event listeners, and register
   * disposers via `this.disposers.push(...)`.
   *
   * **Idempotency contract:** this method MUST be safe to re-invoke after
   * `disconnectedCallback()`. Every resource acquired here must be released in
   * a disposer or in `onUnmount()`.
   *
   * **Context protocol:** re-request or re-provide context here so compound
   * components continue to work after a DOM move. See `requestContext` and
   * `provideContext` in `core/context.ts`.
   */
  protected onMount(): void {}

  /**
   * Called once per disconnection, after all disposers have run.
   * Override for cleanup that cannot be expressed as a disposer function,
   * such as releasing a z-index allocation.
   */
  protected onUnmount(): void {}

  /**
   * Called when the nearest `fluid-theme` element emits `fluidtheme:change`.
   * Override to react to brand, dark-mode, or token updates.
   *
   * This hook is NOT wired automatically — register the listener in `onMount()`:
   * ```ts
   * protected override onMount(): void {
   *   const theme = this.closest('fluid-theme') ?? document.documentElement
   *   const handler = () => this.onThemeChange(theme as FluidTheme)
   *   theme.addEventListener('fluidtheme:change', handler)
   *   this.disposers.push(() => theme.removeEventListener('fluidtheme:change', handler))
   * }
   * ```
   */
  protected onThemeChange(_theme: FluidTheme): void {}
}

// Re-export utilities that every FluidElement subclass author will need,
// so they have a single import point.
export { provideContext, requestContext }
