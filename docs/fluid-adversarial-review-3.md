# `@neutro/fluid` — Adversarial Self-Review III
**Reviewing:** Foundation Document v0.4 + Monorepo Decision
**Scope:** Entirely fresh angles from Reviews I and II.
**Angles covered:** Concurrency/race conditions, memory/GC, CSS cascade edge cases, animation edge cases, accessibility gaps, gesture system completeness, SSR depth, build/bundle edge cases, missing API contracts, physics boundary conditions, i18n depth, package lifecycle.

---

## 🔴 Critical — Bugs or Breaks

---

### C3-01: `fluid-portal` Theme Snapshot Has No Change Detection Mechanism

**Section:** VIII.9
**Problem:** The portal theme inheritance solution has a fundamental gap. The `fluidtheme:change` event is dispatched by `fluid-theme` when tokens change — but `fluid-theme` has **no mechanism to know when its CSS custom properties change**. CSS custom properties have no native change event. `attributeChangedCallback` only fires for explicitly declared attributes.

If a consumer does:
```javascript
themeElement.style.setProperty('--fluid-hue-brand', '280')
```
...the `fluidtheme:change` event is never dispatched. The portal root's snapshot is stale forever.

**Resolution:** `fluid-theme` must use a `MutationObserver` on its own `style` attribute to detect custom property changes:
```typescript
const observer = new MutationObserver(() => {
  this.dispatchEvent(new CustomEvent('fluidtheme:change', { bubbles: true }))
})
observer.observe(this, { attributes: true, attributeFilter: ['style', 'class'] })
this.disposers.push(() => observer.disconnect())
```
Also fire `fluidtheme:change` from `attributeChangedCallback` for all declared attributes (`brand-hue`, `font-family`, etc.).

---

### C3-02: Spring Settling Threshold Is Absolute, Breaks on Small-Range Animations

**Section:** II.4 / IV
**Problem:** The spring settles when:
```typescript
Math.abs(state.value - target) < 0.001 && Math.abs(state.velocity) < 0.001
```

For an opacity animation from `0` to `0.001` (e.g., a very subtle ghost overlay), the spring detects settlement on the first step because `|0 - 0.001| < 0.001` is... borderline. More critically, for an animation from `0` to `0.0005`, the spring would never start because the first step already satisfies the threshold.

The issue also exists in reverse: for large-range animations (position from 0 to 10000px), the `0.001` threshold means the spring "settles" while still visibly in motion from a user's perspective (1px off at 1000x scale is invisible, but 1px off at 10px scale is 10% error).

**Resolution:** Relative threshold based on the animation range:
```typescript
const range = Math.abs(target - initialValue) || 1
const posThreshold = Math.min(range * 0.001, 0.5)  // 0.1% of range, max 0.5px
const velThreshold = posThreshold * 2

const settled = Math.abs(state.value - target) < posThreshold &&
                Math.abs(state.velocity) < velThreshold
```

---

### C3-03: Velocity Clamping Not Specified — Spring Overflow on Fast Gestures

**Section:** II.4 / V
**Problem:** The velocity registry passes gesture velocity directly into the spring solver as `initialVelocity`. Gesture velocity is in px/ms. A fast flick gesture on a high-DPI display can produce velocities of 50–100px/ms. In the spring formula, an `initialVelocity` of 100 with `mass: 0.5` produces an initial acceleration of `100 / 0.5 = 200 px/ms²`. After one 16ms frame, position change = `100 × 0.016 = 1.6px`... wait, that's fine.

But the real issue: `initialVelocity` is in **units matching the animated property**. If the property is `opacity` (0–1 range), a px-velocity from a drag gesture fed directly into an opacity spring would produce `opacity: 1 + 100 * 0.016 = 2.6` on the first frame — invalid CSS, clipped to 1, but the spring then has to "come back" from a value that was clipped.

The velocity must be normalized to the property's range before being used as an initialVelocity.

**Resolution:** The `startSpring` function must accept a unit specification and normalize velocity:
```typescript
function startSpring(el, property, target, config, options?: {
  velocityScale?: number  // multiplier to convert gesture units to property units
}): Promise<void>
```
For opacity/scale springs, set `velocityScale: 0.001` to convert px/ms to opacity/ms units. For position springs, keep 1:1. Document the conversion requirement explicitly.

