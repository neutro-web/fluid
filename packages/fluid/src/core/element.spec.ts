import { FluidElement } from './element'
import type { FluidMaterial } from './element'
import type { FluidLayer } from './z-index'
import type { SpringConfig } from './spring'
import { SPRING_PRESETS } from './spring'

// Each test element needs a unique tag to avoid registry conflicts.
let _counter = 0
function uniqueTag(): string {
  return `test-fluid-el-${_counter++}`
}

type Hooks = {
  onMount?: (self: FluidElement) => void
  onUnmount?: (self: FluidElement) => void
}

function makeElement(tag: string, hooks?: Hooks): typeof FluidElement {
  class TestEl extends FluidElement {
    protected readonly layer: FluidLayer = 'surface'
    protected readonly material: FluidMaterial = 'regular'
    protected readonly spring: SpringConfig = SPRING_PRESETS.snappy
    protected override onMount(): void { hooks?.onMount?.(this) }
    protected override onUnmount(): void { hooks?.onUnmount?.(this) }
  }
  TestEl.define(tag)
  return TestEl
}

/**
 * Registers a one-shot listener for the given event BEFORE any action.
 * Because connectedCallback / disconnectedCallback run synchronously on
 * appendChild / remove, the listener MUST be added before the DOM mutation.
 */
function setupWait(el: Element, eventName: string): Promise<void> {
  return new Promise(resolve => {
    el.addEventListener(eventName, () => resolve(), { once: true })
  })
}

function nextFrame(): Promise<void> {
  return new Promise(r => requestAnimationFrame(() => r()))
}

