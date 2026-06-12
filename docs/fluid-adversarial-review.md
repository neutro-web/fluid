# `@neutro/fluid` — Adversarial Self-Review
**Review of:** Foundation Document v0.2
**Status:** Pre-v0.3 revision input

Findings are organized by severity and category. Each finding identifies the section, the problem, and a resolution direction.

---

## 🔴 Critical — Bugs or Architectural Breaks

These would cause runtime failures, incorrect behavior, or violate stated guarantees.

---

### C-01: Ripple Canvas Is Not Shareable

**Section:** 2.6 / 3.7
**Problem:** The document states "Shared `OffscreenCanvas` singleton" for the ripple primitive. This cannot work. Ripples are spatially anchored to individual component bounds — origin point, clip mask, and size are all component-specific. A single canvas cannot simultaneously render ripples for multiple separate elements at different positions on the screen. The only way to do this is an absolutely-positioned full-page overlay canvas that maps component positions via `getBoundingClientRect` — which reintroduces layout thrash and is complex.

**Resolution:** Each component instance gets its own `<canvas>` element inside its shadow DOM, positioned as an `inset-0` overlay, `pointer-events: none`. Memory cost per component is negligible (~400 bytes). The "shared" optimization is premature.

---

### C-02: Background Sampling Cannot Sample Arbitrary HTML

**Section:** 2.7
**Problem:** The document states that an `OffscreenCanvas` "samples a 16×16 downscale of the background element behind the component." This is technically impossible in the general case. `OffscreenCanvas` can render `ImageBitmap`, `HTMLCanvasElement`, `HTMLVideoElement`, and `HTMLImageElement` via `drawImage`. It cannot render arbitrary DOM content, composite SVG backgrounds, gradient stacks, or other overlapping elements.

The actual capability:
- `getComputedStyle(root).backgroundColor` → solid color (works)
- `getComputedStyle(root).backgroundImage` → if it's a URL, fetch + draw to canvas (works, same-origin only)
- Complex gradient backgrounds → parse CSS gradient string (limited, fragile)
- Arbitrary composited DOM behind the component → **impossible without html2canvas or a dependency**

**Resolution:** Document the actual capability honestly. The background sampling algorithm reads the computed `background-color` of the nearest `fluid-theme` ancestor, with optional image sampling if the background is a simple image URL. For complex or gradient backgrounds, it falls back to `prefers-color-scheme`. Remove the claim that it "samples what's behind the component" — that is not what it does.

---

### C-03: Spring Solver Only Handles Underdamped Case

**Section:** IV
**Problem:** The document specifies "exact closed-form solution for underdamped springs." But springs exist in three regimes, each with a different closed-form:

- **Underdamped** (ζ < 1): oscillates — the formula documented
- **Critically damped** (ζ = 1): `x(t) = (A + Bt)e^(-ωt) + x_∞` — no oscillation, fastest settle
- **Overdamped** (ζ > 1): `x(t) = Ae^(r₁t) + Be^(r₂t) + x_∞` — slow settle from one direction

The `smooth` preset has `damping: 26, mass: 1.0, stiffness: 200` → ζ = 26 / (2√200) ≈ **0.92** — underdamped.
The `precise` preset has `damping: 32, mass: 0.8, stiffness: 500` → ζ = 32 / (2√400) = **0.80** — underdamped.

All five presets are underdamped, which is correct. But the solver must still handle all three regimes to avoid NaN when someone customises a preset beyond ζ = 1. The implementation must branch on the damping ratio.

**Resolution:** Implement all three cases in the solver. Add ζ computation and branch at the start of `stepSpring`.

---

### C-04: Spring Config Allows Division by Zero

**Section:** IV
**Problem:** If `mass = 0` or `stiffness = 0`, the spring formulas divide by zero (ω = √(stiffness/mass)). If `damping < 0`, the spring diverges. These are not type-level errors — they are valid numbers that produce `NaN` or `Infinity` silently at runtime.

**Resolution:** Runtime validation in `FluidElement.onMount()` (or wherever the spring is configured):
```typescript
function validateSpringConfig(cfg: SpringConfig): void {
  if (cfg.mass <= 0)      throw new FluidError(`Spring mass must be > 0, got ${cfg.mass}`)
  if (cfg.stiffness <= 0) throw new FluidError(`Spring stiffness must be > 0, got ${cfg.stiffness}`)
  if (cfg.damping < 0)    throw new FluidError(`Spring damping must be >= 0, got ${cfg.damping}`)
}
```
In production, clamp silently and log once. In dev, throw hard.

