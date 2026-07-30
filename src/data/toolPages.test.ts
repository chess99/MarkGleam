import { describe, expect, it } from 'vitest'
import { sampleMarkdown, sampleMarkdownEn } from './sample'
import { getLocalizedEditorSample, toolPages } from './toolPages'

const page = (id: string) => {
  const match = toolPages.find((candidate) => candidate.id === id)
  if (!match) throw new Error(`Missing tool page: ${id}`)
  return match
}

describe('tool page samples', () => {
  it('uses one representative Markdown sample at both entry points', () => {
    const homepage = page('visual-workspace')
    const markdown = page('markdown-to-image')

    expect(homepage.sample).toEqual(markdown.sample)
    expect(markdown.sample['zh-CN']).toBe(sampleMarkdown)
    expect(markdown.sample.en).toBe(sampleMarkdownEn)
    expect(sampleMarkdown).toContain('```ts')
    expect(sampleMarkdown).toContain('$$')
    expect(sampleMarkdown).not.toContain('```mermaid')
  })

  it('makes each specialized sample demonstrate its route', () => {
    expect(
      page('markdown-long-image').sample['zh-CN'].split('\n').length,
    ).toBeGreaterThan(25)
    expect(page('markdown-to-pdf').sample['zh-CN']).toContain(
      '<!-- pagebreak -->',
    )
    expect(page('mermaid-to-image').sample['zh-CN']).toContain('{预览正常?}')
    expect(page('formula-to-image').sample['zh-CN']).toContain(
      '\\begin{aligned}',
    )
    expect(page('code-to-image').sample['zh-CN']).toContain(
      'interface ExportOptions',
    )
    expect(page('github-readme-to-image').sample['zh-CN']).not.toContain(
      '/owner/repository',
    )
    expect(page('batch-markdown-to-image').sample['zh-CN']).toContain(
      '打包下载 ZIP',
    )
  })

  it('keeps the GitHub URL in the importer instead of rendering it as Markdown', () => {
    const github = page('github-readme-to-image')

    expect(github.sample['zh-CN']).toMatch(/^https:\/\/github\.com\//)
    expect(getLocalizedEditorSample(github, 'zh-CN')).toBe(sampleMarkdown)
    expect(getLocalizedEditorSample(github, 'en')).toBe(sampleMarkdownEn)
  })
})
