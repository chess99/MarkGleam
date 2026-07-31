import { describe, expect, it } from 'vitest'
import { createToolDrafts } from '../data/toolSamples'
import { getToolInputKind, switchToolInput } from './toolInput'

describe('tool input helpers', () => {
  it('maps workflows separately from their input kind', () => {
    expect(getToolInputKind('markdown-long-image')).toBe('markdown')
    expect(getToolInputKind('xiaohongshu-long-article')).toBe('markdown')
    expect(getToolInputKind('markdown-to-pdf')).toBe('markdown')
    expect(getToolInputKind('github-readme-to-image')).toBe('markdown')
    expect(getToolInputKind('mermaid-to-image')).toBe('mermaid')
    expect(getToolInputKind('formula-to-image')).toBe('formula')
    expect(getToolInputKind('code-to-image')).toBe('code')
  })

  it('stores the current text before restoring the next draft', () => {
    const drafts = createToolDrafts()
    drafts.code = 'const previous = true'
    const next = switchToolInput(
      {
        inputKind: 'markdown',
        drafts,
        markdown: '# Unsaved current text',
      },
      'code',
    )

    expect(next.markdown).toBe('const previous = true')
    expect(next.drafts.markdown).toBe('# Unsaved current text')
  })
})
