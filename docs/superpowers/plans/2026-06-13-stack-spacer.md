# fluid-stack + fluid-spacer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `fluid-stack` and `fluid-spacer` as lightweight layout primitive custom elements — no glass, no physics, tier-aware FLIP animation automatic.

**Architecture:** Both extend `HTMLElement` directly (not `FluidElement`). The host element IS the flex container; all layout properties are set via inline styles in `attributeChangedCallback`. Tier-gated FLIP animation in `fluid-stack[layout]` activates automatically by reading `ledger.tier` — no consumer wiring required. Global CSS (`display: flex` / `display: block`) is injected once via a `<style>` tag in `document.head`.

**Tech Stack:** TypeScript, Web Custom Elements, `ledger` from `core/ledger.ts`, `@web/test-runner` with Mocha + Chromium, Storybook Web Components, Lit `html` tagged templates, Vite playground.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `packages/fluid/src/components/stack/styles.ts` | Create | CSS string + style ID for `fluid-stack` global injection |
| `packages/fluid/src/components/stack/index.ts` | Create | `FluidStack` custom element |
| `packages/fluid/src/components/spacer/styles.ts` | Create | CSS string + style ID for `fluid-spacer` global injection |
| `packages/fluid/src/components/spacer/index.ts` | Create | `FluidSpacer` custom element |
| `packages/fluid/src/components/stack/stack.spec.ts` | Create | Browser tests for both elements (computed styles + a11y) |
| `apps/storybook/src/stack.stories.ts` | Create | Storybook stories for `fluid-stack` |
| `apps/storybook/src/spacer.stories.ts` | Create | Storybook stories for `fluid-spacer` |
| `apps/playground/pages/stack.html` | Create | Playground page for `fluid-stack` |
| `apps/playground/pages/spacer.html` | Create | Playground page for `fluid-spacer` |
| `apps/playground/index.html` | Modify | Add nav links under Layout section |

> **Note on `styles.ts` vs `styles.css`:** The project's established pattern is `styles.ts` (a TypeScript module exporting a CSS string). This is what the test runner (`esbuildPlugin({ ts: true })`) can process without additional config. The CSS _content_ is identical to what a `.css` file would contain.

---

## Task 1: fluid-stack styles module

**Files:**
- Create: `packages/fluid/src/components/stack/styles.ts`

- [ ] **Step 1: Create the styles module**

```typescript
// packages/fluid/src/components/stack/styles.ts
export const STACK_STYLE_ID = 'fluid-stack-global-styles'

export const stackStyles = /* css */ `
fluid-stack {
  display: flex;
  box-sizing: border-box;
  container-type: inline-size;
}
`
```

> Layout properties (flex-direction, gap, align-items, justify-content, flex-wrap) are set via inline styles in the element class. Only `display`, `box-sizing`, and `container-type` live here — they cannot be meaningfully set by attribute mapping.

- [ ] **Step 2: Commit**

```bash
cd /Users/kofi/_/fluid/.worktrees/session-18
git add packages/fluid/src/components/stack/styles.ts
git commit -m "feat(stack): add global styles module"
```

---

## Task 2: fluid-spacer styles module

**Files:**
- Create: `packages/fluid/src/components/spacer/styles.ts`

- [ ] **Step 1: Create the styles module**

```typescript
// packages/fluid/src/components/spacer/styles.ts
export const SPACER_STYLE_ID = 'fluid-spacer-global-styles'

export const spacerStyles = /* css */ `
fluid-spacer {
  display: block;
  box-sizing: border-box;
}
`
```

> `flex` is managed entirely by inline styles in the element class so JS can override it per-instance without fighting cascade specificity.

- [ ] **Step 2: Commit**

```bash
git add packages/fluid/src/components/spacer/styles.ts
git commit -m "feat(spacer): add global styles module"
```

---

## Task 3: Write the failing test file

**Files:**
- Create: `packages/fluid/src/components/stack/stack.spec.ts`

- [ ] **Step 1: Create the test file**

