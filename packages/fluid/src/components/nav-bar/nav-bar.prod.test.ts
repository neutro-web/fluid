// @vitest-environment jsdom
//
// This file runs in jsdom (not the global 'node' environment) so we have DOM APIs.
// It exists solely to test the production console.warn path of fluid-nav-bar — which
// is unreachable in the @web/test-runner suite because that harness force-sets
// window.process.env.NODE_ENV = 'development' before any module is imported.
//
// Strategy: vi.resetModules() clears the module registry, then we set NODE_ENV='production'
// before dynamically importing index.ts — giving us a fresh module where DEV === false.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('fluid-nav-bar — prod warn path (DEV=false)', () => {
  const savedNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    vi.resetModules()
    process.env.NODE_ENV = 'production'
  })

  afterEach(async () => {
    process.env.NODE_ENV = savedNodeEnv
    vi.resetModules()
    // Remove any elements left in body
    document.body.innerHTML = ''
  })

  it('console.warn fires with correct message when aria-label is absent', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Re-import after NODE_ENV='production' — DEV constant is now false
    await import('./index')

    const el = document.createElement('fluid-nav-bar')
    document.body.appendChild(el)  // triggers connectedCallback → onMount → _validateAriaLabel

    expect(warnSpy).toHaveBeenCalledWith('[fluid warn] fluid-nav-bar requires aria-label.')
    warnSpy.mockRestore()
  })

  it('_ariaLabelWarned guard: warn fires exactly once per element, not twice', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await import('./index')

    const el = document.createElement('fluid-nav-bar')
    document.body.appendChild(el)

    // One warn on first mount
    const countAfterMount = warnSpy.mock.calls.filter(
      c => c[0] === '[fluid warn] fluid-nav-bar requires aria-label.',
    ).length
    expect(countAfterMount).toBe(1)

    // Disconnect and reconnect — _ariaLabelWarned is still true on the instance,
    // so the guard prevents a second warn
    document.body.removeChild(el)
    document.body.appendChild(el)

    const countAfterReconnect = warnSpy.mock.calls.filter(
      c => c[0] === '[fluid warn] fluid-nav-bar requires aria-label.',
    ).length
    expect(countAfterReconnect).toBe(1)  // unchanged — guard prevented second warn

    warnSpy.mockRestore()
  })

  it('no warn when aria-label is present', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await import('./index')

    const el = document.createElement('fluid-nav-bar')
    el.setAttribute('aria-label', 'Primary navigation')
    document.body.appendChild(el)

    const fluidWarns = warnSpy.mock.calls.filter(c =>
      typeof c[0] === 'string' && c[0].includes('fluid-nav-bar requires aria-label'),
    )
    expect(fluidWarns).toHaveLength(0)
    warnSpy.mockRestore()
  })
})
