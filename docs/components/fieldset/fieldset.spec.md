# `fluid-fieldset` Component Spec

## Classification
- **Type:** Element
- **Layer:** Surface (Layer 1)
- **Material preset:** thin — glass treatment applied to the legend header area only; body has no glass material
- **Primary interaction spring:** gentle (emerge on mount for the glass legend header)
- **Applicable motions:**
  - *Primitives (callable via `motion.*` API):* `emerge` (legend header on mount — scale + opacity from 0.92/0 to 1.0/1, `gentle` spring); `recede` (legend header on unmount)
  - *Interaction physics (§2.6 — always-on, not directly called):* none
  - *CSS animations (keyframe-based):* none

---

## Attribute Contract

| Attribute | Type | Default | Reflected | Description |
|---|---|---|---|---|
| `disabled` | boolean (presence) | false | Yes | Disables all nested form controls. Sets `aria-disabled="true"` on the inner `<fieldset>` element AND dispatches `DISABLED_CONTEXT_KEY` via the context protocol (§8.4) so all nested form components receive `disabled=true`. CSS `:host([disabled])` applies `opacity: 0.5; pointer-events: none` to the legend header only (not the body). |
| `legend` | string | `''` | Yes | Text content for the legend. Renders in the glass legend header as visible text. If absent and no `legend` slot is provided, a dev warning fires at mount: `[fluid warn] fluid-fieldset requires a legend attribute or legend slot for accessibility.` |
| `name` | string | `''` | Yes | Name for the fieldset group. Passed through to `ElementInternals` if applicable; exposed for form tooling and test selectors. |

---

## Property Contract

*(none — all configuration is attribute-driven)*

---

## Slot Contract

| Slot | Required | Fallback | Description |
|---|---|---|---|
| `(default)` | No | Empty fieldset body | Primary content area. Form controls, inputs, and other content placed here receive the disabled context when `fluid-fieldset[disabled]` is set. |
| `legend` | No | Hidden (`aria-hidden="true"` — replaced by rendered legend from `legend` attribute if present) | Custom legend element overriding the `legend` attribute. When provided, the `legend` attribute value is ignored for rendering but still used for dev warning check. |
| `header-actions` | No | Hidden | Trailing content in the legend header row (e.g., an icon button, a badge, or a toggle). Rendered after the legend text in the header. |

---

## Event Contract

| Event | When | `detail` shape |
|---|---|---|
| `fluid:mounted` | After `connectedCallback` completes and legend header `emerge` motion settles | none |
| `fluid:unmounted` | After `disconnectedCallback` completes and legend header `recede` motion settles | none |

---

## ARIA Pattern

- **Role:** `group` — implicit from the shadow `<fieldset>` element. Fieldset provides the native grouping semantics without requiring an explicit `role` attribute.
- **Required attributes:**
  - `aria-labelledby` on the shadow `<fieldset>` — points to the inner legend element via `generateFluidId('legend', host)`. The ID is stable and SSR-safe (§8.1b). The legend element renders in the shadow DOM with this generated ID.
- **Optional attributes:**
  - `aria-disabled="true"` on the shadow `<fieldset>` element — set when `disabled` attribute is present on host. Communicates disabled state to assistive technology for the entire group.
- **Keyboard:** none directly on `fluid-fieldset` itself — Tab traverses child elements inside the default slot. The fieldset element is not itself focusable.
- **State → ARIA mapping:**
  - `disabled` present → `aria-disabled="true"` on `<fieldset>` element + `DISABLED_CONTEXT_KEY` dispatched via context protocol
  - `disabled` removed → `aria-disabled` removed from `<fieldset>` + `DISABLED_CONTEXT_KEY` dispatched with `false`

*(From §X ARIA table: `fluid-fieldset` → Shadow `<fieldset>`, role: `group` (implicit); `aria-labelledby` pointing to inner legend ID (generated via `generateFluidId('legend', host)`); optional: `aria-disabled`; keyboard: Tab traverses children; `disabled` → `aria-disabled=true` on `<fieldset>` + `DISABLED_CONTEXT_KEY` dispatch via context protocol)*

---

## Disabled Context Protocol

This is the critical Phase 4 gate. All Phase 4 input components depend on `DISABLED_CONTEXT_KEY` being exported and stable.

`DISABLED_CONTEXT_KEY` is exported from `core/context.ts` and is `@stable`.