---

### C-05: `formAssociated = true` Missing

**Section:** VIII
**Problem:** For Custom Elements to participate in `<form>` submission and constraint validation, they must declare `static formAssociated = true`. Without this, `ElementInternals` does not expose form-control capabilities (`setFormValue`, `setValidity`, `reportValidity`). This is not mentioned in the document.

**Resolution:** All input-type components (`fluid-text-field`, `fluid-checkbox`, `fluid-radio`, `fluid-switch`, `fluid-slider`, `fluid-select`, etc.) must set:
```javascript
class FluidTextField extends FluidElement {
  static formAssociated = true
}
```
This must be enforced in the base class or a `FormControlMixin`.

---

### C-06: Custom Elements Duplicate Registration Throws

**Section:** XIII / Package
**Problem:** `customElements.define(name, class)` throws `NotSupportedError` if the name is already registered — which happens if two versions of `@neutro/fluid` are loaded, or if a consumer calls `define()` twice. No guard is documented.

**Resolution:** All `define()` calls must be guarded:
```javascript
static define(name = 'fluid-button') {
  if (!customElements.get(name)) {
    customElements.define(name, this)
  }
}
```

---

### C-07: `Grow`/`Shrink` Motions Cause Layout Recalculation

**Section:** II.5 / XIV
**Problem:** The document guarantees "all spring animations use `transform` and `opacity` only (compositor-eligible)" but the `Grow`/`Shrink` motions animate `height`. Animating `height` triggers layout recalculation every frame — a direct violation of the stated guarantee.

**Resolution:**
- **Crystalline+:** Use `clip-path` (clipping a known max-height): `clip-path: inset(0 0 100% 0)` → `inset(0 0 0% 0)`. Does not trigger layout.
- **Frosted/Matte:** `max-height` from 0 to a large value (the classic hack). Triggers layout but is the only CSS-only option.
- Correct the "no layout thrash" guarantee: `transform` and `opacity` by default; height-based animations use clip-path at Crystalline+ and max-height as a fallback. Acknowledge the Frosted/Matte trade-off.

---

### C-08: FLIP Animation Contradicts "No `getBoundingClientRect` in Loops"

**Section:** V.2 / XIV
**Problem:** The FLIP technique requires two synchronous `getBoundingClientRect()` calls — before and after the DOM mutation. This is mandatory and unavoidable. The performance section's statement "No synchronous `getBoundingClientRect()` in animation loops" is violated by FLIP.

**Resolution:** Qualify the statement: "No `getBoundingClientRect()` inside `requestAnimationFrame` callbacks. FLIP reads positions outside of rAF — before and after the DOM mutation — which is correct. Avoid `getBoundingClientRect()` inside rAF loops." Document FLIP as an explicit, acceptable exception.

---

## 🟡 Architecture / Design Issues

Correct these before implementation begins — they affect the design at a structural level.

---

### A-01: Ledger Init Has Async vs Sync Timing Conflict

**Section:** III.2
**Problem:** Houdini worklet registration and some capability checks are async. But Custom Elements upgrade synchronously (the constructor and `connectedCallback` run during parsing). A component that upgrades before the ledger's async checks complete will incorrectly use a lower tier.

**Resolution:** Two-phase ledger:
1. **Sync phase** (before any component can mount): `CSS.supports()`, `in` operator checks, `typeof` checks. This produces a conservative tier estimate available synchronously.
2. **Async phase** (microtask + worklet registration): upgrades the tier if higher-fidelity capabilities are confirmed. Any mounted component listens for a `fluidledger:upgrade` event and re-initializes its material renderer if the tier changed.

The sync phase covers 95% of cases correctly. The async upgrade handles the Optical tier's worklet registration.

---

### A-02: Context Recession Triggers Composite Layer on Matte Tier

**Section:** III.5
**Problem:** The recession effect applies `scale(0.98)` to background content. Any CSS `transform` on an element promotes it to its own GPU composite layer. On low-end devices (Matte tier), scaling the entire app background creates a new composite layer for a large DOM tree, which may exceed GPU memory or cause dropped frames on the transition itself.

**Resolution:** Recession must be tier-gated:
- **Optical/Crystalline:** Full recession (scale + opacity + background blur increase)
- **Frosted:** Opacity recession only (no scale)
- **Matte:** Scrim overlay only (no transform on background content at all)

