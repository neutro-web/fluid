# `fluid-sidebar` + `fluid-breadcrumb` + `fluid-back-button` Component Spec

> **Status:** Draft for review · **Subtask:** P3-03 · **Size:** M each (three components, one spec)
> **Authoritative sources:** foundation §X (ARIA contract, reduced-motion table), §XI (navigation taxonomy), §8.11 (RTL, `--fluid-dir`, i18n), §III (tiers); AGENTS.md (FluidRipple contract, aria-label hard-error rule); roadmap P3-03.
> This spec takes precedence over any session-brief instruction it conflicts with. Surface conflicts; do not resolve unilaterally.

Three independent navigation components grouped because they share the **landmark + RTL-mirroring** concerns. They do NOT communicate (no context protocol between them). Each may be implemented in its own session or all three in one.

---

## Shared Concerns (apply to all three)

### RTL mirroring (§8.11)
All horizontal directionality uses **CSS logical properties** (`inline-start`/`inline-end`, `margin-inline-*`, `padding-inline-*`) so layout mirrors automatically under `dir="rtl"` with no JS. Where a **directional glyph** must physically flip (breadcrumb separator `›`, back-button arrow `‹`), the component applies the **`--fluid-dir` multiplier** (§8.11) to a `scaleX()` transform on the glyph: `transform: scaleX(var(--fluid-dir, 1))`. In LTR `--fluid-dir` resolves to `1` (no flip); in RTL it resolves to `-1` (horizontal mirror). The exact token value is owned by the merged token layer (P0-T6) — the implementer must confirm `--fluid-dir` resolves to `-1` under `[dir="rtl"]` and not re-derive it.

**Rule:** never flip directional glyphs with conditional JS or duplicate RTL/LTR markup. One glyph, `scaleX(var(--fluid-dir))`. Text content and logical layout flip via logical properties; only the *icon* needs the multiplier.

### Landmark roles
`fluid-sidebar` and `fluid-breadcrumb` are `navigation` landmarks and require accessible names (multiple navs on a page must be distinguishable — same rationale as nav-bar). `fluid-back-button` is a single control, not a landmark.

### FluidRipple
Per AGENTS.md: ripple is action-component-only. `fluid-back-button` is an action component → ripple permitted (gated on `ledger.tier !== 'matte' && !ledger.deviceMemoryLow`, `overflow: hidden` on `:host`). `fluid-sidebar` and `fluid-breadcrumb` are structural/surface → no ripple.

### Tier-change reactivity
Any tier-gated behavior (e.g. sidebar collapse animation, back-button ripple/press) follows the AGENTS.md `fluidledger:tier-change` contract: listener in `onMount`, removed via `this.disposers`, in-flight tier-specific animation cancelled on switch.

---

## `fluid-sidebar`

### Classification
- **Type:** Element.
- **Layer:** Raised (Layer 2).
- **Material preset:** `regular`.
- **Primary interaction spring:** `smooth` — collapse/expand width transition.
- **Applicable motions:**
  - Collapse/expand width: scroll-linked? No — driven by `expand`/`collapse` semantics adapted to the inline axis. Use `motion.animate` with a width transition gated by tier (see Tier Behavior). The §2.5 `expand`/`collapse` primitives are clip/max-height on the block axis; sidebar collapse is inline-axis width, so it uses a CSS width transition with a spring-approximating timing at Frosted+ and an instant change at Matte, NOT the block-axis `expand`/`collapse` primitives. (Flag: if the implementer finds an inline-axis variant of expand/collapse in merged motion.ts, prefer it; otherwise CSS width transition.)
  - No FluidRipple (structural surface).

### Attribute Contract

| Attribute | Type | Default | Reflected | Description |
|---|---|---|---|---|
| `collapsed` | boolean | absent | yes | When present, the sidebar is in its collapsed (narrow/rail) state. Controlled/uncontrolled per §8.5: if `collapsed` is ever present the sidebar is controlled (fires `fluid:toggle`, waits for consumer); if the consumer uses the `collapsible` affordance without managing state, it self-toggles. |
| `collapsible` | boolean | absent | yes | When present, renders a built-in collapse toggle control and allows user collapse. When absent, the sidebar is always expanded (no toggle). |
| `side` | `inline-start \| inline-end` | `inline-start` | yes | Which edge the sidebar anchors to, logical (auto-mirrors in RTL). Invalid → dev warn, retain. |
| `collapsed-width` | string (CSS length) | `64px` | yes | Width in collapsed state. |
| `expanded-width` | string (CSS length) | `256px` | yes | Width in expanded state. |

### Property Contract

