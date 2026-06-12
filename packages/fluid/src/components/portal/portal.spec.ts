import { FluidTestUtils } from '../../testing/utils'
import { zIndex, LAYER_Z_BASE } from '../../core/z-index'

function waitForEvent(el: Element, event: string): Promise<void> {
  return new Promise(r => el.addEventListener(event, () => r(), { once: true }))
}

function nextFrame(): Promise<void> {
  return new Promise(r => requestAnimationFrame(() => r()))
}

describe('fluid-portal', () => {
  before(async () => {
    await import('./index')
  })

  afterEach(() => {
    FluidTestUtils.cleanup()
    document.querySelectorAll('fluid-portal-root').forEach(el => el.remove())
  })

  // ─── Test 1: lifecycle ────────────────────────────────────────────────────

  describe('portal root lifecycle', () => {
    it('appends fluid-portal-root to document.body on mount', async () => {
      await FluidTestUtils.mount('<fluid-portal><span>hi</span></fluid-portal>')
      const root = document.body.querySelector('fluid-portal-root')
      if (!root) throw new Error('Expected fluid-portal-root in document.body')
    })

    it('removes fluid-portal-root from document.body on disconnect', async () => {
      const portal = await FluidTestUtils.mount(
        '<fluid-portal><span>hi</span></fluid-portal>'
      )
      const unmountedP = waitForEvent(portal, 'fluid:unmounted')
      portal.remove()
      await unmountedP
      const root = document.body.querySelector('fluid-portal-root')
      if (root) throw new Error('fluid-portal-root still in document.body after disconnect')
    })
  })

  // ─── Test 2: content relocation ───────────────────────────────────────────

  describe('content relocation', () => {
    it('moves slotted children into fluid-portal-root', async () => {
      await FluidTestUtils.mount(
        '<fluid-portal><span id="portal-target">content</span></fluid-portal>'
      )
      const root = document.body.querySelector('fluid-portal-root')
      if (!root) throw new Error('No fluid-portal-root found')
      if (!root.querySelector('#portal-target')) {
        throw new Error('Slotted content not found inside fluid-portal-root')
      }
    })
  })

  // ─── Test 3: theme token inheritance ─────────────────────────────────────

  describe('theme inheritance', () => {
    it('copies --fluid-* tokens from nearest fluid-theme ancestor to portal root', async () => {
      const fixture = document.createElement('div')
      document.body.appendChild(fixture)

      const theme = document.createElement('fluid-theme')
      theme.style.setProperty('--fluid-hue-brand', '200')
      fixture.appendChild(theme)

      const portal = document.createElement('fluid-portal')
      portal.innerHTML = '<span>content</span>'
      const mountedP = new Promise<void>(r => {
        portal.addEventListener('fluid:mounted', () => r(), { once: true })
      })
      theme.appendChild(portal)
      await mountedP

      const root = document.body.querySelector('fluid-portal-root')!
      const hue = root.style.getPropertyValue('--fluid-hue-brand')

      fixture.remove()
      document.querySelectorAll('fluid-portal-root').forEach(el => el.remove())

      if (hue !== '200') {
        throw new Error(`Expected --fluid-hue-brand: 200 on portal root, got: "${hue}"`)
      }
    })
  })

  // ─── Test 4: MutationObserver re-snapshot ────────────────────────────────

  describe('MutationObserver re-snapshot', () => {
    it('re-snapshots tokens when fluid-theme style attribute changes (setProperty)', async () => {
      const fixture = document.createElement('div')
      document.body.appendChild(fixture)

      const theme = document.createElement('fluid-theme')
      theme.style.setProperty('--fluid-hue-brand', '220')
      fixture.appendChild(theme)

      const portal = document.createElement('fluid-portal')
      portal.innerHTML = '<span>content</span>'
      const mountedP = new Promise<void>(r => {
        portal.addEventListener('fluid:mounted', () => r(), { once: true })
      })
      theme.appendChild(portal)
      await mountedP

      const root = document.body.querySelector('fluid-portal-root')!

      theme.style.setProperty('--fluid-hue-brand', '300')
      await nextFrame()

      const hue = root.style.getPropertyValue('--fluid-hue-brand')

      fixture.remove()
      document.querySelectorAll('fluid-portal-root').forEach(el => el.remove())

      if (hue !== '300') {
        throw new Error(`Expected --fluid-hue-brand: 300 after setProperty, got: "${hue}"`)
      }
    })

    it('removes stale --fluid-* tokens from portal root when they are removed from fluid-theme', async () => {
      const fixture = document.createElement('div')
      document.body.appendChild(fixture)

      const theme = document.createElement('fluid-theme')
      theme.style.setProperty('--fluid-hue-brand', '220')
      fixture.appendChild(theme)

      const portal = document.createElement('fluid-portal')
      portal.innerHTML = '<span>content</span>'
      const mountedP = new Promise<void>(r => {
        portal.addEventListener('fluid:mounted', () => r(), { once: true })
      })
      theme.appendChild(portal)
      await mountedP

      const root = document.body.querySelector('fluid-portal-root')!
      // Token is present initially
      if (!root.style.getPropertyValue('--fluid-hue-brand')) {
        fixture.remove()
        document.querySelectorAll('fluid-portal-root').forEach(el => el.remove())
        throw new Error('Expected --fluid-hue-brand to be set initially')
      }

      // Remove the token from the theme
      theme.style.removeProperty('--fluid-hue-brand')
      await nextFrame()

      const hue = root.style.getPropertyValue('--fluid-hue-brand')
      fixture.remove()
      document.querySelectorAll('fluid-portal-root').forEach(el => el.remove())

      if (hue !== '') {
        throw new Error(`Expected --fluid-hue-brand to be removed from portal root, got: "${hue}"`)
      }
    })
  })

  // ─── Test 5: fluidtheme:change re-snapshot ───────────────────────────────

  describe('fluidtheme:change re-snapshot', () => {
    it('re-snapshots tokens when fluidtheme:change event fires', async () => {
      const fixture = document.createElement('div')
      document.body.appendChild(fixture)

      const theme = document.createElement('fluid-theme')
      theme.style.setProperty('--fluid-hue-brand', '220')
      fixture.appendChild(theme)

      const portal = document.createElement('fluid-portal')
      portal.innerHTML = '<span>content</span>'
      const mountedP = new Promise<void>(r => {
        portal.addEventListener('fluid:mounted', () => r(), { once: true })
      })
      theme.appendChild(portal)
      await mountedP

      const root = document.body.querySelector('fluid-portal-root')!

      theme.style.setProperty('--fluid-hue-brand', '150')
      theme.dispatchEvent(new CustomEvent('fluidtheme:change', { bubbles: true }))
      await nextFrame()

      const hue = root.style.getPropertyValue('--fluid-hue-brand')

      fixture.remove()
      document.querySelectorAll('fluid-portal-root').forEach(el => el.remove())

      if (hue !== '150') {
        throw new Error(`Expected --fluid-hue-brand: 150 after fluidtheme:change, got: "${hue}"`)
      }
    })
  })

  // ─── Test 6: no listener leaks ───────────────────────────────────────────

  describe('cleanup on disconnect', () => {
    it('calls MutationObserver.disconnect() and removes fluidtheme:change listener on unmount', async () => {
      const fixture = document.createElement('div')
      document.body.appendChild(fixture)

      const theme = document.createElement('fluid-theme')
      theme.style.setProperty('--fluid-hue-brand', '220')
      fixture.appendChild(theme)

      // Spy on theme instance's removeEventListener to catch 'fluidtheme:change' removal
      let changeListenerRemoved = false
      const origRemoveListener = EventTarget.prototype.removeEventListener
      theme.removeEventListener = function (
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: EventListenerOptions | boolean
      ) {
        if (type === 'fluidtheme:change') changeListenerRemoved = true
        return origRemoveListener.call(this, type, listener, options)
      }

      // Spy on MutationObserver.prototype.disconnect
      let moDisconnects = 0
      const origMODisconnect = MutationObserver.prototype.disconnect
      MutationObserver.prototype.disconnect = function () {
        moDisconnects++
        return origMODisconnect.call(this)
      }

      const portal = document.createElement('fluid-portal')
      portal.innerHTML = '<span>content</span>'
      const mountedP = new Promise<void>(r => {
        portal.addEventListener('fluid:mounted', () => r(), { once: true })
      })
      theme.appendChild(portal)
      await mountedP

      // Reset after mount so we only count disconnects from the unmount phase
      moDisconnects = 0

      const unmountedP = waitForEvent(portal, 'fluid:unmounted')
      portal.remove()
      await unmountedP

      const finalMODisconnects = moDisconnects
      const wasRemoved = changeListenerRemoved

      // Restore prototype before any further cleanup
      MutationObserver.prototype.disconnect = origMODisconnect

      fixture.remove()
      document.querySelectorAll('fluid-portal-root').forEach(el => el.remove())

      // Portal registers 2 MutationObservers: childObserver + themeObserver
      if (finalMODisconnects !== 2) {
        throw new Error(
          `Expected exactly 2 MutationObserver.disconnect() calls on unmount ` +
          `(childObserver + themeObserver), got ${finalMODisconnects}`
        )
      }
      if (!wasRemoved) {
        throw new Error(
          'fluidtheme:change event listener was not removed from theme element on disconnect'
        )
      }
    })
  })

  // ─── Test 7: z-index ─────────────────────────────────────────────────────

  describe('z-index allocation', () => {
    it('sets z-index in the overlay range on mount', async () => {
      await FluidTestUtils.mount('<fluid-portal><span>c</span></fluid-portal>')
      const root = document.body.querySelector('fluid-portal-root')!
      const z = parseInt(root.style.zIndex, 10)
      const base = LAYER_Z_BASE['overlay']
      if (isNaN(z) || z < base || z >= base + 400) {
        throw new Error(`Expected z-index in [${base}, ${base + 400}), got ${z}`)
      }
    })

    it('releases z-index on disconnect (counter decrements)', async () => {
      const before = zIndex.allocate('overlay')
      zIndex.release('overlay')

      const portal = await FluidTestUtils.mount(
        '<fluid-portal><span>c</span></fluid-portal>'
      )

      const afterMount = zIndex.allocate('overlay')
      zIndex.release('overlay')

      const unmountedP = waitForEvent(portal, 'fluid:unmounted')
      portal.remove()
      await unmountedP

      const afterRelease = zIndex.allocate('overlay')
      zIndex.release('overlay')

      if (afterRelease >= afterMount) {
        throw new Error(
          `z-index counter did not decrement after disconnect: ` +
          `before=${before}, afterMount=${afterMount}, afterRelease=${afterRelease}`
        )
      }
    })
  })
})
