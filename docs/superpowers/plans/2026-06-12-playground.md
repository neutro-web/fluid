# Playground Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `apps/playground/` — a Vite-powered, zero-runtime-dependency static app for inspecting `@neutro/fluid` components live in a browser.

**Architecture:** Hash router (`router.js`) loads HTML fragments into `#content`. A persistent shell (`index.html`) holds the sidebar nav and toolbar. `main.js` is the single entry point — it loads Fluid tokens and wires toolbar controls via `toolbar.js`, which receives `navigateCurrent` from `router.js` as an explicit parameter (no globals).

**Tech Stack:** Vanilla HTML/CSS/JS, Vite 5 (dev tooling only, zero runtime), `@neutro/fluid` subpath alias resolving to `packages/fluid/src/`.

---

## File Map

| File | Responsibility |
|---|---|
| `apps/playground/package.json` | Workspace package config, `dev`/`build` scripts |
| `apps/playground/vite.config.ts` | Vite config: root, base, `@neutro/fluid` alias |
| `apps/playground/index.html` | Persistent shell: sidebar, toolbar, `#content` mount |
| `apps/playground/styles.css` | Playground chrome layout and component-demo classes |
| `apps/playground/main.js` | Entry point: imports tokens, wires toolbar |
| `apps/playground/router.js` | Hash router, fragment fetcher, script re-executor |
| `apps/playground/toolbar.js` | Tier / mode / motion controls |
| `apps/playground/pages/index.html` | Welcome fragment (only page that ships now) |

---

### Task 1: Scaffold the package

**Files:**
- Create: `apps/playground/package.json`
- Create: `apps/playground/vite.config.ts`

- [ ] **Step 1: Create `apps/playground/package.json`**

```json
{
  "name": "@neutro/playground",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}
```

- [ ] **Step 2: Create `apps/playground/vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  root: '.',
  base: './',
  resolve: {
    alias: [
      {
        find: /^@neutro\/fluid\/(.+)$/,
        replacement: path.resolve(__dirname, '../../packages/fluid/src/$1')
      }
    ]
  }
})
```

The regex alias maps every `@neutro/fluid/X` import to `packages/fluid/src/X`. So:
- `@neutro/fluid/theme/default` → `packages/fluid/src/tokens/themes/default.css`
- `@neutro/fluid/button` → `packages/fluid/src/button/index.ts` (once it exists)

- [ ] **Step 3: Install dependencies**

Run from the repo root:
```bash
pnpm install
```

Expected: pnpm resolves workspace, installs Vite under `apps/playground/node_modules`.

- [ ] **Step 4: Verify Vite resolves**

```bash
pnpm --filter playground exec vite --version
```

Expected output: `vite/5.x.x`

- [ ] **Step 5: Commit**

```bash
git add apps/playground/package.json apps/playground/vite.config.ts
git commit -m "feat(playground): scaffold package and vite config"
```

---

### Task 2: Shell HTML

**Files:**
- Create: `apps/playground/index.html`

- [ ] **Step 1: Create `apps/playground/index.html`**

```html
<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Fluid Playground</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <aside id="sidebar">
    <nav id="sidebar-nav" aria-label="Components">
      <a href="#index" data-page="index" class="nav-home">Fluid Playground</a>

      <section class="nav-group">
        <p class="nav-group-label" role="presentation">Actions</p>
        <!-- <a href="#button" data-page="button">Button</a> -->
        <!-- <a href="#icon-button" data-page="icon-button">Icon Button</a> -->
      </section>

      <section class="nav-group">
        <p class="nav-group-label" role="presentation">Surface</p>
        <!-- <a href="#card" data-page="card">Card</a> -->
      </section>

      <section class="nav-group">
        <p class="nav-group-label" role="presentation">Layout</p>
        <!-- <a href="#stack" data-page="stack">Stack</a> -->
        <!-- <a href="#fieldset" data-page="fieldset">Fieldset</a> -->
      </section>

      <section class="nav-group">
        <p class="nav-group-label" role="presentation">Feedback</p>
        <!-- <a href="#skeleton" data-page="skeleton">Skeleton</a> -->
        <!-- <a href="#spinner" data-page="spinner">Spinner</a> -->
        <!-- <a href="#progress" data-page="progress">Progress</a> -->
      </section>
    </nav>
  </aside>

  <div id="shell-main">
    <header id="toolbar" aria-label="Playground controls">
      <fieldset>
        <legend>Tier</legend>
        <label><input type="radio" name="tier" value="matte"> Matte</label>
        <label><input type="radio" name="tier" value="frosted" checked> Frosted</label>
        <label><input type="radio" name="tier" value="crystalline"> Crystalline</label>
        <label><input type="radio" name="tier" value="optical"> Optical</label>
      </fieldset>
      <fieldset>
        <legend>Mode</legend>
        <label><input type="radio" name="theme" value="light" checked> Light</label>
        <label><input type="radio" name="theme" value="dark"> Dark</label>
      </fieldset>
      <fieldset>
        <legend>Motion</legend>
        <label><input type="radio" name="motion" value="full" checked> Full</label>
        <label><input type="radio" name="motion" value="reduced"> Reduced</label>
      </fieldset>
    </header>

    <main id="content" tabindex="-1">
      <!-- router.js swaps page fragments here -->
    </main>
  </div>

  <script type="module" src="/main.js"></script>
</body>
</html>
```

