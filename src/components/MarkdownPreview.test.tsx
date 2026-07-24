import { createRef } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAppStore } from '../store'
import { MarkdownPreview } from './MarkdownPreview'

describe('MarkdownPreview', () => {
  beforeEach(() => {
    useAppStore.setState({
      markdown:
        '# Hello\n\n**strong** and $E = mc^2$\n\n| A | B |\n| - | - |\n| 1 | 2 |',
      themeId: 'paper',
      customCss: '',
    })
  })

  it('renders headings, GFM tables and KaTeX safely', async () => {
    const surfaceRef = createRef<HTMLDivElement>()
    render(<MarkdownPreview surfaceRef={surfaceRef} />)

    expect(screen.getByRole('heading', { name: 'Hello' })).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
    await waitFor(() => expect(document.querySelector('.katex')).toBeTruthy())
    expect(surfaceRef.current).toHaveAttribute('id', 'md2img-export-surface')
  })

  it('does not execute raw HTML from Markdown', () => {
    useAppStore.setState({
      markdown: '<script>window.hacked = true</script><b>unsafe</b>',
    })
    const surfaceRef = createRef<HTMLDivElement>()
    render(<MarkdownPreview surfaceRef={surfaceRef} />)
    expect(document.querySelector('script')).not.toBeInTheDocument()
    expect(document.querySelector('.markdown-body b')).not.toBeInTheDocument()
  })
})
