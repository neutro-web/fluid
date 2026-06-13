import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  root: '.',
  base: './',
  resolve: {
    alias: [
      {
        // theme/* maps to tokens/themes/*.css per package.json exports
        find: /^@neutro\/fluid\/theme\/(.+)$/,
        replacement: path.resolve(__dirname, '../../packages/fluid/src/tokens/themes/$1.css')
      },
      {
        // Component subpaths live at src/components/X/index.ts, not src/X
        // Add one entry per component used in playground pages.
        find: '@neutro/fluid/portal',
        replacement: path.resolve(__dirname, '../../packages/fluid/src/components/portal/index.ts')
      },
      {
        find: /^@neutro\/fluid\/(.+)$/,
        replacement: path.resolve(__dirname, '../../packages/fluid/src/$1')
      }
    ]
  }
})
