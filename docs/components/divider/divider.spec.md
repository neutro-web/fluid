# `fluid-divider` Component Spec

## Classification
- **Type:** Element
- **Layer:** Surface (inherits parent layer — no own z-index; `z-index: auto`)
- **Material preset:** none (thin glass line, not a full glass surface)
- **Primary interaction spring:** snappy (mass: 0.5, stiffness: 400, damping: 28, ζ ≈ 0.99)
  *(Only relevant in splitter mode — governs the `PressDeform` response on drag initiation. Non-splitter dividers have no interactive motion.)*
- **Applicable motions:**
  - *Primitives (callable via `motion.*` API):* none
  - *Interaction physics (§2.6 — always-on, not directly called):* `PressDeform` (splitter drag mode only)
  - *CSS animations (keyframe-based):* none

---

## Attribute Contract

| Attribute | Type | Default | Reflected | Description |
|---|---|---|---|---|
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Yes | Physical orientation of the dividing line. Maps to `aria-orientation` on the semantic and splitter variants. |
| `decorative` | boolean (presence) | false | Yes | When set: renders as `<hr aria-hidden="true">` — purely visual, not announced by screen readers, not focusable. When absent: renders as `<div role="separator">` with full ARIA semantics. |
| `splitter` | boolean (presence) | false | Yes | Makes the divider draggable to resize adjacent panels. Requires `decorative` to be absent (a dev error fires if both are set: `[fluid error] fluid-divider cannot be both decorative and splitter.`). Requires `aria-label` on host in splitter mode — dev warning fires if absent: `[fluid warn] fluid-divider[splitter] requires aria-label for accessibility.` |
| `value` | integer string (0–100) | `'50'` | Yes | Current position as a percentage of the available space (0–100). Only meaningful in splitter mode; ignored otherwise. Out-of-range values are clamped silently in production and logged in dev mode. |

---

## Property Contract

*(none — all configuration is attribute-driven)*

---

## Slot Contract

`fluid-divider` accepts no slots. It is a self-contained visual and/or semantic element with no content areas.

| Slot | Required | Fallback | Description |
|---|---|---|---|
| *(none)* | — | — | This component has no slots. Any slotted content is ignored and a dev warning fires: `[fluid warn] fluid-divider does not accept slotted content.` |

---

## Event Contract

| Event | When | `detail` shape |
|---|---|---|
| `fluid:change` | Splitter `value` changes during or after a drag gesture — fires on each significant value change during drag (throttled to one event per animation frame) and once on `pointerup`/`pointercancel` with final value | `{ value: number, previousValue: number }` — `value` is the new position as 0–100 |
| `fluid:mounted` | After `connectedCallback` completes | none |
| `fluid:unmounted` | After `disconnectedCallback` completes | none |

---

## ARIA Pattern

*(Verbatim from §X ARIA Table — Phase 2 Components)*

**Decorative variant (`decorative` attribute present):**
- **Element strategy:** Shadow `<hr aria-hidden="true">`
- **Role:** none (`aria-hidden="true"` removes it from the accessibility tree entirely)
- **Required attributes:** none
- **Keyboard:** none — not focusable
- **State → ARIA mapping:** none

**Semantic variant (default — `decorative` absent, `splitter` absent):**
- **Element strategy:** Shadow `<div role="separator">`
- **Role:** `separator`
- **Required attributes:** `aria-orientation` (set from `orientation` attribute — `"horizontal"` or `"vertical"`)
- **Keyboard:** none — not focusable
- **State → ARIA mapping:** none

**Splitter variant (`splitter` attribute present):**
- **Element strategy:** Shadow `<div role="separator" tabindex="0">`
- **Role:** `separator` (with interactive semantics via `tabindex="0"` and keyboard handling)
- **Required attributes:**
  - `aria-orientation` (set from `orientation` attribute)
  - `aria-valuenow` (set from `value` attribute, updated as value changes)
  - `aria-valuemin="0"`
  - `aria-valuemax="100"`
  - `aria-label` on host — forwarded to the inner `<div>`; consumer responsibility — dev warning fires if absent
- **Keyboard (splitter only):**
  - Arrow key in orientation direction: adjust `value` by 1 unit
  - Arrow key against orientation direction: adjust `value` by 1 unit (reverse)
  - Shift + Arrow: adjust `value` by 10 units
  - Home: set `value` to 0
  - End: set `value` to 100
