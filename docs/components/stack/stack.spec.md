# `fluid-stack` Component Spec

## Classification
- **Type:** Element (layout utility — no glass material)
- **Layer:** Surface (inherits parent stacking context; does not allocate a z-index)
- **Material preset:** none (layout-only — no glass surface)
- **Primary interaction spring:** smooth (FLIP only, when `layout` attribute is set)
- **Applicable motions:**
  - *Primitives (callable via `motion.*` API):* `motion.flip()` — invoked on direct children when they reorder, enter, or resize (only when `layout` is set)
  - *Interaction physics (§2.6 — always-on, not directly called):* none
  - *CSS animations (keyframe-based):* none

---

## Attribute Contract

| Attribute | Type | Default | Reflected | Description |
|---|---|---|---|---|
| `direction` | `'horizontal' \| 'vertical'` | `'vertical'` | Yes | Flex axis of the stack |
| `gap` | string (CSS length or Fluid space token) | `'var(--fluid-space-md)'` | Yes | Gap between children — accepts any CSS length value or a Fluid space token name (e.g. `sm`, `lg`) |
| `align` | `'start' \| 'center' \| 'end' \| 'stretch' \| 'baseline'` | `'stretch'` | Yes | Maps to `align-items` |
| `justify` | `'start' \| 'center' \| 'end' \| 'space-between' \| 'space-around' \| 'space-evenly'` | `'start'` | Yes | Maps to `justify-content` |
| `wrap` | boolean (presence) | false | Yes | Enables `flex-wrap: wrap` |
| `layout` | boolean (presence) | false | Yes | Enables FLIP layout animation on direct children when they reorder, enter, or resize |

---

## Property Contract

*(none — all configuration is attribute-driven)*

---

## Slot Contract

| Slot | Required | Fallback | Description |
|---|---|---|---|
| `(default)` | No | Empty flex container | Children arranged according to `direction`, `gap`, `align`, and `justify` |

---

## Event Contract

| Event | When | `detail` shape |
|---|---|---|
| `fluid:mounted` | After `connectedCallback` completes | none |
| `fluid:unmounted` | After `disconnectedCallback` completes | none |

---

## ARIA Pattern

- **Role:** none — stack is a layout-only container and introduces no ARIA semantics
- **Required attributes:** none
- **Keyboard:** no direct keyboard interaction; Tab traversal passes through normally to slotted children
- **Screen reader:** stack is transparent to assistive technology — the DOM tree of children is presented as-is

*(From §X ARIA table: `fluid-stack` → Shadow `<div>`, role: none, required attributes: none, keyboard: none)*

---

## State Machine

```
idle  (layout-only — no interactive states)
children change position/size (with `layout`) → FLIP snapshot → DOM update → motion.flip() animate → idle
```

---

## Tier Behaviour

- **Matte:** Transparent flex container. No visual treatment. Stack itself does NOT set `contain` — it has no visual surface. When `layout` is set, child position changes use bezier `cubic-bezier(0.34, 1.56, 0.64, 1.0)` CSS transition approximation.
- **Frosted:** Identical to Matte — stack has no glass surface. When `layout` is set, CSS `linear()` spring approximation for child FLIP.
- **Crystalline:** When `layout` is set, JS `smooth` spring via `AnimationDriver` for child FLIP (two `getBoundingClientRect()` reads outside rAF per the FLIP contract — this is the sole acceptable exception to "no layout reads in rAF"). Children with `view-transition-name` participate in View Transitions automatically.
- **Optical:** No additions — stack has no visual rendering surface.

**FLIP child cap:** When `layout` is set, FLIP is capped at N=50 direct children. A dev-mode warning fires when child count exceeds 50:
```
[fluid warn] fluid-stack[layout] has >50 children — FLIP suppressed for performance.
```
FLIP is not invoked above this threshold; children reorder instantly without animation.

---

## Accessibility Requirements

- `prefers-reduced-motion:` FLIP animation disabled entirely. Child position changes apply instantly with no transition or spring. Children are not moved via transform.
- `prefers-contrast: more:` No effect — stack has no visual surface or borders.
- `forced-colors:` No effect.
- **RTL:** When `direction="horizontal"` and a `dir="rtl"` ancestor (or `dir="rtl"` on the host) is detected, the stack automatically sets `flex-direction: row-reverse` on the inner flex container to match reading direction. This is correct RTL behaviour for sequential horizontal content. For other layout modes, direction-aware behaviour must be achieved with `[dir="rtl"]` CSS or logical flex properties on the consumer side.

---

## API Stability

- Attributes: `@stable`
- Events: `@stable`
- Internal methods (`runFLIP`, `observeChildren`): `@internal`
