export class FluidI18n {
  private locale: string | null = null
  private translations = new Map<string, Map<string, string>>()

  use(locale: string, translations: Record<string, string>): void {
    this.locale = locale
    const existing = this.translations.get(locale) ?? new Map<string, string>()
    for (const [key, value] of Object.entries(translations)) {
      existing.set(key, value)
    }
    this.translations.set(locale, existing)
  }

  t(key: string, fallback: string): string {
    if (!this.locale) return fallback
    return this.translations.get(this.locale)?.get(key) ?? fallback
  }
}

export const i18n = new FluidI18n()
