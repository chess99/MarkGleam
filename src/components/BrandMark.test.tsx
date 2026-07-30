import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BrandMark } from './BrandMark'

describe('BrandMark', () => {
  it('uses the favicon artwork as the shared brand asset', () => {
    const { container } = render(<BrandMark />)
    const mark = container.querySelector('.brand-mark')
    const image = mark?.querySelector('img')

    expect(mark).toHaveAttribute('aria-hidden', 'true')
    expect(image).toHaveAttribute('src', '/favicon.svg')
    expect(image).toHaveAttribute('alt', '')
    expect(image).toHaveAttribute('draggable', 'false')
  })
})
