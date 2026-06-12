# Fluid Playground — Design Spec
**Date:** 2026-06-12
**Status:** Approved

---

## What We're Building

`apps/playground/` — a Vite-powered, zero-runtime-dependency static app for
inspecting `@neutro/fluid` components live in a browser. Vanilla HTML pages,
no framework. Vite is a dev tool only; it has no presence at runtime.

The playground is a dogfooding environment: every component import uses the
same `@neutro/fluid/button` path a real consumer would use. It starts with
one page (the welcome page) and grows as components ship.

---

## File Structure

```
apps/playground/
├── package.json          — name: @neutro/playground, scripts: dev, build
├── vite.config.ts        — root ".", base "./", regex alias for @neutro/fluid
├── index.html            — persistent shell: sidebar + toolbar + #content
├── styles.css            — playground chrome only (no Fluid tokens)
├── main.js               — imports tokens + toolbar, wires navigateCurrent
├── router.js             — hash router, fragment loader, script re-executor
├── toolbar.js            — tier / mode / motion controls
└── pages/
    └── index.html        — welcome fragment (only page that ships initially)
```

---

## Package Setup

**`apps/playground/package.json`**
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

Run with: `pnpm --filter playground dev`

**`apps/playground/vite.config.ts`**
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

The regex alias maps:
- `@neutro/fluid/button` → `packages/fluid/src/button/index.ts`
- `@neutro/fluid/theme/default` → `packages/fluid/src/tokens/themes/default.css`

No `<link>` hrefs for tokens — all token loading goes through JS imports so
the alias resolves correctly.

---

## Module Architecture

Three JS files with explicit wiring — no globals.

```
index.html
  └── <script type="module" src="/main.js">
        ├── import '@neutro/fluid/theme/default'   (loads all --fluid-* tokens)
        ├── import { initToolbar } from './toolbar.js'
        ├── import { navigateCurrent } from './router.js'
        └── initToolbar(navigateCurrent)

  └── <script type="module" src="/router.js">
        exports: navigate(page), navigateCurrent()
```

`toolbar.js` receives `navigateCurrent` as a parameter. No implicit globals.

---

## Shell (`index.html`)

Persistent frame — never reloads.

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
  <script type="module" src="/router.js"></script>
