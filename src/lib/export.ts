import JSZip from 'jszip'
import { jsPDF } from 'jspdf'
import {
  domToJpeg,
  domToPng,
  domToSvg,
  domToWebp,
} from 'modern-screenshot'
import type { ExportConfig, ExportFormat, ExportResult } from '../types'
import { assetToBlob, getAsset } from './assets'
import { sanitizeFilename } from './css'
import {
  calculatePageContentHeight,
  calculateSafePartHeight,
  groupBlockHeights,
} from './pagination'

const MAX_CANVAS_PIXELS = 64_000_000

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

const createSegment = (
  surface: HTMLElement,
  start: number,
  end: number,
): HTMLElement => {
  const clone = surface.cloneNode(true) as HTMLElement
  prepareSnapshotNode(clone)
  clone.dataset.exportSegment = 'true'
  clone.style.minHeight = '0'
  clone.style.height = 'auto'

  const content = clone.querySelector<HTMLElement>('[data-export-content]')
  if (!content) throw new Error('Export content is missing')

  const children = [...content.children]
  children.forEach((child, index) => {
    if (index < start || index >= end || child.hasAttribute('data-page-break')) {
      child.remove()
    }
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

  const availableHeight =
    maxContentHeight ??
    calculateSafePartHeight(config.splitHeight, config.scale)
  return groupBlockHeights(heights, availableHeight, forcedBreaks)
}

const exportSplitZip = async (
  surface: HTMLElement,
  config: ExportConfig,
  baseName: string,
) => {
  const groups = getPageGroups(surface, config)
  const parts =
    groups.length > 0 ? groups : [{ start: 0, end: 9999, height: 0 }]

  const zip = new JSZip()
  for (let index = 0; index < parts.length; index += 1) {
    const group = parts[index]
    const segment = createSegment(surface, group.start, group.end)
    try {
      await waitForRenderReady(segment)
      const dataUrl = await domToPng(segment, screenshotOptions(segment, config))
      zip.file(
        `${baseName}-${String(index + 1).padStart(2, '0')}.png`,
        await dataUrlToBlob(dataUrl),
      )
    } finally {
      removeMountedSnapshot(segment)
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  downloadBlob(blob, `${baseName}-parts.zip`)
  return parts.length
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
  const surfaceStyle = getComputedStyle(surface)
  const verticalPadding =
    Number.parseFloat(surfaceStyle.paddingTop || '0') +
    Number.parseFloat(surfaceStyle.paddingBottom || '0')
  const maxContentHeight = calculatePageContentHeight(
    surface.clientWidth,
    verticalPadding,
    imageWidth,
    imageHeight,
  )
  const groups = getPageGroups(surface, config, maxContentHeight)
  const pages = groups.length > 0 ? groups : [{ start: 0, end: 9999, height: 0 }]

  for (let index = 0; index < pages.length; index += 1) {
    if (index > 0) pdf.addPage(config.pdfSize, orientation)
    const page = pages[index]
    const segment = createSegment(surface, page.start, page.end)
    try {
      await waitForRenderReady(segment)
      const computedBackground = getComputedStyle(segment).backgroundColor
      const backgroundColor =
        computedBackground === 'rgba(0, 0, 0, 0)' ||
        computedBackground === 'transparent'
          ? '#ffffff'
          : computedBackground
      const scale = 2
      const dataUrl = await domToPng(segment, {
        ...screenshotOptions(segment, { ...config, scale: 2 }),
        scale,
        backgroundColor,
      })
      const pixelWidth = segment.scrollWidth * scale
      const pixelHeight = segment.scrollHeight * scale
      const ratio = Math.min(imageWidth / pixelWidth, imageHeight / pixelHeight)
      const width = pixelWidth * ratio
      const height = pixelHeight * ratio
      pdf.addImage(
        dataUrl,
        'PNG',
        config.pdfMargin + (imageWidth - width) / 2,
        config.pdfMargin,
        width,
        height,
        undefined,
        'FAST',
      )
    } finally {
      removeMountedSnapshot(segment)
    }
  }

  pdf.save(`${baseName}.pdf`)
  return pages.length
}

export const runExport = async (
  surface: HTMLElement,
  config: ExportConfig,
): Promise<ExportResult> => {
  const baseName = sanitizeFilename(config.filename)
  const snapshot = await createExportSnapshot(surface)

  try {
    const estimatedPixels =
      snapshot.scrollWidth * snapshot.scrollHeight * config.scale * config.scale

    if (
      config.format === 'split-zip' ||
      (estimatedPixels > MAX_CANVAS_PIXELS &&
        !['pdf', 'svg', 'clipboard'].includes(config.format))
    ) {
      const parts = await exportSplitZip(snapshot, config, baseName)
      return { filename: `${baseName}-parts.zip`, format: 'split-zip', parts }
    }

    if (config.format === 'pdf') {
      const parts = await exportPdf(snapshot, config, baseName)
      return { filename: `${baseName}.pdf`, format: 'pdf', parts }
    }

    if (config.format === 'clipboard') {
      const dataUrl = await domToPng(
        snapshot,
        screenshotOptions(snapshot, config),
      )
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

    const renderers = {
      png: () => domToPng(snapshot, screenshotOptions(snapshot, config)),
      jpeg: () =>
        domToJpeg(snapshot, screenshotOptions(snapshot, config, 'image/jpeg')),
      webp: () =>
        domToWebp(snapshot, screenshotOptions(snapshot, config, 'image/webp')),
      svg: () =>
        domToSvg(snapshot, screenshotOptions(snapshot, { ...config, scale: 1 })),
    }

    const format = config.format as keyof typeof renderers
    const dataUrl = await renderers[format]()
    const extension = extensionFor(format)
    const blob = await dataUrlToBlob(dataUrl)
    if (blob.size < 128) throw new Error('Rendered image is unexpectedly empty')
    downloadBlob(blob, `${baseName}.${extension}`)
    return { filename: `${baseName}.${extension}`, format }
  } finally {
    removeMountedSnapshot(snapshot)
  }
}
