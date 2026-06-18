# `fluid-link` Component Spec

> **Status:** Draft for review · **Subtask:** P2-09 · **Size:** S
> **Authoritative sources:** foundation §XI (Actions taxonomy, Layer 2), §8.7 (event system, `fluid:activate`), §X (ARIA contract, focus ring §8.6), §8.11 (RTL/i18n), §XIX (spec template); AGENTS.md (Tab Patterns — `aria-current="page"` belongs on a link in a nav, FluidRipple contract); roadmap P2-09.
> This spec takes precedence over any session-brief instruction it conflicts with. Surface conflicts; do not resolve unilaterally.

The foundational link primitive: a styled, token-aware anchor the rest of the system composes with (breadcrumb crumbs, sidebar nav items, link-based navigation tabs). It is intentionally minimal — **no glass surface, no spring interaction** — so it stays cheap and composable.

---

## Classification
- **Type:** Element.
- **Layer:** Raised (Layer 2, Actions) — per §XI, `fluid-link` is in the Actions taxonomy alongside button/icon-button.
- **Material preset:** `none` — a link is text, not a glass surface. No backdrop-filter. (This keeps a link inside a glass nav/breadcrumb from adding a nested-glass layer, §2.7.)
- **Primary interaction spring:** none — links do not press-deform. Hover/focus styling is CSS only.
- **Applicable motions:**
  - None. No `depress`/`release`, no FluidRipple.
  - **FluidRipple explicitly NOT used.** Although a link is technically an action component, it is a text affordance, not a pressable surface; ripple on inline text is visually wrong and the foundation reserves ripple for surface-bearing action components (button/icon-button/fab). This is a deliberate exclusion, not an omission.

**Rationale for minimalism:** `fluid-link` is composed by other components (breadcrumb, sidebar, nav). Giving it spring physics or a glass surface would (a) double-render glass when placed inside a glass container and (b) make every link in a breadcrumb trail an animation target. It stays a styled anchor.

---

## Attribute Contract

| Attribute | Type | Default | Reflected | Description |
|---|---|---|---|---|
| `href` | string | — | yes | Navigation target. Maps directly to the inner `<a href>`. Absent `href` → renders as a non-navigating link (still focusable/activatable for JS-driven navigation, see Event Contract). |
| `target` | string | — | yes | Link target (`_blank`, `_self`, etc.). Maps to inner `<a target>`. When `target="_blank"`, `rel="noopener noreferrer"` is applied automatically (security default). |
| `current` | boolean | absent | yes | Marks this link as the current page within a navigation context. When present → `aria-current="page"` on the inner `<a>`. **This is the correct, canonical use of `aria-current="page"`** (a link indicating the current page within a `<nav>`), exactly the case AGENTS.md "Tab Patterns" contrasts against the tab `aria-selected` rule. |
| `disabled` | boolean | absent | yes | Disabled link — not focusable, not activatable. `aria-disabled="true"`; `href` removed from the inner `<a>` while disabled (a disabled link must not be navigable). |

No `variant`/`size`/`loading`/`error` — a link is a single styled affordance. Visual emphasis is a consumer CSS concern via tokens/parts, not a variant axis.

---

## Property Contract

| Property | Type | Reflects | Description |
|---|---|---|---|
| `href` | `string` | `href` | Navigation target accessor. |
| `target` | `string` | `target` | Link target accessor. |
| `current` | `boolean` | `current` | Current-page state. |
| `disabled` | `boolean` | `disabled` | Disabled state. |

All four are string/boolean and reflect their attributes per the §8.1a/§D3-01 reflection rule. No non-reflected typed properties — `fluid-link` has no object/array state.

---

## Slot Contract

| Slot | Required | Fallback | Description |
|---|---|---|---|
| `(default)` | yes | dev warn if empty | The link text/content. A link with no content has no accessible name. Empty → `[fluid warn] fluid-link requires content in the default slot.` |
| `icon` | no | hidden | Optional leading icon (e.g. external-link glyph, breadcrumb home icon). |

---

## Event Contract

