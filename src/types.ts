export type Locale = 'zh-CN' | 'en'

export type Appearance = 'light' | 'dark'

export type MobilePane = 'editor' | 'preview' | 'settings'

export type InspectorTab = 'theme' | 'canvas' | 'export'

export type ThemeId =
  | 'paper'
  | 'sunrise'
  | 'forest'
  | 'ocean'
  | 'night'
  | 'mono'
  | 'berry'
  | 'terminal'

export type CanvasPreset =
  | 'auto'
  | 'square'
  | 'portrait'
  | 'xiaohongshu'
  | 'social'
  | 'a4'
  | 'letter'
  | 'custom'

export type ExportFormat =
  | 'png'
  | 'jpeg'
  | 'webp'
  | 'svg'
  | 'pdf'
  | 'print'
  | 'clipboard'
  | 'split-zip'

export type PdfSize = 'a4' | 'letter'
export type PdfOrientation = 'portrait' | 'landscape'

export interface ThemeConfig {
  id: ThemeId
  name: Record<Locale, string>
  surface: string
  text: string
  muted: string
  accent: string
  accentSoft: string
  border: string
  codeBackground: string
  headingFont: string
  bodyFont: string
  preview: [string, string, string]
}

export interface CanvasConfig {
  preset: CanvasPreset
  width: number
  minHeight: number
  paddingX: number
  paddingY: number
  fontSize: number
  lineHeight: number
  cornerRadius: number
  shadow: boolean
  transparent: boolean
  backgroundColor: string
  backgroundAssetId?: string
  customFontAssetId?: string
}

export interface ExportConfig {
  format: ExportFormat
  scale: 1 | 2 | 3
  quality: number
  filename: string
  pdfSize: PdfSize
  pdfOrientation: PdfOrientation
  pdfMargin: number
  splitHeight: number
}

export interface DocumentState {
  markdown: string
  locale: Locale
  appearance: Appearance
  themeId: ThemeId
  canvas: CanvasConfig
  export: ExportConfig
  customCss: string
  editorCollapsed: boolean
  inspectorCollapsed: boolean
  mobilePane: MobilePane
  inspectorTab: InspectorTab
}

export interface AssetRecord {
  id: string
  name: string
  mime: string
  kind: 'image' | 'font'
  blob: Blob | ArrayBuffer
  createdAt: number
}

export interface ExportResult {
  filename: string
  format: ExportFormat
  parts?: number
}
