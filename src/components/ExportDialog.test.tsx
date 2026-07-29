import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultExport, useAppStore } from '../store'
import { ExportDialog } from './ExportDialog'

const exportMock = vi.hoisted(() => vi.fn())

vi.mock('../lib/export', () => ({ runExport: exportMock }))
vi.mock('../lib/analytics', () => ({ trackEvent: vi.fn() }))

describe('ExportDialog', () => {
  beforeEach(() => {
    exportMock.mockReset()
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
})