| Event | When | `detail` | bubbles / composed |
|---|---|---|---|
| `fluid:activate` | Activated via pointer click, Enter, or programmatic `.click()`. | `{ href: string \| null }` | `true` / `true` |

- `fluid:activate` fires on activation **in addition to** native navigation. For a link with `href`, the browser navigates natively; the event lets consumers (e.g. a SPA router, a breadcrumb analytics hook) intercept. Consumers that want to override navigation call `preventDefault()` on the native click (standard anchor behavior) and handle routing themselves.
- For a link **without** `href`, `fluid:activate` is the only signal — the consumer drives navigation from it (the link-based-navigation-tabs composition pattern from AGENTS.md uses this).
- Per §8.7: event name is `fluid:activate` (never `fluid:click`); `detail` carries only the `href` identifier, never sensitive data.
- Disabled links do not fire `fluid:activate`.

---

## ARIA Pattern
- **Element strategy:** shadow `<a>` (native anchor). Using a real `<a>` gives native link semantics, keyboard behavior, and context-menu/"open in new tab" support for free.
- **Role:** native `link` (implicit from `<a href>`). When `href` is absent, the inner element still exposes `role="link"` and `tabindex="0"` so it is operable for JS-driven navigation.
- **Accessible name:** from default-slot content (the link text). An `icon`-only link must carry `aria-label` on the host (dev warning if a link has only an icon and no text and no `aria-label` — an unnamed link is an axe failure): `[fluid warn] fluid-link has no text content; provide aria-label for an icon-only link.`
- **`aria-current`:** `"page"` when `current` is present — and **only** in this navigation-link sense. (AGENTS.md: `aria-current="page"` → active link in a `<nav>`; never on a `role="tab"`.)
- **`aria-disabled`:** `"true"` when `disabled`; `href` is also removed so the link is genuinely non-navigable (not just visually dimmed).
- **Focus ring:** inherits the shared `@layer fluid-focus` `:host(:focus-visible)` mixin (§8.6) — `2px solid var(--fluid-focus-ring-color, var(--fluid-color-brand))`, `outline-offset: 2px`. No custom focus style suppresses it.
- **Keyboard:** native anchor behavior — Enter activates; Tab focuses. No custom keys. (Links do not activate on Space — that is button behavior; native `<a>` correctly ignores Space.)

| Element | Strategy | Role | Required attrs | Keyboard | State → ARIA |
|---|---|---|---|---|---|
| host → inner `<a>` | shadow `<a>` | native `link` | accessible name (slot text or `aria-label`) | Enter = activate; Tab = focus | `current` → `aria-current="page"`; `disabled` → `aria-disabled="true"` + `href` removed |

---

## State Machine
Effectively stateless — a link is `default` with derived presentational states (`:hover`, `:focus-visible`, `:visited`) handled entirely in CSS, plus two attribute-driven states:
- `current` (present/absent) → `aria-current="page"` toggle.
- `disabled` (present/absent) → non-focusable, non-navigable, `aria-disabled`.

No async, loading, or error state.

---

## Tier Behavior
**None — `fluid-link` renders identically at all tiers.** It has no glass material, no spring, no scroll/physics behavior, so there is nothing to gate on tier. It does **not** register a `fluidledger:tier-change` listener (nothing to react to). This is a legitimate "no tier behavior" component, and the spec states so explicitly so a reviewer doesn't flag the absence as a gap.

---

## Accessibility
- **Reduced-motion:** no motion to suppress (no springs, no transitions beyond optional CSS color transitions which are decorative and respect the global reduced-motion media query if the consumer adds them). Nothing to do.
- **forced-colors / high-contrast (§X):** link uses system link colors under `forced-colors`; `current`/`disabled` states distinguished by `aria-current`/`aria-disabled` (not color alone), satisfying WCAG 1.4.1.
- **RTL (§8.11):** text and any `icon` slot position use logical properties so they mirror under `dir="rtl"`. A directional icon (e.g. an external-arrow) that needs to flip is the consumer's responsibility via `--fluid-dir`, same mechanism as breadcrumb/back-button; `fluid-link` itself ships no directional glyph.
- **axe-core:** zero violations — link named (slot text or `aria-label`), `aria-current`/`aria-disabled` valid.

