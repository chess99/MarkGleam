import { createRef, useEffect } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '../store'
import { MarkdownPreview } from './MarkdownPreview'

const mermaidLifecycle = vi.hoisted(() => ({
  mounts: 0,
  unmounts: 0,
}))

vi.mock('./MermaidBlock', () => ({
  MermaidBlock({ chart }: { chart: string }) {
    useEffect(() => {
      mermaidLifecycle.mounts += 1
      return () => {
        mermaidLifecycle.unmounts += 1
      }
    }, [])
    return <div data-testid="mermaid-mock">{chart}</div>
  },
}))

describe('MarkdownPreview', () => {
  beforeEach(() => {
    mermaidLifecycle.mounts = 0
    mermaidLifecycle.unmounts = 0
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

  it('keeps Mermaid mounted when the preview rerenders', () => {
    useAppStore.setState({
      markdown: '```mermaid\ngraph TD\n  A --> B\n```',
    })
    const surfaceRef = createRef<HTMLDivElement>()
    const { rerender } = render(
      <MarkdownPreview
        surfaceRef={surfaceRef}
        onHeightChange={() => undefined}
      />,
    )

    expect(screen.getByTestId('mermaid-mock')).toHaveTextContent('A --> B')
    expect(mermaidLifecycle.mounts).toBe(1)

    rerender(
      <MarkdownPreview
        surfaceRef={surfaceRef}
        onHeightChange={() => undefined}
      />,
    )

    expect(mermaidLifecycle.mounts).toBe(1)
    expect(mermaidLifecycle.unmounts).toBe(0)
  })
})
