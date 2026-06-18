# `fluid-scroll-view` Component Spec

> **Status:** Draft for review · **Subtask:** P3-04 · **Size:** L
> **Authoritative sources:** foundation §3.7 (scroll-view), §2.6 (InertialScroll/ElasticDeform physics + constants), §5.1 (multi-touch policy), §X (ARIA/reduced-motion), §III (tiers), §XI (virtual-list integration); reviews A3-03 (multi-touch), M-01 (snap coordination); roadmap P3-04.
> This spec takes precedence over any session-brief instruction it conflicts with. Surface conflicts; do not resolve unilaterally.

A scroll container with tier-dependent scroll mechanics: native CSS scrolling at Frosted, custom physics-driven scrolling (inertia + elastic edges) at Crystalline+, with a `native` escape hatch that forces native scroll at all tiers. **Keyboard navigation is mandatory at every tier.**

---

## Classification
- **Type:** Element.
- **Layer:** Surface (Layer 1) — a content container; consumers compose glass inside.
- **Material preset:** `none` — the scroll-view is a mechanism, not a glass surface. (The custom scrollbar thumb may be tinted via tokens, but the container has no backdrop-filter.)
- **Primary interaction spring:** `bouncy` — the spring governing snap-point landing and elastic edge spring-back (§3.7, §2.6).
- **Applicable motions:**
  - **InertialScroll** (§2.6, **Crystalline+ only**) — momentum decay after scroll release, `--fluid-scroll-friction: 0.95` per frame.
  - **ElasticDeform** (§2.6) — exponential resistance past content bounds, `--fluid-elasticity-max: 64px` ceiling, `bouncy` spring-back.
  - **Snap landing** — nearest snap point wins on release via `bouncy` spring (§3.7, M-01).
  - No FluidRipple (it is not an action component; it scrolls).

---

## Attribute Contract

| Attribute | Type | Default | Reflected | Description |
|---|---|---|---|---|
| `native` | boolean | absent | yes | Forces native browser scrolling at **all** tiers — no custom JS scrollbar, no inertia, no elastic. Escape hatch for consumers who want OS-native behavior or who hit a custom-scroll edge case. (§3.7) |
| `orientation` | `vertical \| horizontal \| both` | `vertical` | yes | Scroll axis. Invalid → dev warn, retain. |
| `snap` | string | — | no | Scroll-snap spec, mirroring CSS `scroll-snap-type` syntax: `"x mandatory"`, `"y proximity"`, etc. Enables snap-point coordination (see Snap Points below). Absent = no snapping. |
| `friction` | number (0–1) | `0.95` | yes | Per-frame momentum decay for InertialScroll (Crystalline+). Overrides `--fluid-scroll-friction`. Out of range → dev warn, clamp to (0,1), retain. |
| `elastic` | boolean | present by default at Crystalline+ | yes | Enables elastic (rubber-band) edges. Default on at Crystalline+, off at Frosted/Matte (native scroll has no elastic except where the OS provides it). Set `elastic` / remove to force. |

**No `loading`/`error` state** — scroll-view is structural.

---

## Property Contract

| Property | Type | Reflects | Description |
|---|---|---|---|
| `native` | `boolean` | `native` | Native-scroll accessor. |
| `orientation` | `'vertical' \| 'horizontal' \| 'both'` | `orientation` | Scroll axis. |
| `friction` | `number` | `friction` | Momentum decay. |
| `elastic` | `boolean` | `elastic` | Elastic edges. |
| `scrollOffset` | `ReactiveValue` (read-only) | — | **Non-reflected.** The current scroll offset as a reactive value. This is the **integration contract for `fluid-virtual-list`** (§XI): `scrollView.scrollOffset.subscribe(offset => virtualList.updateWindow(offset))`. Exposed at all tiers (native and custom) so virtualization works regardless of scroll mechanism. Read-only. |
| `addSnapPoint` | `(offsetPx: number) => void` (method) | — | Programmatic snap-point registration (M-01), complementing the declarative `fluid-snap-point` children. |