---

### C3-04: Drag Events Lost When Pointer Leaves Element — `setPointerCapture` Missing

**Section:** V.1
**Problem:** During a drag gesture, if the pointer moves outside the element's bounds (common in fast drags), `pointermove` events are dispatched to the element the pointer is currently over — not the drag origin. The drag abruptly stops tracking.

`element.setPointerCapture(event.pointerId)` makes the element receive all pointer events for that pointer ID regardless of position. This is the standard mechanism for drag. It is not mentioned anywhere in the document.

**Resolution:** `FluidGesture.drag()` must call `element.setPointerCapture(event.pointerId)` on `pointerdown` and `element.releasePointerCapture(event.pointerId)` on `pointerup`/`pointercancel`. This is not optional — drag is broken on desktop and mobile without it.

---

### C3-05: Unique ARIA IDs in SSR Will Collide

**Section:** X / VIII
**Problem:** Components using `aria-describedby`, `aria-labelledby`, and `aria-controls` need unique IDs to link elements. In a component that generates its own IDs (e.g., `error-msg-${counter++}`), SSR and client hydration will generate different ID sequences, causing ARIA link mismatches and hydration warnings.

Specific components affected: `fluid-text-field` (links input to error message), `fluid-dialog` (links dialog to title), `fluid-accordion` (links button to panel), `fluid-tooltip` (links trigger to tooltip).

**Resolution:** IDs must be derived from a stable source:
1. If the consumer provides an `id` attribute on the component, use it as the base
2. Otherwise, use a crypto-stable hash of the component's position in the DOM (parent path + sibling index) — stable across SSR and hydration
3. Expose `generateFluidId(prefix: string): string` as a utility that uses `useId()` in React, `crypto.randomUUID()` in native, and a position-based hash in SSR context

---

### C3-06: Module Federation / Multiple Instances — Custom Elements Registry Conflict

**Section:** XVII / XIV
**Problem:** In micro-frontend architectures using Module Federation, `@neutro/fluid` might be loaded multiple times — once per micro-frontend. The `define()` guard prevents the `NotSupportedError` (C-06 from Review I, already resolved). But the `AnimationDriver`, `ZIndexAllocator`, and `TooltipManager` are module-level singletons. Two copies of the module = two separate singletons = z-index allocation desync, animation driver duplication (2× rAF loops), tooltip manager that doesn't see tooltips from the other instance.

**Resolution:**
1. Singletons must use `globalThis` as their backing store, not module scope:
```typescript
// Instead of:
export const driver = new AnimationDriver()

// Use:
const DRIVER_KEY = Symbol.for('neutro.fluid.driver')
if (!globalThis[DRIVER_KEY]) globalThis[DRIVER_KEY] = new AnimationDriver()
export const driver: AnimationDriver = globalThis[DRIVER_KEY]
```
`Symbol.for()` creates a global registry symbol — the same key resolves to the same symbol across module instances.

2. Document: only one version of `@neutro/fluid` should be active per browsing context.

---

## 🟡 Architecture / Design Issues

---

### A3-01: View Transitions — Concurrent Transition Race

**Section:** V.6
**Problem:** The View Transitions API: if `document.startViewTransition()` is called while a transition is already running, the API queues or cancels the in-flight transition (browser-dependent). Fluid intercepts View Transitions to apply spring animations. If two route changes happen in rapid succession (user clicks a link while a page transition is animating), the second transition might start with incorrect snapshot state.

**Resolution:** Fluid must maintain a transition lock:
```typescript
let activeTransition: ViewTransition | null = null

async function startFluidTransition(updateFn: () => void): Promise<void> {
  if (activeTransition) {
    // Skip animation, apply update immediately
    await activeTransition.ready.catch(() => {})
    updateFn()
    return
  }
  activeTransition = document.startViewTransition(updateFn)
  try {
    await activeTransition.finished
  } finally {
    activeTransition = null
  }
}
```

---

### A3-02: `aria-live` Toast Queue — Screen Readers Skip Rapid Announcements

