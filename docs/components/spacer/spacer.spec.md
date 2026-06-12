# `fluid-spacer` Component Spec

## Classification
- **Type:** Element (layout utility — no glass material)
- **Layer:** Surface (inherits parent stacking context; does not allocate a z-index)
- **Material preset:** none (layout-only — no glass surface)
- **Primary interaction spring:** none (no interaction)
- **Applicable motions:**
  - *Primitives (callable via `motion.*` API):* none
  - *Interaction physics (§2.6 — always-on, not directly called):* none
  - *CSS animations (keyframe-based):* none

---

## Attribute Contract

| Attribute | Type | Default | Reflected | Description |
|---|---|---|---|---|
| `size` | string (CSS length) \| none | none | Yes | Explicit width and/or height applied to the spacer. Which dimension is set is controlled by `axis`. When absent, the spacer occupies no intrinsic space unless `grow` is also set. |
| `grow` | boolean (presence) | false | Yes | Sets `flex: 1 1 0` on the host, filling all available flex space along the parent's main axis. Takes precedence over `size` along the flex axis when both are set. |
| `axis` | `'both' \| 'horizontal' \| 'vertical'` | `'both'` | Yes | Controls which dimension `size` applies to. `'horizontal'` sets only `width`; `'vertical'` sets only `height`; `'both'` sets both `width` and `height`. Has no effect when `size` is absent. |

---

## Property Contract

*(none — all configuration is attribute-driven)*

---

## Slot Contract

*(none — spacer is a void element; no content is expected or rendered)*

---

## Event Contract

| Event | When | `detail` shape |
|---|---|---|
| `fluid:mounted` | After `connectedCallback` completes | none |
| `fluid:unmounted` | After `disconnectedCallback` completes | none |

---

## ARIA Pattern

- **Role:** none — `aria-hidden="true"` is set automatically on the host. Spacer is a decorative spacing element with no semantic value.
- **Required attributes:** `aria-hidden="true"` on host (set automatically in `connectedCallback`)
- **Keyboard:** none — spacer is not focusable (`tabindex` is never set)
- **Screen reader:** invisible to assistive technology

*(From §X ARIA table: `fluid-spacer` → Shadow `<div aria-hidden=true>`, role: none, `aria-hidden=true` on host; not focusable)*

---

## State Machine

```
idle  (layout-only — no interactive states)
```

---

## Tier Behaviour

- **Matte:** Transparent CSS box with no visual rendering. `display: block` on host; `width` and/or `height` set from `size` attribute per `axis`; `flex: 1 1 0` when `grow` is set. No border, background, or shadow at any tier.
- **Frosted:** Identical to Matte — spacer has no glass surface.
- **Crystalline:** Identical to Matte — spacer has no glass surface.
- **Optical:** Identical to Matte — spacer has no glass surface.

---

## Accessibility Requirements

- `prefers-reduced-motion:` No effect — spacer has no animation.
- `prefers-contrast: more:` No effect — spacer has no visual surface or borders.
- `forced-colors:` No effect.
- **RTL:** No directional adjustments needed. Spacer dimensions are expressed in CSS logical properties where applicable (`inline-size` / `block-size`) to respect writing mode.

---

## API Stability

- Attributes: `@stable`
- Events: `@stable`
- Internal methods: `@internal`