`scrollOffset` is the single most important downstream contract — `fluid-virtual-list` (Phase 6) depends on it. It must emit consistently whether the scroll is native (Frosted) or custom-JS (Crystalline+); the virtual list must not need to know which tier is active.

---

## Slot Contract

| Slot | Required | Fallback | Description |
|---|---|---|---|
| `(default)` | no | empty | Scrollable content. |
| `snap-point` (via `fluid-snap-point` children) | no | — | Declarative snap targets. Each `fluid-snap-point offset="..."` marks a snap position (§3.7). Alternative to the programmatic `addSnapPoint()`. |

---

## Event Contract

| Event | When | `detail` | bubbles / composed |
|---|---|---|---|
| `fluid:scroll` | Scroll offset changes (throttled to animation frames, not raw scroll events). | `{ offset: number, velocity: number }` | `true` / `true` |
| `fluid:snap` | A snap point is landed on after release. | `{ offset: number, index: number }` | `true` / `true` |

`fluid:scroll` is throttled/coalesced to rAF to avoid flooding; consumers needing every value use the `scrollOffset` reactive value (which is also rAF-coalesced at Crystalline+, native-scroll-event-driven at Frosted).

---

## Per-Tier Scroll Mechanics (the core of this component)

This is the load-bearing section. The three tiers use **fundamentally different scroll implementations**, and an implementer who builds one path for all tiers has not met the spec. The `native` attribute short-circuits all of this to native scrolling regardless of tier.

### Matte
- **Native browser scrolling.** No custom scrollbar, no inertia, no elastic.
- Scrollbar: default OS scrollbar (no styling beyond what the page already applies).
- `scrollOffset` driven by the native `scroll` event.
- Rationale: Matte is the low-power/constrained tier; custom scroll physics would cost more than it returns.

### Frosted
- **Native scrolling with CSS scrollbar styling.** (§3.7, roadmap P3-04: "Frosted: CSS scrollbar styling".)
- Standard properties: `scrollbar-color` + `scrollbar-width` (Firefox/standard).
- WebKit: `::-webkit-scrollbar`, `::-webkit-scrollbar-thumb`, `::-webkit-scrollbar-track` styled to match Fluid tokens.
- Both styling mechanisms applied (standard + WebKit) for cross-browser coverage.
- No JS inertia (relies on native momentum where the OS provides it); `elastic` off by default.
- `scrollOffset` driven by the native `scroll` event (rAF-coalesced).

### Crystalline / Optical
- **Custom JS scrollbar with physics.** (§3.7, roadmap: "Crystalline+: custom JS scrollbar with inertia + elastic".)
- Native scrollbar hidden (`scrollbar-width: none` + `::-webkit-scrollbar { display: none }`); a custom JS-rendered thumb is drawn and dragged.
- **InertialScroll:** on scroll release with residual velocity, momentum continues, decaying by `friction` (default `0.95`) per frame until below a velocity threshold. (§2.6)
- **ElasticDeform:** scrolling past content bounds applies exponential resistance, capped at `--fluid-elasticity-max: 64px` overscroll; release springs back via `bouncy`. (§2.6)
- Custom thumb is itself draggable (pointer capture per §5.1) and keyboard-irrelevant (keyboard drives the content, not the thumb — see part 2).
- `scrollOffset` driven by the custom scroll loop (rAF), emitting the same value shape as the native path.

### `native` attribute (all tiers)
- Forces the Matte behavior (pure native scroll) regardless of detected tier. Custom physics fully bypassed. `scrollOffset` still emits (native scroll event). Use when the consumer wants guaranteed-native behavior (e.g. nested OS scroll contexts, accessibility tooling that expects native scroll, or working around a custom-scroll bug).

