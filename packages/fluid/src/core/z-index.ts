export type FluidLayer = 'background' | 'surface' | 'raised' | 'overlay' | 'sheet' | 'system'

export const LAYER_Z_BASE: Record<FluidLayer, number> = {
  background: 0,
  surface: 1,
  raised: 10,
  overlay: 100,
  sheet: 500,
  system: 1000,
}

export class ZIndexAllocator {
  private counters = new Map<FluidLayer, number>()

  allocate(layer: FluidLayer): number {
    const base = LAYER_Z_BASE[layer]
    const n = (this.counters.get(layer) ?? 0) + 1
    this.counters.set(layer, n)
    return base + n
  }

  release(layer: FluidLayer): void {
    const n = this.counters.get(layer) ?? 1
    this.counters.set(layer, Math.max(n - 1, 0))
  }
}

const Z_KEY = Symbol.for('neutro.fluid.zindex')
if (!(globalThis as any)[Z_KEY]) (globalThis as any)[Z_KEY] = new ZIndexAllocator()
export const zIndex: ZIndexAllocator = (globalThis as any)[Z_KEY]
