import { defineConfig } from 'tsup'
import { cpSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WORKLETS_SRC = resolve(__dirname, 'src/worklets')

const sharedEntry = {
  'core/index':          'src/core/index.ts',
  'eslint-plugin/index': 'src/eslint-plugin/index.ts',
  'index':               'src/index.ts',
  'testing/index':    'src/testing/index.ts',
}

export default defineConfig([
  // ESM bundle
  {
    entry: sharedEntry,
    format: ['esm'],
    outDir: 'dist/esm',
    dts: false,
    splitting: false,
    sourcemap: true,
    clean: true,
    esbuildOptions(opts) {
      opts.define = { 'process.env.NODE_ENV': '"production"' }
    },
    async onSuccess() {
      if (existsSync(WORKLETS_SRC)) {
        cpSync(WORKLETS_SRC, resolve(__dirname, 'dist/worklets'), { recursive: true })
      }
    },
  },
  // CJS bundle
  {
    entry: sharedEntry,
    format: ['cjs'],
    outDir: 'dist/cjs',
    dts: false,
    splitting: false,
    sourcemap: true,
    clean: false,
    esbuildOptions(opts) {
      opts.define = { 'process.env.NODE_ENV': '"production"' }
    },
  },
  // TypeScript declarations only
  {
    entry: sharedEntry,
    format: ['esm'],
    outDir: 'dist/types',
    dts: { only: true },
    splitting: false,
    clean: false,
  },
])
