# `@neutro/fluid` — Testing Strategy
**Version:** 1.0
**Scope:** All testing tiers for the library itself and guidance for consumer testing.
**Context:** Designed for LLM-powered development (Claude Code) where tests act as the executable specification.

---

## Philosophy

**Tests are the specification, not a verification afterthought.**

In LLM-powered development, the implementation is generated from the spec. Tests that precisely encode the spec's assertions catch the precise ways LLMs deviate — wrong physics constants, missed accessibility attributes, incorrect event names, off-by-one spring values. Vague tests produce vague implementations.

Three rules:
1. **A test must fail before the implementation exists.** No implementation without a failing test.
2. **Physics constants are golden values.** Spring presets, blur radii, IOR — tested by exact numeric assertion, not visual inspection.
3. **Accessibility is not optional testing.** axe-core runs on every component in every state in every PR.

---

## Testing Tiers

### Tier 1 — Unit Tests (Vitest)

**What:** Pure logic, zero browser APIs. Runs in Node.js via Vitest.

**Why Vitest over Jest:** ESM-native (no transform hacks), faster cold start, native TypeScript support, Vite ecosystem alignment, and `vi.fn()` / `vi.spyOn()` API is cleaner.

**Scope:**
- Spring solver math (all three damping regimes, exact closed-form values)
- AnimationDriver (batching, visibility handling, dt normalization)
- Velocity registry (interruption, state tracking)
- Capability ledger (feature detection logic, tier assignment, override logic)
- Token validation (locked token detection, attribute validators)
- Color math (oklch relative color computation, hsl fallback, contrast ratio)
- ZIndexAllocator (allocation, release, layer bounds)
- WillChangeManager (ref counting)
- Gesture state machines (state transitions, not browser events)
- Context protocol (context-request / context-provide event logic)
- i18n map lookups and fallback chain
- FluidI18n translation resolution

**Spring solver — golden values (example):**
```typescript
describe('spring solver — snappy preset', () => {
  const config = { mass: 0.5, stiffness: 400, damping: 28 }

  it('settles within 300ms', () => {
    let state = { value: 0, velocity: 0 }
    let t = 0
    while (t < 0.3) {
      state = stepSpring(config, state, 1, 0.016)
      t += 0.016
    }
    expect(state.value).toBeCloseTo(1.0, 2)
  })

  it('overshoots slightly (underdamped)', () => {
    let max = 0
    let state = { value: 0, velocity: 0 }
    for (let i = 0; i < 50; i++) {
      state = stepSpring(config, state, 1, 0.016)
      max = Math.max(max, state.value)
    }
    expect(max).toBeGreaterThan(1.0)  // must overshoot
    expect(max).toBeLessThan(1.1)     // but not wildly
  })

  it('produces NaN for no input', () => {
    expect(() => stepSpring({ mass: 0, stiffness: 400, damping: 28 }, { value: 0, velocity: 0 }, 1, 0.016))
      .toThrow()
  })

  it('is frame-rate independent: same result at 60fps and 120fps', () => {
    const run = (fps: number) => {
      const dt = 1 / fps
      let state = { value: 0, velocity: 0 }
      for (let i = 0; i < fps * 0.5; i++) state = stepSpring(config, state, 1, dt)
      return state.value
    }
    expect(run(60)).toBeCloseTo(run(120), 2)
  })
})
```

**Velocity preservation — golden values:**
```typescript
it('preserves velocity on interruption', () => {
  // Spring animating toward 1.0
  let state = { value: 0, velocity: 0 }
  for (let i = 0; i < 5; i++) state = stepSpring(snappy, state, 1.0, 0.016)
  const interruptedVelocity = state.velocity

  // Now redirected toward 0.0 — should start with the interrupted velocity
  const newState = { value: state.value, velocity: interruptedVelocity }
  const firstStep = stepSpring(snappy, newState, 0.0, 0.016)

  // Value should move in the direction of 0 but starting from interrupted velocity
  // Not a cold start from velocity = 0
  const coldStart = stepSpring(snappy, { value: state.value, velocity: 0 }, 0.0, 0.016)
  expect(firstStep.value).not.toBeCloseTo(coldStart.value, 3)
})
```