| Property | Type | Reflects | Description |
|---|---|---|---|
| `collapsed` | `boolean` | `collapsed` | Collapsed state accessor. |
| `collapsible` | `boolean` | `collapsible` | Whether the toggle affordance is shown. |
| `side` | `'inline-start' \| 'inline-end'` | `side` | Anchor edge. |

**Required ARIA:** `aria-label` or `aria-labelledby` on the host (named `navigation` landmark). **Dev warning if absent** (not hard error — consistent with nav-bar/section, which warn rather than throw for landmarks): `[fluid warn] fluid-sidebar should have aria-label or aria-labelledby (unnamed navigation landmark).`

### Slot Contract

| Slot | Required | Fallback | Description |
|---|---|---|---|
| `(default)` | no | empty | Sidebar navigation content — typically `fluid-link`s, groups, or a `fluid-tab-bar[orientation="vertical"]`. |
| `header` | no | hidden | Top region (logo, app title) — persists in collapsed state. |
| `footer` | no | hidden | Bottom region (user menu, settings) — persists in collapsed state. |

### Event Contract

| Event | When | `detail` | bubbles / composed |
|---|---|---|---|
| `fluid:toggle` | Collapsed state changes (user toggle or programmatic). | `{ collapsed: boolean }` | `true` / `true` |

### ARIA Pattern (`fluid-sidebar`)
- **Role:** `navigation` (via `this.internals.role = 'navigation'`).
- **Required name:** `aria-label`/`aria-labelledby` (dev warn if absent).
- **Collapse toggle** (when `collapsible`): a `fluid-icon-button` (or internal button) with `aria-expanded` reflecting expanded state, `aria-controls` pointing at the sidebar content region, and its own required `aria-label` (e.g. "Collapse sidebar" / "Expand sidebar", i18n via `FluidI18n`).
- **Keyboard:** Tab traverses slotted focusables in DOM order; the collapse toggle is itself Tab-focusable and Enter/Space-activated. No custom roving — sidebar is a container of independent links, not a composite widget.

### State Machine (`fluid-sidebar`)
Single axis — **collapsed ↔ expanded**. Default expanded (unless `collapsed` present on mount). Toggle (user via the affordance, or programmatic attribute change) animates width and fires `fluid:toggle`. `header`/`footer` slots remain visible in both states; default-slot link labels hide (icon-only) in collapsed state via CSS on `:host([collapsed])`.

### Tier Behavior (`fluid-sidebar`)
| Tier | Collapse animation |
|---|---|
| Matte | Width changes instantly (no transition). |
| Frosted+ | Width transitions with `smooth`-approximating timing; label fade coordinated. |

Reduced-motion: width change is instant (structural reflow still happens — the sidebar still collapses — but without the eased transition). Do not suppress the collapse itself.


---

## `fluid-breadcrumb`

### Classification
- **Type:** Element.
- **Layer:** Surface (Layer 1) — typically sits inline within page content, not a floating glass bar.
- **Material preset:** `none` — breadcrumb is a text trail; no glass surface (avoids nested-glass when placed inside a glass nav).
- **Primary interaction spring:** none (the crumbs are `fluid-link`s with their own behavior).
- **Applicable motions:** none on the container. No FluidRipple (structural).

### Attribute Contract

| Attribute | Type | Default | Reflected | Description |
|---|---|---|---|---|
| `separator` | string | `/` | yes | Glyph rendered between crumbs. Common values `/`, `›`, `→`. Rendered decoratively (see ARIA). Directional glyphs (`›`, `→`) flip in RTL via `--fluid-dir`; neutral glyphs (`/`) do not need flipping but the multiplier is harmless on them. |
| `collapse-after` | number | `0` (no collapse) | yes | If >0 and the crumb count exceeds it, middle crumbs collapse behind an ellipsis (`…`) menu, keeping the first and last `collapse-after − 1`. `0` = never collapse. |

### Property Contract

| Property | Type | Reflects | Description |
|---|---|---|---|
| `separator` | `string` | `separator` | Separator glyph. |
| `collapseAfter` | `number` | `collapse-after` | Collapse threshold. |

**Required ARIA:** `aria-label` on the host. Conventionally `"Breadcrumb"` (i18n via `FluidI18n`, key `breadcrumb.label`). Dev warn if absent.

### Slot Contract

| Slot | Required | Fallback | Description |
|---|---|---|---|
| `(default)` | yes | dev warn if empty | The crumb trail — `fluid-link` elements (P2-09), the last one being the current page. Empty → `[fluid warn] fluid-breadcrumb requires crumb content in the default slot.` |

### Event Contract
None. Crumbs are `fluid-link`s; activation is owned by the links, which fire their own `fluid:activate`.

