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

describe('push subscription', () => {
  it('subscribe=false (default) is fire-and-forget — no push on value change', () => {
    const parent = new MockElement()
    const child = new MockElement()
    child.parentElement = parent

    const values: number[] = []
    let disposer = provideContext(parent as unknown as Element, 'count', 1)
    requestContext(child as unknown as Element, 'count', (v: number) => values.push(v))
    expect(values).toEqual([1])

    disposer()
    disposer = provideContext(parent as unknown as Element, 'count', 2)
    expect(values).toEqual([1]) // no push — subscribe=false

    disposer()
  })

  it('subscribe=true pushes updated value to consumer when provideContext is re-called', () => {
    const parent = new MockElement()
    const child = new MockElement()
    child.parentElement = parent

    const values: number[] = []
    let disposer = provideContext(parent as unknown as Element, 'count', 1)
    requestContext(child as unknown as Element, 'count', (v: number) => values.push(v), true)
    expect(values).toEqual([1])

    disposer()
    disposer = provideContext(parent as unknown as Element, 'count', 2)
    expect(values).toEqual([1, 2])

    disposer()
    disposer = provideContext(parent as unknown as Element, 'count', 3)
    expect(values).toEqual([1, 2, 3])

    disposer()
  })

  it('unsubscribe prevents further pushes', () => {
    const parent = new MockElement()
    const child = new MockElement()
    child.parentElement = parent

    const values: number[] = []
    let disposer = provideContext(parent as unknown as Element, 'count', 1)
    const unsubscribe = requestContext(child as unknown as Element, 'count', (v: number) => values.push(v), true)
    expect(values).toEqual([1])

    unsubscribe()
    disposer()
    disposer = provideContext(parent as unknown as Element, 'count', 2)
    expect(values).toEqual([1]) // callback was removed, no further pushes

    disposer()
  })

  it('all active subscribers receive the push', () => {
    const parent = new MockElement()
    const child1 = new MockElement()
    const child2 = new MockElement()
    child1.parentElement = parent
    child2.parentElement = parent

    const a: number[] = []
    const b: number[] = []
    let disposer = provideContext(parent as unknown as Element, 'x', 10)
    requestContext(child1 as unknown as Element, 'x', (v: number) => a.push(v), true)
    requestContext(child2 as unknown as Element, 'x', (v: number) => b.push(v), true)
    expect(a).toEqual([10])
    expect(b).toEqual([10])

    disposer()
    disposer = provideContext(parent as unknown as Element, 'x', 20)
    expect(a).toEqual([10, 20])
    expect(b).toEqual([10, 20])

    disposer()
  })

  it('unsubscribed consumer does not receive push while remaining subscriber still does', () => {
    const parent = new MockElement()
    const child1 = new MockElement()
    const child2 = new MockElement()
    child1.parentElement = parent
    child2.parentElement = parent

    const a: number[] = []
    const b: number[] = []
    let disposer = provideContext(parent as unknown as Element, 'x', 1)
    const unsubscribe1 = requestContext(child1 as unknown as Element, 'x', (v: number) => a.push(v), true)
    requestContext(child2 as unknown as Element, 'x', (v: number) => b.push(v), true)

    unsubscribe1()
    disposer()
    disposer = provideContext(parent as unknown as Element, 'x', 2)
    expect(a).toEqual([1]) // unsubscribed, no push
    expect(b).toEqual([1, 2]) // still subscribed

    disposer()
  })
})
