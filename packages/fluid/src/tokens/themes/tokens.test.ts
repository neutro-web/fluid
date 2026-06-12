import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

const __dirname = dirname(fileURLToPath(import.meta.url))
const read = (file: string) => readFileSync(resolve(__dirname, file), 'utf8')

describe('default.css', () => {
  const css = read('default.css')

  describe('locked physical tokens', () => {
    it('defines --fluid-blur-thin: 8px', () => {
      expect(css).toMatch(/--fluid-blur-thin:\s*8px/)
    })
    it('defines --fluid-blur-regular: 20px', () => {
      expect(css).toMatch(/--fluid-blur-regular:\s*20px/)
    })
    it('defines --fluid-blur-thick: 40px', () => {
      expect(css).toMatch(/--fluid-blur-thick:\s*40px/)
    })
    it('defines --fluid-vibrancy: 1.8', () => {
      expect(css).toMatch(/--fluid-vibrancy:\s*1\.8/)
    })
    it('defines --fluid-ior: 0.012', () => {
      expect(css).toMatch(/--fluid-ior:\s*0\.012/)
    })
    it('defines --fluid-fresnel-strength: 0.18', () => {
      expect(css).toMatch(/--fluid-fresnel-strength:\s*0\.18/)
    })
    it('defines --fluid-dispersion: 0.4px', () => {
      expect(css).toMatch(/--fluid-dispersion:\s*0\.4px/)
    })
    it('defines --fluid-elasticity-max: 64px', () => {
      expect(css).toMatch(/--fluid-elasticity-max:\s*64px/)
    })
    it('defines --fluid-scroll-friction: 0.95', () => {
      expect(css).toMatch(/--fluid-scroll-friction:\s*0\.95/)
    })
  })

  describe('spring presets', () => {
    it('snappy: mass 0.5, stiffness 400, damping 28', () => {
      expect(css).toMatch(/--fluid-spring-snappy-mass:\s*0\.5/)
      expect(css).toMatch(/--fluid-spring-snappy-stiffness:\s*400/)
      expect(css).toMatch(/--fluid-spring-snappy-damping:\s*28/)
    })
    it('bouncy: mass 1.0, stiffness 300, damping 20', () => {
      expect(css).toMatch(/--fluid-spring-bouncy-mass:\s*1\.0/)
      expect(css).toMatch(/--fluid-spring-bouncy-stiffness:\s*300/)
      expect(css).toMatch(/--fluid-spring-bouncy-damping:\s*20/)
    })
    it('gentle: mass 1.0, stiffness 120, damping 20', () => {
      expect(css).toMatch(/--fluid-spring-gentle-mass:\s*1\.0/)
      expect(css).toMatch(/--fluid-spring-gentle-stiffness:\s*120/)
      expect(css).toMatch(/--fluid-spring-gentle-damping:\s*20/)
    })
    it('smooth: mass 1.0, stiffness 200, damping 26', () => {
      expect(css).toMatch(/--fluid-spring-smooth-mass:\s*1\.0/)
      expect(css).toMatch(/--fluid-spring-smooth-stiffness:\s*200/)
      expect(css).toMatch(/--fluid-spring-smooth-damping:\s*26/)
    })
    it('precise: mass 0.8, stiffness 500, damping 32', () => {
      expect(css).toMatch(/--fluid-spring-precise-mass:\s*0\.8/)
      expect(css).toMatch(/--fluid-spring-precise-stiffness:\s*500/)
      expect(css).toMatch(/--fluid-spring-precise-damping:\s*32/)
    })
  })

  describe('HSL color scales', () => {
    const hues = ['brand', 'neutral', 'destructive', 'success', 'caution']
    const steps = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']

    for (const hue of hues) {
      it(`defines all 10 HSL scale steps for ${hue}`, () => {
        for (const step of steps) {
          expect(css).toContain(`--fluid-color-${hue}-${step}`)
        }
      })
      it(`defines --fluid-hue-${hue}`, () => {
        expect(css).toContain(`--fluid-hue-${hue}`)
      })
      it(`defines --fluid-sat-${hue}`, () => {
        expect(css).toContain(`--fluid-sat-${hue}`)
      })
      it(`defines --fluid-color-${hue} base`, () => {
        expect(css).toContain(`--fluid-color-${hue}:`)
      })
      it(`defines semantic aliases for ${hue}`, () => {
        expect(css).toContain(`--fluid-color-${hue}-subtle`)
        expect(css).toContain(`--fluid-color-${hue}-strong`)
        expect(css).toContain(`--fluid-color-${hue}-on-surface`)
      })
    }
  })

  describe('oklch @supports block', () => {
    it('wraps in @supports (color: oklch(from red 1 1 1))', () => {
      expect(css).toContain('@supports (color: oklch(from red 1 1 1))')
    })
    it('defines oklch brand-50 with proportional chroma', () => {
      expect(css).toContain('oklch(from var(--fluid-color-brand) 0.97 calc(c * 0.25) h)')
    })
    it('defines oklch brand-100', () => {
      expect(css).toContain('oklch(from var(--fluid-color-brand) 0.93 calc(c * 0.40) h)')
    })
    it('defines oklch brand-200', () => {
      expect(css).toContain('oklch(from var(--fluid-color-brand) 0.88 calc(c * 0.55) h)')
    })
    it('defines oklch brand-300', () => {
      expect(css).toContain('oklch(from var(--fluid-color-brand) 0.80 calc(c * 0.70) h)')
    })
    it('defines oklch brand-400', () => {
      expect(css).toContain('oklch(from var(--fluid-color-brand) 0.70 calc(c * 0.85) h)')
    })
    it('defines oklch scales for all 5 hues', () => {
      const hues = ['brand', 'neutral', 'destructive', 'success', 'caution']
      for (const hue of hues) {
        expect(css).toContain(`oklch(from var(--fluid-color-${hue})`)
      }
    })
  })

  describe('depth/shadow tokens', () => {
    it('defines --fluid-shadow-surface', () => {
      expect(css).toContain('--fluid-shadow-surface:')
    })
    it('defines --fluid-shadow-raised', () => {
      expect(css).toContain('--fluid-shadow-raised:')
    })
    it('defines --fluid-shadow-overlay', () => {
      expect(css).toContain('--fluid-shadow-overlay:')
    })
    it('defines --fluid-shadow-sheet', () => {
      expect(css).toContain('--fluid-shadow-sheet:')
    })
    it('surface shadow uses expected values', () => {
      expect(css).toContain('0 1px 3px hsl(0 0% 0% / 0.08)')
    })
    it('sheet shadow uses expected values', () => {
      expect(css).toContain('0 20px 25px hsl(0 0% 0% / 0.15)')
    })
  })

  describe('typography tokens', () => {
    it('defines --fluid-font-family', () => {
      expect(css).toContain('--fluid-font-family:')
    })
    it('defines --fluid-font-family-mono', () => {
      expect(css).toContain('--fluid-font-family-mono:')
    })
    it('defines font size scale', () => {
      for (const size of ['xs', 'sm', 'base', 'md', 'lg', 'xl', '2xl', '3xl']) {
        expect(css).toContain(`--fluid-font-size-${size}:`)
      }
    })
    it('defines font weight scale', () => {
      for (const w of ['light', 'regular', 'medium', 'semibold', 'bold']) {
        expect(css).toContain(`--fluid-font-weight-${w}:`)
      }
    })
    it('defines --fluid-font-weight-on-glass', () => {
      expect(css).toContain('--fluid-font-weight-on-glass:')
    })
    it('defines line height scale', () => {
      for (const lh of ['tight', 'snug', 'normal', 'relaxed']) {
        expect(css).toContain(`--fluid-line-height-${lh}:`)
      }
    })
    it('defines letter spacing scale', () => {
      for (const ls of ['tight', 'normal', 'wide', 'wider']) {
        expect(css).toContain(`--fluid-letter-spacing-${ls}:`)
      }
    })
    it('defines --fluid-dir RTL multiplier', () => {
      expect(css).toContain('--fluid-dir:')
    })
  })

  describe('geometry tokens', () => {
    it('defines radius scale', () => {
      for (const r of ['sm', 'md', 'lg', 'xl', '2xl', 'full']) {
        expect(css).toContain(`--fluid-radius-${r}:`)
      }
    })
    it('defines spacing scale', () => {
      for (const s of ['1', '2', '3', '4', '5', '6', '8', '10', '12', '16']) {
        expect(css).toContain(`--fluid-space-${s}:`)
      }
    })
  })

  describe('tint tokens', () => {
    it('defines --fluid-tint-light', () => {
      expect(css).toContain('--fluid-tint-light:')
    })
    it('defines --fluid-tint-dark', () => {
      expect(css).toContain('--fluid-tint-dark:')
    })
    it('defines --fluid-tint-alpha', () => {
      expect(css).toContain('--fluid-tint-alpha:')
    })
  })
})