```typescript
// packages/fluid/src/components/stack/stack.spec.ts
import { FluidTestUtils } from '../../testing/utils'
import { FluidAccessibilityUtils } from '../../testing/accessibility'

// Registers both elements before any test runs
import './index'
import '../spacer/index'

// ─── fluid-stack ───────────────────────────────────────────────────────────────

describe('fluid-stack', () => {
  afterEach(() => {
    FluidTestUtils.cleanup()
    FluidTestUtils.restoreTier()
  })

  describe('display', () => {
    it('renders as a flex container', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack></fluid-stack>')
      const display = getComputedStyle(el).display
      if (display !== 'flex') throw new Error(`Expected display:flex, got ${display}`)
    })
  })

  describe('direction', () => {
    it('defaults to column (vertical)', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack></fluid-stack>')
      if (el.style.flexDirection !== 'column') {
        throw new Error(`Default: expected column, got ${el.style.flexDirection}`)
      }
    })

    it('direction="horizontal" sets flex-direction: row', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack direction="horizontal"></fluid-stack>')
      if (el.style.flexDirection !== 'row') {
        throw new Error(`Expected row, got ${el.style.flexDirection}`)
      }
    })

    it('direction="vertical" sets flex-direction: column', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack direction="vertical"></fluid-stack>')
      if (el.style.flexDirection !== 'column') {
        throw new Error(`Expected column, got ${el.style.flexDirection}`)
      }
    })

    it('direction="horizontal" with dir="rtl" on host sets flex-direction: row-reverse', async () => {
      const el = await FluidTestUtils.mount(
        '<fluid-stack direction="horizontal" dir="rtl"></fluid-stack>',
      )
      if (el.style.flexDirection !== 'row-reverse') {
        throw new Error(`Expected row-reverse in RTL, got ${el.style.flexDirection}`)
      }
    })

    it('updates flex-direction when direction attribute changes', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack direction="vertical"></fluid-stack>')
      el.setAttribute('direction', 'horizontal')
      if (el.style.flexDirection !== 'row') {
        throw new Error(`After change: expected row, got ${el.style.flexDirection}`)
      }
    })
  })

  describe('gap', () => {
    it('defaults to var(--fluid-space-4) when no gap attribute', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack></fluid-stack>')
      if (el.style.gap !== 'var(--fluid-space-4)') {
        throw new Error(`Default gap: expected var(--fluid-space-4), got ${el.style.gap}`)
      }
    })

    it('gap="xs" resolves to var(--fluid-space-1)', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack gap="xs"></fluid-stack>')
      if (el.style.gap !== 'var(--fluid-space-1)') {
        throw new Error(`Expected var(--fluid-space-1), got ${el.style.gap}`)
      }
    })

    it('gap="sm" resolves to var(--fluid-space-2)', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack gap="sm"></fluid-stack>')
      if (el.style.gap !== 'var(--fluid-space-2)') {
        throw new Error(`Expected var(--fluid-space-2), got ${el.style.gap}`)
      }
    })

    it('gap="md" resolves to var(--fluid-space-4)', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack gap="md"></fluid-stack>')
      if (el.style.gap !== 'var(--fluid-space-4)') {
        throw new Error(`Expected var(--fluid-space-4), got ${el.style.gap}`)
      }
    })

    it('gap="lg" resolves to var(--fluid-space-6)', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack gap="lg"></fluid-stack>')
      if (el.style.gap !== 'var(--fluid-space-6)') {
        throw new Error(`Expected var(--fluid-space-6), got ${el.style.gap}`)
      }
    })

    it('gap="xl" resolves to var(--fluid-space-10)', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack gap="xl"></fluid-stack>')
      if (el.style.gap !== 'var(--fluid-space-10)') {
        throw new Error(`Expected var(--fluid-space-10), got ${el.style.gap}`)
      }
    })

    it('arbitrary CSS gap value passes through unchanged', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack gap="20px"></fluid-stack>')
      if (el.style.gap !== '20px') {
        throw new Error(`Expected 20px, got ${el.style.gap}`)
      }
    })

    it('updates gap when attribute changes', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack gap="sm"></fluid-stack>')
      el.setAttribute('gap', 'xl')
      if (el.style.gap !== 'var(--fluid-space-10)') {
        throw new Error(`After change: expected var(--fluid-space-10), got ${el.style.gap}`)
      }
    })
  })

  describe('align', () => {
    it('defaults to stretch', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack></fluid-stack>')
      if (el.style.alignItems !== 'stretch') {
        throw new Error(`Default align: expected stretch, got ${el.style.alignItems}`)
      }
    })

    it('align="center" sets align-items: center', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack align="center"></fluid-stack>')
      if (el.style.alignItems !== 'center') {
        throw new Error(`Expected center, got ${el.style.alignItems}`)
      }
    })

    it('align="start" sets align-items: start', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack align="start"></fluid-stack>')
      if (el.style.alignItems !== 'start') {
        throw new Error(`Expected start, got ${el.style.alignItems}`)
      }
    })

    it('align="end" sets align-items: end', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack align="end"></fluid-stack>')
      if (el.style.alignItems !== 'end') {
        throw new Error(`Expected end, got ${el.style.alignItems}`)
      }
    })

    it('align="baseline" sets align-items: baseline', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack align="baseline"></fluid-stack>')
      if (el.style.alignItems !== 'baseline') {
        throw new Error(`Expected baseline, got ${el.style.alignItems}`)
      }
    })
  })

  describe('justify', () => {
    it('defaults to start', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack></fluid-stack>')
      if (el.style.justifyContent !== 'start') {
        throw new Error(`Default justify: expected start, got ${el.style.justifyContent}`)
      }
    })

    it('justify="center" sets justify-content: center', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack justify="center"></fluid-stack>')
      if (el.style.justifyContent !== 'center') {
        throw new Error(`Expected center, got ${el.style.justifyContent}`)
      }
    })

    it('justify="space-between" sets justify-content: space-between', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack justify="space-between"></fluid-stack>')
      if (el.style.justifyContent !== 'space-between') {
        throw new Error(`Expected space-between, got ${el.style.justifyContent}`)
      }
    })

    it('justify="end" sets justify-content: end', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack justify="end"></fluid-stack>')
      if (el.style.justifyContent !== 'end') {
        throw new Error(`Expected end, got ${el.style.justifyContent}`)
      }
    })
  })

  describe('wrap', () => {
    it('defaults to nowrap when wrap attribute is absent', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack></fluid-stack>')
      if (el.style.flexWrap !== 'nowrap') {
        throw new Error(`Default wrap: expected nowrap, got ${el.style.flexWrap}`)
      }
    })

    it('wrap attribute presence enables flex-wrap: wrap', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack wrap></fluid-stack>')
      if (el.style.flexWrap !== 'wrap') {
        throw new Error(`Expected wrap, got ${el.style.flexWrap}`)
      }
    })

    it('removing wrap attribute restores nowrap', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack wrap></fluid-stack>')
      el.removeAttribute('wrap')
      if (el.style.flexWrap !== 'nowrap') {
        throw new Error(`After remove: expected nowrap, got ${el.style.flexWrap}`)
      }
    })
  })

  describe('lifecycle events', () => {
    it('dispatches fluid:mounted on connectedCallback', async () => {
      let mounted = false
      const fixture = document.createElement('div')
      document.body.appendChild(fixture)
      const stack = document.createElement('fluid-stack')
      stack.addEventListener('fluid:mounted', () => { mounted = true }, { once: true })
      fixture.appendChild(stack)
      await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())))
      fixture.remove()
      if (!mounted) throw new Error('fluid:mounted never fired')
    })

    it('dispatches fluid:unmounted on disconnectedCallback', async () => {
      let unmounted = false
      const el = await FluidTestUtils.mount('<fluid-stack></fluid-stack>')
      el.addEventListener('fluid:unmounted', () => { unmounted = true }, { once: true })
      FluidTestUtils.cleanup()
      await new Promise<void>(r => requestAnimationFrame(r))
      if (!unmounted) throw new Error('fluid:unmounted never fired')
    })
  })

  describe('accessibility', () => {
    it('has no axe violations with children', async () => {
      const el = await FluidTestUtils.mount(`
        <fluid-stack>
          <div>Item one</div>
          <div>Item two</div>
          <div>Item three</div>
        </fluid-stack>
      `)
      await FluidAccessibilityUtils.assertAccessible(el)
    })

    it('has no axe violations when empty', async () => {
      const el = await FluidTestUtils.mount('<fluid-stack></fluid-stack>')
      await FluidAccessibilityUtils.assertAccessible(el)
    })
  })
})

// ─── fluid-spacer ──────────────────────────────────────────────────────────────

describe('fluid-spacer', () => {
  afterEach(() => {
    FluidTestUtils.cleanup()
  })

  describe('grow mode (no size attribute)', () => {
    it('has flex: 1 1 auto by default', async () => {
      const el = await FluidTestUtils.mount('<fluid-spacer></fluid-spacer>')
      if (el.style.flex !== '1 1 auto') {
        throw new Error(`Expected flex:1 1 auto, got ${el.style.flex}`)
      }
    })
  })

  describe('fixed size mode', () => {
    it('size="xs" sets flex: 0 0 var(--fluid-space-1)', async () => {
      const el = await FluidTestUtils.mount('<fluid-spacer size="xs"></fluid-spacer>')
      if (el.style.flex !== '0 0 var(--fluid-space-1)') {
        throw new Error(`Expected 0 0 var(--fluid-space-1), got ${el.style.flex}`)
      }
    })

    it('size="sm" sets flex: 0 0 var(--fluid-space-2)', async () => {
      const el = await FluidTestUtils.mount('<fluid-spacer size="sm"></fluid-spacer>')
      if (el.style.flex !== '0 0 var(--fluid-space-2)') {
        throw new Error(`Expected 0 0 var(--fluid-space-2), got ${el.style.flex}`)
      }
    })

    it('size="md" sets flex: 0 0 var(--fluid-space-4)', async () => {
      const el = await FluidTestUtils.mount('<fluid-spacer size="md"></fluid-spacer>')
      if (el.style.flex !== '0 0 var(--fluid-space-4)') {
        throw new Error(`Expected 0 0 var(--fluid-space-4), got ${el.style.flex}`)
      }
    })

    it('size="lg" sets flex: 0 0 var(--fluid-space-6)', async () => {
      const el = await FluidTestUtils.mount('<fluid-spacer size="lg"></fluid-spacer>')
      if (el.style.flex !== '0 0 var(--fluid-space-6)') {
        throw new Error(`Expected 0 0 var(--fluid-space-6), got ${el.style.flex}`)
      }
    })

    it('size="xl" sets flex: 0 0 var(--fluid-space-10)', async () => {
      const el = await FluidTestUtils.mount('<fluid-spacer size="xl"></fluid-spacer>')
      if (el.style.flex !== '0 0 var(--fluid-space-10)') {
        throw new Error(`Expected 0 0 var(--fluid-space-10), got ${el.style.flex}`)
      }
    })

    it('removing size attribute restores grow mode', async () => {
      const el = await FluidTestUtils.mount('<fluid-spacer size="lg"></fluid-spacer>')
      el.removeAttribute('size')
      if (el.style.flex !== '1 1 auto') {
        throw new Error(`After remove: expected 1 1 auto, got ${el.style.flex}`)
      }
    })
  })

  describe('lifecycle events', () => {
    it('dispatches fluid:mounted on connect', async () => {
      let mounted = false
      const sp = document.createElement('fluid-spacer')
      sp.addEventListener('fluid:mounted', () => { mounted = true }, { once: true })
      document.body.appendChild(sp)
      await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())))
      document.body.removeChild(sp)
      if (!mounted) throw new Error('fluid:mounted never fired')
    })
  })

  describe('accessibility', () => {
    it('has no axe violations inside a fluid-stack', async () => {
      const el = await FluidTestUtils.mount(`
        <fluid-stack direction="horizontal">
          <div>Left</div>
          <fluid-spacer></fluid-spacer>
          <div>Right</div>
        </fluid-stack>
      `)
      await FluidAccessibilityUtils.assertAccessible(el)
    })
  })
})
```