**Tier-change reactivity (AGENTS.md, mandatory):** on `fluidledger:tier-change`, tear down the current scroll mechanism (remove custom loop + thumb, or detach native styling) and re-initialize for the new tier. Any in-flight inertia/elastic animation is cancelled. Listener in `onMount`, removed via `this.disposers`. A downgrade Crystalline→Frosted mid-inertia must stop the momentum and hand off to native scroll at the current offset without a jump.


---

## Keyboard Navigation (mandatory at ALL tiers)

Keyboard scrolling is **not** tier-gated — it works identically whether scroll is native (Matte/Frosted/`native`) or custom-JS (Crystalline+). The roadmap lists it as a flat requirement: "Keyboard navigation (arrow, page, home/end)."

The scroll-view host is focusable (`tabindex="0"`) so keyboard users can focus the region and scroll it.

| Key | Behavior |
|---|---|
| `ArrowDown` / `ArrowUp` | Scroll by a small step (line ≈ 40px) along the vertical axis. |
| `ArrowRight` / `ArrowLeft` | Scroll by a small step along the horizontal axis (when `orientation` includes horizontal). |
| `PageDown` / `PageUp` | Scroll by one viewport height (vertical). |
| `Home` | Scroll to start (offset 0). |
| `End` | Scroll to end (max offset). |
| `Space` / `Shift+Space` | Page down / page up (native convention; only when the scroll-view itself holds focus, not when a focusable child consumes Space). |

- At Crystalline+, keyboard scrolling routes through the **same custom scroll loop** as pointer scrolling, so it animates with the `smooth`/`bouncy` feel and respects snap points — it is not a raw `scrollTop` jump.
- At Matte/Frosted/`native`, keyboard scrolling sets native scroll position (with `scroll-behavior: smooth` where motion is allowed).
- Keyboard scrolling **must not be swallowed** when a focusable child is focused and the child does not itself handle the key — the scroll-view receives the bubbled key and scrolls. (Standard browser behavior for native; the custom path must replicate it.)
- Snap: with `snap` active, `PageDown`/arrow steps land on snap points rather than arbitrary offsets where APG/UX expects snapping.

---

## Multi-Touch Policy (§5.1, review A3-03)

As a **scroll container**, the documented policy applies:
- A second touch arriving **within 100ms of the first AND with pointer distance > 20px** → interpreted as **pinch-to-zoom start** (handed off to the browser / not treated as scroll). The scroll-view does not implement zoom itself; it yields.
- Otherwise the second touch is **ignored for scroll-velocity computation** — the scroll continues tracking the primary pointer only, so a stray second finger doesn't corrupt momentum.
- Pointer capture (§5.1) is used for the custom-thumb drag at Crystalline+ (`setPointerCapture` on thumb `pointerdown`, released on `pointerup`/`pointercancel`).
- iOS `pointercancel` on native scroll detection is handled as gesture cancellation (momentum from the custom loop stops cleanly).

---

## Snap Points (§3.7, M-01)

Two registration paths, both supported:
- **Declarative:** `fluid-snap-point` children with an `offset` attribute (`offset="0"`, `offset="100%"`, or px). The scroll-view collects them on mount and on child-list mutation (MutationObserver, disposer-cleaned).
- **Programmatic:** `scrollView.addSnapPoint(offsetPx)`.

Behavior:
- `snap="x mandatory"` / `"y mandatory"` — release always lands on the nearest snap point.
- `"... proximity"` — snaps only when release is near a snap point; otherwise rests freely.
- Landing animation: **nearest snap point wins via `bouncy` spring** (§3.7).
- At Frosted/Matte/`native`, snapping uses CSS `scroll-snap-type`/`scroll-snap-align` (the declarative `fluid-snap-point`s map to `scroll-snap-align` on the content). At Crystalline+, the custom loop computes the nearest snap and springs to it (CSS scroll-snap and the custom loop must not both run — the custom path owns snapping at Crystalline+).
- `fluid:snap` fires with `{ offset, index }` on landing.

