# `fluid-card` Component Spec

## Classification
- **Type:** Element
- **Layer:** Surface (Layer 1)
- **Material preset:** thin
- **Primary interaction spring:** gentle
  *(Roadmap P2-03 specifies "Layer 1 material (thin, gentle spring)" for card. When `interactive` is present, the defining press motion uses the `gentle` spring — less aggressive than buttons. This is the spring callers observe for the main gesture. The layer default for recession is also `gentle` at Layer 1.)*
- **Applicable motions:**
  - *Primitives (callable via `motion.*` API):* `emerge`, `recede`, `depress`, `release`, `grow`, `shrink`
  - *Interaction physics (§2.6 — always-on, not directly called):* `PressDeform` (with `interactive` attribute), `Ripple` (Frosted+, with `interactive` attribute)
  - *CSS animations (keyframe-based):* none

---

## Attribute Contract

| Attribute | Type | Default | Reflected | Description |
|---|---|---|---|---|
| `interactive` | boolean (presence) | false | Yes | Makes card a pressable target — adds pointer cursor, scale press animation via `depress`/`release`, and keyboard activation on the stretched trigger |
| `layout` | boolean (presence) | false | Yes | Enables automatic FLIP animation on position/size change. Uses two synchronous `getBoundingClientRect()` reads (intentional, outside rAF). For lists >50 items prefer `fluid-virtual-list` (§XIV performance budget; FLIP position reads at N=50 must complete in <50ms). |
| `loading` | boolean (presence) | false | Yes | Shows `fluid-skeleton` overlay over card content area; sets `aria-busy="true"` on host |
| `error` | boolean (presence) | false | Yes | Activates error state — destructive border and error region inside card |
| `error-message` | string | `''` | Yes | Message shown in the error state region |
| `transition-name` | string | `''` | Yes | Written to `view-transition-name` CSS property — enables shared-element cross-document transitions |
| `elevation` | `'flat' \| 'raised' \| 'floating'` | `'raised'` | Yes | Shadow depth. `floating` increases `box-shadow` and allocates a higher z-index within the Surface layer |

---

## Property Contract

*(none — all configuration is attribute-driven)*

---

## Slot Contract

| Slot | Required | Fallback | Description |
|---|---|---|---|
| `(default)` | No | Empty glass surface | Primary card body content |
| `header` | No | Hidden | Glass header area — rendered above the default slot |
| `media` | No | Hidden | Full-bleed image or video area — rendered before `header` when both are present |
| `actions` | No | Hidden | Bottom action row — rendered in `<div part="actions-bar">` as a sibling of `<div part="surface">`, not a descendant of the interactive trigger. Conventionally contains `fluid-button` elements. |

---

## Event Contract

| Event | When | `detail` shape |
|---|---|---|
| `fluid:activate` | Pointer press (pointerup on trigger) or Enter/Space when `interactive` — only fires when not loading | `{ source: 'pointer' \| 'keyboard' \| 'programmatic' }` |
| `fluid:mounted` | After `connectedCallback` completes | none |
| `fluid:unmounted` | After `disconnectedCallback` completes | none |

---

## ARIA Pattern

*(Verbatim from §X ARIA Table — Phase 2 Components)*

**Default (non-interactive):**
- **Element strategy:** Shadow `<div>`
- **Role:** none — card is a generic glass container; semantics come from slotted children
- **Required attributes:** none
- **Optional attributes:** `aria-label` / `aria-labelledby` (recommended if standalone)
- **Keyboard:** none
- **State → ARIA mapping:** `loading` → `aria-busy="true"` on host; `error` → `aria-live="polite"` region inside shadow DOM announces `error-message` content when error state activates

**Interactive (`interactive` attribute present):**
- **Element strategy:** Shadow `<button part="trigger">` stretched over the non-actions area; `<slot name="actions">` rendered in sibling `<div part="actions-bar">` outside the trigger
- **Role:** `button` on the trigger element (`<button part="trigger">`)
- **Required attributes:** `aria-label` on host if no heading is present in the header slot. The `aria-labelledby` value on the trigger references the heading element's ID generated via `generateFluidId('card-heading', hostElement)`. Dev warning fires if no accessible name is resolvable: `[fluid warn] fluid-card[interactive] has no accessible name. Add aria-label or a heading in the header slot.`
- **Optional attributes:** `aria-describedby`
- **Keyboard:** Enter, Space on trigger = activate; Tab = focus trigger, then Tab into actions slot buttons (which are siblings of the trigger, not descendants — see stretched-link note)
- **State → ARIA mapping:** same as `fluid-button`; `loading` → trigger `aria-busy="true"`
- **Note on `aria-disabled` and keyboard blocking:** `aria-disabled` alone does NOT block keyboard activation. The `handleKeyDown` guard on the trigger must explicitly check `this.loading` and return early before firing `fluid:activate`.

