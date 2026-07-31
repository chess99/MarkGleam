import { describe, expect, it } from 'vitest'
import { detectSystemLocale } from './locale'

describe('system locale detection', () => {
  it('maps Chinese and Japanese browser languages to supported locales', () => {
    expect(detectSystemLocale(['zh-TW'])).toBe('zh-CN')
    expect(detectSystemLocale(['ja-JP'])).toBe('ja')
  })

  it('uses the first supported browser language and falls back to English', () => {
    expect(detectSystemLocale(['fr-FR', 'ja-JP', 'en-US'])).toBe('ja')
    expect(detectSystemLocale(['en-US', 'ja-JP'])).toBe('en')
    expect(detectSystemLocale(['de-DE'])).toBe('en')
  })
})
