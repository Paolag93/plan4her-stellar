import { expect, test } from '@playwright/test'

const nav = (page: import('@playwright/test').Page, name: string) => page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name, exact: true }).click()

const saved = (page: import('@playwright/test').Page) => page.evaluate(() => localStorage.getItem('plan4her:local-state:v1'))

test('exploring a cycle day never saves; only Apply commits cycle + plan, and Undo restores both', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-12T08:00:00Z'))
  await page.goto('/')
  const click = (name: string) => page.getByRole('button', { name, exact: true }).click()
  await click('Build my first week'); await click('Continue'); await click('Continue without cycle context')
  await page.getByRole('radio', { name: /A full week, ready to plan/ }).click()
  await click('Continue'); await click('Continue'); await click('Skip for now')
  await expect(page.locator('.review-plan-screen')).toBeVisible({ timeout: 20000 })
  await click('Accept week')
  await nav(page, 'Tasks')
  await expect(page.getByText('45 min · Energizing movement')).toBeVisible()
  await nav(page, 'Plan')
  const original = await saved(page)
  const originalState = JSON.parse(original!)
  expect(originalState.cycleBasics).toBeNull()

  const openPreview = async () => {
    await page.getByRole('button', { name: /Explore your week/ }).click()
    await page.getByRole('slider', { name: 'Cycle day' }).fill('12')
  }
  await openPreview()
  const preview = page.getByTestId('rhythm-preview')
  await expect(preview.locator('h2')).toHaveText('Explore your week')
  for (const text of ['Best for', 'fits ', 'Watch your week', 'better-suited']) await expect(preview).not.toContainText(text)
  await expect(preview.locator('.rhythm-dial')).toContainText('Follicular')
  await expect(page.locator('.rhythm-moved')).toContainText(/\d+ tasks? moved/)
  const wednesday = preview.locator('.rhythm-day').nth(2)
  await expect(wednesday).toContainText('Day 14 · Ovulatory')
  await expect(wednesday).toContainText('Present project update to client')
  expect(await saved(page)).toBe(original) // slider + preview save nothing

  await click('Review changes')
  await expect(page.locator('.plan-diff-screen')).toContainText('Present project update to client')
  expect(await saved(page)).toBe(original) // opening the review saves nothing
  await page.getByRole('button', { name: 'Back' }).first().click()
  await expect(preview).toBeVisible()
  expect(await saved(page)).toBe(original)

  await click('Review changes')
  await click('Keep plan as is')
  expect(await saved(page)).toBe(original) // keep preserves cycle and plan

  await openPreview()
  await click('Review changes')
  await page.getByRole('button', { name: /^Apply/ }).click()
  await expect(page.locator('[class*=active-plan-screen]').first()).toContainText('Ovulatory')
  const state = JSON.parse((await saved(page))!)
  expect(state.cycleMode).toBe('natural')
  expect(state.cycleBasics.lastPeriodStart).toBe('2026-10-01')
  expect(state.acceptedPlan.blocks.find((b: { taskId?: string }) => b.taskId === 'sample-client').dateISO).toBe('2026-10-14')

  await click('Undo')
  const undone = JSON.parse((await saved(page))!)
  expect(undone.cycleMode).toBe(originalState.cycleMode)
  expect(undone.cycleBasics).toEqual(originalState.cycleBasics)
  expect(undone.acceptedPlan.blocks).toEqual(originalState.acceptedPlan.blocks)
})

test('rhythm preview fixture renders the sample week with phases and works at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 })
  await page.goto('/?qa=rhythm-preview')
  await expect(page.getByTestId('rhythm-preview')).toContainText('Cycle day')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Next cycle day' }).click()
  await expect(page.locator('.rhythm-dial__day')).toHaveText('2')
})
