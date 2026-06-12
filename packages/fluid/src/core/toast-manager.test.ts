import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ToastManager, toast, toastManager } from './toast-manager'

describe('ToastManager', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('toast() return value', () => {
    it('returns an object with dismiss and update methods', () => {
      const mgr = new ToastManager()
      const handle = mgr.add('Hello')
      expect(typeof handle.dismiss).toBe('function')
      expect(typeof handle.update).toBe('function')
    })
  })

  describe('queue processing — one at a time', () => {
    it('processes the first toast immediately on add', () => {
      const announcements: string[] = []
      const mgr = new ToastManager({ onAnnounce: (m) => announcements.push(m) })
      mgr.add('First')
      expect(announcements).toEqual(['First'])
    })

    it('queues the second toast while first is active', () => {
      const announcements: string[] = []
      const mgr = new ToastManager({ onAnnounce: (m) => announcements.push(m) })
      mgr.add('First', { duration: 1000 })
      mgr.add('Second', { duration: 1000 })
      // Only first announced so far
      expect(announcements).toEqual(['First'])
    })

    it('announces second toast after first duration + announcementGap', () => {
      const announcements: string[] = []
      const mgr = new ToastManager({ announcementGap: 200, onAnnounce: (m) => announcements.push(m) })
      mgr.add('First', { duration: 1000 })
      mgr.add('Second', { duration: 1000 })
      vi.advanceTimersByTime(1000 + 199)
      expect(announcements).toEqual(['First'])
      vi.advanceTimersByTime(1)
      expect(announcements).toEqual(['First', 'Second'])
    })

    it('persistent toasts (duration: 0) stay until dismissed', () => {
      const announcements: string[] = []
      const mgr = new ToastManager({ announcementGap: 200, onAnnounce: (m) => announcements.push(m) })
      const h = mgr.add('Sticky', { duration: 0 })
      mgr.add('Next', { duration: 1000 })
      vi.advanceTimersByTime(5000)
      // 'Next' should NOT have been announced yet
      expect(announcements).toEqual(['Sticky'])
      h.dismiss()
      vi.advanceTimersByTime(200)
      expect(announcements).toEqual(['Sticky', 'Next'])
    })
  })

  describe('dismiss()', () => {
    it('removes the active toast and triggers next after gap', () => {
      const announcements: string[] = []
      const mgr = new ToastManager({ announcementGap: 200, onAnnounce: (m) => announcements.push(m) })
      const h = mgr.add('First', { duration: 5000 })
      mgr.add('Second', { duration: 1000 })
      h.dismiss()
      vi.advanceTimersByTime(200)
      expect(announcements).toEqual(['First', 'Second'])
    })

    it('removes a queued (not yet active) toast without announcing it', () => {
      const announcements: string[] = []
      const mgr = new ToastManager({ announcementGap: 200, onAnnounce: (m) => announcements.push(m) })
      mgr.add('First', { duration: 5000 })
      const h = mgr.add('Second', { duration: 1000 })
      h.dismiss() // remove from queue before it activates
      vi.advanceTimersByTime(10000)
      expect(announcements).toEqual(['First'])
    })
  })

  describe('update()', () => {
    it('re-announces the active toast with the new message', () => {
      const announcements: string[] = []
      const mgr = new ToastManager({ onAnnounce: (m) => announcements.push(m) })
      const h = mgr.add('Processing...')
      h.update('Done!')
      expect(announcements).toEqual(['Processing...', 'Done!'])
    })

    it('updates a queued toast message before it activates', () => {
      const announcements: string[] = []
      const mgr = new ToastManager({ announcementGap: 200, onAnnounce: (m) => announcements.push(m) })
      mgr.add('First', { duration: 1000 })
      const h = mgr.add('Second', { duration: 1000 })
      h.update('Updated Second')
      vi.advanceTimersByTime(1200)
      expect(announcements).toContain('Updated Second')
      expect(announcements).not.toContain('Second')
    })
  })

  describe('singleton', () => {
    it('exports a module-federation-safe singleton via Symbol.for', () => {
      const KEY = Symbol.for('neutro.fluid.toastmanager')
      expect((globalThis as any)[KEY]).toBe(toastManager)
    })

    it('exported toast() function delegates to the singleton', () => {
      const spy = vi.spyOn(toastManager, 'add')
      toast('Test message')
      expect(spy).toHaveBeenCalledWith('Test message', undefined)
      spy.mockRestore()
    })
  })
})
