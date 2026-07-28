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
})
