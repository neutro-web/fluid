# Claude Code — @neutro/fluid Project Context

This file supplements AGENTS.md with Claude Code-specific workflow guidance.
Read AGENTS.md first — it contains the authoritative project rules and architecture.

---

## Key Documents (All In This Repo)

```
AGENTS.md                             — Project rules, critical constraints, architecture lookup
docs/fluid-foundation-v5.md          — Full foundational design spec
docs/fluid-testing-strategy.md       — Testing strategy
docs/fluid-adversarial-review-*.md   — Resolved issue history
components/[name]/[name].spec.md     — Per-component spec (read before implementing)
```

---

## Claude Code Workflow

**Editing files:**
- Use `str_replace` for targeted edits — never rewrite a whole file when a precise change will do
- Read the file immediately before editing — the file state changes after each successful edit
- Use `bash_tool` for running tests, exploring the filesystem, and build operations

**Running tests:**
```bash
pnpm test:unit              # Vitest — fast (< 5s), run after every core/ change
pnpm test:component         # @web/test-runner in real browser (~30s)
pnpm test:integration       # Playwright full-page tests (~60s)
pnpm test:a11y              # axe-playwright — zero violations required, run before PR
pnpm test:visual            # Storybook + Chromatic (needs CHROMATIC_TOKEN env var)
pnpm size-limit             # Bundle size gates
```

---

## Component Implementation Pattern

1. **Read the spec:** `docs/components/[name]/[name].spec.md`
2. **Check the ARIA table:** `docs/fluid-foundation-v5.md` §X
3. **Write failing tests first:** `components/[name]/[name].spec.ts`
4. **Implement:** `components/[name]/index.ts` + `components/[name]/styles.css`
5. **Run tests:** `pnpm test:component --grep [name]`
6. **Accessibility gate:** `pnpm test:a11y --grep [name]`

## Core Primitive Pattern

1. Read the spec section in `docs/fluid-foundation-v5.md`
2. Write unit tests with golden values first — `core/[name].test.ts`
3. Run: `pnpm test:unit --run core/[name].test.ts`
4. Implement until green

---

## Recurring Pitfalls — Do Not Repeat

**Tier-change reactivity**
Every component with tier-gated behaviour (ripple, spring FLIP, CSS transitions) MUST
listen to `fluidledger:tier-change` on `document`. Without it, `FluidLedger.forceTier()`
from the playground toolbar leaves the component in the old tier's state.

```typescript
// connectedCallback
document.addEventListener('fluidledger:tier-change', this._onTierChange)

// disconnectedCallback
document.removeEventListener('fluidledger:tier-change', this._onTierChange)

// handler (arrow fn for correct `this` binding)
private _onTierChange = (): void => {
  // 1. Cancel ALL tier-specific state — not just the current tier's variant.
  //    fluid-stack example: cancel BOTH spring tasks AND CSS transitions.
  //    Track CSS-animated elements in a module-level WeakSet<HTMLElement> so
  //    you can target them here (CSS transitions have no built-in cancel API).
  // 2. Re-snapshot or re-initialise so the next interaction uses the new tier.
}
```

Canonical refs: `fluid-button` (ripple teardown/create), `fluid-stack` (spring cancel +
CSS transition cancel + FLIP snapshot refresh).

**FLIP snapshot init — two paths**
`_startObserver()` must handle two cases:

```typescript
private _startObserver(): void {
  if (this._mutationObs) return
  this._mutationObs = new MutationObserver(() => this._handleMutation())
  this._mutationObs.observe(this, { childList: true })
  // Upgrade path: element defined after innerHTML → children already present → snapshot now.
  // Mid-parse path: element defined before innerHTML → children not yet present → defer.
  if (this.children.length > 0) {
    this._takeSnapshot()
  } else {
    requestAnimationFrame(() => this._takeSnapshot())
  }
}
```

Using only `requestAnimationFrame` for both paths lets `_handleMutation`'s double-rAF and
`_snapshots.clear()` race with the snapshot. The two-path check is explicit and mirrors
fluid-button's "initialize at mount time" pattern.

**Vite HMR + custom elements**
`customElements.define()` runs once (guarded by `if (!customElements.get(name))`). Vite HMR
re-imports the module but the guard blocks re-registration, so the OLD class stays active.
After any change to a custom element class, do a **hard browser reload** (Cmd+Shift+R).

**Playground wrap demos**
The `.pg-preview` is `display:flex; align-items:flex-start`. Any `fluid-stack` directly
inside it shrinks to its min-content width (the widest single child). Always wrap a
flex-direction:row + wrap demo in a block container with an explicit width:
`<div style="width:340px; flex-shrink:0;"><fluid-stack wrap>…</fluid-stack></div>`

---

## When You're Unsure

- Design decision → `docs/fluid-foundation-v5.md`
- Past issue + resolution → `docs/fluid-adversarial-review-*.md`
- Motion to use → Foundation doc §II.5 (Motion Catalogue)
- ARIA pattern → Foundation doc §X
- Default rule: Axiom 1 — "Physics first"
