import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('loads the complete editor workspace and rich preview', async ({ page }) => {
  await expect(page).toHaveTitle(/MD2IMG/)
  await expect(page.getByText('MD2IMG', { exact: true })).toBeVisible()
  await expect(page.getByTestId('markdown-editor')).toBeVisible()
  await expect(page.getByTestId('export-surface')).toBeVisible()
  await expect(page.locator('.katex')).toHaveCount(2)
  await expect(page.locator('.katex').first()).toBeVisible()
  await expect(page.locator('[data-mermaid-state="ready"]')).toBeVisible()
})

test('exposes indexable product metadata without loading analytics locally', async ({
  page,
}) => {
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://md2img.cearl.cc/',
  )
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    /Markdown 转图片工具/,
  )
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1)
  await expect(
    page.locator(
      'script[src*="googletagmanager.com"], script[src*="hm.baidu.com"]',
    ),
  ).toHaveCount(0)
})

test('keeps Mermaid rendered when the workspace layout changes', async ({
  page,
}) => {
  const surface = page.getByTestId('export-surface')
  await expect(
    surface.locator('[data-mermaid-state="ready"]'),
  ).toBeVisible()

  const loadingTransitions = await surface.evaluate(async (node) => {
    let count = 0
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (
          record.type === 'attributes' &&
          (record.target as Element).getAttribute('data-mermaid-state') ===
            'loading'
        ) {
          count += 1
        }
        for (const addedNode of record.addedNodes) {
          if (
            addedNode instanceof Element &&
            (addedNode.matches('[data-mermaid-state="loading"]') ||
              addedNode.querySelector('[data-mermaid-state="loading"]'))
          ) {
            count += 1
          }
        }
      }
    })

    observer.observe(node, {
      attributes: true,
      attributeFilter: ['data-mermaid-state'],
      childList: true,
      subtree: true,
    })
    const panelToggle = document.querySelectorAll<HTMLButtonElement>(
      '.desktop-panel-toggle',
    )[1]
    panelToggle?.click()
    await new Promise((resolve) => window.setTimeout(resolve, 800))
    observer.disconnect()
    return count
  })

  expect(loadingTransitions).toBe(0)
  await expect(
    surface.locator('[data-mermaid-state="ready"]'),
  ).toBeVisible()
})

