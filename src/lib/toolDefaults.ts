import type { ToolPage, ToolPageDefaults } from '../data/toolPages'
import type { RouteDefaults } from '../types'

const getCanvasDefaults = (
  preset: ToolPageDefaults['canvasPreset'],
): RouteDefaults['canvas'] => {
  if (preset === 'a4') {
    return { preset: 'a4', width: 794, minHeight: 1123 }
  }
  if (preset === 'xiaohongshu') {
    return {
      preset: 'xiaohongshu',
      width: 1080,
      minHeight: 1440,
      cornerRadius: 0,
      shadow: false,
      transparent: false,
    }
  }
  if (preset === 'auto') {
    return { preset: 'auto', width: 1080, minHeight: 720 }
  }
  return undefined
}

export const getRouteDefaults = (
  defaults: ToolPageDefaults,
): RouteDefaults => ({
  canvas: getCanvasDefaults(defaults.canvasPreset),
  export: {
    format: defaults.exportFormat,
    ...(defaults.exportFormat === 'pdf' && defaults.canvasPreset === 'a4'
      ? { pdfSize: 'a4' as const }
      : {}),
    ...(defaults.scale !== undefined ? { scale: defaults.scale } : {}),
    ...(defaults.splitHeight !== undefined
      ? { splitHeight: defaults.splitHeight }
      : {}),
    ...(defaults.splitMode !== undefined
      ? { splitMode: defaults.splitMode }
      : {}),
  },
  codeLanguage: defaults.codeLanguage,
  inspectorTab: defaults.inspectorTab,
})

export const getToolRecommendation = (
  page: Pick<ToolPage, 'id' | 'defaults'>,
): RouteDefaults | undefined => {
  if (page.id === 'visual-workspace') return undefined
  const defaults = getRouteDefaults(page.defaults)
  return {
    canvas: defaults.canvas,
    export: defaults.export,
  }
}
