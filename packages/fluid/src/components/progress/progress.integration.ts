import { test, expect, waitForStory } from '../../testing/axe-fixture'

const STORIES = [
  'feedback-progress--linear-determinate',
  'feedback-progress--linear-indeterminate',
  'feedback-progress--circular-determinate',
  'feedback-progress--circular-indeterminate',
  'feedback-progress--all-values',
]

for (const id of STORIES) {
  test(`${id} — zero axe violations`, async ({ page, makeAxeBuilder }) => {
    await page.goto(`/iframe.html?id=${id}&viewMode=story`)
    await waitForStory(page, 'fluid-progress')
    const results = await makeAxeBuilder().analyze()
    expect(results.violations).toEqual([])
  })
}
