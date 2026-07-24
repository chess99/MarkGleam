import JSZip from 'jszip'
import { jsPDF } from 'jspdf'
import {
  domToCanvas,
  domToJpeg,
  domToPng,
  domToSvg,
  domToWebp,
} from 'modern-screenshot'
import type { ExportConfig, ExportFormat, ExportResult } from '../types'
import { sanitizeFilename } from './css'
import { calculateSafePartHeight, groupBlockHeights } from './pagination'

const MAX_CANVAS_PIXELS = 64_000_000

const dataUrlToBlob = async (dataUrl: string) => {
  const response = await fetch(dataUrl)
  return response.blob()
}

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const extensionFor = (format: ExportFormat) =>
  format === 'jpeg' ? 'jpg' : format === 'clipboard' ? 'png' : format

const waitForRenderReady = async (surface: HTMLElement) => {
  await document.fonts?.ready
  const timeoutAt = Date.now() + 8000

  while (
    surface.querySelector('[data-mermaid-state="loading"]') &&
    Date.now() < timeoutAt
  ) {
    await new Promise((resolve) => setTimeout(resolve, 80))
  }

  const images = [...surface.querySelectorAll('img')]
  await Promise.all(
    images.map((image) => {
      if (image.complete) return Promise.resolve()
      return new Promise<void>((resolve) => {
        image.addEventListener('load', () => resolve(), { once: true })
        image.addEventListener('error', () => resolve(), { once: true })
        setTimeout(resolve, 5000)
      })
    }),
  )
}

const screenshotOptions = (
  surface: HTMLElement,
  config: ExportConfig,
  type?: string,
) => ({
  width: surface.scrollWidth,
  height: surface.scrollHeight,
  scale: config.scale,
  quality: config.quality,
  type,
  backgroundColor: null,
  maximumCanvasSize: MAX_CANVAS_PIXELS,
  fetch: {
    requestInit: { mode: 'cors' as RequestMode, cache: 'force-cache' as RequestCache },
  },
})

const createSegment = (
  surface: HTMLElement,
  start: number,
  end: number,
): HTMLElement => {
  const clone = surface.cloneNode(true) as HTMLElement
  clone.id = 'md2img-export-surface'
  clone.dataset.exportSegment = 'true'
  clone.style.minHeight = '0'
  clone.style.height = 'auto'
  clone.style.transform = 'none'
  clone.style.position = 'fixed'
  clone.style.left = '-100000px'
  clone.style.top = '0'
  clone.style.zIndex = '-1'

  const content = clone.querySelector<HTMLElement>('[data-export-content]')
  if (!content) throw new Error('Export content is missing')

  const children = [...content.children]
  children.forEach((child, index) => {
    if (index < start || index >= end || child.hasAttribute('data-page-break')) {
      child.remove()
    }
  })

  document.body.append(clone)
  return clone
}

const getPageGroups = (
  surface: HTMLElement,
  config: ExportConfig,
  usePaperHeight = false,
) => {
  const content = surface.querySelector<HTMLElement>('[data-export-content]')
  if (!content) return []

  const children = [...content.children] as HTMLElement[]
  const heights = children.map((child) => {
    const style = getComputedStyle(child)
    return (
      child.getBoundingClientRect().height +
      Number.parseFloat(style.marginTop || '0') +
      Number.parseFloat(style.marginBottom || '0')
    )
  })
  const forcedBreaks = new Set<number>()
  children.forEach((child, index) => {
    if (child.hasAttribute('data-page-break')) forcedBreaks.add(index)
  })

  const paperRatio =
    config.pdfSize === 'a4' ? 297 / 210 : 11 / 8.5
  const orientedRatio =
    config.pdfOrientation === 'portrait' ? paperRatio : 1 / paperRatio
  const availableHeight = usePaperHeight
    ? Math.max(640, surface.clientWidth * orientedRatio - 160)
    : calculateSafePartHeight(config.splitHeight, config.scale)
  return groupBlockHeights(heights, availableHeight, forcedBreaks)
}

