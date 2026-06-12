# `@neutro/fluid` — Adversarial Self-Review II
**Reviewing:** Foundation Document v0.3
**Scope:** Entirely fresh angles from Review I. No repeated findings.

---

## 🔴 Critical — Bugs or Breaks

---

### C2-01: CSS Relative Color Syntax Is Behind Frosted Tier

**Section:** VI.5
**Problem:** The color scale uses `oklch(from var(--fluid-color-brand) 0.97 calc(c * 0.25) h)` — CSS relative color syntax. This requires:
- Chrome **119+**
- Safari **17.2+**
- Firefox **128+**

But the Frosted tier targets Chrome 76+, Safari 14+, Firefox 103+. Any browser in the Frosted range that predates these versions will render **invalid CSS** for the entire color scale — no colors, blank or transparent surfaces everywhere.

This is a silent catastrophic failure on a significant range of currently-supported browsers.

**Resolution:** CSS relative colors are a **Crystalline-tier** feature. At Frosted and below, the color scale must be computed differently:
- Ship pre-computed scale CSS for a set of common brand hues as static fallback
- Or use a `@supports (color: oklch(from red 1 1 1)) {}` progressive enhancement wrapper
- The `--fluid-color-brand-50` through `900` scale at Frosted tier uses HSL arithmetic only:
  `hsl(var(--fluid-hue-brand) calc(var(--fluid-sat-brand) * 0.3) 97%)` etc.
- At Crystalline+: switch to the relative oklch approach

---

### C2-02: `color-mix()` Is Also Misassigned to Frosted

**Section:** III.1 (Frosted tier spec)
**Problem:** `color-mix()` is listed as a Frosted-tier feature. But Frosted targets Safari 14+, and `color-mix()` requires Safari **15.4+**. Safari 14 is a valid Frosted-tier browser with no `color-mix()` support.

Any use of `color-mix()` for the adaptive tinting in the Glass Equation will produce transparent/invalid results on Safari 14.

**Resolution:** `color-mix()` is a **Crystalline-tier** feature. Frosted-tier tinting must use `background-color: rgba(...)` with static light/dark values derived from `prefers-color-scheme`. `color-mix()` is an enhancement available at Crystalline+.

---

### C2-03: Spring Solver Not Frame-Rate Independent

**Section:** IV
**Problem:** The document says "exact closed-form solution — frame-rate independent." The closed-form solution IS frame-rate independent because it takes a time delta `dt` in seconds. But the `AnimationDriver` passes `timestamp` to each spring task. If the implementation derives `dt` as the time since the last frame, it is frame-rate independent. If it assumes `dt = 16.67ms` (60fps), it is not.

The specific failure: on a 120Hz or 144Hz display, `rAF` fires at ~8.3ms or ~6.9ms. A spring configured at 60fps-assumed timing will:
- Settle in half the wall-clock time on 120Hz (feels snappy but shorter duration than designed)
- Conversely, on a throttled 30fps rAF (background tab catching up), springs will appear to take longer

This is not a hypothetical — 120Hz is standard on Apple devices since iPhone 13 Pro and all modern MacBooks with ProMotion.

**Resolution:** The `AnimationDriver.tick` must compute a real `dt`:
```typescript
private lastTimestamp: number | null = null

private tick = (timestamp: number): void => {
  const dt = this.lastTimestamp !== null
    ? Math.min((timestamp - this.lastTimestamp) / 1000, 0.064)  // cap at 64ms (2 missed frames)
    : 0.016  // first frame fallback
  this.lastTimestamp = timestamp

  for (const [id, task] of this.active) {
    const settled = task.advance(dt)  // real seconds
    if (settled) this.active.delete(id)
  }
  // ...
}
```
The `Math.min(..., 0.064)` cap prevents a single massive step after the tab is backgrounded and then returned to.

---

### C2-04: `will-change` Has No Reference Counter

**Section:** IV / XIV
**Problem:** The document specifies: "`will-change: transform, opacity` set at animation start, removed at spring settle."

If two animations overlap on the same element (e.g., a hover `Elevate` is in progress when a press `Depress` starts), the first animation to settle will remove `will-change` — while the second animation still needs it. The second animation then runs without compositor promotion for its remaining frames.

This is a real scenario: fast hover followed by immediate press.

**Resolution:** Each animating element needs a `will-change` reference counter:
```typescript
const willChangeRefs = new WeakMap<Element, number>()

function acquireWillChange(el: Element): void {
  const count = (willChangeRefs.get(el) ?? 0) + 1
  willChangeRefs.set(el, count)
  if (count === 1) el.style.setProperty('will-change', 'transform, opacity')
}

function releaseWillChange(el: Element): void {
  const count = Math.max((willChangeRefs.get(el) ?? 1) - 1, 0)
  willChangeRefs.set(el, count)
  if (count === 0) el.style.removeProperty('will-change')
}
```