- **State → ARIA mapping:**
  - `value` changes → `aria-valuenow` updates synchronously on every value change

---

## Splitter Pointer Capture Contract

`element.setPointerCapture(event.pointerId)` is called on `pointerdown` (mandatory per critical rules in `AGENTS.md`). This ensures the drag continues to receive pointer events even when the pointer moves outside the divider element. `pointerup` and `pointercancel` both call `element.releasePointerCapture(event.pointerId)` and transition back to `idle`.

Adjacent panel resizing: the splitter communicates its value to adjacent panels by updating a CSS custom property `--fluid-splitter-value` on the nearest common ancestor of the two panels, or by dispatching `fluid:change` for consumers to handle. The splitter does not directly resize panels — that is consumer responsibility.

---

## State Machine

```
idle  (decorative — static, no state transitions)
idle  (semantic — static, no state transitions)

idle → dragging  (splitter only — pointerdown fires, setPointerCapture called, PressDeform applied)
dragging → idle  (pointerup or pointercancel — releasePointerCapture called, final fluid:change fires)
```

---

## Tier Behaviour

- **Matte:** Static 1px line using `border-color` token (`--fluid-divider-color`, defaults to `currentColor` at 20% opacity). No `backdrop-filter`. No glass material. Splitter drag handle indicated by a visible 4px–wide hit-target zone with `cursor: col-resize` (vertical orientation) or `cursor: row-resize` (horizontal). Print media: line rendered at full opacity, `border: 1px solid #ccc !important`.
- **Frosted:** Thin glass line with `backdrop-filter: blur(4px) saturate(1.4)` along the line width/height. Slight vibrancy against the background. Line itself is 1px; the backdrop-filter region is 4px centered on the line. Splitter drag: `PressDeform` applies a subtle widening of the glass line on active drag (2px → 3px, CSS transition). Print reset as Matte.
- **Crystalline:** Same glass line as Frosted plus `OffscreenCanvas` adaptive tint sampling — the line color shifts to complement the background it sits over. Splitter drag: `PressDeform` uses `snappy` spring via `AnimationDriver`. Print reset as Matte.
- **Optical:** No Houdini additions are needed for a thin line — the thin cross-section provides no meaningful squircle or refraction surface. Optical tier renders identically to Crystalline for this component. Print reset as Matte.

---

## Value Clamping and Precision

`value` is always clamped to the integer range [0, 100] inclusive. Fractional values (e.g., from pointer drag math) are rounded to the nearest integer before being reflected to the attribute and to `aria-valuenow`. Out-of-range values received via attribute are clamped silently in production and trigger a dev-mode log: `[fluid warn] fluid-divider value 105 clamped to 100.`

---

## Accessibility Requirements

- **Focus ring (splitter only):** Applied via `@layer fluid-focus` in the shadow root. Token `--fluid-focus-ring-color` defaults to `--fluid-color-brand`. Rule: `:host(:focus-visible) { outline: 2px solid var(--fluid-focus-ring-color, var(--fluid-color-brand)); outline-offset: 2px; }`. Decorative and semantic dividers are not focusable — focus ring is suppressed via `tabindex` absence.
- `prefers-reduced-motion:` This component has no animations in any mode. No effect. The optional `PressDeform` visual widening on splitter drag is a static CSS state change, not an animation — it is retained.
- `prefers-contrast: more:` Line weight increases from 1px to 2px in all variants. Decorative variant: `border-color` set to `currentColor` at full opacity. Semantic/splitter variant: same. All `backdrop-filter` disabled (Frosted/Crystalline blur removed).
- `prefers-reduced-transparency:` `backdrop-filter` disabled. Line remains visible as an opaque border.
- `forced-colors:` Line color uses `ButtonText` system value. No `backdrop-filter`. Decorative `<hr>` remains `aria-hidden="true"`.
- **RTL:** Vertical dividers are unaffected by text direction — they divide left/right panels and their positioning is managed by the consuming layout. Horizontal dividers use logical CSS margin properties (`margin-block-start`, `margin-block-end`). Splitter keyboard behaviour: Arrow keys are orientation-relative, not direction-relative — left/right arrows always apply to vertical splitters, up/down arrows to horizontal splitters, regardless of `dir` value.

---

## API Stability

- Attributes: `@stable`
- Events: `@stable`
- Internal methods (`handlePointerDown`, `handlePointerMove`, `handlePointerUp`, `handleKeyDown`, `clampValue`): `@internal`
