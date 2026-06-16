// fluid-stack is a layout container with no ARIA role of its own.
// These tests verify that the stack's child content remains accessible
// when shuffled or wrapped — any structural changes must not break AT traversal.
import { test, expect, waitForStory } from '../../testing/axe-fixture'

const STORIES = [
  'layout-stack--vertical',
  'layout-stack--horizontal',
  'layout-stack--gap-variants',
  'layout-stack--align-center',
  'layout-stack--justify-space-between',
  'layout-stack--wrap',
]

for (const id of STORIES) {
  test(`${id} — zero axe violations`, async ({ page, makeAxeBuilder }) => {
    await page.goto(`/iframe.html?id=${id}&viewMode=story`)
    await waitForStory(page, 'fluid-stack')
    const results = await makeAxeBuilder().analyze()
    expect(results.violations).toEqual([])
  })
}
