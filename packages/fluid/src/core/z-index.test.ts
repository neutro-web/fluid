import { describe, it, expect } from 'vitest'
import { ZIndexAllocator, LAYER_Z_BASE, zIndex } from './z-index'
import type { FluidLayer } from './z-index'

describe('LAYER_Z_BASE', () => {
  it('has correct base z-indices matching the layer table', () => {
    expect(LAYER_Z_BASE.background).toBe(0)
    expect(LAYER_Z_BASE.surface).toBe(1)
    expect(LAYER_Z_BASE.raised).toBe(10)
    expect(LAYER_Z_BASE.overlay).toBe(100)
    expect(LAYER_Z_BASE.sheet).toBe(500)
    expect(LAYER_Z_BASE.system).toBe(1000)
  })
})

describe('ZIndexAllocator', () => {
  it('allocates base + 1 for the first call on any layer', () => {
    const z = new ZIndexAllocator()
    expect(z.allocate('background')).toBe(1)
    expect(z.allocate('surface')).toBe(2)
    expect(z.allocate('raised')).toBe(11)
    expect(z.allocate('overlay')).toBe(101)
    expect(z.allocate('sheet')).toBe(501)
    expect(z.allocate('system')).toBe(1001)
  })

  it('increments the counter independently per layer', () => {
    const z = new ZIndexAllocator()
    expect(z.allocate('overlay')).toBe(101)
    expect(z.allocate('overlay')).toBe(102)
    expect(z.allocate('overlay')).toBe(103)
    // other layers unaffected
    expect(z.allocate('sheet')).toBe(501)
    expect(z.allocate('surface')).toBe(2)
  })

  it('later-allocated value is always strictly greater than earlier', () => {
    const z = new ZIndexAllocator()
    const a = z.allocate('overlay')
    const b = z.allocate('overlay')
    const c = z.allocate('overlay')
    expect(b).toBeGreaterThan(a)
    expect(c).toBeGreaterThan(b)
  })

  it('release decrements the counter so the next allocation reuses the slot', () => {
    const z = new ZIndexAllocator()
    z.allocate('overlay') // counter → 1, returns 101
    z.allocate('overlay') // counter → 2, returns 102
    z.release('overlay')  // counter → 1
    expect(z.allocate('overlay')).toBe(102) // counter → 2 again
  })

  it('release does not decrement below 0', () => {
    const z = new ZIndexAllocator()
    z.release('overlay') // counter never set → clamps to 0
    z.release('overlay') // still 0
    expect(z.allocate('overlay')).toBe(101) // counter → 1
  })

  it('release on a layer with counter 0 leaves next allocation at base+1', () => {
    const z = new ZIndexAllocator()
    z.release('system')
    expect(z.allocate('system')).toBe(1001)
  })

  it('exports a module-federation-safe singleton via Symbol.for', () => {
    const KEY = Symbol.for('neutro.fluid.zindex')
    expect((globalThis as any)[KEY]).toBe(zIndex)
  })

  it('all layers are independent — overlay counter does not affect sheet', () => {
    const z = new ZIndexAllocator()
    z.allocate('overlay')
    z.allocate('overlay')
    z.release('overlay')
    // sheet should start fresh
    expect(z.allocate('sheet')).toBe(501)
  })
})
