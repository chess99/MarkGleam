import { describe, expect, it } from 'vitest'
import { t } from './i18n'

describe('translations', () => {
  it('provides the key product actions in both languages', () => {
    expect(t('zh-CN', 'export')).toBe('导出')
    expect(t('en', 'export')).toBe('Export')
    expect(t('zh-CN', 'saved')).not.toBe(t('en', 'saved'))
  })
})