---

### Tier 2 — Component Tests (@web/test-runner + Playwright)

**What:** Individual Custom Elements in a real browser. Shadow DOM, attribute reflection, event dispatch, form association, keyboard behavior.

**Why not jsdom:** Custom Elements `connectedCallback`, Shadow DOM, `ElementInternals`, `CSS.supports()`, and `backdrop-filter` do not work in jsdom. Real browser required.

**Tool:** `@web/test-runner` with `@web/test-runner-playwright` (uses real Chromium/Firefox/WebKit). Vitest browser mode is an alternative when it stabilizes.

**Scope per component:**

Each component gets a spec file at `components/[name]/[name].spec.ts` covering:

```typescript
// Example: fluid-button.spec.ts
import { expect, fixture, html } from '@open-wc/testing'
import { axe } from 'axe-playwright'
import '@neutro/fluid/button'

describe('fluid-button', () => {
  // --- Structure ---
  it('has correct shadow DOM structure', async () => {
    const el = await fixture(html`<fluid-button>Save</fluid-button>`)
    const surface = el.shadowRoot!.querySelector('[part="surface"]')
    expect(surface).to.exist
    expect(surface!.tagName.toLowerCase()).to.equal('button')
  })

  // --- ARIA ---
  it('is accessible in default state', async () => {
    const el = await fixture(html`<fluid-button>Save</fluid-button>`)
    await expect(el).to.be.accessible()  // axe-core
  })

  it('icon-button requires aria-label', async () => {
    // Tests dev-mode warning fires for missing aria-label
    const warnSpy = sinon.spy(console, 'warn')
    await fixture(html`<fluid-icon-button></fluid-icon-button>`)
    expect(warnSpy.calledWith(sinon.match('aria-label'))).to.be.true
  })

  // --- Attributes ---
  it('reflects variant attribute', async () => {
    const el = await fixture(html`<fluid-button variant="destructive">Delete</fluid-button>`)
    expect(el.getAttribute('variant')).to.equal('destructive')
    // Visual: surface should have destructive styling
    const surface = el.shadowRoot!.querySelector('[part="surface"]') as HTMLElement
    expect(getComputedStyle(surface).getPropertyValue('--fluid-color-action'))
      .to.include('destructive')
  })

  // --- Events ---
  it('dispatches fluid:activate on press', async () => {
    const el = await fixture(html`<fluid-button>Save</fluid-button>`)
    const handler = sinon.spy()
    el.addEventListener('fluid:activate', handler)
    el.shadowRoot!.querySelector('button')!.click()
    expect(handler.calledOnce).to.be.true
  })

  it('dispatches fluid:activate on Enter key', async () => {
    const el = await fixture(html`<fluid-button>Save</fluid-button>`)
    el.focus()
    const handler = sinon.spy()
    el.addEventListener('fluid:activate', handler)
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(handler.calledOnce).to.be.true
  })

  // --- Form association ---
  it('submits parent form on press when type=submit', async () => {
    const el = await fixture(html`
      <form id="f">
        <fluid-button type="submit">Submit</fluid-button>
      </form>
    `)
    const submitSpy = sinon.spy()
    el.addEventListener('submit', submitSpy)
    el.querySelector('fluid-button')!.shadowRoot!.querySelector('button')!.click()
    expect(submitSpy.calledOnce).to.be.true
  })

  // --- Controlled state ---
  it('does not toggle when disabled', async () => {
    const el = await fixture(html`<fluid-button disabled>Save</fluid-button>`)
    const handler = sinon.spy()
    el.addEventListener('fluid:activate', handler)
    el.shadowRoot!.querySelector('button')!.click()
    expect(handler.called).to.be.false
  })

  // --- Spring physics ---
  it('uses snappy spring on press', async () => {
    // Asserts that pressing reads the correct spring config from the component
    const el = await fixture(html`<fluid-button>Save</fluid-button>`) as any
    expect(el.spring).to.deep.equal({ mass: 0.5, stiffness: 400, damping: 28 })
  })

  // --- Tier rendering ---
  it('renders at Matte tier without errors', async () => {
    window.__FLUID_FORCE_TIER__ = 'matte'
    const el = await fixture(html`<fluid-button>Save</fluid-button>`)
    expect(el.shadowRoot).to.exist
    expect(() => el.shadowRoot!.innerHTML).to.not.throw()
    delete window.__FLUID_FORCE_TIER__
  })
})
```

