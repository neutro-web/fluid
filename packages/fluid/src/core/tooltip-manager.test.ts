import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TooltipManager, tooltipManager } from './tooltip-manager'

function makeTooltip() {
  return {
    show: vi.fn(),
    hide: vi.fn(),
  }
}

describe('TooltipManager', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('hoverDelay', () => {
    it('does not show the tooltip before hoverDelay elapses', () => {
      const mgr = new TooltipManager({ hoverDelay: 300 })
      const t = makeTooltip()
      mgr.show(t)
      vi.advanceTimersByTime(299)
      expect(t.show).not.toHaveBeenCalled()
    })

    it('shows the tooltip after hoverDelay elapses', () => {
      const mgr = new TooltipManager({ hoverDelay: 300 })
      const t = makeTooltip()
      mgr.show(t)
      vi.advanceTimersByTime(300)
      expect(t.show).toHaveBeenCalledOnce()
    })

    it('defaults to 300ms hoverDelay', () => {
      const mgr = new TooltipManager()
      expect(mgr.hoverDelay).toBe(300)
    })
  })

  describe('maxVisible: 1 (default)', () => {
    it('hides the first tooltip when a second one is shown', () => {
      const mgr = new TooltipManager({ maxVisible: 1, hoverDelay: 100 })
      const t1 = makeTooltip()
      const t2 = makeTooltip()

      mgr.show(t1)
      vi.advanceTimersByTime(100)
      expect(t1.show).toHaveBeenCalledOnce()

      mgr.show(t2)
      vi.advanceTimersByTime(100)
      expect(t1.hide).toHaveBeenCalledOnce()
      expect(t2.show).toHaveBeenCalledOnce()
    })

    it('defaults to maxVisible of 1', () => {
      const mgr = new TooltipManager()
      expect(mgr.maxVisible).toBe(1)
    })
  })

  describe('hide', () => {
    it('hides a currently visible tooltip immediately', () => {
      const mgr = new TooltipManager({ hoverDelay: 0 })
      const t = makeTooltip()
      mgr.show(t)
      vi.advanceTimersByTime(0)
      mgr.hide(t)
      expect(t.hide).toHaveBeenCalledOnce()
    })

    it('cancels a pending show when hide is called before hoverDelay', () => {
      const mgr = new TooltipManager({ hoverDelay: 300 })
      const t = makeTooltip()
      mgr.show(t)
      vi.advanceTimersByTime(200)
      mgr.hide(t)
      vi.advanceTimersByTime(200) // past original delay
      expect(t.show).not.toHaveBeenCalled()
    })
  })

  describe('singleton', () => {
    it('exports a module-federation-safe singleton via Symbol.for', () => {
      const KEY = Symbol.for('neutro.fluid.tooltipmanager')
      expect((globalThis as any)[KEY]).toBe(tooltipManager)
    })

    it('singleton has correct default options', () => {
      expect(tooltipManager.hoverDelay).toBe(300)
      expect(tooltipManager.maxVisible).toBe(1)
    })
  })
})
