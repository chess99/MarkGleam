import JSZip from 'jszip'
import { jsPDF } from 'jspdf'
import {
  domToJpeg,
  domToPng,
  domToSvg,
  domToWebp,
} from 'modern-screenshot'
import { PRODUCT, requiresExportSignature } from '../config/product'
import type { ExportConfig, ExportFormat, ExportResult } from '../types'
import { assetToBlob, getAsset } from './assets'
import { sanitizeFilename } from './css'
import {
  calculatePageContentHeight,
  calculateSafePartHeight,
  groupBlockHeights,
} from './pagination'
import { getSplitPagePlan } from './splitPagination'

export { calculateSplitContentBudget } from './splitPagination'

const MAX_CANVAS_PIXELS = 64_000_000

export interface ExportProgress {
  completed: number
  total: number
}

export interface RunExportOptions {
  signal?: AbortSignal
  onProgress?: (progress: ExportProgress) => void
  optimizeLongPdf?: boolean
}

export type ImageArtifactFormat = 'png' | 'jpeg' | 'webp' | 'svg'

export interface GeneratedArtifact {
  blob: Blob
  filename: string
  format: ImageArtifactFormat
}

export class FixedPageOverflowError extends Error {
  constructor() {
    super('A content block is taller than the fixed page content area')
    this.name = 'FixedPageOverflowError'
  }
}

const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) {
    throw new DOMException('Export canceled', 'AbortError')
  }
}

const yieldToBrowser = () =>
  new Promise<void>((resolve) => window.setTimeout(resolve, 0))

const dataUrlToBlob = async (dataUrl: string) => {
  const response = await fetch(dataUrl)
  return response.blob()
}

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(String(reader.result)))
    reader.addEventListener('error', () => reject(reader.error))
    reader.readAsDataURL(blob)
  })

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

