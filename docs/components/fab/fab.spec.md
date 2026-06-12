# `fluid-fab` Component Spec

## Classification
- **Type:** Element
- **Layer:** Raised (z-index 10–99)
- **Material preset:** regular (blur: 20px, tint alpha: 0.65, Fresnel: 0.18)
- **Primary interaction spring:** snappy (mass: 0.5, stiffness: 400, damping: 28, ζ ≈ 0.99)
  *(The spring used by `depress`/`release` — the component's defining press motion. Matches `fluid-button` press feel. The layer default for recession is `smooth`, but callers observe `snappy` for the FAB press.)*
- **Applicable motions:**
  - *Primitives (callable via `motion.*` API):* `emerge`, `recede`, `depress`, `release`, `expand` (speed-dial open), `collapse` (speed-dial close)
  - *Interaction physics (§2.6 — always-on, not directly called):* `PressDeform`, `Ripple` (Frosted+ only)
  - *CSS animations (keyframe-based):* none

---

## Attribute Contract

| Attribute | Type | Default | Reflected | Description |
|---|---|---|---|---|
| `aria-label` | `string` | `''` | Yes | Accessible name for the FAB. **Mandatory** — a dev error fires at mount if absent: `[fluid error] fluid-fab requires aria-label.` |
| `variant` | `'primary' \| 'secondary'` | `'primary'` | Yes | Visual weight. Primary uses `depress` scale 0.96; secondary uses 0.98. |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Yes | Physical size of the circular/squircle button target. `sm`: 40px, `md`: 56px, `lg`: 72px. |
| `disabled` | boolean (presence) | false | Yes | Disabled state — blocks all pointer and keyboard interaction. |
| `loading` | boolean (presence) | false | Yes | Loading state — spinner replaces slotted icon, disables interaction, sets `aria-busy="true"` and `aria-disabled="true"`. |
| `position` | `'bottom-right' \| 'bottom-left' \| 'bottom-center' \| 'custom'` | `'bottom-right'` | Yes | Configures `position: fixed` placement. `'custom'` removes all positional styles — consumer controls via CSS. RTL: `'bottom-right'` flips to `'bottom-left'` when a `[dir="rtl"]` ancestor is detected. |
| `speed-dial` | boolean (presence) | false | Yes | Enables speed-dial mode. Renders an expand icon alongside the main icon and manages expanded/collapsed state internally. |

---

## Property Contract

*(none — all configuration is attribute-driven)*

---

## Slot Contract

| Slot | Required | Fallback | Description |
|---|---|---|---|
| `(default)` | Yes | Dev warning: `[fluid warn] fluid-fab requires content in the default slot.` | SVG icon for the main action. Must be an `<svg>` element with `currentColor` fill/stroke and correct sizing. |
| `speed-dial-items` | No | Hidden (speed-dial panel is not rendered) | Container of secondary `fluid-fab` elements shown when speed-dial is open. Must contain only `fluid-fab` elements. Dev warning fires in dev mode if non-`fluid-fab` children are detected at mount. |

---

## Event Contract

| Event | When | `detail` shape |
|---|---|---|
| `fluid:activate` | Pointer press (pointerup on same target) or Enter/Space keydown — fires only when not disabled or loading; in speed-dial mode fires the main action, not the open/close toggle | `{ source: 'pointer' \| 'keyboard' \| 'programmatic' }` |
| `fluid:open` | Speed-dial expands (any source) | `{}` |
| `fluid:close` | Speed-dial collapses (any source, including Escape key and outside click) | `{}` |
| `fluid:mounted` | After `connectedCallback` completes | none |
| `fluid:unmounted` | After `disconnectedCallback` completes | none |

---

## ARIA Pattern

*(Verbatim from §X ARIA Table — Phase 2 Components)*

- **Element strategy:** Shadow `<button>`
- **Role:** native `button` (no ARIA `role` override on host)
- **Required attributes:** `aria-label` on host — forwarded to the inner `<button>`; dev error fires at mount if absent
- **Speed-dial additions:** When `speed-dial` attribute is present:
  - The inner `<button>` gains `aria-expanded="true|false"` and `aria-controls` pointing to the speed-dial panel ID (generated via `generateFluidId('speed-dial-panel', host)`).
  - The speed-dial panel uses `role="group"` with `aria-label` (default: `"Speed dial actions"`; overridable via `FluidI18n`). Items are plain focusable `fluid-fab` buttons in Tab order — no `role="menu"` or `role="menuitem"`.
  - The main FAB does **not** use `aria-haspopup` — the panel is a supplemental group of buttons, not a menu, listbox, or dialog.
- **Keyboard:**
  - Enter / Space = toggle speed-dial open/closed when `speed-dial` present; otherwise activate main action
  - Tab / Shift+Tab = cycle through speed-dial items when panel is open, then leave the component
  - Escape = close speed-dial and return focus to main FAB button
- **State → ARIA mapping:**
  - `speed-dial-open` → `aria-expanded="true"` on inner `<button>`
  - `speed-dial-closed` → `aria-expanded="false"` on inner `<button>`
  - `loading` → `aria-busy="true"` + `aria-disabled="true"` on inner `<button>`
  - `disabled` → `aria-disabled="true"` on inner `<button>`; `pointer-events: none` on `:host`
- **Note on activation vs speed-dial toggle:** When `speed-dial` is present, Enter/Space toggles the panel — `fluid:activate` is not fired from the main FAB in this mode. `fluid:activate` fires only when `speed-dial` is absent, or programmatically via `.click()`.
- **Note on `aria-disabled` and keyboard blocking:** `aria-disabled` alone does NOT block keyboard activation in all browsers. The `handleKeyDown` guard must check `this.disabled || this.loading` and return early before firing `fluid:activate`.

---

## Disabled Context (DISABLED_CONTEXT_KEY)

`fluid-fab` consumes `DISABLED_CONTEXT_KEY` dispatched by a parent `fluid-fieldset` via the WCCG Context Protocol (§8.4). When the disabled context is received, the FAB behaves identically to when the `disabled` attribute is directly present: pointer events are blocked, `aria-disabled="true"` is set on the inner `<button>`, and `fluid:activate` is suppressed via the `handleKeyDown` guard. Removing the disabled context restores the FAB to its prior state unless its own `disabled` attribute is also present.

---

## Focus Management

- **Focus ring:** Applied via `@layer fluid-focus` in the shadow root. Token `--fluid-focus-ring-color` defaults to `--fluid-color-brand`. Rule: `:host(:focus-visible) { outline: 2px solid var(--fluid-focus-ring-color, var(--fluid-color-brand)); outline-offset: 2px; }`. No custom focus style may suppress this mixin. For circular/squircle geometry, `border-radius: inherit` ensures the focus ring follows the button shape.
- **Speed-dial open:** Focus moves programmatically to the first `fluid-fab` element inside the `speed-dial-items` slot on `expand` completion.
- **Speed-dial close (Escape):** Focus returns to the main FAB `<button>` element.
- **Speed-dial close (outside click / backdrop):** Focus returns to the main FAB `<button>` element.

---

## State Machine

```
idle → hover → pressed → released → idle
idle → focused → activated → idle
idle → speed-dial-open  (expand motion, aria-expanded="true", focus moves to first speed-dial item)
speed-dial-open → speed-dial-closed  (collapse motion, aria-expanded="false", focus returns to main FAB)
speed-dial-open → speed-dial-closed  (Escape key — same as above)
any → loading  (spinner replaces icon, aria-busy, aria-disabled, interaction disabled)
loading → idle  (loading attribute removed, icon restored)
any → disabled  (pointer and keyboard events blocked; aria-disabled set)
disabled → idle  (disabled attribute removed or disabled context cleared)
```

---

## Tier Behaviour

- **Matte:** Opaque circular surface using static `prefers-color-scheme`-derived tint. `box-shadow` for elevation (equivalent to Layer 2 depth token). `contain: layout style paint` on the button surface. Bezier `cubic-bezier(0.34, 1.56, 0.64, 1.0)` approximates `snappy` spring for press deformation. Scale 0.96 (primary), 0.98 (secondary) on press. No `backdrop-filter`. No Ripple canvas. Speed-dial items revealed via `max-height` CSS transition. `@starting-style` emergence: none (opacity-only). Print media: `background: white !important; border: 1px solid #ccc !important; box-shadow: none !important; backdrop-filter: none !important;`
- **Frosted:** Adds `backdrop-filter: blur(20px) saturate(1.8)`. CSS `linear()` spring approximation for press deformation. Ripple `<canvas>` per instance: created lazily on first `pointerdown`; destroyed in `disconnectedCallback`. Canvas is `position: absolute; inset: 0; pointer-events: none; z-index: 0` in the shadow DOM. `@starting-style` `emerge` animation (scale 0.92→1.0, opacity 0→1) on first paint. Speed-dial uses `max-height` transition. `border-radius` squircle approximation (~85%). Print reset as Matte.
- **Crystalline:** JS spring solver via `AnimationDriver` (`snappy` preset for press deformation, `smooth` preset for `expand`/`collapse`). `OffscreenCanvas` background sampling for adaptive tint. `clip-path` spring for speed-dial expand/collapse — no layout cost. `view-transition-name` support. Ripple physics-accurate. `contain: layout style paint`. Print reset as Matte.
- **Optical:** Houdini Paint Worklet for true squircle geometry + surface refraction + chromatic aberration. Compositor-thread spring for press deformation via Animation Worklet. `clip-path` spring for speed-dial. If the Houdini worklet fails (e.g., CSP restriction), the component falls back to Crystalline tier automatically with a dev-mode log: `[fluid warn] Houdini worklet failed (CSP?). Set FLUID_WORKLET_URL. Falling back to Crystalline.` Print reset as Matte.

---

## Multi-Touch Policy

Single-touch component — only the first `pointerdown` registers. Subsequent simultaneous touches are ignored until the first pointer is released. This matches the behaviour of `fluid-button`.

---

## Canvas Lifecycle

The Ripple `<canvas>` is created lazily on first `pointerdown` interaction (Frosted+ only) and destroyed in `disconnectedCallback`. No canvas exists on components that have never been pressed. Canvas dimensions are synchronized to the button's bounding rect on creation and on `ResizeObserver` callback.

---

## Positioning Contract

| `position` value | CSS applied | RTL override |
|---|---|---|
| `bottom-right` | `position: fixed; bottom: var(--fluid-fab-offset-y, 24px); right: var(--fluid-fab-offset-x, 24px);` | Flips to `left` when `[dir="rtl"]` ancestor detected |
| `bottom-left` | `position: fixed; bottom: var(--fluid-fab-offset-y, 24px); left: var(--fluid-fab-offset-x, 24px);` | Flips to `right` when `[dir="rtl"]` ancestor detected |
| `bottom-center` | `position: fixed; bottom: var(--fluid-fab-offset-y, 24px); left: 50%; transform: translateX(-50%);` | No flip |
| `custom` | All positional styles removed from `:host` | No automatic RTL |

RTL detection: `this.closest('[dir="rtl"]') !== null` checked in `connectedCallback` and on `MutationObserver` watching the nearest `[dir]` ancestor. The flip is applied by toggling a `data-rtl` attribute on the host element, which is targeted by a CSS rule in the shadow root.

---

## Accessibility Requirements

- **Focus ring:** Applied via `@layer fluid-focus`. `border-radius: inherit` on the outline ensures it follows the squircle/circle shape. Token `--fluid-focus-ring-color` defaults to `--fluid-color-brand`. No custom style may suppress this.
- `prefers-reduced-motion:` No scale/transform animations. Opacity-only press feedback (1.0 → 0.7 → 1.0). No `emerge` scale on mount — opacity-only fade. Speed-dial open/close uses opacity-only transition (no `clip-path` or `max-height` animation). Ripple canvas suppressed.
- `prefers-contrast: more:` Tint alpha increased to 0.95. `2px solid currentColor` border. All `backdrop-filter` disabled. Ghost/secondary variant uses `color: ButtonText` with opaque background.
- `prefers-reduced-transparency:` `backdrop-filter` disabled. Background opacity set to 1.0. Tint becomes fully opaque.
- `forced-colors:` All custom colours replaced by system values (`ButtonText` / `ButtonFace`). No `backdrop-filter`. Visible `2px solid ButtonText` border. `box-shadow` removed.
- **RTL:** `position: 'bottom-right'` flips to `'bottom-left'` when a `[dir="rtl"]` ancestor is detected. `position: 'bottom-left'` flips to `'bottom-right'`. Specular highlight direction mirrors: `--fluid-light-x: 0.3` (from `--fluid-light-x: -0.3` default). Speed-dial items stack direction follows logical CSS — they always stack upward from the FAB regardless of text direction.

---

## API Stability

- Attributes: `@stable`
- Events: `@stable`
- Internal methods (`handleActivate`, `handlePointerDown`, `handleKeyDown`, `handleSpeedDialToggle`, `handleSpeedDialClose`): `@internal`
- Canvas lifecycle methods (`initCanvas`, `destroyCanvas`): `@internal`
- Positioning helpers (`applyPosition`, `detectRTL`): `@internal`
