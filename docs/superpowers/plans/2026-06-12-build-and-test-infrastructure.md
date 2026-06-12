# Build and Test Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete all tooling for P0-T7-02 (tsup build), P0-T7-03 (test runners), P0-T7-04/INIT-08 (Storybook), and P0-T8-01/02/03 (testing utilities).

**Architecture:** tsup produces ESM/CJS/types from packages/fluid/src. @web/test-runner with Playwright Chromium runs component specs in a real browser. Storybook 8 + Vite hosts visual stories with tier and color-scheme globals. FluidSpringUtils/FluidTestUtils/FluidAccessibilityUtils live in packages/fluid/src/testing/.

**Tech Stack:** tsup, vitest, @web/test-runner, @web/test-runner-playwright, @playwright/test, storybook@8, @storybook/web-components-vite, fast-check, axe-core

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `packages/fluid/tsup.config.ts` | Create | tsup build config, ESM+CJS+types output |
| `packages/fluid/package.json` | Modify | add build script, conditional exports, tsup devDep |
| `vitest.config.ts` (repo root) | Create | root vitest config, finds core tests |
| `packages/fluid/web-test-runner.config.mjs` | Create | @web/test-runner with Playwright Chromium |
| `playwright.config.ts` (repo root) | Create | Playwright integration test config |
| `turbo.json` | Modify | add test:integration task |
| `package.json` (root) | Modify | add test:integration script, size-limit script |
| `apps/storybook/package.json` | Modify | add storybook deps and scripts |
| `apps/storybook/.storybook/main.ts` | Create | Storybook framework + addon config |
| `apps/storybook/.storybook/preview.ts` | Create | tier global + dark mode decorator |
| `apps/storybook/src/placeholder.stories.ts` | Create | placeholder story so Storybook has content |
| `packages/fluid/src/core/driver.ts` | Modify | export `_hasActiveAnimations` for test utils |
| `packages/fluid/src/testing/spring.ts` | Create | FluidSpringUtils |
| `packages/fluid/src/testing/spring.test.ts` | Create | unit tests for FluidSpringUtils (Vitest, Node.js) |
| `packages/fluid/src/testing/utils.ts` | Create | FluidTestUtils (browser context) |
| `packages/fluid/src/testing/accessibility.ts` | Create | FluidAccessibilityUtils (browser context) |
| `packages/fluid/src/testing/index.ts` | Create | barrel export for @neutro/fluid/testing |

---

## Task 1: Install All Dependencies

**Files:**
- Modify: `packages/fluid/package.json`
- Modify: `apps/storybook/package.json`

- [ ] **Step 1: Install packages/fluid devDependencies**

```bash
pnpm --filter @neutro/fluid add -D tsup fast-check axe-core @web/test-runner @web/test-runner-playwright
```

- [ ] **Step 2: Install @playwright/test at root**

```bash
pnpm add -D -w @playwright/test
```

- [ ] **Step 3: Install Storybook in apps/storybook**

```bash
pnpm --filter @neutro/storybook add -D storybook@^8.0.0 @storybook/web-components-vite@^8.0.0 @storybook/addon-essentials@^8.0.0 vite@^5.0.0
```

- [ ] **Step 4: Add @neutro/fluid workspace dependency to storybook**

```bash
pnpm --filter @neutro/storybook add @neutro/fluid@workspace:*
```

- [ ] **Step 5: Verify installation**

Run: `pnpm install`
Expected: exits 0, lockfile updated.

---

## Task 2: tsup Build Config (P0-T7-02)

**Files:**
- Create: `packages/fluid/tsup.config.ts`
- Modify: `packages/fluid/package.json`

- [ ] **Step 1: Create tsup.config.ts**