`main.js` is the only script tag. `router.js` loads as part of `main.js`'s module graph via `import { navigateCurrent } from './router.js'`.

- [ ] **Step 2: Commit**

```bash
git add apps/playground/index.html
git commit -m "feat(playground): add shell HTML with sidebar and toolbar"
```

---

### Task 3: Playground styles

**Files:**
- Create: `apps/playground/styles.css`

- [ ] **Step 1: Create `apps/playground/styles.css`**

No `--fluid-*` tokens. Playground chrome only.

```css
*, *::before, *::after {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  height: 100%;
}

body {
  display: grid;
  grid-template-columns: 240px 1fr;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  font-size: 14px;
  background: #f5f5f5;
  color: #1a1a1a;
}

/* ── Sidebar ── */
#sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  background: #1a1a1a;
  color: #e8e8e8;
  border-right: 1px solid #2a2a2a;
}

#sidebar-nav {
  display: flex;
  flex-direction: column;
}

.nav-home {
  display: block;
  padding: 16px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #ffffff;
  text-decoration: none;
  border-bottom: 1px solid #2a2a2a;
}

.nav-home:hover {
  background: #2a2a2a;
}

.nav-home.active {
  background: #2a2a2a;
  border-left: 2px solid #4a9eff;
}

.nav-group {
  border-bottom: 1px solid #2a2a2a;
  padding: 8px 0;
}

.nav-group-label {
  margin: 0;
  padding: 6px 16px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #555;
}

#sidebar-nav a[data-page] {
  display: block;
  padding: 6px 16px;
  color: #aaa;
  text-decoration: none;
  font-size: 13px;
  border-left: 2px solid transparent;
}

#sidebar-nav a[data-page]:hover {
  color: #fff;
  background: #2a2a2a;
}

#sidebar-nav a[data-page].active {
  color: #fff;
  background: #2a2a2a;
  border-left-color: #4a9eff;
  font-weight: 500;
}

/* ── Shell main ── */
#shell-main {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* ── Toolbar ── */
#toolbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 10px 20px;
  background: #ffffff;
  border-bottom: 1px solid #e0e0e0;
  align-items: center;
}

#toolbar fieldset {
  border: none;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

#toolbar legend {
  float: left;
  padding: 0;
  margin-right: 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #666;
  line-height: 1.6;
}

#toolbar label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #333;
  cursor: pointer;
}

#toolbar input[type="radio"] {
  cursor: pointer;
}

/* ── Content area ── */
#content {
  flex: 1;
  padding: 32px;
  outline: none;
}

/* ── Page layout ── */
.pg-page {
  max-width: 860px;
}

.pg-page-header {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e0e0e0;
}

.pg-page-title {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 700;
  color: #111;
}

.pg-page-desc {
  margin: 0;
  font-size: 15px;
  color: #555;
  line-height: 1.5;
}

.pg-section {
  margin-bottom: 40px;
}

.pg-section h2 {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  padding-bottom: 8px;
  border-bottom: 1px solid #e8e8e8;
}

.pg-demo {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-start;
  padding: 24px;
  background: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 12px;
}

.pg-code {
  margin: 0;
  padding: 16px;
  background: #f0f0f0;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 12px;
  line-height: 1.6;
  overflow-x: auto;
  color: #333;
}

.pg-error {
  padding: 16px;
  background: #fff0f0;
  border: 1px solid #ffc0c0;
  border-radius: 6px;
  color: #c00;
  font-size: 14px;
}

/* ── Reduced motion simulation ── */
.reduced-motion *,
.reduced-motion *::before,
.reduced-motion *::after {
  animation-duration: 0.01ms !important;
  transition-duration: 0.01ms !important;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/playground/styles.css
git commit -m "feat(playground): add chrome styles"
```

---

### Task 4: Router

**Files:**
- Create: `apps/playground/router.js`

- [ ] **Step 1: Create `apps/playground/router.js`**

