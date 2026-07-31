import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LanguageSelect } from './LanguageSelect'

describe('LanguageSelect', () => {
  it('selects a language from the accessible listbox', () => {
    const onChange = vi.fn()
    render(<LanguageSelect locale="zh-CN" onChange={onChange} />)

    fireEvent.click(screen.getByRole('combobox', { name: '界面语言' }))
    expect(screen.getAllByRole('option')).toHaveLength(3)
    fireEvent.click(screen.getByRole('option', { name: 'English' }))

    expect(onChange).toHaveBeenCalledWith('en')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('supports arrow navigation, Escape and focus restoration', async () => {
    render(<LanguageSelect locale="zh-CN" onChange={() => undefined} />)
    const trigger = screen.getByRole('combobox', { name: '界面语言' })

    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    const chinese = screen.getByRole('option', { name: '简体中文' })
    const english = screen.getByRole('option', { name: 'English' })
    expect(screen.getByRole('option', { name: '日本語' })).toBeInTheDocument()
    await waitFor(() => expect(chinese).toHaveFocus())

    fireEvent.keyDown(chinese, { key: 'ArrowDown' })
    expect(english).toHaveFocus()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})