**Section:** X / XI
**Problem:** When multiple `fluid-toast` elements are added rapidly (e.g., a network request fails and retries, adding 3 toasts in 200ms), screen readers receive rapid `aria-live` updates and may only announce the last one. The `aria-live="polite"` region interrupts only on a quiet moment — rapid updates prevent that quiet moment.

**Resolution:** `ToastManager` (a new singleton, analogous to `TooltipManager`) must pace announcements:
1. Toast enters a queue
2. Only one toast is rendered in the live region at a time
3. Next toast is rendered after the current one's duration + 200ms
4. Toasts that would be skipped are batched: "3 notifications" announced, user can access them via a toast tray

```typescript
export const toastManager = new ToastManager({
  maxSimultaneous: 1,
  announcementGap: 200  // ms between announcements
})
```

---

### A3-03: Multi-Touch Policy on Non-Pinch Elements Is Undefined

**Section:** V.1
**Problem:** If a user puts two fingers on a `fluid-button` (not intending to pinch, just multi-touching), `PointerEvents` fires two separate `pointerdown` events. The `press` gesture listens to `pointerdown` + `pointerup` on the same element. If it fires for both pointer IDs, the button activates twice. If it requires the same pointer ID for up and down, multi-touch should be fine.

But for `fluid-scroll-view`: a second touch arrives while scrolling. Should it be: (a) a scroll continuation with two fingers, (b) a pinch-to-zoom start, or (c) the second touch is ignored?

**Resolution:** Define explicit multi-touch policy:
- **Single-touch components** (`fluid-button`, `fluid-chip`): only the first `pointerdown` registers. Subsequent pointer IDs on the same element are ignored until all pointers are up.
- **Scroll containers** (`fluid-scroll-view`): two-finger touch = pinch if the second touch arrives within 100ms of the first and the distance is > 20px. Otherwise = scroll continuation (second touch ignored for scroll velocity).
- **Drag** elements: only tracks the initial pointer ID. Additional pointers ignored until `pointerup` for the tracked ID.

---

### A3-04: `fluid-nav-bar` Shrink Behavior Unspecified

**Section:** XI
**Problem:** The `fluid-nav-bar` is a flagship component — it "shrinks on scroll" — but this behavior is never specified:
- At what scroll distance does it start shrinking?
- How much does it shrink (from full height to what)?
- Is the shrink continuous (scroll-linked) or stepped (threshold-triggered)?
- Does it re-expand when scrolling up (always) or only at the top?
- What happens to the content inside the nav bar during shrink?
- Is this configurable?

**Resolution:** Define the shrink contract:
```html
<fluid-nav-bar
  shrink-start="48"       <!-- px scrolled before shrink begins -->
  shrink-amount="0.6"     <!-- shrink to 60% of full height -->
  shrink-mode="continuous | stepped"   <!-- default: continuous -->
  expand-on-scroll-up     <!-- boolean: re-expand on any upward scroll vs top-only -->
>
```
Shrink is scroll-linked (uses scroll-driven animations at Crystalline+, JS fallback at Frosted). Content inside the nav bar uses the `Flatten` motion on shrink, `Elevate` motion on expand.

---

### A3-05: `fluid-sheet` Dismiss Threshold and Snap Points Unspecified

**Section:** XI
**Problem:** `fluid-sheet` is swipeable to dismiss. But:
- What swipe distance triggers dismissal? (e.g., 50% of sheet height)
- What velocity triggers dismissal regardless of distance? (flick-to-dismiss)
- Can the sheet have intermediate snap points (e.g., half-open, full-open)?
- What happens to the physics after a partial swipe that doesn't reach the dismiss threshold? (snap back)

**Resolution:**
```html
<fluid-sheet
  dismiss-threshold="0.5"      <!-- 50% of sheet height -->
  dismiss-velocity="800"       <!-- px/s minimum flick velocity -->
  snap-points="0.3 0.7 1.0"   <!-- sheet heights as % of viewport; last = full open -->
>
```
Snap-back uses `bouncy` spring. Dismiss uses `gentle` spring to zero then `Recede`.

---

## 🟠 DX / API Gaps

---

### D3-01: Attribute vs Property Convention Not Documented