```typescript
// In fluid-fieldset's onMount() and attributeChangedCallback('disabled'):
if (this.hasAttribute('disabled')) {
  provideContext(this, DISABLED_CONTEXT_KEY, true)
} else {
  provideContext(this, DISABLED_CONTEXT_KEY, false)
}
```

All nested form components (`fluid-button`, `fluid-text-field`, `fluid-checkbox`, `fluid-select`, etc.) call the following in their own `onMount()`:

```typescript
requestContext(this, DISABLED_CONTEXT_KEY, (disabled: boolean) => {
  this.disabled = disabled
})
```

The context protocol uses `fluid:context-request` events (§8.4):
- `bubbles: true`, `composed: false` — does not cross shadow boundaries.
- `fluid-fieldset` stops propagation after handling: `e.stopPropagation()`.
- If no `fluid-fieldset` ancestor is present, the callback is never called, and the form control manages its own `disabled` state independently.

CSS provides the visual layer of disabled propagation as a fallback and supplement:
```css
/* Applied in each nested form component's shadow styles */
:host([disabled]) {
  pointer-events: none;
  opacity: 0.5;
}
```

The context protocol adds semantic `aria-disabled` on top of the visual CSS fallback. Both mechanisms must be present.

---

## State Machine

```
idle        (enabled — all children interactive, no disabled context dispatched)
idle → disabled    (disabled attribute set — aria-disabled="true" on <fieldset>,
                    DISABLED_CONTEXT_KEY dispatched with true,
                    legend header opacity: 0.5, body opacity unaffected)
disabled → idle    (disabled removed — aria-disabled removed from <fieldset>,
                    DISABLED_CONTEXT_KEY dispatched with false,
                    legend header opacity restores to 1.0)
```

---

## Tier Behaviour

- **Matte:** Opaque thin legend header. No `backdrop-filter` on legend area. Body has no glass treatment. `box-shadow` on legend header for depth separation. `@starting-style` emerge not applied (CSS-only tier). Legend header background: `--fluid-color-neutral-100` (light) / `--fluid-color-neutral-800` (dark).
- **Frosted:** `backdrop-filter: blur(8px)` on legend header. `@starting-style` emerge transition for header on mount (CSS-only spring approximation). Tint from `--fluid-tint-alpha`. Body remains non-glass.
- **Crystalline:** JS `gentle` spring for `emerge`/`recede` on legend header via `AnimationDriver`. `OffscreenCanvas` adaptive tint for legend header. `contain: layout style paint` on legend header element. `color-mix()` for tint computation. Body remains non-glass.
- **Optical:** Houdini paint worklet on legend header surface for advanced tinting. Same JS `gentle` spring as Crystalline for emerge/recede. Worklet capability fail → Crystalline graceful degradation.

---

## Accessibility Requirements

- `prefers-reduced-motion: reduce:` `emerge`/`recede` motion on legend header collapses to opacity-only fade (scale/translate suppressed per global reduced-motion contract §2.5). No structural change to component behavior.
- `prefers-contrast: more:` `2px solid currentColor` border on legend header. Tint alpha → 0.95. `backdrop-filter` disabled. Legend text contrast guaranteed.
- `forced-colors:` Legend header area uses `Canvas` background and `ButtonText` for legend text. Inner `<fieldset>` border visible (native fieldset border preserved or replicated). All custom color tokens and filter effects overridden.
- **RTL:** Legend text and `header-actions` slot content use CSS logical properties throughout (`padding-inline-start`, `padding-inline-end`, `margin-inline-*`). Legend text reads from `inline-start` regardless of direction. `header-actions` slot remains at `inline-end`.
- **Disabled visual treatment:** `:host([disabled])` applies `opacity: 0.5; pointer-events: none` to the **legend header only** (not the fieldset body). Body content remains fully readable at full opacity — only the group header indicates disabled status visually. All interactive descendants must apply their own `:host([disabled])` styles (handled by each component individually via context protocol).

---

## API Stability

- Attributes: `@stable`
- Events: `@stable`
- `DISABLED_CONTEXT_KEY` (exported from `core/context.ts`): `@stable` — Phase 4 inputs depend on this export. Must not be renamed or moved.
- Internal methods (`provideDisabledContext`, `revokeDisabledContext`): `@internal`