- [ ] **Step 2: Run the tests — expect FAIL (elements not registered yet)**

```bash
cd /Users/kofi/_/fluid/.worktrees/session-18
pnpm --filter @neutro/fluid test:component --grep "fluid-stack|fluid-spacer" 2>&1 | tail -20
```

Expected: test runner errors like `CustomElementRegistry: element 'fluid-stack' is not defined` or similar. The spec file imports `'./index'` which doesn't exist yet — the runner will error at module resolution.

- [ ] **Step 3: Commit the test file**

```bash
git add packages/fluid/src/components/stack/stack.spec.ts
git commit -m "test(stack): write failing tests for fluid-stack and fluid-spacer"
```

---

## Task 4: Implement fluid-spacer

**Files:**
- Create: `packages/fluid/src/components/spacer/index.ts`

> Implement spacer first — it's simpler and `stack.spec.ts` imports it.

- [ ] **Step 1: Create the spacer element**

```typescript
// packages/fluid/src/components/spacer/index.ts
import { SPACER_STYLE_ID, spacerStyles } from './styles'

const SIZE_MAP: Record<string, string> = {
  xs: 'var(--fluid-space-1)',
  sm: 'var(--fluid-space-2)',
  md: 'var(--fluid-space-4)',
  lg: 'var(--fluid-space-6)',
  xl: 'var(--fluid-space-10)',
}

function resolveSize(val: string): string {
  return SIZE_MAP[val] ?? val
}

function injectStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(SPACER_STYLE_ID)) return
  const s = document.createElement('style')
  s.id = SPACER_STYLE_ID
  s.textContent = spacerStyles
  document.head.appendChild(s)
}

export class FluidSpacer extends HTMLElement {
  static get observedAttributes() {
    return ['size']
  }

  connectedCallback(): void {
    injectStyles()
    this._syncStyles()
    this.dispatchEvent(new CustomEvent('fluid:mounted', { bubbles: true, composed: true }))
  }

  disconnectedCallback(): void {
    this.dispatchEvent(new CustomEvent('fluid:unmounted', { bubbles: true, composed: true }))
  }

  attributeChangedCallback(_name: string, _old: string | null, _next: string | null): void {
    if (!this.isConnected) return
    this._syncStyles()
  }

  private _syncStyles(): void {
    const size = this.getAttribute('size')
    if (size !== null) {
      this.style.flex = `0 0 ${resolveSize(size)}`
    } else {
      this.style.flex = '1 1 auto'
    }
  }
}

if (!customElements.get('fluid-spacer')) {
  customElements.define('fluid-spacer', FluidSpacer)
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/fluid/src/components/spacer/index.ts packages/fluid/src/components/spacer/styles.ts
git commit -m "feat(spacer): implement FluidSpacer custom element"
```

---

## Task 5: Implement fluid-stack

**Files:**
- Create: `packages/fluid/src/components/stack/index.ts`

- [ ] **Step 1: Create the stack element**

