import { expect, test } from '@playwright/test'

test('uses the brand as a home link and keeps the help menu task-focused', async ({
  page,
}) => {
  await page.goto('/markdown-to-pdf/')

  const brand = page.locator('a.brand')
  await expect(brand).toHaveAttribute('href', '/')
  await expect(brand).toBeVisible()

  await page.getByRole('button', { name: '帮助' }).click()
  const helpMenu = page.getByRole('menu')
  await expect(helpMenu.getByRole('menuitem', { name: '帮助' })).toBeVisible()
  await expect(helpMenu.getByRole('menuitem', { name: '隐私' })).toBeVisible()
  await expect(helpMenu.getByRole('menuitem', { name: '快捷键' })).toBeVisible()
  await expect(helpMenu.getByRole('menuitem', { name: '更新日志' })).toHaveCount(
    0,
  )
})
