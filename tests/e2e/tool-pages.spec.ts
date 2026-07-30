import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import JSZip from 'jszip'

test('opens English tool URLs directly even when Chinese was saved', async ({
  page,
}) => {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem(
      'md2img-state-v1',
      JSON.stringify({ state: { locale: 'zh-CN' }, version: 3 }),
    )
  })

  await page.goto('/en/code-to-image/')

  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(
    page.locator('#tool-page-title'),
  ).toBeVisible()
  await expect(page.locator('#tool-page-title')).toHaveText('Code to Image')
  await expect(page.getByLabel('Code language')).toHaveValue('typescript')
  await expect(page.locator('pre[data-render-state="ready"]')).toBeVisible()

  await page.goto('/en/mermaid-to-image/')
  await expect(page.locator('.cm-content')).toContainText(
    'Paste Mermaid source',
  )
  await expect(page.locator('.cm-content')).not.toContainText('粘贴 Mermaid')
})

test('separates the brand homepage from the Markdown search landing page', async ({
  page,
}) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', {
      name: '把结构化内容做成可分享的视觉作品',
      level: 1,
    }),
  ).toBeVisible()
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://markgleam.com/',
  )

  await page.goto('/markdown-to-image/')
  await expect(
    page.locator('#tool-page-title'),
  ).toBeVisible()
  await expect(page.locator('#tool-page-title')).toHaveText('Markdown 转图片')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://markgleam.com/markdown-to-image/',
  )
})

test('keeps the representative Markdown sample aligned across both entry points', async ({
  page,
}) => {
  await page.goto('/')
  const editor = page.locator('.editor-pane')
  await editor.getByRole('textbox', { name: 'Markdown' }).fill('# 已修改')
  await editor.getByRole('button', { name: '更多' }).click()
  await editor.getByRole('menuitem', { name: '示例' }).click()

  await expect(editor.locator('.cm-content')).toContainText(
    '把 Markdown 排成一张图',
  )
  await expect(page.locator('[data-render-state="ready"] .katex')).toHaveCount(2)
  await expect(page.locator('[data-mermaid-state]')).toHaveCount(0)

  await page.goto('/en/markdown-to-image/')
  const englishEditor = page.locator('.editor-pane')
  await englishEditor.getByRole('textbox', { name: 'Markdown' }).fill('# Changed')
  await englishEditor.getByRole('button', { name: 'More' }).click()
  await englishEditor.getByRole('menuitem', { name: 'Sample' }).click()

  await expect(englishEditor.locator('.cm-content')).toContainText(
    'Turn Markdown into an image',
  )
  await expect(page.locator('[data-render-state="ready"] .katex')).toHaveCount(2)
  await expect(page.locator('[data-mermaid-state]')).toHaveCount(0)
})

test('uses raw Mermaid and formula input without showing wrapper syntax', async ({
  page,
}) => {
  await page.goto('/mermaid-to-image/')
  await expect(page.locator('[data-mermaid-state="ready"]')).toBeVisible()
  await expect(page.locator('.cm-content')).not.toContainText('```mermaid')

  await page.goto('/formula-to-image/')
  await expect(page.locator('[data-render-state="ready"] .katex')).toBeVisible()
  await expect(page.locator('.cm-content')).not.toContainText('$$')
})

test('imports a public GitHub README and rewrites relative assets', async ({
  page,
}) => {
  const markdown = '# Demo\n\n![Logo](docs/logo.png)\n\n[Guide](docs/guide.md)'
  await page.route('https://api.github.com/repos/acme/demo/readme*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        name: 'README.md',
        path: 'README.md',
        sha: 'abc',
        html_url: 'https://github.com/acme/demo/blob/main/README.md',
        download_url:
          'https://raw.githubusercontent.com/acme/demo/main/README.md',
        encoding: 'base64',
        content: Buffer.from(markdown).toString('base64'),
      }),
    })
  })
  await page.route('https://raw.githubusercontent.com/acme/demo/main/docs/logo.png', (route) =>
    route.abort(),
  )
  await page.goto('/github-readme-to-image/')

  await expect(page.getByLabel('GitHub README 地址')).toHaveValue(
    'https://github.com/chess99/markdown-to-image',
  )
  await expect(page.locator('.cm-content')).toContainText(
    '把 Markdown 排成一张图',
  )
  await page.getByLabel('GitHub README 地址').fill('https://github.com/acme/demo')
  await page.getByRole('button', { name: '导入 README' }).click()

  await expect(page.locator('.cm-content')).toContainText(
    'https://raw.githubusercontent.com/acme/demo/main/docs/logo.png',
  )
  await expect(page.locator('.cm-content')).toContainText(
    'https://github.com/acme/demo/blob/main/docs/guide.md',
  )
})