```typescript
// packages/fluid/src/components/stack/index.ts
import { ledger } from '../../core/ledger'
import { STACK_STYLE_ID, stackStyles } from './styles'

const DEV = typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'

const GAP_MAP: Record<string, string> = {
  xs: 'var(--fluid-space-1)',
  sm: 'var(--fluid-space-2)',
  md: 'var(--fluid-space-4)',
  lg: 'var(--fluid-space-6)',
  xl: 'var(--fluid-space-10)',
}

function resolveGap(val: string): string {
  return GAP_MAP[val] ?? val
}

function injectStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STACK_STYLE_ID)) return
  const s = document.createElement('style')
  s.id = STACK_STYLE_ID
  s.textContent = stackStyles
  document.head.appendChild(s)
}

export class FluidStack extends HTMLElement {
  static get observedAttributes() {
    return ['direction', 'gap', 'align', 'justify', 'wrap', 'layout']
  }

  private _mutationObs: MutationObserver | null = null
  private _snapshots = new Map<Element, DOMRect>()

  connectedCallback(): void {
    injectStyles()
    this._syncStyles()
    if (this.hasAttribute('layout')) this._startObserver()
    this.dispatchEvent(new CustomEvent('fluid:mounted', { bubbles: true, composed: true }))
  }

  disconnectedCallback(): void {
    this._stopObserver()
    this.dispatchEvent(new CustomEvent('fluid:unmounted', { bubbles: true, composed: true }))
  }

  attributeChangedCallback(name: string, _old: string | null, _next: string | null): void {
    if (!this.isConnected) return
    this._syncStyles()
    if (name === 'layout') {
      if (this.hasAttribute('layout')) this._startObserver()
      else this._stopObserver()
    }
  }

  private _syncStyles(): void {
    const dir = this.getAttribute('direction') ?? 'vertical'
    this.style.flexDirection = dir === 'horizontal' ? (this._isRTL() ? 'row-reverse' : 'row') : 'column'
    this.style.gap = resolveGap(this.getAttribute('gap') ?? 'md')
    this.style.alignItems = this.getAttribute('align') ?? 'stretch'
    this.style.justifyContent = this.getAttribute('justify') ?? 'start'
    this.style.flexWrap = this.hasAttribute('wrap') ? 'wrap' : 'nowrap'
  }

  private _isRTL(): boolean {
    return (
      this.dir === 'rtl' ||
      this.closest('[dir="rtl"]') !== null ||
      getComputedStyle(this).direction === 'rtl'
    )
  }

  private _startObserver(): void {
    if (this._mutationObs) return
    this._takeSnapshot()
    this._mutationObs = new MutationObserver(() => this._handleMutation())
    this._mutationObs.observe(this, { childList: true })
  }

  private _stopObserver(): void {
    this._mutationObs?.disconnect()
    this._mutationObs = null
    this._snapshots.clear()
  }

  private _takeSnapshot(): void {
    this._snapshots.clear()
    for (const child of this.children) {
      this._snapshots.set(child, child.getBoundingClientRect())
    }
  }

  private _handleMutation(): void {
    const children = [...this.children]

    if (children.length > 50) {
      if (DEV) {
        console.warn('[fluid warn] fluid-stack[layout] has >50 children — FLIP suppressed for performance.')
      }
      this._takeSnapshot()
      return
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this._takeSnapshot()
      return
    }

    const tier = ledger.tier

    for (const child of children) {
      const first = this._snapshots.get(child)
      if (!first) continue

      const last = child.getBoundingClientRect()
      const dx = first.left - last.left
      const dy = first.top - last.top
      if (dx === 0 && dy === 0) continue

      const el = child as HTMLElement

      if (tier === 'crystalline' || tier === 'optical') {
        el.animate(
          [
            { transform: `translate(${dx}px, ${dy}px)` },
            { transform: 'translate(0, 0)' },
          ],
          { duration: 450, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1.0)', fill: 'none' },
        )
      } else {
        // Matte + Frosted: CSS transition FLIP
        const duration = tier === 'frosted' ? 350 : 250
        el.style.transition = 'none'
        el.style.transform = `translate(${dx}px, ${dy}px)`
        el.getBoundingClientRect() // force reflow before re-enabling transition
        el.style.transition = `transform ${duration}ms cubic-bezier(0.34, 1.56, 0.64, 1.0)`
        el.style.transform = ''
        el.addEventListener(
          'transitionend',
          () => { el.style.transition = '' },
          { once: true },
        )
      }
    }

    // Re-snapshot after layout settles (two rAFs to clear any pending paints)
    requestAnimationFrame(() => requestAnimationFrame(() => this._takeSnapshot()))
  }
}

if (!customElements.get('fluid-stack')) {
  customElements.define('fluid-stack', FluidStack)
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/fluid/src/components/stack/index.ts packages/fluid/src/components/stack/styles.ts
git commit -m "feat(stack): implement FluidStack custom element with tier-aware FLIP"
```

---

## Task 6: Run the tests — expect PASS

- [ ] **Step 1: Run component tests**

```bash
cd /Users/kofi/_/fluid/.worktrees/session-18
pnpm --filter @neutro/fluid test:component --grep "fluid-stack|fluid-spacer" 2>&1 | tail -30
```

Expected output: all tests PASS, 0 failures.

- [ ] **Step 2: If any test fails, diagnose and fix before proceeding**

Common failure modes:
- `el.style.flex` returning a different normalization → check if Chrome expands the shorthand; switch assertion to check `el.style.flexGrow`, `el.style.flexShrink`, `el.style.flexBasis` separately.
- `el.style.justifyContent` returning `'flex-start'` instead of `'start'` → update assertion or change `_syncStyles()` to use `'flex-start'`.
- `el.style.alignItems` returning `'normal'` instead of `'stretch'` → same fix.

- [ ] **Step 3: Commit any fixes**

```bash
git add -p
git commit -m "fix(stack): correct computed style assertions after browser normalization"
```

---

## Task 7: Storybook story — fluid-stack

**Files:**
- Create: `apps/storybook/src/stack.stories.ts`

- [ ] **Step 1: Create the stories file**

