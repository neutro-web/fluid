# `@neutro/fluid` — Foundational Design Document
**Version:** 0.5 — All findings from three adversarial reviews resolved
**Status:** Architecture and physics locked. Monorepo structure confirmed. Agent context strategy defined. Ready for Phase 0 implementation.

**Changelog from v0.4:**
- Critical: Spring settling threshold changed from absolute (0.001) to relative (0.1% of range)
- Critical: Velocity clamping and unit normalization added to `startSpring`
- Critical: `setPointerCapture` added to drag gesture (was completely missing — drag broken without it)
- Critical: ARIA ID collision in SSR resolved via stable ID generation utility
- Critical: Module federation singletons use `Symbol.for()` global registry
- Critical: `fluidtheme:change` now has a concrete dispatch mechanism via MutationObserver
- Architecture: View Transitions concurrent race — transition lock added
- Architecture: Toast live region pacing — `ToastManager` singleton specified
- Architecture: Multi-touch policy defined per component type
- Architecture: `fluid-nav-bar` shrink behaviour fully specified
- Architecture: `fluid-sheet` dismiss threshold and snap points specified
- DX: Attribute vs property convention documented
- DX: Slot contract format defined (template per component)
- DX: `fluid:mounted`/`fluid:unmounted` lifecycle events added
- DX: Long-press vs drag disambiguation rule (8px threshold)
- DX: `fluid-toast` imperative API specified
- DX: Dialog open/close race condition contract defined
- DX: API stability tiers (`@stable`, `@experimental`, `@internal`) defined
- Missing: Skip links in `fluid-nav-bar`
- Missing: Back button / History API integration for overlays
- Missing: Streaming SSR / React Server Components guidance
- Missing: Bidirectional text handling in inputs
- Missing: Deprecation and migration strategy
- Missing: Performance budget per component
- Missing: `fluid-data-grid` composition architecture note
- Package: Monorepo structure clarified — single `@neutro/fluid` package with subpath exports; heavy compositions are separate packages
- Agent context: `AGENTS.md` (tool-agnostic) + `CLAUDE.md` (Claude Code specifics)

---

## I. Identity & Philosophy

### The Core Thesis

**Fluid is a physical material system for the web. Not a design style. Not a CSS library. A physics-grounded material that happens to render in a browser.**

Glass is a substance with measurable optical and physical properties: it refracts light, reflects at angles, transmits with blur, absorbs tint, deforms under pressure, flows under surface tension, and stretches elastically when pulled beyond its boundary. Every element in Fluid is made of glass, is behind glass, or is interacting with glass.

### Design Axioms

1. **Physics first.** Every visual property maps to a physical property. Effects serving only aesthetic purposes without communicating state, physics, or information are forbidden.
2. **The material is consistent.** Glass at any capability tier must feel like glass. A flat opaque rectangle is not glass.
3. **Motion communicates.** Every animation communicates state change, spatial relationship, or physical response. Decoration alone is forbidden.
4. **Accessibility is a rendering tier.** `prefers-reduced-motion`, `prefers-contrast`, `prefers-reduced-transparency` are first-class rendering targets.
5. **Content is primary.** Glass recedes; content leads.
6. **Escape hatches must be principled.** Any physics override is documented with a reason and a dev-mode warning.
7. **Context recession is mandatory.** When any element comes to the foreground, secondary content must visually recede.
8. **The physics are non-negotiable. The aesthetics are yours.** Fluid is opinionated on springs, blur, refraction, and recession. Agnostic on colour, typography, and radius scale.

### The "Feels Alive" Test

Before any component ships: **Does this component communicate something physical about its state that text or colour alone could not communicate as effectively?**

---

## II. The Physical Model

### 2.1 Light Physics

**Refraction (IOR):** `--fluid-ior: 0.012` — maps to `feDisplacementMap scale = IOR × element_px` (e.g., 200px → 2.4px displacement). Primitive: Houdini Paint (Optical), SVG filter (Crystalline), omitted (Frosted/Matte).

**Reflection (Fresnel):** `--fluid-fresnel-strength: 0.18`. Primitive: `@property + paint()` (Optical), CSS gradient (Frosted+).

**Transmission & Blur:**
```
--fluid-blur-thin:    8px
--fluid-blur-regular: 20px
--fluid-blur-thick:   40px
```
Primitive: `backdrop-filter: blur()` (Frosted+).

**Chromatic Aberration:** `--fluid-dispersion: 0.4px`. Primitive: SVG `feColorMatrix + feOffset` (Crystalline+).

**Vibrancy:** `--fluid-vibrancy: 1.8`. Primitive: `backdrop-filter: saturate()` (Frosted+).

### 2.2 Material Properties

| Preset | Blur | Tint Alpha | Fresnel | Use |
|---|---|---|---|---|
| `thin` | 8px | 0.55 | 0.12 | Tooltips, chips |
| `regular` | 20px | 0.65 | 0.18 | Buttons, cards, nav |
| `thick` | 40px | 0.75 | 0.24 | Modals, sheets |

**Clarity:** `clear | frosted | tinted`. **Surface tension:** `--fluid-tension-stiffness`.

### 2.3 Elastic Deformation

`displacement = maxDisplacement × (1 − e^(−pull / maxDisplacement))`

Token: `--fluid-elasticity-max: 64px`. Spring-back: `bouncy`. Applies to: scroll edges, drag-beyond-bounds, swipe snap-back, pinch limits.

### 2.4 Motion Physics — The Spring System

**Why springs:** Springs preserve velocity across interruptions. A spring starting with `velocity₀ ≠ 0` feels continuous; a bezier starting from rest feels like a cut. This is the defining quality difference from every other web component library.

#### Spring Solver

Exact closed-form solution. All three damping regimes implemented:
```
ζ = damping / (2 × √(stiffness × mass))

Underdamped  (ζ < 1): x(t) = e^(−ζωt)[A·cos(ωdt) + B·sin(ωdt)] + x∞
Critically   (ζ = 1): x(t) = (A + Bt)e^(−ωt) + x∞
Overdamped   (ζ > 1): x(t) = Ae^(r₁t) + Be^(r₂t) + x∞
```

**Runtime validation** (dev: throw, production: clamp + log once):
```typescript
function validateSpringConfig(cfg: SpringConfig): void {
  if (cfg.mass <= 0)      throw FluidError('mass must be > 0')
  if (cfg.stiffness <= 0) throw FluidError('stiffness must be > 0')
  if (cfg.damping < 0)    throw FluidError('damping must be >= 0')
}
```

#### Named Presets

```
snappy   → mass: 0.5, stiffness: 400, damping: 28  (ζ ≈ 0.99)
bouncy   → mass: 1.0, stiffness: 300, damping: 20  (ζ ≈ 0.58)
gentle   → mass: 1.0, stiffness: 120, damping: 20  (ζ ≈ 0.91)
smooth   → mass: 1.0, stiffness: 200, damping: 26  (ζ ≈ 0.92)
precise  → mass: 0.8, stiffness: 500, damping: 32  (ζ ≈ 0.80)
```

#### AnimationDriver — Single Shared rAF Loop

```typescript
class AnimationDriver {
  private active = new Map<symbol, SpringTask>()
  private rafId: number | null = null
  private lastTimestamp: number | null = null

  register(id: symbol, task: SpringTask): void {
    this.active.set(id, task)
    if (!this.rafId) this.rafId = requestAnimationFrame(this.tick)
  }

  deregister(id: symbol): void {
    this.active.delete(id)
    if (this.active.size === 0 && this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  private tick = (timestamp: number): void => {
    // Frame-rate independence: use real dt, capped at 64ms (2 missed frames)
    const dt = this.lastTimestamp !== null
      ? Math.min((timestamp - this.lastTimestamp) / 1000, 0.064)
      : 0.016
    this.lastTimestamp = timestamp

    for (const [id, task] of this.active) {
      const settled = task.advance(dt)  // real seconds passed
      if (settled) this.active.delete(id)
    }

    if (this.active.size > 0) {
      this.rafId = requestAnimationFrame(this.tick)
    } else {
      this.rafId = null
      this.lastTimestamp = null
    }
  }
}

// Module-federation-safe singleton: Symbol.for() resolves the same symbol across
// multiple copies of the module loaded in the same browsing context.
const DRIVER_KEY = Symbol.for('neutro.fluid.driver')
if (!(globalThis as any)[DRIVER_KEY]) (globalThis as any)[DRIVER_KEY] = new AnimationDriver()
export const driver: AnimationDriver = (globalThis as any)[DRIVER_KEY]
```

**Visibility handling:** The AnimationDriver pauses when the tab is hidden and resumes without a large dt jump when the tab returns:
```typescript
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.rafId = null
    this.lastTimestamp = null  // resets dt to 16ms on resume — no giant step
  } else {
    if (this.active.size > 0) this.rafId = requestAnimationFrame(this.tick)
  }
})
```

#### Velocity Registry

Per-element animation state registry — the mechanism that enables velocity preservation:

```typescript
interface ActiveAnimation {
  springState: SpringState  // { value, velocity }
  target: number
  property: string
  config: SpringConfig
  settledPromise: Promise<void>
  settle: () => void  // resolves settledPromise
}

const activeAnimations = new WeakMap<Element, Map<string, ActiveAnimation>>()

export function startSpring(
  el: Element,
  property: string,
  target: number,
  config: SpringConfig,
  options?: {
    velocityScale?: number  // normalize gesture velocity units to property units (e.g., 0.001 for opacity)
    maxVelocity?: number    // clamp abs(velocity) to this before applying (prevents Infinity on fast flicks)
  }
): Promise<void> {
  const existing = activeAnimations.get(el)?.get(property)

  // Velocity preservation: carry forward from interrupted animation
  let initialVelocity = existing?.springState.velocity ?? 0
  // Clamp and scale velocity — prevents Infinity/NaN from fast gestures or unit mismatches
  const maxV = options?.maxVelocity ?? 2000
  initialVelocity = Math.max(-maxV, Math.min(maxV, initialVelocity))
  if (options?.velocityScale) initialVelocity *= options.velocityScale

  const initialValue = existing?.springState.value ?? parseCurrentValue(el, property)

  let resolve!: () => void
  const settled = new Promise<void>(r => { resolve = r })

  const animation: ActiveAnimation = {
    springState: { value: initialValue, velocity: initialVelocity },
    target, property, config,
    settledPromise: settled,
    settle: resolve
  }

  if (!activeAnimations.has(el)) activeAnimations.set(el, new Map())
  activeAnimations.get(el)!.set(property, animation)

  WillChangeManager.acquire(el)

  const id = Symbol()
  // Relative threshold: 0.1% of range, min 0.0001, max 0.5
  // Prevents both premature settlement on tiny ranges and late settlement on large ones
  const range = Math.abs(target - initialValue) || 1
  const posThreshold = Math.min(Math.max(range * 0.001, 0.0001), 0.5)
  const velThreshold = posThreshold * 2

  driver.register(id, {
    advance(dt: number): boolean {
      animation.springState = stepSpring(config, animation.springState, target, dt)
      applyValue(el, property, animation.springState.value)
      const settled = Math.abs(animation.springState.value - target) < posThreshold &&
                      Math.abs(animation.springState.velocity) < velThreshold
      if (settled) {
        driver.deregister(id)
        WillChangeManager.release(el)
        animation.settle()
        activeAnimations.get(el)?.delete(property)
      }
      return settled
    }
  })

  return settled
}
```

