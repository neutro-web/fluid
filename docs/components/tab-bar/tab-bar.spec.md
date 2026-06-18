# `fluid-tab-bar` + `fluid-tab` + `fluid-tab-panel` Component Spec

> **Status:** Draft for review · **Subtask:** P3-02 · **Size:** L
> **Authoritative sources:** foundation §8.4 (context protocol), §X (ARIA contract, reduced-motion table), §XI (taxonomy), §III (tiers); AGENTS.md "Tab Patterns" (aria-selected vs aria-current ruling, 2026-06-17); roadmap P3-02; WAI-ARIA APG Tabs pattern.
> This spec takes precedence over any session-brief instruction it conflicts with. Surface conflicts; do not resolve unilaterally.

This is a **compound component** of three elements. `fluid-tab-bar` is the **tabpanel pattern** (`role="tablist"`), NOT link-based navigation. Per AGENTS.md: `aria-selected="true"` marks the active tab; `aria-current="page"` is never used on a tab (that belongs to `fluid-link` in a `<nav>`, P2-09).

---

## Shared Context Protocol (governs all three)

The three elements communicate via the WCCG context protocol (foundation §8.4, `core/context.ts` from P0-T3-04). **`fluid-tab-bar` provides; `fluid-tab` and `fluid-tab-panel` request.**

- **Context key:** `TABS_CONTEXT_KEY` (a `symbol`, exported from the tab-bar module).
- **Event:** `fluid:context-request`, **`bubbles: true, composed: false`**.
  - **`composed: false` is mandatory** (foundation §8.4, ratified against merged `core/context.ts` acceptance criteria: "Event does not cross shadow boundaries"). The historical review D2-04 code sample shows `composed: true` — that sample is **stale and must not be copied**. The context request must not cross shadow boundaries, because tab/panel are light-DOM children of tab-bar; a `composed: true` request would leak into unrelated ancestor shadow roots.
- **Context shape provided by `fluid-tab-bar`:**
  ```typescript
  interface TabsContext {
    activeId: string                          // id of the currently selected tab
    register(tab: FluidTab): void             // tab self-registers on mount
    registerPanel(panel: FluidTabPanel): void // panel self-registers on mount
    activate(tabId: string): void             // a tab requests activation
    subscribe(fn: (activeId: string) => void): () => void  // react to active change
    orientation: 'horizontal' | 'vertical'
  }
  ```
- **Provision/cleanup:** `fluid-tab-bar` calls `provideContext(this, TABS_CONTEXT_KEY, ctx)` in `onMount` and pushes the returned disposer into `this.disposers`, so context re-registers on every reconnect (DOM move / React Strict Mode), per the §8.1 idempotency contract.
- **Nearest-provider wins** (P0-T3-04 acceptance criterion): nested tab-bars resolve to the closest ancestor, so a tab-bar inside a tab-panel of another tab-bar works correctly.

---

## `fluid-tab-bar`

### Classification
- **Type:** Element (compound parent).
- **Layer:** Raised (Layer 2).
- **Material preset:** `regular`.
- **Primary interaction spring:** `smooth` — governs the active-tab indicator slide (FLIP-style) between tabs.
- **Applicable motions:**
  - **Indicator movement:** `motion.flip` (P0-T5-03) to animate the selected-tab indicator from old to new position when selection changes. `smooth` spring.
  - No press physics on the bar itself (individual `fluid-tab`s own their press).
  - No FluidRipple on the bar (surface/structural; ripple is action-component-only per AGENTS.md).

### Attribute Contract

