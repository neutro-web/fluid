export function provideContext<T>(el: Element, key: string, value: T): () => void {
  const handler = (e: Event) => {
    const ce = e as CustomEvent<{ contextKey: string; callback: (v: T) => void }>
    if (ce.detail.contextKey === key) {
      ce.detail.callback(value)
      ce.stopPropagation()
    }
  }
  el.addEventListener('fluid:context-request', handler)
  return () => el.removeEventListener('fluid:context-request', handler)
}

export function requestContext<T>(el: Element, key: string, callback: (value: T) => void): void {
  const event = new CustomEvent('fluid:context-request', {
    detail: { contextKey: key, callback },
    bubbles: true,
    composed: false,
  })
  el.dispatchEvent(event)
}
