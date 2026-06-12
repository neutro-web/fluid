import { playwrightLauncher } from '@web/test-runner-playwright'
import { esbuildPlugin } from '@web/dev-server-esbuild'

export default {
  files: ['src/components/**/*.spec.ts', 'src/testing/**/*.spec.ts'],
  nodeResolve: true,
  plugins: [
    esbuildPlugin({ ts: true }),
  ],
  browsers: [
    playwrightLauncher({ product: 'chromium' }),
  ],
  testFramework: {
    config: {
      timeout: 5000,
    },
  },
  // Inject axe-core as UMD global before the test module loads.
  // axe.js is a UMD bundle (no ESM export), so a script tag is required.
  testRunnerHtml: (testFramework) => `
    <!DOCTYPE html>
    <html>
      <head></head>
      <body>
        <script src="/node_modules/axe-core/axe.js"></script>
        <script type="module" src="${testFramework}"></script>
      </body>
    </html>
  `,
}