---

### A-03: Context Recession Scoping Not Defined

**Section:** III.5
**Problem:** "Secondary content must visually recede" — but recede relative to what? In a complex dashboard with multiple modals, drawers, and focused inputs, recession could cascade: A opens → B recedes. B opens → A recedes further. This creates a compounding dimness problem.

**Resolution:** Recession applies only within the **immediate spatial scope** of the triggering element:
- Modal/sheet open: recedes only the direct content layer beneath it (not other overlays at the same or higher layer)
- Input focus recession: recedes siblings within the same `fluid-card` or `fluid-form` — not the entire page
- Scroll recession: applies to the nav bar within the same scrollable region — not global chrome
- Maximum cumulative recession: `opacity` floor of `0.5` — nothing goes darker regardless of nesting

---

### A-04: Single rAF Loop Not Specified

**Section:** IV / XIV
**Problem:** If 50 list items stagger in simultaneously, there are 50 independent `requestAnimationFrame` loops running. Each loop calls `requestAnimationFrame`, runs the spring calculation, commits via WAAPI, and schedules the next frame. This is 50 rAF callbacks per frame versus the optimal 1.

**Resolution:** A singleton `AnimationDriver` that:
1. Maintains a registry of all active spring instances
2. Runs a single `requestAnimationFrame` loop while any springs are active
3. On each frame, advances all registered springs and commits their values
4. Cancels the rAF loop when all springs are settled

```typescript
class AnimationDriver {
  private springs = new Map<SpringInstance, () => boolean>()  // returns true when settled
  private rafId: number | null = null

  register(spring: SpringInstance, onUpdate: () => boolean): void
  deregister(spring: SpringInstance): void
  private tick(timestamp: number): void
}
```

This is the most important performance fix in the library.

---

### A-05: DSD Hydration Guard Missing

**Section:** VIII
**Problem:** Declarative Shadow DOM (DSD) renders the shadow root in HTML during SSR. On the client, the Custom Elements upgrade runs `connectedCallback`, which currently creates a new shadow root. If the DSD shadow root already exists, this will throw `InvalidStateError: The operation is not supported`.

**Resolution:** In `FluidElement.connectedCallback()`:
```javascript
connectedCallback() {
  // Do not re-create shadow root if DSD already provided one
  this.root = this.shadowRoot ?? this.attachShadow({ mode: 'open' })
  // ...
}
```

---

### A-06: `process.env.NODE_ENV` Not Universal

**Section:** XIII
**Problem:** Dev-mode warning stripping via `process.env.NODE_ENV !== 'production'` assumes a Node.js/bundler context. In a CDN or no-bundler environment, `process` is not defined, which throws a `ReferenceError`.

**Resolution:** Use `globalThis.__FLUID_DEV__` as the sentinel, defaulting to `false`:
```javascript
const DEV = typeof globalThis !== 'undefined' && globalThis.__FLUID_DEV__ === true
```
Consumers set `globalThis.__FLUID_DEV__ = true` before importing in development. Bundlers can replace this with a constant at build time. CDN users can set it in a script tag.

---

### A-07: CSP Incompatibility with Blob URL Worklets

**Section:** III.6
**Problem:** Houdini worklets registered via `CSS.paintWorklet.addModule('blob:...')` require `blob:` in the `Content-Security-Policy: script-src` directive. Enterprise applications typically have strict CSP that excludes blob URLs. This is a silent failure — the worklet silently does not register, and the tier silently falls back to Crystalline. If not documented, this will be a confusing debugging experience.

**Resolution:**
1. The ledger must catch worklet registration failure and log a dev warning: `[fluid] Houdini worklet registration failed (CSP?). Falling back to Crystalline tier.`
2. Document a CSP-compatible alternative: serve the worklet file at a known URL from the consumer's origin and set `FLUID_WORKLET_URL` to point to it.
3. Provide the worklet as a separate file at `@neutro/fluid/worklets/glass-paint.js` for consumers who want to serve it from their own origin.

---

## 🟠 DX / API Gaps

Issues that will cause friction, confusion, or bugs in day-to-day usage.

---

### D-01: Functional / Builder API Is Not Defined

**Section:** XIII
**Problem:** The user explicitly asked for a functional, approachable style. The document has no programmatic component creation API. Developers who do not want to write HTML strings or use a framework adapter have no way to create Fluid components functionally.

