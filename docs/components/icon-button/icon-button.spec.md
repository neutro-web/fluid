# `fluid-icon-button` Component Spec

## Classification
- **Type:** Element
- **Layer:** Raised
- **Material preset:** regular
- **Primary interaction spring:** snappy
  *(The spring used by `depress`/`release` — the component's defining press motion. The layer default for recession is `smooth`, but callers observe `snappy` for icon-button press.)*
- **Applicable motions:**
  - *Primitives (callable via `motion.*` API):* `emerge`, `recede`, `depress`, `release`
  - *Interaction physics (§2.6 — always-on, not directly called):* `PressDeform`, `Ripple` (Frosted+ only)
  - *CSS animations (keyframe-based):* `Spin` (spinner while `loading`), none otherwise

---

## Attribute Contract

| Attribute | Type | Default | Reflected | Description |
|---|---|---|---|---|
| `aria-label` | string | `''` | No (native pass-through) | Accessible name — **required**. `[fluid error] fluid-icon-button requires aria-label.` fires in dev if absent at mount. |
| `variant` | `'primary' \| 'secondary' \| 'ghost'` | `'secondary'` | Yes | Visual hierarchy |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Yes | Physical size of the circular/squircle target |
| `disabled` | boolean (presence) | false | Yes | Disabled state — blocks all interaction |
| `loading` | boolean (presence) | false | Yes | Loading state — spinner replaces icon, disables interaction, sets `aria-busy="true"` and `aria-disabled="true"` |

---

## Property Contract

*(none — all configuration is attribute-driven)*

---

## Slot Contract

| Slot | Required | Fallback | Description |
|---|---|---|---|
| `(default)` | Yes | Dev warning: `[fluid warn] fluid-icon-button requires content in the default slot.` | SVG icon element — must use `currentColor` fill/stroke and carry `aria-hidden="true"` |

---

## Event Contract

| Event | When | `detail` shape |
|---|---|---|
| `fluid:activate` | Pointer press (pointerup on same target) or Enter/Space keydown — only fires when not disabled or loading | `{ source: 'pointer' \| 'keyboard' \| 'programmatic' }` |
| `fluid:mounted` | After `connectedCallback` completes | none |
| `fluid:unmounted` | After `disconnectedCallback` completes | none |

---

## ARIA Pattern

*(Verbatim from §X ARIA Table — Phase 2 Components)*

- **Element strategy:** Shadow `<button>`
- **Role:** native `button` (no ARIA `role` override on host)
- **Required attributes:** `aria-label` on host is mandatory. Host `aria-label` value is forwarded to the inner `<button aria-label>` in the shadow DOM. Dev error fires at `connectedCallback` if the attribute is absent or empty.
- **Keyboard:** Enter, Space = activate; Tab = focus next interactive element
- **Multi-touch policy:** Single-touch component. Only the first `pointerdown` registers. Additional pointer IDs on the same element are ignored until all pointers are up.
- **State → ARIA mapping:**
  - `loading` → `aria-busy="true"` + `aria-disabled="true"` on inner `<button>`; spinner carries `aria-hidden="true"`
  - `disabled` → `aria-disabled="true"` on inner `<button>`; `pointer-events: none` on `:host`
- **Note on `aria-disabled` and keyboard blocking:** `aria-disabled` alone does NOT block keyboard activation in all browsers. The `handleKeyDown` guard must explicitly check `this.disabled || this.loading` and return early before firing `fluid:activate`. Do not rely on `aria-disabled` to prevent the event.

---

## Disabled Context (DISABLED_CONTEXT_KEY)

`fluid-icon-button` consumes `DISABLED_CONTEXT_KEY` dispatched by a parent `fluid-fieldset` via the WCCG Context Protocol (§8.4). When the disabled context is received, the icon-button behaves identically to when the `disabled` attribute is directly present: pointer events are blocked, `aria-disabled="true"` is set on the inner `<button>`, and `fluid:activate` is suppressed via the `handleKeyDown` guard. Removing the disabled context (fieldset re-enabled) restores the button to its prior state unless its own `disabled` attribute is also present.

---

## State Machine

```
idle → hover → pressed → released → idle
idle → focused → activated → idle
any → loading  (disabled interaction, aria-busy, aria-disabled, spinner replaces icon, Spin CSS animation for spinner)
loading → idle (loading attribute removed, icon restored, Spin animation stops)
any → disabled (all pointer and keyboard events blocked; aria-disabled set)
disabled → idle (disabled attribute removed or disabled context cleared)
```

---

## Tier Behaviour

- **Matte:** Opaque circular/squircle tinted surface. `box-shadow` depth. `contain: layout style paint` on the button surface. Bezier `cubic-bezier(0.34, 1.56, 0.64, 1.0)` approximates spring press (`snappy`). Scale 0.96 on press. No `backdrop-filter`. No Ripple canvas. Print media: all glass effects removed; `background: white !important; border: 1px solid #ccc !important; box-shadow: none !important; backdrop-filter: none !important;` (see §8.3; global `@neutro/fluid/theme/print.css` provides document-level reset).
- **Frosted:** `contain: layout style paint` on button surface. Adds `backdrop-filter: blur(20px) saturate(1.8)`. CSS `linear()` spring approximation for press. Ripple `<canvas>` per instance: created lazily on first pointer interaction (`pointerdown`); destroyed in `disconnectedCallback`. One canvas per component instance — never shared. Canvas is `position: absolute; inset: 0; pointer-events: none; z-index: 0` in the shadow DOM. `@starting-style` Emerge animation on first paint. Print reset as Matte.
- **Crystalline:** `contain: layout style paint` on button surface. JS spring solver via `AnimationDriver` (`snappy` preset for press deformation). `OffscreenCanvas` adaptive tint. `view-transition-name` support. Ripple physics-accurate. Print reset as Matte.
- **Optical:** `contain: layout style paint` on button surface. Houdini Paint Worklet (true squircle geometry + surface refraction). Compositor-thread spring via Animation Worklet. Print reset as Matte.

---

## Accessibility Requirements

- **Focus ring:** Applied via `@layer fluid-focus` in the shadow root. Token `--fluid-focus-ring-color` defaults to `--fluid-color-brand`. Rule: `:host(:focus-visible) { outline: 2px solid var(--fluid-focus-ring-color, var(--fluid-color-brand)); outline-offset: 2px; }`. No custom focus style may suppress this mixin.
- `prefers-reduced-motion:` No scale/transform animations. Opacity-only press feedback (1.0 → 0.7 on press, 0.7 → 1.0 on release). Ripple canvas suppressed. `Spin` CSS animation for loading spinner fully suppressed — static spinner icon only.
- `prefers-contrast: more:` Tint alpha increased to 0.95. `2px solid currentColor` border on all variants. Ghost variant adds opaque background. All `backdrop-filter` disabled.
- `forced-colors:` All custom colours replaced by system values (`ButtonText` / `ButtonFace`). Visible border on all variants. No `backdrop-filter`.
- **RTL:** No directional adjustments. Icon is always centred in the target. Logical CSS properties used throughout.

---

## API Stability

- Attributes: `@stable`
- Events: `@stable`
- Internal methods (`handleActivate`, `handlePointerDown`, `handleKeyDown`, `validateAriaLabel`): `@internal`