| Attribute | Type | Default | Reflected | Description |
|---|---|---|---|---|
| `active-tab` | string (tab id) | first tab's id | yes | The selected tab's id. Controlled/uncontrolled per §8.5: if `active-tab` is ever present (even empty), the bar is controlled and will not self-select on click — it fires `fluid:change` and waits for the consumer to update the attribute. If absent, the bar manages its own selection. |
| `orientation` | `horizontal \| vertical` | `horizontal` | yes | Tablist orientation. Drives `aria-orientation` and which arrow keys move selection (Left/Right for horizontal, Up/Down for vertical). Invalid → dev warn, retain. |
| `activation` | `automatic \| manual` | `automatic` | yes | APG activation mode. `automatic`: arrow-key focus immediately activates the focused tab. `manual`: arrow keys move focus only; Enter/Space activates. Invalid → dev warn, retain. |

**Required ARIA:** `aria-label` or `aria-labelledby` on the host — a tablist must be named (axe fails an unnamed tablist). **Dev warning if absent** (not a hard error — unlike icon-button, a tablist can sometimes derive a name from context; warn rather than throw). String: `[fluid warn] fluid-tab-bar should have aria-label or aria-labelledby (unnamed tablist).`

### Property Contract

| Property | Type | Reflects | Description |
|---|---|---|---|
| `activeTab` | `string` | `active-tab` | Selected tab id accessor. |
| `orientation` | `'horizontal' \| 'vertical'` | `orientation` | Typed orientation. |
| `activation` | `'automatic' \| 'manual'` | `activation` | Typed activation mode. |
| `tabs` | `readonly FluidTab[]` | — | **Non-reflected.** Live list of registered tabs in DOM order. Read-only. |

### Slot Contract

| Slot | Required | Fallback | Description |
|---|---|---|---|
| `(default)` | yes | dev warn if empty | Holds the `fluid-tab` elements. Required — a tablist with no tabs is invalid. Empty → `[fluid warn] fluid-tab-bar requires at least one fluid-tab in the default slot.` |

`fluid-tab-panel`s are **not** slotted into the bar — they live in the light DOM elsewhere on the page (typically as siblings after the bar), and connect via context, not DOM nesting. This matches the APG pattern where panels are separate from the tablist.

### Event Contract

| Event | When | `detail` shape | bubbles / composed |
|---|---|---|---|
| `fluid:change` | Active tab changes (user activation or programmatic). | `{ activeId: string, previousId: string \| null }` | `true` / `true` |

`fluid:change` carries only the tab **id** (an opaque identifier), never tab content — consistent with the §8.7 rule that event detail holds identifiers, not sensitive data. Fires in both controlled and uncontrolled modes (informational per §8.5).

### ARIA Pattern (`fluid-tab-bar`)
- **Role:** `tablist` (via `this.internals.role = 'tablist'`).
- **`aria-orientation`:** reflects `orientation`.
- **Required name:** `aria-label`/`aria-labelledby` (dev warn if absent).
- Owns no roving-tabindex logic itself beyond coordinating; the roving state lives across the `fluid-tab` children (see part 2).

### State Machine (`fluid-tab-bar`)
Single axis — **active tab**. Exactly one tab is active at any time. On mount, active = `active-tab` attribute if present and matches a registered tab, else the first registered enabled tab. Selection change → update context `activeId` → notify subscribers (tabs restyle, panels toggle) → fire `fluid:change` → slide indicator via `motion.flip`.

### Tier Behavior (`fluid-tab-bar`)
| Tier | Indicator animation |
|---|---|
| Matte | Indicator jumps to new tab (no FLIP slide); selection still fully functional. |
| Frosted+ | Indicator slides via `motion.flip`, `smooth` spring. |

Tier-change reactivity (AGENTS.md): listen for `fluidledger:tier-change`; on downgrade to Matte cancel any in-flight indicator animation and snap. Listener in `onMount`, disposer-cleaned.


---

## `fluid-tab`

### Classification
- **Type:** Element (compound child; requests `TABS_CONTEXT_KEY`).
- **Layer:** Raised (renders within the bar).
- **Material preset:** `none` — a tab is a control surface within the bar, not its own glass layer (avoids nested-glass per §2.7).
- **Primary interaction spring:** `snappy` (press) / `bouncy` (release) — same as button press feedback.
- **Applicable motions:** `depress` on pointer-down, `release` on activation. **FluidRipple permitted** — a tab is an action component (it activates). Gate on `ledger.tier !== 'matte' && !ledger.deviceMemoryLow` per the AGENTS.md FluidRipple contract; `overflow: hidden` on `:host`.

