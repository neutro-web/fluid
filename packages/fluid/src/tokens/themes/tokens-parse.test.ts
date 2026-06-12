import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { transform } from 'lightningcss'

const __dirname = dirname(fileURLToPath(import.meta.url))

const THEME_FILES = [
  'default.css',
  'dark.css',
  'high-contrast.css',
  'anti-fouc.css',
  'print.css',
] as const

function parseCSS(file: string) {
  const code = readFileSync(resolve(__dirname, file))
  return transform({
    filename: file,
    code,
    // Enable drafts so relative color syntax (oklch relative) is recognized
    // without erroring; lightningcss validates structure not browser support.
    drafts: { customMedia: true },
    errorRecovery: false,
  })
}

// Coverage note: lightningcss validates CSS structure (unbalanced braces,
// unknown at-rules, etc.) but does NOT validate values inside custom properties.
// Per CSS spec, custom property values are stored as raw token streams and are
// not grammar-checked at parse time. A malformed calc() or oklch() inside a
// --fluid-* token will NOT be caught here — it would pass this test and the
// string-presence tests in tokens.test.ts alike.
//
// The only way to verify that --fluid-color-brand-50 etc. actually resolve to
// a real computed colour is to apply the token to a real property and read
// getComputedStyle() in a browser.
//
// TODO: add browser-mode resolution tests (vitest browser / web-test-runner)
// once the test:component infrastructure lands. Apply var(--fluid-color-brand-50)
// to an element, assert getComputedStyle resolves to a non-empty colour string;
// toggle @supports / dark / contrast modes and assert the correct token is active.
// Tracked under the test:component infra task (CLAUDE.md §Running tests).

describe('CSS parse validation — structural validation only (see coverage note above)', () => {
  for (const file of THEME_FILES) {
    it(`${file} parses without structural errors`, () => {
      expect(() => parseCSS(file)).not.toThrow()
    })

    it(`${file} produces non-empty output`, () => {
      const result = parseCSS(file)
      expect(result.code.length).toBeGreaterThan(0)
    })
  }
})

describe('default.css — structural parse checks (token presence after round-trip, not value resolution)', () => {
  it('@layer declaration and tokens survive lightningcss round-trip', () => {
    const result = parseCSS('default.css')
    const css = result.code.toString()
    // lightningcss normalises @layer — verify token names survive transformation
    expect(css).toContain('--fluid-blur-thin')
    expect(css).toContain('--fluid-blur-regular')
    expect(css).toContain('--fluid-blur-thick')
  })

  it('preserves all golden locked values through parse/emit', () => {
    const result = parseCSS('default.css')
    const css = result.code.toString()
    // lightningcss normalises leading zeros: 0.012 → .012, 0.4px → .4px, etc.
    expect(css).toContain('8px')     // blur-thin
    expect(css).toContain('20px')    // blur-regular
    expect(css).toContain('40px')    // blur-thick
    expect(css).toContain('64px')    // elasticity-max
    expect(css).toMatch(/:\s*\.012/) // ior (0.012 normalised to .012)
    expect(css).toMatch(/:\s*\.18/)  // fresnel-strength (0.18 → .18)
    expect(css).toMatch(/\.4px/)     // dispersion (0.4px → .4px)
    expect(css).toMatch(/:\s*\.95/)  // scroll-friction (0.95 → .95)
  })

  it('preserves spring triplet values through parse/emit', () => {
    const result = parseCSS('default.css')
    const css = result.code.toString()
    expect(css).toContain('400')   // snappy stiffness
    expect(css).toContain('300')   // bouncy stiffness
    expect(css).toContain('120')   // gentle stiffness
    expect(css).toContain('200')   // smooth stiffness
    expect(css).toContain('500')   // precise stiffness
  })

  it('preserves @supports block through parse/emit', () => {
    const result = parseCSS('default.css')
    const css = result.code.toString()
    // oklch relative color syntax must survive the parse round-trip
    expect(css).toContain('oklch(')
    expect(css).toContain('--fluid-color-brand')
  })

  it('preserves calc() expressions in HSL color scale through parse/emit', () => {
    const result = parseCSS('default.css')
    const css = result.code.toString()
    expect(css).toContain('calc(')
    expect(css).toContain('--fluid-sat-brand')
    expect(css).toContain('--fluid-hue-brand')
  })
})

describe('dark.css — parse checks', () => {
  it('preserves @layer fluid.theme through parse/emit', () => {
    const result = parseCSS('dark.css')
    const css = result.code.toString()
    expect(css).toContain('--fluid-tint-light')
    expect(css).toContain('--fluid-tint-dark')
  })
})

describe('high-contrast.css — parse checks', () => {
  it('all 10 steps present for each hue after parse/emit', () => {
    const result = parseCSS('high-contrast.css')
    const css = result.code.toString()
    const hues = ['brand', 'neutral', 'destructive', 'success', 'caution']
    const steps = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']
    for (const hue of hues) {
      for (const step of steps) {
        expect(css).toContain(`--fluid-color-${hue}-${step}`)
      }
    }
  })
})

describe('anti-fouc.css — parse checks', () => {
  it('visibility: hidden survives parse/emit', () => {
    const result = parseCSS('anti-fouc.css')
    const css = result.code.toString()
    expect(css).toContain('visibility')
    expect(css).toContain('hidden')
  })
})

describe('print.css — parse checks', () => {
  it('@media print block survives parse/emit', () => {
    const result = parseCSS('print.css')
    const css = result.code.toString()
    expect(css).toContain('backdrop-filter')
    // lightningcss normalises named colour "white" → "#fff"
    expect(css).toMatch(/#fff|white/)
  })
})