---

### C2-05: `--fluid-blur-current` Is Never Set

**Section:** VI.6
**Problem:** The dynamic typography compensation formula uses:
```css
calc(400 + (var(--fluid-blur-current, 20) - 8) * 5)
```
The property `--fluid-blur-current` has a fallback of `20` but is **never set anywhere in the document**. No component sets it. The formula always resolves to the fallback value, making the dynamic compensation static.

**Resolution:** Each glass surface must set `--fluid-blur-current` to the active blur value on itself:
```css
.surface {
  --fluid-blur-current: 20; /* set to the numeric blur value, unitless */
  backdrop-filter: blur(var(--fluid-blur-regular));
  font-weight: var(--fluid-font-weight-on-glass);
}
```
For thin glass: `--fluid-blur-current: 8`. For thick: `--fluid-blur-current: 40`. This must be set by each component or by the material CSS mixin.

---

### C2-06: Scroll Lock Is Unspecified

**Section:** III.5, VIII, XI
**Problem:** When `fluid-dialog`, `fluid-sheet`, or `fluid-drawer` opens, the background must not scroll. This is never addressed in the document.

The naive `document.body.style.overflow = 'hidden'` causes a **layout shift** because the scrollbar disappears (typically 15–17px). This shifts all content horizontally — visible on every website that uses this approach.

**Resolution:** The correct technique:
1. Measure the scrollbar width before locking: `window.innerWidth - document.documentElement.clientWidth`
2. Set `document.body.style.paddingRight = scrollbarWidth + 'px'` and `overflow: hidden`
3. On close: restore both
4. Use `overscroll-behavior: contain` on the overlay element itself (prevents touchmove propagation to background)
5. For iOS: `position: fixed` on body with stored `scrollTop` (iOS ignores overflow:hidden on body for touch scroll)

This is a `fluid-portal`-level concern — all overlays are rendered via portal, which handles the scroll lock lifecycle.

---

### C2-07: Z-Index Stacking Within a Layer Is Undefined

**Section:** VII
**Problem:** Two tooltips open simultaneously, or two dropdowns, or nested popovers. Both are at Layer 3 (z-index 100–499). They get the same z-index and stack in DOM order — which may not be the intended order.

**Resolution:** A `ZIndexAllocator` per layer:
```typescript
class ZIndexAllocator {
  private counters = new Map<FluidLayer, number>()

  allocate(layer: FluidLayer): number {
    const base = LAYER_Z_BASE[layer]  // e.g., Overlay = 100
    const current = this.counters.get(layer) ?? 0
    const next = current + 1
    this.counters.set(layer, next)
    return base + next
  }

  release(layer: FluidLayer): void {
    const current = this.counters.get(layer) ?? 1
    this.counters.set(layer, Math.max(current - 1, 0))
  }
}
```
Each overlay allocates on open, releases on close. The most recently opened overlay always has the highest z-index within its layer.

---

### C2-08: Animation Velocity Registry Is Not Defined

**Section:** II.4 / V
**Problem:** The velocity preservation principle states: "the incoming spring receives the current velocity of the interrupted animation." But the document never defines how the system tracks what animation is currently running on an element and what its current velocity is.

Without a registry, velocity preservation cannot be implemented. Each new animation starting has no way to query "what was the velocity of the last spring on this element?"

**Resolution:** A per-element animation state registry in the `AnimationDriver`:
```typescript
interface ActiveAnimation {
  springState: SpringState   // { value, velocity }
  target: number
  property: string
  config: SpringConfig
}

// WeakMap so elements can be GC'd freely
const activeAnimations = new WeakMap<Element, Map<string, ActiveAnimation>>()

function startSpring(el: Element, property: string, target: number, config: SpringConfig): void {
  const existing = activeAnimations.get(el)?.get(property)
  const initialVelocity = existing?.springState.velocity ?? 0  // velocity preservation
  const initialValue = existing?.springState.value ?? parseCurrentValue(el, property)
  // create spring with initialVelocity...
}
```

---

## 🟡 Architecture / Design Issues

---

### A2-01: Nested Glass Surfaces Create Compounding Blur

