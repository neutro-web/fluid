# `@neutro/fluid` — Monorepo Architecture Decision
**Decision:** Yes, monorepo. Specific split documented below.

---

## The Core Tension

The user wants `@neutro/fluid/adapters/react` as the import path. Subpath exports (`package.json` "exports" field) only resolve within a single npm package. So adapters MUST live inside `@neutro/fluid` if that import path is to work.

But adapters have framework peer dependencies. A React adapter needs `react` as a peer dep. A Vue adapter needs `vue`. If both are in one package, npm/pnpm will warn about ALL peer deps regardless of which adapter you use.

**Solution:** `peerDependenciesMeta.optional: true` — npm 7+, pnpm, and yarn berry all respect this. Package managers only warn about a peer dep if the consumer actually uses the subpath that requires it. This is exactly the right tool for this situation.

```json
{
  "peerDependencies": {
    "react": ">=18",
    "react-dom": ">=18",
    "vue": ">=3",
    "svelte": ">=4",
    "@angular/core": ">=17"
  },
  "peerDependenciesMeta": {
    "react":          { "optional": true },
    "react-dom":      { "optional": true },
    "vue":            { "optional": true },
    "svelte":         { "optional": true },
    "@angular/core":  { "optional": true }
  }
}
```

This solves the peer dep problem while keeping `@neutro/fluid/adapters/react` as the import path.

---

## What Belongs in the Monorepo

### `packages/fluid` → `@neutro/fluid`

Everything that is the core library. One version number. Everything ships together.

```
packages/fluid/
  src/
    core/         # ledger, spring, driver, gestures, motion, primitives
    tokens/       # design tokens
    components/   # all Elements
    adapters/     # react, vue, svelte, angular — all with optional peer deps
    testing/      # FluidTestUtils subpath
    eslint-plugin/ # subpath
  package.json    # exports map, optional peer deps
```

Consumers install one package and get everything that's "core Fluid."

### `packages/fluid-icons` → `@neutro/fluid-icons`

Separate because the icon set will grow large (hundreds of SVGs, morphing path variants). Consumers who don't use icons shouldn't download the icon set. Also allows independent versioning when new icons are added without bumping the core library.

Import: `import { CheckIcon } from '@neutro/fluid-icons'`

Peer dependency: `@neutro/fluid` (uses the morphing icon system).

### Compositions — All Separate Packages

Each composition is its own package. Reasons:
1. **Size** — data grid with virtualization, gantt with drag physics — these are significant bundles
2. **Independent versioning** — a data-grid breaking change shouldn't force a core library version bump
3. **Revenue model** — Pro compositions can be closed-source packages behind a license check
4. **Optional dependency** — most consumers don't need all compositions

```
packages/fluid-data-grid/   → @neutro/fluid-data-grid
packages/fluid-kanban/      → @neutro/fluid-kanban
packages/fluid-calendar/    → @neutro/fluid-calendar
packages/fluid-gantt/       → @neutro/fluid-gantt   (Pro tier candidate)
packages/fluid-flow-diagram/ → @neutro/fluid-flow-diagram  (Pro tier candidate)
packages/fluid-command-palette/ → @neutro/fluid-command-palette
```

All compositions declare `@neutro/fluid` as a peer dependency.

### `apps/studio` → Fluid Studio web application

Not published to npm. Lives in the monorepo, deployed separately. Uses all `@neutro/fluid` packages internally (dogfoods the library).

### `apps/docs` → Documentation site

Not published. Built with Astro or similar. Uses Fluid components.

### `apps/storybook` → Component playground

Not published. Used for development and visual regression baseline.

---

## Monorepo Tooling

**Package manager:** `pnpm` workspaces. Strict mode (`node-linker=isolated`). No phantom dependencies. Fastest install.

**Build orchestration:** `Turborepo`. Pipeline: `build`, `test`, `lint` with proper dependency ordering and caching.

**Versioning and changelog:** `Changesets`. Each PR authors a changeset. On merge to main, Changesets opens a version bump PR. Handles semver per-package correctly.

**Shared configs:**
```
tooling/
  tsconfig/     # base tsconfig, component tsconfig, test tsconfig
  eslint/       # shared ESLint config
  vitest/       # shared Vitest config
```

