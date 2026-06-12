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
