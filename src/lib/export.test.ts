import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  calculateSplitContentBudget,
  createSegment,
  decoratePdfSegment,
} from './export'
import type { ExportConfig } from '../types'

const pdfConfig: ExportConfig = {
  format: 'pdf',
  scale: 2,
  quality: 0.92,
  filename: 'document',
  pdfSize: 'a4',
  pdfOrientation: 'portrait',
  pdfMargin: 12,
  pdfHeader: 'Project brief',
  pdfFooter: 'Internal',
  pdfPageNumbers: true,
  splitHeight: 4096,
}

describe('createSegment', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('clones only the requested page content and preserves the surface shell', () => {
    const surface = document.createElement('div')
    surface.className = 'export-surface'
    surface.innerHTML = `
      <style>.markdown-body { color: black; }</style>
      <article data-export-content>
        <p>First</p>
        <p>Second</p>
        <div data-page-break></div>
        <p>Third</p>
        <p>Fourth</p>
      </article>
      <footer data-export-signature>Made with MarkGleam</footer>
    `
    const cloneSpy = vi.spyOn(surface, 'cloneNode')

    const segment = createSegment(surface, 1, 4, 900)

    expect(cloneSpy).toHaveBeenCalledWith(false)
    expect(segment.style.minHeight).toBe('900px')
    expect(segment.querySelector('style')).toBeInTheDocument()
    expect(segment.querySelector('[data-export-content]')?.textContent).toContain(
      'Second',
    )
    expect(segment.querySelector('[data-export-content]')?.textContent).toContain(
      'Third',
    )
    expect(segment.querySelector('[data-export-content]')?.textContent).not.toContain(
      'First',
    )
    expect(segment.querySelector('[data-export-content]')?.textContent).not.toContain(
      'Fourth',
    )
    expect(segment.querySelector('[data-page-break]')).not.toBeInTheDocument()
    expect(segment.querySelector('[data-export-signature]')).toHaveTextContent(
      'Made with MarkGleam',
    )
  })

  it('can omit the full signature from intermediate export segments', () => {
    const surface = document.createElement('div')
    surface.innerHTML = `
      <article data-export-content><p>First</p></article>
      <footer data-export-signature>Made with MarkGleam</footer>
    `

    const segment = createSegment(surface, 0, 1, 0, false)

    expect(segment.querySelector('[data-export-content]')).toHaveTextContent('First')
    expect(segment.querySelector('[data-export-signature]')).not.toBeInTheDocument()
  })
})

describe('calculateSplitContentBudget', () => {
  it('reserves surface padding and the final signature inside the safe part height', () => {
    expect(calculateSplitContentBudget(4096, 144, 96)).toBe(3856)
  })

  it('never returns a non-positive content budget', () => {
    expect(calculateSplitContentBudget(640, 500, 300)).toBe(1)
  })
})

describe('decoratePdfSegment', () => {
  it('renders header, footer and page count inside the rasterized page', () => {
    const segment = document.createElement('section')
    segment.innerHTML = '<article>Body</article>'

    decoratePdfSegment(segment, pdfConfig, 2, 5)

    const header = segment.querySelector('[data-md2img-pdf-decoration="header"]')
    const footer = segment.querySelector('[data-md2img-pdf-decoration="footer"]')
    expect(header).toHaveTextContent('Project brief')
    expect(footer).toHaveTextContent('Internal')
    expect(footer).toHaveTextContent('Made with MarkGleam · markgleam.com')
    expect(footer).toHaveTextContent('2 / 5')
    expect(footer).toHaveAttribute('data-export-signature', 'pdf')
    expect(segment.firstElementChild).toBe(header)
    expect(segment.lastElementChild).toBe(footer)
  })

  it('keeps the lightweight brand footer when custom decorations are empty', () => {
    const segment = document.createElement('section')

    decoratePdfSegment(
      segment,
      {
        ...pdfConfig,
        pdfHeader: ' ',
        pdfFooter: '',
        pdfPageNumbers: false,
      },
      1,
      1,
    )

    expect(segment.children).toHaveLength(1)
    expect(segment.firstElementChild).toHaveAttribute(
      'data-export-signature',
      'pdf',
    )
    expect(segment.firstElementChild).toHaveTextContent(
      'Made with MarkGleam · markgleam.com',
    )
  })
})
