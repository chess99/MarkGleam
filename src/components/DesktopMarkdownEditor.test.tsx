import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DesktopMarkdownEditor from './DesktopMarkdownEditor'

describe('DesktopMarkdownEditor', () => {
  it('gives the mounted CodeMirror input a stable accessible name', () => {
    render(
      <DesktopMarkdownEditor
        value="# MarkGleam"
        onChange={vi.fn()}
        dark={false}
        ariaLabel="Markdown"
      />,
    )

    expect(
      screen.getByRole('textbox', { name: 'Markdown' }),
    ).toBeInTheDocument()
  })
})
