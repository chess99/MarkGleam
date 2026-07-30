import { describe, expect, it } from 'vitest'
import { sanitizeFilename, scopeCustomCss } from './css'

describe('sanitizeFilename', () => {
  it('removes operating-system reserved characters', () => {
    expect(sanitizeFilename('  My article: 01 / demo?.png  ')).toBe(
      'My-article-01-demo.png',
    )
  })

  it('uses a stable fallback', () => {
    expect(sanitizeFilename('***')).toBe('markgleam')
  })

  it('avoids reserved Windows device names', () => {
    expect(sanitizeFilename('CON')).toBe('_CON')
    expect(sanitizeFilename('lpt1.txt')).toBe('_lpt1.txt')
  })
})

describe('scopeCustomCss', () => {
  it('prefixes ordinary and root selectors', async () => {
    const result = await scopeCustomCss('h1, .lead { color: red } body { margin: 0 }')
    expect(result).toContain(
      '[data-markgleam-export-surface] [data-export-content] h1',
    )
    expect(result).toContain(
      '[data-markgleam-export-surface] [data-export-content] .lead',
    )
    expect(result).toContain(
      '[data-markgleam-export-surface] [data-export-content]{ margin: 0 }',
    )
  })

  it('returns an empty string for empty input', async () => {
    await expect(scopeCustomCss('   ')).resolves.toBe('')
  })

  it('cannot target the export signature or escape with a sibling selector', async () => {
    const result = await scopeCustomCss(`
      + [data-export-signature] { display: none }
      [data-export-signature] { opacity: 0 }
      [data-markgleam-export-surface] footer { visibility: hidden }
      h1 { color: red }
    `)

    expect(result).not.toContain('display: none')
    expect(result).not.toContain('opacity: 0')
    expect(result).not.toContain('visibility: hidden')
    expect(result).toContain(
      '[data-markgleam-export-surface] [data-export-content] h1',
    )
  })

  it('rejects at-rules that can introduce an external selector scope', async () => {
    const result = await scopeCustomCss(`
      @scope ([data-export-content]) to ([data-export-signature]) {
        :scope + footer { display: none }
      }
      @import url("https://example.com/global.css");
      @media (min-width: 1px) {
        p { color: blue }
      }
    `)

    expect(result).not.toContain(':scope + footer')
    expect(result).not.toContain('https://example.com/global.css')
    expect(result).toContain('@media (min-width: 1px)')
    expect(result).toContain(
      '[data-markgleam-export-surface] [data-export-content] p',
    )
  })

  it('does not let a comment disguise a leading sibling combinator', async () => {
    const result = await scopeCustomCss(`
      /* harmless-looking prefix */ + footer { display: none }
    `)

    expect(result).not.toContain('display: none')
  })
})