#### WillChangeManager (Reference Counter)

```typescript
const willChangeRefs = new WeakMap<Element, number>()

export const WillChangeManager = {
  acquire(el: Element): void {
    const count = (willChangeRefs.get(el) ?? 0) + 1
    willChangeRefs.set(el, count)
    if (count === 1) el.style.setProperty('will-change', 'transform, opacity')
  },
  release(el: Element): void {
    const count = Math.max((willChangeRefs.get(el) ?? 1) - 1, 0)
    willChangeRefs.set(el, count)
    if (count === 0) el.style.removeProperty('will-change')
  }
}
```

#### Animation Completion Signal

```typescript
// Promise-based
await startSpring(el, 'opacity', 1, SPRING_PRESETS.smooth)

// In the functional API
await motion.animate(element, motion.emerge())

// Reactive spring value
const val = spring(0, 'smooth')
val.to(1)
await val.settled()
```

### 2.5 The Full Motion Catalogue

Motion primitives are callable via `motion.*` (see `packages/fluid/src/core/motion.ts`). Each returns a `MotionDef` passed to `motion.animate(el, def)`. Every primitive has a defined spring preset — component specs reference primitives by name, not by ad-hoc spring values.

**Three categories of motion — keep these distinct when authoring specs:**

| Category | Name | How invoked | Spring-driven? |
|---|---|---|---|
| **Motion primitive** | `emerge`, `depress`, etc. | `motion.emerge()` | Yes |
| **Interaction physics** | Ripple, Pressure deformation, Elastic | `FluidGesture.*` / automatic | No (canvas / CSS) |
| **CSS animation** | Shimmer, Spin | CSS `@keyframes` | No |

#### Motion Primitives

| Primitive | Property path | From → To | Spring preset | Notes |
|---|---|---|---|---|
| `emerge` | `scale` + `opacity` | `0.92→1.0` + `0→1` | `smooth` | Entry animation for surfaces |
| `recede` | `scale` + `opacity` | `1.0→0.92` + `1→0` | `smooth` | Exit animation |
| `rise` | `translateY` + shadow | `-4px` shift + shadow grow | `smooth` | Elevation increase |
| `sink` | `translateY` + shadow | reverse of `rise` | `smooth` | Elevation decrease |
| `expand` | `clip-path` (Crystalline+) / `max-height` (Frosted) | `0 → content height` | `smooth` | Open/reveal |
| `collapse` | `clip-path` / `max-height` | `content height → 0` | `smooth` | Close/hide |
| `float` | `scale` + `translateY` | `1.0→1.04` + `0→-8px` | `bouncy` | Tooltip/popover appear |
| `settle` | `scale` + `translateY` | reverse of `float` | `gentle` | Return to rest |
| `depress` | `scale` | `1.0→0.96` | `snappy` | Press down (primary) |
| `release` | `scale` | `0.96→1.0` | `bouncy` | Spring back from press |
| `pulse` | `scale` | `1.0→1.06→1.0` (one oscillation) | `bouncy` | Attention pulse |
| `shake` | `translateX` | `0→-6→6→-4→4→0px` | `snappy` | Error shake |
| `grow` | `scale` | `current → target` | `smooth` | Size increase |
| `shrink` | `scale` | `current → target` | `smooth` | Size decrease |

`depress`/`release` scale values for secondary variant: `0.98` / `1.0` (less aggressive than primary).

#### Interaction Physics (§2.6) — Named for Spec Reference, Not Directly Callable

| Name | What it is | Tier |
|---|---|---|
| `Ripple` | Per-instance `<canvas>` ink ripple on press; spatially anchored | Frosted+ |
| `PressDeform` | Scale deformation on pointer down — uses `depress`/`release` primitives | All |
| `ElasticDeform` | Exponential resistance past bounds (`--fluid-elasticity-max: 64px`) | All |
| `InertialScroll` | Momentum decay after scroll release (`--fluid-scroll-friction: 0.95`) | Crystalline+ |

#### CSS Animations — Not Spring-Driven

| Name | Used by | `prefers-reduced-motion` |
|---|---|---|
| `Shimmer` | `fluid-skeleton` — gradient sweep `@keyframes` | Fully suppressed |
| `Spin` | `fluid-spinner` — rotation `@keyframes` | Fully suppressed |

#### Reduced-Motion Contract

`prefers-reduced-motion: reduce` applies globally:
- All primitives: `scale`/`transform` suppressed; opacity-only fade (`0→1` or `1→0`) replaces all scale/translate
- Exception: `expand`/`collapse` still animate (layout change communicates structure, not decoration)
- `depress`/`release`: opacity `1.0→0.7→1.0` replaces scale
- CSS animations (`Shimmer`, `Spin`): fully suppressed — static surface only

**Note on Grow/Shrink:** At Crystalline+: `clip-path` spring (no layout cost). At Frosted/Matte: `max-height` (layout cost, unavoidable, acceptable at lower-power tiers).

**Note on FLIP:** Requires two synchronous `getBoundingClientRect()` reads — before and after the DOM mutation. This is the sole acceptable exception to "no layout reads in rAF." Reads are outside rAF, not inside animation loops.

### 2.6 Interaction Physics

**Ripple:** Each component instance owns its own `<canvas>` inside its shadow DOM: `position: absolute; inset: 0; pointer-events: none; z-index: 0`. No shared canvas — ripples are spatially anchored per component.

**Pressure deformation:** Scale 0.96 (primary), 0.98 (secondary). `snappy` spring. Never below 0.94.

**Inertial continuation:** `fluid-scroll-view` — momentum decays via `--fluid-scroll-friction: 0.95` per frame.

**Elastic deformation:** Exponential resistance curve. `bouncy` spring-back.

### 2.7 Environmental Physics

**Background sampling — actual capability:**

| Background type | Capability |
|---|---|
| Solid `background-color` | Full — `getComputedStyle` |
| Image URL (same-origin) | Full — `OffscreenCanvas` downsample |
| CSS gradient | Partial — first stop color only |
| Complex composited DOM | Not possible — falls back to `prefers-color-scheme` |

Output: `--fluid-env-luminance: 0–1`, `--fluid-env-hue: 0–360` set on `fluid-theme`, inherited by all descendants.

**Sampling rate:** `<fluid-theme sampling="debounced|live|mount-only">`. Default: `debounced` (100ms). `live` uses 4×4 algorithm. Failures always silent.

**Nested glass policy:** Never intentionally nest more than two glass layers deep. When a higher-layer glass element must appear over a lower-layer one, the higher element reduces its blur: `blur = max(target_blur − sum_blur_below, 4px)`. Dev-mode warning when a glass component mounts inside another glass component at a higher layer.

**Specular highlight direction:**
```css
:root { --fluid-light-x: -0.3; --fluid-light-y: -0.7; }
[dir="rtl"] fluid-theme, :dir(rtl) fluid-theme { --fluid-light-x: 0.3; }
```

**Tilt (DeviceMotion, opt-in):** See §V.7 for permission handling.

---

## III. The Rendering Architecture

### 3.1 The Four Material Tiers

| # | Name | Target | Glass Quality |
|---|---|---|---|
| 1 | **Matte** | Any browser / accessibility | Opaque tinted surface |
| 2 | **Frosted** | Chrome 76+, Safari 14+, FF 103+ | Backdrop blur + vibrancy |
| 3 | **Crystalline** | Chrome 115+, Safari 17+, FF 126+ | True springs + env sampling |
| 4 | **Optical** | Chrome 128+ | Houdini refraction + compositor springs |

#### 🪨 Matte
No `backdrop-filter`. Opaque tinted surface using static `prefers-color-scheme`-derived tint. CSS `box-shadow` depth. Bezier `cubic-bezier(0.34, 1.56, 0.64, 1.0)` approximates spring feel. No elastic deformation. No recession scale transform (scrim only). Full accessibility always.

#### 🌫️ Frosted
Adds: `backdrop-filter: blur() saturate()`, CSS `linear()` spring approximation, `@starting-style` entry animations, `border-radius` squircle approximation (~85%).

**Color at Frosted:** HSL-based color scale only (no CSS relative colors, no `color-mix()`):
```css
--fluid-color-brand-50:  hsl(var(--fluid-hue-brand) calc(var(--fluid-sat-brand) * 0.3) 97%);
--fluid-color-brand-100: hsl(var(--fluid-hue-brand) calc(var(--fluid-sat-brand) * 0.5) 93%);
/* ...through 900 */
```
Tinting via static `rgba()` adaptive values derived from `prefers-color-scheme`, no `color-mix()`.

Height animations: `max-height` (layout cost accepted at this tier).

#### 💎 Crystalline
Adds: JS spring solver + WAAPI `commitStyles()` via `AnimationDriver`, `OffscreenCanvas` background sampling, CSS Typed OM, scroll-driven parallax, `view-transition-name`, `IntersectionObserver v2`.

**Color at Crystalline+:** CSS relative color syntax and `color-mix()` are enabled:
```css
@supports (color: oklch(from red 1 1 1)) {
  --fluid-color-brand-50: oklch(from var(--fluid-color-brand) 0.97 calc(c * 0.25) h);
  /* ...rest of scale */
}
```
`@supports` wrapper ensures Frosted-tier fallback (HSL scale) is used when relative colors are unavailable.

Adaptive tinting via `color-mix()`.

Height animations: `clip-path` spring — no layout cost.

#### 🔬 Optical
Adds: Houdini Paint Worklet (true squircle + refraction + chromatic aberration), Houdini Animation Worklet (compositor-thread springs), `DeviceMotion` parallax (opt-in + permission), cross-document View Transitions.

### 3.2 Browser Capability Matrix

| Feature | Chrome | Safari | Firefox | Tier |
|---|---|---|---|---|
| `backdrop-filter` | 76+ | 14+ | 103+ | Frosted |
| `@starting-style` | 117+ | 17.5+ | 129+ | Frosted |
| CSS `linear()` easing | 113+ | 17.2+ | 112+ | Frosted |
| **`color-mix()`** | **111+** | **15.4+** | **113+** | **Crystalline** |
| **CSS relative colors** | **119+** | **17.2+** | **128+** | **Crystalline** |
| WAAPI `commitStyles()` | 84+ | 15.4+ | 75+ | Crystalline |
| `OffscreenCanvas` | 69+ | 16.4+ | 105+ | Crystalline |
| Scroll-driven `scroll()` | 115+ | 18+ | 110+ | Crystalline |
| View Transitions (same-doc) | 111+ | 18+ | 126+ | Crystalline |
| `ElementInternals` | 81+ | 16+ | 93+ | All |
| Declarative Shadow DOM | 111+ | 16.4+ | 123+ | All |
| **Houdini Paint** | **128+** | ❌ | ❌ | **Optical** |
| **Houdini Animation** | **128+(exp)** | ❌ | ❌ | **Optical** |

