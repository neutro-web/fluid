import { test, expect, waitForStory } from '../../testing/axe-fixture'

const STORIES = [
  'feedback-skeleton--default',
  'feedback-skeleton--text-lines',
  'feedback-skeleton--circle-avatar',
  'feedback-skeleton--card-skeleton',
  'feedback-skeleton--all-variants',
]

for (const id of STORIES) {
  test(`${id} — zero axe violations`, async ({ page, makeAxeBuilder }) => {
    await page.goto(`/iframe.html?id=${id}&viewMode=story`)
    await waitForStory(page, 'fluid-skeleton')
    const results = await makeAxeBuilder().analyze()
    expect(results.violations).toEqual([])
  })
}