**Standard test matrix per component:**
- [ ] Shadow DOM structure exists
- [ ] All `::part()` names are present
- [ ] ARIA role and attributes are correct
- [ ] axe-core passes in default state
- [ ] axe-core passes in each interactive state (hover, focus, active, disabled)
- [ ] All `fluid:*` events dispatch correctly
- [ ] All `fluid:*` events dispatch on keyboard activation
- [ ] Attribute changes are reflected correctly
- [ ] Spring preset matches spec
- [ ] Layer assignment matches spec
- [ ] Renders without errors at all 4 tiers
- [ ] `prefers-reduced-motion` produces no transform animations
- [ ] `prefers-contrast: more` meets WCAG AA
- [ ] Form-associated components: `setFormValue` called correctly
- [ ] Controlled/uncontrolled modes both work
- [ ] Disconnects cleanly (no disposer leaks via WeakRef check)

---

### Tier 3 — Integration Tests (Playwright)

**What:** Multiple components interacting, compound components, context propagation, overlay stacking, form workflows. Full page, real browser.

**Scope:**
- `fluid-theme` → all nested components receive correct tokens
- `fluid-tabs` ↔ `fluid-tab-panel` communication via context protocol
- `fluid-form` disabled propagation to all nested inputs
- `fluid-dialog` opens → scroll lock applied, background recedes, focus trapped
- `fluid-dialog` closes → scroll lock released, focus returns to trigger
- `fluid-dropdown` z-index stacking: two dropdowns open simultaneously, later-opened has higher z-index
- `fluid-portal` → portaled component inherits theme tokens from non-root `fluid-theme`
- Form submission: `fluid-text-field` + `fluid-button[type=submit]` → `form.submit` fires
- Overlay recession: `fluid-sheet` opens → sibling content dims to 0.85 opacity (Crystalline tier)
- `fluid-virtual-list` + `fluid-scroll-view` → scroll offset drives windowing correctly
- Context protocol: nested `fluid-select` inside `fluid-accordion` inside `fluid-dialog` — all get correct context

**Example:**
```typescript
test('fluid-dialog traps focus and returns it on close', async ({ page }) => {
  await page.goto('/test/dialog-focus')

  const trigger = page.locator('fluid-button#open-dialog')
  await trigger.click()

  // Focus trapped inside dialog
  await page.keyboard.press('Tab')
  const focused = await page.evaluate(() => document.activeElement?.tagName)
  expect(focused).not.toBe('BODY')

  // Background content is inert
  const background = page.locator('#background-content')
  await expect(background).toHaveAttribute('inert')

  // Close dialog
  await page.keyboard.press('Escape')

  // Focus returned to trigger
  const refocused = await page.evaluate(() =>
    document.activeElement === document.querySelector('fluid-button#open-dialog')
  )
  expect(refocused).toBe(true)

  // Background content is no longer inert
  await expect(background).not.toHaveAttribute('inert')
})
```

---

### Tier 4 — Visual Regression Tests (Playwright + Chromatic)

**What:** Screenshot comparison for glass rendering, material tiers, motion states, dark mode, high contrast, RTL.

**Strategy:**

**Storybook stories** are the visual test surface. Every component has stories for:
- All variants (primary, secondary, destructive, etc.)
- All interactive states (default, hover, focus, active, disabled, loading, error)
- All tiers (Matte, Frosted, Crystalline — Optical tested separately)
- Light + dark mode
- High contrast mode
- RTL layout
- Viewport sizes (360px, 768px, 1280px, 1920px)

**Chromatic** runs visual regression CI on every PR:
- Detects pixel-level changes
- Catches unintended glass rendering regressions
- Reviewer approves intentional changes

