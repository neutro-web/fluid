import { describe, it, expect } from 'vitest'
import { generateFluidId } from './id'

type MockEl = {
  id: string
  getAttribute(attr: string): string | null
  tagName: string
  parentElement: MockEl | null
  children: MockEl[]
}

function makeEl(
  tagName: string,
  id = '',
  dataFluidId = '',
  parent: MockEl | null = null,
): MockEl {
  const el: MockEl = {
    id,
    getAttribute: (attr: string) => (attr === 'data-fluid-id' ? dataFluidId || null : null),
    tagName: tagName.toUpperCase(),
    parentElement: parent,
    children: [],
  }
  if (parent) parent.children.push(el)
  return el
}

describe('generateFluidId', () => {
  describe('Priority 1: hostElement.id', () => {
    it('returns <id>-<prefix> when element has an id', () => {
      const el = makeEl('div', 'my-card')
      expect(generateFluidId('tooltip', el as unknown as Element)).toBe('my-card-tooltip')
    })

    it('uses data-fluid-id attribute as fallback base when id is absent', () => {
      const el = makeEl('div', '', 'custom-base')
      expect(generateFluidId('desc', el as unknown as Element)).toBe('custom-base-desc')
    })

    it('id takes precedence over data-fluid-id when both present', () => {
      const el = makeEl('div', 'explicit-id', 'data-id')
      expect(generateFluidId('lbl', el as unknown as Element)).toBe('explicit-id-lbl')
    })
  })

  describe('Priority 2: stable hash from DOM position', () => {
    it('returns a string matching fluid-<prefix>-<hash> pattern', () => {
      const root = makeEl('body')
      const el = makeEl('div', '', '', root)
      const id = generateFluidId('tooltip', el as unknown as Element)
      expect(id).toMatch(/^fluid-tooltip-[a-z0-9]{4,8}$/)
    })

    it('same element and prefix always produce the same id', () => {
      const root = makeEl('body')
      const el = makeEl('div', '', '', root)
      const a = generateFluidId('desc', el as unknown as Element)
      const b = generateFluidId('desc', el as unknown as Element)
      expect(a).toBe(b)
    })

    it('different prefixes on the same element produce different ids', () => {
      const root = makeEl('body')
      const el = makeEl('div', '', '', root)
      const a = generateFluidId('tooltip', el as unknown as Element)
      const b = generateFluidId('desc', el as unknown as Element)
      expect(a).not.toBe(b)
    })

    it('sibling elements produce different ids', () => {
      const root = makeEl('body')
      const el1 = makeEl('div', '', '', root)
      const el2 = makeEl('div', '', '', root)
      const a = generateFluidId('label', el1 as unknown as Element)
      const b = generateFluidId('label', el2 as unknown as Element)
      expect(a).not.toBe(b)
    })

    it('nested elements produce different ids from their parent', () => {
      const root = makeEl('body')
      const parent = makeEl('section', '', '', root)
      const child = makeEl('article', '', '', parent)
      const a = generateFluidId('desc', parent as unknown as Element)
      const b = generateFluidId('desc', child as unknown as Element)
      expect(a).not.toBe(b)
    })
  })
})