---

## `scrollOffset` — Virtual List Integration Contract (§XI)

`scrollOffset` is a read-only `ReactiveValue` that emits the current scroll offset. The integration pattern (from §XI) is:

```javascript
scrollView.scrollOffset.subscribe(offset => virtualList.updateWindow(offset))
```

Requirements:
- Emits at **all tiers** with identical value semantics (px from start along the primary axis). A `fluid-virtual-list` consumer must not branch on tier.
- rAF-coalesced (does not emit more than once per frame) to keep windowing cheap.
- Initial value emitted on subscribe (current offset), per the `ReactiveValue` contract (matches `motion.scrollProgress` subscribe-emits-current behavior).
- `dispose()` available; the scroll-view disposes its source in `disconnectedCallback`.
- When no custom scroll-view wraps a virtual list, the list falls back to the native `scroll` event (§XI) — so `scrollOffset` is the enhancement, native scroll is the floor.

---

## Accessibility
- **Focusable region:** host `tabindex="0"` with an appropriate accessible name when it acts as a scrollable region. If the content is a labeled region, `role="region"` + `aria-label` is appropriate; a bare scroll container may remain generic. Document: consumers scrolling a named region should provide `aria-label`. (Do not force `role="region"` unconditionally — an unnamed region is an axe failure; only apply the role when a name is provided.)
- **Reduced-motion (§2.6, §X):** InertialScroll momentum and elastic spring-back are **suppressed** under `prefers-reduced-motion: reduce` — scrolling becomes direct (no coasting, no rubber-band). Snap still occurs but lands instantly rather than via `bouncy` spring. Keyboard/pointer scrolling still works; only the *physics embellishment* is removed. (Scrolling itself is never suppressed — it is essential function.)
- **forced-colors / high-contrast (§X):** custom scrollbar thumb uses system colors and an explicit border so it remains visible; if the custom thumb cannot meet contrast, fall back to native scrollbar.
- **RTL (§8.11):** horizontal scroll origin and the custom thumb position mirror via logical handling; `Home`/`End` remain logical (start/end, not left/right). Horizontal arrow keys follow the document direction.
- **axe-core:** zero violations; if `role="region"` is applied it must be named.

---

## Acceptance Criteria

Standard test matrix (AGENTS.md) **plus** all of:

**Tier mechanics**
1. Matte: native scrolling, default scrollbar, no custom thumb, no inertia.
2. Frosted: native scrolling with styled scrollbar — `scrollbar-color`/`scrollbar-width` set AND `::-webkit-scrollbar` rules present; no JS inertia.
3. Crystalline+: native scrollbar hidden; custom JS thumb rendered; releasing a scroll with velocity produces momentum that decays by `friction` per frame (assert offset continues changing after pointer release, then settles).
4. Crystalline+ elastic: scrolling past the end applies resistance capped at 64px overscroll and springs back via `bouncy` on release.
5. `native` attribute: forces native scroll at Crystalline+ (no custom thumb, no inertia) — assert the custom loop is not running.
6. `friction="0.9"` overrides default decay (faster settle than `0.95`); out-of-range `friction="2"` → dev warn, clamp, retain.
7. Tier-change Crystalline→Frosted mid-inertia stops momentum and hands to native scroll at the current offset with no visual jump; reverse transition restores the custom loop. No duplicate scroll listeners/loops after repeated transitions.

**Keyboard (all tiers)**
8. Arrow keys scroll by a step on the active axis; Page keys by a viewport; Home/End to start/end — verified at Matte (native) AND Crystalline (custom loop).
9. At Crystalline+, keyboard scrolling animates through the custom loop and respects snap points (lands on snap, not arbitrary offset).
10. Keyboard scroll is not swallowed when a non-handling focusable child is focused (key bubbles to scroll-view).