**Section:** VII / XI
**Problem:** The layer model allows nesting glass surfaces. A `fluid-dialog` (Layer 4, thick glass, 40px blur) containing a `fluid-card` (Layer 1, thin glass, 8px blur) containing a `fluid-dropdown` (Layer 3, regular glass, 20px blur). Each `backdrop-filter: blur()` blurs the composited content beneath it.

Result: the dropdown blurs the card's already-blurred content, then the dialog blurs both. The visual result is extreme over-blurring and can produce a completely opaque grey surface that defeats the purpose of glass. Chrome and Safari handle nested `backdrop-filter` differently — creating cross-browser inconsistencies on top of the visual problem.

**Resolution:** A glass nesting policy must be defined:
1. **Preferred:** Glass surfaces at Layer 2+ render over a non-glass container. Composition is always Glass-over-Background, never Glass-over-Glass.
2. **When unavoidable (e.g., tooltip over modal):** The higher-layer element **reduces its own blur** to account for accumulated blur from layers beneath: `blur = max(full-blur - sum-of-blur-below, 4px)`
3. Document this as a composition constraint: never intentionally nest more than 2 glass layers deep.
4. Provide a dev-mode warning when a glass component is mounted inside another glass component at a higher layer.

---

### A2-02: SSR — Capability Ledger Has No Node.js Strategy

**Section:** III.3
**Problem:** The capability ledger runs feature detection using `CSS.supports()`, `typeof window`, and browser APIs. In a Node.js SSR context (Next.js, Nuxt, Astro), all of these throw or return `undefined`.

The document specifies DSD for SSR compatibility but never addresses what the ledger returns in a Node.js environment. Components mounting server-side will attempt ledger reads and fail.

**Resolution:**
```typescript
// At the top of ledger.ts
const IS_BROWSER = typeof window !== 'undefined' && typeof document !== 'undefined'

if (!IS_BROWSER) {
  // SSR: export a static "safe default" ledger
  // Tier 'matte' — safest assumption for SSR
  // All capabilities: false
  // No sampling, no worklets, no springs
  export const ledger: FluidCapabilityLedger = SSR_SAFE_DEFAULTS
} else {
  // Browser: run detection
}
```

Components in SSR render their DSD shell using the Matte-tier CSS (pure CSS, no spring JS). The capability ledger upgrades on the client after hydration.

---

### A2-03: `fluid-portal` Does Not Define Theme Token Inheritance

**Section:** XI / VIII
**Problem:** `fluid-portal` renders its content outside the current DOM position — typically as a direct child of `<body>`. But CSS custom properties (the theming mechanism) cascade through DOM ancestry. A portaled `fluid-dropdown` rendered at `<body>` level no longer inherits the custom properties from a nested `fluid-theme`.

This means portaled components lose their theme entirely if the app uses a non-root `fluid-theme`.

**Resolution:** `fluid-portal` must capture a snapshot of the relevant CSS custom properties from the current theme context at render time and apply them to the portal root:
```javascript
connectedCallback() {
  const theme = this.closest('fluid-theme') ?? document.documentElement
  const tokens = FluidTheme.snapshotTokens(theme)  // reads all --fluid-* custom props
  this.portalRoot = document.createElement('fluid-portal-root')
  Object.entries(tokens).forEach(([k, v]) => this.portalRoot.style.setProperty(k, v))
  document.body.appendChild(this.portalRoot)
}
```
The portal root also listens for `fluidtheme:change` events to re-snapshot when the theme changes.

---

### A2-04: Document `visibilitychange` Not Handled

**Section:** IV / XIV
**Problem:** When a browser tab is hidden (`document.visibilityState === 'hidden'`), `requestAnimationFrame` is throttled to 1fps or paused entirely depending on the browser. The `AnimationDriver` will either fire very slowly or stop. When the tab returns to visibility, there may be a large pending `dt` that causes springs to snap to completion rather than animate smoothly.

The `dt` cap (C2-03 fix, max 64ms) partially mitigates this, but the proper solution is to explicitly pause and resume:

**Resolution:**
```typescript
// In AnimationDriver
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Pause: cancel rAF, mark all active springs as suspended
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.rafId = null
    this.lastTimestamp = null  // forces dt=16ms on resume
  } else {
    // Resume: restart rAF loop if there are active springs
    if (this.active.size > 0) {
      this.rafId = requestAnimationFrame(this.tick)
    }
  }
})
```

---

### A2-05: Print Media Is Unaddressed

**Section:** Entire document
**Problem:** No `@media print` handling. When a consumer prints a page using Fluid components:
- `backdrop-filter` may not render in print (browser-dependent, often omitted)
- `box-shadow` prints faintly or not at all
- Custom properties may not resolve correctly in print context
- Glass effects produce grey/white blobs on printed paper