describe('dark.css', () => {
  const css = read('dark.css')

  it('scopes overrides in @media (prefers-color-scheme: dark)', () => {
    expect(css).toContain('@media (prefers-color-scheme: dark)')
  })
  it('scopes overrides to [data-theme="dark"]', () => {
    expect(css).toContain('[data-theme="dark"]')
  })
  it('overrides --fluid-tint-light with low alpha', () => {
    expect(css).toMatch(/--fluid-tint-light:\s*hsl\(0 0% 100% \/ 0\.12\)/)
  })
  it('overrides --fluid-tint-dark with high alpha', () => {
    expect(css).toMatch(/--fluid-tint-dark:\s*hsl\(0 0% 0% \/ 0\.65\)/)
  })
  it('overrides --fluid-tint-alpha to 0.12', () => {
    expect(css).toMatch(/--fluid-tint-alpha:\s*0\.12/)
  })
  it('overrides brand color scale in both scopes', () => {
    expect(css).toContain('--fluid-color-brand-50:')
    expect(css).toContain('--fluid-color-brand-900:')
  })
  it('overrides shadow tokens for dark mode', () => {
    expect(css).toContain('--fluid-shadow-surface:')
    expect(css).toContain('--fluid-shadow-sheet:')
  })
  it('does not touch locked physical tokens', () => {
    expect(css).not.toMatch(/--fluid-blur-thin:/)
    expect(css).not.toMatch(/--fluid-ior:/)
    expect(css).not.toMatch(/--fluid-vibrancy:/)
  })
})