**Playwright visual tests** for interaction states (hover, press, mid-animation):
```typescript
test('fluid-button press deformation', async ({ page }) => {
  await page.goto('/test/button-press')
  const button = page.locator('fluid-button')

  // Capture press state mid-animation
  await button.dispatchEvent('pointerdown')
  await page.waitForTimeout(50)  // mid-spring

  await expect(page).toHaveScreenshot('button-pressed-mid-spring.png', {
    maxDiffPixelRatio: 0.02  // 2% pixel diff allowed
  })

  await button.dispatchEvent('pointerup')
})
```

**Tier rendering matrix:**
```typescript
const tiers = ['matte', 'frosted', 'crystalline'] as const
const modes = ['light', 'dark'] as const

for (const tier of tiers) {
  for (const mode of modes) {
    test(`fluid-card ${tier} ${mode}`, async ({ page }) => {
      await page.goto(`/test/card?tier=${tier}&mode=${mode}`)
      await expect(page.locator('fluid-card')).toHaveScreenshot(
        `card-${tier}-${mode}.png`
      )
    })
  }
}
```

**Optical tier visual tests** run separately on Chrome only, not in standard CI:
```bash
pnpm test:visual:optical  # Chrome-specific, manual or nightly
```

---

### Tier 5 — Property-Based / Adversarial Tests (fast-check + Vitest)

**What:** Generate random inputs and assert invariants hold. Particularly valuable for physics systems where the input space is continuous.

**Tool:** `fast-check` — property-based testing library.

**Spring physics invariants:**
```typescript
import fc from 'fast-check'
import { stepSpring } from '@neutro/fluid/core'

describe('spring physics invariants', () => {
  it('always converges (no infinite oscillation)', () => {
    fc.assert(fc.property(
      fc.record({
        mass:      fc.float({ min: 0.1, max: 10 }),
        stiffness: fc.float({ min: 10, max: 1000 }),
        damping:   fc.float({ min: 1, max: 100 }),
      }),
      fc.float({ min: -1000, max: 1000 }),  // initial value
      fc.float({ min: -1000, max: 1000 }),  // target
      (config, initial, target) => {
        let state = { value: initial, velocity: 0 }
        for (let i = 0; i < 1000; i++) {
          state = stepSpring(config, state, target, 0.016)
          // Must never produce NaN or Infinity
          if (!isFinite(state.value) || !isFinite(state.velocity)) return false
        }
        // Must converge within 1000 frames (~16 seconds)
        return Math.abs(state.value - target) < 0.01
      }
    ))
  })

  it('velocity is always finite', () => {
    fc.assert(fc.property(
      fc.record({ mass: fc.float({ min: 0.1, max: 10 }), stiffness: fc.float({ min: 10, max: 1000 }), damping: fc.float({ min: 0, max: 100 }) }),
      fc.float({ min: -100, max: 100 }),  // initial velocity
      (config, initVelocity) => {
        let state = { value: 0, velocity: initVelocity }
        for (let i = 0; i < 60; i++) {
          state = stepSpring(config, state, 1, 0.016)
          if (!isFinite(state.velocity)) return false
        }
        return true
      }
    ))
  })
})
```

**Gesture state machine invariants:**
```typescript
it('drag state machine never gets stuck', () => {
  fc.assert(fc.property(
    fc.array(fc.constantFrom('pointerdown', 'pointermove', 'pointerup', 'pointercancel'), { maxLength: 50 }),
    (events) => {
      const gesture = new FluidDragGesture()
      events.forEach(e => gesture.handleEvent(new PointerEvent(e)))
      // After pointerup or pointercancel, must not be in 'dragging' state
      const hasEnded = events.some(e => e === 'pointerup' || e === 'pointercancel')
      if (hasEnded) {
        return gesture.state !== 'dragging'
      }
      return true
    }
  ))
})
```

**Color math invariants:**
```typescript
it('contrast ratio auto-correction always meets WCAG AA', () => {
  fc.assert(fc.property(
    fc.float({ min: 0, max: 1 }),  // env luminance
    fc.float({ min: 0, max: 1 }),  // tint alpha
    (luminance, alpha) => {
      const adjusted = FluidTheme.autoCorrectContrast({ luminance, alpha })
      return computeContrastRatio(adjusted.textColor, adjusted.background) >= 4.5
    }
  ))
})
```