### ARIA Pattern (`fluid-breadcrumb`)
- **Role:** `navigation` landmark (via `this.internals.role = 'navigation'`), named `aria-label="Breadcrumb"`.
- **Structure:** crumbs are presented as an ordered list — internally wrap the slotted crumbs so assistive tech reads them as a list (shadow `<ol>` with each crumb in an `<li>`, or `role="list"`/`role="listitem"` if slot structure prevents real `<ol>`). The implementer must ensure list semantics; a bare row of links is an axe/APG miss.
- **Current page:** the last crumb represents the current page and carries **`aria-current="page"`** — this is the correct, canonical use of `aria-current` (a link indicating the current page within a set), exactly the case AGENTS.md contrasts against the tab `aria-selected` rule. The current-page crumb is typically non-interactive (rendered as text, not a link) OR a link with `aria-current="page"`; either is APG-valid.
- **Separators are decorative:** rendered via CSS `::before`/`::after` on list items or as `aria-hidden="true"` glyphs — **never** announced. Separators are not in the a11y tree.
- **Keyboard:** Tab traverses the crumb links in order; no custom keys (it is a list of links, not a composite widget).

### Tier Behavior (`fluid-breadcrumb`)
No tier-gated rendering — it is text + links. Collapse-ellipsis menu (if `collapse-after` triggers) uses a `fluid-dropdown` at all tiers (future dependency; for P3-03 scope the ellipsis may be a simple disclosure if dropdown is unavailable — flag for implementer).

---

## `fluid-back-button`

### Classification
- **Type:** Element.
- **Layer:** Raised (Layer 2).
- **Material preset:** `regular` (or inherits button material).
- **Primary interaction spring:** `snappy` (press) / `bouncy` (release) — button feedback.
- **Applicable motions:** `depress`/`release` on press. **FluidRipple permitted** (action component) — gated per AGENTS.md contract, `overflow: hidden` on `:host`.

### Attribute Contract

| Attribute | Type | Default | Reflected | Description |
|---|---|---|---|---|
| `href` | string | — | yes | Optional navigation target. If present, back-button behaves as a link to `href`. If absent, it calls `history.back()` on activation. |
| `label` | string | i18n "Back" | yes | Visible text label (optional — back-button may be icon-only). |

### Property Contract

| Property | Type | Reflects | Description |
|---|---|---|---|
| `href` | `string` | `href` | Navigation target. |
| `label` | `string` | `label` | Visible label. |

### Slot Contract

| Slot | Required | Fallback | Description |
|---|---|---|---|
| `(default)` | no | i18n "Back" | Custom label content. |
| `icon` | no | default back chevron | Custom leading icon (replaces the default `‹` chevron). |

### Event Contract

| Event | When | `detail` | bubbles / composed |
|---|---|---|---|
| `fluid:activate` | Activated (pointer/Enter/Space/programmatic). | `{}` | `true` / `true` |

On activation: if `href` present → navigate to it; else → `history.back()`.

### ARIA Pattern (`fluid-back-button`)
- **Role:** native `button` (shadow `<button>`) when no `href`; native link (`<a>`) when `href` present.
- **Required name:** `aria-label` on the host. **Hard dev error if absent AND no visible text label** — same rule as `fluid-icon-button`/`fluid-fab` (roadmap P3-03 explicitly: "aria-label required, hard dev error if missing"). If a visible `label`/default-slot text is present, that provides the name and the explicit `aria-label` is optional. Error string: `[fluid error] fluid-back-button requires aria-label or visible label text.`
- **Default chevron direction:** the default back chevron points toward `inline-start` and **flips in RTL** via `scaleX(var(--fluid-dir))` — in RTL "back" points right. A custom slotted `icon` is the consumer's responsibility to mirror.
- **Keyboard:** Enter/Space activate (native button/link behavior); Tab focusable.

### Tier Behavior (`fluid-back-button`)
Same as `fluid-button`/`fluid-icon-button`: ripple + press physics at Frosted+, instant at Matte. Reduced-motion: press degrades to opacity per `depress`/`release` `reducedPhases`.

---

## Accessibility (all three)
- **Reduced-motion (§X):** sidebar width change instant; back-button press → opacity; breadcrumb has no motion. All structural behavior (collapse, navigation) unaffected.
- **forced-colors / high-contrast (§X):** backdrop-filter disabled, explicit borders; sidebar collapsed/expanded distinguished structurally; breadcrumb current-page distinguished by `aria-current` (not color alone); back-button border explicit.
- **RTL (§8.11):** sidebar `side` mirrors via logical anchor; breadcrumb separator glyph flips via `--fluid-dir` (directional glyphs only); back-button chevron flips via `--fluid-dir`. Text and layout mirror via logical properties.
- **axe-core:** zero violations — named landmarks (sidebar, breadcrumb), breadcrumb list semantics + `aria-current="page"` on current, back-button named.

---

