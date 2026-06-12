import { describe, it, expect } from 'vitest'
import { FluidI18n } from './i18n'

describe('FluidI18n', () => {
  it('returns fallback when no locale has been set', () => {
    const i = new FluidI18n()
    expect(i.t('greeting', 'Hello')).toBe('Hello')
  })

  it('returns translation for the active locale', () => {
    const i = new FluidI18n()
    i.use('en', { greeting: 'Hello', farewell: 'Goodbye' })
    expect(i.t('greeting', 'Hi')).toBe('Hello')
    expect(i.t('farewell', 'Bye')).toBe('Goodbye')
  })

  it('returns fallback for unknown key even when locale is set', () => {
    const i = new FluidI18n()
    i.use('en', { greeting: 'Hello' })
    expect(i.t('missing', 'DEFAULT')).toBe('DEFAULT')
  })

  it('never throws on unknown key', () => {
    const i = new FluidI18n()
    i.use('en', {})
    expect(() => i.t('anything', 'fallback')).not.toThrow()
  })

  it('never throws when no locale is set', () => {
    const i = new FluidI18n()
    expect(() => i.t('anything', 'fallback')).not.toThrow()
  })

  it('merges translations when use() is called multiple times for the same locale', () => {
    const i = new FluidI18n()
    i.use('en', { greeting: 'Hello' })
    i.use('en', { farewell: 'Goodbye' })
    expect(i.t('greeting', 'x')).toBe('Hello')
    expect(i.t('farewell', 'x')).toBe('Goodbye')
  })

  it('overrides a translation when the same key is re-provided', () => {
    const i = new FluidI18n()
    i.use('en', { greeting: 'Hello' })
    i.use('en', { greeting: 'Hi there' })
    expect(i.t('greeting', 'x')).toBe('Hi there')
  })

  it('switches active locale when use() is called with a different locale', () => {
    const i = new FluidI18n()
    i.use('en', { greeting: 'Hello' })
    i.use('fr', { greeting: 'Bonjour' })
    // last use() wins as active locale
    expect(i.t('greeting', 'x')).toBe('Bonjour')
  })

  it('returns fallback when locale is set but no translations for that locale', () => {
    const i = new FluidI18n()
    i.use('en', { a: 'A' })
    i.use('de', { b: 'B' })
    // active locale is 'de', key 'a' not in 'de'
    expect(i.t('a', 'fallback')).toBe('fallback')
  })
})
