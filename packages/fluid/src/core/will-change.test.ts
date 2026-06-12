import { describe, it, expect } from 'vitest'
import { WillChangeManager } from './will-change'

type MockEl = HTMLElement & { _props: Map<string, string> }

function makeMockEl(): MockEl {
  const props = new Map<string, string>()
  return {
    style: {
      setProperty(k: string, v: string) { props.set(k, v) },
      getPropertyValue(k: string) { return props.get(k) ?? '' },
      removeProperty(k: string) { props.delete(k) },
    },
    _props: props,
  } as unknown as MockEl
}

describe('WillChangeManager — P0-T1-06', () => {
  describe('acquire', () => {
    it('sets will-change on first acquire', () => {
      const el = makeMockEl()
      WillChangeManager.acquire(el)
      expect(el._props.get('will-change')).toBe('transform, opacity')
    })

    it('does not overwrite will-change on second acquire', () => {
      const el = makeMockEl()
      WillChangeManager.acquire(el)
      WillChangeManager.acquire(el)
      expect(el._props.get('will-change')).toBe('transform, opacity')
    })
  })

  describe('release', () => {
    it('removes will-change when ref count reaches zero', () => {
      const el = makeMockEl()
      WillChangeManager.acquire(el)
      WillChangeManager.release(el)
      expect(el._props.has('will-change')).toBe(false)
    })

    it('does not remove will-change while other acquires are outstanding', () => {
      const el = makeMockEl()
      WillChangeManager.acquire(el)
      WillChangeManager.acquire(el)
      WillChangeManager.release(el)
      expect(el._props.get('will-change')).toBe('transform, opacity')
    })

    it('removes will-change only after all acquires are released', () => {
      const el = makeMockEl()
      WillChangeManager.acquire(el)
      WillChangeManager.acquire(el)
      WillChangeManager.acquire(el)
      WillChangeManager.release(el)
      WillChangeManager.release(el)
      expect(el._props.get('will-change')).toBe('transform, opacity')
      WillChangeManager.release(el)
      expect(el._props.has('will-change')).toBe(false)
    })

    it('does not throw when releasing an element that was never acquired', () => {
      const el = makeMockEl()
      expect(() => WillChangeManager.release(el)).not.toThrow()
    })
  })

  describe('isolation between elements', () => {
    it('each element has an independent ref count', () => {
      const el1 = makeMockEl()
      const el2 = makeMockEl()
      WillChangeManager.acquire(el1)
      WillChangeManager.acquire(el2)
      WillChangeManager.release(el1)
      expect(el1._props.has('will-change')).toBe(false)
      expect(el2._props.get('will-change')).toBe('transform, opacity')
    })
  })
})
