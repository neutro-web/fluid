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
          { value: 'matte',       title: 'Matte' },
          { value: 'frosted',     title: 'Frosted' },
          { value: 'crystalline', title: 'Crystalline' },
          { value: 'optical',     title: 'Optical' },
        ],
        dynamicTitle: true,
      },
    },
    colorScheme: {
      description: 'Color scheme — sets data-theme="dark" on <html> to match dark.css token selector',
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

      window.__FLUID_FORCE_TIER__ = tier

      if (scheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark')
      } else {
        document.documentElement.removeAttribute('data-theme')
      }

      return story()
    },
  ],
}

export default preview