## Acceptance Criteria

Standard test matrix (AGENTS.md) per component, **plus** all of:

**`fluid-sidebar`**
1. `navigation` role on host; dev warn if no `aria-label`/`aria-labelledby`.
2. `collapsible` present → collapse toggle rendered with `aria-expanded` + `aria-controls`; absent → no toggle, always expanded.
3. Toggling collapse fires `fluid:toggle` with `{ collapsed }`; controlled mode (`collapsed` attr present) fires event but does not self-change until consumer updates attribute; uncontrolled self-toggles.
4. `side="inline-end"` anchors to the end edge; under `dir="rtl"` `inline-start` visually anchors right (logical mirroring, no JS).
5. `header`/`footer` slots remain visible when collapsed; default-slot labels hide (icon-rail) when collapsed.
6. Collapsed/expanded widths honor `collapsed-width`/`expanded-width`.
7. Frosted+ animates width transition; Matte changes instantly; reduced-motion instant but still collapses.

**`fluid-breadcrumb`**
8. `navigation` role, `aria-label` present (default "Breadcrumb"); dev warn if missing.
9. Crumbs exposed with list semantics (ol/li or list/listitem roles); separators are `aria-hidden`/decorative and NOT announced.
10. Last crumb carries `aria-current="page"` (correct use of aria-current — assert present here, contrasting the tab spec which asserts absence).
11. Separator glyph configurable via `separator`; directional glyph (`›`) flips under `dir="rtl"` via `--fluid-dir` (assert computed `scaleX(-1)` in RTL).
12. `collapse-after="N"` with more than N crumbs collapses middle crumbs behind an ellipsis affordance; `0` never collapses.

**`fluid-back-button`**
13. No `href` → activation calls `history.back()`; `href` present → navigates to `href`.
14. `aria-label` hard dev error when absent AND no visible label text (exact string); no error when visible label or `aria-label` present.
15. Default chevron flips under `dir="rtl"` via `--fluid-dir` (assert computed `scaleX(-1)`).
16. FluidRipple present at Frosted+ (gated), absent at Matte and when `deviceMemoryLow`; `overflow: hidden` on `:host`.
17. Enter/Space/pointer all fire `fluid:activate`; press degrades to opacity under reduced-motion.

**All three**
18. axe-core zero violations for each in default and (where applicable) collapsed/RTL states.

### Standard done criteria (each component)
- Storybook stories at `apps/storybook/stories/{sidebar,breadcrumb,back-button}.stories.ts` — variants, states, tier param, mode param, plus an RTL story for each (the `--fluid-dir` flip is a visual-regression target).
- Playground pages at `apps/playground/pages/{sidebar,breadcrumb,back-button}.html` with Variants, States, Edge cases — each MUST include an RTL example (`dir="rtl"` wrapper) since RTL mirroring is the headline requirement.
- Nav entries added under the **Navigation** group in `apps/playground/index.html`.
- Gates: `pnpm test:component`, `pnpm test:a11y` (zero axe), `pnpm test:visual` (Chromatic — RTL snapshots included).

---

## Dependencies
- **P1-01** FluidElement (lifecycle, ElementInternals for landmark/button roles). ✅
- **P1-02** fluid-theme. ✅
- **P2-09** fluid-link (breadcrumb crumbs, sidebar nav items) — **must ship before breadcrumb**; sidebar can use it but also accepts arbitrary slotted content.
- **P0-T5-01** motion primitives (`depress`/`release` for back-button). ✅
- **P1-04** FluidRipple (back-button, gated). ✅
- **P0-T4-02** press gesture (back-button). ✅
- **P0-T3-05** FluidI18n (back "Back", breadcrumb "Breadcrumb", sidebar toggle labels). ✅
- **P0-T6-01/02** tokens incl. **`--fluid-dir`** (the central RTL dependency for all three). ✅
- **P2-02** fluid-icon-button (sidebar collapse toggle, optionally back-button base). ✅
- **P0-T2-03** ledger tier + `fluidledger:tier-change`. ✅

Note: **P2-09 `fluid-link` is a real ordering dependency** — breadcrumb's crumbs are `fluid-link`s and its `aria-current="page"` story relies on link semantics. Sequence P2-09 before this session, or at minimum before `fluid-breadcrumb` within it.

---

## Spec-conflict protocol
Per AGENTS.md: conflicts between this spec and the foundation doc or merged code must be surfaced (what / which source / recommendation) before writing dependent code. Two implementer-verification flags embedded above: (1) confirm `--fluid-dir` resolves to `-1` under `[dir="rtl"]` in merged tokens rather than re-deriving it; (2) confirm whether an inline-axis expand/collapse variant exists in merged `motion.ts` before falling back to a CSS width transition for the sidebar.
