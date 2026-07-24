import { describe, expect, it } from 'vitest'
import { sanitizeFilename, scopeCustomCss } from './css'

describe('sanitizeFilename', () => {
  it('removes operating-system reserved characters', () => {
    expect(sanitizeFilename('  My article: 01 / demo?.png  ')).toBe(
      'My-article-01-demo-.png',
    )
  })

  it('uses a stable fallback', () => {
    expect(sanitizeFilename('***')).toBe('md2img')
  })
})

describe('scopeCustomCss', () => {
  it('prefixes ordinary and root selectors', async () => {
    const result = await scopeCustomCss('h1, .lead { color: red } body { margin: 0 }')
    expect(result).toContain('#md2img-export-surface h1')
    expect(result).toContain('#md2img-export-surface .lead')
    expect(result).toContain('#md2img-export-surface{ margin: 0 }')
  })

  it('returns an empty string for empty input', async () => {
    await expect(scopeCustomCss('   ')).resolves.toBe('')
  })
})
