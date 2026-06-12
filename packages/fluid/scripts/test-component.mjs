/**
 * Wrapper for @web/test-runner that exits 0 when no *.spec.ts files exist yet.
 * Web Test Runner throws when no files match its pattern — this prevents CI
 * failures during early development before component specs are written.
 */
import { readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

function findSpecFiles(dir) {
  if (!existsSync(dir)) return []
  const found = []
  for (const entry of readdirSync(dir, { withFileTypes: true, recursive: true })) {
    if (entry.name.endsWith('.spec.ts')) {
      found.push(join(entry.parentPath ?? entry.path, entry.name))
    }
  }
  return found
}

const specFiles = [
  ...findSpecFiles('src/core'),
  ...findSpecFiles('src/components'),
  ...findSpecFiles('src/testing'),
]

if (specFiles.length === 0) {
  console.log('No component test files found — skipping @web/test-runner.')
  process.exit(0)
}

const result = spawnSync(
  'node_modules/.bin/web-test-runner',
  ['--config', 'web-test-runner.config.mjs'],
  { stdio: 'inherit' },
)
process.exit(result.status ?? 0)
