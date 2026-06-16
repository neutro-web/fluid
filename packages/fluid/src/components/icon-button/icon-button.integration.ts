import { test, expect, waitForStory } from '../../testing/axe-fixture'

const STORIES = [
  'actions-icon-button--primary',
  'actions-icon-button--secondary',
  'actions-icon-button--ghost',
  'actions-icon-button--default',
  'actions-icon-button--disabled',
  'actions-icon-button--loading',
  'actions-icon-button--all-variants',
  'actions-icon-button--sizes',
  'actions-icon-button--all-states',
]

for (const id of STORIES) {
  test(`${id} — zero axe violations`, async ({ page, makeAxeBuilder }) => {
    await page.goto(`/iframe.html?id=${id}&viewMode=story`)
    await waitForStory(page, 'fluid-icon-button')
    const results = await makeAxeBuilder().analyze()
    expect(results.violations).toEqual([])
  })
}
