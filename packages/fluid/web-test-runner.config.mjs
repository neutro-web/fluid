import { playwrightLauncher } from '@web/test-runner-playwright'
import { esbuildPlugin } from '@web/dev-server-esbuild'

export default {
  files: ['src/core/**/*.spec.ts', 'src/components/**/*.spec.ts', 'src/testing/**/*.spec.ts'],
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
        <script>
          /* DEV flag: make FluidElement dev-mode warnings/errors active in tests */
          window.process = { env: { NODE_ENV: 'development' } }

          /*
           * FluidError interceptor — registered BEFORE mocha loads so it fires
           * first in the registration-order listener queue. Tests call
           * window.__expectFluidError() to register a one-shot resolver; the
           * interceptor calls stopImmediatePropagation() so mocha never sees
           * the error as a test failure.
           */
          window.__fluidErrorResolvers = []
          window.addEventListener('error', function(e) {
            if (e.error && e.error.name === 'FluidError' && window.__fluidErrorResolvers.length > 0) {
              var resolve = window.__fluidErrorResolvers.shift()
              e.preventDefault()
              e.stopImmediatePropagation()
              resolve(e.error)
            }
          })
          window.__expectFluidError = function() {
            return new Promise(function(resolve) {
              window.__fluidErrorResolvers.push(resolve)
            })
          }
        </script>
        <script type="module" src="${testFramework}"></script>
      </body>
    </html>
  `,
}
