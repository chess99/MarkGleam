import type { Locale } from '../types'

interface ChangelogEntry {
  date: string
  version: string
  title: Record<Locale, string>
  items: Record<Locale, string[]>
}

export const changelogEntries: ChangelogEntry[] = [
  {
    date: '2026-07-30',
    version: '2026.07',
    title: {
      'zh-CN': '更快、更适合打印的 PDF 工作流',
      en: 'Faster PDFs and a print-ready workflow',
    },
    items: {
      'zh-CN': [
        '新增“打印 / 保存为 PDF”，使用浏览器原生分页，支持搜索、复制和清晰纸质打印。',
        '超长视觉 PDF 仅复制当前页内容，并提供逐页进度、取消和长文档压缩。',
        '分页改为按浏览器实际块间距计算，减少不必要的页底留白。',
        '`---` 保持为标准水平分隔线；仅 `<!-- pagebreak -->` 强制分页。',
      ],
      en: [
        'Added Print / Save as PDF with native browser pagination, searchable text, and sharper paper output.',
        'Long visual PDFs now clone only the active page, with page progress, cancelation, and automatic compression.',
        'Pagination now uses the browser’s actual collapsed block spacing to reduce avoidable whitespace.',
        '`---` remains a standard thematic break; only `<!-- pagebreak -->` forces a new page.',
      ],
    },
  },
]