### 3.3 The Visual Capability Ledger

**Two-phase initialization:**

Phase 1 (synchronous, before any component mounts): `CSS.supports()`, `typeof`, `in` checks. Conservative tier assigned immediately.

Phase 2 (async, microtask after DOMContentLoaded): Worklet registration attempt. If tier upgrades, dispatches `fluidledger:upgrade` — mounted components re-initialize.

**SSR / Node.js strategy:**
```typescript
const IS_BROWSER = typeof window !== 'undefined' && typeof document !== 'undefined'

export const ledger: FluidCapabilityLedger = IS_BROWSER
  ? detectCapabilities()       // browser: full detection
  : SSR_SAFE_DEFAULTS          // Node.js: all false, tier 'matte'
```
SSR components render Matte-tier DSD. Client upgrades tier on hydration. No `window` access in SSR path.

**Low-power device hints** (soft — affect rendering density, not tier):
```typescript
interface FluidCapabilityLedger {
  // ...existing fields
  deviceMemoryLow: boolean      // navigator.deviceMemory < 2
  cpuCoresLow: boolean          // navigator.hardwareConcurrency <= 2
  saveData: boolean             // navigator.connection?.saveData
}
// Effects: saveData → no background sampling
// deviceMemoryLow → no parallax, no ripple
// cpuCoresLow → no parallax
```

**Tier forcing (dev only):**
```javascript
FluidLedger.forceTier('frosted')       // JS API
?fluid-tier=frosted                    // URL param
window.__FLUID_FORCE_TIER__ = 'matte' // E2E tests
```
Stripped from production via `DEV` constant.

### 3.4 The Glass Equation

```
Glass(element) =
  backdrop-filter:  blur(thickness) saturate(vibrancy) brightness(env-adapt)
  background:       tint(clarity, env-hue)
  box-shadow:       ambient(depth) + key(depth, light-dir) + inner-specular(fresnel)
  border:           specular-rim(fresnel)
  clip-path:        squircle(radius)
```

**Material CSS mixin** — sets `--fluid-blur-current` so typography compensation works:
```css
/* Applied by FluidMaterial to every glass surface */
.glass-surface {
  --fluid-blur-current: 20; /* numeric, unitless — set to matching blur value */
  backdrop-filter: blur(var(--fluid-blur-regular)) saturate(var(--fluid-vibrancy));
  /* ... */
}
.glass-thin  { --fluid-blur-current: 8;  backdrop-filter: blur(var(--fluid-blur-thin)); }
.glass-thick { --fluid-blur-current: 40; backdrop-filter: blur(var(--fluid-blur-thick)); }
```

### 3.5 Context Recession

**Tier-gated:**
- Matte: scrim only (opacity overlay, no transform)
- Frosted: opacity recession (0.85) only, no scale transform
- Crystalline+: opacity (0.85) + scale (0.98) + background blur increase

**Scoped:** Only within the immediate spatial scope of the triggering element. Global opacity floor: `0.5` (nothing dims beyond this regardless of nesting depth).

**Scroll lock on modal/sheet open** (the `ScrollLockManager` primitive — see §XIX):
Correct technique to avoid layout shift:
1. Measure scrollbar width: `window.innerWidth − document.documentElement.clientWidth`
2. `document.body.style.paddingRight = scrollbarWidth + 'px'`
3. `document.body.style.overflow = 'hidden'`
4. `overscroll-behavior: contain` on overlay backdrop
5. iOS: `document.body.style.position = 'fixed'` + stored `scrollTop`
6. On close: restore all in reverse

### 3.6 Squircle by Tier

| Tier | Approach | Fidelity |
|---|---|---|
| Matte | `border-radius` | ~70% |
| Frosted | Multi-value `border-radius` | ~85% |
| Crystalline | Same | ~85% |
| Optical | Houdini Paint Worklet | 100% |

Worklet: bundled as base64 blob + served as `dist/worklets/glass-paint.js` for CSP. CSP failure: silent Crystalline fallback + dev warning.

### 3.7 `fluid-scroll-view`

*(Unchanged from v0.3 — keyboard nav, Frosted CSS styling, Crystalline+ full custom, native opt-out, scroll snap coordination below)*

**Scroll snap coordination:**
```html
<fluid-scroll-view snap="x mandatory">
  <fluid-snap-point offset="0">...</fluid-snap-point>
  <fluid-snap-point offset="100%">...</fluid-snap-point>
</fluid-scroll-view>
```
Programmatic: `scrollView.addSnapPoint(offsetPx)`. On release, nearest snap point wins via `bouncy` spring.

---

## IV. The Spring Engine

*(Full specification in §II.4 — all primitives defined there: solver, AnimationDriver, velocity registry, WillChangeManager, animation completion signals)*

---

## V. The Interaction System

### 5.1 Gesture Recognizers

Built on `PointerEvents`. `touch-action` managed automatically by `FluidGesture` per gesture type. iOS `pointercancel` on scroll detection: handled as gesture cancellation.

| Gesture | Output |
|---|---|
| `drag` | position delta, velocity, constraint handling |
| `swipe` | direction, velocity, completion threshold |
| `flick` | immediate completion + inertia |
| `pinch` | scale factor, midpoint |
| `long-press` | progress 0→1 over 500ms |
| `hover` | in/out, 50ms debounce |
| `press` | reliable cross-device tap |

#### Pointer Capture (Required for Drag)

`element.setPointerCapture(event.pointerId)` is called on `pointerdown` for all drag gestures. Without it, `pointermove` is dispatched to whatever element is under the cursor — drag breaks the moment the pointer moves off the origin element. `releasePointerCapture` is called on `pointerup` or `pointercancel`.

```typescript
// Inside FluidGesture.drag() setup
element.addEventListener('pointerdown', (e) => {
  element.setPointerCapture(e.pointerId)  // required — non-negotiable
  startDrag(e)
})
```

#### Multi-Touch Policy

- **Single-touch components** (`fluid-button`, `fluid-chip`, `fluid-icon-button`): only the first `pointerdown` registers. Additional pointer IDs on the same element are ignored until all pointers are up.
- **Scroll containers** (`fluid-scroll-view`): second touch within 100ms of first AND pointer distance > 20px → interpreted as pinch-to-zoom start; otherwise second touch is ignored for scroll velocity.
- **Drag elements**: tracks only the initial pointer ID. Additional pointers ignored until `pointerup` for the tracked ID.

#### Long-Press vs Drag Disambiguation

When a gesture recognizer is registered for both `long-press` and `drag` on the same element:

1. `pointerdown` — both are watching
2. If pointer moves **> 8px** before long-press timer fires (500ms) → **cancel long-press, start drag** immediately
3. If long-press fires before 8px movement → **long-press activates; drag is cancelled**
4. Threshold configurable: `FluidGesture.drag(el, { longPressThreshold: 8 })`

This matches iOS/Android disambiguation behavior.

#### Drag Constraint System

```typescript
interface DragConstraints {
  bounds?: { top: number; left: number; bottom: number; right: number }
  axis?: 'x' | 'y' | 'both'
  snap?: number[]            // snap to these offsets on release
  elastic?: boolean          // rubber-band beyond bounds (default: true)
  grid?: { x: number; y: number }  // snap to grid on release
  transform?: (x: number, y: number) => { x: number; y: number }  // custom
}
```

Usage:
```javascript
FluidGesture.drag(element, {
  constraints: { axis: 'x', bounds: { left: 0, right: 300 }, elastic: true },
  onDrag: ({ x, y, velocity }) => { ... },
  onRelease: ({ x, y, velocity }) => { ... }
})
```

### 5.2 Layout Animations (FLIP)

`<fluid-card layout>` — automatic FLIP on position/size change. Two `getBoundingClientRect()` reads (intentional, outside rAF). For lists >50 items: prefer `fluid-virtual-list`.

### 5.3–5.8

*(Motion variants, orchestration, reactive spring values, scroll-linked values — all unchanged from v0.3)*

### 5.6 View Transitions Integration

```html
<fluid-card transition-name="product-123">
```

Fluid wraps `document.startViewTransition()` with a **transition lock** to handle concurrent transitions gracefully:

