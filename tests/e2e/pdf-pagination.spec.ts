import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const section = (index: number) => `## ${index}. 下列关于示例知识点的说法，正确的是？

- A. 选项一
- B. 选项二
- C. 选项三
- D. 选项四

✅ **答案：B**

💡 **解析：** 这是一段用于验证 PDF 连续排版的简短解析文字。

---`

const countPdfPages = async (path: string) => {
  const bytes = await readFile(path)
  return bytes.toString('latin1').match(/\/Type\s*\/Page\b/g)?.length ?? 0
}

test('packs short sections separated by horizontal rules into PDF pages', async ({
  page,
}, testInfo) => {
  await page.goto('/')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Markdown', exact: true }).click()
  await page
    .locator('.mobile-markdown-editor')
    .fill(Array.from({ length: 12 }, (_, index) => section(index + 1)).join('\n\n'))

  await page.locator('.mobile-export').click()
  await page.getByRole('button', { name: 'PDF', exact: true }).click()

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('.export-now').click(),
  ])
  const output = testInfo.outputPath('packed-sections.pdf')
  await download.saveAs(output)

  expect(await countPdfPages(output)).toBe(6)
  await expect(page.locator('.toast')).toContainText('(6)')
})

test('forces PDF pages only at explicit pagebreak comments', async ({
  page,
}, testInfo) => {
  await page.goto('/')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Markdown', exact: true }).click()
  await page.locator('.mobile-markdown-editor').fill(`# Page 1

Short first page.

<!-- pagebreak -->

# Page 2

Short second page.

<!-- pagebreak -->

# Page 3

Short third page.`)

  await page.locator('.mobile-export').click()
  await page.getByRole('button', { name: 'PDF', exact: true }).click()

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('.export-now').click(),
  ])
  const output = testInfo.outputPath('explicit-pagebreaks.pdf')
  await download.saveAs(output)

  expect(await countPdfPages(output)).toBe(3)
  await expect(page.locator('.toast')).toContainText('(3)')
})
