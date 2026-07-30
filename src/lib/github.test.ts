import { describe, expect, it, vi } from 'vitest'
import {
  GitHubReadmeImportError,
  importGitHubReadme,
  parseGitHubReadmeUrl,
  rewriteGitHubMarkdownLinks,
  type GitHubSourceContext,
} from './github'

const context: GitHubSourceContext = {
  owner: 'octo',
  repo: 'demo',
  ref: 'main',
  path: 'docs/README.md',
  repositoryUrl: 'https://github.com/octo/demo',
  sourceUrl: 'https://raw.githubusercontent.com/octo/demo/main/docs/README.md',
  rawBaseUrl: 'https://raw.githubusercontent.com/octo/demo/main/docs/',
  htmlBaseUrl: 'https://github.com/octo/demo/blob/main/docs/',
}

const expectImportError = async (
  promise: Promise<unknown>,
  code: GitHubReadmeImportError['code'],
) => {
  try {
    await promise
    throw new Error('Expected import to fail')
  } catch (error) {
    expect(error).toBeInstanceOf(GitHubReadmeImportError)
    expect((error as GitHubReadmeImportError).code).toBe(code)
  }
}

describe('parseGitHubReadmeUrl', () => {
  it('accepts repository URLs and removes a .git suffix', () => {
    expect(parseGitHubReadmeUrl('https://github.com/octo/demo.git')).toEqual({
      kind: 'repository',
      owner: 'octo',
      repo: 'demo',
    })
  })

  it('normalizes GitHub blob and raw URLs', () => {
    const expected = {
      kind: 'file',
      owner: 'octo',
      repo: 'demo',
      ref: 'main',
      path: 'docs/README.md',
      rawUrl: 'https://raw.githubusercontent.com/octo/demo/main/docs/README.md',
      htmlUrl: 'https://github.com/octo/demo/blob/main/docs/README.md',
    }
    expect(
      parseGitHubReadmeUrl(
        'https://github.com/octo/demo/blob/main/docs/README.md?plain=1',
      ),
    ).toEqual(expected)
    expect(
      parseGitHubReadmeUrl(
        'https://raw.githubusercontent.com/octo/demo/main/docs/README.md',
      ),
    ).toEqual(expected)
  })

  it('rejects non-GitHub and non-file GitHub URLs', () => {
    expect(() => parseGitHubReadmeUrl('https://example.com/README.md')).toThrow(
      GitHubReadmeImportError,
    )
    expect(() =>
      parseGitHubReadmeUrl('https://github.com/octo/demo/issues/1'),
    ).toThrow(GitHubReadmeImportError)
  })
})

describe('rewriteGitHubMarkdownLinks', () => {
  it('rewrites relative image and link destinations while preserving titles', () => {
    const markdown = `# Demo

![Logo](../assets/logo.svg "Logo")
[Guide](./guide/getting-started.md#install 'Open guide')
[External](https://example.com/a)
[Section](#usage)
`
    const rewritten = rewriteGitHubMarkdownLinks(markdown, context)
    expect(rewritten).toContain(
      '![Logo](https://raw.githubusercontent.com/octo/demo/main/assets/logo.svg "Logo")',
    )
    expect(rewritten).toContain(
      "[Guide](https://github.com/octo/demo/blob/main/docs/guide/getting-started.md#install 'Open guide')",
    )
    expect(rewritten).toContain('[External](https://example.com/a)')
    expect(rewritten).toContain('[Section](#usage)')
  })

  it('supports angle destinations, parentheses and image reference definitions', () => {
    const markdown = `![Logo][brand]
[Manual][manual]

[brand]: <images/logo (dark).png> "Dark"
[manual]: manual_(v2).md
`
    const rewritten = rewriteGitHubMarkdownLinks(markdown, context)
    expect(rewritten).toContain(
      '[brand]: <https://raw.githubusercontent.com/octo/demo/main/docs/images/logo%20(dark).png> "Dark"',
    )
    expect(rewritten).toContain(
      '[manual]: https://github.com/octo/demo/blob/main/docs/manual_(v2).md',
    )
  })

  it('does not rewrite inline or fenced code', () => {
    const markdown = `\`[not a link](inside.md)\`

\`\`\`md
![not an image](inside.png)
\`\`\`

![real](outside.png)
`
    const rewritten = rewriteGitHubMarkdownLinks(markdown, context)
    expect(rewritten).toContain('`[not a link](inside.md)`')
    expect(rewritten).toContain('![not an image](inside.png)')
    expect(rewritten).toContain(
      '![real](https://raw.githubusercontent.com/octo/demo/main/docs/outside.png)',
    )
  })
})