**Resolution:** All glass components must include print overrides in their shadow root styles:
```css
@media print {
  :host {
    backdrop-filter: none !important;
    background: white !important;
    box-shadow: none !important;
    border: 1px solid #ccc !important;
    color: black !important;
    opacity: 1 !important;
  }
}
```
A global `@neutro/fluid/theme/print.css` provides document-level print resets. Documented as a required import for print-supporting applications.

---

### A2-06: Low-Power Device Detection Is Missing

**Section:** III / XIV
**Problem:** The capability ledger detects browser API support but not device capability. A browser that technically supports Crystalline-tier features (WAAPI, OffscreenCanvas) on a 2016 low-end device will run those features poorly.

There is no mechanism to detect and respond to device resource constraints.

**Resolution:** The ledger adds soft capability hints (not hard tier overrides):
```typescript
interface FluidCapabilityLedger {
  // ... existing fields

  // Soft hints (affect rendering density, not tier)
  deviceMemoryLow: boolean        // navigator.deviceMemory < 2 (GB)
  cpuCoresLow: boolean            // navigator.hardwareConcurrency <= 2
  saveData: boolean               // navigator.connection?.saveData
  // battery: not used (getBattery() is deprecated)
}
```

These hints do not change the glass tier but do control:
- Background sampling: disabled when `saveData: true`
- Parallax: disabled when `deviceMemoryLow || cpuCoresLow`
- Ripple: disabled when `deviceMemoryLow`
- Glass nesting depth warning: always fired when `cpuCoresLow`

---

### A2-07: React Strict Mode Double-Invocation

**Section:** VIII
**Problem:** React 18+ Strict Mode intentionally runs `useEffect` twice in development — and by extension, component mount/unmount/remount cycles. For Custom Elements used via React adapter, this means `connectedCallback` → `disconnectedCallback` → `connectedCallback`.

The disposers pattern handles cleanup on `disconnectedCallback`. But `connectedCallback` must be fully idempotent — it must produce identical state whether called once or after a prior disconnect. Specifically:
- If `connectedCallback` starts a background sampling observer, and `disconnectedCallback` cleans it up, the second `connectedCallback` must re-start it cleanly
- If `connectedCallback` allocates a z-index via `ZIndexAllocator`, the `disconnectedCallback` releases it, and the second `connectedCallback` re-allocates — the second allocation will be a higher z-index than the first (counter not reset)
- DSD hydration guard (`this.shadowRoot ?? this.attachShadow(...)`) must work correctly on remount

**Resolution:** Document `connectedCallback` idempotency as a mandatory contract for all component authors. Add a dev-mode assertion: if `connectedCallback` is called when `this._initialized === true` without a preceding `disconnectedCallback`, warn.

---

## 🟠 DX / API Gaps

---

### D2-01: Controlled vs Uncontrolled Pattern Is Undefined

**Section:** VIII / XI
**Problem:** Components with open/close state (`fluid-dropdown`, `fluid-dialog`, `fluid-select`, `fluid-accordion`, `fluid-sheet`) can be either:
- **Uncontrolled:** The component manages its own state. Consumer listens to `fluid:open`/`fluid:close` events.
- **Controlled:** The consumer manages state via an `open` attribute. The component reflects this attribute.

Without defining this contract, consumers will assume one and get the other. This is one of the most common pain points in component library DX (it was a major issue in early React before controlled/uncontrolled was formalized).

**Resolution:** Explicit dual-mode contract for all stateful components:

```html
<!-- Uncontrolled (default): component manages state -->
<fluid-dropdown>
  <button slot="trigger">Open</button>
  <fluid-menu-item>Option A</fluid-menu-item>
</fluid-dropdown>

<!-- Controlled: consumer manages state -->
<fluid-dropdown open>
  ...
</fluid-dropdown>
```

Rule: if `open` attribute is present (even as `open="false"`), the component is in controlled mode and will not toggle itself. If absent, the component is uncontrolled. `fluid:open` and `fluid:close` events always fire regardless of mode — they are informational, not imperative.

---

### D2-02: Event Naming Ambiguity — `fluid:press` vs `fluid:click`

**Section:** VIII.6
**Problem:** The document uses `fluid:press` in some examples and `fluid:click` in others (`fluid/button` adapter example uses `onFluidClick`). These are different semantics:
- `press` = pointer down + up on same element (physical event)
- `click` = semantic activation (also fires on Enter/Space keypress for buttons)

