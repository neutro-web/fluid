import { test, expect, waitForStory } from '../../testing/axe-fixture'

const STORIES = [
  'navigation-tab-bar--horizontal',
  'navigation-tab-bar--vertical',
  'navigation-tab-bar--manual-activation',
  'navigation-tab-bar--with-disabled-tab',
  'navigation-tab-bar--controlled',
]

for (const id of STORIES) {
  test(`${id} — zero axe violations`, async ({ page, makeAxeBuilder }) => {
    await page.goto(`/iframe.html?id=${id}&viewMode=story`)
    await waitForStory(page, 'fluid-tab-bar')
    const results = await makeAxeBuilder().analyze()
    expect(results.violations).toEqual([])
  })
}
