# `fluid-spinner` Component Spec

## Classification
- **Type:** Element
- **Layer:** Surface (Layer 1)
- **Material preset:** none — spinner is an animated icon, not a glass surface
- **Primary interaction spring:** smooth (emerge on mount, recede on unmount)
- **Applicable motions:**
  - *Primitives (callable via `motion.*` API):* `emerge` (on mount — scale + opacity from 0.92/0 to 1.0/1); `recede` (on unmount — scale + opacity from 1.0/1 to 0.92/0)
  - *Interaction physics (§2.6 — always-on, not directly called):* none
  - *CSS animations (keyframe-based):* `Spin` — continuous rotation `@keyframes` on the arc element while mounted

---

## Attribute Contract

| Attribute | Type | Default | Reflected | Description |
|---|---|---|---|---|
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Yes | Physical size of the spinner. Maps to CSS custom properties: `sm` = 16px, `md` = 24px, `lg` = 40px |
| `label` | string | `'Loading'` | Yes | Accessible label text. Set as `aria-label` on the host `role="status"` element. Must be non-empty; dev warning fires if empty string is set. |
| `variant` | `'glass' \| 'brand' \| 'neutral'` | `'glass'` | Yes | Color/style variant for the spinner arc. `glass` = adaptive tint from background. `brand` = `--fluid-color-brand`. `neutral` = `--fluid-color-neutral-400`. |

---

## Property Contract

*(none — all configuration is attribute-driven)*

---

## Slot Contract

| Slot | Required | Fallback | Description |
|---|---|---|---|
| `(default)` | No | None (spinner has no slottable content area) | Spinner accepts no slotted content. Any projected content is ignored. |

---

## Event Contract

| Event | When | `detail` shape |
|---|---|---|
| `fluid:mounted` | After `connectedCallback` completes and `emerge` motion settles | none |
| `fluid:unmounted` | After `disconnectedCallback` completes and `recede` motion settles | none |

---

## ARIA Pattern

- **Role:** `status` — set on the shadow host element. This is the correct ARIA landmark for live regions that communicate ongoing process state.
- **Required attributes:**
  - `aria-label` on host — derived from `label` attribute (auto: `"Loading"`). Never absent; dev warning fires if `label` attribute is set to empty string.
  - `tabindex="-1"` on host — spinner is not keyboard-focusable.
- **Optional attributes:**
  - `aria-live="polite"` — set on an inner wrapper `<div>` inside the shadow root, **not** on the host directly. This prevents double-announcement since `role="status"` implicitly carries `aria-live="polite"`, but the inner wrapper is the region that actually contains the announcement text.
- **Keyboard:** none — spinner is not interactive. It must never receive focus.
- **Screen reader:** the `aria-label` value (e.g., `"Loading"`) is announced once when the spinner mounts into an `aria-live` region. The spinner itself does not repeat announcements while spinning — it is a static announcement of ongoing state.

*(From §X ARIA table: `fluid-spinner` → Shadow `<div>`, role: `status`, `aria-label` (auto: `"Loading"`, overridable), `aria-live="polite"` on inner wrapper; not focusable)*

---

## State Machine

```
active     (mounted — Spin @keyframes running, aria-live="polite" on inner wrapper)
active → unmounting  (recede motion starts: scale 1.0→0.92, opacity 1→0, smooth spring)
unmounting → removed (motion settles, element removed from DOM, fluid:unmounted fires)
```

The spinner has no idle or paused state while mounted — it is always active. Its sole lifecycle transition is mount → unmount.

---

## Tier Behaviour

- **Matte:** Static arc drawn with CSS `border` trick (circular border with one side transparent). Spin `@keyframes` animation on the arc element. No `backdrop-filter`. Arc color from `variant` token with full opacity.
- **Frosted:** Glass-tinted arc: `backdrop-filter: blur(4px)` on arc segment if technically feasible with the CSS border technique (implementation may fall back to Matte-style arc with a glass-tinted overlay). Spin `@keyframes` continues. Tint alpha from `--fluid-tint-alpha`.
- **Crystalline:** Adaptive arc tint sampled from `OffscreenCanvas` background luminance. Arc tint adjusts for light/dark backgrounds automatically. Spin `@keyframes` (CSS — not spring-driven; compositor thread only). `contain: layout style paint` on host.
- **Optical:** No additional Houdini needed — spinner arc does not require worklet-level physics. Same as Crystalline. Worklet capability detection ignored for this component.

---

## Accessibility Requirements

- `prefers-reduced-motion: reduce:` Spin `@keyframes` animation fully suppressed — `animation: none` applied to arc element. Static arc only (arc remains visible; spinner still communicates loading state). `emerge`/`recede` motion primitives collapse to opacity-only fade (scale/translate suppressed per global reduced-motion contract §2.5). Spinner still renders — it communicates meaningful state, not decoration.
- `prefers-contrast: more:` Arc border-width increases by 2px (e.g., `md` arc stroke goes from 2px to 4px). Arc color contrast guaranteed against both light and dark backgrounds via high-contrast token `--fluid-color-high-contrast`. `backdrop-filter` disabled.
- `forced-colors:` Arc uses `ButtonText`. Background uses `ButtonFace`. All custom color tokens overridden. All filter effects disabled.
- **RTL:** No directional adjustments — spinner is radially symmetric; rotation direction is independent of text direction.

---

## Performance Notes

- The Spin `@keyframes` animation targets only `transform: rotate()` on the arc element — eligible for compositor-thread animation with no main-thread involvement.
- `will-change: transform` applied to the arc element in the shadow root.
- Animation pauses when the document becomes hidden: a `visibilitychange` listener in `connectedCallback` sets `animation-play-state: paused` on the arc element when `document.hidden === true`, and `running` when the document becomes visible again. Listener is removed in `disconnectedCallback`.
- The arc element lives entirely within the shadow DOM; no compositor-thread spring is needed or used.

---

## API Stability

- Attributes: `@stable`
- Events: `@stable`
- Internal methods (`startSpin`, `stopSpin`, `pauseSpin`): `@internal`