### Attribute Contract

| Attribute | Type | Default | Reflected | Description |
|---|---|---|---|---|
| `tab-id` | string | generated | yes | Stable id linking this tab to its panel. If absent, generated via `generateFluidId('tab', host)` (§8.1b — never random/counter, for SSR parity). |
| `panel` | string (id) | — | yes | The `tab-id`/`panel-id` of the `fluid-tab-panel` this tab controls. Drives `aria-controls`. |
| `disabled` | boolean | absent | yes | Disabled tab — skipped in roving navigation, not activatable. `aria-disabled="true"`. |

### Property Contract

| Property | Type | Reflects | Description |
|---|---|---|---|
| `tabId` | `string` | `tab-id` | Stable tab id. |
| `panel` | `string` | `panel` | Controlled panel id. |
| `disabled` | `boolean` | `disabled` | Disabled state. |
| `active` | `boolean` (read-only) | — | **Non-reflected.** True when this tab is the bar's active tab (derived from context, not owned). |

### Slot Contract

| Slot | Required | Fallback | Description |
|---|---|---|---|
| `(default)` | no | empty | Tab label. Text and/or an icon. |
| `icon` | no | hidden | Leading icon. |

### Event Contract

| Event | When | `detail` | bubbles / composed |
|---|---|---|---|
| `fluid:activate` | Tab is activated (pointer press, Enter, Space, programmatic). | `{ tabId: string }` | `true` / `true` |

On `fluid:activate`, the tab calls `context.activate(this.tabId)` — it does **not** set its own active state directly. The bar owns selection; the tab requests it. This keeps single-source-of-truth in the bar's context (matches §8.5 controlled/uncontrolled: in controlled mode the bar may decline to change, and the tab must not have already restyled itself).

### ARIA Pattern (`fluid-tab`)
- **Role:** `tab` (via `this.internals.role = 'tab'`).
- **`aria-selected`:** `"true"` when active, `"false"` otherwise. **This is the active marker — never `aria-current`** (AGENTS.md Tab Patterns rule).
- **`aria-controls`:** the controlled panel's id (from `panel` attribute).
- **`aria-disabled`:** `"true"` when `disabled`.
- **Roving tabindex:** the active tab has `tabindex="0"`; all other tabs have `tabindex="-1"`. Exactly one tab is in the page tab sequence at a time (APG roving-tabindex). Disabled tabs get `tabindex="-1"` and are skipped.

---

## `fluid-tab-panel`

### Classification
- **Type:** Element (compound child; requests `TABS_CONTEXT_KEY`).
- **Layer:** Surface (Layer 1) — panel content area.
- **Material preset:** `none` (content container; consumer composes glass inside if wanted).
- **Primary interaction spring:** none (visibility container).
- **Applicable motions:** none on show/hide by default — visibility is instant (display toggle). Optional `emerge`/`recede` on the entering/leaving panel is a future enhancement, not in this spec's scope (would require coordinating two panels; out of scope for L sizing).

### Attribute Contract

| Attribute | Type | Default | Reflected | Description |
|---|---|---|---|---|
| `panel-id` | string | generated | yes | Stable id matching a `fluid-tab`'s `panel` attribute. Generated via `generateFluidId('tabpanel', host)` if absent. |

### Property Contract

| Property | Type | Reflects | Description |
|---|---|---|---|
| `panelId` | `string` | `panel-id` | Stable panel id. |
| `active` | `boolean` (read-only) | — | **Non-reflected.** True when this panel's id matches the bar's active tab's `panel`. Derived from context. |

### Slot Contract