For a physics library, `fluid:press` is physically correct. But consumers expect `fluid:click` from buttons because that is the universal web convention. Missing `fluid:click` on a button is an accessibility failure — screen readers activate buttons via keyboard, which fires `click` but not `pointerdown`/`pointerup`.

**Resolution:** Buttons emit both:
- `fluid:press` — fired on pointer down/up (with position, velocity, pressure data in `detail`)
- `fluid:activate` — fired on any activation: pointer press, Enter key, Space key, programmatic `.click()`. This is the semantic event consumers should use for action handlers.

Never `fluid:click` — `click` is a browser event name and using it as a custom event name collides semantically. `fluid:activate` is the correct semantic equivalent.

---

### D2-03: `fluid-button` Missing `type` Attribute for Form Submission

**Section:** XI
**Problem:** HTML `<button>` has `type="submit|button|reset"` which determines form behavior. A `fluid-button` inside a `<form>` has no defined behavior — it does not submit the form by default because the shadow DOM `<button>` is inside the shadow root, not the light DOM form.

`ElementInternals` with `formAssociated = true` handles form values for inputs. But for submit buttons, the mechanism is different — the button must set itself as a form submitter. This requires `internals.setFormValue()` is not the solution; the shadow DOM button needs to call `this.internals.form?.requestSubmit()` on press when `type="submit"`.

**Resolution:**
```javascript
// In FluidButton
static formAssociated = true

get type() { return this.getAttribute('type') ?? 'submit' }  // default matches HTML button

private handleActivate() {
  if (this.type === 'submit') this.internals.form?.requestSubmit(null)
  if (this.type === 'reset')  this.internals.form?.reset()
  this.dispatchEvent(new CustomEvent('fluid:activate', { bubbles: true, composed: true }))
}
```

---

### D2-04: Compound Component Communication Pattern Is Undefined

**Section:** XI
**Problem:** Several components are compound: `fluid-tabs` contains `fluid-tab` and `fluid-tab-panel`. `fluid-accordion` contains `fluid-accordion-item`. `fluid-select` contains `fluid-option`. How do child components communicate with their parent?

Options (each with trade-offs):
1. **DOM traversal:** child does `this.closest('fluid-tabs')` — couples child to specific parent, fragile
2. **Context via custom event:** child fires an event upward, parent captures and coordinates — decoupled but verbose
3. **Context element (like React Context):** parent registers itself in a `WeakMap` keyed by a Symbol, child queries the map — elegant but not a web standard

No pattern is defined and without one, component authors will implement different patterns for different components, producing an incoherent internal architecture.

**Resolution:** Fluid uses a **context protocol** via custom events:
```typescript
// Child: request context
const event = new CustomEvent('fluid:context-request', {
  detail: { contextKey: TABS_CONTEXT_KEY, callback: (ctx) => { this.tabsContext = ctx } },
  bubbles: true, composed: true
})
this.dispatchEvent(event)

// Parent: provide context
this.addEventListener('fluid:context-request', (e) => {
  if (e.detail.contextKey === TABS_CONTEXT_KEY) {
    e.detail.callback(this.tabsContext)
    e.stopPropagation()
  }
})
```
This is the pattern established by the `@lit/context` library and the WCCG Context Protocol proposal. Adopt it as the Fluid standard for compound component communication.

---

### D2-05: Render Delegation Pattern for Data-Driven Compositions Is Undefined

**Section:** XI (Compositions)
**Problem:** `fluid-virtual-list`, `fluid-data-grid`, `fluid-kanban`, and `fluid-calendar` all need to render items from consumer-provided data. Slots work for static children, but not for dynamic data arrays.

No pattern is defined for how a consumer provides a render function or item template to a composition.

**Resolution:** Two patterns, both documented:

**Pattern A — Template slot (declarative):**
```html
<fluid-virtual-list .items=${data}>
  <template slot="item">
    <!-- Consumer defines item structure; composition stamps it per item -->
    <fluid-card>
      <span slot="label">{{item.name}}</span>
    </fluid-card>
  </template>
</fluid-virtual-list>
```

**Pattern B — Render function (functional API):**
```javascript
fluid
  .virtualList({ items: data })
  .renderItem((item, index) =>
    fluid.card().children([fluid.text(item.name)])
  )
  .appendTo(container)
```

Both patterns must be defined before any composition ships.

---

### D2-06: Security — CSS Injection via Custom Properties

**Section:** VI / VIII
**Problem:** `fluid-theme` accepts attribute values and writes them to CSS custom properties:
```javascript
// Consumer sets attribute
themeEl.setAttribute('font-family', userInput)
// Gets written as:
this.style.setProperty('--fluid-font-family-display', userInput)
```