```typescript
let activeTransition: ViewTransition | null = null

export async function startFluidTransition(updateFn: () => void): Promise<void> {
  if (activeTransition) {
    // A transition is already running — skip animation, apply update directly
    // (the running transition will complete and the page will reflect the final state)
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

Fluid replaces the default CSS-based View Transition animation with the configured spring preset, carrying over velocity from any in-progress animation on the transitioning element.

### 5.7 DeviceMotion Tilt

```javascript
import { FluidTilt } from '@neutro/fluid/core'
// Must be called from a user gesture handler
const result = await FluidTilt.enable()
// Returns: 'granted' | 'denied' | 'unavailable'
// On non-iOS: resolves immediately with 'granted'
```

### Overlay Open/Close Race Contract

When `open()` is called on a dialog, sheet, or drawer while it is still animating its close transition:

**Rule: cancel close, spring back with preserved velocity.**

The close animation's current velocity is carried into a new open animation via the velocity registry. The element springs back from its current partially-closed state — not from zero. This feels physically correct (the element "bounces back") and is automatically handled by `startSpring()` reading the interrupted animation's velocity.

```typescript
// The component's open/close is expressed as a single 'progress' spring (0=closed, 1=open)
// Calling open() mid-close simply calls:
startSpring(this, 'progress', 1, SPRING_PRESETS.smooth)
// The velocity registry carries the close velocity forward automatically.
// No special-casing required.
```

---

## VI. Design Token System

### 6.1 Token Classes

**Locked:** `--fluid-ior`, `--fluid-fresnel-strength`, `--fluid-vibrancy`, `--fluid-dispersion`, `--fluid-blur-*`, `--fluid-spring-*`, `--fluid-elasticity-max`, `--fluid-scroll-friction`

**Override mechanism:**
```css
fluid-theme { --fluid-blur-thick-override: 60px; }
/* Dev: [fluid warn] Physical token overridden. Adjust tint alpha and vibrancy. */
```

**Free:** `--fluid-tint-*`, `--fluid-color-*`, `--fluid-font-*`, `--fluid-radius-*`, `--fluid-shadow-*`

### 6.2–6.4 Material, Spring, Depth Tokens

#### Material Preset Table

Components reference presets by name (`thin`, `regular`, `thick`). These map to locked physical tokens:

| Preset | Blur token | Blur value | Tint alpha | Fresnel strength | Layer default | Use |
|---|---|---|---|---|---|---|
| `thin` | `--fluid-blur-thin` | `8px` | `0.55` | `0.12` | Surface (Layer 1) | Tooltips, chips, skeleton, section, fieldset header |
| `regular` | `--fluid-blur-regular` | `20px` | `0.65` | `0.18` | Raised (Layer 2) | Buttons, FAB, cards (Layer 2 elevation), nav |
| `thick` | `--fluid-blur-thick` | `40px` | `0.75` | `0.24` | Sheet / Overlay (Layer 4–5) | Modals, sheets, drawers |

`blur` and the locked tokens (`--fluid-ior`, `--fluid-fresnel-strength`, `--fluid-vibrancy`) are physical constants and must never be modified by component styles. `tint-alpha` is expressed as the token `--fluid-tint-alpha` and IS free — components read it, themes override it.

#### Spring Depth Tokens

The depth/elevation for each layer is driven by the layer's spring preset (§VII) not by a separate token. The rule is: higher layers use stiffer, faster springs. `box-shadow` depth is derived from the layer z-index range and the `--fluid-shadow-*` free tokens.

#### Depth Tokens

```css
--fluid-shadow-surface: 0 1px 3px hsl(0 0% 0% / 0.08), 0 1px 2px hsl(0 0% 0% / 0.06);
--fluid-shadow-raised:  0 4px 6px hsl(0 0% 0% / 0.10), 0 2px 4px hsl(0 0% 0% / 0.08);
--fluid-shadow-overlay: 0 10px 15px hsl(0 0% 0% / 0.12), 0 4px 6px hsl(0 0% 0% / 0.10);
--fluid-shadow-sheet:   0 20px 25px hsl(0 0% 0% / 0.15), 0 10px 10px hsl(0 0% 0% / 0.10);
```

These are **free tokens** — theme authors may override them.

### 6.5 Color Tokens (Tier-Aware)

**Frosted tier (hsl fallback):**
```css
:root {
  --fluid-hue-brand:  220;
  --fluid-sat-brand:  80%;
  --fluid-color-brand: hsl(var(--fluid-hue-brand) var(--fluid-sat-brand) 52%);

  /* HSL scale — safe at all browser versions */
  --fluid-color-brand-50:  hsl(var(--fluid-hue-brand) calc(var(--fluid-sat-brand) * 0.30) 97%);
  --fluid-color-brand-100: hsl(var(--fluid-hue-brand) calc(var(--fluid-sat-brand) * 0.50) 93%);
  --fluid-color-brand-200: hsl(var(--fluid-hue-brand) calc(var(--fluid-sat-brand) * 0.65) 88%);
  --fluid-color-brand-300: hsl(var(--fluid-hue-brand) calc(var(--fluid-sat-brand) * 0.80) 78%);
  --fluid-color-brand-400: hsl(var(--fluid-hue-brand) calc(var(--fluid-sat-brand) * 0.90) 65%);
  --fluid-color-brand-500: var(--fluid-color-brand);
  --fluid-color-brand-600: hsl(var(--fluid-hue-brand) calc(var(--fluid-sat-brand) * 0.95) 45%);
  --fluid-color-brand-700: hsl(var(--fluid-hue-brand) calc(var(--fluid-sat-brand) * 0.90) 38%);
  --fluid-color-brand-800: hsl(var(--fluid-hue-brand) calc(var(--fluid-sat-brand) * 0.80) 28%);
  --fluid-color-brand-900: hsl(var(--fluid-hue-brand) calc(var(--fluid-sat-brand) * 0.65) 18%);
}
```

**Crystalline+ enhancement (progressive):**
```css
@supports (color: oklch(from red 1 1 1)) {
  :root {
    /* Perceptually uniform oklch scale — proportional chroma, not hardcoded */
    --fluid-color-brand-50:  oklch(from var(--fluid-color-brand) 0.97 calc(c * 0.25) h);
    --fluid-color-brand-100: oklch(from var(--fluid-color-brand) 0.93 calc(c * 0.40) h);
    --fluid-color-brand-200: oklch(from var(--fluid-color-brand) 0.88 calc(c * 0.55) h);
    --fluid-color-brand-300: oklch(from var(--fluid-color-brand) 0.80 calc(c * 0.70) h);
    --fluid-color-brand-400: oklch(from var(--fluid-color-brand) 0.70 calc(c * 0.85) h);
    /* 500 = base, 600–900 continue pattern */
  }
}
```

**Components use semantic tokens, not scale:**
`--fluid-color-brand-subtle`, `--fluid-color-brand-strong`, `--fluid-color-brand-on-surface`.

### 6.6 Typography Tokens

*(Dynamic `--fluid-font-weight-on-glass` unchanged. Key addition: `--fluid-blur-current` is now set by the glass material mixin — §III.4 — so the dynamic formula resolves correctly.)*

### 6.7 Geometry Tokens

*(Unchanged from v0.3)*

---

## VII. The Layer & Depth Model

**Physical Hierarchy Rule:** Higher layers → more reflective, stronger blur, stronger shadow, faster spring, causes lower layers to recede.

| Layer | Name | Z-Index | Blur | Spring |
|---|---|---|---|---|
| 0 | Background | 0 | — | — |
| 1 | Surface | 1–9 | thin | `gentle` |
| 2 | Raised | 10–99 | regular | `smooth` |
| 3 | Overlay | 100–499 | regular | `snappy` |
| 4 | Sheet | 500–999 | thick | `smooth` |
| 5 | System | 1000+ | thick | `snappy` |

**ZIndexAllocator** — within-layer stacking for multiple simultaneous overlays:
```typescript
class ZIndexAllocator {
  private counters = new Map<FluidLayer, number>()

  allocate(layer: FluidLayer): number {
    const base = LAYER_Z_BASE[layer]
    const n = (this.counters.get(layer) ?? 0) + 1
    this.counters.set(layer, n)
    return base + n
  }

  release(layer: FluidLayer): void {
    const n = this.counters.get(layer) ?? 1
    this.counters.set(layer, Math.max(n - 1, 0))
  }
}
// ZIndexAllocator — module-federation-safe
const Z_KEY = Symbol.for('neutro.fluid.zindex')
if (!(globalThis as any)[Z_KEY]) (globalThis as any)[Z_KEY] = new ZIndexAllocator()
export const zIndex: ZIndexAllocator = (globalThis as any)[Z_KEY]
```

Layer assignments are fixed at authoring. Contextual elevation via `fluid-portal` with a `layer` attribute.

---

## VIII. Component Architecture

### 8.1 FluidElement Base Class

```typescript
abstract class FluidElement extends HTMLElement {
  protected readonly caps: FluidCapabilityLedger
  protected abstract readonly layer: FluidLayer
  protected abstract readonly material: FluidMaterial
  protected abstract readonly spring: SpringConfig
  protected readonly disposers: Array<() => void>
  // _internals backing field + getter: attachInternals() throws NotSupportedError if
  // called more than once per element instance. The ??= guard makes reconnect safe
  // (React Strict Mode, DOM moves). Do NOT replace with a bare assignment.
  private _internals: ElementInternals | null = null
  protected get internals(): ElementInternals { return this._internals! }
  protected root: ShadowRoot
  private _initialized = false

  connectedCallback(): void {
    // DSD hydration guard
    this.root = this.shadowRoot ?? this.attachShadow({ mode: 'open' })
    // Guard: attachInternals() throws if called twice on the same instance.
    this._internals ??= this.attachInternals()

    // React Strict Mode idempotency assertion (dev only)
    if (DEV && this._initialized) {
      warn(`${this.tagName} re-connected without disconnecting. Ensure connectedCallback is idempotent.`)
    }
    this._initialized = true
    this.onMount()

    // Lifecycle event — reliable "component is ready" signal
    // Fires after onMount() completes (springs initialized, sampling started)
    this.dispatchEvent(new CustomEvent('fluid:mounted', { bubbles: true, composed: true }))
  }

  disconnectedCallback(): void {
    this.disposers.forEach(d => d())
    this.disposers.length = 0
    this._initialized = false
    this.onUnmount()
    this.dispatchEvent(new CustomEvent('fluid:unmounted', { bubbles: true, composed: true }))
  }

  static define(name: string): void {
    if (!customElements.get(name)) customElements.define(name, this)
  }
}
```

**Lifecycle events:**
- `fluid:mounted` — component is connected and fully initialized (springs, sampling, context protocol). The reliable "ready" signal for consumers, test utilities, and composition orchestration.
- `fluid:unmounted` — component is disconnecting and cleaned up.
- `fluid:tier-upgrade` — capability tier changed after async ledger upgrade.

**Idempotency contract:** All initialization in `onMount()` must be repeatable after a `disconnectedCallback`. Z-index allocations released in `onUnmount()`. Observers re-started in `onMount()`. Context re-requested in `onMount()`.

### 8.1a Attribute vs Property Convention

Fluid's explicit convention for every component author:

**Attributes (kebab-case, string-valued):**
- Used for declarative/HTML usage and DSD markup
- Boolean flags: presence = `true`, absence = `false` (never `"false"`)
- Enumerated values: `variant`, `type`, `size`, `layer`
- Always `attributeChangedCallback`-observable
- Reflected: attribute setter writes to DOM; getter reads from DOM

**Properties (camelCase, typed):**
- Used for programmatic usage when values are not string-representable
- Objects, arrays, functions, typed values
- Do NOT reflect to attributes unless the value is a string

**Reflection rule:** If a property is also a declared attribute, the property getter reads from the attribute; the setter writes to the attribute. Never maintain duplicate state.

```typescript
// Correct reflection
get variant(): ButtonVariant { return (this.getAttribute('variant') ?? 'secondary') as ButtonVariant }
set variant(v: ButtonVariant) { this.setAttribute('variant', v) }

// Non-reflected property (object)
private _items: Item[] = []
get items() { return this._items }
set items(v: Item[]) { this._items = v; this.requestRender() }
```

### 8.1b ARIA ID Generation

Components linking elements via `aria-describedby`, `aria-labelledby`, and `aria-controls` must use stable IDs that do not collide between SSR and client hydration.

```typescript
export function generateFluidId(prefix: string, hostElement: Element): string {
  // Priority 1: consumer-provided base id
  const base = hostElement.id || hostElement.getAttribute('data-fluid-id')
  if (base) return `${base}-${prefix}`

  // Priority 2: stable position-based hash (SSR-safe, same result server and client)
  const path = getElementPath(hostElement)  // e.g., "body>main>section:2>article:0"
  const hash = stableHash(path).toString(36).slice(0, 6)
  return `fluid-${prefix}-${hash}`
}
```

`getElementPath` computes a parent path + sibling index string. `stableHash` is a deterministic non-crypto hash (FNV-1a or similar). Same input always produces same output — server and client agree.

### 8.2 Form-Associated Components

All input-type components:
```javascript
static formAssociated = true

// Submit handling for fluid-button
private handleActivate(): void {
  if (this.type === 'submit') this.internals.form?.requestSubmit(null)
  if (this.type === 'reset')  this.internals.form?.reset()
  this.dispatchEvent(new CustomEvent('fluid:activate', { bubbles: true, composed: true }))
}