test('batch export keeps duplicate filenames in one ZIP', async ({ page }) => {
  await page.goto('/batch-markdown-to-image/')
  await page.locator('input[type="file"][multiple]').setInputFiles([
    {
      name: 'note.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from('# One\n\n$E = mc^2$\n\n```js\nconsole.log(1)\n```'),
    },
    { name: 'note.md', mimeType: 'text/markdown', buffer: Buffer.from('# Two') },
  ])

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '导出 PNG ZIP' }).click(),
  ])
  const downloadPath = await download.path()
  expect(downloadPath).not.toBeNull()
  const zip = await JSZip.loadAsync(await readFile(downloadPath!))
  const names = Object.keys(zip.files).sort()

  expect(names).toEqual(['note-2.png', 'note.png'])
})

test('offers purpose-specific social canvas presets', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: '画布' }).click()
  await expect(page.getByText(/预设高度是最小值/)).toBeVisible()

  await page.getByRole('button', { name: 'X 横图' }).click()
  await expect(page.getByTestId('export-surface')).toHaveCSS('width', '1600px')

  await page.getByRole('button', { name: 'LinkedIn' }).click()
  await expect(page.getByTestId('export-surface')).toHaveCSS('width', '1200px')

  await page.getByRole('button', { name: '微信头图' }).click()
  await expect(page.getByTestId('export-surface')).toHaveCSS('width', '900px')
})

test('keeps limits and GitHub privacy boundaries visible on mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 })
  await page.goto('/github-readme-to-image/')

  await expect(page.locator('.github-readme-importer > small')).toContainText(
    '不读取 Token',
  )
  const summary = page.locator('.tool-context-details summary')
  await expect(summary).toBeVisible()
  const closedPosition = await summary.boundingBox()
  await summary.click()
  const openPosition = await summary.boundingBox()
  expect(openPosition?.x).toBeCloseTo(closedPosition?.x ?? 0, 0)
  expect(openPosition?.y).toBeCloseTo(closedPosition?.y ?? 0, 0)
  await expect(page.locator('.tool-context-close-icon')).toBeVisible()
  await expect(page.getByText(/只支持无需登录即可访问的公开内容/)).toBeVisible()

  const toolSwitcher = page.locator('.mobile-tool-switcher > summary')
  await expect(toolSwitcher).toBeVisible()
  await toolSwitcher.click()
  await expect(page.locator('.mobile-tool-links')).toBeVisible()
  await expect(page.locator('.tool-context-details')).not.toHaveAttribute('open')

  await page
    .locator('.mobile-nav')
    .getByRole('button', { name: '预览', exact: true })
    .click()
  await expect(page.locator('.mobile-tool-switcher')).not.toHaveAttribute('open')
})

test('preserves homepage choices while purpose-specific routes apply defaults', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('tab', { name: '格式' }).click()
  await page.getByRole('button', { name: 'WEBP', exact: true }).click()
  await page.reload()
  await page.getByRole('tab', { name: '格式' }).click()
  await expect(
    page.getByRole('complementary').getByRole('button', { name: 'WEBP' }),
  ).toHaveClass(/active/)

  await page.goto('/markdown-long-image/')
  await expect(
    page.getByRole('complementary').getByRole('button', { name: 'ZIP' }),
  ).toHaveClass(/active/)
})

test('returns a noindex 404 for unknown paths', async ({ page }) => {
  await page.goto('/missing-tool/')

  await expect(page.getByRole('heading', { name: '这个页面不存在' })).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'noindex,follow',
  )
})
