import { describe, expect, it } from 'vitest'
import { toolPages } from '../data/toolPages'
import { getRouteDefaults, getToolRecommendation } from './toolDefaults'

const page = (id: string) => {
  const match = toolPages.find((candidate) => candidate.id === id)
  if (!match) throw new Error(`Missing tool page: ${id}`)
  return match
}

const autoCanvas = { preset: 'auto', width: 1080, minHeight: 720 }
const a4Canvas = { preset: 'a4', width: 794, minHeight: 1123 }
const xiaohongshuCanvas = {
  preset: 'xiaohongshu',
  width: 1080,
  minHeight: 1440,
  cornerRadius: 0,
  shadow: false,
  transparent: false,
}

interface ToolDefaultsCase {
  id: string
  canvas: Record<string, unknown>
  export: Record<string, unknown>
  codeLanguage?: string
  inspectorTab: 'theme' | 'canvas' | 'export'
}

const cases: ToolDefaultsCase[] = [
  {
    id: 'visual-workspace',
    canvas: autoCanvas,
    export: { format: 'png' },
    inspectorTab: 'canvas',
  },
  {
    id: 'markdown-to-image',
    canvas: autoCanvas,
    export: { format: 'png' },
    inspectorTab: 'theme',
  },
  {
    id: 'markdown-long-image',
    canvas: autoCanvas,
    export: {
      format: 'split-zip',
      scale: 2,
      splitHeight: 4096,
      splitMode: 'compact',
    },
    inspectorTab: 'export',
  },
  {
    id: 'xiaohongshu-long-article',
    canvas: xiaohongshuCanvas,
    export: {
      format: 'split-zip',
      scale: 1,
      splitHeight: 1440,
      splitMode: 'fixed',
    },
    inspectorTab: 'export',
  },
  {
    id: 'markdown-to-pdf',
    canvas: a4Canvas,
    export: { format: 'pdf', pdfSize: 'a4' },
    inspectorTab: 'export',
  },
  {
    id: 'mermaid-to-image',
    canvas: autoCanvas,
    export: { format: 'png' },
    inspectorTab: 'canvas',
  },
  {
    id: 'formula-to-image',
    canvas: autoCanvas,
    export: { format: 'png' },
    inspectorTab: 'canvas',
  },
  {
    id: 'code-to-image',
    canvas: autoCanvas,
    export: { format: 'png' },
    codeLanguage: 'typescript',
    inspectorTab: 'canvas',
  },
  {
    id: 'github-readme-to-image',
    canvas: autoCanvas,
    export: { format: 'png' },
    inspectorTab: 'canvas',
  },
  {
    id: 'batch-markdown-to-image',
    canvas: autoCanvas,
    export: { format: 'png' },
    inspectorTab: 'export',
  },
]

describe('tool route defaults', () => {
  it.each(cases)(
    'maps the complete route-entry defaults for $id',
    ({ id, canvas, export: exportConfig, codeLanguage, inspectorTab }) => {
      expect(getRouteDefaults(page(id).defaults)).toEqual({
        canvas,
        export: exportConfig,
        codeLanguage,
        inspectorTab,
      })
    },
  )

  it.each(cases.filter(({ id }) => id !== 'visual-workspace'))(
    'exposes only output recommendations for $id',
    ({ id, canvas, export: exportConfig }) => {
      expect(getToolRecommendation(page(id))).toEqual({
        canvas,
        export: exportConfig,
      })
    },
  )

  it('keeps code language and inspector tab as route-entry context only', () => {
    const code = page('code-to-image')

    expect(getRouteDefaults(code.defaults)).toMatchObject({
      codeLanguage: 'typescript',
      inspectorTab: 'canvas',
    })
    expect(getToolRecommendation(code)).not.toHaveProperty('codeLanguage')
    expect(getToolRecommendation(code)).not.toHaveProperty('inspectorTab')
  })

  it('owns A4 paper size without taking over other PDF preferences', () => {
    expect(getToolRecommendation(page('markdown-to-pdf'))?.export).toEqual({
      format: 'pdf',
      pdfSize: 'a4',
    })
  })

  it('does not offer a recommendation reset on the persistent workspace', () => {
    expect(getToolRecommendation(page('visual-workspace'))).toBeUndefined()
  })
})