**Section:** VIII / XI
**Problem:** HTML attributes are strings. Properties are typed JavaScript values. Custom Elements can have both, and they may or may not reflect each other. Without a documented convention, component authors will implement inconsistently.

**Resolution:** Fluid's explicit convention:

- **Attributes (kebab-case, string):** Declarative/HTML usage. Present in DSD markup. Used for: string values, boolean flags (presence = true), enumerated values (variant, type, size). Always observable (trigger `attributeChangedCallback`).
- **Properties (camelCase, typed):** Programmatic usage. Used for: objects, arrays, functions, TypeScript-typed values. Do NOT reflect to attributes unless the value is string-representable.
- **Reflection rule:** If a property is also a declared attribute, the property getter reads from the attribute; the setter writes to the attribute. Never maintain duplicate state.

```typescript
// Correct reflection pattern
get variant(): ButtonVariant { return this.getAttribute('variant') as ButtonVariant ?? 'secondary' }
set variant(v: ButtonVariant) { this.setAttribute('variant', v) }

// Non-reflected property (object — not attribute)
private _items: Item[] = []
get items() { return this._items }
set items(v: Item[]) { this._items = v; this.requestRender() }
```

---

### D3-02: Slot Contract Not Documented Per Component

**Section:** XI
**Problem:** No component has a documented slot contract: which slots exist, which are required, what the default slot renders, and what happens if a required slot is empty.

For example, `fluid-card`:
- Does it have a default slot? For general content.
- A `header` slot? For a title area.
- An `actions` slot? For a button row.
- A `media` slot? For an image.
- What renders if the default slot is empty?

This must be documented per component before Phase 1 ships, or component authors (including Claude Code) will invent inconsistent slot architectures.

**Resolution:** Each component spec must include a slot table:

| Slot | Required | Fallback | Description |
|---|---|---|---|
| `(default)` | No | Empty surface | General content |
| `header` | No | Hidden | Glass header area |
| `actions` | No | Hidden | Bottom action row |
| `media` | No | Hidden | Full-bleed image area |

And a dev-mode warning for empty required slots.

---

### D3-03: Component Lifecycle Events Missing

**Section:** VIII
**Problem:** Consumers have no way to hook into component lifecycle programmatically beyond `connectedCallback`. This matters for:
- Analytics ("which components are visible at page load?")
- Lazy initialization ("only fetch data when the card is mounted")
- Test utilities ("wait for the component to be ready")
- Composition orchestration ("wait for all children to mount before animating")

**Resolution:**
```typescript
// Dispatched from FluidElement after onMount() completes
'fluid:mounted'   // element is connected and fully initialized
'fluid:unmounted' // element is disconnected and cleaned up
'fluid:tier-upgrade' // tier changed after async ledger upgrade
```
`fluid:mounted` fires after the first render, spring initialization, and background sampling is complete (or its async timeout). It is the reliable "ready" signal.

---

### D3-04: Long-Press vs Drag Disambiguation Not Defined

**Section:** V.1
**Problem:** A gesture recognizer listening to both `long-press` and `drag` on the same element has no documented disambiguation rule. If a user starts pressing and then moves their finger:
- Does the long-press cancel?
- At what movement threshold?
- Does drag start immediately or after the long-press cancels?

Without this rule, component authors will implement different behaviors for context menus, sortable lists, and draggable cards.

**Resolution:** Standard disambiguation rule (matches iOS behavior):
1. `pointerdown` — both long-press and drag are "watching"
2. If pointer moves > **8px** before long-press fires: **cancel long-press, start drag**
3. If long-press fires before 8px movement: **long-press activates, cancel drag**
4. Movement threshold configurable: `FluidGesture.drag(el, { longPressThreshold: 8 })`

---

### D3-05: `fluid-toast` API Not Specified

**Section:** XI
**Problem:** `fluid-toast` is listed in the taxonomy but its API is never defined. How does a consumer show a toast? Via imperative API? Via HTML element? What is the duration? What are the variants?

**Resolution:**
```typescript
// Imperative API (primary usage)
import { toast } from '@neutro/fluid/core'

toast('File saved')
toast('Error deleting file', { variant: 'destructive', duration: 0 })  // 0 = persistent
toast('Update available', {
  variant: 'info',
  duration: 5000,
  action: { label: 'Update now', onActivate: () => installUpdate() }
})

// Returns a handle for dismissal
const t = toast('Processing...')
t.dismiss()
t.update('Complete!')
```

