import { test, expect, waitForStory } from '../../testing/axe-fixture'

const STORIES = [
  'surface-empty-state--default',
  'surface-empty-state--headline-only',
  'surface-empty-state--with-description',
  'surface-empty-state--with-actions',
  'surface-empty-state--with-illustration-slot',
  'surface-empty-state--all-variants-side-by-side',
]

for (const id of STORIES) {
  test(`${id} — zero axe violations`, async ({ page, makeAxeBuilder }) => {
    await page.goto(`/iframe.html?id=${id}&viewMode=story`)
    await waitForStory(page, 'fluid-empty-state')
    const results = await makeAxeBuilder().analyze()
    expect(results.violations).toEqual([])
  })
}
