import { test, expect, waitForStory } from '../../testing/axe-fixture'

const STORIES = [
  'actions-button--primary',
  'actions-button--secondary',
  'actions-button--destructive',
  'actions-button--ghost',
  'actions-button--disabled',
  'actions-button--loading',
  'actions-button--with-leading-icon',
  'actions-button--with-trailing-icon',
  'actions-button--sizes',
  'actions-button--all-variants',
]

for (const id of STORIES) {
  test(`${id} — zero axe violations`, async ({ page, makeAxeBuilder }) => {
    await page.goto(`/iframe.html?id=${id}&viewMode=story`)
    await waitForStory(page, 'fluid-button')
    const results = await makeAxeBuilder().analyze()
    expect(results.violations).toEqual([])
  })
}
