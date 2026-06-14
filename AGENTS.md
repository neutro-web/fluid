# @neutro/fluid — Agent Context
**Version:** 1.0 (matches foundation document v0.5)
**For:** Any AI coding agent working on this project

---

## What This Project Is

`@neutro/fluid` is a physics-grounded glass material system for the web, implemented as Custom Elements with a spring physics engine. It is NOT a CSS library, NOT a design style, NOT a framework-specific component library. It is a simulation of real glass optical and physical behaviour that renders in a browser.

The full foundational design document is at: `fluid-foundation-v5.md`
The testing strategy is at: `fluid-testing-strategy.md`

---

## Critical Rules — Never Violate These

1. **Springs, not bezier curves.** Every state transition uses spring dynamics via `startSpring()`. `cubic-bezier` is only used as a Matte-tier fallback approximation.

2. **Velocity preservation is mandatory.** Every call to `startSpring()` carries forward the interrupted animation's velocity from the velocity registry. Never start a spring with hardcoded `velocity: 0` unless the element has never been animated.

3. **`setPointerCapture()` is required for drag.** Call `element.setPointerCapture(event.pointerId)` on `pointerdown` for every drag gesture. Omitting it breaks drag on desktop and touch.

4. **Locked tokens cannot change.** `--fluid-blur-*`, `--fluid-spring-*`, `--fluid-ior`, `--fluid-fresnel-strength`, `--fluid-vibrancy`, `--fluid-dispersion`, `--fluid-elasticity-max` are physical constants. Never modify them in component styles.

5. **All singletons use `Symbol.for()`.** `AnimationDriver`, `ZIndexAllocator`, `TooltipManager`, `ToastManager` must use `const KEY = Symbol.for('neutro.fluid.[name]')` pattern. Module-level `export const x = new X()` is forbidden for singletons.

6. **Spring settling threshold is relative, not absolute.** Use `range * 0.001` as the threshold, not `0.001` directly. See `startSpring()` in `core/driver.ts`.

7. **ARIA IDs must use `generateFluidId()`.** Never use `Math.random()`, `Date.now()`, or an incrementing counter for ARIA link IDs. `generateFluidId()` produces stable IDs that match across SSR and client hydration.

8. **`fluid:mounted` fires after `onMount()` completes.** The lifecycle event is the reliable "ready" signal. Dispatch it as the last line of `connectedCallback()`.

9. **`fluid-theme:change` requires MutationObserver.** CSS custom properties have no native change event. `fluid-theme` observes its own `style` attribute and dispatches `fluidtheme:change` for portals and other consumers.

---

## Before Implementing Any Component

1. Read `components/[name]/[name].spec.md` — the component spec is the authoritative requirement
2. Run `pnpm test:unit` to confirm core is passing
3. Write failing tests in `components/[name]/[name].spec.ts` first
4. Implement `index.ts` + `styles.css` to pass the tests
5. Run `pnpm test:component` (real browser, ~30s)
6. Run `pnpm test:a11y` — zero axe-core violations required

---

## Standard Test Matrix (Every Component Must Pass)

- [ ] Shadow DOM structure: all `::part()` names present and correct
- [ ] ARIA role and required attributes correct
- [ ] `axe-core` passes in: default, hover, focus, active, disabled, loading, error states
- [ ] `fluid:activate` fires on pointer press
- [ ] `fluid:activate` fires on Enter/Space keyboard activation
- [ ] Attribute changes reflect correctly
- [ ] Spring preset matches component spec
- [ ] Renders without error at all 4 tiers (use `FluidTestUtils.mockTier()`)
- [ ] `prefers-reduced-motion`: no transform/scale animations (opacity only)
- [ ] `forced-colors`: no custom colours, visible outlines on all interactive elements
- [ ] Controlled and uncontrolled modes both work (for stateful components)
- [ ] Form-associated components: `setFormValue` called correctly
- [ ] `disconnectedCallback` runs all disposers (no leaks)

---

## Common Mistakes (From Adversarial Reviews)

**Physics:**
- Spring threshold: `0.001` absolute → use `range * 0.001` relative
- Velocity clamping: clamp to `maxVelocity: 2000` before passing to `startSpring()`
- `Grow`/`Shrink` motions: use `clip-path` spring at Crystalline+, not `height` animation
- FLIP: `getBoundingClientRect()` reads are intentionally outside rAF — this is correct, not a bug

**Gestures:**
- `setPointerCapture()` is required on every drag `pointerdown` — events stop tracking without it
- Long-press + drag on same element: 8px movement threshold cancels long-press, starts drag
- Multi-touch on buttons: ignore all pointers after the first `pointerdown`

