import pageData from './toolPages.json'

export type ToolPageLocale = 'zh-CN' | 'en'

export type ToolInputKind =
  | 'markdown'
  | 'mermaid'
  | 'formula'
  | 'code'
  | 'github-readme'
  | 'batch'

export interface LocalizedText {
  'zh-CN': string
  en: string
}

export interface ToolPageDefaults {
  exportFormat: 'png' | 'pdf' | 'split-zip'
  canvasPreset?: 'auto' | 'a4'
  inspectorTab?: 'canvas' | 'export'
  splitHeight?: number
  codeLanguage?: string
}

export interface ToolPage {
  id: string
  path: string
  enPath: string
  inputKind: ToolInputKind
  title: LocalizedText
  description: LocalizedText
  h1: LocalizedText
  intro: LocalizedText
  steps: Record<ToolPageLocale, string[]>
  limitations: LocalizedText
  sample: LocalizedText
  defaults: ToolPageDefaults
  schemaFeatures: Record<ToolPageLocale, string[]>
}

export interface ResolvedToolPage {
  page: ToolPage
  locale: ToolPageLocale
  canonicalPath: string
  alternatePath: string
}

export interface LocalizedToolPageContent {
  title: string
  description: string
  h1: string
  intro: string
  steps: string[]
  limitations: string
  sample: string
  schemaFeatures: string[]
}

export const toolPages = pageData as ToolPage[]

const normalizePathname = (pathname: string) => {
  const withoutQuery = pathname.split(/[?#]/, 1)[0] || '/'
  return withoutQuery.endsWith('/') ? withoutQuery : `${withoutQuery}/`
}

export const resolveToolPage = (
  pathname: string,
): ResolvedToolPage | undefined => {
  const normalized = normalizePathname(pathname)

  for (const page of toolPages) {
    if (normalized === page.path) {
      return {
        page,
        locale: 'zh-CN',
        canonicalPath: page.path,
        alternatePath: page.enPath,
      }
    }
    if (normalized === page.enPath) {
      return {
        page,
        locale: 'en',
        canonicalPath: page.enPath,
        alternatePath: page.path,
      }
    }
  }

  return undefined
}

export const getLocalizedPageContent = (
  page: ToolPage,
  locale: ToolPageLocale,
): LocalizedToolPageContent => ({
  title: page.title[locale],
  description: page.description[locale],
  h1: page.h1[locale],
  intro: page.intro[locale],
  steps: page.steps[locale],
  limitations: page.limitations[locale],
  sample: page.sample[locale],
  schemaFeatures: page.schemaFeatures[locale],
})

export const getLocalizedEditorSample = (
  page: ToolPage,
  locale: ToolPageLocale,
) => {
  if (page.inputKind !== 'github-readme') return page.sample[locale]

  const markdownPage = toolPages.find(
    (candidate) => candidate.id === 'markdown-to-image',
  )
  if (!markdownPage) throw new Error('Missing markdown-to-image sample')
  return markdownPage.sample[locale]
}