**Snap**
11. `fluid-snap-point` children register as snap targets; `addSnapPoint(px)` adds one programmatically.
12. `snap="y mandatory"`: release always lands on nearest snap (bouncy at Crystalline+, CSS scroll-snap at Frosted/Matte); `fluid:snap` fires with `{ offset, index }`.

**scrollOffset / integration**
13. `scrollOffset` emits current offset on subscribe and on scroll, rAF-coalesced, at all tiers with identical value semantics (px from start).
14. A `fluid-virtual-list` subscribed to `scrollOffset` receives updates whether scroll is native (Frosted) or custom (Crystalline) — assert the subscriber callback fires in both, no tier branching needed.

**Multi-touch**
15. Second touch within 100ms + >20px distance → treated as pinch (scroll yields, velocity not corrupted); otherwise second touch ignored for scroll velocity.

**Motion / a11y**
16. Reduced-motion: inertia + elastic suppressed (scroll is direct, snap lands instantly); scrolling still fully functional via pointer and keyboard.
17. forced-colors: custom thumb visible (system colors + border) or native fallback.
18. RTL: horizontal scroll + thumb mirror; Home/End logical.
19. axe-core: zero violations (named region if `role="region"` applied).

### Standard done criteria
- Storybook stories at `apps/storybook/stories/scroll-view.stories.ts`: vertical/horizontal/both orientation, snap mandatory/proximity, `native` on/off, tier parameter (the Frosted-vs-Crystalline scrollbar difference is a key visual-regression target), mode parameter, plus a tall-content wrapper.
- Playground page `apps/playground/pages/scroll-view.html` with Variants, States, Edge cases — must include: a tall scroll container, a snap-point carousel, a `native`-attribute comparison, and a Crystalline inertia/elastic demo (observable only at Crystalline+ — note the tier requirement in the page).
- Nav entry added under the **Navigation** group (or a new **Layout/Scroll** group) in `apps/playground/index.html`.
- Gates: `pnpm test:component`, `pnpm test:a11y` (zero axe), `pnpm test:visual` (Chromatic; Frosted vs Crystalline scrollbar snapshots included).

---

## Dependencies
- **P1-01** FluidElement (lifecycle, ElementInternals). ✅
- **P1-02** fluid-theme (scrollbar thumb tint tokens). ✅
- **P0-T5-03** `motion.scrollProgress` + reactive values (basis for `scrollOffset`). ✅
- **P0-T5-01** motion/spring (`bouncy` for snap + elastic spring-back). ✅
- **P0-T4-01/03/04** gesture: pointer capture, drag (custom thumb), swipe/flick + **inertia** (the InertialScroll momentum is built on the T4-04 inertia primitive). ✅
- **P0-T2-03** ledger tier + `fluidledger:tier-change`. ✅
- **P0-T6-01/02** tokens incl. `--fluid-scroll-friction`, `--fluid-elasticity-max`, `--fluid-dir`. ✅
- **Downstream (not a dependency, but the reason `scrollOffset` exists):** `fluid-virtual-list` (Phase 6) consumes `scrollOffset`. The contract must be stable at P3-04 merge so Phase 6 can build on it.

The roadmap's "Frosted CSS / Crystalline custom / keyboard / snap / native" shorthand expands to the full gesture stack (T4-01/03/04 for capture + thumb-drag + inertia) and the reactive-value basis (T5-03) — not just T1/T2.

---

## Spec-conflict protocol
Per AGENTS.md: conflicts between this spec and the foundation doc or merged code must be surfaced (what / which source / recommendation) before writing dependent code. Implementer-verification flags: (1) confirm `--fluid-scroll-friction` and `--fluid-elasticity-max` resolve to `0.95`/`64px` in merged tokens; (2) confirm the T4-04 inertia primitive's output units match what the custom scroll loop expects before wiring momentum; (3) the §3.7 note marks scroll-view as "unchanged from v0.3" — if a fuller v0.3 scroll-view spec exists elsewhere, it outranks this and must be reconciled before implementation.
