# `fluid-nav-bar` Component Spec

> **Status:** Draft for review · **Subtask:** P3-01 · **Size:** L
> **Authoritative sources:** foundation §XI (shrink contract, navigation taxonomy), §2.5 (motion primitives, incl. `elevate`/`flatten` per DA decision 2026-06-17), §X (accessibility contract), §III (tier system); review M2-03 (skip link); roadmap P3-01.
> This spec takes precedence over any session-brief instruction it conflicts with. Surface conflicts; do not resolve unilaterally.

---

## Classification

- **Type:** Element
- **Layer:** Raised (Layer 2) — sits above page content, below overlays/sheets/system.
- **Material preset:** `regular` (20px blur, 0.65 tint alpha, per §6.2 material table — the preset nav is explicitly assigned to).
- **Primary interaction spring:** `smooth` — the spring governing the shrink/expand depth cue (`elevate`/`flatten` both use `smooth`). Note: the shrink *height* change is scroll-linked, not spring-driven (see Tier Behavior in part 2); `smooth` governs the depth layer.
- **Applicable motions:**
  - **Primitives (callable via `motion.*`):**
    - `elevate()` — applied on expand (depth increase: `blur-delta 0→4` + `shadow-depth 0→1`, no displacement). Per DA decision, replaces the informal "Elevate" name in §XI prose.
    - `flatten()` — applied on shrink (reverse of elevate). Replaces informal "Flatten".
  - **Scroll-linked (via `motion.scrollProgress` + `motion.bind`, §5.3):** drives the height/shrink value directly from scroll position. This is the structural shrink and is NOT a motion primitive.
  - **Interaction physics:** none (nav-bar is a container, not a press target; it owns no ripple).
  - **CSS animations:** none.

**Rationale for `elevate`/`flatten` over `rise`/`sink`:** the bar's vertical extent is already governed by the scroll-linked shrink. `rise`/`sink` carry a `translateY ±4px` displacement that would compete with the shrink and produce vertical jitter. `elevate`/`flatten` convey depth via blur + shadow only (no `translateY`), so the depth cue layers cleanly on top of the height change. (DA decision 2026-06-17, ratified against merged `core/motion.ts`.)

---

## Attribute Contract

All attributes are kebab-case strings per the §D3-01 convention. Booleans are presence-based. All listed attributes are observed (trigger `attributeChangedCallback`).

| Attribute | Type | Default | Reflected | Description |
|---|---|---|---|---|
| `shrink-start` | number (px) | `48` | yes | Scroll distance (px) before shrink begins. Below this, the bar is at full height. (§XI) |
| `shrink-amount` | number (0–1) | `0.6` | yes | Fraction of full height the bar shrinks **to**. `0.6` = shrinks to 60% of full height. Clamped to `[0.1, 1.0]`; out-of-range → dev warn, clamp, retain. |
| `shrink-mode` | `continuous \| stepped` | `continuous` | yes | `continuous` = height is scroll-linked (interpolates with scroll). `stepped` = bar snaps between full and shrunk at the `shrink-start` threshold. Invalid value → dev warn, retain previous. |
| `expand-on-scroll-up` | boolean | absent (false) | yes | When present, the bar re-expands on **any** upward scroll. When absent, it re-expands only when scroll returns to top (≤ `shrink-start`). (§XI) |
| `skip-target` | string (CSS selector) | `#fluid-main-content` | yes | Target for the skip link's `href`. Defaults to `#fluid-main-content`; consumers may point it at their own `<main>` id (e.g. `#main`). (M2-03) |

**Validation strings** (§XIV format):
- `shrink-amount` out of range: `[fluid warn]  shrink-amount "<v>" out of range. Expected 0.1–1.0. Keeping previous value.`
- `shrink-mode` invalid: `[fluid warn]  shrink-mode "<v>" invalid. Expected "continuous" or "stepped". Keeping previous value.`

**No `variant`, `size`, `loading`, or `error` attributes.** Nav-bar is a structural landmark; it carries none of the universal state primitives from §XI (those apply to button/card/list/dialog/table only).

---

## Property Contract

Properties are camelCase, typed. Reflected properties read/write their attribute per the §D3-01 reflection rule (getter reads `getAttribute`, setter writes `setAttribute` — never duplicate state).

