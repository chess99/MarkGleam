import { describe, expect, it } from 'vitest'
import { t } from './i18n'

describe('translations', () => {
  it('provides the key product actions in all supported languages', () => {
    expect(t('zh-CN', 'export')).toBe('导出')
    expect(t('en', 'export')).toBe('Export')
    expect(t('en', 'printPdf')).toBe('Print / Searchable PDF')
    expect(t('zh-CN', 'visualPdf')).toBe('保留样式 PDF')
    expect(t('zh-CN', 'changelog')).toBe('更新日志')
    expect(t('ja', 'export')).toBe('書き出し')
    expect(t('ja', 'changelog')).toBe('更新履歴')
    expect(t('zh-CN', 'saved')).not.toBe(t('en', 'saved'))
  })
})