```typescript
// packages/fluid/tsup.config.ts
import { defineConfig } from 'tsup'
import { cpSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const WORKLETS_SRC = resolve(__dirname, 'src/worklets')

export default defineConfig([
  // ESM bundle
  {
    entry: {
      'core/index':          'src/core/index.ts',
      'testing/index':       'src/testing/index.ts',
      'eslint-plugin/index': 'src/eslint-plugin/index.ts',
      'index':               'src/index.ts',
    },
    format: ['esm'],
    outDir: 'dist/esm',
    dts: false,
    splitting: false,
    sourcemap: true,
    clean: false,
    esbuildOptions(opts) {
      opts.define = { 'process.env.NODE_ENV': '"production"' }
    },
    onSuccess: async () => {
      if (existsSync(WORKLETS_SRC)) {
        cpSync(WORKLETS_SRC, resolve(__dirname, 'dist/worklets'), { recursive: true })
      }
    },
  },
  // CJS bundle
  {
    entry: {
      'core/index':          'src/core/index.ts',
      'testing/index':       'src/testing/index.ts',
      'eslint-plugin/index': 'src/eslint-plugin/index.ts',
      'index':               'src/index.ts',
    },
    format: ['cjs'],
    outDir: 'dist/cjs',
    dts: false,
    splitting: false,
    sourcemap: true,
    clean: false,
    esbuildOptions(opts) {
      opts.define = { 'process.env.NODE_ENV': '"production"' }
    },
  },
  // TypeScript declarations only
  {
    entry: {
      'core/index':          'src/core/index.ts',
      'testing/index':       'src/testing/index.ts',
      'eslint-plugin/index': 'src/eslint-plugin/index.ts',
      'index':               'src/index.ts',
    },
    format: ['esm'],
    outDir: 'dist/types',
    dts: { only: true },
    splitting: false,
    clean: false,
  },
])
```

**Note:** The `testing/index` entry will fail until Task 7 creates `src/testing/index.ts`. That is expected — tsup is configured now but the entry is added in Task 7. For the initial build verification, comment out the `'testing/index'` entry.

- [ ] **Step 2: Update packages/fluid/package.json — add build script and devDependency**

In `packages/fluid/package.json`, add/update:

```json
"scripts": {
  "build": "tsup",
  "test:unit": "vitest run",
  "test:component": "web-test-runner --config web-test-runner.config.mjs",
  "typecheck": "tsc --noEmit -p tsconfig.json"
},
```

Tsup will already be installed as a devDependency from Task 1.

- [ ] **Step 3: Update package.json exports to conditional form**

Replace the current single-string export values with conditional objects for the entries we are building. Keep src/ in the `"source"` condition (resolved by Vite/Storybook for monorepo dev) and dist/ in `"import"` / `"require"` / `"types"` conditions.

Update ONLY these four entries (the ones tsup will build):

```json
".": {
  "source": "./src/index.ts",
  "import": "./dist/esm/index.js",
  "require": "./dist/cjs/index.cjs",
  "types": "./dist/types/index.d.ts"
},
"./core": {
  "source": "./src/core/index.ts",
  "import": "./dist/esm/core/index.js",
  "require": "./dist/cjs/core/index.cjs",
  "types": "./dist/types/core/index.d.ts"
},
"./testing": {
  "source": "./src/testing/index.ts",
  "import": "./dist/esm/testing/index.js",
  "require": "./dist/cjs/testing/index.cjs",
  "types": "./dist/types/testing/index.d.ts"
},
"./eslint-plugin": {
  "source": "./src/eslint-plugin/index.ts",
  "import": "./dist/esm/eslint-plugin/index.js",
  "require": "./dist/cjs/eslint-plugin/index.cjs",
  "types": "./dist/types/eslint-plugin/index.d.ts"
},
```

All other exports (./button, ./card, etc.) remain as `"./src/components/..."` strings — they will be updated when those components are implemented.

Also update `size-limit` to ensure the path is correct (it already is):
```json
"size-limit": [
  {
    "name": "@neutro/fluid/core",
    "path": "dist/esm/core/index.js",
    "limit": "10 KB",
    "gzip": true
  }
]
```

- [ ] **Step 4: Temporarily comment out testing/index entry in tsup.config.ts**