---

## Complete Monorepo Structure

```
fluid/                          # git root
├── packages/
│   ├── fluid/                         # @neutro/fluid
│   │   ├── src/
│   │   │   ├── core/                  # Spring, ledger, driver, motion, gestures, primitives
│   │   │   ├── tokens/themes/         # CSS token files
│   │   │   ├── components/            # All Elements
│   │   │   │   └── [name]/
│   │   │   │       ├── index.ts
│   │   │   │       ├── styles.css
│   │   │   │       └── [name].spec.ts
│   │   │   ├── adapters/
│   │   │   │   ├── react/             # @neutro/fluid/adapters/react
│   │   │   │   ├── vue/               # @neutro/fluid/adapters/vue
│   │   │   │   ├── svelte/            # @neutro/fluid/adapters/svelte
│   │   │   │   └── angular/           # @neutro/fluid/adapters/angular
│   │   │   ├── testing/               # @neutro/fluid/testing
│   │   │   └── eslint-plugin/         # @neutro/fluid/eslint-plugin
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── fluid-icons/                   # @neutro/fluid-icons
│   │   ├── src/
│   │   │   ├── icons/                 # SVG source files
│   │   │   └── index.ts               # exports all icons
│   │   └── package.json
│   │
│   ├── fluid-data-grid/               # @neutro/fluid-data-grid
│   ├── fluid-kanban/                  # @neutro/fluid-kanban
│   ├── fluid-calendar/                # @neutro/fluid-calendar
│   ├── fluid-command-palette/         # @neutro/fluid-command-palette
│   ├── fluid-gantt/                   # @neutro/fluid-gantt (Pro)
│   └── fluid-flow-diagram/            # @neutro/fluid-flow-diagram (Pro)
│
├── apps/
│   ├── studio/                        # Fluid Studio web app
│   ├── docs/                          # Documentation site
│   └── storybook/                     # Component playground + visual regression
│
├── tooling/
│   ├── tsconfig/
│   │   ├── base.json
│   │   ├── component.json
│   │   └── test.json
│   ├── eslint/
│   │   └── index.js
│   └── vitest/
│       └── base.config.ts
│
├── pnpm-workspace.yaml
├── turbo.json
├── .changeset/
└── package.json                       # root, only dev tooling
```

---

## Import Paths (Consumer-Facing)

```typescript
// Core components
import '@neutro/fluid/button'
import '@neutro/fluid/card'

// Core module
import { spring, motion } from '@neutro/fluid/core'

// Themes
import '@neutro/fluid/theme/default'
import '@neutro/fluid/theme/dark'

// Adapters (subpath in same package)
import { FluidButton } from '@neutro/fluid/adapters/react'
import { FluidButton } from '@neutro/fluid/adapters/vue'

// Testing
import { FluidTestUtils } from '@neutro/fluid/testing'

// ESLint plugin
// eslint.config.js: import fluidPlugin from '@neutro/fluid/eslint-plugin'

// Icons (separate package)
import { CheckIcon, ArrowIcon } from '@neutro/fluid-icons'

// Compositions (separate packages)
import '@neutro/fluid-data-grid'
import '@neutro/fluid-kanban'
```

---

## Version Strategy

**`@neutro/fluid`** — semver, conservative. Breaking changes in physics constants or component APIs trigger a major version. Internal refactors and new components are minor. Bug fixes are patch.

**`@neutro/fluid-icons`** — independent semver. New icons are minor. Renamed/removed icons are major.

**Compositions** — independent semver each. A data-grid breaking change is isolated to `@neutro/fluid-data-grid`.

**Changesets** automates this. Each PR includes a changeset file describing what changed and at what semver level per package.

---

## What This Buys

1. `@neutro/fluid/adapters/react` import path preserved (user preference)
2. Optional peer deps solve the peer dep warning problem
3. Heavy compositions are independently versioned and sized
4. Pro compositions can be closed-source packages without affecting the open-source core
5. Icon set can grow independently
6. Turborepo caches builds — changing `fluid-kanban` doesn't rebuild `fluid-data-grid`
7. Storybook app has access to all packages for comprehensive component playground
8. Fluid Studio is in the same repo — it uses and validates the real library
