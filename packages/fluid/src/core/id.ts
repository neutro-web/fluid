function fnv1a32(str: string): number {
  let hash = 2166136261
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 16777619) >>> 0
  }
  return hash
}

function getElementPath(el: Element): string {
  const parts: string[] = []
  let current: Element | null = el
  while (current) {
    const parent: Element | null = current.parentElement
    const tag = current.tagName.toLowerCase()
    if (!parent) {
      parts.unshift(tag)
      break
    }
    const self: Element = current
    const sameTag = Array.from(parent.children).filter(c => c.tagName === self.tagName)
    const index = sameTag.indexOf(self)
    parts.unshift(index > 0 ? `${tag}:${index}` : tag)
    current = parent
  }
  return parts.join('>')
}

export function generateFluidId(prefix: string, hostElement: Element): string {
  const base = hostElement.id || hostElement.getAttribute('data-fluid-id')
  if (base) return `${base}-${prefix}`

  const path = getElementPath(hostElement)
  const hash = fnv1a32(`${prefix}:${path}`).toString(36).padStart(6, '0').slice(0, 6)
  return `fluid-${prefix}-${hash}`
}
