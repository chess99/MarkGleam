import { afterEach, describe, expect, it, vi } from 'vitest'
import { defaultExport } from '../store'
import { createPrintHost, runPrint } from './print'

const createSurface = () => {
  const surface = document.createElement('div')
  surface.id = 'md2img-export-surface'
  surface.className = 'export-surface has-shadow'
  surface.innerHTML = `
    <article class="markdown-body" data-export-content>
      <h1>Printable title</h1>
      <div data-page-break></div>
      <p>Searchable body</p>
    </article>
  `
  return surface
}

afterEach(() => {
  document.querySelector('[data-md2img-print-host]')?.remove()
  vi.restoreAllMocks()
})

describe('native print workflow', () => {
  it('creates a paper-sized print host without mutating the preview', () => {
    const surface = createSurface()
    const host = createPrintHost(
      surface,
      {
        ...defaultExport,
        format: 'print',
        pdfSize: 'letter',
        pdfOrientation: 'landscape',
        pdfMargin: 18,
      },
      { preserveBackground: true },
    )

    expect(host.querySelector('style')).toHaveTextContent(
      '@page { size: LETTER landscape; margin: 18mm; }',
    )
    expect(host.querySelector('.md2img-print-surface')).toHaveClass(
      'preserve-print-background',
    )
    expect(host.querySelector('[data-page-break]')).toBeInTheDocument()
    expect(surface).not.toHaveClass('md2img-print-surface')
  })

  it('prints with the requested filename and cleans up after printing', async () => {
    const surface = createSurface()
    const originalTitle = document.title
    let printedText = ''
    vi.spyOn(window, 'print').mockImplementation(() => {
      printedText =
        document.querySelector('[data-md2img-print-host]')?.textContent ?? ''
      window.dispatchEvent(new Event('afterprint'))
    })

    await runPrint(surface, {
      ...defaultExport,
      format: 'print',
      filename: 'Native print document',
    })

    expect(window.print).toHaveBeenCalledOnce()
    expect(printedText).toContain('Searchable body')
    expect(document.querySelector('[data-md2img-print-host]')).toBeNull()
    expect(document.title).toBe(originalTitle)
  })
})
