import { describe, expect, it } from 'vitest'
import { suggestFilename } from './filename'

describe('suggestFilename', () => {
  it('uses a leading level-one heading', () => {
    expect(suggestFilename('# 一份更好的 Markdown / 图片方案\n\n正文')).toBe(
      '一份更好的-Markdown-图片方案',
    )
  })

  it('ignores frontmatter and uses the first content excerpt', () => {
    expect(
      suggestFilename('---\ntitle: hidden\n---\n**今天**要做的 [三件事](https://example.com)。'),
    ).toBe('今天要做的-三件事。')
  })

  it('falls back for empty content', () => {
    expect(suggestFilename('   ')).toBe('md2img')
  })
})