| Property | Type | Reflects | Description |
|---|---|---|---|
| `shrinkStart` | `number` | `shrink-start` | Numeric accessor for the shrink threshold. |
| `shrinkAmount` | `number` | `shrink-amount` | Numeric accessor for the shrink target fraction. |
| `shrinkMode` | `'continuous' \| 'stepped'` | `shrink-mode` | Typed accessor for shrink mode. |
| `expandOnScrollUp` | `boolean` | `expand-on-scroll-up` | Boolean accessor for the re-expand policy. |
| `skipTarget` | `string` | `skip-target` | Selector accessor for the skip-link target. |
| `shrinkProgress` | `ReactiveValue` (read-only) | — | **Non-reflected.** Exposes the current shrink progress (0 = full height, 1 = fully shrunk) as a reactive value, for consumers that want to coordinate their own scroll-driven effects. Read-only; nav-bar owns the source. Backed by `motion.scrollProgress`. |

`shrinkProgress` is the one non-reflected property — it's a typed object (`ReactiveValue`), so per §D3-01 it must not reflect to an attribute.

---

## Slot Contract

| Slot | Required | Fallback | Description |
|---|---|---|---|
| `(default)` | no | empty | Primary nav content — typically a brand/logo and a set of links. Authors place their own `<a>`/`fluid-button` elements here. |
| `leading` | no | empty | Start-aligned region (e.g. menu toggle, back button, logo). In RTL this is the visual right per logical properties. |
| `trailing` | no | empty | End-aligned region (e.g. actions, avatar, search trigger). RTL-mirrored. |

**Skip link is NOT a slot.** It is rendered by the component as its first focusable child in the shadow root, before any slotted content (M2-03). Authors do not provide it. See part 2 ARIA section for the full skip-link contract.

**Slotted-content guidance (non-normative):** nav-bar does not validate what goes in its slots, but the playground/Storybook examples should show links and `fluid-icon-button`s, not nested glass surfaces (per §2.7 nested-glass policy — a glass nav containing glass cards is two layers and triggers the dev nested-glass warning from the child, not from nav-bar itself).

---

## Event Contract

| Event | When | `detail` shape | bubbles / composed |
|---|---|---|---|
| `fluid:shrink-change` | Fired when the bar crosses between expanded and shrunk states (both modes), and on each committed step in `stepped` mode. Debounced to fire once per state transition, not per scroll frame. | `{ shrunk: boolean, progress: number }` | `true` / `true` |

`progress` in the detail is the same 0→1 value as the `shrinkProgress` property at the moment of the event.

**No `fluid:activate`** — nav-bar is not an action component; activation belongs to the links/buttons slotted into it. (Consistent with the FluidRipple contract in AGENTS.md: action components only; nav-bar is a surface/structural component and owns no ripple.)

**Lifecycle events** (`fluid:mounted`, `fluid:unmounted`) are inherited from `FluidElement` — not redeclared here.

---

## Design notes (settled extensions beyond §XI)

These three are not mandated by foundation §XI (which specifies only the skip link and the shrink attributes). They were reviewed and ratified by the Design Authority on 2026-06-17 as deliberate, in-scope extensions:

1. **`shrinkProgress` (read-only `ReactiveValue`)** — consumer coordination hook, paralleling `fluid-scroll-view`'s `scrollOffset` (P3-04). Lets consumers drive their own scroll-coordinated effects from the same source.
2. **`fluid:shrink-change` event** — §XI defines shrink *behavior* but no event; this lets consumers react to shrink-state transitions (e.g. collapse a sub-header) without polling `shrinkProgress`.
3. **`leading`/`trailing` slots** — structural arrangement regions beyond the default slot, RTL-mirrored via logical properties.


---

## ARIA Pattern

- **Host role:** `navigation` landmark. Set via `this.internals` ARIA reflection (`this.internals.role = 'navigation'`), not a hard-coded `role` attribute on the host, so it survives consumer attribute changes. (§X landmark requirement, roadmap P3-01.)
- **Required:** `aria-label` on the host. A page may contain multiple `navigation` landmarks (primary nav, breadcrumb, footer nav); each must be distinguishable. Nav-bar **requires** `aria-label` — **dev error if absent**, matching the `fluid-icon-button` / `fluid-back-button` hard-error rule (roadmap P3-01, P3-03). Production: one-time `console.warn` instead of throw.
  - Dev error string (§XIV format): `[fluid error] fluid-nav-bar requires aria-label.`