In tsup.config.ts, comment out all three `'testing/index'` lines (the file doesn't exist yet):
```typescript
// 'testing/index': 'src/testing/index.ts',  // added in Task 7
```

- [ ] **Step 5: Run the build and verify output**

Run: `pnpm --filter @neutro/fluid build`

Expected output:
```
dist/esm/core/index.js
dist/esm/index.js
dist/esm/eslint-plugin/index.js
dist/cjs/core/index.cjs
dist/cjs/index.cjs
dist/cjs/eslint-plugin/index.cjs
dist/types/core/index.d.ts
dist/types/index.d.ts
```

- [ ] **Step 6: Verify size-limit would find the file**

Run: `ls dist/esm/core/index.js` from `packages/fluid/`
Expected: file exists, not empty.

- [ ] **Step 7: Commit**

```bash
git add packages/fluid/tsup.config.ts packages/fluid/package.json
git commit -m "feat(build): add tsup config with ESM/CJS/types output (P0-T7-02)"
```

---

## Task 3: Root vitest.config.ts (P0-T7-03)

**Files:**
- Create: `vitest.config.ts` (repo root)

- [ ] **Step 1: Create root vitest.config.ts**

```typescript
// vitest.config.ts (repo root)
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'packages/fluid/src/core/**/*.test.ts',
      'packages/fluid/src/testing/**/*.test.ts',
      'packages/fluid/src/tokens/**/*.test.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
})
```

- [ ] **Step 2: Verify pnpm test:unit still passes**

Run: `pnpm test:unit`

Expected: all tests pass (same 423 that passed before), no failures.

The turbo pipeline delegates `test:unit` to `packages/fluid` which uses its own `vitest.config.ts`. The root config is an alternative entry point for running vitest directly from the monorepo root.

- [ ] **Step 3: Commit**

```bash
git add vitest.config.ts
git commit -m "feat(test): add root vitest.config.ts for monorepo-level unit test runs (P0-T7-03)"
```

---

## Task 4: @web/test-runner Config (P0-T7-03)

**Files:**
- Create: `packages/fluid/web-test-runner.config.mjs`
- Modify: `turbo.json` (add test:component config)

- [ ] **Step 1: Create web-test-runner.config.mjs**

```javascript
// packages/fluid/web-test-runner.config.mjs
import { playwrightLauncher } from '@web/test-runner-playwright'
import { esbuildPlugin } from '@web/dev-server-esbuild'

export default {
  files: ['src/components/**/*.spec.ts'],
  nodeResolve: true,
  plugins: [
    esbuildPlugin({ ts: true }),
  ],
  browsers: [
    playwrightLauncher({ product: 'chromium' }),
  ],
  testFramework: {
    config: {
      timeout: 5000,
    },
  },
}
```

**Note:** `@web/dev-server-esbuild` is the TypeScript plugin for @web/test-runner. Install it:

```bash
pnpm --filter @neutro/fluid add -D @web/dev-server-esbuild
```

- [ ] **Step 2: Run pnpm test:component from packages/fluid**

Run: `pnpm --filter @neutro/fluid test:component`

Expected: exits 0 with "0 test files found" or "No test files" message. This is success per the spec ("zero tests = pass").

- [ ] **Step 3: Verify turbo test:component works**

Run: `pnpm test:component` from repo root.

Expected: delegates to @neutro/fluid, exits 0.

- [ ] **Step 4: Commit**

```bash
git add packages/fluid/web-test-runner.config.mjs packages/fluid/package.json
git commit -m "feat(test): add @web/test-runner config for component tests (P0-T7-03)"
```

---

## Task 5: Playwright Integration Config (P0-T7-03)

**Files:**
- Create: `playwright.config.ts` (repo root)
- Modify: `turbo.json`
- Modify: `package.json` (root)

- [ ] **Step 1: Create playwright.config.ts at repo root**

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './packages/fluid/src',
  testMatch: ['**/*.integration.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: process.env['TEST_BASE_URL'] ?? 'http://localhost:9000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: process.env['TEST_BASE_URL']
    ? undefined
    : {
        command: 'pnpm --filter @neutro/storybook dev --ci',
        url: 'http://localhost:6006',
        reuseExistingServer: !process.env['CI'],
        timeout: 120_000,
      },
})
```

- [ ] **Step 2: Add test:integration to turbo.json**

In `turbo.json`, add:
```json
"test:integration": {
  "dependsOn": ["build"],
  "cache": false
},
"test:a11y": {
  "dependsOn": ["build"],
  "cache": false
}
```

- [ ] **Step 3: Add test:integration and test:a11y scripts to root package.json**

```json
"test:integration": "playwright test",
"test:a11y": "playwright test --project=chromium --grep @a11y"
```

- [ ] **Step 4: Install Playwright browsers (Chromium only for CI speed)**

Run: `npx playwright install chromium`

Expected: Chromium browser downloaded.

- [ ] **Step 5: Verify playwright config is valid**

Run: `npx playwright test --list` from repo root.

Expected: exits 0, outputs "No tests found" (no .integration.ts files yet). This is success.

- [ ] **Step 6: Commit**

```bash
git add playwright.config.ts turbo.json package.json
git commit -m "feat(test): add Playwright integration test config (P0-T7-03)"
```

---

## Task 6: Storybook Scaffold (P0-T7-04 / INIT-08)

**Files:**
- Modify: `apps/storybook/package.json`
- Create: `apps/storybook/.storybook/main.ts`
- Create: `apps/storybook/.storybook/preview.ts`
- Create: `apps/storybook/src/placeholder.stories.ts`
- Create: `apps/storybook/tsconfig.json`

- [ ] **Step 1: Update apps/storybook/package.json**

Replace the entire file:

```json
{
  "name": "@neutro/storybook",
  "version": "0.0.0",
  "description": "Fluid component playground and visual regression",
  "private": true,
  "license": "MIT",
  "scripts": {
    "dev": "storybook dev -p 6006",
    "build": "storybook build",
    "test:visual": "chromatic --exit-zero-on-changes"
  },
  "dependencies": {
    "@neutro/fluid": "workspace:*"
  },
  "devDependencies": {
    "@storybook/addon-essentials": "^8.0.0",
    "@storybook/web-components-vite": "^8.0.0",
    "storybook": "^8.0.0",
    "vite": "^5.0.0",
    "typescript": "^5.0.0"
  }
}
```

Run: `pnpm install` to get the dependencies resolved.

- [ ] **Step 2: Create apps/storybook/tsconfig.json**

```json
{
  "extends": "../../tooling/tsconfig/component.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler"
  },
  "include": [".storybook/**/*", "src/**/*"]
}
```

- [ ] **Step 3: Create apps/storybook/.storybook/main.ts**

```typescript
// apps/storybook/.storybook/main.ts
import type { StorybookConfig } from '@storybook/web-components-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
  ],
  framework: {
    name: '@storybook/web-components-vite',
    options: {},
  },
  docs: {
    autodocs: false,
  },
}

