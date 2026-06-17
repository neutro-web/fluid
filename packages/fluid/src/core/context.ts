export const DISABLED_CONTEXT_KEY = 'fluid:disabled'

// provider element → key → subscriber callbacks (survives value updates, GC'd with provider)
const _subscriptions = new WeakMap<Element, Map<string, Set<(v: any) => void>>>()

export function provideContext<T>(el: Element, key: string, value: T): () => void {
  // Push new value to any already-subscribed consumers (supports dynamic disabled toggling)
  const existing = _subscriptions.get(el)?.get(key)
  if (existing) for (const cb of existing) cb(value)

  const handler = (e: Event) => {
    const ce = e as CustomEvent<{
      contextKey: string
      callback: (v: T) => void
      subscribe?: boolean
      _unsubscribe?: () => void
    }>
    if (ce.detail.contextKey !== key) return
    ce.detail.callback(value)
    if (ce.detail.subscribe) {
      let keyMap = _subscriptions.get(el)
      if (!keyMap) _subscriptions.set(el, keyMap = new Map())
      let set = keyMap.get(key)
      if (!set) keyMap.set(key, set = new Set())
      const cb = ce.detail.callback as (v: any) => void
      set.add(cb)
      ce.detail._unsubscribe = () => set!.delete(cb)
    }
    ce.stopPropagation()
  }
  el.addEventListener('fluid:context-request', handler)
  return () => el.removeEventListener('fluid:context-request', handler)
}

export function requestContext<T>(
  el: Element,
  key: string,
  callback: (value: T) => void,
  subscribe = false,
): () => void {
  const detail: {
    contextKey: string
    callback: (v: T) => void
    subscribe: boolean
    _unsubscribe?: () => void
  } = { contextKey: key, callback, subscribe }
  el.dispatchEvent(new CustomEvent('fluid:context-request', {
    detail,
    bubbles: true,
    composed: false,
  }))
  return detail._unsubscribe ?? (() => {})
}
