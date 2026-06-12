import { FluidTestUtils } from './utils'
import { FluidAccessibilityUtils } from './accessibility'

describe('FluidTestUtils + FluidAccessibilityUtils smoke tests', () => {
  afterEach(() => {
    FluidTestUtils.cleanup()
    FluidTestUtils.restoreTier()
  })

  it('mount resolves to an HTMLElement in the DOM', async () => {
    const el = await FluidTestUtils.mount('<div role="note" aria-label="test">hello</div>')
    if (!(el instanceof HTMLElement)) throw new Error('Expected HTMLElement')
    if (!document.body.contains(el)) throw new Error('Expected element to be in the DOM')
  })

  it('assertAccessible passes for a simple accessible element', async () => {
    const el = await FluidTestUtils.mount('<button>Click me</button>')
    await FluidAccessibilityUtils.assertAccessible(el)
  })

  it('assertAccessibleInState passes for a labelled interactive state', async () => {
    const el = await FluidTestUtils.mount('<button disabled aria-label="Save">Save</button>')
    await FluidAccessibilityUtils.assertAccessibleInState(el, 'disabled', () => {
      // element is already disabled; state is pre-set
    })
  })

  it('mockTier sets window.__FLUID_FORCE_TIER__ and restoreTier clears it', () => {
    FluidTestUtils.mockTier('matte')
    if ((window as any).__FLUID_FORCE_TIER__ !== 'matte') {
      throw new Error(`Expected __FLUID_FORCE_TIER__ === "matte", got ${(window as any).__FLUID_FORCE_TIER__}`)
    }
    FluidTestUtils.restoreTier()
    if ((window as any).__FLUID_FORCE_TIER__ !== undefined) {
      throw new Error(`Expected __FLUID_FORCE_TIER__ to be cleared, got ${(window as any).__FLUID_FORCE_TIER__}`)
    }
  })

  it('waitForSpringSettle resolves immediately for elements with no active springs', async () => {
    const el = await FluidTestUtils.mount('<div>no springs</div>')
    await FluidTestUtils.waitForSpringSettle(el)
  })
})
