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
    expect(
      surfaceRef.current?.querySelector('[data-export-signature]'),
    ).toHaveTextContent('MarkGleam')
  })

  it('renders the selected free signature style and tone', () => {
    useAppStore.setState({
      signature: { style: 'stamp', tone: 'solid' },
    })
    const surfaceRef = createRef<HTMLDivElement>()

    render(<MarkdownPreview surfaceRef={surfaceRef} />)

    const signature = surfaceRef.current?.querySelector('[data-export-signature]')
    expect(signature).toHaveClass('signature-stamp', 'signature-solid')
    expect(signature).toHaveTextContent('markgleam.com')
  })

  it('uses the veiled canvas color without adding a panel and stacks on narrow canvases', () => {
    useAppStore.setState({
      themeId: 'night',
      canvas: {
        ...useAppStore.getState().canvas,
        width: 320,
        paddingX: 72,
        backgroundColor: '#ffffff',
        transparent: false,
      },
    })
    const surfaceRef = createRef<HTMLDivElement>()

    render(<MarkdownPreview surfaceRef={surfaceRef} />)

    const signature = surfaceRef.current?.querySelector<HTMLElement>(
      '[data-export-signature]',
    )
    expect(signature).toHaveClass('signature-compact')
    expect(signature).not.toHaveClass('signature-has-panel')
    expect(signature?.style.getPropertyValue('--signature-ink')).toBe('#202326')
    expect(signature?.style.getPropertyValue('--signature-muted')).toBe('#34393d')
  })

  it('adds a contrast panel when the canvas is transparent', () => {
    useAppStore.setState({
      canvas: {
        ...useAppStore.getState().canvas,
        transparent: true,
      },
    })
    const surfaceRef = createRef<HTMLDivElement>()

    render(<MarkdownPreview surfaceRef={surfaceRef} />)

    const signature = surfaceRef.current?.querySelector<HTMLElement>(
      '[data-export-signature]',
    )
    expect(signature).toHaveClass('signature-has-panel')
    expect(signature?.style.getPropertyValue('--signature-panel')).not.toBe(
      'transparent',
    )
  })

  it('uses dark ink and a contrast panel on a middle-gray background', () => {
    useAppStore.setState({
      canvas: {
        ...useAppStore.getState().canvas,
        backgroundColor: '#999999',
        transparent: false,
      },
    })
    const surfaceRef = createRef<HTMLDivElement>()

    render(<MarkdownPreview surfaceRef={surfaceRef} />)

    const signature = surfaceRef.current?.querySelector<HTMLElement>(
      '[data-export-signature]',
    )
    expect(signature).toHaveClass('signature-has-panel')
    expect(signature?.style.getPropertyValue('--signature-ink')).toBe('#202326')
    expect(signature?.style.getPropertyValue('--signature-panel')).toBe(
      'rgba(255, 255, 255, 0.94)',
    )
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

  it('keeps thematic breaks visible and recognizes explicit page breaks', () => {
    useAppStore.setState({
      markdown: 'First\n\n---\n\nSecond\n\n<!-- pagebreak -->\n\nThird',
    })
    const surfaceRef = createRef<HTMLDivElement>()
    render(<MarkdownPreview surfaceRef={surfaceRef} />)

    const body = document.querySelector('.markdown-body')
    expect(body?.querySelectorAll('hr')).toHaveLength(1)
    expect(body?.querySelector('[data-page-break]')).toHaveAttribute(
      'aria-hidden',
      'true',
    )
    expect(screen.getByText('Third')).toBeInTheDocument()
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

  it('renders an explicit Mermaid source without changing the active draft', () => {
    const surfaceRef = createRef<HTMLDivElement>()
    render(
      <MarkdownPreview
        surfaceRef={surfaceRef}
        source={'flowchart LR\n  Input --> Image'}
        inputKind="mermaid"
      />,
    )

    expect(screen.getByTestId('mermaid-mock')).toHaveTextContent(
      'Input --> Image',
    )
    expect(surfaceRef.current).toHaveAttribute('data-input-kind', 'mermaid')
    expect(useAppStore.getState().markdown).toContain('# Hello')
  })

  it('renders raw code as highlighted text rather than Markdown', async () => {
    const surfaceRef = createRef<HTMLDivElement>()
    render(
      <MarkdownPreview
        surfaceRef={surfaceRef}
        source={'const tag = "<strong>safe</strong>"'}
        inputKind="code"
        codeLanguage="typescript"
      />,
    )

    await waitFor(() =>
      expect(
        document.querySelector('[data-render-state="ready"] code.hljs'),
      ).toBeTruthy(),
    )
    expect(document.querySelector('.markdown-body strong')).not.toBeInTheDocument()
    expect(document.querySelector('.markdown-body code')).toHaveTextContent(
      '<strong>safe</strong>',
    )
  })

  it('renders a raw formula without Markdown delimiters', async () => {
    const surfaceRef = createRef<HTMLDivElement>()
    render(
      <MarkdownPreview
        surfaceRef={surfaceRef}
        source={'E = mc^2'}
        inputKind="formula"
      />,
    )

    await waitFor(() => expect(document.querySelector('.katex')).toBeTruthy())
    expect(document.querySelector('[data-render-state="ready"]')).toBeTruthy()
  })
})
