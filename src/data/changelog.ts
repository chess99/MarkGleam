import type { Locale } from '../types'

interface ChangelogEntry {
  date: string
  version: string
  title: Record<Locale, string>
  items: Record<Locale, string[]>
}

export const changelogEntries: ChangelogEntry[] = [
  {
    date: '2026-07-31',
    version: '2026.07.31',
    title: {
      'zh-CN': '小红书长文固定分页',
      en: 'Fixed-page Xiaohongshu long-form exports',
      ja: '小紅書向け長文の固定ページ書き出し',
    },
    items: {
      'zh-CN': [
        '新增“小红书长文图片”工具，将 Markdown 和 GFM 表格智能分页为 1080×1440 PNG ZIP。',
        '预览会显示真实分页边界、预计页数和越界内容提醒，并与导出共用同一分页计划。',
        '长图 ZIP 新增“自适应长图 / 固定页面”模式，分片高度可直接设置为 1440。',
        '明确普通“小红书图文”只是单张最小画布；长文图片需解压后从“上传图文”发布，不能导入原生“写长文”。',
      ],
      en: [
        'Added Xiaohongshu Long Article Images, with smart 1080×1440 PNG ZIP pagination for Markdown and GFM tables.',
        'The preview now shows the actual page boundaries, estimated page count, and oversized-content warnings from the same plan used for export.',
        'Sliced ZIP export now offers Adaptive slices and Fixed pages, including a directly editable 1440px page height.',
        'Clarified that the regular Xiaohongshu canvas is a single-image minimum size; exported long-form images must be unzipped and published as an image post, not imported into the native long-article editor.',
      ],
      ja: [
        'Markdown と GFM 表を 1080×1440 の PNG ZIP に自動改ページする「小紅書長文画像」を追加しました。',
        'プレビューと書き出しで同じ改ページ計画を使い、実際の境界、推定ページ数、ページ領域を超えるコンテンツの警告を表示します。',
        '分割 ZIP に「可変長の分割 / 固定ページ」を追加し、ページ高を 1440px に直接設定できるようにしました。',
        '通常の小紅書キャンバスは単一画像の最小サイズです。長文画像は ZIP を展開して画像投稿として公開し、標準の長文エディターには読み込めません。',
      ],
    },
  },
  {
    date: '2026-07-30',
    version: '2026.07',
    title: {
      'zh-CN': '更快、更适合打印的 PDF 工作流',
      en: 'Faster PDFs and a print-ready workflow',
      ja: 'より高速で印刷しやすい PDF ワークフロー',
    },
    items: {
      'zh-CN': [
        '新增“打印 / 可搜索 PDF”，使用浏览器原生分页，支持搜索、复制和清晰纸质打印。',
        '超长保留样式 PDF 仅复制当前页内容，并提供逐页进度、取消和长文档压缩。',
        'PDF 选项改用结果导向的名称和说明，明确长文档快速导出的清晰度、耗时与文件大小取舍。',
        '桌面端导出弹窗切换格式时保持尺寸和位置稳定；移动端 PDF 选项改用更易读的全宽方案卡片。',
        '分页改为按浏览器实际块间距计算，减少不必要的页底留白。',
        '`---` 保持为标准水平分隔线；仅 `<!-- pagebreak -->` 强制分页。',
      ],
      en: [
        'Added Print / Searchable PDF with native browser pagination, searchable text, and sharper paper output.',
        'Long style-preserving PDFs now clone only the active page, with page progress, cancelation, and automatic compression.',
        'PDF choices now use outcome-focused names and explain the speed, size, and sharpness tradeoff for long documents.',
        'The desktop export dialog now stays in place while switching formats, while mobile PDF choices use clearer full-width cards.',
        'Pagination now uses the browser’s actual collapsed block spacing to reduce avoidable whitespace.',
        '`---` remains a standard thematic break; only `<!-- pagebreak -->` forces a new page.',
      ],
      ja: [
        'ブラウザ標準の改ページ、検索可能な文字、鮮明な印刷に対応した「印刷 / 検索可能 PDF」を追加しました。',
        '長いスタイル保持 PDF は現在のページだけを複製し、ページ進捗、中止、自動圧縮に対応しました。',
        'PDF の選択肢を結果が分かる名称に変更し、長文書における速度、サイズ、鮮明さの違いを説明しました。',
        'デスクトップでは形式を切り替えてもダイアログの位置と大きさを維持し、モバイルでは PDF の選択肢を読みやすい全幅カードにしました。',
        'ブラウザが計算した実際のブロック間隔を改ページに使い、不要なページ下部の空白を減らしました。',
        '`---` は通常の区切り線として維持し、`<!-- pagebreak -->` だけが改ページを行います。',
      ],
    },
  },
]
