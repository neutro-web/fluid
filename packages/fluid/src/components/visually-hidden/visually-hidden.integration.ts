// fluid-visually-hidden is explicitly an accessibility aid — these tests are the primary
// gate ensuring that labels hidden from sighted users are still surfaced to axe/AT.
import { test, expect, waitForStory } from '../../testing/axe-fixture'

const STORIES = [
  'utility-visually-hidden--default',
  'utility-visually-hidden--button-row-actions',
  'utility-visually-hidden--icon-button-toolbar',
  'utility-visually-hidden--badge-count',
  'utility-visually-hidden--form-field-hint',
]

for (const id of STORIES) {
  test(`${id} — zero axe violations`, async ({ page, makeAxeBuilder }) => {
    await page.goto(`/iframe.html?id=${id}&viewMode=story`)
    await waitForStory(page, 'fluid-visually-hidden')
    const results = await makeAxeBuilder().analyze()
    expect(results.violations).toEqual([])
  })
}
