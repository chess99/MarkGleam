import { describe, expect, it } from 'vitest'
import { t } from './i18n'

describe('translations', () => {
  it('provides the key product actions in both languages', () => {
    expect(t('zh-CN', 'export')).toBe('导出')
    expect(t('en', 'export')).toBe('Export')
    expect(t('en', 'printPdf')).toBe('Print / Save as PDF')
    expect(t('zh-CN', 'changelog')).toBe('更新日志')
    expect(t('zh-CN', 'saved')).not.toBe(t('en', 'saved'))
  })
})
