import { describe, it, expect, vi, beforeEach } from 'vitest'
import { provideContext, requestContext } from './context'

// Minimal EventTarget implementation that supports bubbling (composed: false)
class MockElement {
  private handlers = new Map<string, Array<(e: any) => void>>()
  public parentElement: MockElement | null = null

  addEventListener(type: string, handler: (e: any) => void): void {
    const list = this.handlers.get(type) ?? []
    list.push(handler)
    this.handlers.set(type, list)
  }

  removeEventListener(type: string, handler: (e: any) => void): void {
    const list = this.handlers.get(type) ?? []
    this.handlers.set(type, list.filter(h => h !== handler))
  }

  dispatchEvent(event: { type: string; bubbles?: boolean; detail: any; _stopped?: boolean }): void {
    let stopped = false
    const stopPropagation = () => { stopped = true }
    const fullEvent = { ...event, stopPropagation }
    const list = this.handlers.get(event.type) ?? []
    for (const h of list) {
      h(fullEvent)
      if (stopped) return
    }
    if (event.bubbles && !stopped && this.parentElement) {
      this.parentElement.dispatchEvent(event)
    }
  }
}

// Stub CustomEvent in node environment
beforeEach(() => {
  vi.stubGlobal('CustomEvent', class {
    type: string
    bubbles: boolean
    composed: boolean
    detail: any
    constructor(type: string, init: any = {}) {
      this.type = type
      this.bubbles = init.bubbles ?? false
      this.composed = init.composed ?? false
      this.detail = init.detail
    }
  })
})

describe('provideContext + requestContext', () => {
  it('delivers the provided value to the requester callback', () => {
    const parent = new MockElement()
    const child = new MockElement()
    child.parentElement = parent

    provideContext(parent as unknown as Element, 'tabs', { activeTab: 0 })

    let received: any
    requestContext(child as unknown as Element, 'tabs', (v) => { received = v })

    expect(received).toEqual({ activeTab: 0 })
  })

  it('callback is not called when no matching provider exists', () => {
    const parent = new MockElement()
    const child = new MockElement()
    child.parentElement = parent

    const cb = vi.fn()
    requestContext(child as unknown as Element, 'nonexistent', cb)

    expect(cb).not.toHaveBeenCalled()
  })

  it('nearest ancestor wins when multiple providers for the same key', () => {
    const grandparent = new MockElement()
    const parent = new MockElement()
    const child = new MockElement()
    parent.parentElement = grandparent
    child.parentElement = parent

    provideContext(grandparent as unknown as Element, 'theme', 'dark')
    provideContext(parent as unknown as Element, 'theme', 'light')

    let received: string | undefined
    requestContext(child as unknown as Element, 'theme', (v: string) => { received = v })

    expect(received).toBe('light')
  })

  it('does not deliver context from a different key', () => {
    const parent = new MockElement()
    const child = new MockElement()
    child.parentElement = parent

    provideContext(parent as unknown as Element, 'tabs', { activeTab: 0 })

    const cb = vi.fn()
    requestContext(child as unknown as Element, 'accordion', cb)

    expect(cb).not.toHaveBeenCalled()
  })

  it('uses composed: false so the event does not cross shadow boundaries', () => {
    const MockCE = (globalThis as any).CustomEvent
    const spy = vi.spyOn(MockCE.prototype, 'constructor' as any).mockImplementation(
      function(this: any, type: string, init: any) {
        this.type = type
        this.bubbles = init?.bubbles
        this.composed = init?.composed
        this.detail = init?.detail
      }
    )

    const parent = new MockElement()
    const child = new MockElement()
    child.parentElement = parent

    // Capture the dispatched event by intercepting dispatchEvent
    let dispatchedEvent: any
    const origDispatch = (child as any).dispatchEvent.bind(child)
    ;(child as any).dispatchEvent = (e: any) => {
      dispatchedEvent = e
      origDispatch(e)
    }

    requestContext(child as unknown as Element, 'test', () => {})

    expect(dispatchedEvent?.composed).toBe(false)
    spy.mockRestore()
  })

  it('provideContext stops propagation after delivering value', () => {
    const grandparent = new MockElement()
    const parent = new MockElement()
    const child = new MockElement()
    parent.parentElement = grandparent
    child.parentElement = parent

    const grandparentCb = vi.fn()
    grandparent.addEventListener('fluid:context-request', grandparentCb)
    provideContext(parent as unknown as Element, 'test', 42)

    requestContext(child as unknown as Element, 'test', () => {})

    // grandparent handler should NOT be called because parent stopped propagation
    expect(grandparentCb).not.toHaveBeenCalled()
  })
})