**Resolution:** A fluent builder API on top of the Custom Elements foundation:

```javascript
import { fluid } from '@neutro/fluid'

// Element construction
const btn = fluid
  .button({ variant: 'primary', spring: 'snappy' })
  .label('Save changes')
  .icon({ name: 'check' })
  .on('fluid:press', handleSave)
  .appendTo(document.body)

// Chainable, returns the element for further use
const card = fluid
  .card({ layer: 'raised' })
  .children([
    fluid.button({ variant: 'primary' }).label('Confirm'),
    fluid.button({ variant: 'secondary' }).label('Cancel')
  ])
```

Motion composition as functional pipelines:
```javascript
import { motion } from '@neutro/fluid/core'

// Compose named motions
const enterSequence = motion.sequence([
  motion.emerge(),
  motion.stagger(items, { delay: 32 })
])
enterSequence.play()

// Reactive spring values
const opacity = motion.spring(0, 'snappy')
opacity.to(1)
opacity.subscribe(v => (element.style.opacity = v))

// Scroll-linked bindings
const scroll = motion.scrollProgress(container)
motion.bind(header, 'opacity', scroll, { from: 1, to: 0, clamp: true })
```

This does not replace the Custom Elements API — it is a functional layer on top of it.

---

### D-02: Morphing Icon API Undefined

**Section:** XII / XI
**Problem:** `fluid-morphing-icon` is listed in the taxonomy but its API is never defined. How does a consumer specify the source and target paths? How are named variants defined?

**Resolution:**

```html
<!-- Built-in named pairs (shipped with Fluid icons) -->
<fluid-morphing-icon pair="play-pause" state="play"></fluid-morphing-icon>

<!-- Custom paths via slots (escape hatch) -->
<fluid-morphing-icon>
  <svg slot="default"><!-- default icon path --></svg>
  <svg slot="active"><!-- active icon path --></svg>
</fluid-morphing-icon>
```

Transition between states:
```javascript
iconElement.setAttribute('state', 'active')  // triggers spring morph
```

---

### D-03: RTL (Right-to-Left) Support Not Addressed

**Section:** Entire document
**Problem:** No mention of right-to-left language support. This affects: directional animations (slide-in from wrong side), breadcrumb separator direction, back button direction, specular highlight direction (`(-0.3, -0.7)` should flip), swipe gesture semantics, timeline direction.

**Resolution:**
- All directional properties must use CSS logical properties: `margin-inline-start` not `margin-left`, `inset-inline-start` not `left`
- The light source x-component flips in RTL: `--fluid-light-x` changes sign
- RTL is detected via `:dir(rtl)` CSS selector and `document.dir`
- `fluid-theme` emits a `--fluid-dir: 1` (LTR) / `--fluid-dir: -1` (RTL) custom property that directional CSS can use via `calc()`

---

### D-04: i18n for Built-in Text Not Addressed

**Section:** X / XI
**Problem:** Several components have built-in text: `fluid-date-picker` (month/day names), `fluid-file-upload` ("Drop files here"), `fluid-search-bar` (placeholder), error messages in `fluid-text-field`. None have an i18n story.

**Resolution:**
- All built-in user-visible strings are exposed as attributes with sensible English defaults
- An i18n adapter: `FluidI18n.use(locale, translations)` registers a global translation map
- Components read from the translation map if available, fall back to attribute values, fall back to English defaults
- Document the full list of localizable strings per component

---

### D-05: Layer Assignment Too Rigid

**Section:** VII
**Problem:** "Layer assignments are fixed at authoring time — consumers cannot move components between layers." This is too absolute. `fluid-card` is at Layer 1, but a consumer building a drag-and-drop card that floats above everything needs it at Layer 3 temporarily during drag.

**Resolution:** Distinguish permanent assignment from contextual elevation:
- **Default layer:** set by the component, defines normal rendering
- **Contextual elevation:** wrapping in `fluid-portal` with a specified layer promotes the component to that layer for the duration of its presence in the portal
- During drag (Float motion), the dragging element is automatically elevated to Overlay layer via an internal portal — this is handled by the gesture system, not the consumer

---

### D-06: Locked Token Override Has No Principled Escape Hatch

**Section:** VI.1
**Problem:** Locked tokens "cannot be overridden." But a legitimate use case exists: a thick frosted-glass modal serving as a hero backdrop should have more blur than `--fluid-blur-thick: 40px`. Flat prohibition without an escape hatch forces hacky workarounds.

