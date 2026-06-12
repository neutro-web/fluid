# `fluid-skeleton` Component Spec

## Classification
- **Type:** Element (loading placeholder utility)
- **Layer:** Surface
- **Material preset:** thin
- **Primary interaction spring:** gentle (fade-out only — opacity spring to 0 on content reveal)
- **Applicable motions:**
  - *Primitives (callable via `motion.*` API):* none — the fade-out is a direct opacity spring (`startSpring(el, 'opacity', 0, SPRING_PRESETS.gentle)`), not a named primitive such as `motion.recede()`
  - *Interaction physics (§2.6 — always-on, not directly called):* none
  - *CSS animations (keyframe-based):* Shimmer (`fluid-skeleton` `@keyframes` gradient sweep) when `animate` attribute is present; none when `animate` is absent

---

## Attribute Contract

| Attribute | Type | Default | Reflected | Description |
|---|---|---|---|---|
| `variant` | `'text' \| 'circular' \| 'rectangular'` | `'rectangular'` | Yes | Shape of the loading placeholder |
| `width` | string (CSS length) | `'100%'` | Yes | Inline width applied via host element style |
| `height` | string (CSS length) | `'1em'` for `text`, `'40px'` for others | Yes | Inline height applied via host element style |
| `lines` | integer string | `'1'` | Yes | Number of stacked text-line skeletons to render; only applies when `variant="text"`. When `lines > 1`, N skeleton bars render in a flex column with `gap: 0.3em`; the last bar is 60% width to simulate natural text ending. |
| `animate` | boolean (presence) | true | Yes | Controls shimmer animation. Remove attribute to show a static tinted placeholder without motion. |

---

## Property Contract

*(none — all configuration is attribute-driven)*

---

## Slot Contract

| Slot | Required | Fallback | Description |
|---|---|---|---|
| `(default)` | No | Internal shimmer surface | Consumers may project real content into this slot to trigger a cross-fade from skeleton to content; receiving slotted content starts the fade-out opacity spring |

---

## Event Contract

| Event | When | `detail` shape |
|---|---|---|
| `fluid:mounted` | After `connectedCallback` completes | none |
| `fluid:unmounted` | After `disconnectedCallback` completes | none |

---

## ARIA Pattern

- **Role:** none — `aria-hidden="true"` is set automatically on the host in `connectedCallback`. Skeleton is a decorative placeholder that must not be announced by screen readers.
- **Required attributes:** `aria-hidden="true"` on host (set automatically); `tabindex="-1"` on host (skeleton is not keyboard-focusable)
- **Live region:** none — skeleton does not carry `role="status"` or `aria-live`. Adding either to every skeleton instance would spam screen readers. The enclosing container is responsible for setting `aria-busy="true"` while skeletons are present.
- **Composition:** when used as a `fluid-card[loading]` skeleton overlay, `aria-busy="true"` is managed by the card, not by the skeleton
- **Screen reader:** skeleton is fully invisible to assistive technology; the parent container's `aria-busy` state conveys loading status

*(From §X ARIA table: `fluid-skeleton` → Shadow `<div aria-hidden=true>`, role: none, `aria-hidden=true` on host, `tabindex=-1`; container provides `aria-busy=true`; skeleton does not duplicate it)*

---

## State Machine

```
active     (shimmer running — animate attribute present, no slotted content)
animate removed → static (shimmer stops; static tinted surface remains)
loaded     (default slot receives content → fade-out spring starts: startSpring(el, 'opacity', 0, SPRING_PRESETS.gentle) → element removed from DOM on settle)
```

---

## Tier Behaviour

- **Matte:** Static opaque tinted surface — `border-radius` for shape. No shimmer animation, even if `animate` attribute is present (Matte tier has no `backdrop-filter` capability; shimmer requires Frosted+ tier). Background uses `prefers-color-scheme` adaptive tint (`rgba` only, no `color-mix()`). Fade-out uses CSS `transition: opacity`.
- **Frosted:** Shimmer enabled when `animate` is present: `background: linear-gradient(90deg, tint, shimmer-highlight, tint)` sweeping via CSS `@keyframes`. `backdrop-filter: blur(8px)` on skeleton surface. Fade-out uses CSS `transition: opacity`.
- **Crystalline:** Shimmer tint adapts to `OffscreenCanvas`-sampled background luminance. Fade-out uses JS `gentle` spring via `AnimationDriver` (`startSpring(el, 'opacity', 0, SPRING_PRESETS.gentle)`). `color-mix()` used for shimmer highlight computation.
- **Optical:** No additional Houdini enhancements — skeleton is a transient placeholder, not a persistent optical surface.

---

## Accessibility Requirements

- `prefers-reduced-motion:` Shimmer animation suppressed regardless of `animate` attribute. Static tinted surface only. Fade-out on content reveal is instant (opacity snaps to 0, no spring).
- `prefers-contrast: more:` Tint alpha 0.90. `1px solid currentColor` border on all variants. No `backdrop-filter`. Shimmer disabled.
- `forced-colors:` `background: ButtonFace`, `border: 1px solid ButtonText`. All filter effects and shimmer disabled.
- **RTL:** Shimmer gradient direction reverses when a `dir="rtl"` ancestor is detected — sweep direction changes from right-to-left to preserve the expected left-to-right scan appearance in RTL contexts.

---

## API Stability

- Attributes: `@stable`
- Events: `@stable`
- Internal methods (`startShimmer`, `stopShimmer`, `fadeOut`): `@internal`