HTML usage (`fluid-toast` element) is for rendering only — the element itself is created and managed by `ToastManager`. Consumers do not render `<fluid-toast>` directly.

---

### D3-06: `fluid-dialog` / `fluid-sheet` Open/Close Race Condition

**Section:** III.5 / XI
**Problem:** If `open()` is called while the element is still animating its `Recede` (close animation), the new `Emerge` spring must start with the current velocity of the `Recede` spring. This is covered by the velocity registry. But what about the DOM state? The element's `hidden` attribute or `display: none` — if the close animation hasn't finished, the element is still in the DOM. If `open()` is called mid-close, should it:
1. Immediately stop the close animation and spring back to open
2. Wait for close to complete, then re-open
3. Cancel close and immediately set to fully open (no animation)

Without a defined rule, this produces undefined behavior.

**Resolution:** Rule (1) — cancel close, spring back:
- `open()` during close: cancel the close spring, apply the velocity from the close animation (positive, away from close) to a new `Emerge` spring starting from the current partially-closed state. Feels physically correct — the element "bounces back."
- Implemented via the velocity registry — `startSpring(el, 'progress', 1, smooth)` where `progress` is the open/close animation value. The velocity registry naturally handles this.
- The component's `progress` value drives `scale`, `opacity`, and `height` simultaneously.

---

### D3-07: API Stability Tiers Not Defined

**Section:** Entire document
**Problem:** No API is marked as stable vs experimental vs internal. Consumers can't know whether `FluidMotion.variants()`, the `fluid:context-request` event, or `FluidLedger.forceTier()` are stable APIs they can depend on or internal APIs subject to change.

This becomes critical with LLM-generated code — Claude Code generating a consumer application needs to know which APIs are stable.

**Resolution:** Document three stability tiers for all exported symbols:

- **Stable** — semver-protected. No breaking changes without major version bump. Marked `@stable` in JSDoc.
- **Experimental** — may change in minor versions. Consumers accept risk. Marked `@experimental` in JSDoc and logs a dev-mode warning on first use.
- **Internal** — not for consumer use. Marked `@internal` and excluded from public TypeScript declarations.

Initial stability assignments:
- **Stable:** All component element APIs (attributes, parts, events), CSS custom property tokens (free tokens), `createTheme()`, `FluidI18n.use()`, `FluidTheme.setGlobalMode()`
- **Experimental:** Functional API (`fluid()` builder), `FluidMotion.*`, `FluidGesture.*`, `spring()` reactive values, `FluidTilt.enable()`
- **Internal:** Context protocol, `AnimationDriver`, `ZIndexAllocator`, `WillChangeManager`, ledger internals

---

## 🟢 Missing Features, Logic, and Contracts

---

### M2-01: No `CLAUDE.md` / Implementation Context File

**Problem:** The project will use Claude Code for implementation. There is no `CLAUDE.md` file defined — the standard file Claude Code reads for project context. Without it, each Claude Code session starts without knowledge of the physics axioms, the tier system, naming conventions, test requirements, or the design decisions made in this document.

**Required:** `CLAUDE.md` at the repo root and per-package `CLAUDE.md` files containing:
- Physics axioms (the 8 axioms)
- The "feels alive" test
- Current tier system
- Naming conventions (file structure, event names, part names, slot names)
- Test requirements (what tests must pass before a component ships)
- Common mistakes to avoid (derived from adversarial reviews)
- Link to the full foundation document

---

### M2-02: No Component Specification Template

**Problem:** There is no standard format for a component specification. When a component is designed (before implementation), there is no template that ensures all required design decisions are made: slot contract, attribute contract, event contract, ARIA pattern, physics assignment, tier behavior differences, state machine.