describe('high-contrast.css', () => {
  const css = read('high-contrast.css')

  it('scopes to @media (prefers-contrast: more)', () => {
    expect(css).toContain('@media (prefers-contrast: more)')
  })
  it('sets --fluid-tint-light alpha to 0.95', () => {
    expect(css).toMatch(/--fluid-tint-light:\s*hsl\(0 0% 100% \/ 0\.95\)/)
  })
  it('sets --fluid-tint-dark alpha to 0.95', () => {
    expect(css).toMatch(/--fluid-tint-dark:\s*hsl\(0 0% 0% \/ 0\.95\)/)
  })
  it('sets --fluid-tint-alpha to 0.95', () => {
    expect(css).toMatch(/--fluid-tint-alpha:\s*0\.95/)
  })
  it('does not touch locked physical tokens', () => {
    expect(css).not.toMatch(/--fluid-blur-thin:/)
    expect(css).not.toMatch(/--fluid-spring-snappy-mass:/)
  })
  it('defines complete 50-900 ramp for destructive', () => {
    const steps = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']
    for (const step of steps) {
      expect(css).toContain(`--fluid-color-destructive-${step}`)
    }
  })
  it('defines complete 50-900 ramp for success', () => {
    const steps = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']
    for (const step of steps) {
      expect(css).toContain(`--fluid-color-success-${step}`)
    }
  })
  it('defines complete 50-900 ramp for caution', () => {
    const steps = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']
    for (const step of steps) {
      expect(css).toContain(`--fluid-color-caution-${step}`)
    }
  })
  it('is wrapped in @layer fluid.theme', () => {
    expect(css).toContain('@layer fluid.theme')
  })
})

