import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import JSZip from 'jszip'

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZxoAAAAAASUVORK5CYII=',
  'base64',
)

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
  await page.getByRole('combobox', { name: '界面语言' }).click()
  await page.getByRole('option', { name: 'English' }).click()
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

test('keeps interface appearance independent from the export theme', async ({
  page,
}) => {
  await page.getByRole('tab', { name: '画布' }).click()
  await page.getByRole('textbox', { name: '背景', exact: true }).fill('#00ff00')
  await expect(page.getByTestId('export-surface')).toHaveCSS(
    'background-color',
    'rgb(0, 255, 0)',
  )

  await page.getByRole('tab', { name: '主题' }).click()
  await page.getByRole('button', { name: 'Aa 终端' }).click()
  const surface = page.getByTestId('export-surface')
  await expect(surface).toHaveCSS('background-color', 'rgb(16, 23, 19)')
  await expect(surface).toHaveCSS('color', 'rgb(216, 243, 223)')
  const contentBefore = await surface.evaluate((element) => ({
    color: getComputedStyle(element).color,
    backgroundColor: getComputedStyle(element).backgroundColor,
  }))

  await page.getByRole('button', { name: '切换到深色界面' }).click()
  await expect(page.locator('.app-shell')).toHaveAttribute(
    'data-appearance',
    'dark',
  )
  await expect(page.locator('.app-shell')).toHaveCSS(
    'color',
    'rgb(238, 241, 244)',
  )
  await expect(page.locator('.desktop-markdown-editor')).toHaveClass(
    /cm-theme-dark/,
  )
  await expect(page.getByRole('button', { name: 'Aa 终端' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  expect(
    await surface.evaluate((element) => ({
      color: getComputedStyle(element).color,
      backgroundColor: getComputedStyle(element).backgroundColor,
    })),
  ).toEqual(contentBefore)

  await page.reload()
  await expect(page.locator('.app-shell')).toHaveAttribute(
    'data-appearance',
    'dark',
  )
  await expect(page.getByRole('button', { name: 'Aa 终端' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  await page.getByRole('button', { name: '切换到浅色界面' }).click()
  await expect(page.locator('.app-shell')).toHaveAttribute(
    'data-appearance',
    'light',
  )
  await expect(page.locator('.desktop-markdown-editor')).toHaveClass(
    /cm-theme-light/,
  )
  await expect(page.getByRole('button', { name: 'Aa 终端' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('applies presets, custom CSS, background images, transparency and fonts', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Covered once as an advanced-settings path')
  await page.getByRole('tab', { name: '画布' }).click()
  await page.getByRole('button', { name: '正方形' }).click()
  await expect(page.getByTestId('export-surface')).toHaveCSS('width', '1080px')
  await expect(page.getByTestId('export-surface')).toHaveCSS(
    'min-height',
    '1080px',
  )

  await page.getByRole('button', { name: /高级样式/ }).click()
  await page.getByLabel('自定义 CSS').fill('h1 { color: rgb(1, 2, 3); }')
  await expect(page.getByTestId('export-surface').locator('h1')).toHaveCSS(
    'color',
    'rgb(1, 2, 3)',
  )

  await page.locator('.inspector-pane input[accept="image/*"]').setInputFiles({
    name: 'background.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#2e8b57"/></svg>',
    ),
  })
  await expect(page.getByTestId('export-surface')).toHaveAttribute(
    'data-md2img-background-asset-id',
    /.+/,
  )
  await expect(page.getByTestId('export-surface')).toHaveCSS(
    'background-image',
    /blob:/,
  )

  const transparent = page.getByRole('checkbox', { name: '透明背景' })
  await transparent.check()
  await expect(page.getByTestId('export-surface')).toHaveCSS(
    'background-color',
    'rgba(0, 0, 0, 0)',
  )
  await expect(page.getByTestId('export-surface')).toHaveCSS(
    'background-image',
    'none',
  )
  await expect(page.getByRole('button', { name: '背景图片' })).toBeDisabled()
  await transparent.uncheck()

  await page.getByRole('tab', { name: '主题' }).click()
  await page
    .locator('.inspector-pane input[accept*=".woff"]')
    .setInputFiles(resolve('node_modules/katex/dist/fonts/KaTeX_Main-Regular.woff2'))
  await expect(page.getByTestId('export-surface').locator('.markdown-body')).toHaveCSS(
    'font-family',
    /MD2IMG Custom/,
  )
  await expect(page.getByRole('button', { name: '移除' })).toBeVisible()
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

test('keeps every image from a multi-file import', async ({ page }) => {
  await page.locator('.editor-pane input[accept="image/*"]').setInputFiles([
    { name: 'first.png', mimeType: 'image/png', buffer: tinyPng },
    { name: 'second.png', mimeType: 'image/png', buffer: tinyPng },
  ])
  const images = page.getByTestId('export-surface').locator('img[data-md2img-asset-id]')
  await expect(images).toHaveCount(2)
  await expect(images.nth(0)).toHaveAttribute('alt', 'first')
  await expect(images.nth(1)).toHaveAttribute('alt', 'second')
})

test('opens export and exposes every free output format', async ({ page }) => {
  await page.getByRole('button', { name: '导出' }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  for (const label of [
    'PNG',
    'JPEG',
    'WebP',
    'SVG',
    '保留样式 PDF',
    '打印 / 可搜索 PDF',
    '复制图片',
    '长图分片 ZIP',
  ]) {
    await expect(
      page.getByRole('button', { name: new RegExp(`^${label}`) }),
    ).toBeVisible()
  }
})

test('traps modal focus and restores it after closing', async ({ page }) => {
  const openButton = page.locator('.top-export')
  await openButton.press('Enter')
  const closeButton = page.getByRole('button', { name: '关闭' })
  await expect(closeButton).toBeFocused()
  await closeButton.press('Shift+Tab')
  await expect(page.locator('.export-now')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(openButton).toBeFocused()
})

test('dismisses menus with Escape and opens export from the keyboard', async ({
  page,
}) => {
  const help = page.getByRole('button', { name: '帮助' })
  await help.click()
  await expect(page.getByRole('menuitem', { name: '隐私' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menuitem', { name: '隐私' })).toBeHidden()
  await expect(help).toBeFocused()

  await page.keyboard.press('Control+s')
  await expect(page.getByRole('dialog', { name: '导出' })).toBeVisible()
})

test('presents shortcuts as three readable rows in a compact modal', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: '帮助' }).click()
  await page.getByRole('menuitem', { name: '快捷键' }).click()

  const dialog = page.getByRole('dialog', { name: '快捷键' })
  await expect(dialog.locator('.shortcut-row')).toHaveCount(3)
  await expect(dialog.locator('.shortcut-row')).toHaveText([
    'Ctrl / ⌘+S打开导出',
    'Ctrl / ⌘+O导入文件',
    'Ctrl / ⌘+/打开帮助',
  ])
  expect((await dialog.boundingBox())?.height).toBeLessThan(420)
})

test('downloads valid PNG, JPEG, WebP, SVG and sliced ZIP files', async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(browserName !== 'chromium', 'One full format matrix is sufficient')
  await page.locator('input[accept*=".md"]').first().setInputFiles({
    name: 'formats.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from('# Format matrix\n\nA visible export check.'),
  })
  await page.locator('.top-export').click()
  await page.getByRole('button', { name: '1×' }).click()
  await page.getByLabel('文件名').fill('format-check')

  const cases = [
    { label: 'PNG', extension: 'png' },
    { label: 'JPEG', extension: 'jpg' },
    { label: 'WebP', extension: 'webp' },
    { label: 'SVG', extension: 'svg' },
    { label: '长图分片 ZIP', extension: 'zip' },
  ] as const

  for (const item of cases) {
    await page.getByRole('button', { name: item.label }).click()
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: '下载' }).click(),
    ])
    const output = testInfo.outputPath(`format-check.${item.extension}`)
    await download.saveAs(output)
    const bytes = await readFile(output)
    expect(bytes.length).toBeGreaterThan(128)

    if (item.extension === 'png') {
      expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
    } else if (item.extension === 'jpg') {
      expect(bytes.subarray(0, 3).toString('hex')).toBe('ffd8ff')
    } else if (item.extension === 'webp') {
      expect(bytes.subarray(0, 4).toString()).toBe('RIFF')
      expect(bytes.subarray(8, 12).toString()).toBe('WEBP')
    } else if (item.extension === 'svg') {
      expect(bytes.toString('utf8')).toContain('<svg')
    } else {
      expect(bytes.subarray(0, 2).toString()).toBe('PK')
      const zip = await JSZip.loadAsync(bytes)
      const entries = Object.values(zip.files).filter((entry) => !entry.dir)
      expect(entries).toHaveLength(1)
      const part = await entries[0].async('nodebuffer')
      expect(part.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
    }
  }
})

test('automatically uses sliced ZIP when a PNG would exceed the canvas limit', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Covered once as a large-canvas boundary')
  await page.getByRole('tab', { name: '画布' }).click()
  await page.getByRole('spinbutton', { name: '宽度' }).fill('2400')
  await page.getByRole('spinbutton', { name: '最小高度' }).fill('3200')
  await page.locator('.top-export').click()
  await page.getByRole('button', { name: 'PNG' }).click()
  await page.getByRole('button', { name: '3×' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '下载' }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/-parts\.zip$/)
})

test('exports an empty document as a valid one-part ZIP', async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(browserName !== 'chromium', 'Covered once as an export boundary case')
  await page.locator('input[accept*=".md"]').first().setInputFiles({
    name: 'empty.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(''),
  })
  await page.locator('.top-export').click()
  await page.getByRole('button', { name: '长图分片 ZIP' }).click()
  await page.getByRole('button', { name: '1×' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '下载' }).click(),
  ])
  const output = testInfo.outputPath('empty-parts.zip')
  await download.saveAs(output)
  const zip = await JSZip.loadAsync(await readFile(output))
  expect(Object.values(zip.files).filter((entry) => !entry.dir)).toHaveLength(1)
})

test('shows a useful remote-image fallback and still exports', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Covered once as a remote-resource failure')
  await page.locator('input[accept*=".md"]').first().setInputFiles({
    name: 'remote.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(
      '# Remote image\n\n![Unavailable](http://127.0.0.1:9/not-found.png)',
    ),
  })
  await expect(
    page.getByText('图片无法加载。远程图片请下载后拖入，本地图片请检查文件是否完整。'),
  ).toBeVisible()
  await page.locator('.top-export').click()
  await page.getByRole('button', { name: '1×' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '下载' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('Remote-image.png')
})

test('keeps the desktop CodeMirror editor independently scrollable', async ({
  page,
}) => {
  await page.locator('input[accept*=".md"]').first().setInputFiles({
    name: 'desktop-scroll.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(
      Array.from(
        { length: 120 },
        (_, index) => `Line ${index + 1}: desktop scrolling`,
      ).join('\n'),
    ),
  })

  const scroller = page.locator('.desktop-markdown-editor .cm-scroller')
  await expect(scroller).toBeVisible()
  const dimensions = await scroller.evaluate((element) => ({
    height: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }))
  expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.height)

  await scroller.hover()
  await page.mouse.wheel(0, 700)
  await expect
    .poll(() => scroller.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0)
})

test('uses a mobile pane switcher', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const mobileNav = page.locator('.mobile-nav')
  await mobileNav.getByRole('button', { name: 'Markdown', exact: true }).click()
  await expect(page.getByTestId('markdown-editor')).toBeVisible()
  await expect(page.locator('.mobile-markdown-editor')).toBeVisible()
  await mobileNav.getByRole('button', { name: '设置', exact: true }).click()
  await expect(page.getByRole('tab', { name: '主题' })).toBeVisible()
})

test('keeps mobile language switching and native editor scrolling available', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const language = page.getByRole('combobox', { name: '界面语言' })
  await expect(language).toHaveCSS('white-space', 'nowrap')
  expect(await language.evaluate((element) => element.scrollHeight)).toBe(
    await language.evaluate((element) => element.clientHeight),
  )
  await language.click()
  await expect(page.getByRole('option')).toHaveCount(2)
  await page.getByRole('option', { name: 'English' }).click()
  await expect(page.locator('.mobile-export')).toContainText('Export')

  const mobileSurfaceColor = await page
    .getByTestId('export-surface')
    .evaluate((element) => getComputedStyle(element).backgroundColor)
  await page.getByRole('button', { name: 'Switch to dark interface' }).click()
  await expect(page.locator('.app-shell')).toHaveAttribute(
    'data-appearance',
    'dark',
  )
  await page.getByRole('combobox', { name: 'Interface language' }).click()
  const languageMenu = page.locator('.language-menu-content')
  await expect(languageMenu).toHaveCSS('background-color', 'rgb(32, 36, 42)')
  await expect(languageMenu).toHaveCSS('color', 'rgb(238, 241, 244)')
  await page.keyboard.press('Escape')

  await page.setViewportSize({ width: 320, height: 700 })
  expect(
    await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      topbarClientWidth: document.querySelector('.topbar')?.clientWidth,
      topbarScrollWidth: document.querySelector('.topbar')?.scrollWidth,
    })),
  ).toEqual({
    clientWidth: 320,
    scrollWidth: 320,
    topbarClientWidth: 320,
    topbarScrollWidth: 320,
  })
  await expect(page.getByTestId('export-surface')).toHaveCSS(
    'background-color',
    mobileSurfaceColor,
  )

  await page
    .locator('.mobile-nav')
    .getByRole('button', { name: 'Markdown', exact: true })
    .click()
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
  await page
    .locator('.mobile-nav')
    .getByRole('button', { name: 'Markdown', exact: true })
    .click()
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

  await page.getByRole('button', { name: /保留样式 PDF/ }).click()
  const [pdfDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('.export-now').click(),
  ])
  const pdfOutput = testInfo.outputPath('uploaded-image.pdf')
  await pdfDownload.saveAs(pdfOutput)
  const pdfBytes = await readFile(pdfOutput)
  expect(pdfBytes.subarray(0, 4).toString()).toBe('%PDF')
  expect(pdfBytes.length).toBeGreaterThan(10_000)

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
  await page.getByRole('button', { name: /保留样式 PDF/ }).click()

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