If `userInput` comes from an untrusted source (URL params, user data), an attacker can inject arbitrary CSS values:
```
font-family="'Arial'; --another-property: injected; font-family: 'Hacked"
```

CSS custom property values are sanitized by the browser (they cannot contain semicolons that would break the property declaration when used in `setProperty`). But certain CSS properties used directly as attribute values (e.g., a `style` attribute built from user input) could allow injection.

**Resolution:**
1. `fluid-theme` never constructs `style` attributes from raw input — only uses `setProperty` (safe)
2. For attributes that accept CSS values directly (font-family, etc.), apply an allowlist: only `['serif', 'sans-serif', 'monospace', ...]` + strings matching `^['"][^'"<>]+['"],?\s*(system-ui|sans-serif|serif|monospace)?$`
3. Document: `fluid-theme` attributes should never accept untrusted user input directly. Theme configuration is a build-time/deploy-time concern, not a runtime user input.

---

### D2-07: Security — `fluid:*` Event `detail` Leakage

**Section:** VIII.6
**Problem:** Events use `composed: true` so they bubble through Shadow DOM. If a `fluid:activate` event on a password button (e.g., toggle password visibility) carries the password value in its `detail`, any JavaScript listening at the `document` level can read it.

**Resolution:**
- `detail` payloads must never contain sensitive values — only interaction metadata (position, velocity, which element, which option selected by key/value ID — not the raw value)
- Specifically, form input `fluid:change` events must emit the sanitized display value or an opaque key, never the raw form field value in detail
- Document this explicitly in the event API contract

---

### D2-08: No Strategy for FOUC (Flash of Unstyled Content)

**Section:** VIII
**Problem:** Custom Elements are defined asynchronously. Between the time HTML is parsed and when `customElements.define('fluid-button', ...)` runs, the element exists but has no shadow DOM, no styles, and no functionality. Users see unstyled content — an empty box or plain text — before the component upgrades.

This is the canonical Custom Elements FOUC problem.

**Resolution:**
1. **CSS `:not(:defined)`** selector hides uncustomized elements:
```css
/* In the consumer's global CSS, or in fluid/theme/default.css */
fluid-button:not(:defined),
fluid-card:not(:defined),
fluid-nav-bar:not(:defined) {
  visibility: hidden;
}
```
2. Fluid ships a single `@neutro/fluid/theme/anti-fouc.css` containing these rules for all registered components.
3. For SSR/DSD: the shadow root is already rendered server-side, so there is no FOUC on initial load — only on client-side-rendered components.
4. Document this as a required step for non-SSR deployments.

---

### D2-09: Testing Infrastructure Not Defined

**Section:** Entire document
**Problem:** No testing strategy is documented. This matters for the library itself (how contributors test changes) and for consumers (how they test their usage of Fluid). Specific gaps:

- **Spring physics testing:** How do you assert a spring value is correct? The output is continuous floating-point. Tests need a way to advance the spring by a fixed dt and assert approximate final values.
- **Tier testing:** `forceTier` exists but there's no documented test utility that sets up the full environment (e.g., mocking `CSS.supports` to return specific values).
- **Visual regression:** No tool is specified. Options: Storybook + Chromatic, Playwright screenshots, Percy.
- **Accessibility testing:** `axe-core` integration, but when and how run?
- **Cross-browser testing:** Which browsers, which versions, at what cadence?
- **SSR testing:** Testing DSD rendering in a Node.js environment.

**Resolution:** A `@neutro/fluid/testing` subpath export providing:
```typescript
import { FluidTestUtils } from '@neutro/fluid/testing'

// Spring testing
const spring = new TestSpring({ preset: 'snappy' })
spring.advance(0.1)  // advance 100ms
expect(spring.value).toBeCloseTo(0.85, 2)

// Tier testing
FluidTestUtils.mockTier('frosted')  // mocks CSS.supports responses
FluidTestUtils.restoreTier()

// Component testing
const el = await FluidTestUtils.mount('<fluid-button variant="primary">Save</fluid-button>')
await FluidTestUtils.waitForSpringSettle(el)
expect(el).toBeAccessible()  // axe-core assertion
```

---

## 🟢 Missing Features, Primitives & Logic

---

### M-01: No Scroll Snapping Coordination

The document mentions snap points for `fluid-scroll-view` but defines no snap coordination mechanism. How does a consumer define snap positions? There is no `scroll-snap-align` equivalent for the custom scroll implementation, and no way to define snap points programmatically.