describe('importGitHubReadme', () => {
  it('imports repository README metadata, decodes UTF-8 and rewrites resources', async () => {
    const original = '# 你好\n\n![图](assets/logo.png)\n[文档](docs/guide.md)'
    const encoded = btoa(
      Array.from(new TextEncoder().encode(original), (byte) =>
        String.fromCharCode(byte),
      ).join(''),
    )
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          content: encoded,
          encoding: 'base64',
          download_url:
            'https://raw.githubusercontent.com/octo/demo/main/README.md',
          html_url: 'https://github.com/octo/demo/blob/main/README.md',
          path: 'README.md',
          size: new TextEncoder().encode(original).byteLength,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )

    const result = await importGitHubReadme('https://github.com/octo/demo', {
      fetch: fetcher,
    })

    expect(fetcher).toHaveBeenCalledWith(
      'https://api.github.com/repos/octo/demo/readme',
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: 'application/vnd.github+json' }),
      }),
    )
    expect(result.originalMarkdown).toBe(original)
    expect(result.markdown).toContain(
      'https://raw.githubusercontent.com/octo/demo/main/assets/logo.png',
    )
    expect(result.markdown).toContain(
      'https://github.com/octo/demo/blob/main/docs/guide.md',
    )
    expect(result.sourceContext).toMatchObject({
      owner: 'octo',
      repo: 'demo',
      ref: 'main',
      path: 'README.md',
    })
  })

  it('imports a raw README directly and enforces the streamed size limit', async () => {
    const rawUrl = 'https://raw.githubusercontent.com/octo/demo/main/README.md'
    const successFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('# Demo', { status: 200 }))
    expect(
      (
        await importGitHubReadme(rawUrl, {
          fetch: successFetch,
          maxBytes: 32,
        })
      ).markdown,
    ).toBe('# Demo')

    const largeFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('x'.repeat(33), { status: 200 }))
    await expectImportError(
      importGitHubReadme(rawUrl, { fetch: largeFetch, maxBytes: 32 }),
      'too-large',
    )
  })

  it('classifies missing, forbidden and rate-limited responses', async () => {
    const url = 'https://raw.githubusercontent.com/octo/demo/main/README.md'
    await expectImportError(
      importGitHubReadme(url, {
        fetch: vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 404 })),
      }),
      'not-found',
    )
    await expectImportError(
      importGitHubReadme(url, {
        fetch: vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 403 })),
      }),
      'forbidden',
    )
    await expectImportError(
      importGitHubReadme(url, {
        fetch: vi.fn<typeof fetch>().mockResolvedValue(
          new Response('', {
            status: 403,
            headers: {
              'x-ratelimit-remaining': '0',
              'x-ratelimit-reset': '2000000000',
            },
          }),
        ),
      }),
      'rate-limited',
    )
  })

  it('classifies request timeouts and preserves caller cancellation', async () => {
    const pendingFetch = vi.fn<typeof fetch>().mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))
        }),
    )
    const url = 'https://raw.githubusercontent.com/octo/demo/main/README.md'
    await expectImportError(
      importGitHubReadme(url, { fetch: pendingFetch, timeoutMs: 5 }),
      'timeout',
    )

    const controller = new AbortController()
    const canceled = importGitHubReadme(url, {
      fetch: pendingFetch,
      signal: controller.signal,
    })
    controller.abort()
    await expect(canceled).rejects.toMatchObject({ name: 'AbortError' })
  })
})