get type(): string { return this.getAttribute('type') ?? 'submit' }  // matches HTML default
```

### 8.3 Shadow DOM Strategy

- `mode: 'open'`
- Styling contract: `::part()` + CSS custom properties only. ESLint plugin `@neutro/fluid/eslint-plugin` warns on shadow DOM piercing.
- DSD for SSR (hydration guard in `connectedCallback`)
- CSS `@layer` inside shadow roots
- Container queries for component responsiveness (never media queries)

**FOUC Prevention:**
```css
/* Shipped in @neutro/fluid/theme/anti-fouc.css — required import for non-SSR */
fluid-button:not(:defined),
fluid-card:not(:defined),
fluid-nav-bar:not(:defined)
/* ...all registered components */
{ visibility: hidden; }
```

**Print media** — all glass components include in their shadow root:
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
Global `@neutro/fluid/theme/print.css` provides document-level print resets.

### 8.3a Slot Contract (Required Per Component)

Every component must document its slot contract in its spec file and source code:

| Slot | Required | Fallback when empty | Description |
|---|---|---|---|
| `(default)` | No | Empty surface | General content |
| `header` | No | Hidden | Glass header area |
| `actions` | No | Hidden | Bottom action row |
| `media` | No | Hidden | Full-bleed image area |
| `icon` | No | Hidden | Leading icon |
| `trailing-icon` | No | Hidden | Trailing icon |

**Required slots** (components that must have content): if a required slot is empty, a dev-mode warning fires: `[fluid warn] fluid-[name] requires content in the default slot.`

**Default slot position** is always the primary content area. Named slots are supplemental. Every component must have at least a default slot.

### 8.4 Compound Component — Context Protocol

Fluid uses the WCCG Context Protocol for parent-child communication:

```typescript
// Child: request context from nearest parent
const event = new CustomEvent('fluid:context-request', {
  detail: {
    contextKey: TABS_CONTEXT_KEY,
    callback: (ctx: TabsContext) => { this.tabsContext = ctx }
  },
  bubbles: true, composed: false  // does not cross shadow boundaries
})
this.dispatchEvent(event)

// Parent: provide context to children
this.addEventListener('fluid:context-request', (e: CustomEvent) => {
  if (e.detail.contextKey === TABS_CONTEXT_KEY) {
    e.detail.callback(this.tabsContext)
    e.stopPropagation()
  }
})
```

Applied to: `fluid-tabs` ↔ `fluid-tab` / `fluid-tab-panel`, `fluid-select` ↔ `fluid-option`, `fluid-accordion` ↔ `fluid-accordion-item`, `fluid-fieldset` ↔ all nested inputs (disabled propagation), `fluid-form` ↔ all nested form controls (validation context).

### 8.5 Controlled vs Uncontrolled Pattern

For all stateful components (`fluid-dropdown`, `fluid-dialog`, `fluid-select`, `fluid-accordion`, `fluid-sheet`):

```html
<!-- Uncontrolled (default): component manages its own open/close state -->
<fluid-dropdown>...</fluid-dropdown>