test('switches language, theme and persists preferences', async ({ page }) => {
  await page.getByLabel('界面语言').selectOption('en')
  await expect(page.getByRole('button', { name: 'Export' })).toBeVisible()

  await page.getByRole('button', { name: 'Forest' }).click()
  await expect(page.getByTestId('export-surface')).toHaveCSS(
    'color',
    'rgb(35, 51, 41)',
  )

  await page.reload()
  await expect(page.getByRole('button', { name: 'Export' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Forest' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('imports a Markdown file and updates the live preview', async ({ page }) => {
  const input = page.locator('input[accept*=".md"]').first()
  await input.setInputFiles({
    name: 'hello.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from('# Imported successfully\n\nNew content.'),
  })
  await expect(
    page.getByRole('heading', { name: 'Imported successfully' }),
  ).toBeVisible()
})

test('opens export and exposes every free output format', async ({ page }) => {
  await page.getByRole('button', { name: '导出' }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  for (const label of ['PNG', 'JPEG', 'WebP', 'SVG', 'PDF', '复制图片', '长图分片 ZIP']) {
    await expect(page.getByRole('button', { name: label })).toBeVisible()
  }
})

test('uses a mobile pane switcher', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Markdown' }).last().click()
  await expect(page.getByTestId('markdown-editor')).toBeVisible()
  await expect(page.locator('.mobile-markdown-editor')).toBeVisible()
  await page.getByRole('button', { name: '设置' }).last().click()
  await expect(page.getByRole('tab', { name: '主题' })).toBeVisible()
})

test('keeps mobile language switching and native editor scrolling available', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const language = page.getByLabel('界面语言')
  await expect(language.locator('option')).toHaveCount(2)
  await language.selectOption('en')
  await expect(page.locator('.mobile-export')).toContainText('Export')

  await page.getByRole('button', { name: 'Markdown' }).last().click()
  const editor = page.locator('.mobile-markdown-editor')
  await editor.fill(
    Array.from({ length: 100 }, (_, index) => `Line ${index + 1}: mobile editing`).join(
      '\n',
    ),
  )
  const scroll = await editor.evaluate((element) => {
    element.scrollTop = element.scrollHeight
    return {
      top: element.scrollTop,
      height: element.clientHeight,
      scrollHeight: element.scrollHeight,
    }
  })
  expect(scroll.scrollHeight).toBeGreaterThan(scroll.height)
  expect(scroll.top).toBeGreaterThan(0)
})

test('exports an uploaded image from a hidden mobile preview and resets completion', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Markdown' }).last().click()
  await page.locator('.mobile-markdown-editor').fill('# 本地图片导出回归')

  await page.locator('.editor-pane input[accept="image/*"]').setInputFiles({
    name: 'pixel.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAHgAAABICAIAAACyfKYoAAAB8ElEQVR4nO3cTW7CQAyGYUDd+kJd9SZVT8ZVOFN7ge4QVZph/vzaE75vhcKC5JGxJyPC+fvz/aT45wJ8hiJoLqpoKIKGImgogoYiaChve2/Y9Uadw9Hy8/WxPaiKhiJoKIKO7tFPm47SNNJU0VAE3ZOOJZmgm9O38BV0Q+x6uyu3cgu6NoN3cILuV26ir1revXJsX7Np1SvoHuWOGwu1DkI5BbTl2yZ8XF3MukmOhLbepZJrCsQjWxGX2OuxTNYehRw8DG1/tRS1geVHHFbRVizekNL2Vg6AtgpH0tq1XYRB299LKowXxtpp7gVD20a5fFXe1kwh09C2o1w4Uv5eD54MrAxB2zPl8vG51mS7QKErlRlrvpAh6CZlV+uQdgFBdyg7jceodkFAdytPH4+xhewLPa48pY2Etwtf6FnKg9YZ2oUj9FzlPutUhewC7aHcOh6zFfJ8aD/l+vGYsJAnQwPKT9tIZuU50JjyrPX4ktCw8vgd5pLQIco11ZpNeQg6UPnfTe37i4TK/dAZlLcfnZO4HzqP8uMJhJ/GZOhsyqukDVrKEPQqDfEIrWOJhniQYSjlJX+2+yIRNBRBQxE0FEFDETQUQUMRNJSqZ1gyPMmzelTRUAQNRdBQzvqjbiaqaCiChiJoKIKGImgogj4x+QU9cRfAn8k3MgAAAABJRU5ErkJggg==',
      'base64',
    ),
  })
  await expect(page.getByTestId('export-surface').locator('img')).toHaveAttribute(
    'data-md2img-asset-id',
    /.+/,
  )
  await expect(page.locator('.preview-pane')).toBeHidden()

  await page.locator('.mobile-export').click()
  await expect(page.getByLabel('文件名')).toHaveValue('本地图片导出回归')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '下载' }).click(),
  ])
  const output = testInfo.outputPath('uploaded-image.png')
  await download.saveAs(output)
  const imageBytes = await readFile(output)
  expect(imageBytes.length).toBeGreaterThan(1000)
  const imageStats = await page.evaluate(async (dataUrl) => {
    const image = new Image()
    image.src = dataUrl
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = 180
    canvas.height = 120
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas is unavailable')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
    let opaque = 0
    let darkest = 255
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index + 3] > 200) opaque += 1
      darkest = Math.min(darkest, pixels[index], pixels[index + 1], pixels[index + 2])
    }
    return { opaqueRatio: opaque / (pixels.length / 4), darkest }
  }, `data:image/png;base64,${imageBytes.toString('base64')}`)
  expect(imageStats.opaqueRatio).toBeGreaterThan(0.95)
  expect(imageStats.darkest).toBeLessThan(100)
  expect(download.suggestedFilename()).toBe('本地图片导出回归.png')
  await expect(page.getByRole('button', { name: '导出完成' })).toBeVisible()

  await page.getByRole('button', { name: 'JPEG' }).click()
  await expect(page.getByRole('button', { name: '下载' })).toBeVisible()

  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    })
  })
  await page
    .locator('.export-format-list button')
    .filter({ hasText: '复制图片' })
    .click()
  const [fallbackDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('.export-now').click(),
  ])
  expect(fallbackDownload.suggestedFilename()).toBe('本地图片导出回归.png')
  await expect(page.getByText('当前浏览器不支持复制图片，已改为下载 PNG。')).toBeVisible()
})

test('keeps PDF controls and download reachable on mobile', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('.mobile-export').click()
  await page.getByRole('button', { name: 'PDF' }).click()

  const modalContent = page.locator('.modal-content')
  const dimensions = await modalContent.evaluate((element) => ({
    height: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }))
  expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.height)

  const downloadButton = page.getByRole('button', { name: '下载' })
  await downloadButton.scrollIntoViewIfNeeded()
  await expect(downloadButton).toBeVisible()
  const box = await downloadButton.boundingBox()
  expect(box).not.toBeNull()
  expect((box?.y ?? 9999) + (box?.height ?? 0)).toBeLessThanOrEqual(844)

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    downloadButton.click(),
  ])
  const output = testInfo.outputPath('mobile-export.pdf')
  await download.saveAs(output)
  const bytes = await readFile(output)
  expect(bytes.subarray(0, 4).toString()).toBe('%PDF')
  expect(bytes.length).toBeGreaterThan(10_000)
})
