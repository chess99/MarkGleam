import type { ExportConfig } from '../types'
import { sanitizeFilename } from './css'

const PRINT_HOST_SELECTOR = '[data-md2img-print-host]'

export interface PrintOptions {
  preserveBackground?: boolean
}

const waitForPrintReady = async (surface: HTMLElement) => {
  await document.fonts?.ready
  const images = [...surface.querySelectorAll<HTMLImageElement>('img')]
  await Promise.all(
    images.map(async (image) => {
      if (image.complete) return
      await new Promise<void>((resolve) => {
        image.addEventListener('load', () => resolve(), { once: true })
        image.addEventListener('error', () => resolve(), { once: true })
        window.setTimeout(resolve, 5000)
      })
    }),
  )
}

export const createPrintHost = (
  surface: HTMLElement,
  config: ExportConfig,
  options: PrintOptions = {},
) => {
  document.querySelector(PRINT_HOST_SELECTOR)?.remove()

  const host = document.createElement('div')
  host.className = 'md2img-print-root'
  host.dataset.md2imgPrintHost = 'true'

  const pageStyle = document.createElement('style')
  pageStyle.dataset.md2imgPrintPage = 'true'
  pageStyle.textContent = `@page { size: ${config.pdfSize.toUpperCase()} ${config.pdfOrientation}; margin: ${config.pdfMargin}mm; }`

  const printSurface = surface.cloneNode(true) as HTMLElement
  printSurface.classList.add('md2img-print-surface')
  printSurface.classList.toggle(
    'preserve-print-background',
    options.preserveBackground === true,
  )
  printSurface.style.width = 'auto'
  printSurface.style.height = 'auto'
  printSurface.style.minHeight = '0'
  printSurface.style.margin = '0'
  printSurface.style.padding = '0'
  printSurface.style.transform = 'none'
  printSurface.style.boxShadow = 'none'
  printSurface.style.borderRadius = '0'

  host.append(pageStyle, printSurface)
  document.body.append(host)
  return host
}

export const runPrint = async (
  surface: HTMLElement,
  config: ExportConfig,
  options: PrintOptions = {},
) => {
  await waitForPrintReady(surface)
  const host = createPrintHost(surface, config, options)
  const previousTitle = document.title
  const printTitle = sanitizeFilename(config.filename)
  let cleanupTimer: number | undefined
  let cleaned = false

  const cleanup = () => {
    if (cleaned) return
    cleaned = true
    if (cleanupTimer !== undefined) window.clearTimeout(cleanupTimer)
    window.removeEventListener('afterprint', cleanup)
    host.remove()
    document.title = previousTitle
  }

  window.addEventListener('afterprint', cleanup, { once: true })
  document.title = printTitle
  try {
    window.print()
    if (!cleaned) cleanupTimer = window.setTimeout(cleanup, 60_000)
  } catch (error) {
    cleanup()
    throw error
  }
}