```js
let currentPage = 'index'

export function navigateCurrent() {
  navigate(currentPage)
}

async function reExecuteScripts(container) {
  for (const old of container.querySelectorAll('script')) {
    const fresh = document.createElement('script')
    if (old.src) fresh.src = old.src
    else fresh.textContent = old.textContent
    fresh.type = old.type || 'module'
    old.replaceWith(fresh)
    // Only await external module scripts — inline modules never fire 'load'
    if (fresh.type === 'module' && fresh.src) {
      await new Promise(resolve => {
        fresh.addEventListener('load', resolve, { once: true })
        fresh.addEventListener('error', resolve, { once: true })
      })
    }
  }
}

export async function navigate(page) {
  currentPage = page
  const content = document.getElementById('content')

  const res = await fetch(`/pages/${page}.html`)
  if (!res.ok) {
    content.innerHTML = `<p class="pg-error">Page not found: ${page}</p>`
    return
  }

  content.innerHTML = await res.text()
  await reExecuteScripts(content)

  document.querySelectorAll('#sidebar-nav a').forEach(a =>
    a.classList.toggle('active', a.dataset.page === page)
  )

  document.getElementById('content').focus()
  history.replaceState(null, '', `#${page}`)
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('sidebar-nav').addEventListener('click', e => {
    const link = e.target.closest('a[data-page]')
    if (!link) return
    e.preventDefault()
    navigate(link.dataset.page)
  })

  window.addEventListener('hashchange', () => {
    navigate(location.hash.slice(1) || 'index')
  })

  navigate(location.hash.slice(1) || 'index')
})
```

- [ ] **Step 2: Commit**

```bash
git add apps/playground/router.js
git commit -m "feat(playground): add hash router with fragment loading"
```

---

### Task 5: Toolbar

**Files:**
- Create: `apps/playground/toolbar.js`

- [ ] **Step 1: Create `apps/playground/toolbar.js`**

```js
export function initToolbar(navigateCurrent) {
  // Tier — re-navigate so mounted components re-read the ledger
  document.querySelectorAll('[name="tier"]').forEach(input => {
    input.addEventListener('change', () => {
      window.__FLUID_FORCE_TIER__ = input.value
      navigateCurrent()
    })
  })

  // Mode — data-theme on <html> is enough; CSS tokens respond immediately
  document.querySelectorAll('[name="theme"]').forEach(input => {
    input.addEventListener('change', () => {
      document.documentElement.dataset.theme = input.value
    })
  })

  // Motion — re-navigate so mounted components re-read the ledger
  document.querySelectorAll('[name="motion"]').forEach(input => {
    input.addEventListener('change', () => {
      const reduced = input.value === 'reduced'
      document.documentElement.classList.toggle('reduced-motion', reduced)
      window.__FLUID_FORCE_REDUCED_MOTION__ = reduced
      navigateCurrent()
    })
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/playground/toolbar.js
git commit -m "feat(playground): add toolbar controls"
```

---

### Task 6: Main entry point

**Files:**
- Create: `apps/playground/main.js`

- [ ] **Step 1: Create `apps/playground/main.js`**

```js
import '@neutro/fluid/theme/default'
import { initToolbar } from './toolbar.js'
import { navigateCurrent } from './router.js'

initToolbar(navigateCurrent)
```

`initToolbar` runs at module evaluation time — this is fine because it only adds
event listeners to toolbar radio inputs that are already in the static HTML.
The actual `navigate()` call happens inside `router.js`'s `DOMContentLoaded`
listener, which fires after all module scripts have evaluated.

- [ ] **Step 2: Commit**

```bash
git add apps/playground/main.js
git commit -m "feat(playground): add main entry point"
```

---

### Task 7: Welcome page

**Files:**
- Create: `apps/playground/pages/index.html`

- [ ] **Step 1: Create `apps/playground/pages/` directory and welcome fragment**

```html
<article class="pg-page">
  <header class="pg-page-header">
    <h1 class="pg-page-title">Fluid Playground</h1>
    <p class="pg-page-desc">
      A live inspection environment for @neutro/fluid — a physics-grounded glass
      material system implemented as Custom Elements.
    </p>
  </header>

  <section class="pg-section">
    <h2>How to use</h2>
    <p>Select a component from the sidebar. Use the toolbar to inspect how
    components behave across rendering tiers, colour schemes, and motion preferences.</p>
    <dl>
      <dt>Tier</dt>
      <dd>
        Matte — opaque surface, CSS transition approximations, no backdrop-filter.<br>
        Frosted — backdrop-filter blur and vibrancy, CSS spring approximations.<br>
        Crystalline — true spring physics via WAAPI, environment-aware tinting,
        scroll-driven parallax.<br>
        Optical — Houdini refraction, compositor-thread springs (Chrome only).
      </dd>
      <dt>Mode</dt>
      <dd>Light / Dark. Sets <code>data-theme</code> on <code>&lt;html&gt;</code>.
      All Fluid tokens respond automatically.</dd>
      <dt>Motion</dt>
      <dd>Full / Reduced. Simulates <code>prefers-reduced-motion: reduce</code>
      via <code>window.__FLUID_FORCE_REDUCED_MOTION__</code>. Springs substitute
      opacity-only transitions at reduced.</dd>
    </dl>
  </section>

  <section class="pg-section">
    <h2>Adding a component page</h2>
    <ol>
      <li>Create <code>apps/playground/pages/[name].html</code></li>
      <li>Uncomment the nav entry in <code>apps/playground/index.html</code></li>
      <li>Add the Storybook story at
        <code>apps/storybook/stories/[name].stories.ts</code></li>
      <li>Both the playground page and the story are required for a
        component to be considered done</li>
    </ol>
  </section>
</article>
```

- [ ] **Step 2: Commit**

```bash
git add apps/playground/pages/index.html
git commit -m "feat(playground): add welcome page fragment"
```

---

### Task 8: Smoke test

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

```bash
pnpm --filter playground dev
```

Expected: Vite starts, prints a local URL like `http://localhost:5173`. No errors in the terminal.

- [ ] **Step 2: Open in browser and check initial load**

Navigate to `http://localhost:5173`. Verify:
- Sidebar renders with "Fluid Playground" heading and four nav groups (Actions, Surface, Layout, Feedback)
- Toolbar renders with Tier / Mode / Motion radio fieldsets
- Welcome page content loads in the main area
- URL shows `#index` in the address bar

- [ ] **Step 3: Verify hash routing**

Manually edit the URL to `http://localhost:5173/#index` and press Enter.
Expected: page does not full-reload; content area shows the welcome page.

Navigate to `http://localhost:5173/#nonexistent`.
Expected: content area shows the `.pg-error` message "Page not found: nonexistent".

- [ ] **Step 4: Verify sidebar keyboard navigation**

Tab to the "Fluid Playground" sidebar link. Press Enter.
Expected: focus moves to `#content`, URL stays `#index`.

- [ ] **Step 5: Verify Mode toggle**

Click Dark in the toolbar.
Expected: `data-theme="dark"` appears on `<html>` in DevTools. No page reload. Click Light — it reverts.

- [ ] **Step 6: Verify Tier toggle sets the global**

Open DevTools console. Click Crystalline in the Tier fieldset.
Expected: `window.__FLUID_FORCE_TIER__` is `"crystalline"`. Content area reloaded (welcome page re-fetched and re-rendered).

- [ ] **Step 7: Verify Motion toggle**

Click Reduced in Motion.
Expected: `document.documentElement.classList` contains `"reduced-motion"`. `window.__FLUID_FORCE_REDUCED_MOTION__` is `true`. Content reloaded.

- [ ] **Step 8: Verify token import resolves**

In DevTools → Network tab, filter for `default.css`. Confirm a request to the token file completed with 200.

- [ ] **Step 9: Final commit**

```bash
git add .
git commit -m "feat(playground): complete initial scaffold — all smoke tests pass"
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| `apps/playground/` file structure | Tasks 1–7 |
| `pnpm --filter playground dev` | Task 1 (package.json `dev` script) |
| Vite config with regex alias | Task 1 |
| `base: './'` for deploy safety | Task 1 |
| Shell: sidebar, toolbar, `#content` | Task 2 |
| `main.js` only script tag | Task 2 |
| Playground chrome styles | Task 3 |
| `.pg-page`, `.pg-demo`, `.pg-code`, `.pg-error` | Task 3 |
| Reduced motion CSS | Task 3 |
| Hash router + fragment loading | Task 4 |
| `reExecuteScripts` (inline-safe) | Task 4 |
| `DOMContentLoaded` guard | Task 4 |
| `navigate` + `navigateCurrent` exports | Task 4 |
| Tier / Mode / Motion toolbar wiring | Task 5 |
| Re-navigate on tier + motion, not mode | Task 5 |
| `__FLUID_FORCE_TIER__` + `__FLUID_FORCE_REDUCED_MOTION__` | Task 5 |
| Token import via `@neutro/fluid/theme/default` | Task 6 |
| Explicit `initToolbar(navigateCurrent)` wiring | Task 6 |
| Welcome page with accurate tier descriptions | Task 7 |
| "Both playground + Storybook story required" note | Task 7 |
| Smoke-test all acceptance criteria | Task 8 |

**Placeholder scan:** No TBD, TODO, or vague steps. Every step has actual file content or a specific terminal command with expected output.

**Type consistency:** `navigate(page)` and `navigateCurrent()` are defined in Task 4 and consumed in Tasks 5 and 6 under the same names. `initToolbar(navigateCurrent)` is defined in Task 5 and called in Task 6. No mismatches.