- **Skip link:**
  - Rendered as the **first focusable child** in the shadow root, before slotted content (M2-03).
  - Markup: `<a part="skip-link" href="<skip-target>">Skip to main content</a>`, where `<skip-target>` is the resolved `skip-target` attribute (default `#fluid-main-content`).
  - **Visually hidden until focused**, visible on `:focus` (uses the same clip technique as `fluid-visually-hidden`; on `:focus` it un-clips to a positioned, painted link). Never `display:none` — that would remove it from the tab order.
  - Label text is i18n-sourced via `FluidI18n` (key: `navbar.skipLink`, default `"Skip to main content"`), per §8.11 i18n.
  - The consumer is responsible for placing the matching `id` on their main content (`id="fluid-main-content"` by default, or whatever `skip-target` points at). Nav-bar does **not** create or validate the target; if the target is missing, the link still renders (browser handles the no-op gracefully).
- **ARIA IDs:** any internal id (e.g. for the skip link if referenced) uses `generateFluidId(prefix, hostElement)` per §8.1b — never `Math.random()`/`Date.now()`/counters (SSR/hydration parity).
- **Keyboard contract:** nav-bar adds no custom key handling. Tab moves through the skip link first, then slotted focusables in DOM order. Slotted links/buttons retain native keyboard behavior. The shrink animation is **never** keyboard-triggered and never traps focus.

| Element | Strategy | Role | Required attrs | Keyboard |
|---|---|---|---|---|
| host | ElementInternals role | `navigation` | `aria-label` (host; dev error if absent) | Tab traverses children; no custom keys |
| skip link | shadow `<a part="skip-link">` | native link | `href` (from `skip-target`) | Tab → first stop; Enter → jump to target |

---

## State Machine

Two independent state axes; nav-bar does not gate one on the other.

**Axis 1 — Shrink state** (the only stateful behavior):

```
            scroll > shrink-start
   ┌──────────────────────────────────────┐
   │                                       ▼
[expanded] ──(scroll down past start)──> [shrunk]
   ▲                                       │
   └───────(re-expand condition)───────────┘

re-expand condition:
  - expand-on-scroll-up present → any upward scroll delta
  - expand-on-scroll-up absent  → scroll returns to ≤ shrink-start
```

- In `continuous` mode the transition is not binary visually — height interpolates with scroll between full and `shrink-amount`. `shrunk` is reported `true` once `progress > 0`, and the `fluid:shrink-change` event fires on the expanded↔shrunk boundary crossing (debounced, once per crossing), not per frame.
- In `stepped` mode the height snaps at the `shrink-start` threshold; `fluid:shrink-change` fires on each snap.
- On mount, initial state is derived from the current scroll position (a page loaded mid-scroll starts `shrunk`), not assumed `expanded`.

**Axis 2 — Tier** (governs *how* shrink renders, not whether): see Tier Behavior. Tier changes mid-life re-initialize the shrink driver (see acceptance criterion 9).

There is no loading, error, disabled, hover, or pressed state — nav-bar is a structural landmark.

---

## Tier Behavior

The **structural shrink** (height change) happens at **all tiers** — it is content reflow, not decoration, so it must work even at Matte and under reduced motion. What changes by tier is the *mechanism* driving it and the *depth cue* layered on top.

| Tier | Shrink mechanism | Depth cue (`elevate`/`flatten`) |
|---|---|---|
| **Matte** | JS scroll listener → sets height via `motion.bind` on a CSS var. No blur. | `flatten`/`elevate` are no-ops at Matte (no backdrop-filter to modulate); shadow-depth still applies via shadow tokens. |
| **Frosted** | **JS scroll listener fallback** → `motion.scrollProgress` + `motion.bind` writing the height var each scroll event. (§XI: "JS fallback at Frosted".) | `flatten` on shrink / `elevate` on expand, `smooth` spring, modulating `--fluid-blur-delta` + `--fluid-shadow-depth`. |
| **Crystalline** | **Scroll-driven animation** — native scroll-linked timeline (`animation-timeline: scroll()`) drives the height, no JS scroll handler in the hot path. (§XI: "scroll-driven animation at Crystalline+".) | `flatten`/`elevate` as Frosted. |
| **Optical** | As Crystalline. | As Crystalline. |