**Theming/Portals:**
- `fluid-portal` theme snapshot requires MutationObserver on the theme element's style attribute
- `fluidtheme:change` must be dispatched both from `attributeChangedCallback` AND MutationObserver

**Accessibility:**
- `fluid-icon-button` MUST have `aria-label` — warn loudly in dev if missing
- `aria-describedby` IDs: ALWAYS use `generateFluidId()` — never inline random values
- Toast announcements: max one `aria-live` region update at a time — use `ToastManager` queue

**Module safety:**
- All singletons: `Symbol.for()` — not module-level exports
- `customElements.define()`: always guard with `if (!customElements.get(name))`

**FluidRipple:**
- Forget `overflow: hidden` on `:host` and the ripple bleeds — always set it alongside `border-radius` in component styles
- Do not instantiate unconditionally — always check `ledger.tier !== 'matte'` and `!ledger.deviceMemoryLow` first

**Tier-change reactivity (recurring bug — do not repeat):**
- Any component that initialises tier-gated behavior (ripple at Frosted+, spring FLIP at Crystalline+,
  CSS transitions at Matte/Frosted) MUST add `document.addEventListener('fluidledger:tier-change', handler)`
  in `connectedCallback` and remove it in `disconnectedCallback`.
- Without this, `FluidLedger.forceTier()` from the playground toolbar or devtools console leaves
  the component in the old tier's state — FLIP animations "stop working" or keep the wrong animation style.
- Handler must: (1) cancel any in-flight tier-specific state (deregister spring tasks, destroy/create ripple)
  and (2) refresh any cached pre-mutation state (re-take FLIP snapshot).
- `fluid-button` (ripple teardown/create) and `fluid-stack` (spring cancel + snapshot refresh) are the
  canonical references. Every new component with tier-gated behaviour must follow this pattern.

---

## Spec Conflicts — Never Resolve Unilaterally

If your task instructions conflict with the foundation doc, or if you
believe a spec decision is wrong, STOP. Do not resolve it yourself.
Surface it to the task author with:

  - What the conflict is
  - Which source says what
  - Your recommendation

Then wait for an explicit decision before writing any code that depends
on the resolution. Unilateral decisions made "toward the spec" are still
unilateral — the spec may itself be wrong, and the task author is the
only one who can make that call.

---

## Architecture Reference (Quick Lookup)

| Need | Where |
|---|---|
| Spring animation | `core/driver.ts` → `startSpring()` |
| Spring presets | `SPRING_PRESETS` in `core/spring.ts` |
| Capability tier | `core/ledger.ts` → `ledger.tier` |
| Z-index | `core/z-index.ts` → `zIndex.allocate(layer)` |
| Scroll lock | `core/scroll-lock.ts` → `ScrollLockManager` |
| ARIA IDs | `core/id.ts` → `generateFluidId(prefix, el)` |
| Context protocol | `core/context.ts` — WCCG pattern |
| Motion catalogue | Foundation doc §II.5 |
| ARIA patterns | Foundation doc §X |
| Component spec template | Foundation doc §XIX |
| Canvas ripple | `core/ripple.ts` → `FluidRipple` |

---

## FluidRipple Contract (all consuming components must honour this)

FluidRipple is a dumb utility — it does not gate itself. Components are responsible for:

1. **Instantiation gating** — only create FluidRipple when:
   - `ledger.tier !== 'matte'` (Frosted or above)
   - `!ledger.deviceMemoryLow`
   If either condition fails, skip instantiation entirely. Do not create the
   canvas. ripple.trigger() calls on a null reference must be no-ops.

2. **Canvas clipping** — set `overflow: hidden` and matching `border-radius`
   (or `clip-path`) on the shadow host `:host` CSS rule. FluidRipple positions
   its canvas at `inset: 0` and relies entirely on the host's clip context.
   Without this the ripple bleeds outside the component bounds.

3. **Ripple reads as a wavefront** — alpha 0 at origin, peak opacity at the
   expanding ring edge. This is the confirmed design. Do not "fix" it.

---

## Tier Forcing for Manual Testing

```javascript
// Browser devtools
FluidLedger.forceTier('frosted')

// URL parameter
?fluid-tier=crystalline

// E2E tests (set before page load)
window.__FLUID_FORCE_TIER__ = 'matte'
```

---

## Tool-Specific Sections

### For Claude Code

See `CLAUDE.md` at the repo root for Claude Code-specific workflow guidance, tool usage patterns, and skill file locations.

### For Cursor

Rules are in `.cursor/rules/fluid.mdc`. The key rules mirror the Critical Rules above.

### For GitHub Copilot

See `.github/copilot-instructions.md` for Copilot-specific guidance.