export const waitForRenderReady = async (surface: HTMLElement) => {
  await document.fonts?.ready
  const timeoutAt = Date.now() + 8000

  while (
    surface.querySelector(
      '[data-mermaid-state="loading"], [data-render-state="loading"]',
    ) &&
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

const renderImageBlob = async (
  snapshot: HTMLElement,
  config: ExportConfig,
  format: ImageArtifactFormat,
) => {
  const renderers = {
    png: () => domToPng(snapshot, screenshotOptions(snapshot, config)),
    jpeg: () =>
      domToJpeg(snapshot, screenshotOptions(snapshot, config, 'image/jpeg')),
    webp: () =>
      domToWebp(snapshot, screenshotOptions(snapshot, config, 'image/webp')),
    svg: () =>
      domToSvg(snapshot, screenshotOptions(snapshot, { ...config, scale: 1 })),
  }
  const dataUrl = await renderers[format]()
  const blob = await dataUrlToBlob(dataUrl)
  if (blob.size < 128) throw new Error('Rendered image is unexpectedly empty')
  return blob
}

export const generateImageArtifact = async (
  surface: HTMLElement,
  config: ExportConfig,
  format: ImageArtifactFormat = 'png',
): Promise<GeneratedArtifact> => {
  const snapshot = await createExportSnapshot(surface)
  try {
    const blob = await renderImageBlob(snapshot, config, format)
    return {
      blob,
      filename: `${sanitizeFilename(config.filename)}.${extensionFor(format)}`,
      format,
    }
  } finally {
    removeMountedSnapshot(snapshot)
  }
}

const prepareSnapshotNode = (snapshot: HTMLElement) => {
  snapshot.id = 'md2img-export-surface'
  snapshot.dataset.exportSnapshot = 'true'
  snapshot.style.height = 'auto'
  snapshot.style.transform = 'none'
  snapshot.style.position = 'relative'
  snapshot.style.left = '0'
  snapshot.style.top = '0'
  snapshot.style.zIndex = 'auto'
}

const mountSnapshotOffscreen = (snapshot: HTMLElement) => {
  const host = document.createElement('div')
  host.dataset.md2imgExportHost = 'true'
  host.style.position = 'fixed'
  host.style.left = '-100000px'
  host.style.top = '0'
  host.style.width = 'max-content'
  host.style.height = 'max-content'
  host.style.pointerEvents = 'none'
  host.append(snapshot)
  document.body.append(host)
}

const removeMountedSnapshot = (snapshot: HTMLElement) => {
  const host = snapshot.closest<HTMLElement>('[data-md2img-export-host]')
  if (host) host.remove()
  else snapshot.remove()
}

const inlineLocalAssets = async (snapshot: HTMLElement) => {
  const images = [...snapshot.querySelectorAll<HTMLImageElement>('img')]
  await Promise.all(
    images.map(async (image) => {
      const assetId = image.dataset.md2imgAssetId
      let blob: Blob | undefined

      if (assetId) {
        const asset = await getAsset(assetId)
        blob = asset ? assetToBlob(asset) : undefined
      } else {
        const source = image.getAttribute('src') ?? ''
        if (source.startsWith('blob:')) {
          blob = await fetch(source).then((response) => response.blob())
        }
      }

      if (!blob) return
      image.removeAttribute('crossorigin')
      image.src = await blobToDataUrl(blob)
    }),
  )

  const backgroundAssetId = snapshot.dataset.md2imgBackgroundAssetId
  if (!backgroundAssetId) return
  const background = await getAsset(backgroundAssetId)
  if (!background) return
  const dataUrl = await blobToDataUrl(assetToBlob(background))
  const current = snapshot.style.backgroundImage
  snapshot.style.backgroundImage = current
    ? current.replace(/url\(["']?blob:[^)"']+["']?\)/, `url("${dataUrl}")`)
    : `url("${dataUrl}")`
}

const createExportSnapshot = async (surface: HTMLElement) => {
  await waitForRenderReady(surface)
  const snapshot = surface.cloneNode(true) as HTMLElement
  prepareSnapshotNode(snapshot)

  const explicitWidth = Number.parseFloat(surface.style.width)
  if (Number.isFinite(explicitWidth) && explicitWidth > 0) {
    snapshot.style.width = `${explicitWidth}px`
  }

  mountSnapshotOffscreen(snapshot)
  try {
    await inlineLocalAssets(snapshot)
    await waitForRenderReady(snapshot)
    if (snapshot.scrollWidth < 2 || snapshot.scrollHeight < 2) {
      throw new Error('Export surface has no measurable content')
    }
    return snapshot
  } catch (error) {
    removeMountedSnapshot(snapshot)
    throw error
  }
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

export const createSegment = (
  surface: HTMLElement,
  start: number,
  end: number,
  minHeight = 0,
  includeSignature = true,
): HTMLElement => {
  const sourceContent = surface.querySelector<HTMLElement>('[data-export-content]')
  if (!sourceContent) throw new Error('Export content is missing')

  const clone = surface.cloneNode(false) as HTMLElement
  prepareSnapshotNode(clone)
  clone.dataset.exportSegment = 'true'
  clone.style.minHeight = `${Math.max(0, minHeight)}px`
  clone.style.height = 'auto'

  surface.childNodes.forEach((node) => {
    if (node !== sourceContent) {
      if (
        !includeSignature &&
        node instanceof HTMLElement &&
        node.hasAttribute('data-export-signature')
      ) {
        return
      }
      clone.append(node.cloneNode(true))
      return
    }

    const content = sourceContent.cloneNode(false) as HTMLElement
    if (!includeSignature) content.style.paddingBottom = '0'
    const children = [...sourceContent.children]
    children.slice(start, end).forEach((child) => {
      if (!child.hasAttribute('data-page-break')) {
        content.append(child.cloneNode(true))
      }
    })
    clone.append(content)
  })

  mountSnapshotOffscreen(clone)
  return clone
}

const getPageGroups = (
  surface: HTMLElement,
  config: ExportConfig,
  maxContentHeight?: number,
) => {
  const content = surface.querySelector<HTMLElement>('[data-export-content]')
  if (!content) return []

  const children = [...content.children] as HTMLElement[]
  const rectangles = children.map((child) => child.getBoundingClientRect())
  const heights = rectangles.map((rectangle) => rectangle.height)
  const gapsBefore = rectangles.map((rectangle, index) =>
    index === 0
      ? 0
      : Math.max(0, rectangle.top - rectangles[index - 1].bottom),
  )
  const forcedBreaks = new Set<number>()
  children.forEach((child, index) => {
    if (child.hasAttribute('data-page-break')) forcedBreaks.add(index)
  })

  const availableHeight =
    maxContentHeight ??
    calculateSafePartHeight(config.splitHeight, config.scale)
  return groupBlockHeights(heights, availableHeight, forcedBreaks, gapsBefore)
}

export const decoratePdfSegment = (
  segment: HTMLElement,
  config: ExportConfig,
  pageNumber: number,
  pageCount: number,
) => {
  const addDecoration = (position: 'header' | 'footer') => {
    const customText =
      position === 'header' ? config.pdfHeader.trim() : config.pdfFooter.trim()
    const showPageNumber = position === 'footer' && config.pdfPageNumbers
    const showBrandSignature =
      position === 'footer' && requiresExportSignature()
    if (!customText && !showPageNumber && !showBrandSignature) return

    const decoration = document.createElement('div')
    decoration.dataset.md2imgPdfDecoration = position
    if (showBrandSignature) {
      decoration.dataset.exportSignature = 'pdf'
    }
    decoration.style.display = 'flex'
    decoration.style.alignItems = 'center'
    decoration.style.justifyContent = 'space-between'
    decoration.style.gap = '20px'
    decoration.style.minHeight = '34px'
    decoration.style.color = 'var(--theme-muted)'
    decoration.style.fontFamily = 'var(--theme-body-font)'
    decoration.style.fontSize = '12px'
    decoration.style.lineHeight = '1.4'
    decoration.style.borderTop =
      position === 'footer' ? '1px solid var(--theme-border)' : '0'
    decoration.style.borderBottom =
      position === 'header' ? '1px solid var(--theme-border)' : '0'
    decoration.style.padding = position === 'header' ? '0 0 10px' : '10px 0 0'

    const text = document.createElement('span')
    text.textContent = customText
    decoration.append(text)
    if (showBrandSignature) {
      const brand = document.createElement('span')
      brand.textContent = `Made with ${PRODUCT.name} · ${PRODUCT.domain}`
      brand.style.marginLeft = customText ? 'auto' : '0'
      decoration.append(brand)
    }
    if (showPageNumber) {
      const page = document.createElement('span')
      page.textContent = `${pageNumber} / ${pageCount}`
      page.style.marginLeft = 'auto'
      decoration.append(page)
    }

    if (position === 'header') segment.prepend(decoration)
    else segment.append(decoration)
  }

  addDecoration('header')
  addDecoration('footer')
}

const exportSplitZip = async (
  surface: HTMLElement,
  config: ExportConfig,
  baseName: string,
  options: RunExportOptions,
) => {
  const plan = getSplitPagePlan(surface, config)
  if (
    config.splitMode === 'fixed' &&
    (plan.oversizedBlocks.length > 0 || plan.horizontalOverflow)
  ) {
    throw new FixedPageOverflowError()
  }
  const groups = plan.groups
  const parts =
    groups.length > 0 ? groups : [{ start: 0, end: 9999, height: 0 }]

  const zip = new JSZip()
  options.onProgress?.({ completed: 0, total: parts.length })
  for (let index = 0; index < parts.length; index += 1) {
    throwIfAborted(options.signal)
    const group = parts[index]
    const segment = createSegment(
      surface,
      group.start,
      group.end,
      config.splitMode === 'fixed' ? plan.pageHeight : 0,
      index === parts.length - 1,
    )
    try {
      await waitForRenderReady(segment)
      const fixedWidth =
        segment.offsetWidth ||
        segment.clientWidth ||
        Number.parseFloat(getComputedStyle(segment).width)
      const fixedContentWidth = segment.clientWidth || fixedWidth
      if (
        config.splitMode === 'fixed' &&
        (Math.max(segment.scrollHeight, segment.offsetHeight) >
          plan.pageHeight + 1 ||
          !Number.isFinite(fixedWidth) ||
          fixedWidth < 1 ||
          segment.scrollWidth > fixedContentWidth + 1)
      ) {
        throw new FixedPageOverflowError()
      }
      const imageOptions = screenshotOptions(segment, config)
      if (config.splitMode === 'fixed') {
        imageOptions.width = fixedWidth
        imageOptions.height = plan.pageHeight
      }
      const dataUrl = await domToPng(segment, imageOptions)
      zip.file(
        `${baseName}-${String(index + 1).padStart(2, '0')}.png`,
        await dataUrlToBlob(dataUrl),
      )
      options.onProgress?.({ completed: index + 1, total: parts.length })
    } finally {
      removeMountedSnapshot(segment)
    }
    await yieldToBrowser()
  }

  throwIfAborted(options.signal)
  const blob = await zip.generateAsync({ type: 'blob' })
  throwIfAborted(options.signal)
  downloadBlob(blob, `${baseName}-parts.zip`)
  return parts.length
}

const exportPdf = async (
  surface: HTMLElement,
  config: ExportConfig,
  baseName: string,
  options: RunExportOptions,
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
  const surfaceStyle = getComputedStyle(surface)
  const verticalPadding =
    Number.parseFloat(surfaceStyle.paddingTop || '0') +
    Number.parseFloat(surfaceStyle.paddingBottom || '0')
  const decorationHeight =
    (config.pdfHeader.trim() ? 44 : 0) +
    (config.pdfFooter.trim() ||
    config.pdfPageNumbers ||
    requiresExportSignature()
      ? 44
      : 0)
  const maxContentHeight = Math.max(
    120,
    calculatePageContentHeight(
      surface.clientWidth,
      verticalPadding,
      imageWidth,
      imageHeight,
    ) - decorationHeight,
  )
  const groups = getPageGroups(surface, config, maxContentHeight)
  const pages = groups.length > 0 ? groups : [{ start: 0, end: 9999, height: 0 }]
  const minPageSurfaceHeight = maxContentHeight + verticalPadding
  const optimizeLongDocument =
    options.optimizeLongPdf !== false && pages.length >= 100
  const rasterScale = optimizeLongDocument ? 1 : config.scale
  const rasterQuality = optimizeLongDocument
    ? Math.min(config.quality, 0.82)
    : config.quality

  options.onProgress?.({ completed: 0, total: pages.length })
  for (let index = 0; index < pages.length; index += 1) {
    throwIfAborted(options.signal)
    if (index > 0) pdf.addPage(config.pdfSize, orientation)
    const page = pages[index]
    const segment = createSegment(
      surface,
      page.start,
      page.end,
      minPageSurfaceHeight,
      false,
    )
    try {
      decoratePdfSegment(segment, config, index + 1, pages.length)
      await waitForRenderReady(segment)
      const computedBackground = getComputedStyle(segment).backgroundColor
      const backgroundColor =
        computedBackground === 'rgba(0, 0, 0, 0)' ||
        computedBackground === 'transparent'
          ? '#ffffff'
          : computedBackground
      const scale = rasterScale
      const dataUrl = await domToJpeg(segment, {
        ...screenshotOptions(
          segment,
          { ...config, scale: rasterScale, quality: rasterQuality },
          'image/jpeg',
        ),
        scale,
        quality: rasterQuality,
        backgroundColor,
      })
      throwIfAborted(options.signal)
      const pixelWidth = segment.scrollWidth * scale
      const pixelHeight = segment.scrollHeight * scale
      const ratio = Math.min(imageWidth / pixelWidth, imageHeight / pixelHeight)
      const width = pixelWidth * ratio
      const height = pixelHeight * ratio
      pdf.addImage(
        dataUrl,
        'JPEG',
        config.pdfMargin + (imageWidth - width) / 2,
        config.pdfMargin,
        width,
        height,
        undefined,
        'FAST',
      )
      options.onProgress?.({ completed: index + 1, total: pages.length })
    } finally {
      removeMountedSnapshot(segment)
    }
    await yieldToBrowser()
  }

  throwIfAborted(options.signal)
  pdf.save(`${baseName}.pdf`)
  return pages.length
}

export const runExport = async (
  surface: HTMLElement,
  config: ExportConfig,
  options: RunExportOptions = {},
): Promise<ExportResult> => {
  throwIfAborted(options.signal)
  const baseName = sanitizeFilename(config.filename)
  const snapshot = await createExportSnapshot(surface)

  try {
    throwIfAborted(options.signal)
    const estimatedPixels =
      snapshot.scrollWidth * snapshot.scrollHeight * config.scale * config.scale

    if (
      config.format === 'split-zip' ||
      (estimatedPixels > MAX_CANVAS_PIXELS &&
        !['pdf', 'svg', 'clipboard'].includes(config.format))
    ) {
      const splitConfig =
        config.format === 'split-zip'
          ? config
          : { ...config, splitMode: 'compact' as const }
      const parts = await exportSplitZip(
        snapshot,
        splitConfig,
        baseName,
        options,
      )
      return { filename: `${baseName}-parts.zip`, format: 'split-zip', parts }
    }

    if (config.format === 'pdf') {
      const parts = await exportPdf(snapshot, config, baseName, options)
      return { filename: `${baseName}.pdf`, format: 'pdf', parts }
    }

    if (config.format === 'print') {
      throw new Error('Print exports must use the native print workflow')
    }

    if (config.format === 'clipboard') {
      const dataUrl = await domToPng(
        snapshot,
        screenshotOptions(snapshot, config),
      )
      throwIfAborted(options.signal)
      const blob = await dataUrlToBlob(dataUrl)
      if (blob.size < 128) throw new Error('Rendered image is unexpectedly empty')

      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ])
          return { filename: `${baseName}.png`, format: 'clipboard' }
        } catch {
          // Clipboard permissions differ across browsers; download is reliable.
        }
      }

      downloadBlob(blob, `${baseName}.png`)
      return { filename: `${baseName}.png`, format: 'png' }
    }

    const format = config.format as ImageArtifactFormat
    throwIfAborted(options.signal)
    const extension = extensionFor(format)
    const blob = await renderImageBlob(snapshot, config, format)
    downloadBlob(blob, `${baseName}.${extension}`)
    return { filename: `${baseName}.${extension}`, format }
  } finally {
    removeMountedSnapshot(snapshot)
  }
}