```typescript
// apps/storybook/src/stack.stories.ts
import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'
import '@neutro/fluid/stack'
import '@neutro/fluid/spacer'
import '@neutro/fluid/button'

const meta: Meta = {
  title: 'Layout / Stack',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A layout primitive wrapping CSS Flexbox. Direction, gap, alignment, and wrapping are ' +
          'controlled via attributes. The `layout` attribute enables tier-aware FLIP animation ' +
          'when children reorder — no consumer wiring required.',
      },
    },
  },
  argTypes: {
    direction: {
      control: 'select',
      options: ['vertical', 'horizontal'],
      description: 'Flex axis',
    },
    gap: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      description: 'Gap between children — maps to Fluid space tokens',
    },
    align: {
      control: 'select',
      options: ['stretch', 'start', 'center', 'end', 'baseline'],
      description: 'align-items',
    },
    justify: {
      control: 'select',
      options: ['start', 'center', 'end', 'space-between', 'space-around', 'space-evenly'],
      description: 'justify-content',
    },
    wrap: {
      control: 'boolean',
      description: 'Enable flex-wrap',
    },
  },
  args: {
    direction: 'vertical',
    gap: 'md',
    align: 'stretch',
    justify: 'start',
    wrap: false,
  },
}

export default meta
type Story = StoryObj<typeof meta>

// ─── Direction variants ────────────────────────────────────────────────────────

export const Vertical: Story = {
  render: () => html`
    <fluid-stack direction="vertical" gap="sm">
      <fluid-button variant="secondary">First item</fluid-button>
      <fluid-button variant="secondary">Second item</fluid-button>
      <fluid-button variant="secondary">Third item</fluid-button>
    </fluid-stack>
  `,
}

export const Horizontal: Story = {
  render: () => html`
    <fluid-stack direction="horizontal" gap="sm">
      <fluid-button variant="secondary">Left</fluid-button>
      <fluid-button variant="secondary">Center</fluid-button>
      <fluid-button variant="secondary">Right</fluid-button>
    </fluid-stack>
  `,
}

// ─── Gap variants ─────────────────────────────────────────────────────────────

export const GapXS: Story = {
  render: () => html`
    <fluid-stack direction="horizontal" gap="xs">
      <fluid-button variant="secondary">A</fluid-button>
      <fluid-button variant="secondary">B</fluid-button>
      <fluid-button variant="secondary">C</fluid-button>
    </fluid-stack>
  `,
}

export const GapSM: Story = {
  render: () => html`
    <fluid-stack direction="horizontal" gap="sm">
      <fluid-button variant="secondary">A</fluid-button>
      <fluid-button variant="secondary">B</fluid-button>
      <fluid-button variant="secondary">C</fluid-button>
    </fluid-stack>
  `,
}

export const GapMD: Story = {
  render: () => html`
    <fluid-stack direction="horizontal" gap="md">
      <fluid-button variant="secondary">A</fluid-button>
      <fluid-button variant="secondary">B</fluid-button>
      <fluid-button variant="secondary">C</fluid-button>
    </fluid-stack>
  `,
}

export const GapLG: Story = {
  render: () => html`
    <fluid-stack direction="horizontal" gap="lg">
      <fluid-button variant="secondary">A</fluid-button>
      <fluid-button variant="secondary">B</fluid-button>
      <fluid-button variant="secondary">C</fluid-button>
    </fluid-stack>
  `,
}

export const GapXL: Story = {
  render: () => html`
    <fluid-stack direction="horizontal" gap="xl">
      <fluid-button variant="secondary">A</fluid-button>
      <fluid-button variant="secondary">B</fluid-button>
    </fluid-stack>
  `,
}

// ─── Alignment ────────────────────────────────────────────────────────────────

export const AlignCenter: Story = {
  render: () => html`
    <fluid-stack direction="horizontal" gap="md" align="center">
      <fluid-button variant="primary" size="sm">Small</fluid-button>
      <fluid-button variant="primary" size="md">Medium</fluid-button>
      <fluid-button variant="primary" size="lg">Large</fluid-button>
    </fluid-stack>
  `,
}

export const JustifySpaceBetween: Story = {
  render: () => html`
    <div style="width:100%;max-width:480px">
      <fluid-stack direction="horizontal" gap="md" justify="space-between">
        <fluid-button variant="ghost">Cancel</fluid-button>
        <fluid-button variant="primary">Save changes</fluid-button>
      </fluid-stack>
    </div>
  `,
}

// ─── Wrapping ─────────────────────────────────────────────────────────────────

export const WithWrap: Story = {
  render: () => html`
    <div style="width:320px">
      <fluid-stack direction="horizontal" gap="sm" wrap>
        ${['Dashboard', 'Analytics', 'Reports', 'Settings', 'Users', 'Billing'].map(
          label => html`<fluid-button variant="secondary">${label}</fluid-button>`,
        )}
      </fluid-stack>
    </div>
  `,
}

// ─── Spacer integration ───────────────────────────────────────────────────────

export const WithSpacer: Story = {
  render: () => html`
    <div style="width:100%;max-width:480px">
      <fluid-stack direction="horizontal" gap="sm" align="center">
        <fluid-button variant="secondary">Back</fluid-button>
        <fluid-spacer></fluid-spacer>
        <fluid-button variant="primary">Next</fluid-button>
      </fluid-stack>
    </div>
  `,
}

// ─── Nesting ──────────────────────────────────────────────────────────────────

export const Nested: Story = {
  render: () => html`
    <fluid-stack direction="vertical" gap="md">
      <fluid-stack direction="horizontal" gap="sm">
        <fluid-button variant="primary">Save</fluid-button>
        <fluid-button variant="ghost">Cancel</fluid-button>
      </fluid-stack>
      <fluid-stack direction="horizontal" gap="sm">
        <fluid-button variant="secondary">Export</fluid-button>
        <fluid-button variant="secondary">Share</fluid-button>
        <fluid-button variant="destructive">Delete</fluid-button>
      </fluid-stack>
    </fluid-stack>
  `,
}

// ─── RTL ──────────────────────────────────────────────────────────────────────

export const RTL: Story = {
  render: () => html`
    <div dir="rtl">
      <fluid-stack direction="horizontal" gap="sm">
        <fluid-button variant="primary">اذهب</fluid-button>
        <fluid-button variant="secondary">إلغاء</fluid-button>
      </fluid-stack>
    </div>
  `,
}

// ─── Playground (controls-driven) ─────────────────────────────────────────────

export const Playground: Story = {
  render: (args) => html`
    <fluid-stack
      direction=${args.direction}
      gap=${args.gap}
      align=${args.align}
      justify=${args.justify}
      ?wrap=${args.wrap}
    >
      <fluid-button variant="primary">Primary</fluid-button>
      <fluid-button variant="secondary">Secondary</fluid-button>
      <fluid-button variant="ghost">Ghost</fluid-button>
    </fluid-stack>
  `,
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/storybook/src/stack.stories.ts
git commit -m "feat(storybook): add fluid-stack stories"
```

---

## Task 8: Storybook story — fluid-spacer

**Files:**
- Create: `apps/storybook/src/spacer.stories.ts`

- [ ] **Step 1: Create the stories file**

