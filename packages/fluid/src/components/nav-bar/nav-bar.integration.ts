import { test, expect, waitForStory } from '../../testing/axe-fixture'

// Tests the expanded and shrunk static states (no scroll needed — CSS vars set inline).
// The Default story is intentionally omitted: it requires scrolling to shrink and
// the aria-label warning fires only in DEV; forced-colors and reduced-motion are
// covered by the spec tests at the component level.
const STORIES = [
  'navigation-nav-bar--expanded-state',
  'navigation-nav-bar--shrunk-state',
]

for (const id of STORIES) {
  test(`${id} — zero axe violations`, async ({ page, makeAxeBuilder }) => {
    await page.goto(`/iframe.html?id=${id}&viewMode=story`)
    await waitForStory(page, 'fluid-nav-bar')
    const results = await makeAxeBuilder().analyze()
    expect(results.violations).toEqual([])
  })
}
