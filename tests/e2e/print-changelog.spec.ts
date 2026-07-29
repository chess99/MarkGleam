import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const useEnglish = async (page: import('@playwright/test').Page) => {
  await page.getByRole('combobox').click()
  await page.getByRole('option', { name: 'English' }).click()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await useEnglish(page)
})

test('opens a shareable bilingual changelog page', async ({ page }) => {
  await page.getByRole('button', { name: 'Help' }).click()
  await page.getByRole('menuitem', { name: 'Changelog' }).click()

  await expect(page).toHaveURL(/#\/changelog$/)
  await expect(
    page.getByRole('heading', { name: 'MD2IMG changelog' }),
  ).toBeVisible()
  await expect(page.getByText('2026-07-30')).toBeVisible()
  await expect(page.getByText('Print / Searchable PDF', { exact: false })).toBeVisible()

  await page.setViewportSize({ width: 320, height: 700 })
  await expect(page.getByRole('combobox')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Back to editor' })).toBeVisible()

  await page.getByRole('button', { name: 'Back to editor' }).click()
  await expect(page).not.toHaveURL(/#\/changelog$/)
  await expect(page.locator('.app-shell')).toBeVisible()
})

test('uses native print media with searchable content and explicit page breaks', async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(browserName !== 'chromium', 'Chromium exposes page.pdf for print verification')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Markdown', exact: true }).click()
  await page.locator('.mobile-markdown-editor').fill(`# First printable page

Searchable native text.

<!-- pagebreak -->

# Second printable page

More searchable text.`)
  await page.evaluate(() => {
    window.print = () => {
      document.documentElement.dataset.printCalled = 'true'
    }
  })

  await page.getByRole('button', { name: 'Export', exact: true }).click()
  await page
    .getByRole('button', { name: /Print \/ Searchable PDF/ })
    .first()
    .click()
  await page.locator('.export-now').click()

  await expect(page.locator('html')).toHaveAttribute('data-print-called', 'true')
  const printHost = page.locator('[data-md2img-print-host]')
  await expect(printHost).toContainText('Searchable native text.')
  await expect(printHost.locator('[data-page-break]')).toHaveCount(1)

  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('#root')).toHaveCSS('display', 'none')
  await expect(printHost).toHaveCSS('display', 'block')
  await expect(printHost.locator('[data-page-break]')).toHaveCSS(
    'break-before',
    'page',
  )

  const output = testInfo.outputPath('native-print.pdf')
  await page.pdf({
    path: output,
    preferCSSPageSize: true,
    printBackground: true,
  })
  const bytes = await readFile(output)
  const pages = bytes.toString('latin1').match(/\/Type\s*\/Page\b/g)?.length ?? 0
  expect(pages).toBe(2)
})