**Required:** A component spec template:
```markdown
# `fluid-[name]` Component Spec

## Layer & Physics
- Layer: [Surface | Raised | Overlay | Sheet | System]
- Material: [thin | regular | thick]
- Spring: [snappy | bouncy | gentle | smooth | precise]
- Motions: [list applicable motion catalogue entries]

## Attribute Contract
| Attribute | Type | Default | Reflected | Description |
...

## Property Contract
| Property | Type | Description |
...

## Slot Contract
| Slot | Required | Fallback | Description |
...

## Event Contract
| Event | When | detail shape |
...

## ARIA Pattern
- Role: ...
- Required attributes: ...
- Keyboard interactions: ...

## State Machine
[states and transitions]

## Tier Behavior
- Matte: ...
- Frosted: ...
- Crystalline: ...
- Optical: ...

## Accessibility
- Reduced-motion: ...
- High-contrast: ...
- RTL: ...
```

---

### M2-03: Skip Links Not Defined

**Problem:** `fluid-nav-bar` consumes significant vertical space and is a major navigation landmark. Long pages with Fluid should provide a skip link ("Skip to main content") for keyboard users and screen reader users who otherwise must tab through the entire nav bar. Not mentioned.

**Required:** `fluid-nav-bar` must render a visually hidden skip link as its first focusable child:
```html
<a class="skip-link" href="#fluid-main-content">Skip to main content</a>
```
Visible on `:focus`. The consumer must add `id="fluid-main-content"` to their main content area, or configure the skip target: `<fluid-nav-bar skip-target="#main">`.

---

### M2-04: `fluid-dialog` Back Button / History Integration

**Problem:** On mobile (and increasingly desktop), pressing the hardware/browser Back button while a modal is open should close the modal, not navigate away from the page. This is a standard mobile UX expectation. Not defined.

**Required:** `fluid-dialog`, `fluid-sheet`, and `fluid-drawer` must integrate with the History API:
- On open: `history.pushState({ fluidOverlay: true }, '')`
- On back (via `popstate` event): close the modal
- On programmatic close: `history.back()` if the current state is the overlay state

At Crystalline+ tier: use the Navigation API (`navigation.navigate()` + `navigation.addEventListener('navigate', ...)`) for better control.

---

### M2-05: Streaming SSR / React Server Components Strategy

**Problem:** The document covers basic SSR/DSD but doesn't address:
- Streaming SSR (HTML streamed in chunks)
- React Server Components (Fluid components cannot be RSC — must be client components)
- Framework-specific SSR patterns (Next.js `app` directory, Nuxt 3, Astro islands)

**Required:** Per-framework SSR guidance in each adapter's README:

```typescript
// React adapter — required for RSC environments
'use client'  // must be declared in the adapter barrel export

// Next.js 14+ app router
import dynamic from 'next/dynamic'
const FluidDialog = dynamic(() => import('@neutro/fluid/adapters/react').then(m => m.FluidDialog), { ssr: false })
// OR (preferred): use DSD-enabled fluid-dialog directly with the hydration guard
```

---

### M2-06: `fluid-text-field` Bidirectional Text

**Problem:** `fluid-text-field` contains an `<input>` element. When the user types bidirectional text (e.g., mixing Arabic and English), the `dir` attribute of the input should auto-detect from the content. Not defined.

**Required:**
- `<input>` inside `fluid-text-field` should have `dir="auto"` by default
- The glass label and supporting text must also respond to the input's text direction
- In RTL mode (`fluid-theme` with `dir="rtl"`), the input icon positions swap

---

### M2-07: Deprecation and Migration Strategy

**Problem:** Over time, tokens will be renamed, APIs will change, components will be deprecated. There is no policy for how this is communicated, how long deprecated APIs are supported, or how consumers migrate.

**Required:**
1. **Deprecation notice:** `@deprecated` JSDoc + dev-mode warning on first use: `[fluid deprecated] --fluid-tint-light was renamed to --fluid-surface-tint-light in v2.0. Will be removed in v3.0.`
2. **Support window:** Deprecated APIs supported for two major versions
3. **Migration guides:** Shipped as `MIGRATION.md` per major version
4. **Codemods:** For token renames and API changes, ship a codemod: `npx @neutro/fluid-codemod v2`
5. **Changesets** document deprecations in the changelog

---

### M2-08: Performance Budget Per Component

**Problem:** No performance targets are defined per component. A `fluid-button` that takes 50ms to first interactive is unacceptable, but there's no documented target to enforce.