const exportSplitZip = async (
  surface: HTMLElement,
  config: ExportConfig,
  baseName: string,
) => {
  const groups = getPageGroups(surface, config)
  if (groups.length === 0) throw new Error('Nothing to export')

  const zip = new JSZip()
  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index]
    const segment = createSegment(surface, group.start, group.end)
    try {
      await waitForRenderReady(segment)
      const dataUrl = await domToPng(segment, screenshotOptions(segment, config))
      zip.file(
        `${baseName}-${String(index + 1).padStart(2, '0')}.png`,
        await dataUrlToBlob(dataUrl),
      )
    } finally {
      segment.remove()
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  downloadBlob(blob, `${baseName}-parts.zip`)
  return groups.length
}

const exportPdf = async (
  surface: HTMLElement,
  config: ExportConfig,
  baseName: string,
) => {
  const orientation = config.pdfOrientation === 'landscape' ? 'landscape' : 'portrait'
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: config.pdfSize,
    compress: true,
  })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const imageWidth = pageWidth - config.pdfMargin * 2
  const imageHeight = pageHeight - config.pdfMargin * 2
  const groups = getPageGroups(surface, config, true)
  const pages = groups.length > 0 ? groups : [{ start: 0, end: 9999, height: 0 }]

  for (let index = 0; index < pages.length; index += 1) {
    if (index > 0) pdf.addPage(config.pdfSize, orientation)
    const page = pages[index]
    const segment = createSegment(surface, page.start, page.end)
    try {
      await waitForRenderReady(segment)
      const canvas = await domToCanvas(segment, {
        ...screenshotOptions(segment, { ...config, scale: 2 }),
        scale: 2,
      })
      const ratio = Math.min(imageWidth / canvas.width, imageHeight / canvas.height)
      const width = canvas.width * ratio
      const height = canvas.height * ratio
      pdf.addImage(
        canvas.toDataURL('image/jpeg', config.quality),
        'JPEG',
        config.pdfMargin + (imageWidth - width) / 2,
        config.pdfMargin,
        width,
        height,
        undefined,
        'FAST',
      )
    } finally {
      segment.remove()
    }
  }

  pdf.save(`${baseName}.pdf`)
  return pages.length
}

export const runExport = async (
  surface: HTMLElement,
  config: ExportConfig,
): Promise<ExportResult> => {
  await waitForRenderReady(surface)
  const baseName = sanitizeFilename(config.filename)
  const estimatedPixels =
    surface.scrollWidth * surface.scrollHeight * config.scale * config.scale

  if (
    config.format === 'split-zip' ||
    (estimatedPixels > MAX_CANVAS_PIXELS &&
      !['pdf', 'svg', 'clipboard'].includes(config.format))
  ) {
    const parts = await exportSplitZip(surface, config, baseName)
    return { filename: `${baseName}-parts.zip`, format: 'split-zip', parts }
  }

  if (config.format === 'pdf') {
    const parts = await exportPdf(surface, config, baseName)
    return { filename: `${baseName}.pdf`, format: 'pdf', parts }
  }

  if (config.format === 'clipboard') {
    if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
      const fallback = await domToPng(surface, screenshotOptions(surface, config))
      downloadBlob(await dataUrlToBlob(fallback), `${baseName}.png`)
      return { filename: `${baseName}.png`, format: 'png' }
    }
    const dataUrl = await domToPng(surface, screenshotOptions(surface, config))
    const blob = await dataUrlToBlob(dataUrl)
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    return { filename: `${baseName}.png`, format: 'clipboard' }
  }

  const renderers = {
    png: () => domToPng(surface, screenshotOptions(surface, config)),
    jpeg: () =>
      domToJpeg(surface, screenshotOptions(surface, config, 'image/jpeg')),
    webp: () =>
      domToWebp(surface, screenshotOptions(surface, config, 'image/webp')),
    svg: () => domToSvg(surface, screenshotOptions(surface, { ...config, scale: 1 })),
  }

  const format = config.format as keyof typeof renderers
  const dataUrl = await renderers[format]()
  const extension = extensionFor(format)
  const blob = await dataUrlToBlob(dataUrl)
  downloadBlob(blob, `${baseName}.${extension}`)
  return { filename: `${baseName}.${extension}`, format }
}