export default config
```

- [ ] **Step 4: Create apps/storybook/.storybook/preview.ts**

This wires up the `fluidTier` global to `window.__FLUID_FORCE_TIER__` and a `colorScheme` global that adds/removes a `data-color-scheme` attribute on `<html>` (so CSS can respond to `html[data-color-scheme="dark"]` in addition to the media query).

```typescript
// apps/storybook/.storybook/preview.ts
import type { Preview } from '@storybook/web-components'

declare global {
  interface Window {
    __FLUID_FORCE_TIER__?: string
  }
}

const preview: Preview = {
  globalTypes: {
    fluidTier: {
      description: 'Fluid capability tier — sets window.__FLUID_FORCE_TIER__',
      defaultValue: 'crystalline',
      toolbar: {
        title: 'Tier',
        icon: 'lightning',
        items: [
          { value: 'matte',        title: 'Matte' },
          { value: 'frosted',      title: 'Frosted' },
          { value: 'crystalline',  title: 'Crystalline' },
          { value: 'optical',      title: 'Optical' },
        ],
        dynamicTitle: true,
      },
    },
    colorScheme: {
      description: 'Color scheme — emulates prefers-color-scheme',
      defaultValue: 'light',
      toolbar: {
        title: 'Color Scheme',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark',  title: 'Dark',  icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (story, context) => {
      const tier = (context.globals['fluidTier'] as string | undefined) ?? 'crystalline'
      const scheme = (context.globals['colorScheme'] as string | undefined) ?? 'light'

      // Set tier forcing (read by ledger on component mount)
      window.__FLUID_FORCE_TIER__ = tier

      // Emulate prefers-color-scheme via data attribute
      // CSS token files can target html[data-color-scheme="dark"] in addition to the media query
      if (scheme === 'dark') {
        document.documentElement.setAttribute('data-color-scheme', 'dark')
      } else {
        document.documentElement.removeAttribute('data-color-scheme')
      }

      return story()
    },
  ],
}

export default preview
```

- [ ] **Step 5: Create apps/storybook/src/placeholder.stories.ts**

```typescript
// apps/storybook/src/placeholder.stories.ts
import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'

const meta: Meta = {
  title: 'Getting Started / Welcome',
}

export default meta

export const Welcome: StoryObj = {
  render: () => html`
    <div style="font-family: system-ui, sans-serif; padding: 40px; max-width: 600px;">
      <h1 style="font-size: 2rem; margin-bottom: 8px;">@neutro/fluid</h1>
      <p style="color: #666; font-size: 1.1rem; margin-bottom: 24px;">
        Physics-grounded glass material system for the web.
      </p>
      <p style="color: #999;">
        Components are coming soon. Check back after Phase 2 is complete.
      </p>
    </div>
  `,
}
```

**Note:** This story uses `lit`'s `html` template tag for proper web component story authoring. Add lit as a devDependency:

```bash
pnpm --filter @neutro/storybook add -D lit
```

- [ ] **Step 6: Start Storybook and verify it launches**

Run: `pnpm --filter @neutro/storybook dev`

Expected: 
- Server starts on port 6006
- No compilation errors
- Browser opens (or can be opened at http://localhost:6006)
- "Welcome" story renders the placeholder HTML without error
- Tier toolbar dropdown is visible
- Color Scheme toolbar dropdown is visible

Stop the server (Ctrl+C) once verified.

- [ ] **Step 7: Commit**

```bash
git add apps/storybook/
git commit -m "feat(storybook): scaffold Storybook 8 with tier + color-scheme globals (P0-T7-04/INIT-08)"
```

---

## Task 7: Export _hasActiveAnimations from driver.ts

This is a prerequisite for FluidTestUtils.waitForSpringSettle, which needs to poll the `activeAnimations` WeakMap.

**Files:**
- Modify: `packages/fluid/src/core/driver.ts`

- [ ] **Step 1: Add _hasActiveAnimations export to driver.ts**

In `packages/fluid/src/core/driver.ts`, after line 98 (the `activeAnimations` declaration), add:

```typescript
/** Test-only: returns true if the element has any active spring animations. */
export function _hasActiveAnimations(el: Element): boolean {
  const map = activeAnimations.get(el)
  return map !== undefined && map.size > 0
}
```

- [ ] **Step 2: Add to core/index.ts**

In `packages/fluid/src/core/index.ts`, add to the driver export line:

```typescript
export { AnimationDriver, driver, startSpring, _hasActiveAnimations } from './driver'
```

- [ ] **Step 3: Run unit tests to confirm no regressions**

Run: `pnpm test:unit`
Expected: 423 tests pass, 0 failures.

- [ ] **Step 4: Commit**

```bash
git add packages/fluid/src/core/driver.ts packages/fluid/src/core/index.ts
git commit -m "feat(core): export _hasActiveAnimations helper for test utils"
```

---

## Task 8: FluidSpringUtils (P0-T8-01)

**Files:**
- Create: `packages/fluid/src/testing/spring.ts`
- Create: `packages/fluid/src/testing/spring.test.ts`

These tests run in Node.js via Vitest (no browser needed).

- [ ] **Step 1: Write the failing tests first**

Create `packages/fluid/src/testing/spring.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { FluidSpringUtils } from './spring'

describe('FluidSpringUtils.simulate', () => {
  it('snappy preset: finalValue converges to target', () => {
    const result = FluidSpringUtils.simulate('snappy', { from: 0, to: 1, durationMs: 300 })
    expect(result.finalValue).toBeCloseTo(1.0, 2)
  })

  it('snappy preset: didOvershoot is true (underdamped)', () => {
    const result = FluidSpringUtils.simulate('snappy', { from: 0, to: 1, durationMs: 300 })
    expect(result.didOvershoot).toBe(true)
  })

  it('smooth preset: settleTimeMs is less than 400ms', () => {
    const result = FluidSpringUtils.simulate('smooth', { from: 0, to: 1, durationMs: 500 })
    expect(result.settleTimeMs).toBeLessThan(400)
    expect(result.finalValue).toBeCloseTo(1.0, 2)
  })

  it('precise preset: does not overshoot (near-critically damped)', () => {
    const result = FluidSpringUtils.simulate('precise', { from: 0, to: 1, durationMs: 500 })
    expect(result.didOvershoot).toBe(false)
  })

  it('returns finite values for all fields', () => {
    const result = FluidSpringUtils.simulate('snappy', { from: 0, to: 1, durationMs: 300 })
    expect(isFinite(result.finalValue)).toBe(true)
    expect(isFinite(result.settleTimeMs)).toBe(true)
  })

  it('works with negative from/to range', () => {
    const result = FluidSpringUtils.simulate('gentle', { from: 100, to: -50, durationMs: 1000 })
    expect(result.finalValue).toBeCloseTo(-50, 1)
  })

  it('property-based: any valid SpringConfig produces finite finalValue that converges', () => {
    fc.assert(
      fc.property(
        fc.record({
          mass:      fc.float({ min: 0.1, max: 10, noNaN: true }),
          stiffness: fc.float({ min: 10,  max: 1000, noNaN: true }),
          damping:   fc.float({ min: 1,   max: 100, noNaN: true }),
        }),
        fc.float({ min: -1000, max: 1000, noNaN: true }),
        fc.float({ min: -1000, max: 1000, noNaN: true }),
        (config, from, to) => {
          const result = FluidSpringUtils.simulate(config, { from, to, durationMs: 2000 })
          expect(isFinite(result.finalValue)).toBe(true)
          expect(isFinite(result.settleTimeMs)).toBe(true)
          // Must converge within 2 seconds
          expect(Math.abs(result.finalValue - to)).toBeLessThan(Math.abs(to - from) * 0.01 + 0.1)
        }
      ),
      { numRuns: 200 }
    )
  })
})
```

- [ ] **Step 2: Run the tests to confirm they FAIL**

Run: `pnpm --filter @neutro/fluid test:unit -- --run src/testing/spring.test.ts`

Expected: FAIL with "Cannot find module './spring'" or similar.

- [ ] **Step 3: Implement FluidSpringUtils**

Create `packages/fluid/src/testing/spring.ts`:

```typescript
import { stepSpring, SPRING_PRESETS } from '../core/spring'
import type { SpringConfig } from '../core/spring'

type SpringPresetName = keyof typeof SPRING_PRESETS

export interface SpringSimulateResult {
  /** Value at the end of the simulation period. */
  finalValue: number
  /** True if the value ever exceeded the target (underdamped overshoot). */
  didOvershoot: boolean
  /** Time in milliseconds at which the spring first settled within 0.1% of range. */
  settleTimeMs: number
}

export interface SpringSimulateOptions {
  from: number
  to: number
  durationMs: number
}

const SETTLE_THRESHOLD_RATIO = 0.001
const FRAME_DT = 1 / 60  // 60fps

export const FluidSpringUtils = {
  /**
   * Runs the spring solver synchronously at 60fps for durationMs.
   * Accepts a named preset or a raw SpringConfig.
   */
  simulate(
    preset: SpringPresetName | SpringConfig,
    { from, to, durationMs }: SpringSimulateOptions,
  ): SpringSimulateResult {
    const config: SpringConfig = typeof preset === 'string'
      ? SPRING_PRESETS[preset]
      : preset

    const range = Math.abs(to - from) || 1
    const threshold = range * SETTLE_THRESHOLD_RATIO

    let state = { value: from, velocity: 0 }
    let didOvershoot = false
    let settleTimeMs = durationMs  // default: not settled within duration

    const totalFrames = Math.ceil(durationMs / (FRAME_DT * 1000))

    for (let i = 0; i < totalFrames; i++) {
      state = stepSpring(config, state, to, FRAME_DT)

      // Check overshoot: value crossed the target
      if (to > from && state.value > to) didOvershoot = true
      if (to < from && state.value < to) didOvershoot = true

      // Check settle: within threshold of target with near-zero velocity
      const settled =
        Math.abs(state.value - to) < threshold &&
        Math.abs(state.velocity) < threshold * 2

      if (settled && settleTimeMs === durationMs) {
        settleTimeMs = (i + 1) * FRAME_DT * 1000
      }
    }

    return {
      finalValue: state.value,
      didOvershoot,
      settleTimeMs,
    }
  },
}
```

- [ ] **Step 4: Run the tests to confirm they PASS**

Run: `pnpm --filter @neutro/fluid test:unit -- --run src/testing/spring.test.ts`

Expected: all 7 tests pass.

- [ ] **Step 5: Run the full unit test suite for regressions**

Run: `pnpm test:unit`
Expected: 423 + 7 = 430 tests pass, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add packages/fluid/src/testing/spring.ts packages/fluid/src/testing/spring.test.ts
git commit -m "feat(testing): implement FluidSpringUtils.simulate with property-based tests (P0-T8-01)"
```

---

## Task 9: FluidTestUtils and FluidAccessibilityUtils (P0-T8-02 + P0-T8-03)

**Files:**
- Create: `packages/fluid/src/testing/utils.ts`
- Create: `packages/fluid/src/testing/accessibility.ts`
- Create: `packages/fluid/src/testing/index.ts`

These run in `@web/test-runner` context (real browser). There are no .spec.ts files to write yet — the acceptance criteria say "works in @web/test-runner context", which is validated by the test runner being able to import and use these utilities.

We write the implementations now. Component tests (*.spec.ts) written later in component sessions will import and exercise these.

- [ ] **Step 1: Create FluidTestUtils**

Create `packages/fluid/src/testing/utils.ts`:

```typescript
import { _hasActiveAnimations } from '../core/driver'
import type { FluidTier } from '../core/ledger'

const TIER_KEY = Symbol.for('neutro.fluid.ledger')

export const FluidTestUtils = {
  /**
   * Inserts HTML into the document and returns the first element after
   * the fluid:mounted lifecycle event fires on it.
   */
  async mount(htmlString: string): Promise<HTMLElement> {
    const container = document.createElement('div')
    container.innerHTML = htmlString
    document.body.appendChild(container)

    const el = container.firstElementChild as HTMLElement
    if (!el) throw new Error('FluidTestUtils.mount: no element found in html string')

    // If fluid:mounted hasn't fired yet, wait for it
    return new Promise<HTMLElement>((resolve) => {
      const onMounted = () => {
        el.removeEventListener('fluid:mounted', onMounted)
        resolve(el)
      }
      el.addEventListener('fluid:mounted', onMounted)

      // If element is already defined (non-fluid element or already mounted), resolve immediately
      if (!el.tagName.includes('-') || el.shadowRoot !== null) {
        el.removeEventListener('fluid:mounted', onMounted)
        resolve(el)
      }
    })
  },

  /**
   * Resolves when all active spring animations on the element have settled.
   * Polls at 60fps intervals up to a 5-second timeout.
   */
  waitForSpringSettle(el: Element, timeoutMs = 5000): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const start = performance.now()

      function poll() {
        if (!_hasActiveAnimations(el)) {
          resolve()
          return
        }
        if (performance.now() - start > timeoutMs) {
          reject(new Error('FluidTestUtils.waitForSpringSettle: timed out after ' + timeoutMs + 'ms'))
          return
        }
        requestAnimationFrame(poll)
      }

      poll()
    })
  },

  /**
   * Forces the fluid capability ledger to a specific tier.
   * Affects all components mounted after this call.
   */
  mockTier(tier: FluidTier): void {
    window.__FLUID_FORCE_TIER__ = tier
    // Reinitialise ledger for subsequent mounts
    const ledgerSingleton = (globalThis as Record<symbol, unknown>)[TIER_KEY] as { tier: FluidTier } | undefined
    if (ledgerSingleton) {
      ledgerSingleton.tier = tier
    }
  },

  /**
   * Removes the tier override and restores the browser-detected tier.
   */
  restoreTier(): void {
    delete window.__FLUID_FORCE_TIER__
    const ledgerSingleton = (globalThis as Record<symbol, unknown>)[TIER_KEY] as { _originalTier?: FluidTier; tier: FluidTier } | undefined
    if (ledgerSingleton?._originalTier) {
      ledgerSingleton.tier = ledgerSingleton._originalTier
    }
  },
}
```

- [ ] **Step 2: Create FluidAccessibilityUtils**

Create `packages/fluid/src/testing/accessibility.ts`:

```typescript
// Runs in @web/test-runner browser context.
// axe-core must be available in the browser (imported directly or via a script).
import type { AxeResults, Result } from 'axe-core'

declare global {
  interface Window {
    axe?: {
      run(el: Element | Document, options?: unknown): Promise<AxeResults>
    }
  }
}

function formatViolations(violations: Result[]): string {
  return violations.map(v =>
    `[${v.impact ?? 'unknown'}] ${v.id}: ${v.description}\n` +
    v.nodes.map(n => `  - ${n.html}`).join('\n')
  ).join('\n\n')
}

async function runAxe(el: Element): Promise<Result[]> {
  // Dynamic import so axe-core is only loaded in browser context
  const axe = await import('axe-core')
  const results = await axe.default.run(el)
  return results.violations
}

export const FluidAccessibilityUtils = {
  /**
   * Runs axe-core on the element and throws with violation details if any are found.
   * Must be called in @web/test-runner (real browser) context.
   */
  async assertAccessible(el: Element): Promise<void> {
    const violations = await runAxe(el)
    if (violations.length > 0) {
      throw new Error(
        `FluidAccessibilityUtils.assertAccessible: ${violations.length} axe violation(s) found:\n\n` +
        formatViolations(violations)
      )
    }
  },

  /**
   * Applies setup(), runs axe on the element, then throws if violations are found.
   * The label is included in error output for context (e.g. 'hover state', 'disabled state').
   */
  async assertAccessibleInState(
    el: Element,
    label: string,
    setup: () => void | Promise<void>,
  ): Promise<void> {
    await setup()
    const violations = await runAxe(el)
    if (violations.length > 0) {
      throw new Error(
        `FluidAccessibilityUtils.assertAccessibleInState [${label}]: ${violations.length} violation(s):\n\n` +
        formatViolations(violations)
      )
    }
  },
}
```

- [ ] **Step 3: Create testing/index.ts barrel**

Create `packages/fluid/src/testing/index.ts`:

```typescript
export { FluidSpringUtils } from './spring'
export type { SpringSimulateResult, SpringSimulateOptions } from './spring'
export { FluidTestUtils } from './utils'
export { FluidAccessibilityUtils } from './accessibility'
```

- [ ] **Step 4: Uncomment the testing/index entry in tsup.config.ts**

In `packages/fluid/tsup.config.ts`, uncomment all three `'testing/index'` lines:

```typescript
'testing/index': 'src/testing/index.ts',
```

- [ ] **Step 5: Run pnpm test:unit to confirm spring tests still pass**

Run: `pnpm test:unit`
Expected: 430 tests pass (unchanged from Task 8 Step 5).

- [ ] **Step 6: Rebuild to include testing in dist**

Run: `pnpm --filter @neutro/fluid build`
Expected: `dist/esm/testing/index.js` now present.

- [ ] **Step 7: Verify pnpm test:component runs without error**

Run: `pnpm test:component`
Expected: exits 0 (no spec files found yet, but no config errors).

- [ ] **Step 8: Commit**

```bash
git add packages/fluid/src/testing/ packages/fluid/tsup.config.ts
git commit -m "feat(testing): implement FluidTestUtils and FluidAccessibilityUtils (P0-T8-02, P0-T8-03)"
```

---

## Task 10: Final Verification

- [ ] **Step 1: Run the full unit test suite**

Run: `pnpm test:unit`
Expected: All tests pass, 0 failures.

- [ ] **Step 2: Run full build**

Run: `pnpm --filter @neutro/fluid build`
Expected: exits 0, dist/ has ESM, CJS, and types for core, testing, eslint-plugin, and index.

- [ ] **Step 3: Verify test:component runs**

Run: `pnpm test:component`
Expected: exits 0 (0 spec files, no errors).

- [ ] **Step 4: Verify Storybook starts**

Run: `pnpm --filter storybook dev` (then Ctrl+C after confirming it starts)
Expected: No errors, tier and color-scheme toolbars visible.

- [ ] **Step 5: Type-check packages/fluid**

Run: `pnpm --filter @neutro/fluid typecheck`
Expected: exits 0 with no TypeScript errors.

- [ ] **Step 6: Verify dist structure matches size-limit config**

Run: `ls packages/fluid/dist/esm/core/index.js`
Expected: file exists.

---

## Self-Review: Spec Coverage Check

| Spec requirement | Covered in |
|---|---|
| tsup ESM output `dist/esm/` | Task 2 |
| tsup CJS output `dist/cjs/` | Task 2 |
| TypeScript declarations `dist/types/` | Task 2 |
| Houdini worklets → `dist/worklets/` | Task 2 (copies if src/worklets/ exists) |
| Each subpath export resolves to built file | Task 2 (conditional exports for core, testing, eslint-plugin) |
| `size-limit` config present | Task 2 (already in package.json, verified) |
| `pnpm --filter @neutro/fluid build` succeeds | Task 2 |
| vitest.config.ts at repo root | Task 3 |
| `pnpm test:unit` runs without error | Tasks 3 + 10 |
| web-test-runner Playwright Chromium | Task 4 |
| Finds `*.spec.ts` in components/ | Task 4 |
| `pnpm test:component` runs without error | Task 4 + 10 |
| playwright.config.ts integration tests | Task 5 |
| Test server configured | Task 5 |
| Multi-browser (chromium/firefox/webkit) | Task 5 |
| Storybook at apps/storybook/ | Task 6 |
| `fluidTier` global → `window.__FLUID_FORCE_TIER__` | Task 6 |
| Light/dark mode parameter | Task 6 |
| One placeholder story renders | Task 6 |
| `pnpm --filter storybook dev` starts | Task 6 |
| `FluidSpringUtils.simulate` with correct results | Task 8 |
| property-based fast-check test | Task 8 |
| `FluidTestUtils.mount` waits for fluid:mounted | Task 9 |
| `FluidTestUtils.waitForSpringSettle` polls activeAnimations | Task 9 |
| `FluidTestUtils.mockTier` / `restoreTier` | Task 9 |
| `FluidAccessibilityUtils.assertAccessible` runs axe | Task 9 |
| `FluidAccessibilityUtils.assertAccessibleInState` with label | Task 9 |
| axe-core as dev dependency | Task 1 |