**Required:** `fluid-scroll-view` must support:
```html
<fluid-scroll-view snap="x mandatory">
  <fluid-snap-point><!-- snaps here --></fluid-snap-point>
</fluid-scroll-view>
```
Or programmatic: `scrollView.addSnapPoint(offsetPx)`.

---

### M-02: No Drag Constraint System

The gesture system defines `drag` with "constraint handling" but the constraint system itself is not specified. What types of constraints exist?

**Required:**
- `bounds`: limit drag to a rect (`{ top, left, bottom, right }`)
- `axis`: lock to x or y
- `snap`: snap to positions on release
- `elastic`: drag beyond bounds with elastic resistance
- `grid`: snap to a grid on release
- Custom constraint function: `(x, y) => ({ x, y })` — maps unconstrained position to constrained

---

### M-03: No Focus Ring System

The document specifies focus ring CSS (`2px solid var(--fluid-color-brand)`) but provides no mechanism for components to consistently apply it. Each component implementing its own `:focus-visible` styles leads to inconsistency.

**Required:** A shared focus ring CSS mixin applied via `@layer` inside all interactive components' shadow roots:
```css
@layer fluid-focus {
  :host(:focus-visible) {
    outline: 2px solid var(--fluid-color-brand);
    outline-offset: 2px;
  }
}
```
Plus a `--fluid-focus-ring-color` free token so consumers can change it globally.

---

### M-04: No Loading / Async State Primitive

Components have no standard mechanism for async states. A `fluid-button` triggering an async operation, a `fluid-card` loading its content, a `fluid-list` fetching data — all need a loading state. Currently each component would implement this differently.

**Required:** A `loading` attribute on all appropriate components:
- `fluid-button[loading]`: shows spinner, disables interaction, morphs to loading shape
- `fluid-card[loading]`: shows skeleton overlay
- `fluid-list[loading]`: shows skeleton items
- `fluid-dialog[loading]`: shows spinner in header

The `aria-busy="true"` and `aria-disabled="true"` must be set automatically.

---

### M-05: No Error State Primitive

Similar to loading — a standard `error` state across components. A `fluid-card` that failed to load, a `fluid-list` with a fetch error, a `fluid-text-field` with a server-side validation error.

**Required:** An `error` attribute + `error-message` attribute on all appropriate components, with consistent visual treatment (destructive border, `fluid-alert-banner` inside the component).

---

### M-06: No Disabled Propagation

When a `fluid-form` or container is disabled (`fluid-fieldset[disabled]`), all descendant inputs should be disabled. HTML `<fieldset disabled>` provides this natively for native inputs. Custom Elements do not automatically receive this.

**Required:** `fluid-fieldset` (currently not in taxonomy) or a `disabled` propagation contract: when a container element has `disabled` set, it dispatches a `fluid:disabled-context` event that descendant form elements listen for and reflect. OR: use CSS `:disabled` selector on `:host-context(fluid-fieldset[disabled])` — but this is being deprecated in CSS.

The correct solution is the context protocol (D2-04): a `disabled-context` key that all form components request from their ancestors.

---

### M-07: No Animation Completion Promise / Callback

The document defines spring animations imperatively but provides no way to know when an animation is complete. The React/functional API has no `await` mechanism for motion.

**Required:**
```javascript
// Promise-based
await motion.animate(element, motion.emerge())
// Continues after spring settles

// Callback-based
motion.animate(element, motion.emerge(), { onComplete: () => focusButton() })

// In spring values
const val = spring(0, 'smooth').to(1)
await val.settled()
```

---

### M-08: No Resize-Responsive Glass Surface

When a glass component is resized (by the user or the viewport), the blur source rectangle changes. The squircle clip-path must be recalculated. The Houdini paint worklet rerenders automatically. But the background sampling `ResizeObserver` update must also retrigger.

Currently, `ResizeObserver` triggers background sampling re-computation. But for `OffscreenCanvas` background sampling, the 16×16 downsample target is for the element's full bounds — on resize, the bounds change and the sample region changes. This is handled if the sampling algorithm uses the element's current `getBoundingClientRect()` each time, which it should. Verify this is explicit in the implementation spec.

---

### M-09: No `fluid-fieldset` Component

Form grouping with a glass header and a disabled-propagation mechanism. Analogous to HTML `<fieldset>` but styled to Fluid. Needed for complex form layouts. Missing from taxonomy.

---

### M-10: No Tooltip Trigger Coordination

Multiple `fluid-tooltip` elements on a page — only one should be visible at a time (or a max of N). There is no singleton coordinator documented that manages mutual exclusivity.