**Stretched-link pattern for `interactive` (see §X Note A):**
The trigger `<button part="trigger">` is `position: absolute; inset: 0` inside `<div part="surface">`. The `<slot name="actions">` is rendered in `<div part="actions-bar">` which is a sibling of `<div part="surface">` (not a descendant of the trigger), with `position: relative; z-index: 1` so it sits above the stretched button. This prevents focusable descendants inside a `role=button`, which is invalid per ARIA 1.2. A dev-mode warning fires if `fluid-button` elements are slotted into the `(default)` or `header` slot while `interactive` is set.

---

## Error State — `fluid-alert-banner` Fallback

The `error` attribute activates an error region inside the shadow DOM. `fluid-alert-banner` (P6-06) is used to render this region when available.

**Fallback (pre-Phase 6):** Before `fluid-alert-banner` (P6-06) ships, the error state uses a `<div part="error-banner" role="alert">` with the `error-message` text inside the shadow DOM. This provides the required `aria-live` semantics without the full banner component. Once `fluid-alert-banner` (P6-06) ships, that internal `<div>` is replaced by `<fluid-alert-banner>` — no attribute contract change for consumers.

---

## State Machine

```
idle → hover        (interactive only — elevation shift via gentle spring)
idle → pressed      (interactive only — scale 0.98, gentle spring, depress/release)
pressed → released → idle
idle → loading      (skeleton overlay, aria-busy on host)
loading → idle      (loading attribute removed, skeleton removed)
idle → error        (destructive border, error region with error-message announced via role=alert)
error → idle        (error attribute removed)
```

---

## Tier Behaviour

- **Matte:** Opaque tinted rectangle. `box-shadow` only. `contain: layout style paint` on the card surface (`<div part="surface">`). No `backdrop-filter`. FLIP and interactive press use bezier approximation. Error state uses destructive border only (no glass tinting). Print media: all glass effects removed; `background: white !important; border: 1px solid #ccc !important; box-shadow: none !important; backdrop-filter: none !important;` (see §8.3; global `@neutro/fluid/theme/print.css` provides document-level reset).
- **Frosted:** `contain: layout style paint` on card surface. Adds `backdrop-filter: blur(20px) saturate(1.8)`. `@starting-style` Emerge animation on first paint (opacity 0 → 1, scale 0.95 → 1 via `emerge` primitive). CSS `linear()` spring for interactive press. Ripple `<canvas>` when `interactive`: created lazily on first pointer interaction (`pointerdown`); destroyed in `disconnectedCallback`. One canvas per component instance — never shared. Canvas is `position: absolute; inset: 0; pointer-events: none; z-index: 0` in the shadow DOM. Print reset as Matte.
- **Crystalline:** `contain: layout style paint` on card surface. JS spring solver (`gentle` preset for all card motions). `OffscreenCanvas` adaptive tint. `view-transition-name` driven by `transition-name` attribute. `clip-path` spring for `grow`/`shrink` (no layout cost). `IntersectionObserver v2` for Emerge trigger — observer is disconnected and nulled in `disconnectedCallback` (disposer pattern: `this.disposers.push(() => this.intersectionObserver?.disconnect())`). Print reset as Matte.
- **Optical:** `contain: layout style paint` on card surface. Houdini Paint Worklet (true squircle, refraction on glass edge, chromatic aberration). Compositor-thread spring. `DeviceMotion` tilt parallax on card surface (opt-in via `FluidTilt`) — N card instances share one `devicemotion` listener via a module-level subscriber count (not N independent listeners); the listener is removed when the subscriber count reaches zero. If the Houdini Paint Worklet fails (CSP block or unsupported browser), falls back to Crystalline tier rendering (multi-value `border-radius` squircle approximation, no refraction) — dev warning: `[fluid warn] Houdini worklet failed (CSP?). Set FLUID_WORKLET_URL. Falling back to Crystalline.` Print reset as Matte.

---

## Accessibility Requirements

- **Focus ring (interactive variant):** Applied via `@layer fluid-focus` in the shadow root on the trigger element. Token `--fluid-focus-ring-color` defaults to `--fluid-color-brand`. Rule: `[part="trigger"]:focus-visible { outline: 2px solid var(--fluid-focus-ring-color, var(--fluid-color-brand)); outline-offset: 2px; }`. No custom focus style may suppress this mixin.
- `prefers-reduced-motion:` No Emerge/Recede scale transform — opacity only (0 → 1 via fade). No interactive press scale (`depress`/`release` suppressed). FLIP still runs (positional orientation, not decoration). Ripple suppressed.
- `prefers-contrast: more:` Tint alpha 0.95. `2px solid currentColor` border. All `backdrop-filter` disabled. Error state uses `2px solid` destructive colour with high-contrast text.
- `forced-colors:` `background: Canvas`, `border: 1px solid ButtonText`. All `backdrop-filter` and `box-shadow` removed. Error state uses `border: 2px solid LinkText`.
- **RTL:** Specular highlight direction flips via `--fluid-light-x: 0.3`. Slot layout (header/media/actions) uses logical CSS properties (`padding-inline`, `padding-block`) and is direction-agnostic.

---

## API Stability

- Attributes: `@stable`
- Events: `@stable`
- Internal methods (`runFLIP`, `applyErrorState`, `handleActivate`, `handleKeyDown`): `@internal`
