# `fluid-empty-state` Component Spec

## Classification
- **Type:** Element (uses `fluid-card` surface as base — glass surface composition)
- **Layer:** Surface (Layer 1, same as `fluid-card`)
- **Material preset:** thin
- **Primary interaction spring:** gentle (same as `fluid-card` — `emerge` on mount, `recede` on unmount)
- **Applicable motions:**
  - *Primitives (callable via `motion.*` API):* `emerge` (entry animation on `connectedCallback`), `recede` (exit animation on `disconnectedCallback`)
  - *Interaction physics (§2.6 — always-on, not directly called):* none — `fluid-empty-state` is not interactive; any `fluid-button` in the `actions` slot manages its own interaction physics
  - *CSS animations (keyframe-based):* none

---

## Attribute Contract

| Attribute | Type | Default | Reflected | Description |
|---|---|---|---|---|
| `headline` | string | `''` | Yes | Required. The primary empty state message displayed as the heading. A dev-mode warning fires in `connectedCallback` if this attribute is absent or empty: `[fluid warn] fluid-empty-state: 'headline' attribute is required.` |
| `description` | string | `''` | Yes | Supporting text displayed below the headline. Hidden when empty. |
| `illustration` | string (URL) | `''` | Yes | URL for an SVG or image shown above the headline. Hidden when empty. Ignored when the `illustration` slot contains a custom illustration element. |

---

## Property Contract

*(none — all configuration is attribute-driven)*

---

## Slot Contract

| Slot | Required | Fallback | Description |
|---|---|---|---|
| `illustration` | No | Hidden | Custom illustration element. When slotted content is present, it is rendered above the headline and the `illustration` attribute URL is ignored. The slot name matches the attribute name for clarity. |
| `actions` | No | Hidden | CTA area — typically one `fluid-button[variant=primary]` element. Rendered below the description. The actions slot manages its own events; `fluid-empty-state` does not re-emit them. |

---

## Event Contract

| Event | When | `detail` shape |
|---|---|---|
| `fluid:mounted` | After `connectedCallback` completes and `emerge` animation starts | none |
| `fluid:unmounted` | After `disconnectedCallback` completes | none |

---

## ARIA Pattern

- **Role:** none on the root container — no ARIA landmark role is added automatically. If `fluid-empty-state` is the sole content in a page region, consumers should wrap it in `fluid-section` (which provides `role="region"` with a required `aria-label`).
- **Required attributes:** none — the `headline` attribute provides visible text; no additional `aria-label` is needed on the container when headline is present.
- **Optional attributes:** `aria-label` on the host may be used to override the accessible name when the visual headline is insufficient for context.
- **Keyboard:** `fluid-empty-state` itself is not focusable. Tab traversal reaches `fluid-button` elements in the `actions` slot, which manage their own keyboard behaviour.
- **Screen reader:** headline text, description text, and actions slot content are announced in DOM order.

*(From §X ARIA table: `fluid-empty-state` → Shadow `<div>`, role: none, optional `aria-label` for context; CTA `fluid-button` handles own keyboard)*

---

## State Machine

```
idle  (no loading, no error, no interactive states — fluid-empty-state IS the empty/error state)
```

`fluid-empty-state` does not have a loading or error state of its own. It is the indicator of
absence. A loading state on the parent container determines when the empty state is shown at all.
The actions slot's `fluid-button` elements may carry their own loading states independently.

**API design rationale:** Headline and description are string attributes rather than slots because
`fluid-empty-state` communicates a fixed, predictable message. Slots invite arbitrary HTML into the
heading which creates accessibility problems (the accessible name becomes unpredictable) and visual
inconsistency. String attributes are the correct API for text that must be controlled.

---

## Tier Behaviour

Follows `fluid-card` (Surface layer) glass treatment at all tiers:

- **Matte:** Opaque tinted surface, `border-radius` per geometry tokens, no backdrop-filter. Illustration rendered at full opacity. `emerge` uses opacity-only at Matte (no `backdrop-filter` to blur through). No shadow.
- **Frosted:** `backdrop-filter: blur(var(--fluid-blur-thin))` on card surface. Subtle drop shadow. `emerge` uses `scale` + `opacity` spring (`gentle` preset — Layer 1 default per §VII). Illustration rendered with glass-appropriate contrast.
- **Crystalline:** `backdrop-filter` with `OffscreenCanvas`-sampled tint. `emerge` uses full `scale` + `opacity` `gentle` spring. Illustration tint adapts to sampled background luminance.
- **Optical:** No additional Houdini enhancements beyond Crystalline for this Surface-layer component.

---

## Accessibility Requirements

- `prefers-reduced-motion:` `emerge` and `recede` animations suppress `scale`/`translate`; opacity-only fade (`0→1` or `1→0`) replaces all scale springs. This matches the global reduced-motion contract from §2.5.
- `prefers-contrast: more:` Tint alpha → 0.95. `2px solid currentColor` border on the card surface. All `backdrop-filter` disabled. Illustration border added if illustration is present.
- `forced-colors:` `background: Canvas`, `border: 1px solid ButtonText`. All filter effects disabled. Illustration rendered without tinting.
- **RTL:** Illustration, headline, description, and actions layout use CSS logical properties (`margin-inline`, `padding-inline`, `text-align: start`) throughout. Illustration and text column alignment responds to writing direction automatically.

---

## API Stability

- Attributes: `@stable`
- Events: `@stable`
- Internal methods (`mountAnimation`, `unmountAnimation`): `@internal`
