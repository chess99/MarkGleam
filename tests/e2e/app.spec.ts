import { expect, test } from '@playwright/test'

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
  await page.getByRole('button', { name: '设置' }).last().click()
  await expect(page.getByRole('tab', { name: '主题' })).toBeVisible()
})