```typescript
// apps/storybook/src/spacer.stories.ts
import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'
import '@neutro/fluid/spacer'
import '@neutro/fluid/stack'
import '@neutro/fluid/button'

const meta: Meta = {
  title: 'Layout / Spacer',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Flexible whitespace for use inside `fluid-stack`. ' +
          'Without a `size` attribute it grows to fill remaining space (`flex: 1 1 auto`). ' +
          'With `size` it becomes a fixed-dimension gap using a Fluid space token.',
      },
    },
  },
  argTypes: {
    size: {
      control: 'select',
      options: ['', 'xs', 'sm', 'md', 'lg', 'xl'],
      description: 'Fixed size token. Omit for grow mode.',
    },
  },
  args: {
    size: '',
  },
}

export default meta
type Story = StoryObj<typeof meta>

// ─── Grow mode ────────────────────────────────────────────────────────────────

export const GrowMode: Story = {
  render: () => html`
    <div style="width:100%;max-width:480px">
      <fluid-stack direction="horizontal" gap="sm" align="center">
        <fluid-button variant="secondary">Back</fluid-button>
        <fluid-spacer></fluid-spacer>
        <fluid-button variant="primary">Continue</fluid-button>
      </fluid-stack>
    </div>
  `,
}

// ─── Fixed size variants ──────────────────────────────────────────────────────

export const FixedXS: Story = {
  render: () => html`
    <fluid-stack direction="vertical">
      <fluid-button variant="secondary">Section A</fluid-button>
      <fluid-spacer size="xs"></fluid-spacer>
      <fluid-button variant="secondary">Section B</fluid-button>
    </fluid-stack>
  `,
}

export const FixedSM: Story = {
  render: () => html`
    <fluid-stack direction="vertical">
      <fluid-button variant="secondary">Section A</fluid-button>
      <fluid-spacer size="sm"></fluid-spacer>
      <fluid-button variant="secondary">Section B</fluid-button>
    </fluid-stack>
  `,
}

export const FixedMD: Story = {
  render: () => html`
    <fluid-stack direction="vertical">
      <fluid-button variant="secondary">Section A</fluid-button>
      <fluid-spacer size="md"></fluid-spacer>
      <fluid-button variant="secondary">Section B</fluid-button>
    </fluid-stack>
  `,
}

export const FixedLG: Story = {
  render: () => html`
    <fluid-stack direction="vertical">
      <fluid-button variant="secondary">Section A</fluid-button>
      <fluid-spacer size="lg"></fluid-spacer>
      <fluid-button variant="secondary">Section B</fluid-button>
    </fluid-stack>
  `,
}

export const FixedXL: Story = {
  render: () => html`
    <fluid-stack direction="vertical">
      <fluid-button variant="secondary">Section A</fluid-button>
      <fluid-spacer size="xl"></fluid-spacer>
      <fluid-button variant="secondary">Section B</fluid-button>
    </fluid-stack>
  `,
}

// ─── Multiple spacers in a row ────────────────────────────────────────────────

export const MultipleSpacers: Story = {
  render: () => html`
    <div style="width:100%;max-width:600px">
      <fluid-stack direction="horizontal" gap="sm" align="center">
        <fluid-button variant="ghost">Home</fluid-button>
        <fluid-spacer></fluid-spacer>
        <fluid-button variant="ghost">Products</fluid-button>
        <fluid-button variant="ghost">Pricing</fluid-button>
        <fluid-spacer></fluid-spacer>
        <fluid-button variant="primary">Sign up</fluid-button>
      </fluid-stack>
    </div>
  `,
}

// ─── Playground ───────────────────────────────────────────────────────────────

export const Playground: Story = {
  render: (args) => html`
    <div style="width:100%;max-width:480px">
      <fluid-stack direction="horizontal" gap="sm" align="center">
        <fluid-button variant="secondary">Left</fluid-button>
        <fluid-spacer size=${args.size || null}></fluid-spacer>
        <fluid-button variant="primary">Right</fluid-button>
      </fluid-stack>
    </div>
  `,
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/storybook/src/spacer.stories.ts
git commit -m "feat(storybook): add fluid-spacer stories"
```

---

## Task 9: Playground page — fluid-stack

**Files:**
- Create: `apps/playground/pages/stack.html`

- [ ] **Step 1: Create the playground page**

