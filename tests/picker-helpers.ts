import type { Page } from '@playwright/test'

export async function chooseExactTime(page: Page, value: string, field = 'Start time') {
  await page.getByRole('button', { name: field, exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Custom', exact: true }).click()
  await dialog.getByRole('textbox', { name: 'Exact time (HH:MM)', exact: true }).fill(value)
  await dialog.getByRole('button', { name: 'Use time', exact: true }).click()
}

export async function chooseExactDate(page: Page, value: string) {
  await page.getByRole('button', { name: 'Date', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox', { name: 'Date (YYYY-MM-DD)', exact: true }).fill(value)
  await dialog.getByRole('button', { name: 'Use date', exact: true }).click()
}