---

### Tier 6 — Accessibility Tests (axe-playwright in CI)

**What:** axe-core runs against every component in every documented state on every PR.

**Strategy:** axe runs inside Playwright tests, not as a standalone pass. Every Tier 3 integration test also runs axe:
```typescript
test('dialog is accessible', async ({ page, makeAxeBuilder }) => {
  await page.goto('/test/dialog')
  await page.click('fluid-button#open')
  const results = await makeAxeBuilder().analyze()
  expect(results.violations).toEqual([])
})
```

**Separate accessibility audit CI step:** Weekly full audit of the Storybook across all stories, all viewports, all modes. Results posted as a PR comment.

**Scope:** Every component in the ARIA pattern table must pass axe-core with zero violations in:
- Default state
- Each interactive state (hover/focus/active/disabled)
- Dark mode
- High contrast mode
- RTL mode

---

### Tier 7 — Cross-Browser Tests (Playwright Multi-Browser)

**What:** Run the Tier 2 component tests and Tier 3 integration tests across browsers.

**Matrix:**
| Browser | Engine | Tier Target | How |
|---|---|---|---|
| Chrome 128+ | Blink | Optical (forced) | Playwright Chromium |
| Chrome 115 | Blink | Crystalline (forced) | BrowserStack |
| Safari 18 | WebKit | Crystalline | Playwright WebKit |
| Safari 14 | WebKit | Frosted (forced) | BrowserStack |
| Firefox 128 | Gecko | Crystalline | Playwright Firefox |
| Firefox 103 | Gecko | Frosted (forced) | BrowserStack |

**Tier forcing in cross-browser tests:**
```typescript
test.use({
  launchOptions: {
    args: ['--disable-features=HoudiniCSSPaint']  // force Crystalline on Chrome for testing
  }
})
// or
beforeEach(async ({ page }) => {
  await page.addInitScript(() => { window.__FLUID_FORCE_TIER__ = 'frosted' })
})
```

**BrowserStack** runs nightly on the PR merge commit. PR CI only uses local Playwright browsers (fast). BrowserStack is the "real device" gate before a release.

---

### Tier 8 — Performance Regression Tests

**What:** Catch bundle size regressions, animation jank, and rendering performance regressions.

**Bundle size — `size-limit`:**
```json
[
  { "path": "@neutro/fluid/core",    "limit": "10 kB", "gzip": true },
  { "path": "@neutro/fluid/button",  "limit": "4 kB",  "gzip": true },
  { "path": "@neutro/fluid/card",    "limit": "3 kB",  "gzip": true },
  { "path": "@neutro/fluid/theme/*", "limit": "2 kB",  "gzip": true }
]
```
Runs on every PR. Fails if a package exceeds its limit. Reviewers approve intentional size increases.

**Animation performance — Playwright performance metrics:**
```typescript
test('100 staggered cards animate without frame drops', async ({ page }) => {
  await page.goto('/test/stagger-100')
  const metrics = await page.evaluate(() => {
    return new Promise<{droppedFrames: number}>(resolve => {
      const observer = new PerformanceObserver(list => {
        const frames = list.getEntries().filter(e => e.entryType === 'frame')
        const dropped = frames.filter((f: any) => f.duration > 32).length  // > 2 frames
        resolve({ droppedFrames: dropped })
      })
      observer.observe({ entryTypes: ['frame'] })
      // trigger stagger
      document.querySelector<any>('fluid-button#start').click()
      setTimeout(() => observer.disconnect(), 3000)
    })
  })
  expect(metrics.droppedFrames).toBeLessThan(3)  // max 3 dropped frames in 3 seconds
})
```

**Lighthouse CI** — runs on every PR preview deployment, fails if Performance < 90.

---

## Testing for LLM-Powered Development

When Claude Code generates implementations, the test suite acts as the executable specification. Key practices:

### Test-First Workflow
1. Design doc section defines behavior
2. Test file is written encoding that behavior precisely (written by Claude Code from the spec)
3. Implementation is written to pass the tests (written by Claude Code)
4. Tests run in CI — implementation is accepted only when all tests pass

