import { test, expect, waitForStory } from '../../testing/axe-fixture'

// Tests the expanded and shrunk static states (no scroll needed — CSS vars set inline).
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

// Crit 15: forced-colors behavioral verification.
// Playwright supports forcedColors emulation, so we can actually render the component
// under forced-colors and check computed styles — not just inspect the stylesheet.
test('forced-colors: backdrop-filter disabled and border-bottom present', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' })
  await page.goto('/iframe.html?id=navigation-nav-bar--expanded-state&viewMode=story')
  await waitForStory(page, 'fluid-nav-bar')

  const styles = await page.evaluate(() => {
    const el = document.querySelector('fluid-nav-bar') as HTMLElement
    const computed = window.getComputedStyle(el)
    return {
      backdropFilter: computed.getPropertyValue('backdrop-filter'),
      webkitBackdropFilter: computed.getPropertyValue('-webkit-backdrop-filter'),
      borderBottom: computed.getPropertyValue('border-bottom'),
    }
  })

  expect(styles.backdropFilter).toBe('none')
  expect(styles.borderBottom).not.toBe('')
  expect(styles.borderBottom).not.toMatch(/^none/)
})

test('forced-colors: shrink still functions (height responds to --fluid-nav-shrink-progress)', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' })
  await page.goto('/iframe.html?id=navigation-nav-bar--shrunk-state&viewMode=story')
  await waitForStory(page, 'fluid-nav-bar')

  // The shrunk-state story sets --fluid-nav-shrink-progress:1 and shrink-amount:0.6
  // → height = fullHeight * (1 - 1 * 0.4) = fullHeight * 0.6. Verify height < full.
  const { shrunkHeight, fullHeight } = await page.evaluate(() => {
    const el = document.querySelector('fluid-nav-bar') as HTMLElement
    const shrunkH = el.getBoundingClientRect().height
    // Read full height from the CSS var (set inline on the element)
    const fullH = parseFloat(window.getComputedStyle(el).getPropertyValue('--fluid-nav-full-height') || '64')
    return { shrunkHeight: shrunkH, fullHeight: fullH }
  })

  expect(shrunkHeight).toBeGreaterThan(0)
  expect(shrunkHeight).toBeLessThan(fullHeight)
})
