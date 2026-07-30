export const PRODUCT = {
  name: 'MarkGleam',
  domain: 'markgleam.com',
  origin: 'https://markgleam.com',
  tagline: {
    'zh-CN': '把结构化内容做成可分享的视觉作品。',
    en: 'Structured content to share-ready visuals.',
  },
  signatureTagline: {
    'zh-CN': '把内容做成作品',
    en: 'Content, made visible.',
  },
} as const

/**
 * The public build has one explicit edition boundary. Future paid builds can
 * replace this capability object without putting unavailable controls in the
 * free interface.
 */
export const PUBLIC_CAPABILITIES = {
  exportSignature: 'required',
  customExportBrand: false,
  cleanExport: false,
} as const

export const requiresExportSignature = () =>
  PUBLIC_CAPABILITIES.exportSignature === 'required'
