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

## When You're Unsure

- Design decision → `docs/fluid-foundation-v5.md`
- Past issue + resolution → `docs/fluid-adversarial-review-*.md`
- Motion to use → Foundation doc §II.5 (Motion Catalogue)
- ARIA pattern → Foundation doc §X
- Default rule: Axiom 1 — "Physics first"