| Slot | Required | Fallback | Description |
|---|---|---|---|
| `(default)` | no | empty | Panel content. |

### ARIA Pattern (`fluid-tab-panel`)
- **Role:** `tabpanel` (via `this.internals.role = 'tabpanel'`).
- **`aria-labelledby`:** the `tab-id` of the controlling tab (so the panel is named by its tab). Resolved through context (panel knows which tab controls it via the shared id).
- **`tabindex="0"`:** the active panel is focusable so keyboard users can Tab from the tablist into panel content (APG requirement when the panel has no focusable children; applying it unconditionally is APG-compliant and simplest).
- **Visibility:** inactive panels are `hidden` (the HTML `hidden` attribute / `display:none`), removed from the a11y tree and tab order. Only the active panel is visible and in the tree.

---

## Keyboard Contract (the load-bearing APG behavior — all three coordinate)

Implemented across `fluid-tab` (focus handling) coordinated by the bar's context. This is the section most likely to be implemented incompletely; every row is required.

| Key | Mode | Behavior |
|---|---|---|
| `Tab` (into tablist) | both | Focus lands on the **active** tab (the only one with `tabindex="0"`), not the first tab. |
| `Tab` (from active tab) | both | Moves focus **out** of the tablist to the next focusable (typically the active panel via its `tabindex="0"`), NOT to the next tab. |
| `ArrowRight` / `ArrowDown` | horizontal / vertical | Move focus to next tab (skip disabled). Wraps from last to first. `automatic`: also activates. `manual`: focus only. |
| `ArrowLeft` / `ArrowUp` | horizontal / vertical | Move focus to previous tab (skip disabled). Wraps first to last. |
| `Home` | both | Focus (and in `automatic`, activate) the first enabled tab. |
| `End` | both | Focus (and in `automatic`, activate) the last enabled tab. |
| `Enter` / `Space` | `manual` | Activate the focused tab. (In `automatic` mode, focus already activated it.) |

Arrow-key direction is governed by `orientation`: horizontal uses Left/Right, vertical uses Up/Down. The cross-axis arrows are inert (do not move focus), per APG.

**RTL:** in `horizontal` + `dir="rtl"`, ArrowRight/ArrowLeft semantics flip (Right moves to the *previous* tab visually) via the `--fluid-dir` multiplier (§8.11). Home/End are unaffected (logical first/last).

---

## Accessibility (all three)

- **Reduced-motion (§2.5 + §X):** the indicator slide (`motion.flip`) degrades to opacity-only / instant per the reduced-motion contract; selection and panel toggling are unaffected (structural). Tab `depress`/`release` degrade to opacity per their `reducedPhases`.
- **forced-colors / high-contrast (§X table):** backdrop-filter disabled, explicit borders; active tab distinguished by more than color (the indicator must remain a visible underline/border, not color alone — WCAG 1.4.1). `aria-selected` carries the state non-visually regardless.
- **RTL:** tab order and indicator mirror via logical properties + `--fluid-dir`; arrow keys flip as above.
- **axe-core:** zero violations — tablist named, each tab has accessible name, `aria-controls`/`aria-labelledby` resolve, exactly one `tabindex=0` tab.

---

## Acceptance Criteria

Standard test matrix (AGENTS.md) for each of the three elements, **plus** all of:

**Context protocol & wiring**
1. `fluid-tab` and `fluid-tab-panel` placed within/around a `fluid-tab-bar` receive context; `fluid:context-request` uses `composed: false` (assert it does NOT cross a shadow boundary — a tab inside an unrelated shadow root does not connect).
2. Nearest-provider: nested tab-bars resolve each tab/panel to its closest ancestor bar.
3. Tabs and panels self-register; `bar.tabs` reflects registered tabs in DOM order; registration survives reconnect (move a tab in the DOM, it re-registers).