```html
<!-- apps/playground/pages/stack.html -->
<article class="pg-page">
  <header class="pg-page-header">
    <h1 class="pg-page-title">Stack</h1>
    <p class="pg-page-desc">
      Layout primitive wrapping CSS Flexbox. <code>direction</code>, <code>gap</code>,
      <code>align</code>, <code>justify</code>, and <code>wrap</code> are controlled via attributes.
      The <code>layout</code> attribute enables tier-aware FLIP animation on child reorder — nothing
      to wire up.
    </p>
  </header>

  <!-- ─── Variants ────────────────────────────────────────────────────── -->
  <section class="pg-section">
    <h2>Variants</h2>

    <div class="pg-example">
      <div class="pg-preview">
        <fluid-stack direction="vertical" gap="sm">
          <fluid-button variant="secondary">First</fluid-button>
          <fluid-button variant="secondary">Second</fluid-button>
          <fluid-button variant="secondary">Third</fluid-button>
        </fluid-stack>
      </div>
      <pre class="pg-code">&lt;fluid-stack direction="vertical" gap="sm"&gt;
  &lt;fluid-button variant="secondary"&gt;First&lt;/fluid-button&gt;
  &lt;fluid-button variant="secondary"&gt;Second&lt;/fluid-button&gt;
  &lt;fluid-button variant="secondary"&gt;Third&lt;/fluid-button&gt;
&lt;/fluid-stack&gt;</pre>
    </div>

    <div class="pg-example">
      <div class="pg-preview">
        <fluid-stack direction="horizontal" gap="sm">
          <fluid-button variant="secondary">Left</fluid-button>
          <fluid-button variant="secondary">Center</fluid-button>
          <fluid-button variant="secondary">Right</fluid-button>
        </fluid-stack>
      </div>
      <pre class="pg-code">&lt;fluid-stack direction="horizontal" gap="sm"&gt;
  &lt;fluid-button variant="secondary"&gt;Left&lt;/fluid-button&gt;
  &lt;fluid-button variant="secondary"&gt;Center&lt;/fluid-button&gt;
  &lt;fluid-button variant="secondary"&gt;Right&lt;/fluid-button&gt;
&lt;/fluid-stack&gt;</pre>
    </div>

    <div class="pg-example">
      <div class="pg-preview" style="width:320px">
        <fluid-stack direction="horizontal" gap="sm" wrap>
          <fluid-button variant="secondary">Dashboard</fluid-button>
          <fluid-button variant="secondary">Analytics</fluid-button>
          <fluid-button variant="secondary">Reports</fluid-button>
          <fluid-button variant="secondary">Settings</fluid-button>
          <fluid-button variant="secondary">Billing</fluid-button>
        </fluid-stack>
      </div>
      <pre class="pg-code">&lt;fluid-stack direction="horizontal" gap="sm" wrap&gt;
  ...
&lt;/fluid-stack&gt;</pre>
    </div>
  </section>

  <!-- ─── States (gap scale) ──────────────────────────────────────────── -->
  <section class="pg-section">
    <h2>Gap scale</h2>
    <p>All gap tokens visible simultaneously.</p>

    <div class="pg-example">
      <div class="pg-preview" style="flex-direction:column;gap:24px;align-items:flex-start">
        <div style="display:flex;align-items:center;gap:12px">
          <span class="pg-state-label" style="width:32px">xs</span>
          <fluid-stack direction="horizontal" gap="xs">
            <fluid-button variant="secondary">A</fluid-button>
            <fluid-button variant="secondary">B</fluid-button>
            <fluid-button variant="secondary">C</fluid-button>
          </fluid-stack>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <span class="pg-state-label" style="width:32px">sm</span>
          <fluid-stack direction="horizontal" gap="sm">
            <fluid-button variant="secondary">A</fluid-button>
            <fluid-button variant="secondary">B</fluid-button>
            <fluid-button variant="secondary">C</fluid-button>
          </fluid-stack>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <span class="pg-state-label" style="width:32px">md</span>
          <fluid-stack direction="horizontal" gap="md">
            <fluid-button variant="secondary">A</fluid-button>
            <fluid-button variant="secondary">B</fluid-button>
            <fluid-button variant="secondary">C</fluid-button>
          </fluid-stack>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <span class="pg-state-label" style="width:32px">lg</span>
          <fluid-stack direction="horizontal" gap="lg">
            <fluid-button variant="secondary">A</fluid-button>
            <fluid-button variant="secondary">B</fluid-button>
          </fluid-stack>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <span class="pg-state-label" style="width:32px">xl</span>
          <fluid-stack direction="horizontal" gap="xl">
            <fluid-button variant="secondary">A</fluid-button>
            <fluid-button variant="secondary">B</fluid-button>
          </fluid-stack>
        </div>
      </div>
    </div>
  </section>

  <!-- ─── Edge cases ──────────────────────────────────────────────────── -->
  <section class="pg-section">
    <h2>Edge cases</h2>

    <div class="pg-example">
      <div class="pg-preview">
        <fluid-stack direction="horizontal" gap="md" justify="space-between" style="width:100%;max-width:480px">
          <fluid-button variant="ghost">Cancel</fluid-button>
          <fluid-button variant="primary">Confirm action</fluid-button>
        </fluid-stack>
      </div>
      <pre class="pg-code">&lt;!-- justify="space-between" with 2 children --&gt;
&lt;fluid-stack direction="horizontal" justify="space-between"&gt;
  &lt;fluid-button variant="ghost"&gt;Cancel&lt;/fluid-button&gt;
  &lt;fluid-button variant="primary"&gt;Confirm action&lt;/fluid-button&gt;
&lt;/fluid-stack&gt;</pre>
    </div>

    <div class="pg-example">
      <div class="pg-preview">
        <fluid-stack direction="vertical" gap="sm">
          <!-- empty — should render as an invisible flex container -->
        </fluid-stack>
        <p style="font-size:0.8rem;opacity:0.5;margin-top:8px">↑ Empty stack (zero height)</p>
      </div>
      <pre class="pg-code">&lt;!-- empty slot — renders as zero-height flex container --&gt;
&lt;fluid-stack&gt;&lt;/fluid-stack&gt;</pre>
    </div>

    <div class="pg-example">
      <div class="pg-preview">
        <fluid-stack direction="horizontal" gap="sm" align="center" style="max-width:320px;overflow:hidden">
          <fluid-button variant="secondary">
            An item with an extremely long label that could overflow the container bounds
          </fluid-button>
          <fluid-button variant="secondary">B</fluid-button>
        </fluid-stack>
      </div>
      <pre class="pg-code">&lt;!-- very long content child --&gt;
&lt;fluid-stack direction="horizontal" gap="sm" style="max-width:320px;overflow:hidden"&gt;
  &lt;fluid-button variant="secondary"&gt;An item with an extremely long label...&lt;/fluid-button&gt;
  &lt;fluid-button variant="secondary"&gt;B&lt;/fluid-button&gt;
&lt;/fluid-stack&gt;</pre>
    </div>
  </section>

  <!-- ─── FLIP demo ──────────────────────────────────────────────────── -->
  <section class="pg-section">
    <h2>FLIP layout animation (layout attribute)</h2>
    <p>
      Enable <code>layout</code> on a stack and reorder its children — the animation activates
      automatically at the current tier. Use the toolbar tier switcher to compare.
    </p>

    <div class="pg-example">
      <div class="pg-preview" style="gap:16px;flex-direction:column;align-items:flex-start">
        <fluid-stack id="flip-demo" direction="horizontal" gap="sm" layout>
          <fluid-button variant="secondary" style="order:1">Alpha</fluid-button>
          <fluid-button variant="secondary" style="order:2">Beta</fluid-button>
          <fluid-button variant="secondary" style="order:3">Gamma</fluid-button>
        </fluid-stack>
        <fluid-button variant="primary" id="flip-trigger">Shuffle order</fluid-button>
      </div>
      <pre class="pg-code">&lt;fluid-stack direction="horizontal" gap="sm" layout&gt;
  &lt;fluid-button&gt;Alpha&lt;/fluid-button&gt;
  &lt;fluid-button&gt;Beta&lt;/fluid-button&gt;
  &lt;fluid-button&gt;Gamma&lt;/fluid-button&gt;
&lt;/fluid-stack&gt;</pre>
    </div>

    <script type="module">
      const demo = document.getElementById('flip-demo')
      const trigger = document.getElementById('flip-trigger')
      if (demo && trigger) {
        trigger.addEventListener('click', () => {
          const children = [...demo.children].filter(c => c !== trigger)
          // Append in shuffled order to trigger MutationObserver
          const shuffled = children.sort(() => Math.random() - 0.5)
          shuffled.forEach(c => demo.appendChild(c))
        })
      }
    </script>
  </section>
</article>

<script type="module">
  import '@neutro/fluid/stack'
  import '@neutro/fluid/button'
</script>
```

- [ ] **Step 2: Commit**

```bash
git add apps/playground/pages/stack.html
git commit -m "feat(playground): add fluid-stack page"
```

---

## Task 10: Playground page — fluid-spacer

**Files:**
- Create: `apps/playground/pages/spacer.html`

- [ ] **Step 1: Create the playground page**

