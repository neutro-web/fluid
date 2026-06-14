import type { Preview } from '@storybook/web-components'
import '@neutro/fluid/theme/default'
import '@neutro/fluid/theme/dark'

declare global {
  interface Window {
    __FLUID_FORCE_TIER__?: string
    FluidLedger?: { forceTier(tier: string): void }
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
          { value: 'matte',       title: 'Matte' },
          { value: 'frosted',     title: 'Frosted' },
          { value: 'crystalline', title: 'Crystalline' },
          { value: 'optical',     title: 'Optical' },
        ],
        dynamicTitle: true,
      },
    },
    colorScheme: {
      description: 'Color scheme — sets data-theme on <html>. "system" removes the attribute so prefers-color-scheme applies.',
      defaultValue: 'light',
      toolbar: {
        title: 'Color Scheme',
        icon: 'circlehollow',
        items: [
          { value: 'light',  title: 'Light',  icon: 'sun' },
          { value: 'dark',   title: 'Dark',   icon: 'moon' },
          { value: 'system', title: 'System', icon: 'circle' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (story, context) => {
      const tier = (context.globals['fluidTier'] as string | undefined) ?? 'crystalline'
      const scheme = (context.globals['colorScheme'] as string | undefined) ?? 'light'

      window.__FLUID_FORCE_TIER__ = tier
      // FluidLedger is exposed on window in DEV mode — call forceTier() so
      // the in-memory ledger updates immediately (the window property alone
      // only applies at initial module load).
      window.FluidLedger?.forceTier(tier)

      if (scheme === 'system') {
        document.documentElement.removeAttribute('data-theme')
        document.body.style.background = ''
      } else {
        // 'light' sets data-theme="light" so it overrides prefers-color-scheme:dark
        // via the :not([data-theme="light"]) guard in dark.css.
        document.documentElement.setAttribute('data-theme', scheme)
        // Also set the canvas background so the glass surface has something to blur against
        document.body.style.background = scheme === 'dark' ? '#1a1a1a' : ''
      }

      return story()
    },
  ],
}

export default preview