</body>
</html>
```

---

## Router (`router.js`)

```js
// router.js
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
    if (fresh.type === 'module') {
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
  // Delegated sidebar clicks
  document.getElementById('sidebar-nav').addEventListener('click', e => {
    const link = e.target.closest('a[data-page]')
    if (!link) return
    e.preventDefault()
    navigate(link.dataset.page)
  })

  // Hash-based routing
  window.addEventListener('hashchange', () => {
    navigate(location.hash.slice(1) || 'index')
  })

  // Initial load
  navigate(location.hash.slice(1) || 'index')
})
```

---

## Toolbar (`toolbar.js`)

```js
// toolbar.js
export function initToolbar(navigateCurrent) {
  // Tier — re-navigate so components re-read the ledger
  document.querySelectorAll('[name="tier"]').forEach(input => {
    input.addEventListener('change', () => {
      window.__FLUID_FORCE_TIER__ = input.value
      navigateCurrent()
    })
  })

  // Mode — CSS tokens respond immediately, no re-navigate needed
  document.querySelectorAll('[name="theme"]').forEach(input => {
    input.addEventListener('change', () => {
      document.documentElement.dataset.theme = input.value
    })
  })

  // Motion — re-navigate so components re-read the ledger
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

---

## Token Loading (`main.js`)

```js
// main.js
import '@neutro/fluid/theme/default'
import { initToolbar } from './toolbar.js'
import { navigateCurrent } from './router.js'

initToolbar(navigateCurrent)
```

---

## `styles.css` Scope

Playground chrome only. Zero `--fluid-*` tokens used here.

**Layout:** `body` is a CSS grid — `grid-template-columns: 240px 1fr`, sidebar in
the first column spanning full height, `#shell-main` in the second (toolbar sticky
at top, `#content` scrolls below it).

**Sidebar:** `position: sticky; top: 0; height: 100vh; overflow-y: auto`.
Active nav link gets a left-border accent and slightly bolder weight.

**Toolbar:** `position: sticky; top: 0; z-index: 10`. Fieldsets laid out as a
flex row. Radio groups inline.

**Content area classes:**
- `.pg-page` — max-width container, readable line length
- `.pg-page-header` — title + description block
- `.pg-section` — demo section with `<h2>`, `.pg-demo`, and `.pg-code`
- `.pg-demo` — flex row, wraps, gap for component spacing
- `.pg-code` — `<pre>` block, monospace, subtle background, no syntax highlighting
- `.pg-error` — error state for failed fragment loads

**Reduced motion simulation:**
```css
.reduced-motion *,
.reduced-motion *::before,
.reduced-motion *::after {
  animation-duration: 0.01ms !important;
  transition-duration: 0.01ms !important;
}
```

The playground chrome itself uses its own neutral colour palette and does not
change appearance when `data-theme` toggles — only Fluid components respond to it.

---

## Component Page Format

Each page is an HTML fragment (no `<html>/<body>` tags). Loaded into `#content`
by the router.

```html
<!-- pages/button.html -->
<article class="pg-page">
  <header class="pg-page-header">
    <h1 class="pg-page-title">Button</h1>
    <p class="pg-page-desc">Primary action trigger with spring physics and glass ripple feedback.</p>
  </header>

  <section class="pg-section">
    <h2>Variants</h2>
    <div class="pg-demo">
      <fluid-button variant="primary">Save draft</fluid-button>
      <fluid-button variant="secondary">Cancel</fluid-button>
      <fluid-button variant="tertiary">Learn more</fluid-button>
      <fluid-button variant="destructive">Delete</fluid-button>
    </div>
    <pre class="pg-code"><code>...</code></pre>
  </section>

  <!-- sections: States, Sizes, Edge cases -->

  <script type="module">
    import '@neutro/fluid/button'
  </script>
</article>
```

Each page imports only the component(s) it needs. The `reExecuteScripts` guard
in `router.js` waits for each module script to resolve before moving focus.

---

## Welcome Page (`pages/index.html`)

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
      <li>Uncomment the nav entry in <code>index.html</code></li>
      <li>Add the Storybook story at
        <code>apps/storybook/stories/[name].stories.ts</code></li>
      <li>Both the playground page and the story are required for a
        component to be considered done</li>
    </ol>
  </section>
</article>
```

---

## Toolbar Effects Summary

| Control | Effect | Re-navigate? |
|---|---|---|
| Tier | `window.__FLUID_FORCE_TIER__ = value` | Yes — components re-read ledger |
| Mode | `document.documentElement.dataset.theme = value` | No — tokens respond via CSS |
| Motion | Class + `window.__FLUID_FORCE_REDUCED_MOTION__` | Yes — components re-read ledger |

---

## Acceptance Criteria

- `pnpm --filter playground dev` starts without errors
- Hash routing: `#button` loads `pages/button.html` without a full page reload
- Tier switcher re-navigates current page; components re-mount with the new tier
- Dark mode toggle changes `data-theme` on `<html>` immediately
- Reduced motion toggle re-navigates current page; Fluid spring substitution applies
- Sidebar navigation is keyboard accessible (native `<a>` elements, focus management)
- All three toolbar fieldsets are keyboard accessible (radio button groups)
- Works in Chrome, Safari, and Firefox without a build step (Vite serves TypeScript)
- Adding a component page requires: one HTML fragment + one uncommented nav entry
- No relative path imports in page fragments — all use `@neutro/fluid/[name]`

---

## What Ships Initially

| File | Status |
|---|---|
| `apps/playground/package.json` | Ships |
| `apps/playground/vite.config.ts` | Ships |
| `apps/playground/index.html` | Ships |
| `apps/playground/styles.css` | Ships |
| `apps/playground/main.js` | Ships |
| `apps/playground/router.js` | Ships |
| `apps/playground/toolbar.js` | Ships |
| `apps/playground/pages/index.html` | Ships |
| `apps/playground/pages/button.html` | Added when `fluid-button` ships |
| `apps/playground/pages/[rest]` | Added when each component ships |
