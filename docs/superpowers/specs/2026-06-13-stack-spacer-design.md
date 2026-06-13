# Design: `fluid-stack` + `fluid-spacer`

**Date:** 2026-06-13  
**Status:** Approved  
**Approach:** A — Direct `HTMLElement` + attribute-to-CSS mapping, no shadow DOM

---

## Summary

Two layout primitive custom elements. No glass material, no springs, no visual surface. The host element is the flex container. Tier-specific behaviour (FLIP animation) activates automatically — consumers wire nothing.

---

## `fluid-stack`

### Element structure

`fluid-stack` extends `HTMLElement` directly. The host IS the flex container (`display: flex` on `:host`). No shadow DOM. Children are light-DOM children; no slot projection needed.

### Attribute → CSS mapping

| Attribute   | CSS target         | Notes |
|-------------|-------------------|-------|
| `direction` | `flex-direction`   | `horizontal` → `row`, `vertical` → `column`; RTL auto-reverses `horizontal` |
| `gap`       | `gap`             | Named tokens (`xs/sm/md/lg/xl`) resolved via lookup; arbitrary CSS lengths passed through |
| `align`     | `align-items`     | Direct passthrough |
| `justify`   | `justify-content` | Direct passthrough |
| `wrap`      | `flex-wrap`       | Presence → `wrap`, absence → `nowrap` |

All attributes reflected via `attributeChangedCallback` → `this.style.*` on the host.

### Gap token map

```
xs → var(--fluid-space-1)   4px
sm → var(--fluid-space-2)   8px
md → var(--fluid-space-4)   16px
lg → var(--fluid-space-6)   24px
xl → var(--fluid-space-10)  40px
```

Arbitrary CSS values (e.g. `gap="20px"`) pass through unchanged.

### Container queries

Responsive behaviour uses `@container` queries on the host. No media queries.

### FLIP layout animation (`layout` attribute)

Activates automatically based on `ledger.tier`:

- **Matte:** No animation. Child reorders are instant.
- **Frosted:** CSS `transition` approximation (`cubic-bezier(0.34, 1.56, 0.64, 1.0)`) on direct children.
- **Crystalline / Optical:** JS FLIP via `motion.flip()` using `AnimationDriver`. Two `getBoundingClientRect()` reads outside rAF (correct per FLIP contract). Capped at N=50 children (dev warning above threshold).
- **`prefers-reduced-motion`:** FLIP disabled entirely regardless of tier. Instant reorder.

`MutationObserver` on direct children triggers the FLIP snapshot cycle when `layout` is set.

### Lifecycle

Dispatches `fluid:mounted` (after `connectedCallback`) and `fluid:unmounted` (after `disconnectedCallback`) manually — does not extend `FluidElement`.

### Defaults

- `direction`: `vertical`
- `gap`: `var(--fluid-space-4)` (md, 16px)
- `align`: `stretch`
- `justify`: `start`
- `wrap`: false

---

## `fluid-spacer`

### Element structure

`fluid-spacer` extends `HTMLElement` directly. Host is the spacer element. No shadow DOM.

### Behaviour

- **No `size` attribute (default):** `flex: 1 1 auto` — grows to fill remaining space in a `fluid-stack`.
- **`size` attribute set:** `flex: 0 0 <token>` where the token uses the same `xs/sm/md/lg/xl` → `var(--fluid-space-*)` map as `fluid-stack`.

### ARIA

No role. Transparent to AT.

---

## Files

```
packages/fluid/src/components/stack/index.ts
packages/fluid/src/components/stack/styles.css
packages/fluid/src/components/spacer/index.ts
packages/fluid/src/components/spacer/styles.css
packages/fluid/src/components/stack/stack.spec.ts     ← tests (layout via computed styles)
apps/storybook/src/stack.stories.ts
apps/storybook/src/spacer.stories.ts
apps/playground/pages/stack.html
apps/playground/pages/spacer.html
apps/playground/index.html                            ← add nav entry under Layout
```

---

## Test strategy

- Computed style assertions only (no pixel snapshots).
- Assert `display: flex`, `flex-direction`, `gap`, `align-items`, `justify-content`, `flex-wrap` on the host element for each attribute combination.
- Assert `fluid-spacer` has `flex: 1 1 auto` by default and `flex: 0 0 <value>` with `size`.
- No a11y violations — layout elements are transparent to AT (axe passes trivially).

---

## Out of scope

- Grid layout (`display: grid`) — not in spec, not in user instructions.
- FLIP at Frosted tier uses CSS approximation only — JS FLIP is Crystalline+.
- No `fluid-theme` integration — stack/spacer inherit tokens from the cascade.