```html
<!-- apps/playground/pages/spacer.html -->
<article class="pg-page">
  <header class="pg-page-header">
    <h1 class="pg-page-title">Spacer</h1>
    <p class="pg-page-desc">
      Flexible whitespace for use inside <code>fluid-stack</code>. Without a <code>size</code>
      attribute it grows to fill remaining space (<code>flex: 1 1 auto</code>). With
      <code>size</code> it becomes a fixed gap using a Fluid space token.
    </p>
  </header>

  <!-- ─── Variants ────────────────────────────────────────────────────── -->
  <section class="pg-section">
    <h2>Variants</h2>

    <div class="pg-example">
      <div class="pg-preview" style="width:100%;max-width:480px">
        <fluid-stack direction="horizontal" gap="sm" align="center">
          <fluid-button variant="secondary">Back</fluid-button>
          <fluid-spacer></fluid-spacer>
          <fluid-button variant="primary">Next</fluid-button>
        </fluid-stack>
      </div>
      <pre class="pg-code">&lt;!-- grow mode: pushes siblings to opposite ends --&gt;
&lt;fluid-stack direction="horizontal" gap="sm"&gt;
  &lt;fluid-button&gt;Back&lt;/fluid-button&gt;
  &lt;fluid-spacer&gt;&lt;/fluid-spacer&gt;
  &lt;fluid-button variant="primary"&gt;Next&lt;/fluid-button&gt;
&lt;/fluid-stack&gt;</pre>
    </div>

    <div class="pg-example">
      <div class="pg-preview">
        <fluid-stack direction="vertical">
          <fluid-button variant="secondary">Section header</fluid-button>
          <fluid-spacer size="lg"></fluid-spacer>
          <fluid-button variant="secondary">Separated content</fluid-button>
        </fluid-stack>
      </div>
      <pre class="pg-code">&lt;!-- fixed size: adds a specific gap between sections --&gt;
&lt;fluid-stack direction="vertical"&gt;
  &lt;fluid-button&gt;Section header&lt;/fluid-button&gt;
  &lt;fluid-spacer size="lg"&gt;&lt;/fluid-spacer&gt;
  &lt;fluid-button&gt;Separated content&lt;/fluid-button&gt;
&lt;/fluid-stack&gt;</pre>
    </div>
  </section>

  <!-- ─── States (all size tokens) ────────────────────────────────────── -->
  <section class="pg-section">
    <h2>Fixed size tokens</h2>
    <p>All size tokens visible simultaneously — the coloured bar shows the spacer footprint.</p>

    <div class="pg-example">
      <div class="pg-preview" style="flex-direction:column;gap:0;align-items:flex-start">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px">
          <span class="pg-state-label" style="width:32px">xs</span>
          <div style="background:var(--fluid-color-brand,#005FCC);opacity:0.25;width:80px">
            <fluid-spacer size="xs"></fluid-spacer>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px">
          <span class="pg-state-label" style="width:32px">sm</span>
          <div style="background:var(--fluid-color-brand,#005FCC);opacity:0.25;width:80px">
            <fluid-spacer size="sm"></fluid-spacer>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px">
          <span class="pg-state-label" style="width:32px">md</span>
          <div style="background:var(--fluid-color-brand,#005FCC);opacity:0.25;width:80px">
            <fluid-spacer size="md"></fluid-spacer>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px">
          <span class="pg-state-label" style="width:32px">lg</span>
          <div style="background:var(--fluid-color-brand,#005FCC);opacity:0.25;width:80px">
            <fluid-spacer size="lg"></fluid-spacer>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <span class="pg-state-label" style="width:32px">xl</span>
          <div style="background:var(--fluid-color-brand,#005FCC);opacity:0.25;width:80px">
            <fluid-spacer size="xl"></fluid-spacer>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ─── Edge cases ──────────────────────────────────────────────────── -->
  <section class="pg-section">
    <h2>Edge cases</h2>

    <div class="pg-example">
      <div class="pg-preview" style="width:100%;max-width:600px">
        <fluid-stack direction="horizontal" gap="sm" align="center">
          <fluid-button variant="ghost">Home</fluid-button>
          <fluid-spacer></fluid-spacer>
          <fluid-button variant="ghost">Products</fluid-button>
          <fluid-button variant="ghost">Pricing</fluid-button>
          <fluid-spacer></fluid-spacer>
          <fluid-button variant="primary">Sign up</fluid-button>
        </fluid-stack>
      </div>
      <pre class="pg-code">&lt;!-- two grow spacers share remaining space equally --&gt;
&lt;fluid-stack direction="horizontal"&gt;
  &lt;fluid-button&gt;Home&lt;/fluid-button&gt;
  &lt;fluid-spacer&gt;&lt;/fluid-spacer&gt;
  &lt;fluid-button&gt;Products&lt;/fluid-button&gt;
  &lt;fluid-button&gt;Pricing&lt;/fluid-button&gt;
  &lt;fluid-spacer&gt;&lt;/fluid-spacer&gt;
  &lt;fluid-button variant="primary"&gt;Sign up&lt;/fluid-button&gt;
&lt;/fluid-stack&gt;</pre>
    </div>

    <div class="pg-example">
      <div class="pg-preview" style="width:100%;max-width:480px">
        <fluid-stack direction="horizontal" gap="sm" align="center">
          <fluid-spacer></fluid-spacer>
          <fluid-button variant="primary">Centred via two grow spacers</fluid-button>
          <fluid-spacer></fluid-spacer>
        </fluid-stack>
      </div>
      <pre class="pg-code">&lt;!-- centering via equal grow spacers on both sides --&gt;
&lt;fluid-stack direction="horizontal"&gt;
  &lt;fluid-spacer&gt;&lt;/fluid-spacer&gt;
  &lt;fluid-button variant="primary"&gt;Centred&lt;/fluid-button&gt;
  &lt;fluid-spacer&gt;&lt;/fluid-spacer&gt;
&lt;/fluid-stack&gt;</pre>
    </div>
  </section>
</article>

<script type="module">
  import '@neutro/fluid/spacer'
  import '@neutro/fluid/stack'
  import '@neutro/fluid/button'
</script>
```

- [ ] **Step 2: Commit**

```bash
git add apps/playground/pages/spacer.html
git commit -m "feat(playground): add fluid-spacer page"
```

---

## Task 11: Update playground nav

**Files:**
- Modify: `apps/playground/index.html`

Current Layout nav section (line ~34–36):
```html
      <section class="nav-group">
        <p class="nav-group-label" role="presentation">Layout</p>
        <a href="#portal" data-page="portal">Portal</a>
        <!-- <a href="#stack" data-page="stack">Stack</a> -->
```

- [ ] **Step 1: Uncomment the stack link and add spacer**

Replace:
```html
        <a href="#portal" data-page="portal">Portal</a>
        <!-- <a href="#stack" data-page="stack">Stack</a> -->
```

With:
```html
        <a href="#portal" data-page="portal">Portal</a>
        <a href="#stack" data-page="stack">Stack</a>
        <a href="#spacer" data-page="spacer">Spacer</a>
```

- [ ] **Step 2: Commit**

```bash
git add apps/playground/index.html
git commit -m "feat(playground): add Stack and Spacer to nav"
```

---

## Task 12: Final verification

- [ ] **Step 1: Run all component tests**

```bash
cd /Users/kofi/_/fluid/.worktrees/session-18
pnpm --filter @neutro/fluid test:component 2>&1 | tail -30
```

Expected: all passing, 0 failures.

- [ ] **Step 2: Run unit tests (core should still be green)**

```bash
pnpm --filter @neutro/fluid test:unit --run 2>&1 | tail -10
```

Expected: all passing.

- [ ] **Step 3: Start playground and smoke-test manually**

```bash
pnpm --filter playground dev 2>&1 &
```

Open `http://localhost:5173` in a browser. Verify:
- Stack and Spacer appear in the sidebar under Layout
- Clicking each loads the page without errors
- Tier switcher changes the tier (check via browser devtools `ledger.tier`)
- Dark mode toggle applies correctly

- [ ] **Step 4: Start Storybook and verify stories**

```bash
pnpm --filter storybook dev 2>&1 &
```

Open Storybook, navigate to Layout / Stack and Layout / Spacer. Verify:
- All stories render without console errors
- Controls panel shows the expected controls

- [ ] **Step 5: Final commit (if any fixes needed)**

```bash
git add -p
git commit -m "fix(stack|spacer): address verification issues"
```
