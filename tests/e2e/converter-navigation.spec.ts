import { expect, test } from '@playwright/test'

test('presents the homepage as the default Markdown converter', async ({
  page,
}) => {
  await page.goto('/')

  const converterNav = page.getByRole('navigation', { name: '转换类型' })
  const markdownLink = converterNav.getByRole('link', {
    name: 'Markdown 转图片',
    exact: true,
  })

  await expect(converterNav.getByRole('link')).toHaveCount(8)
  await expect(
    converterNav.getByRole('link', {
      name: '把结构化内容做成可分享的视觉作品',
    }),
  ).toHaveCount(0)
  await expect(markdownLink).toHaveAttribute('aria-current', 'page')
  await expect(markdownLink).toHaveAttribute('href', '/')

  await page.goto('/markdown-to-image/')
  await expect(
    page
      .getByRole('navigation', { name: '转换类型' })
      .getByRole('link', { name: 'Markdown 转图片', exact: true }),
  ).toHaveAttribute('aria-current', 'page')
})

test('keeps the active converter visible in the mobile tool menu', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 })
  await page.goto('/batch-markdown-to-image/')

  await page.locator('.mobile-tool-switcher > summary').click()

  const active = page
    .getByRole('navigation', { name: '转换类型' })
    .getByRole('link', { name: '批量 Markdown 转图片' })
  await expect(active).toHaveAttribute('aria-current', 'page')
  await expect(active).toBeInViewport()
})