**Required:** A `TooltipManager` singleton:
- Tracks open tooltips
- When a new tooltip opens, closes others (unless a `multi` attribute is set on the trigger region)
- Manages the delay before showing (300ms hover intent) globally

---

### M-11: `fluid-image` Has No Loading Strategy

`fluid-image` is listed but its loading strategy is undefined. For glass UI, images are frequently displayed behind or through glass surfaces — the loading experience matters significantly.

**Required:**
- `loading="lazy"` support (native browser lazy loading)
- Blur-up placeholder: a tiny base64 placeholder that blurs up to full resolution
- Skeleton placeholder: shows `fluid-skeleton` until loaded
- Error state: shows a glass-styled broken image
- The glass caption overlay must not be visible until the image is loaded

---

### M-12: No `prefers-color-scheme` Override Without `fluid-theme`

Currently, light/dark mode only works with a `fluid-theme` component in the tree. Consumers who have an existing app without `fluid-theme` wrapping everything need a way to globally force light or dark mode.

**Required:** `FluidTheme.setGlobalMode('dark')` as a static method that sets a CSS class on `document.documentElement`, which all Fluid component styles respond to.

---

## Summary Table

| ID | Category | Severity | Fix Phase |
|---|---|---|---|
| C2-01 | CSS relative colors at wrong tier | 🔴 Critical | Before Phase 0 ships |
| C2-02 | `color-mix()` at wrong tier | 🔴 Critical | Before Phase 0 ships |
| C2-03 | Spring not frame-rate normalized | 🔴 Critical | Before Phase 0 ships |
| C2-04 | `will-change` no ref counter | 🔴 Critical | Before Phase 1 ships |
| C2-05 | `--fluid-blur-current` never set | 🔴 Critical | Before Phase 1 ships |
| C2-06 | Scroll lock unspecified | 🔴 Critical | Before Phase 4 ships |
| C2-07 | Z-index stacking undefined | 🔴 Critical | Before Phase 4 ships |
| C2-08 | Velocity registry undefined | 🔴 Critical | Before Phase 0 ships |
| A2-01 | Nested glass visual artifacts | 🟡 Architecture | Before Phase 1 ships |
| A2-02 | SSR ledger has no Node.js strategy | 🟡 Architecture | Before Phase 0 ships |
| A2-03 | Portal theme inheritance undefined | 🟡 Architecture | Before Phase 3 ships |
| A2-04 | visibilitychange not handled | 🟡 Architecture | Before Phase 0 ships |
| A2-05 | Print media unaddressed | 🟡 Architecture | Before Phase 1 ships |
| A2-06 | Low-power device detection missing | 🟡 Architecture | Before Phase 1 ships |
| A2-07 | React Strict Mode double-invoke | 🟡 Architecture | Before Phase 6 ships |
| D2-01 | Controlled vs uncontrolled undefined | 🟠 DX | Before Phase 1 ships |
| D2-02 | Event naming ambiguity | 🟠 DX | Before Phase 0 ships |
| D2-03 | Button `type` for form submit | 🟠 DX | Before Phase 1 ships |
| D2-04 | Compound component comms undefined | 🟠 DX | Before Phase 1 ships |
| D2-05 | Render delegation undefined | 🟠 DX | Before Phase 5 ships |
| D2-06 | CSS injection via custom properties | 🟠 DX | Before Phase 0 ships |
| D2-07 | Event detail leakage | 🟠 DX | Before Phase 0 ships |
| D2-08 | FOUC not addressed | 🟠 DX | Before Phase 1 ships |
| D2-09 | Testing infrastructure undefined | 🟠 DX | Before Phase 0 ships |
| M-01 | No scroll snap coordination | 🟢 Missing | Phase 2 |
| M-02 | No drag constraint system | 🟢 Missing | Phase 0 (core) |
| M-03 | No focus ring system | 🟢 Missing | Phase 1 |
| M-04 | No loading state primitive | 🟢 Missing | Phase 1 |
| M-05 | No error state primitive | 🟢 Missing | Phase 1 |
| M-06 | No disabled propagation | 🟢 Missing | Phase 3 |
| M-07 | No animation completion signal | 🟢 Missing | Phase 0 (core) |
| M-08 | Resize-responsive glass unverified | 🟢 Missing | Phase 1 |
| M-09 | `fluid-fieldset` not in taxonomy | 🟢 Missing | Phase 3 |
| M-10 | Tooltip mutual exclusivity | 🟢 Missing | Phase 4 |
| M-11 | `fluid-image` loading strategy | 🟢 Missing | Phase 1 |
| M-12 | Global mode without `fluid-theme` | 🟢 Missing | Phase 0 (core) |
