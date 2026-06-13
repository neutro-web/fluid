import { defineConfig } from 'vite'
import path from 'path'
import { readFileSync } from 'fs'

const fluidRoot = path.resolve(__dirname, '../../packages/fluid')
const fluidPkg = JSON.parse(readFileSync(path.join(fluidRoot, 'package.json'), 'utf-8')) as {
  exports: Record<string, string | { source?: string; import?: string }>
}

function srcOf(value: string | { source?: string; import?: string }): string | null {
  if (typeof value === 'string') return value
  return value.source ?? null
}

// Derive per-subpath aliases from the package.json exports map.
// Handles both bare-string entries (e.g. "./button": "./src/components/button/index.ts")
// and condition-object entries (e.g. "./core": { source: "./src/core/index.ts", ... }).
// The theme/* wildcard entry is handled separately below via a regex alias.
const exportAliases = Object.entries(fluidPkg.exports).flatMap(([key, value]) => {
  if (key === '.' || key === './theme/*') return []
  const src = srcOf(value)
  if (!src || !src.endsWith('.ts')) return []
  return [{
    find: `@neutro/fluid${key.slice(1)}`,
    replacement: path.resolve(fluidRoot, src),
  }]
})

export default defineConfig({
  root: '.',
  base: './',
  server: {
    port: 5500,
    strictPort: true,
  },
  resolve: {
    alias: [
      {
        // theme/* maps to tokens/themes/*.css per package.json exports.
        // Must come first — string aliases do prefix matching, so this regex
        // needs to run before the per-export string aliases.
        find: /^@neutro\/fluid\/theme\/(.+)$/,
        replacement: path.resolve(fluidRoot, 'src/tokens/themes/$1.css'),
      },
      // Per-subpath entries derived from package.json exports (e.g. /button, /core, /testing).
      // NOTE: do NOT add a root "@neutro/fluid" string alias here — string aliases use prefix
      // matching, so it would shadow every "@neutro/fluid/*" subpath alias below it.
      ...exportAliases,
    ],
  },
})