---

## Acceptance Criteria

Standard test matrix (AGENTS.md) **plus** all of:

1. `href="/about"` → inner `<a>` has `href="/about"`; clicking navigates natively and fires `fluid:activate` with `{ href: "/about" }`.
2. No `href` → inner element is still focusable (`tabindex="0"`, `role="link"`); activation fires `fluid:activate` with `{ href: null }` and does not navigate.
3. `target="_blank"` → inner `<a>` has `target="_blank"` AND `rel="noopener noreferrer"` (security default applied automatically).
4. `current` present → `aria-current="page"` on the inner `<a>`; absent → no `aria-current`. (Correct-use-of-aria-current test — mirrors the tab spec's assert-absent.)
5. `disabled` present → not focusable, `aria-disabled="true"`, inner `href` removed (non-navigable); activation does NOT fire `fluid:activate`.
6. Default-slot text provides the accessible name; icon-only with no text and no `aria-label` → dev warn (exact string).
7. Empty default slot → dev warn (exact string).
8. Focus ring: `:focus-visible` shows the shared `@layer fluid-focus` outline; not suppressed.
9. Token application: link color derives from Fluid tokens (`--fluid-color-brand` or a link-specific token) and responds to `fluid-theme` / dark mode without per-link overrides.
10. RTL: text and icon slot mirror via logical properties under `dir="rtl"`.
11. No tier behavior: renders identically at Matte/Frosted/Crystalline/Optical (assert no tier-gated branches; no `fluidledger:tier-change` listener registered).
12. axe-core: zero violations (named link, valid `aria-current`/`aria-disabled`).

### Standard done criteria
- Storybook story at `apps/storybook/stories/link.stories.ts` — default, with-icon, `current`, `disabled`, `target="_blank"`, in-a-nav-context, mode parameter. (Tier parameter is trivially identical — one note suffices rather than four tier stories.)
- Playground page `apps/playground/pages/link.html` with Variants, States, Edge cases (icon-only with aria-label, disabled, current, external `_blank`, RTL example).
- Nav entry added under the **Actions** group in `apps/playground/index.html` (alongside Button / Icon Button).
- Gates: `pnpm test:component`, `pnpm test:a11y` (zero axe), `pnpm test:visual` (Chromatic).

---

## Dependencies
- **P1-01** FluidElement (base class, lifecycle). ✅
- **P1-02** fluid-theme (token consumption for link color, dark mode). ✅
- **P0-T3-05** FluidI18n (only if shipping any default label text; minimal/none for a bare link). ✅
- **P0-T6-01/02** CSS tokens incl. `--fluid-color-brand`, focus-ring token, `--fluid-dir` for RTL icon mirroring. ✅
- **P0-T4-02** press/activation gesture — **only** for the `fluid:activate` dispatch path; no press *physics*. (A link could also derive activation purely from the native `<a>` click + Enter; the implementer may skip the gesture dependency if native anchor events suffice. Flag: prefer native anchor events over the gesture system here unless there's a reason not to.)

Minimal dependency set — `fluid-link` is a Size-S primitive and deliberately depends on little.

---

## Spec-conflict protocol
Per AGENTS.md: conflicts between this spec and the foundation doc or merged code must be surfaced (what / which source / recommendation) before writing dependent code. One implementer-verification flag: confirm whether activation should route through the §5.1 gesture system or rely on native `<a>` click/Enter events — this spec recommends native anchor events (simpler, more accessible, free "open in new tab") and treats the P0-T4-02 dependency as optional.

---

## Note: this unblocks P3-03
`fluid-breadcrumb` (P3-03) composes `fluid-link` as its crumbs, and the breadcrumb's `aria-current="page"` current-page contract relies on this component's `current` attribute. **P2-09 must merge before P3-03's breadcrumb portion.** (Recorded in the roadmap ordering.)