describe('@layer cascade ordering', () => {
  it('default.css declares @layer fluid.base, fluid.theme order', () => {
    const css = read('default.css')
    expect(css).toContain('@layer fluid.base, fluid.theme')
  })
  it('default.css wraps :root tokens in @layer fluid.base', () => {
    const css = read('default.css')
    expect(css).toContain('@layer fluid.base')
  })
  it('dark.css wraps overrides in @layer fluid.theme', () => {
    const css = read('dark.css')
    expect(css).toContain('@layer fluid.theme')
  })
  it('high-contrast.css wraps overrides in @layer fluid.theme', () => {
    const css = read('high-contrast.css')
    expect(css).toContain('@layer fluid.theme')
  })
})

describe('anti-fouc.css', () => {
  const css = read('anti-fouc.css')

  const components = [
    'fluid-button', 'fluid-icon-button', 'fluid-fab', 'fluid-card',
    'fluid-section', 'fluid-divider', 'fluid-theme', 'fluid-fieldset',
    'fluid-stack', 'fluid-spacer', 'fluid-visually-hidden', 'fluid-empty-state',
    'fluid-skeleton', 'fluid-spinner', 'fluid-progress', 'fluid-nav-bar',
    'fluid-tab-bar', 'fluid-tabs', 'fluid-tab', 'fluid-tab-panel',
    'fluid-sidebar', 'fluid-breadcrumb',
    'fluid-back-button', 'fluid-scroll-view', 'fluid-parallax-layer',
    'fluid-depth-stage', 'fluid-portal', 'fluid-morphing-icon',
    'fluid-frosted-panel', 'fluid-spotlight', 'fluid-image', 'fluid-code-block',
    'fluid-switch', 'fluid-checkbox', 'fluid-radio', 'fluid-text-field',
    'fluid-slider', 'fluid-stepper', 'fluid-select', 'fluid-option',
    'fluid-accordion', 'fluid-accordion-item', 'fluid-form',
    'fluid-search-bar', 'fluid-autocomplete', 'fluid-otp-input', 'fluid-number-input',
    'fluid-date-picker', 'fluid-color-picker', 'fluid-file-upload',
    'fluid-rating', 'fluid-text-area', 'fluid-list', 'fluid-virtual-list', 'fluid-table',
    'fluid-avatar', 'fluid-badge', 'fluid-chip', 'fluid-tree-view',
    'fluid-timeline', 'fluid-toast', 'fluid-alert-banner', 'fluid-live-activity',
    'fluid-dropdown', 'fluid-context-menu', 'fluid-popover',
    'fluid-dialog', 'fluid-sheet', 'fluid-drawer',
  ]

  it('applies visibility: hidden to all components', () => {
    expect(css).toContain('visibility: hidden')
  })

  for (const comp of components) {
    it(`includes ${comp}:not(:defined)`, () => {
      expect(css).toContain(`${comp}:not(:defined)`)
    })
  }
})

describe('print.css', () => {
  const css = read('print.css')

  it('wraps all rules in @media print', () => {
    expect(css).toContain('@media print')
  })
  it('sets backdrop-filter: none on glass surfaces', () => {
    expect(css).toContain('backdrop-filter: none !important')
  })
  it('sets background: white on glass surfaces', () => {
    expect(css).toContain('background: white !important')
  })
  it('sets box-shadow: none on glass surfaces', () => {
    expect(css).toContain('box-shadow: none !important')
  })
  it('sets border: 1px solid #ccc on glass surfaces', () => {
    expect(css).toContain('border: 1px solid #ccc !important')
  })
  it('sets color: black on glass surfaces', () => {
    expect(css).toContain('color: black !important')
  })
  it('resets shadow tokens to none in :root', () => {
    expect(css).toMatch(/--fluid-shadow-surface:\s+none/)
    expect(css).toMatch(/--fluid-shadow-sheet:\s+none/)
  })
  it('targets fluid-card for print reset', () => {
    expect(css).toContain('fluid-card,')
  })
  it('targets fluid-dialog (hidden for print)', () => {
    expect(css).toContain('fluid-dialog,')
    expect(css).toMatch(/fluid-dialog[\s\S]*?display: none !important/)
  })
})
