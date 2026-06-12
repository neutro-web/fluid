# `fluid-progress` Component Spec

## Classification
- **Type:** Element
- **Layer:** Surface (Layer 1)
- **Material preset:** thin — the progress track is a thin glass surface
- **Primary interaction spring:** smooth (fill advance uses a smooth spring on fill track width / stroke-dashoffset)
- **Applicable motions:**
  - *Primitives (callable via `motion.*` API):* `grow` — fill element scale/width/stroke-dashoffset advances using a `smooth` spring when `value` changes; `emerge` on mount (scale + opacity); `recede` on unmount
  - *Interaction physics (§2.6 — always-on, not directly called):* none — progress is purely presentational; no pointer interaction
  - *CSS animations (keyframe-based):* `Spin` — used only when `indeterminate=true` and `variant="circular"` (CSS `@keyframes` rotation on the ring element); CSS shimmer-sweep `@keyframes` when `indeterminate=true` and `variant="linear"`

---

## Attribute Contract

| Attribute | Type | Default | Reflected | Description |
|---|---|---|---|---|
| `value` | number string | `'0'` | Yes | Current progress value. Must be a number string in the range `[min, max]`. Clamped silently if out of range. Ignored when `indeterminate` is present. |
| `max` | number string | `'100'` | Yes | Maximum value. Sets `aria-valuemax`. Must be greater than `min`; dev warning fires if not. |
| `min` | number string | `'0'` | Yes | Minimum value. Sets `aria-valuemin`. |
| `indeterminate` | boolean (presence) | false | Yes | When present, shows the indeterminate animation and hides the fill. `aria-valuenow` is omitted. When removed, spring animates from 0 to current `value`. |
| `variant` | `'linear' \| 'circular'` | `'linear'` | Yes | Visual form factor. `linear` = horizontal bar. `circular` = SVG ring. |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Yes | Physical size. `sm`: linear height 4px / circular diameter 24px. `md`: linear height 8px / circular diameter 40px. `lg`: linear height 12px / circular diameter 64px. |
| `label` | string | `''` | Yes | Sets `aria-label` on the host. If absent and no `aria-labelledby` is provided by the consumer, a dev warning fires at mount: `[fluid warn] fluid-progress requires aria-label or aria-labelledby for accessibility.` |

---

## Property Contract

*(none — all configuration is attribute-driven)*

---

## Slot Contract

| Slot | Required | Fallback | Description |
|---|---|---|---|
| `(default)` | No | None (fluid-progress is purely presentational) | Progress accepts no slotted content. The component is self-contained. Any projected content is ignored. |

---

## Event Contract

| Event | When | `detail` shape |
|---|---|---|
| `fluid:change` | When `value` attribute changes and is valid | `{ value: number, previousValue: number }` |
| `fluid:mounted` | After `connectedCallback` completes | none |
| `fluid:unmounted` | After `disconnectedCallback` completes | none |

---

## ARIA Pattern

- **Role:** `progressbar` — set on the shadow host element. This is the standard ARIA role for progress indicators (both determinate and indeterminate).
- **Required attributes:**
  - `aria-label` or `aria-labelledby` — at least one must be present. `aria-label` is set from the `label` attribute. Dev warning fires at mount if neither is present.
  - `aria-valuemin` — set from `min` attribute (default: `0`).
  - `aria-valuemax` — set from `max` attribute (default: `100`).
- **Optional attributes:**
  - `aria-valuenow` — set to current `value` as a number. **Omitted** (attribute removed) when `indeterminate` is present. Restored when `indeterminate` is removed.
- **Keyboard:** none — progress is not interactive. It must never receive focus.
- **State → ARIA mapping:**
  - `indeterminate` present → `aria-valuenow` absent; indeterminate animation active
  - `value=max` → `aria-valuenow=max`; complete state; optional `pulse` motion fires once
  - `value` changes → `aria-valuenow` updates to new value

*(From §X ARIA table: `fluid-progress` → Shadow `<div>`, role: `progressbar`; required: `aria-label` or `aria-labelledby`, `aria-valuemin=0`, `aria-valuemax=100`; optional: `aria-valuenow` (omit for indeterminate); indeterminate → `aria-valuenow` absent; complete → `aria-valuenow=100`)*

---

## State Machine

```
idle           (indeterminate=false, value=min — fill at 0%, aria-valuenow=min)
idle → advancing        (value increases — smooth spring drives fill width / stroke-dashoffset,
                         aria-valuenow updates on every attribute change)
advancing → complete    (value=max — aria-valuenow=max, pulse motion fires once on fill element,
                         fluid:change fires with { value: max, previousValue: prev })
indeterminate  (indeterminate attribute set — CSS Spin @keyframes for circular variant;
                CSS shimmer-sweep @keyframes for linear variant; aria-valuenow absent)
indeterminate → determinate  (indeterminate removed — spring from 0 to current value attribute,
                              aria-valuenow restored)
complete → advancing    (value decremented from max — state reverts, spring animates backward)
```

---

## Tier Behaviour

- **Matte:** Opaque track + opaque fill. Value changes use CSS `transition: width 200ms ease` (linear) or CSS `transition: stroke-dashoffset 200ms ease` (circular) — no spring. No `backdrop-filter`. Indeterminate animations are CSS `@keyframes` only. Background: `--fluid-color-neutral-200` for track; `--fluid-color-brand` for fill.
- **Frosted:** Thin glass track with `backdrop-filter: blur(8px)` on the track element. Fill advances using CSS `linear()` spring approximation for value changes. Track tint from `--fluid-tint-alpha`. Shimmer-sweep indeterminate uses gradient overlay. Spin indeterminate uses `@keyframes`.
- **Crystalline:** JS smooth spring (`SPRING_PRESETS.smooth`) drives fill `width` (linear) / `stroke-dashoffset` (circular) via `AnimationDriver`. `OffscreenCanvas` adaptive track tint. `contain: layout style paint` on the track element. `color-mix()` for fill tint computation. Spring velocity preserved when `value` changes mid-animation (in-flight interrupt).
- **Optical:** Houdini tinting of the glass track via registered paint worklet. Same JS smooth spring as Crystalline for fill animation. Worklet capability fail → Crystalline graceful degradation.

---

## Accessibility Requirements

- `prefers-reduced-motion: reduce:` No spring animation on fill — value snaps to new position instantly (no transition, no JS spring). Indeterminate CSS animations (`Spin`, shimmer-sweep) fully suppressed. Static track with fill at 30% renders when `indeterminate` is present, to indicate in-progress state without motion. `emerge`/`recede` collapse to opacity-only per global reduced-motion contract.
- `prefers-contrast: more:` Fill uses high-contrast color (`--fluid-color-brand-900` in light, `--fluid-color-brand-100` in dark). `2px solid currentColor` border on track. Track tint alpha → 0.95. `backdrop-filter` disabled. Fill always visually distinct from track.
- `forced-colors:` Fill element uses `Highlight`. Track element uses `ButtonFace`. All custom colors and filter effects overridden. `border: 1px solid ButtonText` on track for visibility.
- **RTL:** For `variant="linear"`, fill direction reverses — fill grows from `inline-end` in LTR contexts and from `inline-start` in RTL contexts, using CSS logical properties (`margin-inline-start`, `width` driven by JS from the end). For `variant="circular"`, no directional adjustment needed — ring is radially symmetric.

---

## API Stability

- Attributes: `@stable`
- Events: `@stable`
- Internal methods (`setFill`, `startIndeterminate`, `stopIndeterminate`): `@internal`
