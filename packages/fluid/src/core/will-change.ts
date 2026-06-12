const willChangeRefs = new WeakMap<Element, number>()

export const WillChangeManager = {
  acquire(el: Element): void {
    const count = (willChangeRefs.get(el) ?? 0) + 1
    willChangeRefs.set(el, count)
    if (count === 1) (el as HTMLElement).style.setProperty('will-change', 'transform, opacity')
  },

  release(el: Element): void {
    const count = Math.max((willChangeRefs.get(el) ?? 1) - 1, 0)
    willChangeRefs.set(el, count)
    if (count === 0) (el as HTMLElement).style.removeProperty('will-change')
  },
}
