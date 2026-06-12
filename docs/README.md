# `fluid` — Documentation Index

This directory contains the design and implementation documentation for `@neutro/fluid`.

---

## For Users and Evaluators

| Document | What it covers |
|---|---|
| [`../README.md`](../README.md) | What Fluid is, why it exists, how to use it, quick start |

---

## For Contributors and Agents

| Document | What it covers |
|---|---|
| [`fluid-foundation-v5.md`](fluid-foundation-v5.md) | The complete spec — physics model, rendering tiers, token system, component taxonomy, accessibility contract, package structure. **Read this before implementing anything.** |
| [`fluid-testing-strategy.md`](fluid-testing-strategy.md) | 8-tier testing approach, tool choices, golden value tests, LLM development workflow |
| [`fluid-roadmap.md`](fluid-roadmap.md) | Implementation phases, parallel tracks, subtask IDs, acceptance criteria, dependency graph |
| [`fluid-monorepo.md`](fluid-monorepo.md) | Monorepo architecture decision — why the package split is structured the way it is |

---

## Decision History (Why Things Are the Way They Are)

Three rounds of adversarial design review, resolved in the foundation document:

| Document | Key findings |
|---|---|
| [`fluid-adversarial-review-2.md`](fluid-adversarial-review-2.md) | Browser compat bugs (CSS relative colors at wrong tier), spring frame-rate independence, `setPointerCapture` missing, module federation singletons, ARIA IDs in SSR |
| [`fluid-adversarial-review-3.md`](fluid-adversarial-review-3.md) | Spring settling threshold, velocity clamping, `fluidtheme:change` mechanism, scroll lock, View Transitions race, toast live region pacing, attribute/property convention, API stability tiers |

Agents: if you encounter a design decision that seems unusual, check the adversarial review docs first. The reason is almost certainly documented there.

---

## Component Specifications

Individual component specs live in subdirectories (written during `INIT-07`):

```
docs/components/
├── button/button.spec.md
├── card/card.spec.md
├── icon-button/icon-button.spec.md
└── ...
```

Each spec uses the template defined in §XIX of the foundation document.
