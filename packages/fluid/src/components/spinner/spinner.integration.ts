import { test, expect, waitForStory } from '../../testing/axe-fixture'

const STORIES = [
  'feedback-spinner--default',
  'feedback-spinner--all-sizes',
  'feedback-spinner--in-button',
  'feedback-spinner--in-card',
  'feedback-spinner--custom-label',
]

for (const id of STORIES) {
  test(`${id} — zero axe violations`, async ({ page, makeAxeBuilder }) => {
    await page.goto(`/iframe.html?id=${id}&viewMode=story`)
    await waitForStory(page, 'fluid-spinner')
    const results = await makeAxeBuilder().analyze()
    expect(results.violations).toEqual([])
  })
}