<!-- Controlled: consumer owns state by presence of the attribute -->
<fluid-dropdown open>...</fluid-dropdown>
<fluid-dropdown open="false">...</fluid-dropdown>  <!-- also controlled, even when false -->
```

Rule: if the `open` attribute is ever present (including `"false"`), the component is in controlled mode and will not toggle itself. `fluid:open` and `fluid:close` events fire regardless of mode — informational, not imperative.

### 8.6 Focus Ring System (Shared Mixin)

```css
/* Applied via @layer fluid-focus inside every interactive component's shadow root */
@layer fluid-focus {
  :host(:focus-visible) {
    outline: 2px solid var(--fluid-color-brand);
    outline-offset: 2px;
  }
}
```

Token: `--fluid-focus-ring-color` (free, defaults to `--fluid-color-brand`).

### 8.7 Event System

Event naming contract:
- `fluid:activate` — semantic activation (pointer press + Enter + Space + programmatic `.click()`). Use this for action handlers.
- `fluid:press` — physical pointer down/up on element (includes position, pressure in `detail`). Use for physics-aware handlers.
- `fluid:change` — value change. `detail.value` contains new value (never raw sensitive data).
- `fluid:open` / `fluid:close` — state change for overlays.
- `fluid:context-request` — compound component context protocol (not for consumers).

All events: `composed: true`, typed `detail`. `detail` must never contain sensitive form values — only identifiers, display values, or opaque keys.

### 8.8 Security

**CSS injection hardening:**
- `fluid-theme` uses `setProperty()` exclusively — never constructs `style` attributes from input
- Attributes accepting font families are validated against a safe pattern:
  `^['"]?[a-zA-Z0-9 ,\-_]+['"]?(,\s*(system-ui|sans-serif|serif|monospace))?$`
- Document: `fluid-theme` attributes must never accept untrusted user input. Theme configuration is a build-time concern.

**Event detail leakage:** `detail` payloads contain only interaction metadata (position, velocity, selected key/index) — never raw form field values.

### 8.9 `fluid-portal` Theme Inheritance

```javascript
// fluid-portal captures theme context from current position
connectedCallback() {
  const theme = this.closest('fluid-theme') ?? document.documentElement
  const tokens = FluidTheme.snapshotTokens(theme)
  this.portalRoot = document.createElement('fluid-portal-root')
  for (const [k, v] of Object.entries(tokens)) {
    this.portalRoot.style.setProperty(k, v)
  }
  document.body.appendChild(this.portalRoot)

  // Re-snapshot on theme changes.
  // CSS custom properties have NO native change event, so we use MutationObserver
  // on the theme element's style attribute AND its declared attributes.
  const resnapshot = () => {
    const updated = FluidTheme.snapshotTokens(theme)
    for (const [k, v] of Object.entries(updated)) {
      this.portalRoot.style.setProperty(k, v)
    }
  }

  const observer = new MutationObserver(resnapshot)
  observer.observe(theme, {
    attributes: true,
    attributeFilter: ['style', 'class', 'brand-hue', 'font-family', 'data-theme']
  })
  this.disposers.push(() => observer.disconnect())

  // Also listen for explicit fluidtheme:change events (fired by fluid-theme
  // from attributeChangedCallback for its declared attributes)
  theme.addEventListener('fluidtheme:change', resnapshot)
  this.disposers.push(() => theme.removeEventListener('fluidtheme:change', resnapshot))
}
```

**`fluid-theme` must dispatch `fluidtheme:change`** from `attributeChangedCallback` for all its declared attributes (`brand-hue`, `font-family`, `sampling`, etc.), AND maintain a `MutationObserver` on its own `style` attribute to catch direct `setProperty()` calls:

```javascript
// Inside fluid-theme connectedCallback
const selfObserver = new MutationObserver(() => {
  this.dispatchEvent(new CustomEvent('fluidtheme:change', { bubbles: true }))
})
selfObserver.observe(this, { attributes: true, attributeFilter: ['style'] })
this.disposers.push(() => selfObserver.disconnect())
```

### 8.10 Theming & FOUC

Two CSS property overrides → 80% branded experience:
```html
<fluid-theme brand-hue="280" font-family="'Inter', sans-serif">
```

Global mode without `fluid-theme`:
```javascript
FluidTheme.setGlobalMode('dark')   // sets class on document.documentElement
FluidTheme.setGlobalMode('light')
FluidTheme.setGlobalMode('system') // follows prefers-color-scheme
```

**Attribute validation:** All `fluid-theme` attributes validated in `attributeChangedCallback` — invalid values kept at previous valid value, dev warning logged.

### 8.11 RTL, i18n, Print

*(All unchanged from v0.3 — CSS logical properties throughout, `FluidI18n.use()`, `--fluid-dir` multiplier, `@neutro/fluid/theme/print.css`)*

---

## IX. Typography & Color on Glass

*(Unchanged from v0.3 — glass weight compensation, text-shadow, on-glass colors, dynamic contrast correction)*

---

## X. Accessibility Contract

### Focus Ring

Applied via `@layer fluid-focus` in every interactive component's shadow root (§8.6):
```css
:host(:focus-visible) {
  outline: 2px solid var(--fluid-focus-ring-color, var(--fluid-color-brand));
  outline-offset: 2px;
}
```
Every interactive component (button, icon-button, fab, interactive card, fieldset children) inherits this mixin. No custom focus style may suppress it.

### Rendering Changes by Mode

| Mode | Effect on all components |
|---|---|
| `prefers-reduced-motion: reduce` | All scale/translate springs → opacity-only. `Shimmer`/`Spin` CSS animations suppressed. |
| `prefers-contrast: more` | Tint alpha → 0.95. `2px solid currentColor` border on all surfaces. All `backdrop-filter` disabled. |
| `prefers-reduced-transparency` | `backdrop-filter` disabled. Background opacity → 1.0. Tint becomes fully opaque. |
| `forced-colors` | All custom colours → system values. `backdrop-filter` disabled. Explicit borders on all interactive elements. |
| `prefers-color-scheme: dark` | Token layer switches to dark tint values. No structural changes. |

### ARIA Table — Phase 2 Components

Specs must reproduce the relevant row from this table verbatim in their "ARIA Pattern" section.

| Component | Element strategy | Role | Required attributes | Optional attributes | Keyboard contract | State → ARIA mapping |
|---|---|---|---|---|---|---|
| `fluid-button` | Shadow `<button>` | native `button` | none (text from default slot) | `aria-label` (icon-only use) | Enter/Space = activate; Tab = next focus | `loading` → `aria-busy=true` + `aria-disabled=true`; `disabled` → `aria-disabled=true` |
| `fluid-icon-button` | Shadow `<button>` | native `button` | `aria-label` on host (forwarded to inner `<button>`; dev error if absent) | — | Enter/Space = activate; Tab = next focus | same as `fluid-button` |
| `fluid-fab` | Shadow `<button>` | native `button` | `aria-label` on host (mandatory, dev error if absent) | `aria-expanded` + `aria-haspopup=menu` when speed-dial present | Enter/Space = activate; Escape = close speed-dial; Tab = next focus | `speed-dial-open` → `aria-expanded=true`; `loading`/`disabled` same as button |
| `fluid-card` (default) | Shadow `<div>` | none | none | `aria-label` / `aria-labelledby` (recommended if standalone) | none | `loading` → `aria-busy=true` on host; `error` → `aria-live=polite` region inside shadow announces `error-message` |
| `fluid-card` (interactive) | Shadow `<button part="trigger">` stretched over non-actions area; actions slot rendered as sibling outside trigger | `button` on trigger element | `aria-label` on host if no heading in header slot (dev warning if absent) | `aria-describedby` | Enter/Space on trigger = activate; Tab = focus trigger, then actions slot buttons (not descendants of trigger — see Note A) | same as `fluid-button`; `loading` → trigger `aria-busy=true` |
| `fluid-section` | Shadow `<section>` | `region` (implicit from `<section>`) | `aria-label` or `aria-labelledby` (required; without it the landmark is unnamed and axe fails) | — | none | — |
| `fluid-divider` (decorative) | Shadow `<hr aria-hidden=true>` | none (aria-hidden) | none | — | none (not focusable) | — |
| `fluid-divider` (semantic / splitter) | Shadow `<div role=separator>` | `separator` | `aria-orientation`; in splitter mode also: `aria-valuenow`, `aria-valuemin=0`, `aria-valuemax=100`, `aria-label` | — | Arrow keys adjust value (splitter only) | value change → `aria-valuenow` updates |
| `fluid-stack` | Shadow `<div>` | none | none | — | none | — |
| `fluid-spacer` | Shadow `<div aria-hidden=true>` | none (`aria-hidden=true` on host) | none | — | none (not focusable) | — |
| `fluid-visually-hidden` | Host element styled with clip technique | none | none | — | none (content is in DOM, announced naturally) | — |
| `fluid-empty-state` | Shadow `<div>` | none | none | `aria-label` for context | CTA `fluid-button` handles own keyboard | — |
| `fluid-skeleton` | Shadow `<div aria-hidden=true>` | none (`aria-hidden=true` on host; `tabindex=-1`) | none (aria-hidden set automatically in `connectedCallback`) | — | none | Container provides `aria-busy=true`; skeleton does not duplicate it |
| `fluid-spinner` | Shadow `<div>` | `status` | `aria-label` (auto: `"Loading"`, overridable) | `aria-live=polite` on inner wrapper | none (not focusable) | — |
| `fluid-progress` | Shadow `<div>` | `progressbar` | `aria-label` or `aria-labelledby`; `aria-valuemin=0`; `aria-valuemax` (default: `100`) | `aria-valuenow` (omit for indeterminate) | none | indeterminate → `aria-valuenow` absent; complete → `aria-valuenow` equals `aria-valuemax` |
| `fluid-fieldset` | Shadow `<fieldset>` | `group` (implicit from `<fieldset>`) | `aria-labelledby` pointing to inner legend ID (generated via `generateFluidId('legend', host)`) | `aria-disabled` | none directly; Tab traverses children | `disabled` → `aria-disabled=true` on `<fieldset>` + `DISABLED_CONTEXT_KEY` dispatch via context protocol |

**Note A — `fluid-card[interactive]` stretched-link pattern:**
The interactive trigger `<button part="trigger">` is `position: absolute; inset: 0` inside `<div part="surface">`. The `<slot name="actions">` is rendered in a separate `<div part="actions-bar">` that is a **sibling** of `<div part="surface">` (not a descendant), with `position: relative; z-index: 1` so it sits above the stretched button. This prevents focusable descendants inside `role=button`, which is invalid per ARIA 1.2. A dev-mode warning fires if `fluid-button` elements are slotted into `(default)` or `header` while `interactive` is set.

### ARIA IDs

All `aria-labelledby`, `aria-describedby`, and `aria-controls` values use `generateFluidId(prefix, hostElement)` (§8.1b). Never use `Math.random()`, `Date.now()`, or incrementing counters.

---

## XI. Component Taxonomy

### Universal State Primitives (applies across all appropriate components)

**Loading state:** `loading` attribute on `fluid-button`, `fluid-card`, `fluid-list`, `fluid-dialog`, `fluid-table`.
- `fluid-button[loading]`: spinner, disabled interaction, `aria-busy="true"`, `aria-disabled="true"`. Transition uses `depress`/`release` spring primitives; spinner uses the `Spin` CSS animation. There is no `Morph` primitive — see §2.5.
- `fluid-card[loading]`: skeleton overlay
- `fluid-list[loading]`: skeleton items

**Error state:** `error` + `error-message` attributes on `fluid-card`, `fluid-list`, `fluid-text-field`, and other appropriate components. Consistent visual treatment: destructive border, `fluid-alert-banner` inside component.

**Disabled propagation:** Via context protocol. `fluid-fieldset[disabled]` dispatches `fluid:context-request` with `DISABLED_CONTEXT_KEY`. All form components beneath it pick up the disabled context. CSS: `:host([disabled]) { pointer-events: none; opacity: 0.5; }`.

### Elements

*(Full taxonomy from v0.3, plus additions below)*

**New — Navigation:**
- `fluid-nav-bar` — **shrink contract:**
  ```html
  <fluid-nav-bar
    shrink-start="48"        <!-- px scrolled before shrink begins (default: 48) -->
    shrink-amount="0.6"      <!-- shrink to this fraction of full height (default: 0.6) -->
    shrink-mode="continuous" <!-- continuous (scroll-linked) | stepped (threshold) -->
    expand-on-scroll-up      <!-- re-expand on any upward scroll (boolean) -->
    skip-target="#main"      <!-- skip link target; defaults to first <main> -->
  >
  ```
  Renders a visually-hidden skip link as its first focusable child — visible on `:focus`. Consumers add the matching `id` to their `<main>`.

**New — Sheets / Overlays:**
- `fluid-sheet` / `fluid-drawer` — **dismiss contract:**
  ```html
  <fluid-sheet
    dismiss-threshold="0.5"   <!-- swipe 50% of height to dismiss (default: 0.5) -->
    dismiss-velocity="800"    <!-- px/s flick velocity to dismiss regardless of distance -->
    snap-points="0.3 0.7 1.0" <!-- sheet heights as % of viewport; last = full open -->
  >
  ```
  Snap-back uses `bouncy` spring. Dismiss uses `gentle` spring to zero then `Recede`. `fluid-sheet` and `fluid-dialog` integrate with the History API on open (see below).

**New — Form:**
- `fluid-fieldset` — form group container with glass header. Disabled propagation via context. `fieldset` role. `aria-disabled` on group.

**New — Data Display:**
- `fluid-code-block` — syntax-highlighted code on glass surface. `code` in `pre`. `aria-label` for context.
- `fluid-empty-state` — illustrated empty state with CTA. Layout + utility.

**New — Input:**
- `fluid-otp-input` — one-time password. Group of `spinbutton`s. `aria-label` on group.
- `fluid-number-input` — free-form numeric input (distinct from stepper). `<input type="number">`.
  Bidirectional text: `<input dir="auto">` inside all text inputs — auto-detects text direction from content. Label and helper text respond to the inferred direction.

### Glass-Native Elements

*(From v0.3, plus:)*
- `fluid-spotlight` — restored. Directional light effect radiating from a source point.

### Toast API (`fluid-toast`)

`fluid-toast` elements are managed by `ToastManager` — consumers do not render them directly.

```typescript
import { toast } from '@neutro/fluid/core'

toast('File saved')
toast('Error deleting file', { variant: 'destructive', duration: 0 })  // 0 = persistent
const t = toast('Processing...', {
  variant: 'info',
  duration: 5000,
  action: { label: 'Undo', onActivate: () => undoAction() }
})
t.dismiss()
t.update('Complete!')
```

**`ToastManager` live region pacing:** At most one toast occupies the `aria-live` region at a time. Next toast renders after current duration + 200ms. Rapid toasts are batched: "3 notifications" announced, accessible via a toast tray. Module-federation-safe:
```typescript
const TOAST_KEY = Symbol.for('neutro.fluid.toastmanager')
if (!(globalThis as any)[TOAST_KEY]) (globalThis as any)[TOAST_KEY] = new ToastManager({ maxSimultaneous: 1, announcementGap: 200 })
export const toastManager: ToastManager = (globalThis as any)[TOAST_KEY]
```

### History API / Back-Button Integration

`fluid-dialog`, `fluid-sheet`, and `fluid-drawer` integrate with the browser History API:
- **On open:** `history.pushState({ fluidOverlay: true, id: this.id }, '')`
- **On `popstate`** (browser back): close the overlay
- **On programmatic close:** if `history.state?.fluidOverlay`, call `history.back()`
- **Navigation API** (Crystalline+): use `navigation.navigate()` for better control
- **Multiple overlays:** each push a history entry; closing the topmost pops one entry

### Morphing Icon API

```html
<fluid-morphing-icon pair="play-pause" state="play"></fluid-morphing-icon>
<fluid-morphing-icon>
  <svg slot="default"><!-- default --></svg>
  <svg slot="active"><!-- active --></svg>
</fluid-morphing-icon>
```

### Tooltip Coordination

`TooltipManager` singleton: at most N tooltips visible simultaneously (default: 1). 300ms hover intent delay before showing. When a new tooltip opens, others close. Module-federation-safe via `Symbol.for()`:

```typescript
const TOOLTIP_KEY = Symbol.for('neutro.fluid.tooltipmanager')
if (!(globalThis as any)[TOOLTIP_KEY]) (globalThis as any)[TOOLTIP_KEY] = new TooltipManager({ maxVisible: 1, hoverDelay: 300 })
export const tooltipManager: TooltipManager = (globalThis as any)[TOOLTIP_KEY]
```

### `fluid-image` Loading Strategy

- `loading="lazy"` (native browser lazy loading via `<img loading="lazy">` inside shadow DOM)
- Blur-up: tiny base64 placeholder blurs to full resolution on load
- Skeleton: `fluid-skeleton` shown until loaded
- Error state: glass-styled broken image with retry
- Glass caption overlay only visible after image load

### Compositions — Render Delegation

Two patterns for data-driven compositions:

**Pattern A — Template slot:**
```html
<fluid-virtual-list .items=${data}>
  <template slot="item">
    <fluid-card><span slot="label">{{item.name}}</span></fluid-card>
  </template>
</fluid-virtual-list>
```

**Pattern B — Functional render:**
```javascript
fluid.virtualList({ items: data })
  .renderItem((item, index) => fluid.card().children([fluid.text(item.name)]))
  .appendTo(container)
```

Both patterns must be supported before any composition ships.

### `fluid-data-grid` Architecture Note

The data grid is the most complex composition and a Pro tier candidate. Its core architecture must be specified in a separate `fluid-data-grid` spec document before Phase 7 begins. Required decisions:
- **Virtualization:** `@tanstack/virtual` as headless utility, wrapped with Fluid rendering
- **Column model:** typed `ColumnDef<T>[]` with resizing, reordering, pinning
- **Sort/filter:** server-side and client-side both supported via a `DataSource<T>` interface
- **Edit model:** inline editing via `ElementInternals` per-cell inputs
- **Row selection:** single, multiple, range
- **Scroll integration:** `fluid-scroll-view` for physics-driven scroll behavior

This spec must be written no later than Phase 5 of the core library, as the core may need to expose primitives (`fluid-scroll-view` APIs, virtualization hooks) that the data grid depends on.

### Streaming SSR / Framework-Specific Guidance

**React Server Components:** Fluid components cannot be RSC — they use browser APIs. All Fluid components must be wrapped in `'use client'`. The React adapter barrel export includes `'use client'` automatically.

```typescript
// Next.js 14+ app router — Option A (preferred)
// The DSD-rendered shell renders on server; client hydration activates physics
import '@neutro/fluid/button'  // safe to import server-side (ledger has SSR path)

// Option B: if component uses browser-only APIs not covered by DSD
import dynamic from 'next/dynamic'
const FluidColorPicker = dynamic(
  () => import('@neutro/fluid/adapters/react').then(m => m.FluidColorPicker),
  { ssr: false }
)
```

**Streaming SSR:** Components hydrated out-of-order are handled correctly — the ledger's sync phase runs before any component mounts, and the async phase fires `fluidledger:upgrade` which any mounted component can respond to regardless of hydration order.

### Virtual List + Scroll Integration

`fluid-virtual-list` exposes `scrollOffset` reactive value. When inside a `fluid-scroll-view`:
```javascript
scrollView.scrollOffset.subscribe(offset => virtualList.updateWindow(offset))
```
Falls back to native `scroll` event when no custom scroll view is present.

---

## XII. Icons

`@neutro/fluid/icons` subpath. Stroke weight: 1.75px. Path variants for morphing per icon. Custom icon slot contract: SVG with `currentColor`, correct sizing, `morphTarget` for morph support.

---

## XIII. The Functional API

*(Unchanged from v0.3 — `fluid()` builder, `motion.*` composition, reactive spring values, `createTheme()`)*

**Animation completion signals added:**
```javascript
await motion.animate(element, motion.emerge())
// or
const val = spring(0, 'smooth').to(1)
await val.settled()
```

---

## XIV. DX & Ergonomics

### Import Model

```typescript
import '@neutro/fluid/core'    // required, ~8KB gzip
import '@neutro/fluid/button'
```

`package.json` sideEffects:
```json
{
  "sideEffects": [
    "./src/components/**/*.ts",
    "./src/tokens/**/*.css",
    "./src/core/index.ts"
  ]
}
```

### Subpath Exports

```json
{
  "exports": {
    ".":                     "./src/index.ts",
    "./core":                "./src/core/index.ts",
    "./theme/*":             "./src/tokens/themes/*.css",
    "./icons":               "./src/icons/index.ts",
    "./adapters/react":      "./src/adapters/react/index.tsx",
    "./adapters/vue":        "./src/adapters/vue/index.ts",
    "./adapters/svelte":     "./src/adapters/svelte/index.ts",
    "./adapters/angular":    "./src/adapters/angular/index.ts",
    "./testing":             "./src/testing/index.ts",
    "./eslint-plugin":       "./src/eslint-plugin/index.ts",
    "/button":               "./src/components/button/index.ts"
  }
}
```

### Dev/Production Constants

```javascript
export const DEV =
  typeof globalThis !== 'undefined' &&
  (globalThis.__FLUID_DEV__ === true ||
   (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production'))
```

### API Stability Tiers

All exported symbols are marked with one of three stability tiers in JSDoc:

- **`@stable`** — semver-protected. No breaking changes without a major version bump. Consumers can depend on these.
- **`@experimental`** — may change in minor versions. Consumers accept risk. Dev-mode logs a one-time warning on first use.
- **`@internal`** — excluded from public TypeScript declarations. Not for consumer use. May change any time.

**Initial assignments:**

| Tier | Symbols |
|---|---|
| Stable | All component attributes/parts/events, free CSS tokens, `createTheme()`, `FluidI18n.use()`, `FluidTheme.setGlobalMode()`, `FluidTilt.enable()` |
| Experimental | Functional API (`fluid()` builder), `FluidMotion.*`, `FluidGesture.*`, `spring()` reactive values, `startFluidTransition()` |
| Internal | Context protocol, `AnimationDriver`, `ZIndexAllocator`, `WillChangeManager`, ledger internals, `generateFluidId()` |

### Deprecation and Migration Strategy

1. **Deprecation notice:** `@deprecated` JSDoc + dev-mode warning on first use: `[fluid deprecated] --fluid-tint-light renamed to --fluid-surface-tint in v2.0. Removed in v3.0.`
2. **Support window:** Deprecated APIs supported for two major versions after deprecation
3. **Migration guides:** `MIGRATION.md` per major version, committed to repo
4. **Codemods:** For token renames and API changes: `npx @neutro/fluid-codemod v2`
5. **Changesets** document deprecations in the changelog alongside each release

### Performance Budget Per Component

| Metric | Target | How Tested |
|---|---|---|
| Custom element upgrade time | < 2ms | `performance.mark()` in component test |
| First paint after mount | < 16ms (one frame) | Playwright `performance.now()` |
| Spring step per active spring | < 0.1ms | Vitest `performance.now()` |
| Background sampling (debounced) | < 5ms per sample | Playwright metrics |
| `OffscreenCanvas` downsample | < 2ms | Playwright metrics |
| FLIP position read (N=50 items) | < 50ms total | Playwright metrics |
| 100 springs simultaneously | < 5ms per frame | AnimationDriver stress test |
| `@neutro/fluid/core` bundle | < 10KB gzip | `size-limit` in CI |
| Per-component bundle | < 5KB gzip | `size-limit` in CI |

These are gates enforced in CI. New PRs that exceed limits must justify the increase in the PR description.

### Dev-Mode Warnings

```
[fluid warn]  Locked token --fluid-blur-thin overridden.
[fluid warn]  brand-hue "banana" invalid. Expected 0–360. Keeping previous value.
[fluid warn]  Houdini worklet failed (CSP?). Set FLUID_WORKLET_URL. Falling back to Crystalline.
[fluid warn]  Accessing shadowRoot internals is unsupported. Use ::part() or CSS custom properties.
[fluid warn]  <fluid-button> mounted inside <fluid-dialog> glass surface — nested glass detected.
[fluid error] fluid-icon-button requires aria-label.
[fluid error] Spring mass must be > 0. Got: 0
[fluid error] fluid-button used outside fluid-theme. Contrast correction unavailable.
```

---

## XV. Performance, Robustness & Fault Tolerance

### Performance Guarantees

- **Single rAF loop:** `AnimationDriver` singleton — N simultaneously animating components = 1 rAF callback
- **Frame-rate independent:** Spring solver uses real `dt` from timestamps, capped at 64ms
- **Compositor-eligible only:** `transform` and `opacity` in rAF loops. Height via `clip-path` (Crystalline+) or `max-height` (Frosted/Matte, acknowledged trade-off)
- **No layout reads in rAF:** FLIP is the sole documented exception (reads outside rAF)
- **`will-change` reference counted:** Set on animation start, removed only when all animations on the element are settled
- **CSS `contain: layout style paint`** on all glass surfaces
- **Background sampling debounced:** 100ms default, configurable
- **Nested glass capped:** Maximum 2 layers deep; blur reduced on inner surfaces

### Fault Tolerance Table

| Failure | Behaviour |
|---|---|
| Houdini worklet registration fails | Crystalline fallback. Dev: log with CSP guidance. |
| Background sampling fails (any reason) | `prefers-color-scheme` fallback. Silent. |
| Form association edge cases (Safari) | Hidden `<input>` relay pattern. Documented per-component. |
| `DeviceMotion` permission denied | Tilt disabled. Silent. |
| View Transitions unavailable | Navigation without animation. |
| Spring solver overflow | Snap to target. Dev: log config. |
| Duplicate `define()` call | Silently skipped. |
| Contrast auto-correction | Increases tint alpha until WCAG AA met. No throw. |
| Ledger tier upgrade post-mount | `fluidledger:upgrade` event → components re-initialize. |
| `fluid-portal` theme snapshot failure | Falls back to `prefers-color-scheme`. |
| Tab visibility hidden | `AnimationDriver` pauses. Resumes with `dt = 16ms` (no giant step). |
| Node.js / SSR context | SSR_SAFE_DEFAULTS ledger. Matte-tier DSD renders. No browser API access. |
| Low-power device hints | Parallax, ripple, sampling disabled based on hints. No tier downgrade. |

---

## XVI. Build Tooling

**tsup** (wraps esbuild). No webpack dependency.

- ESM (primary), CJS (SSR), CSS token files
- Houdini worklets: inline base64 + `dist/worklets/` served files
- TypeScript declarations: `dts: true`
- Upgrade path: raw Rollup if tsup hits entry-point limits

---

## XVII. Package Structure & Monorepo

### The Key Principle

**Everything that is "core Fluid" lives in one npm package — `@neutro/fluid` — accessed via subpath exports.** This includes icons, adapters, testing utilities, and the ESLint plugin. Consumers install one package and get everything.

**Separate npm packages** exist only for: heavy compositions (independent versioning, Pro tier), and the Fluid Studio app (not an npm package at all).

This gives consumers `@neutro/fluid/icons`, `@neutro/fluid/adapters/react`, `@neutro/fluid/theme/dark` as clean, predictable paths — all from one `npm install`.

### `@neutro/fluid` Internal Source Structure

```
packages/fluid/
├── src/
│   ├── core/
│   │   ├── ledger.ts           # Two-phase capability ledger (SSR-safe)
│   │   ├── spring.ts           # Spring solver (all regimes, frame-rate independent)
│   │   ├── driver.ts           # AnimationDriver (Symbol.for singleton)
│   │   ├── will-change.ts      # WillChangeManager (ref counter)
│   │   ├── z-index.ts          # ZIndexAllocator (Symbol.for singleton)
│   │   ├── scroll-lock.ts      # ScrollLockManager
│   │   ├── tooltip-manager.ts  # TooltipManager (Symbol.for singleton)
│   │   ├── toast-manager.ts    # ToastManager (Symbol.for singleton)
│   │   ├── element.ts          # FluidElement base class
│   │   ├── motion.ts           # Motion system, variants, orchestration
│   │   ├── gesture.ts          # Gesture recognizers + drag constraints
│   │   ├── theme.ts            # Theme context + background sampling + global mode
│   │   ├── portal.ts           # fluid-portal + theme snapshot
│   │   ├── tilt.ts             # DeviceMotion opt-in + permission
│   │   ├── i18n.ts             # Translation map
│   │   ├── ripple.ts           # Per-component canvas ripple
│   │   ├── context.ts          # WCCG context protocol
│   │   ├── focus-ring.ts       # Shared focus ring CSS mixin
│   │   └── id.ts               # generateFluidId — SSR-stable ARIA IDs
│   │
│   ├── tokens/
│   │   └── themes/
│   │       ├── default.css
│   │       ├── dark.css
│   │       ├── high-contrast.css
│   │       ├── anti-fouc.css
│   │       └── print.css
│   │
│   ├── icons/                  # → @neutro/fluid/icons
│   │   ├── index.ts
│   │   └── [name].svg
│   │
│   ├── worklets/               # Houdini worklets
│   │   ├── glass-paint.js      # Served file (CSP-safe alternative)
│   │   └── spring-animate.js
│   │
│   ├── components/             # Each component → @neutro/fluid/[name]
│   │   └── [name]/
│   │       ├── index.ts
│   │       ├── styles.css
│   │       └── [name].spec.ts
│   │
│   ├── adapters/
│   │   ├── react/              # → @neutro/fluid/adapters/react
│   │   ├── vue/                # → @neutro/fluid/adapters/vue
│   │   ├── svelte/             # → @neutro/fluid/adapters/svelte
│   │   └── angular/            # → @neutro/fluid/adapters/angular
│   │
│   ├── testing/                # → @neutro/fluid/testing
│   │   ├── index.ts            # FluidTestUtils, FluidAccessibilityUtils, FluidSpringUtils
│   │   └── mock-tier.ts
│   │
│   └── eslint-plugin/          # → @neutro/fluid/eslint-plugin
│       └── rules/
│           ├── no-shadow-piercing.ts
│           └── icon-button-aria-label.ts
│
├── package.json                # Subpath exports map + optional peer deps
└── tsconfig.json
```

### Monorepo Root Layout

```
fluid/                         # Git root
├── packages/
│   ├── fluid/                        # @neutro/fluid (everything above)
│   ├── fluid-data-grid/              # @neutro/fluid-data-grid (separate: heavy + Pro)
│   ├── fluid-kanban/                 # @neutro/fluid-kanban
│   ├── fluid-calendar/               # @neutro/fluid-calendar
│   ├── fluid-command-palette/        # @neutro/fluid-command-palette
│   ├── fluid-gantt/                  # @neutro/fluid-gantt (Pro tier)
│   └── fluid-flow-diagram/           # @neutro/fluid-flow-diagram (Pro tier)
│
├── apps/
│   ├── studio/                       # Fluid Studio web app (not npm)
│   ├── docs/                         # Documentation site
│   └── storybook/                    # Component playground + visual regression
│
├── tooling/
│   ├── tsconfig/                     # base.json, component.json, test.json
│   ├── eslint/                       # Shared ESLint config
│   └── vitest/                       # Shared Vitest config
│
├── AGENTS.md                         # Universal AI agent context
├── CLAUDE.md                         # Claude Code-specific additions (references AGENTS.md)
├── pnpm-workspace.yaml
├── turbo.json
└── .changeset/
```

### Tooling Stack

- **Package manager:** pnpm workspaces (strict, isolated node_modules)
- **Build:** tsup per package, Turborepo orchestration and caching
- **Versioning:** Changesets — per-package semver, automated changelog

### `@neutro/fluid/package.json` Adapter Peer Deps

```json
{
  "peerDependencies": {
    "react": ">=18", "react-dom": ">=18",
    "vue": ">=3", "svelte": ">=4", "@angular/core": ">=17"
  },
  "peerDependenciesMeta": {
    "react":          { "optional": true },
    "react-dom":      { "optional": true },
    "vue":            { "optional": true },
    "svelte":         { "optional": true },
    "@angular/core":  { "optional": true }
  }
}
```

Optional peer deps: npm 7+, pnpm, and yarn berry only warn about the framework peer dep that corresponds to the adapter the consumer actually uses.

### Subpath Exports Map

```json
{
  "exports": {
    ".":                     "./src/index.ts",
    "./core":                "./src/core/index.ts",
    "./icons":               "./src/icons/index.ts",
    "./theme/*":             "./src/tokens/themes/*.css",
    "./adapters/react":      "./src/adapters/react/index.tsx",
    "./adapters/vue":        "./src/adapters/vue/index.ts",
    "./adapters/svelte":     "./src/adapters/svelte/index.ts",
    "./adapters/angular":    "./src/adapters/angular/index.ts",
    "./testing":             "./src/testing/index.ts",
    "./eslint-plugin":       "./src/eslint-plugin/index.ts",
    "./button":              "./src/components/button/index.ts",
    "./card":                "./src/components/card/index.ts"
    // ...one entry per component
  }
}
```

### Publishing Phases

| Phase | Deliverable |
|---|---|
| 0 | `core` (all primitives) + `tokens/themes` + `icons` + `testing` + `eslint-plugin` + `AGENTS.md` |
| 1 | `button`, `icon-button`, `card`, `theme`, `fieldset`, `stack`, `spacer`, `visually-hidden`, `empty-state`, `skeleton`, `spinner`, `progress` |
| 2 | `nav-bar`, `tab-bar`, `sidebar`, `breadcrumb`, `scroll-view`, `parallax-layer`, `depth-stage` |
| 3 | All input elements, `portal`, `morphing-icon`, `frosted-panel`, `spotlight`, `image`, `code-block` |
| 4 | `dropdown`, `popover`, `tooltip`, `dialog`, `sheet`, `drawer`, `context-menu` |
| 5 | Data display, `toast`, `alert-banner`, remaining glass-native elements |
| 6 | Framework adapters (React → Vue → Svelte → Angular) |
| 7 | Compositions (data-grid → command-palette → calendar → others) |

---

## XVIII. Revenue & Sustainability

*(Unchanged from v0.3 — GitHub Sponsors, Figma kit, premium themes, template kits, Fluid Studio, Pro compositions)*

---

## XIX. Component Specification Template

Every component must have a completed spec file at `components/[name]/[name].spec.md` before implementation begins. Claude Code reads this file to implement the component.

```markdown
# `fluid-[name]` Component Spec

## Classification
- **Type:** Element | Composition
- **Layer:** Surface | Raised | Overlay | Sheet | System
- **Material preset:** thin | regular | thick | none (layout-only components have no glass material)
- **Primary interaction spring:** snappy | bouncy | gentle | smooth | precise
  *(The spring preset used by the component's defining interactive motion — e.g., `depress`/`release` for buttons, `emerge`/`recede` for surfaces. This is the spring callers observe for the main gesture. It is NOT the layer's default spring — that governs recession only.)*
- **Applicable motions:**
  - *Primitives (callable via `motion.*` API):* [list from §2.5 Motion Catalogue]
  - *Interaction physics (§2.6 — always-on, not directly called):* [e.g., Ripple, PressDeform]
  - *CSS animations (keyframe-based):* [e.g., Shimmer, Spin — or "none"]

## Attribute Contract
| Attribute | Type | Default | Reflected | Description |
|---|---|---|---|---|
| `variant` | `'primary' \| 'secondary'` | `'secondary'` | Yes | Visual hierarchy |
| `disabled` | boolean (presence) | false | Yes | Disabled state |
...

## Property Contract (non-string values, not reflected)
| Property | Type | Description |
|---|---|---|
| `items` | `Item[]` | Data array for data-driven components |
...

## Slot Contract
| Slot | Required | Fallback | Description |
|---|---|---|---|
| `(default)` | No | Empty surface | Primary content |
| `header` | No | Hidden | Glass header |
...

## Event Contract
| Event | When | `detail` shape |
|---|---|---|
| `fluid:activate` | Semantic activation | `{ source: 'pointer' \| 'keyboard' \| 'programmatic' }` |
| `fluid:change` | Value changes | `{ value: T, previousValue: T }` |
...

## ARIA Pattern
- **Role:** `button`
- **Required attributes:** `aria-label` (if no visible text)
- **Keyboard:** Enter, Space = activate; Tab = focus next

## State Machine
```
idle → hover → pressed → idle
idle → focused → activated → idle
idle → [disabled] (blocked)
```

## Tier Behaviour
- **Matte:** [what renders / what is absent]
- **Frosted:** [additions]
- **Crystalline:** [additions]
- **Optical:** [additions]

## Accessibility Requirements
- `prefers-reduced-motion:` [specific change]
- `prefers-contrast: more:` [specific change]
- `forced-colors:` [specific change]
- RTL: [any directional adjustments]

## API Stability
- Attributes: `@stable`
- Events: `@stable`
- Internal methods: `@internal`
```

## XX. Agent Context Files (AGENTS.md / CLAUDE.md)

### Strategy

`AGENTS.md` is the **primary, tool-agnostic** context file. Every AI coding tool that reads a project context file should read this. It lives at the monorepo root and at the root of each package.

`CLAUDE.md` at the repo root is a **thin Claude Code-specific supplement** — it imports `AGENTS.md` semantically and adds Claude Code workflow guidance (tool usage, skill files, subtask patterns).

### `AGENTS.md` Structure (root)

```markdown
# @neutro/fluid — Agent Context

## Project Overview
@neutro/fluid is a physics-grounded glass material system for the web, implemented
as Custom Elements with a spring physics engine. See the foundational design document
(fluid-foundation-v5.md) for full specification.

## Critical Rules (Never Violate)
1. All glass animations use spring physics — never CSS bezier transitions for state changes
2. Every component must pass: `fluid:mounted` event, axe-core accessible, all 4 tier renders
3. Locked tokens (--fluid-blur-*, --fluid-spring-*, --fluid-ior, etc.) must never be changed
4. setPointerCapture() must be called on pointerdown in every drag gesture
5. All singletons use Symbol.for() — not module-level exports

## Before Implementing Any Component
1. Read the component spec at components/[name]/[name].spec.md
2. Run existing tests: pnpm test:unit && pnpm test:component
3. Write failing tests first, then implement

## Common Mistakes (From Adversarial Reviews)
- Spring settling threshold must be RELATIVE to range, not absolute 0.001
- setPointerCapture() is REQUIRED for drag — events are lost without it
- Lifecycle events: dispatch fluid:mounted AFTER onMount() completes
- ARIA IDs: use generateFluidId() — never Math.random() or a counter
- All module-level singletons: use Symbol.for() for module federation safety
- fluid-theme change detection: MutationObserver on style attribute + attributeChangedCallback
- Velocity passed to startSpring must be clamped (maxVelocity: 2000 default)

## Package Structure
Everything in @neutro/fluid is a subpath export. Run pnpm build to see the exports map.

## Test Requirements Before Any Component Merges
- [ ] Shadow DOM structure test
- [ ] All ::part() names present
- [ ] axe-core passes in all states
- [ ] fluid:activate / fluid:change events fire
- [ ] Keyboard activation works
- [ ] Renders at all 4 tiers without error
- [ ] prefers-reduced-motion: no transform animations
```

### `CLAUDE.md` Structure (root, Claude Code supplement)

```markdown
# Claude Code Supplement

@include AGENTS.md

## Claude Code Workflow
- Use bash_tool for running tests and file operations
- Use str_replace for targeted edits (never rewrite whole files unless necessary)
- Run pnpm test:unit after every core/ change — fast (< 5s)
- Run pnpm test:component after every component change — needs real browser, ~30s

## Subtask Pattern for Component Implementation
1. Read components/[name]/[name].spec.md
2. Write the failing test file (components/[name]/[name].spec.ts)
3. Implement index.ts + styles.css
4. Run tests, fix failures
5. Run pnpm test:a11y for accessibility gate

## When Stuck
- Check fluid-adversarial-review-*.md for known issues and solutions
- Check the Motion Catalogue (§II.5) for the correct motion primitive
- Check the ARIA table (§X) for the correct ARIA pattern
```

## XXI. Testing Strategy

*(Full strategy in companion document `fluid-testing-strategy.md`. Summary:)*

| Tier | Tool | Scope |
|---|---|---|
| 1 — Unit | Vitest | Spring solver, AnimationDriver, ledger, gesture state machines, color math, all core primitives |
| 2 — Component | @web/test-runner + Playwright | Shadow DOM, ARIA, events, form association, tier rendering, keyboard nav |
| 3 — Integration | Playwright | Compound components, context propagation, overlay stacking, form workflows |
| 4 — Visual regression | Storybook + Chromatic | All components × all tiers × light/dark × RTL × HiDPI |
| 5 — Property-based | fast-check | Spring physics invariants, gesture state machines, color math |
| 6 — Accessibility | axe-playwright (in Tier 3) | Every component, every state, zero violations gate |
| 7 — Cross-browser | Playwright + BrowserStack | Tier verification per browser, nightly |
| 8 — Performance | size-limit + Lighthouse CI | Bundle size gates, animation frame drop regression |

**LLM-powered development workflow:** Tests are written first from the spec. Golden value tests encode exact physics constants. Adversarial comments in test files flag common LLM failure modes.

**Testing subpath:** `@neutro/fluid/testing` exports `FluidTestUtils`, `FluidSpringUtils`, `FluidAccessibilityUtils` for consumer testing.
