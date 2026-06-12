import type * as axeCore from 'axe-core'

// axe-core is loaded as a UMD global in browser test environments.
// In @web/test-runner, web-test-runner.config.mjs injects it via testRunnerHtml.
// In Playwright/Storybook, load axe-core UMD before calling these utilities.
function getAxe(): typeof axeCore {
  const a = (window as any).axe as typeof axeCore | undefined
  if (!a) {
    throw new Error('[fluid] axe-core not found on window. Load axe-core via script tag before using FluidAccessibilityUtils.')
  }
  return a
}

export const FluidAccessibilityUtils = {
  /**
   * Runs axe-core on `el` and throws a descriptive error if any violations are found.
   * Designed for use in @web/test-runner component tests (browser context).
   */
  async assertAccessible(el: Element): Promise<void> {
    const results = await getAxe().run(el)
    if (results.violations.length > 0) {
      const msgs = results.violations
        .map(v => `  [${v.impact ?? 'unknown'}] ${v.id}: ${v.description}`)
        .join('\n')
      throw new Error(`Accessibility violations found on <${el.tagName.toLowerCase()}>:\n${msgs}`)
    }
  },

  /**
   * Applies `setup()` to put `el` into the named `state`, then asserts no axe violations.
   * The `state` label is included in failure output for test context.
   */
  async assertAccessibleInState(
    el: Element,
    state: string,
    setup: () => void | Promise<void>,
  ): Promise<void> {
    await setup()
    const results = await getAxe().run(el)
    if (results.violations.length > 0) {
      const msgs = results.violations
        .map(v => `  [${v.impact ?? 'unknown'}] ${v.id}: ${v.description}`)
        .join('\n')
      throw new Error(`Accessibility violations in state "${state}" on <${el.tagName.toLowerCase()}>:\n${msgs}`)
    }
  },
}