**Resolution:** Introduce `--fluid-[token]-override` variants that require explicit documentation acknowledgment:
```css
fluid-theme {
  /* Override requires acknowledging physics deviation */
  --fluid-blur-thick-override: 60px;
}
```
Dev mode logs: `[fluid] --fluid-blur-thick-override set to 60px. This deviates from the physical thickness model. Ensure vibrancy and tint alpha are also adjusted accordingly.`
Not forbidden — discouraged with context.

---

### D-07: `sideEffects` Not Specified for Webpack

**Section:** XIII
**Problem:** Webpack requires `"sideEffects"` in `package.json` to correctly tree-shake side-effect imports. Without it, webpack may incorrectly eliminate side-effect component imports or, with `sideEffects: false`, incorrectly eliminate them all.

**Resolution:**
```json
{
  "sideEffects": [
    "./src/components/**/*.ts",
    "./src/tokens/**/*.css",
    "./src/core/index.ts"
  ]
}
```

---

### D-08: `fluid-theme` Attribute Validation Not Specified

**Section:** VIII.4
**Problem:** `<fluid-theme brand-hue="banana">` — what happens? Silent default fallback? Console error? Component is currently documented with no validation behavior.

**Resolution:** `fluid-theme` validates all attributes in `attributeChangedCallback`:
```javascript
if (isNaN(Number(value)) || Number(value) < 0 || Number(value) > 360) {
  if (DEV) console.warn(`[fluid] brand-hue "${value}" is invalid. Expected 0–360.`)
  return  // keep previous valid value
}
```

---

### D-09: DeviceMotion Permission Request Not Handled

**Section:** II.5 (Tilt motion)
**Problem:** iOS 13+ requires a user gesture to call `DeviceMotionEvent.requestPermission()`. The tilt feature is opt-in but the document does not specify how permission is requested or what happens when denied.

**Resolution:**
- `<fluid-theme tilt>` is opt-in at the theme level
- `fluid-theme` does not auto-request permission — it waits for a user gesture
- `FluidTilt.enable()` is an imperative API called from a button handler: calls `DeviceMotionEvent.requestPermission()`, handles `granted`/`denied`
- On `denied`: tilt feature silently stays disabled
- On browsers that don't require permission (non-iOS): auto-enabled when `tilt` attribute is set

---

## 🟢 Refinements and Minor Gaps

---

### R-01: Color Chroma in oklch Is Hue-Dependent

**Section:** VI.5
**Problem:** The color scale uses hardcoded chroma values (`oklch(0.97 0.04 ...)`). In oklch, maximum achievable chroma varies significantly by hue and lightness. Purple at `oklch(0.97 0.04 280)` might appear muted while yellow at the same values is vivid. A uniform chroma produces perceptually uneven palettes.

**Resolution:** Use CSS relative colors to derive the scale relative to the base:
```css
--fluid-color-brand-50: oklch(from var(--fluid-color-brand) 0.97 calc(c * 0.3) h);
--fluid-color-brand-100: oklch(from var(--fluid-color-brand) 0.93 calc(c * 0.5) h);
```
This preserves the source hue and proportionally scales chroma, producing perceptually consistent scales regardless of hue.

---

### R-02: IOR Token Needs Concrete Mapping Documentation

**Section:** II.1
**Problem:** `--fluid-ior: 0.012` is stated as a "web-safe IOR" with no explanation of what 0.012 actually means in rendering terms. The relationship between the token and the `feDisplacementMap scale` parameter is implicit.

**Resolution:** Document the concrete mapping:
```
feDisplacementMap scale = --fluid-ior × element_dimension (px)

Example: 200px element, IOR = 0.012
scale = 0.012 × 200 = 2.4px displacement — perceptible, physically plausible
```

---

### R-03: Typography Weight Compensation Should Scale with Blur

**Section:** IX
**Problem:** "Minimum body weight over glass: 500" is a binary rule. A 2px blur (tooltip, thin material) does not need the same weight compensation as a 40px blur (modal, thick material). Binary threshold is both too aggressive for thin glass and insufficient for very thick glass.

**Resolution:**
```css
/* Dynamic weight compensation via CSS clamp */
--fluid-font-weight-body-on-glass: clamp(
  400,
  calc(400 + (var(--fluid-blur-current, 20) - 8) * 5),
  600
);
/* At blur 8px → weight 460, at blur 20px → weight 460+60=520, at blur 40px → 560 */
```

