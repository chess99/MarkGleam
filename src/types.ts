export type Locale = 'zh-CN' | 'en' | 'ja'

export type ToolId =
  | 'visual-workspace'
  | 'markdown-to-image'
  | 'markdown-long-image'
  | 'xiaohongshu-long-article'
  | 'markdown-to-pdf'
  | 'mermaid-to-image'
  | 'formula-to-image'
  | 'code-to-image'
  | 'github-readme-to-image'
  | 'batch-markdown-to-image'

export type InputKind = 'markdown' | 'mermaid' | 'formula' | 'code'

export type ToolDrafts = Record<InputKind, string>

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
  | 'x'
  | 'linkedin'
  | 'wechat'
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

export type SplitMode = 'compact' | 'fixed'

export type PdfSize = 'a4' | 'letter'
export type PdfOrientation = 'portrait' | 'landscape'

export type SignatureStyle = 'minimal' | 'camera' | 'stamp'
export type SignatureTone = 'subtle' | 'solid'

export interface SignatureConfig {
  style: SignatureStyle
  tone: SignatureTone
}

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
  pdfHeader: string
  pdfFooter: string
  pdfPageNumbers: boolean
  splitHeight: number
  splitMode: SplitMode
}

export interface DocumentState {
  toolId: ToolId
  inputKind: InputKind
  drafts: ToolDrafts
  markdown: string
  codeLanguage: string
  locale: Locale
  appearance: Appearance
  themeId: ThemeId
  canvas: CanvasConfig
  signature: SignatureConfig
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
