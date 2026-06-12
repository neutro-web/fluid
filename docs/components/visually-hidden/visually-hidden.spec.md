# `fluid-visually-hidden` Component Spec

## Classification
- **Type:** Element (accessibility utility — no glass material)
- **Layer:** Surface (inherits parent stacking context; does not allocate a z-index)
- **Material preset:** none (accessibility-only utility)
- **Primary interaction spring:** none (no interaction)
- **Applicable motions:**
  - *Primitives (callable via `motion.*` API):* none
  - *Interaction physics (§2.6 — always-on, not directly called):* none
  - *CSS animations (keyframe-based):* none

---

## Attribute Contract

*(none beyond inherited global HTML attributes — no component-specific attributes)*

---

## Property Contract

*(none — no component-specific properties)*

---

## Slot Contract

| Slot | Required | Fallback | Description |
|---|---|---|---|
| `(default)` | No | Empty | The content to be announced by screen readers. Content is present in the DOM and participates in the accessibility tree normally. |

---

## Event Contract

| Event | When | `detail` shape |
|---|---|---|
| `fluid:mounted` | After `connectedCallback` completes | none |
| `fluid:unmounted` | After `disconnectedCallback` completes | none |

---

## ARIA Pattern

- **Role:** no role override — the host element carries no explicit ARIA role. Content in the default slot is naturally present in the DOM and announced by screen readers according to its own semantics.
- **Required attributes:** none — do NOT set `aria-hidden` on the host; doing so would remove the content from the accessibility tree and defeat the purpose of this component.
- **Keyboard:** if slotted content contains a focusable element (e.g., a skip-link `<a>`), it receives focus normally via Tab. On `:focus-visible`, the clip technique is reversed to make the element visible: `clip: auto; width: auto; height: auto; overflow: visible` (etc.) so keyboard users see where focus is.
- **Screen reader:** content is announced naturally by virtue of being in the DOM. No live region — this component does not announce on mount, only when focus or reading order reaches it.

*(From §X ARIA table: `fluid-visually-hidden` → host element styled with clip technique, role: none, required attributes: none; content is in DOM, announced naturally)*

---

## State Machine

```
idle  (no interactive states — content is always present in the accessibility tree)
```

---

## Tier Behaviour

The CSS clip technique is applied unconditionally to the `:host` at all tiers. There is no glass surface, no backdrop-filter, and no material rendering at any tier.

```css
/* Applied to :host at all tiers */
position: absolute;
width: 1px;
height: 1px;
padding: 0;
margin: -1px;
overflow: hidden;
clip: rect(0, 0, 0, 0);
white-space: nowrap;
border: 0;
```

When slotted content receives `:focus-visible`, the host transitions to a visible state:
```css
:host(:focus-within) {
  clip: auto;
  width: auto;
  height: auto;
  overflow: visible;
  margin: 0;
  white-space: normal;
}
```

- **Matte:** Clip technique only. No background, no border, no visual surface at any tier.
- **Frosted:** Identical to Matte.
- **Crystalline:** Identical to Matte.
- **Optical:** Identical to Matte.

---

## Accessibility Requirements

- `prefers-reduced-motion:` No effect — this component has no animation.
- `prefers-contrast: more:` No effect on the visually-hidden container itself. When a focusable child becomes visible on focus, it inherits contrast styles from its own component.
- `forced-colors:` No effect on the container. Visible-on-focus slotted content respects forced-colors as normal.
- **RTL:** No directional adjustments needed. Content in the slot is announced in DOM order regardless of writing direction.

---

## API Stability

- Attributes: `@stable`
- Events: `@stable`
- Internal methods: `@internal`