**Selection & ARIA**
4. Active tab has `aria-selected="true"`, all others `"false"`; **no element ever has `aria-current`** (assert absence — guards the AGENTS.md ruling).
5. Each tab's `aria-controls` equals its panel's `panel-id`; each panel's `aria-labelledby` equals its controlling tab's `tab-id`.
6. Exactly one tab has `tabindex="0"` (the active one); all others `tabindex="-1"`; disabled tabs `tabindex="-1"`.
7. Only the active panel is visible; inactive panels are `hidden` and absent from the a11y tree.
8. Activating a tab toggles panel visibility to the matching panel and fires `fluid:change` on the bar with `{ activeId, previousId }`.

**Controlled/uncontrolled (§8.5)**
9. Uncontrolled (no `active-tab` attr): clicking a tab selects it and shows its panel.
10. Controlled (`active-tab` present): clicking a tab fires `fluid:change` but does NOT change selection until the consumer updates `active-tab`.

**Keyboard (APG)**
11. Tab into tablist lands on the active tab, not the first.
12. ArrowRight/Left (horizontal) move focus and skip disabled tabs, wrapping at ends.
13. `orientation="vertical"`: ArrowUp/Down move focus; Left/Right inert.
14. `activation="automatic"`: arrow focus activates immediately; `activation="manual"`: arrow moves focus only, Enter/Space activates.
15. Home/End focus (and in automatic, activate) first/last enabled tab.
16. Tab from the active tab moves focus to the active panel (panel `tabindex="0"`), not the next tab.
17. RTL horizontal: arrow direction flips via `--fluid-dir`.

**Motion & tier**
18. Frosted+: indicator slides via `motion.flip` on selection change. Matte: indicator jumps (no slide), selection still works.
19. Tier-change to Matte mid-animation cancels the in-flight indicator slide and snaps.
20. Reduced-motion: indicator does not slide (opacity/instant); selection + panel toggle unaffected.

**a11y**
21. axe-core zero violations: named tablist, named tabs, resolved `aria-controls`/`aria-labelledby`, single `tabindex=0`.

### Standard done criteria
- Storybook stories at `apps/storybook/stories/tab-bar.stories.ts` covering: horizontal/vertical orientation, automatic/manual activation, disabled tab, controlled vs uncontrolled, tier parameter, mode parameter.
- Playground page `apps/playground/pages/tab-bar.html` with Variants, States, Edge cases (incl. disabled tab, vertical orientation, keyboard demo, many-tabs overflow).
- Nav entry added under the **Navigation** group in `apps/playground/index.html`.
- Gates: `pnpm test:component`, `pnpm test:a11y` (zero axe), `pnpm test:visual` (Chromatic).

---

## Dependencies
- **P1-01** FluidElement (lifecycle, ElementInternals for tablist/tab/tabpanel roles).
- **P1-02** fluid-theme. ✅
- **P0-T3-04** context protocol (`provideContext`/`requestContext`, `composed: false`). ✅
- **P0-T3-03** `generateFluidId` (tab/panel id parity). ✅
- **P0-T5-01** motion primitives (`depress`/`release` for tab press). ✅
- **P0-T5-03** `motion.flip` (indicator slide). ✅
- **P0-T4-02** press gesture (tab activation). ✅
- **P1-04** FluidRipple (tab ripple, gated). ✅
- **P0-T2-03** ledger tier + `fluidledger:tier-change`. ✅
- **P0-T6-01/02** tokens, `--fluid-dir` for RTL. ✅

Full set — the roadmap's "context protocol + ARIA" shorthand expands to T3-04, T5-01/03, T4-02, ripple, and the `--fluid-dir` RTL dependency.

---

## Spec-conflict protocol
Per AGENTS.md: conflicts between this spec and the foundation doc or merged code must be surfaced (what / which source / recommendation) before writing dependent code. Note already resolved: review D2-04's `composed: true` sample is superseded by `composed: false` (§8.4 + merged `core/context.ts`); the roadmap's former `aria-current="page"` is superseded by `aria-selected="true"` (AGENTS.md Tab Patterns).