describe('FluidElement', () => {
  // -----------------------------------------------------------------------
  describe('fluid:mounted event', () => {
    it('fires after onMount() completes', async () => {
      const order: string[] = []
      const tag = uniqueTag()
      makeElement(tag, { onMount: () => order.push('onMount') })

      const el = document.createElement(tag)
      // Register BOTH listeners before connecting so neither misses the synchronous event.
      const mountedPromise = new Promise<void>(resolve => {
        el.addEventListener('fluid:mounted', () => {
          order.push('fluid:mounted')
          resolve()
        }, { once: true })
      })
      document.body.appendChild(el)
      await mountedPromise

      const mountIdx = order.indexOf('onMount')
      const eventIdx = order.indexOf('fluid:mounted')
      if (mountIdx === -1) throw new Error('onMount was not called')
      if (eventIdx === -1) throw new Error('fluid:mounted was not dispatched')
      if (mountIdx >= eventIdx) throw new Error(
        `fluid:mounted fired before onMount: order was [${order.join(', ')}]`
      )

      el.remove()
    })
  })

  // -----------------------------------------------------------------------
  describe('fluid:unmounted event', () => {
    it('fires after onUnmount() completes', async () => {
      const order: string[] = []
      const tag = uniqueTag()
      makeElement(tag, { onUnmount: () => order.push('onUnmount') })

      const el = document.createElement(tag)
      const mountedPromise = setupWait(el, 'fluid:mounted')
      document.body.appendChild(el)
      await mountedPromise

      // Add unmount listener BEFORE removing from DOM.
      const unmountedPromise = new Promise<void>(resolve => {
        el.addEventListener('fluid:unmounted', () => {
          order.push('fluid:unmounted')
          resolve()
        }, { once: true })
      })
      el.remove()
      await unmountedPromise

      const unmountIdx = order.indexOf('onUnmount')
      const eventIdx = order.indexOf('fluid:unmounted')
      if (unmountIdx === -1) throw new Error('onUnmount was not called')
      if (eventIdx === -1) throw new Error('fluid:unmounted was not dispatched')
      if (unmountIdx >= eventIdx) throw new Error(
        `fluid:unmounted fired before onUnmount: order was [${order.join(', ')}]`
      )
    })
  })

  // -----------------------------------------------------------------------
  describe('disposers', () => {
    it('all disposers run on disconnect', async () => {
      const called: number[] = []
      const tag = uniqueTag()
      class TestEl extends FluidElement {
        protected readonly layer: FluidLayer = 'surface'
        protected readonly material: FluidMaterial = 'regular'
        protected readonly spring: SpringConfig = SPRING_PRESETS.snappy
        protected override onMount(): void {
          this.disposers.push(() => called.push(1))
          this.disposers.push(() => called.push(2))
          this.disposers.push(() => called.push(3))
        }
      }
      TestEl.define(tag)

      const el = document.createElement(tag)
      const mountedPromise = setupWait(el, 'fluid:mounted')
      document.body.appendChild(el)
      await mountedPromise

      const unmountedPromise = setupWait(el, 'fluid:unmounted')
      el.remove()
      await unmountedPromise

      if (called.length !== 3) throw new Error(`Expected 3 disposers, got ${called.length}`)
      if (!called.includes(1) || !called.includes(2) || !called.includes(3)) {
        throw new Error(`Not all disposers ran: ${JSON.stringify(called)}`)
      }
    })

    it('disposers array is empty after disconnect', async () => {
      const tag = uniqueTag()
      let instance: FluidElement | null = null
      class TestEl extends FluidElement {
        protected readonly layer: FluidLayer = 'surface'
        protected readonly material: FluidMaterial = 'regular'
        protected readonly spring: SpringConfig = SPRING_PRESETS.snappy
        protected override onMount(): void {
          instance = this
          this.disposers.push(() => {})
          this.disposers.push(() => {})
        }
      }
      TestEl.define(tag)

      const el = document.createElement(tag)
      const mountedPromise = setupWait(el, 'fluid:mounted')
      document.body.appendChild(el)
      await mountedPromise

      const unmountedPromise = setupWait(el, 'fluid:unmounted')
      el.remove()
      await unmountedPromise

      if (!instance) throw new Error('onMount was never called')
      const len = (instance as any).disposers.length
      if (len !== 0) throw new Error(`Expected disposers.length === 0, got ${len}`)
    })
  })

  // -----------------------------------------------------------------------
  describe('DSD hydration guard', () => {
    it('uses existing shadowRoot without calling attachShadow again', async () => {
      const tag = uniqueTag()
      let capturedRoot: ShadowRoot | null = null
      class TestEl extends FluidElement {
        protected readonly layer: FluidLayer = 'surface'
        protected readonly material: FluidMaterial = 'regular'
        protected readonly spring: SpringConfig = SPRING_PRESETS.snappy
        protected override onMount(): void { capturedRoot = this.root }
      }
      TestEl.define(tag)

      // Pre-attach a shadow root to simulate DSD (the browser does this before
      // connectedCallback when parsing <template shadowrootmode="open">).
      const el = document.createElement(tag) as TestEl
      const existingShadow = el.attachShadow({ mode: 'open' })

      // Intercept any further calls to attachShadow on this instance to detect
      // whether the DSD guard incorrectly calls attachShadow a second time.
      let secondAttachCalled = false
      Object.defineProperty(el, 'attachShadow', {
        value: () => {
          secondAttachCalled = true
          return existingShadow
        },
        configurable: true,
      })

      const mountedPromise = setupWait(el, 'fluid:mounted')
      document.body.appendChild(el)
      await mountedPromise

      if (secondAttachCalled) throw new Error(
        'attachShadow was called even though shadowRoot already existed (DSD guard failed)'
      )
      if (capturedRoot !== existingShadow) throw new Error(
        'this.root should reference the pre-existing shadowRoot'
      )

      el.remove()
    })
  })

  // -----------------------------------------------------------------------
  describe('static define()', () => {
    it('silently skips duplicate registration', () => {
      const tag = uniqueTag()
      makeElement(tag)
      let threw = false
      try {
        makeElement(tag)
      } catch {
        threw = true
      }
      if (threw) throw new Error('define() threw on duplicate registration')
    })

    it('registers the element so customElements.get() returns the constructor', () => {
      const tag = uniqueTag()
      const Ctor = makeElement(tag)
      const registered = customElements.get(tag)
      if (registered !== Ctor) {
        throw new Error(
          `customElements.get('${tag}') returned ${registered}, expected the registered constructor`
        )
      }
    })
  })

  // -----------------------------------------------------------------------
  describe('React Strict Mode simulation', () => {
    it('connect → disconnect → connect is idempotent', async () => {
      const mounts: number[] = []
      const unmounts: number[] = []
      const tag = uniqueTag()
      class TestEl extends FluidElement {
        protected readonly layer: FluidLayer = 'surface'
        protected readonly material: FluidMaterial = 'regular'
        protected readonly spring: SpringConfig = SPRING_PRESETS.snappy
        protected override onMount(): void { mounts.push(1) }
        protected override onUnmount(): void { unmounts.push(1) }
      }
      TestEl.define(tag)

      const el = document.createElement(tag)

      // First connect
      let p = setupWait(el, 'fluid:mounted')
      document.body.appendChild(el)
      await p

      // Disconnect
      p = setupWait(el, 'fluid:unmounted')
      el.remove()
      await p

      // Re-connect
      p = setupWait(el, 'fluid:mounted')
      document.body.appendChild(el)
      await p

      if (mounts.length !== 2) throw new Error(`Expected onMount×2, got ${mounts.length}`)
      if (unmounts.length !== 1) throw new Error(`Expected onUnmount×1, got ${unmounts.length}`)
      if (!el.shadowRoot) throw new Error('No shadowRoot after re-connect')

      el.remove()
    })

    it('attachInternals is called exactly once; this.internals is a valid ElementInternals', async () => {
      const tag = uniqueTag()
      let instance: FluidElement | null = null
      class TestEl extends FluidElement {
        protected readonly layer: FluidLayer = 'surface'
        protected readonly material: FluidMaterial = 'regular'
        protected readonly spring: SpringConfig = SPRING_PRESETS.snappy
        protected override onMount(): void { instance = this }
      }
      TestEl.define(tag)

      const el = document.createElement(tag)

      // Spy on attachInternals BEFORE connecting so we capture the first call.
      const originalAttachInternals = HTMLElement.prototype.attachInternals.bind(el)
      let attachCount = 0
      Object.defineProperty(el, 'attachInternals', {
        value: () => {
          attachCount++
          return originalAttachInternals()
        },
        configurable: true,
      })

      // First connect
      let p = setupWait(el, 'fluid:mounted')
      document.body.appendChild(el)
      await p

      // (a) this.internals must be a real ElementInternals after mount
      if (!instance) throw new Error('onMount was never called')
      const internals = (instance as any).internals as ElementInternals
      if (!internals || typeof internals.setFormValue !== 'function') {
        throw new Error('this.internals is not a valid ElementInternals after mount')
      }
      if (attachCount !== 1) throw new Error(`Expected attachInternals×1 after first connect, got ${attachCount}`)

      // Disconnect
      p = setupWait(el, 'fluid:unmounted')
      el.remove()
      await p

      // Re-connect — the ??= guard must prevent a second call
      p = setupWait(el, 'fluid:mounted')
      document.body.appendChild(el)
      await p

      // (b) still exactly one call across the full lifecycle
      if (attachCount !== 1) {
        throw new Error(
          `attachInternals called ${attachCount} times across connect→disconnect→connect; ` +
          `expected exactly 1 (??= guard broken)`
        )
      }

      el.remove()
    })

    it('disposers from first mount do not accumulate into second mount', async () => {
      const called: number[] = []
      const tag = uniqueTag()
      class TestEl extends FluidElement {
        protected readonly layer: FluidLayer = 'surface'
        protected readonly material: FluidMaterial = 'regular'
        protected readonly spring: SpringConfig = SPRING_PRESETS.snappy
        protected override onMount(): void {
          this.disposers.push(() => called.push(1))
        }
      }
      TestEl.define(tag)

      const el = document.createElement(tag)

      // First connect + disconnect
      let mp = setupWait(el, 'fluid:mounted')
      document.body.appendChild(el)
      await mp

      let up = setupWait(el, 'fluid:unmounted')
      el.remove()
      await up

      // Second connect + disconnect — each cycle adds exactly one disposer
      mp = setupWait(el, 'fluid:mounted')
      document.body.appendChild(el)
      await mp

      up = setupWait(el, 'fluid:unmounted')
      el.remove()
      await up

      await nextFrame()

      if (called.length !== 2) {
        throw new Error(
          `Expected disposer called exactly 2 times (once per cycle), got ${called.length}`
        )
      }
    })
  })

  // -----------------------------------------------------------------------
  describe('event contract', () => {
    it('fluid:mounted bubbles to document.body (bubbles: true)', async () => {
      const tag = uniqueTag()
      makeElement(tag)
      const el = document.createElement(tag)

      let caughtAtBody = false
      const bodyHandler = (e: Event) => {
        if (e.target === el) caughtAtBody = true
      }
      document.body.addEventListener('fluid:mounted', bodyHandler)

      // setupWait + appendChild: event fires on el, bubbles to document.body.
      // Both listeners are in place before the DOM mutation.
      const mountedPromise = setupWait(el, 'fluid:mounted')
      document.body.appendChild(el)
      await mountedPromise
      document.body.removeEventListener('fluid:mounted', bodyHandler)

      if (!caughtAtBody) throw new Error('fluid:mounted did not bubble to document.body')
      el.remove()
    })

    it('fluid:unmounted has bubbles:true and composed:true on the event object', async () => {
      // Note: fluid:unmounted fires after the element is removed from the DOM, so it
      // cannot physically bubble to document.body (no ancestors). We verify the flag
      // is set correctly on the dispatched event instead.
      const tag = uniqueTag()
      makeElement(tag)
      const el = document.createElement(tag)

      const mountedPromise = setupWait(el, 'fluid:mounted')
      document.body.appendChild(el)
      await mountedPromise

      let unmountedEvent: Event | null = null
      const unmountedPromise = new Promise<void>(resolve => {
        el.addEventListener('fluid:unmounted', (e) => {
          unmountedEvent = e
          resolve()
        }, { once: true })
      })
      el.remove()
      await unmountedPromise

      if (!unmountedEvent) throw new Error('fluid:unmounted was not dispatched')
      if (!(unmountedEvent as CustomEvent).bubbles) throw new Error('fluid:unmounted should have bubbles: true')
      if (!(unmountedEvent as CustomEvent).composed) throw new Error('fluid:unmounted should have composed: true')
    })
  })

  // -----------------------------------------------------------------------
  describe('DEV re-connection warning', () => {
    it('does not throw when connectedCallback fires twice without prior disconnect', async () => {
      // The [fluid warn] console.warn is gated by the DEV constant
      // (process.env.NODE_ENV !== 'production'). In the WTR browser env,
      // process is not defined, so DEV = false and the warn branch is skipped.
      // This test verifies the code path is safe regardless of DEV mode.
      const tag = uniqueTag()
      makeElement(tag)
      const el = document.createElement(tag)

      const warnings: string[] = []
      const originalWarn = console.warn
      console.warn = (...args: unknown[]) => {
        warnings.push(args.map(String).join(' '))
        originalWarn.apply(console, args)
      }

      try {
        // First connect (normal)
        const mountedPromise = setupWait(el, 'fluid:mounted')
        document.body.appendChild(el)
        await mountedPromise

        // Call connectedCallback directly without a prior disconnect —
        // simulates the re-connection scenario the DEV guard protects against.
        // Must not throw, and must re-dispatch fluid:mounted.
        const remountedPromise = setupWait(el, 'fluid:mounted')
        ;(el as any).connectedCallback()
        await remountedPromise
      } finally {
        console.warn = originalWarn
        el.remove()
      }

      // In a DEV build (process.env.NODE_ENV !== 'production'), a [fluid warn]
      // message would appear. In this env it may not — but no exception should
      // have been thrown (verified by test completing without error).
    })
  })
})
