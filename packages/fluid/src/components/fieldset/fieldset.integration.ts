import { test, expect, waitForStory } from '../../testing/axe-fixture'

const STORIES = [
  'layout-fieldset--default',
  'layout-fieldset--disabled',
  'layout-fieldset--header-actions',
  'layout-fieldset--legend-slot',
  'layout-fieldset--nested',
  'layout-fieldset--interactive',
]

for (const id of STORIES) {
  test(`${id} — zero axe violations`, async ({ page, makeAxeBuilder }) => {
    await page.goto(`/iframe.html?id=${id}&viewMode=story`)
    await waitForStory(page, 'fluid-fieldset')
    const results = await makeAxeBuilder().analyze()
    expect(results.violations).toEqual([])
  })
}
