# `fluid-section` Component Spec

## Classification
- **Type:** Element
- **Layer:** Surface (Layer 1, z-index 1–9)
- **Material preset:** thin (blur: 8px, tint alpha: 0.55, Fresnel: 0.12)
- **Primary interaction spring:** gentle (mass: 1.0, stiffness: 120, damping: 20, ζ ≈ 0.91)
  *(The spring used by `emerge` on mount — the component's defining entry motion. When `collapsible`, `expand`/`collapse` also use `smooth` as their governing primitive spring. The layer default for recession is `gentle`.)*
- **Applicable motions:**
  - *Primitives (callable via `motion.*` API):* `emerge`, `recede`, `expand` (collapsible open), `collapse` (collapsible close)
  - *Interaction physics (§2.6 — always-on, not directly called):* none
  - *CSS animations (keyframe-based):* none

---

## Attribute Contract

| Attribute | Type | Default | Reflected | Description |
|---|---|---|---|---|
| `heading` | `string` | `''` | Yes | Visible heading text rendered inside the glass header area. If absent, `aria-label` must be provided — a dev warning fires if both are absent: `[fluid warn] fluid-section requires either a heading attribute or an aria-label for landmark identification.` |
| `heading-level` | `'1' \| '2' \| '3' \| '4' \| '5' \| '6'` | `'2'` | Yes | The `<h{n}>` level for the rendered heading element. Controls heading hierarchy; does not affect visual size (use CSS custom properties for that). |
| `divider` | boolean (presence) | false | Yes | When set, renders a `fluid-divider` (decorative variant) at the bottom of the section's content area. |
| `collapsible` | boolean (presence) | false | Yes | Makes the section body collapsible. Adds a toggle `<button>` to the header row. Body starts open unless `open` attribute is absent. |
| `open` | `'true' \| 'false'` (string enum) | absent (uncontrolled — starts open) | Yes | Controlled open/close state for collapsible sections. `open="true"` = controlled-open; `open="false"` = controlled-closed; **absent** = uncontrolled (section toggles itself on activation). Per §8.5: presence of this attribute in any form means the consumer owns the state. A boolean presence attribute cannot distinguish "uncontrolled" from "controlled-true", so string values are required here. Dev warning fires if set to any value other than `"true"` or `"false"`. |

---

## Property Contract

*(none — all configuration is attribute-driven)*

---

## Slot Contract

| Slot | Required | Fallback | Description |
|---|---|---|---|
| `(default)` | No | Empty surface (glass container renders with no content) | Section body content — any element content. |
| `header-actions` | No | Hidden | Trailing content in the header row rendered after the heading. Intended for icon-buttons, badges, or other compact actions. Uses `position: relative; z-index: 1` to sit above the toggle button hit area if also present. |

---

## Event Contract

| Event | When | `detail` shape |
|---|---|---|
| `fluid:change` | When a collapsible section opens or closes (any source: toggle button click, Enter/Space on toggle, programmatic `open` attribute change) | `{ value: boolean, previousValue: boolean }` — `value` is `true` when open, `false` when collapsed |
| `fluid:mounted` | After `connectedCallback` completes | none |
| `fluid:unmounted` | After `disconnectedCallback` completes | none |

---

## ARIA Pattern

*(Verbatim from §X ARIA Table — Phase 2 Components)*

- **Element strategy:** Shadow `<section>` (gives implicit `region` landmark role — no explicit `role` attribute needed)
- **Role:** `region` (implicit from `<section>`)
- **Required attributes:** `aria-label` or `aria-labelledby` on the shadow `<section>` — without one of these, the landmark is unnamed and axe-core will fail with a landmark label violation
  - When `heading` attribute is set: the inner `<h{n}>` element has an ID generated via `generateFluidId('heading', host)`; the shadow `<section>` receives `aria-labelledby` pointing to that ID
  - When `heading` is absent: the host's `aria-label` attribute is forwarded to the shadow `<section>`'s `aria-label`. If neither is present, the dev warning fires
- **Collapsible additions:** The toggle `<button>` in the header receives `aria-expanded="true|false"` and `aria-controls` pointing to the body panel ID generated via `generateFluidId('body', host)`. The body panel receives `id` matching that value. The `<button>` has an accessible name of `"Collapse section"` / `"Expand section"` (localised via `FluidI18n` — key: `section.toggle.collapse` / `section.toggle.expand`); this is overridable by the consumer via the `FluidI18n.use()` API.
- **Keyboard:**
  - Toggle button: Enter / Space = toggle open/close; Tab = focus next interactive element
  - No keyboard interaction on non-collapsible sections (not focusable)
- **State → ARIA mapping:**
  - `collapsible` + open → toggle `<button>` `aria-expanded="true"`
  - `collapsible` + collapsed → toggle `<button>` `aria-expanded="false"`

---

## ARIA IDs

All `aria-labelledby` and `aria-controls` values use `generateFluidId(prefix, hostElement)` (§8.1b). IDs are SSR-stable and do not use `Math.random()`, `Date.now()`, or counters.

| Generated ID | Prefix | Points to | Used by |
|---|---|---|---|
| `generateFluidId('heading', host)` | `heading` | Shadow `<h{n}>` element | Shadow `<section aria-labelledby>` |
| `generateFluidId('body', host)` | `body` | Shadow body panel `<div>` | Toggle `<button aria-controls>` |

---

## State Machine

```
idle  (non-collapsible — no interactive state beyond mount/unmount)

idle → collapsed  (collapsible only — collapse motion, aria-expanded="false", body hidden)
collapsed → open  (expand motion, aria-expanded="true", body visible)
open → collapsed  (toggle button, Enter/Space, or programmatic open attribute removal)
```

---

## Tier Behaviour

- **Matte:** Opaque thin-tinted surface using static `prefers-color-scheme`-derived tint. `box-shadow` for Layer 1 elevation depth. `contain: layout style paint` on the section surface. Bezier `cubic-bezier(0.34, 1.56, 0.64, 1.0)` approximates `gentle` spring. No `backdrop-filter`. Collapsible body uses `max-height` CSS transition (layout cost accepted at this tier). No `@starting-style` emerge (opacity-only mount). Print media: `background: white !important; border: 1px solid #ccc !important; box-shadow: none !important; backdrop-filter: none !important;`
- **Frosted:** Adds `backdrop-filter: blur(8px) saturate(1.8)`. CSS `linear()` spring approximation for `emerge`/`recede`. `@starting-style` `emerge` animation (scale 0.92→1.0, opacity 0→1, `smooth` spring) on first paint. Collapsible uses `max-height` transition. `border-radius` squircle approximation (~85%). Print reset as Matte.
- **Crystalline:** JS spring solver via `AnimationDriver` (`gentle` preset for `emerge`/`recede`; `smooth` preset for `expand`/`collapse`). `OffscreenCanvas` background sampling for adaptive thin tint. `clip-path` spring for collapsible body — no layout cost. `view-transition-name` support. `contain: layout style paint`. Print reset as Matte.
- **Optical:** Houdini Paint Worklet for true squircle geometry + thin refraction (`--fluid-ior` scaled to thin preset). Compositor-thread spring for emerge/recede. `clip-path` spring for collapse. If Houdini worklet fails, automatic Crystalline fallback with dev-mode log: `[fluid warn] Houdini worklet failed (CSP?). Set FLUID_WORKLET_URL. Falling back to Crystalline.` Print reset as Matte.

---

## Nested Glass Policy

`fluid-section` is a Layer 1 (Surface) component. When mounted inside another glass surface, a dev warning fires: `[fluid warn] fluid-section mounted inside another glass surface — nested glass detected.` The inner surface automatically reduces its blur: `blur = max(8px − sum_blur_of_ancestors, 4px)`. Maximum nesting depth: 2.

---

## Accessibility Requirements

- **Focus ring:** The toggle `<button>` (collapsible mode only) uses `@layer fluid-focus`. Token `--fluid-focus-ring-color` defaults to `--fluid-color-brand`. Rule: `:host(:focus-visible) { outline: 2px solid var(--fluid-focus-ring-color, var(--fluid-color-brand)); outline-offset: 2px; }`. The section surface itself is not focusable.
- `prefers-reduced-motion:` `emerge` and `recede` suppress scale/translate — opacity-only fade (0→1 on mount, 1→0 on unmount). `expand`/`collapse` still animate — layout change communicates structure and is not suppressed (per §2.5 Reduced-Motion Contract). No scale on the collapsible body. Toggle button has no animation.
- `prefers-contrast: more:` Tint alpha increased to 0.95. `2px solid currentColor` border on the section surface and the header area. All `backdrop-filter` disabled. Toggle button border is always visible.
- `prefers-reduced-transparency:` `backdrop-filter` disabled. Background opacity set to 1.0. Tint becomes fully opaque.
- `forced-colors:` Custom colours replaced by `Canvas` for background and `ButtonText` for borders and text. No `backdrop-filter`. Explicit `2px solid ButtonText` border on the section surface.
- **RTL:** All heading and header-actions layout uses CSS logical properties (`padding-inline-start`, `padding-inline-end`, `margin-inline-*`, `inset-inline-*`). Specular highlight mirrors: `--fluid-light-x: 0.3` (from `--fluid-light-x: -0.3` default). Toggle button position in the header row uses `margin-inline-start: auto` to stay at the trailing edge regardless of direction.

---

## API Stability

- Attributes: `@stable`
- Events: `@stable`
- Internal methods (`handleToggle`, `applyCollapseState`, `updateAriaIds`): `@internal`
- ARIA ID generation (`generateFluidId` calls): `@internal`