**Required:** A performance budget documented in the testing strategy:

| Metric | Target | How Tested |
|---|---|---|
| Custom element upgrade time | < 2ms per component | `performance.mark()` in test |
| First paint after mount | < 16ms (one rAF) | Playwright performance metrics |
| Spring step computation | < 0.1ms per active spring | Vitest `performance.now()` |
| Background sampling (debounced) | < 5ms per sample | Playwright performance metrics |
| `OffscreenCanvas` downsample | < 2ms | Playwright |
| FLIP position read | < 1ms per element | Vitest |
| 100 springs simultaneously | < 5ms total per frame | AnimationDriver stress test |

---

### M2-09: `fluid-data-grid` Core Architecture Not Defined

**Problem:** The data grid is the most complex composition and the highest-value one (for the Pro tier strategy). Its architecture needs to be defined before Phase 7 begins, because the decisions made at the core level (virtualization approach, column model, edit model) cannot be easily changed later.

**Required:** A separate spec document for `@neutro/fluid-data-grid` covering:
- Virtualization strategy (windowing algorithm — `@tanstack/virtual` as headless utility, wrapped with Fluid rendering)
- Column definition model (typed column descriptors, resizing, reordering)
- Sort/filter model (server-side vs client-side, both supported)
- Edit model (inline editing, edit mode, validation via `ElementInternals`)
- Row selection model (single, multiple, range)
- Integration with `fluid-scroll-view` for physics-driven scroll

This spec should be written before Phase 5 of the core library, so it can inform any primitives the core needs to expose.

---

## Summary Table

| ID | Category | Severity | Fix Phase |
|---|---|---|---|
| C3-01 | `fluidtheme:change` has no trigger mechanism | 🔴 Critical | Before Phase 3 |
| C3-02 | Spring threshold absolute not relative | 🔴 Critical | Before Phase 0 |
| C3-03 | Velocity clamping unspecified | 🔴 Critical | Before Phase 0 |
| C3-04 | `setPointerCapture` missing from drag | 🔴 Critical | Before Phase 0 |
| C3-05 | ARIA IDs will collide in SSR | 🔴 Critical | Before Phase 1 |
| C3-06 | Module federation singleton conflict | 🔴 Critical | Before Phase 0 |
| A3-01 | View Transitions concurrent race | 🟡 Architecture | Before Phase 5 |
| A3-02 | Toast live region pacing | 🟡 Architecture | Before Phase 5 |
| A3-03 | Multi-touch policy undefined | 🟡 Architecture | Before Phase 0 |
| A3-04 | Nav-bar shrink behavior unspecified | 🟡 Architecture | Before Phase 2 |
| A3-05 | Sheet dismiss threshold unspecified | 🟡 Architecture | Before Phase 4 |
| D3-01 | Attribute vs property convention | 🟠 DX | Before Phase 0 |
| D3-02 | Slot contract not documented | 🟠 DX | Before Phase 1 |
| D3-03 | Lifecycle events missing | 🟠 DX | Before Phase 1 |
| D3-04 | Long-press vs drag disambiguation | 🟠 DX | Before Phase 0 |
| D3-05 | Toast API not specified | 🟠 DX | Before Phase 5 |
| D3-06 | Dialog open/close race contract | 🟠 DX | Before Phase 4 |
| D3-07 | API stability tiers not defined | 🟠 DX | Before Phase 0 |
| M2-01 | No CLAUDE.md | 🟢 Missing | Before Phase 0 |
| M2-02 | No component spec template | 🟢 Missing | Before Phase 0 |
| M2-03 | Skip links not defined | 🟢 Missing | Before Phase 2 |
| M2-04 | Back button / history integration | 🟢 Missing | Before Phase 4 |
| M2-05 | Streaming SSR / RSC strategy | 🟢 Missing | Before Phase 6 |
| M2-06 | Bidirectional text in inputs | 🟢 Missing | Before Phase 3 |
| M2-07 | Deprecation and migration strategy | 🟢 Missing | Before Phase 1 |
| M2-08 | Performance budget per component | 🟢 Missing | Before Phase 1 |
| M2-09 | `fluid-data-grid` core architecture | 🟢 Missing | Before Phase 7 |
