import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSegment } from './export'

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
  })
})
