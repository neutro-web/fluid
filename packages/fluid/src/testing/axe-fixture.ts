import { test as base, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

type AxeFixture = {
  makeAxeBuilder: () => AxeBuilder
}

export const test = base.extend<AxeFixture>({
  makeAxeBuilder: async ({ page }, use) => {
    const builder = () =>
      new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    await use(builder)
  },
})

export { expect } from '@playwright/test'

export async function waitForStory(page: Page, tag: string): Promise<void> {
  await page.waitForFunction(
    (t: string) => !!customElements.get(t),
    tag,
    { timeout: 15_000 },
  )
  await page.locator(tag).first().waitFor({ timeout: 10_000 })
}
