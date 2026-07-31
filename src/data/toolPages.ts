import pageData from './toolPages.json'
import japanesePageData from './toolPages.ja.json'
import type { Locale, SplitMode } from '../types'

export type ToolPageLocale = Locale

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
  ja: string
}

export interface ToolPageDefaults {
  exportFormat: 'png' | 'pdf' | 'split-zip'
  canvasPreset?: 'auto' | 'a4' | 'xiaohongshu'
  inspectorTab?: 'canvas' | 'export'
  scale?: 1 | 2 | 3
  splitHeight?: number
  splitMode?: SplitMode
  codeLanguage?: string
}

export interface ToolPage {
  id: string
  path: string
  enPath: string
  jaPath: string
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
  alternatePaths: Record<ToolPageLocale, string>
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

type JapanesePageContent = Omit<
  LocalizedToolPageContent,
  'steps' | 'schemaFeatures'
> & {
  steps: string[]
  schemaFeatures: string[]
}

const japanesePages = japanesePageData as Record<string, JapanesePageContent>

export const toolPages = pageData.map((page) => {
  const japanese = japanesePages[page.id]
  if (!japanese) throw new Error(`Missing Japanese content for ${page.id}`)

  return {
    ...page,
    jaPath: page.enPath.replace(/^\/en\//, '/ja/'),
    title: { ...page.title, ja: japanese.title },
    description: { ...page.description, ja: japanese.description },
    h1: { ...page.h1, ja: japanese.h1 },
    intro: { ...page.intro, ja: japanese.intro },
    steps: { ...page.steps, ja: japanese.steps },
    limitations: { ...page.limitations, ja: japanese.limitations },
    sample: { ...page.sample, ja: japanese.sample },
    schemaFeatures: { ...page.schemaFeatures, ja: japanese.schemaFeatures },
  }
}) as ToolPage[]

export const getToolPagePath = (
  page: Pick<ToolPage, 'path' | 'enPath' | 'jaPath'>,
  locale: ToolPageLocale,
) => {
  if (locale === 'en') return page.enPath
  if (locale === 'ja') return page.jaPath
  return page.path
}

const normalizePathname = (pathname: string) => {
  const withoutQuery = pathname.split(/[?#]/, 1)[0] || '/'
  return withoutQuery.endsWith('/') ? withoutQuery : `${withoutQuery}/`
}

export const resolveToolPage = (
  pathname: string,
): ResolvedToolPage | undefined => {
  const normalized = normalizePathname(pathname)

  for (const page of toolPages) {
    for (const locale of ['zh-CN', 'en', 'ja'] as const) {
      const path = getToolPagePath(page, locale)
      if (normalized === path) {
        return {
          page,
          locale,
          canonicalPath: path,
          alternatePaths: {
            'zh-CN': page.path,
            en: page.enPath,
            ja: page.jaPath,
          },
        }
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
