import { expect, test, type Page } from '@playwright/test'
import { RHYTHM_STORAGE_KEY } from '../src/domain/community'

const community = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), RHYTHM_STORAGE_KEY)
const nav = (page: Page, name: string) => page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name, exact: true }).click()
const click = (page: Page, name: string) => page.getByRole('button', { name, exact: true }).click()

async function onboard(page: Page) {
  await page.clock.setFixedTime(new Date('2026-10-12T08:00:00Z'))
  await page.goto('/')
  await click(page, 'Build my first week'); await click(page, 'Continue'); await click(page, 'Continue without cycle context')
  await click(page, 'Continue'); await click(page, 'Continue'); await click(page, 'Skip for now')
  await expect(page.locator('.review-plan-screen')).toBeVisible({ timeout: 15000 })
  await click(page, 'Accept week')
}

test('non-member: tasks complete normally, no commitment controls, and Join leads to the terms', async ({ page }) => {
  await onboard(page)
  await nav(page, 'Today')
  await page.getByRole('button', { name: 'Update progress', exact: true }).first().click()
  await page.getByRole('radio', { name: /^Done/ }).click()
  await click(page, 'Continue')
  await expect.poll(async () => (await page.evaluate(() => JSON.parse(localStorage.getItem('plan4her:local-state:v1')!))).acceptedPlan.blocks.some((b: { status?: string }) => b.status === 'done')).toBe(true)
  await nav(page, 'Today')
  await expect(page.getByRole('region', { name: 'Rhythm Pool' })).toHaveCount(0) // no member card
  await page.getByRole('button', { name: /^Rhythm Pool/ }).click() // quiet entry on Today
  const home = page.getByTestId('rhythm-home')
  await expect(home).toBeVisible()
  await expect(home.getByRole('button', { name: 'Done', exact: true })).toHaveCount(0)
  await expect(home.getByRole('button', { name: 'Missed', exact: true })).toHaveCount(0)
  await expect(home.getByRole('button', { name: /My progress/ })).toHaveCount(0)
  await click(page, 'Join Rhythm Pool')
  await expect(page.getByTestId('rhythm-terms')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Join the Rhythm Pool', exact: true })).toBeDisabled()
  expect((await community(page))?.participation ?? null).toBeNull()
})

test('joined member without a wallet: commitments and Done/Missed work; wallet stays optional and secondary', async ({ page }) => {
  await onboard(page)
  await nav(page, 'More')
  await click(page, 'Rhythm Pool')
  await click(page, 'Join Rhythm Pool')
  await page.getByRole('checkbox', { name: 'I accept the Rhythm Pool terms' }).click()
  await click(page, 'Join the Rhythm Pool')
  const options = page.getByTestId('rhythm-commitments').getByRole('checkbox')
  for (const i of [0, 1, 2]) await options.nth(i).check()
  await click(page, 'Confirm commitments')
  const cards = page.getByTestId('commitment')
  await cards.nth(0).getByRole('button', { name: 'Done', exact: true }).click()
  await expect(page.getByTestId('rhythm-progress')).toContainText('1 of 3 commitments completed')
  const wallet = page.getByRole('button', { name: /Connect wallet · optional/ })
  await expect(wallet).toBeVisible()
  await expect(wallet).toHaveClass(/secondary/)
  const saved = await community(page)
  expect(saved.participation).toBeTruthy()
  expect(saved.savings.ledger).toEqual([])
  await nav(page, 'More')
  await click(page, 'Rhythm Pool')
  await expect(page.getByTestId('rhythm-progress')).toBeVisible() // a member lands on her progress, not the join screen
  await expect(page.getByRole('heading', { name: 'My progress' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Join Rhythm Pool', exact: true })).toHaveCount(0)
})
