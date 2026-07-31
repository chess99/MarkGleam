import type { Locale } from '../types'

export const supportedLocales: readonly Locale[] = ['zh-CN', 'en', 'ja']

export const detectSystemLocale = (
  languages: readonly string[] = typeof navigator === 'undefined'
    ? []
    : navigator.languages,
): Locale => {
  for (const language of languages) {
    const normalized = language.toLowerCase()
    if (normalized === 'zh' || normalized.startsWith('zh-')) return 'zh-CN'
    if (normalized === 'ja' || normalized.startsWith('ja-')) return 'ja'
    if (normalized === 'en' || normalized.startsWith('en-')) return 'en'
  }
  return 'en'
}

export const localeText = <T>(
  locale: Locale,
  copy: Record<Locale, T>,
): T => copy[locale]
