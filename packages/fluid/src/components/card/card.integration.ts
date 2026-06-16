import { test, expect, waitForStory } from '../../testing/axe-fixture'

const STORIES = [
  'surface-card--default',
  'surface-card--interactive',
  'surface-card--content-only',
  'surface-card--with-actions',
  'surface-card--elevation-flat',
  'surface-card--elevation-raised',
  'surface-card--elevation-floating',
  'surface-card--loading',
  'surface-card--error',
]

for (const id of STORIES) {
  test(`${id} — zero axe violations`, async ({ page, makeAxeBuilder }) => {
    await page.goto(`/iframe.html?id=${id}&viewMode=story`)
    await waitForStory(page, 'fluid-card')
    const results = await makeAxeBuilder().analyze()
    expect(results.violations).toEqual([])
  })
}