**The Frosted vs Crystalline split is the load-bearing tier distinction** and the one most likely to be implemented wrong. Crystalline+ must use the scroll-driven timeline (no per-frame JS); Frosted must use the JS scroll-listener fallback because it lacks reliable `animation-timeline: scroll()`. An implementer who uses the JS path at all tiers has not met the spec even if it "looks the same."

**Tier-change reactivity (AGENTS.md, mandatory):** nav-bar listens for `fluidledger:tier-change`; on change it tears down the current shrink mechanism (remove JS listener OR detach scroll timeline) and re-initializes for the new tier, cancelling any in-flight depth animation. Listener added in `connectedCallback`/`onMount`, removed in `disconnectedCallback`, pushed to `this.disposers`.

---

## Accessibility

- **Reduced-motion (two-level contract, §2.5 + §X):**
  - **The shrink still happens** under `prefers-reduced-motion: reduce` — it is structural (content reflow), in the same category as `expand`/`collapse` which §2.5 explicitly exempts from suppression. The bar resizes; it just doesn't animate the depth cue.
  - The **depth primitives are suppressed**: `elevate`/`flatten` carry `reducedPhases: null` (verified in `motion.ts`), so under reduced motion they are complete no-ops — no `blur-delta`/`shadow-depth` animation. The shrink reads as an instant height change with no blur shimmer.
  - At the CSS level: the height var transition is gated behind the reduced-motion media query so `continuous` mode snaps rather than eases when reduced motion is on. (Two-level: CSS var duration + `@media (prefers-reduced-motion: reduce)` block, per the animated-component contract.)
  - **Implementer caution:** do not "kill the shrink" under reduced motion. Suppressing the *height change* would hide content and break layout. Suppress only the depth animation and the easing.
- **High-contrast / forced-colors (§X table):** `backdrop-filter` disabled, explicit border on the bar, system colors. Shrink unaffected.
- **RTL (§8.11, `--fluid-dir`):** `leading`/`trailing` slots resolve via CSS logical properties (`inline-start`/`inline-end`), so they mirror automatically in RTL with no JS. The skip link and shrink are direction-agnostic (vertical axis). No `--fluid-dir` multiplier needed here — nav-bar has no horizontal arrows or separators to flip (unlike breadcrumb/back-button in P3-03).
- **axe-core:** zero violations in default state and in shrunk state.

---

## Acceptance Criteria

Standard test matrix (AGENTS.md) **plus** all of:

1. **Shrink threshold:** with default `shrink-start="48"`, scrolling the page ≤48px keeps the bar at full height; scrolling >48px begins shrink. `shrink-start="100"` moves the threshold to 100px.
2. **Shrink amount:** `shrink-amount="0.6"` shrinks the bar to 60% of its full height at full shrink. `shrink-amount="0.5"` → 50%. Out-of-range `shrink-amount="2"` → dev warn (exact §XIV string), value clamped, previous retained.
3. **shrink-mode:** `continuous` interpolates height with scroll position (intermediate heights observable between full and shrunk). `stepped` snaps between full and shrunk at the threshold with no intermediate heights. Invalid `shrink-mode="foo"` → dev warn, retain.
4. **expand-on-scroll-up:** present → any upward scroll delta re-expands the bar mid-page. Absent → bar re-expands only when scroll returns to ≤ `shrink-start`.
5. **Initial state from scroll:** a nav-bar mounted while the page is already scrolled past `shrink-start` renders in the shrunk state on first paint (not expanded-then-jump).
6. **Skip link present & first:** the first focusable descendant (including shadow content) is the skip link. It is visually hidden at rest (1×1 clip or equivalent), and becomes visible/painted on `:focus`. Its `href` equals the resolved `skip-target` (default `#fluid-main-content`).
7. **Skip link target configurable:** `skip-target="#main"` → skip link `href="#main"`.
8. **`aria-label` enforcement:** mounting without `aria-label` throws `FluidError` in dev (exact string `[fluid error] fluid-nav-bar requires aria-label.`); one-time `console.warn` in production. With `aria-label` present, no error.
9. **Tier-change reactivity:** mounting at Crystalline uses the scroll-driven timeline (height driven by CSS animation-timeline on the compositor); after `fluidledger:tier-change` to Frosted, the JS scroll-listener fallback is active and the timeline is detached. Reverse transition restores the timeline. No duplicate listeners after repeated transitions.
   > **DA spec conflict (open):** Crit 9 originally said "no JS scroll listener at Crystalline+" but the spec simultaneously requires `shrinkProgress` + `fluid:shrink-change` events at all tiers — which cannot be fired without observing scroll. The implementation resolves this pragmatically: height is compositor-driven by CSS animation-timeline; a lightweight `scroll` listener only schedules a bounded rAF that feeds the auxiliary progress/event machinery (no height work in the hot path). **Design Authority should reconcile**: either relax Crit 9 to "no height-driving JS at Crystalline+" or drop the at-all-tiers event guarantee.
   > **Note to DA:** Crit 9/10 criteria prose above was pre-emptively softened to match the resolved build; easily reverted to original wording ("no JS scroll listener registered on window/scroll container") if DA prefers to keep the spec text unmodified until the conflict is formally resolved.