### Golden Value Tests
Physics constants, spring presets, blur values, spring damping ratios — all tested with exact numeric assertions. LLMs cannot hallucinate constants that pass golden tests.

```typescript
// Encode the spec precisely — no wiggle room
it('snappy preset has exact values', () => {
  expect(SPRING_PRESETS.snappy).toEqual({ mass: 0.5, stiffness: 400, damping: 28 })
})

it('regular glass blur is 20px', () => {
  expect(CSS_TOKENS['--fluid-blur-regular']).toBe('20px')
})
```

### Adversarial Test Prompts
For Claude Code sessions implementing complex components, include adversarial prompts in the test comments:
```typescript
// ADVERSARIAL: This test specifically checks that the velocity is NOT reset to 0
// on interruption. A common LLM error is to start the new spring from velocity=0.
it('preserves velocity on spring interruption — not zero', ...)
```

### Diff-Based Review
After each implementation session:
1. Run the full test suite
2. Run `pnpm test:visual` — review any screenshot diffs
3. Run axe-playwright — zero tolerance for new violations
4. Run size-limit — approve or reject size changes

### Test Coverage Requirements
- Unit tests: 100% line coverage for `core/` (spring, ledger, driver, gesture)
- Component tests: all items in the standard test matrix
- Integration tests: all compound component relationships
- Visual regression: all components × all tiers × light+dark

---

## CI Pipeline

```yaml
# .github/workflows/ci.yml
jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - pnpm test:unit      # Vitest, all core/ units

  component:
    runs-on: ubuntu-latest
    steps:
      - pnpm test:component  # @web/test-runner, real Chromium/Firefox/WebKit

  integration:
    runs-on: ubuntu-latest
    steps:
      - pnpm test:integration  # Playwright, full page tests

  accessibility:
    runs-on: ubuntu-latest
    steps:
      - pnpm test:a11y  # axe-playwright, all components all states

  visual:
    runs-on: ubuntu-latest
    steps:
      - pnpm build:storybook
      - chromatic --project-token=$CHROMATIC_TOKEN  # visual regression

  size:
    runs-on: ubuntu-latest
    steps:
      - pnpm build
      - pnpm size-limit  # bundle size gate

  property-based:
    runs-on: ubuntu-latest
    steps:
      - pnpm test:property  # fast-check adversarial tests

  cross-browser-nightly:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - pnpm test:browserstack  # BrowserStack real devices, nightly only
```

---

## Consumer Testing Utilities

```typescript
// @neutro/fluid/testing — subpath export for consumer test helpers
import { FluidTestUtils, FluidAccessibilityUtils, FluidSpringUtils } from '@neutro/fluid/testing'

// Mount a component and wait for it to be ready
const el = await FluidTestUtils.mount('<fluid-button>Save</fluid-button>')

// Force a specific capability tier for testing
FluidTestUtils.mockTier('frosted')
FluidTestUtils.restoreTier()

// Wait for all active springs on an element to settle
await FluidTestUtils.waitForSpringSettle(el)

// Assert component is accessible
await FluidAccessibilityUtils.assertAccessible(el)

// Test spring behavior
const result = FluidSpringUtils.simulate('snappy', { from: 0, to: 1, durationMs: 300 })
expect(result.finalValue).toBeCloseTo(1.0, 2)
expect(result.didOvershoot).toBe(true)
```

---

## Tool Summary

| Tier | Tool | Why |
|---|---|---|
| Unit | **Vitest** | ESM-native, fast, TypeScript-first |
| Component | **@web/test-runner** | Real browser Custom Elements support |
| Integration | **Playwright** | Full page, multi-browser, reliable |
| Visual | **Storybook + Chromatic** | Component-level, CI-integrated |
| Accessibility | **axe-playwright** | Embedded in Playwright, zero-config |
| Property-based | **fast-check** | Physics invariants, adversarial |
| Cross-browser | **Playwright + BrowserStack** | Tier verification on real browsers |
| Performance | **size-limit + Lighthouse CI** | Regression prevention |
