import type { StorybookConfig } from '@storybook/web-components-vite'
import path from 'path'

// Resolve @neutro/fluid to this worktree's packages/fluid source so that
// components that exist here but not yet in main are visible to Storybook.
const fluidSrc = path.resolve(__dirname, '../../../packages/fluid/src')

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
  async viteFinal(config) {
    config.resolve ??= {}
    config.resolve.alias = [
      // Theme CSS: @neutro/fluid/theme/<name> → worktree src/tokens/themes/<name>.css
      {
        find: /^@neutro\/fluid\/theme\/(.+)$/,
        replacement: `${fluidSrc}/tokens/themes/$1.css`,
      },
      // Component subpath exports: @neutro/fluid/<name> → worktree src/components/<name>/index.ts
      {
        find: /^@neutro\/fluid\/(.+)$/,
        replacement: `${fluidSrc}/components/$1/index.ts`,
      },
      // Root export: @neutro/fluid → worktree src/index.ts
      {
        find: '@neutro/fluid',
        replacement: `${fluidSrc}/index.ts`,
      },
      ...(Array.isArray(config.resolve.alias) ? config.resolve.alias : []),
    ]
    return config
  },
}

export default config