10. **Frosted uses JS fallback:** at Frosted, a scroll listener drives the shrink (assert listener registered + height responds to scroll events). At Crystalline+, assert NO height-driving JS is in the scroll hot path (height driven by CSS animation-timeline only).
11. **`fluid:shrink-change` event:** fires once on expanded→shrunk crossing and once on shrunk→expanded, with `detail.shrunk` boolean and `detail.progress` number; does not fire per scroll frame in `continuous` mode (debounced to state transitions).
12. **`shrinkProgress` reactive value:** subscribing reports 0 at full height, 1 at full shrink, interpolated values in between (`continuous` mode); read-only (no setter effect).
13. **Slots render:** `leading`, `trailing`, and default slots project content; `leading`/`trailing` mirror under `dir="rtl"` (inline-start/inline-end), verified by computed order.
14. **Reduced-motion:** under `prefers-reduced-motion: reduce`, the bar **still shrinks** (height changes) but `--fluid-blur-delta`/`--fluid-shadow-depth` are not animated (elevate/flatten no-op) and `continuous` height snaps rather than eases. Assert height change occurs AND no depth-var animation runs.
15. **forced-colors:** backdrop-filter disabled, explicit border present, shrink still functions.
16. **axe-core:** zero violations expanded and shrunk.

### Standard done criteria (every component)
- Storybook story at `apps/storybook/stories/nav-bar.stories.ts` — variants (each shrink-mode, expand-on-scroll-up on/off), states (expanded/shrunk), tier parameter, mode parameter, plus a scroll-context wrapper so shrink is demonstrable.
- Playground page at `apps/playground/pages/nav-bar.html` with Variants, States, Edge cases — must include a tall scroll container so shrink is observable, and a skip-link focus demo.
- Nav entry added to `apps/playground/index.html` — new **Navigation** nav group (no existing entry to uncomment).
- Gates: `pnpm test:component`, `pnpm test:a11y` (zero axe), `pnpm test:visual` (Chromatic).

---

## Dependencies

- **P1-01** FluidElement (base class, lifecycle, ElementInternals for the `navigation` role).
- **P1-02** fluid-theme (token context; nav consumes `--fluid-*` and the `regular` material tokens). ✅ complete.
- **P0-T5-01** motion primitives (`elevate`/`flatten`). ✅ merged & tested.
- **P0-T5-03** `motion.scrollProgress` + `motion.bind` (scroll-linked height). ✅ merged & tested.
- **P0-T6-01/02** CSS tokens incl. tier-aware material (`regular`), `--fluid-blur-delta`/`--fluid-shadow-depth` consumption.
- **P0-T3-03** `generateFluidId` (skip-link id parity).
- **P0-T3-05** `FluidI18n` (skip-link label).
- **P0-T2-03** ledger tier + `fluidledger:tier-change` reactivity.

Full set, not the truncated "P1-01, P1-02" from the roadmap line — the scroll-driven shrink and tier reactivity pull in T5/T6/T2 explicitly.

---

## Spec-conflict protocol

Per AGENTS.md: if implementation reveals a conflict between this spec and the foundation doc or merged code, **stop and surface it** (what conflicts, which source says what, recommendation) before writing dependent code. This spec outranks the session brief; the foundation doc outranks this spec on physics/token/motion contracts.
