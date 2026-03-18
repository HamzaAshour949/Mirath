import { i18n } from '@lingui/core'

export type Locale = 'en' | 'ar'

export const LOCALES: Locale[] = ['en', 'ar']
export const DEFAULT_LOCALE: Locale = 'en'

export const RTL_LOCALES: Locale[] = ['ar']

export function isRTL(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale)
}

export async function setupI18n(locale: Locale) {
  const { messages } = await import(`../locales/${locale}.json`)
  i18n.load(locale, messages)
  i18n.activate(locale)

  // Apply RTL direction to document root
  if (typeof document !== 'undefined') {
    document.documentElement.dir = isRTL(locale) ? 'rtl' : 'ltr'
    document.documentElement.lang = locale
  }
}

export { i18n }