---

### R-04: Missing Components

Not in current taxonomy but present in comparable design systems:
- `fluid-otp-input` — one-time password input (critical for auth flows)
- `fluid-code-block` — syntax-highlighted code on glass surface
- `fluid-empty-state` — illustrated empty state with CTA
- `fluid-number-input` — free-form numeric input (different from stepper)
- `fluid-menu` + `fluid-menu-item` — persistent navigation menu (not ephemeral dropdown)
- `fluid-spotlight` — directional light effect (dropped from v0.1 → v0.2 without explanation)

Unique glass-native components dropped from v0.1 without explanation:
- `fluid-spotlight` — restore. The directional light effect on glass is a genuine glass-native primitive.

---

### R-05: `fluid-scroll-view` Keyboard Navigation Must Be Explicitly Implemented

**Section:** III.7
**Problem:** "Keyboard scrolling is fully implemented regardless of tier." When native scroll is replaced with `overflow: hidden` + pointer event tracking, ALL native scroll keyboard behavior is lost: arrow keys, Page Up/Down, Home/End, spacebar. Re-implementing this is non-trivial and must be specified, not just stated.

**Resolution:** `fluid-scroll-view` must:
- Set `tabindex="0"` on the scroll container to make it focusable
- Handle `keydown` events for all scroll keys
- Map `ArrowDown`/`ArrowUp` → single-line scroll, `PageDown`/`PageUp` → viewport scroll, `Home`/`End` → first/last position
- Match browser scroll acceleration behavior (hold to accelerate)

---

### R-06: Specular Highlight Must Flip in RTL

**Section:** II.7 / D-03
**Problem:** Light source at `(−0.3, −0.7)` (above-left) is a LTR convention. In RTL layouts where the reading direction is right-to-left, the specular highlight should mirror to above-right `(+0.3, −0.7)` to feel natural.

**Resolution:**
```css
--fluid-light-x: -0.3;
/* RTL override */
[dir="rtl"] fluid-theme, :dir(rtl) fluid-theme {
  --fluid-light-x: 0.3;
}
```

---

### R-07: Accessibility — Missing ARIA for New/Unlisted Components

**Section:** X
**Problem:** Several components added in this document are not in the ARIA table:
- `fluid-speed-dial` → main: `button`; expanded actions: `menu` + `menuitem`
- `fluid-live-activity` → `status` with `aria-live="polite"`
- `fluid-glass-image` → `img` with `alt`
- `fluid-morphing-icon` → `aria-hidden="true"` when decorative within labelled parent
- `fluid-command-palette` (composition) → `dialog` containing `combobox`
- `fluid-kanban` (composition) → `grid` with `gridcell`, drag handled via `aria-roledescription` + keyboard D&D pattern

---

### R-08: Virtual List + Custom Scroll Integration Not Specified

**Section:** XI (Compositions) / III.7
**Problem:** `fluid-virtual-list` uses windowing (renders only visible rows). `fluid-scroll-view` replaces native scroll. These two features must integrate: the virtual list needs to know the scroll offset to compute which rows are visible. The integration point is not specified.

**Resolution:** `fluid-scroll-view` exposes a `scrollOffset` reactive value:
```javascript
scrollView.scrollOffset.subscribe(offset => virtualList.updateWindow(offset))
```
`fluid-virtual-list` uses `fluid-scroll-view` internally by default. If a custom `fluid-scroll-view` is provided as a parent, the list connects to it. Falls back to native scroll offset via `scroll` event listener.

---

## Summary — Priority Order for v0.3

**Fix before any implementation:**
C-01 (ripple canvas), C-02 (background sampling honesty), C-03/C-04 (spring solver completeness), C-05 (formAssociated), C-06 (duplicate registration), C-07 (height animation / layout guarantee), A-04 (single rAF loop), D-01 (functional API must be defined), D-03 (RTL logical properties throughout)

**Fix before Phase 1 ships:**
C-08, A-01, A-02, A-03, A-05, A-06, A-07, D-02, D-05, D-07, D-08, D-09

**Fix before Phase 3 ships:**
D-04 (i18n), D-06 (locked token override), R-01 (oklch chroma), R-02 (IOR docs), R-05 (keyboard scroll), R-06 (RTL specular)

**Backlog (known, scheduled):**
R-03, R-04, R-07, R-08
