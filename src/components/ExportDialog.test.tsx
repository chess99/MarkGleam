import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FixedPageOverflowError } from '../lib/export'
import { defaultExport, useAppStore } from '../store'
import { ExportDialog } from './ExportDialog'

const exportMock = vi.hoisted(() => vi.fn())
const printMock = vi.hoisted(() => vi.fn())
const FixedPageOverflowErrorMock = vi.hoisted(
  () =>
    class FixedPageOverflowError extends Error {
      constructor() {
        super('A content block is taller than the fixed page content area')
        this.name = 'FixedPageOverflowError'
      }
    },
)

vi.mock('../lib/export', () => ({
  FixedPageOverflowError: FixedPageOverflowErrorMock,
  runExport: exportMock,
}))
vi.mock('../lib/print', () => ({ runPrint: printMock }))
vi.mock('../lib/analytics', () => ({ trackEvent: vi.fn() }))

describe('ExportDialog', () => {
  beforeEach(() => {
    exportMock.mockReset()
    printMock.mockReset()
    useAppStore.setState({
      markdown: '# Retry export',
      locale: 'en',
      export: { ...defaultExport, filename: 'retry-export' },
    })
  })

  it('recovers from a failed export and allows a successful retry', async () => {
    exportMock
      .mockRejectedValueOnce(new Error('canvas allocation failed'))
      .mockResolvedValueOnce({ filename: 'retry-export.png', format: 'png' })
    const onToast = vi.fn()

    render(
      <ExportDialog
        surface={document.createElement('div')}
        onClose={vi.fn()}
        onToast={onToast}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Download' }))
    await waitFor(() =>
      expect(onToast).toHaveBeenCalledWith(
        'Export failed. Lower the resolution or use sliced export.',
        'error',
      ),
    )
    expect(screen.getByRole('button', { name: 'Download' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Download' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Export complete' })).toBeEnabled(),
    )
    expect(exportMock).toHaveBeenCalledTimes(2)
  })

  it('shows page progress and cancels an in-progress export', async () => {
    exportMock.mockImplementation(
      (
        _surface: HTMLElement,
        _config: unknown,
        options: {
          signal: AbortSignal
          onProgress: (progress: { completed: number; total: number }) => void
        },
      ) =>
        new Promise((_resolve, reject) => {
          options.onProgress({ completed: 2, total: 10 })
          options.signal.addEventListener('abort', () => {
            reject(new DOMException('Export canceled', 'AbortError'))
          })
        }),
    )
    const onToast = vi.fn()

    render(
      <ExportDialog
        surface={document.createElement('div')}
        onClose={vi.fn()}
        onToast={onToast}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Download' }))
    expect(exportMock.mock.calls[0]?.[2]).toMatchObject({
      optimizeLongPdf: true,
    })
    const cancelButton = await screen.findByRole('button', {
      name: 'Cancel export',
    })
    expect(screen.getByRole('progressbar')).toHaveTextContent('2 / 10')

    fireEvent.click(cancelButton)

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Download' })).toBeEnabled(),
    )
    expect(onToast).not.toHaveBeenCalled()
  })

  it('switches ZIP slicing modes and accepts a 1440px fixed page height', () => {
    useAppStore.setState({
      export: {
        ...defaultExport,
        format: 'split-zip',
        splitMode: 'compact',
        splitHeight: 4096,
      },
    })

    render(
      <ExportDialog
        surface={document.createElement('div')}
        onClose={vi.fn()}
        onToast={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Adaptive slices' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByLabelText('Slice height')).toHaveValue(4096)
    expect(
      screen.getByText(
        'Avoids oversized browser canvases; each image follows its content height.',
      ),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Fixed pages' }))

    expect(screen.getByRole('button', { name: 'Fixed pages' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByLabelText('Page height')).toHaveAttribute('min', '640')
    fireEvent.change(screen.getByLabelText('Page height'), {
      target: { value: '1440' },
    })

    expect(useAppStore.getState().export).toMatchObject({
      splitMode: 'fixed',
      splitHeight: 1440,
    })
    expect(
      screen.getByText(
        'Keeps every image the same height and breaks between headings, paragraphs, and tables.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Put <!-- pagebreak --> on its own line to start a new page here.',
      ),
    ).toBeInTheDocument()
  })

  it('explains oversized content when a fixed page cannot contain one block', async () => {
    useAppStore.setState({
      export: {
        ...defaultExport,
        format: 'split-zip',
        splitMode: 'fixed',
        splitHeight: 1440,
      },
    })
    exportMock.mockRejectedValueOnce(new FixedPageOverflowError())
    const onToast = vi.fn()

    render(
      <ExportDialog
        surface={document.createElement('div')}
        onClose={vi.fn()}
        onToast={onToast}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Download' }))

    await waitFor(() =>
      expect(onToast).toHaveBeenCalledWith(
        'A content block is taller than the usable page area. Reduce type or padding, or split the content manually.',
        'error',
      ),
    )
  })

  it('opens the native print workflow with print-specific settings', async () => {
    printMock.mockResolvedValue(undefined)
    const surface = document.createElement('div')
    const onToast = vi.fn()

    const { container } = render(
      <ExportDialog
        surface={surface}
        onClose={vi.fn()}
        onToast={onToast}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', { name: /Print \/ Searchable PDF/ }),
    )
    expect(screen.getByText('Print settings')).toBeInTheDocument()
    expect(screen.queryByText('Resolution')).not.toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Preserve theme background'))
    fireEvent.click(container.querySelector('.export-now') as HTMLButtonElement)

    await waitFor(() =>
      expect(printMock).toHaveBeenCalledWith(
        surface,
        expect.objectContaining({ format: 'print' }),
        { preserveBackground: true },
      ),
    )
    expect(exportMock).not.toHaveBeenCalled()
    expect(onToast).toHaveBeenCalledWith(
      'The browser print dialog opened. Choose a printer or Save as PDF.',
    )
  })

  it('explains the two PDF outputs and the long-document tradeoff', () => {
    useAppStore.setState({ locale: 'zh-CN' })

    render(
      <ExportDialog
        surface={document.createElement('div')}
        onClose={vi.fn()}
        onToast={vi.fn()}
      />,
    )

    expect(screen.getByText('保留样式 PDF')).toBeInTheDocument()
    expect(screen.getByText('还原当前预览；文字将转为图片')).toBeInTheDocument()
    expect(screen.getByText('打印 / 可搜索 PDF')).toBeInTheDocument()
    expect(screen.getByText('文字清晰可复制；适合纸张打印')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /保留样式 PDF/ }))
    expect(
      screen.getByLabelText('100 页以上优先快速导出（推荐）'),
    ).toBeChecked()
    expect(
      screen.getByText(/关闭：保持上方清晰度和图片质量/),
    ).toBeInTheDocument()
  })
})
