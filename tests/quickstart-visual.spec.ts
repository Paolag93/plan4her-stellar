import { expect, test, type Page } from '@playwright/test'

// Canonical reference PNGs were exported directly from Figma get_screenshot on
// 2026-10-08, file zctnzXqin1jZJLvxBlVxZz, page 4088:182 (10 - Prototype).
// Each export reported original and rendered dimensions of 390 × 844.
// The supported inline-base64 response was decoded without resizing or editing
// because the asset URL returned an HTML "Site Unavailable" response here.
// These are independent Figma references, never Chromium-generated baselines.
// Keep the project's existing visual tolerance; do not update these from the app.
const references = {
  'cycle-mode': '4198:46',
  'cycle-basics': '4198:57',
  'no-exact-date': '4272:2163',
  'starter-tasks': '4216:1319',
  availability: '4216:1332',
  'fixed-commitments': '4198:90',
} as const

type Reference = keyof typeof references

test.use({ viewport: { width: 390, height: 844 } })

async function expectCanonicalScreen(page: Page, reference: Reference) {
  const screen = page.locator(`[data-figma-node="${references[reference]}"]`)
  await expect(screen).toBeVisible()
  await expect(screen).toHaveCSS('width', '390px')
  await expect(screen).toHaveCSS('height', '844px')
  await page.evaluate(() => document.fonts.ready)
  await expect(page).toHaveScreenshot(`p6-${reference}.png`, {
    animations: 'disabled',
    caret: 'hide',
  })
}

async function goToCycleMode(page: Page) {
  // Enter through the fixture's actual UI so canonical default values stay intact.
  await page.goto('/?qa=start')
  await page.getByRole('button', { name: 'Build my first week' }).click()
  await expect(page.locator('[data-figma-node="4800:6686"]')).toBeVisible()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.locator('[data-figma-node="4198:46"]')).toBeVisible()
}

async function goToCycleBasics(page: Page) {
  await goToCycleMode(page)
  await page.getByRole('radio', { name: /Natural menstrual cycle/ }).click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.locator('[data-figma-node="4198:57"]')).toBeVisible()
}

async function goToStarterTasks(page: Page) {
  await goToCycleMode(page)
  await page.getByRole('button', { name: 'Continue without cycle context' }).click()
  await expect(page.locator('[data-figma-node="4216:1319"]')).toBeVisible()
}

async function goToAvailability(page: Page) {
  await goToStarterTasks(page)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.locator('[data-figma-node="4216:1332"]')).toBeVisible()
}

test.describe('Quick Start visual parity with canonical Figma', () => {
  test('4198:46 · Cycle Mode before selection', async ({ page }) => {
    await goToCycleMode(page)
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled()
    await expect(page.getByRole('radio', { checked: true })).toHaveCount(0)
    await expectCanonicalScreen(page, 'cycle-mode')
  })

  test('4198:57 · Cycle Basics before choosing a date', async ({ page }) => {
    await goToCycleBasics(page)
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled()
    await expect(page.getByText('Select a date', { exact: true })).toBeVisible()
    await expectCanonicalScreen(page, 'cycle-basics')
  })

  test('4272:2163 · No Exact Date from Cycle Basics', async ({ page }) => {
    await goToCycleBasics(page)
    await page.getByRole('button', { name: 'I don’t remember the date' }).click()
    await expectCanonicalScreen(page, 'no-exact-date')
  })

  test('4272:2163 · No Exact Date from unsure Cycle Mode', async ({ page }) => {
    await goToCycleMode(page)
    await page.getByRole('radio', { name: /I’m not sure/ }).click()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expectCanonicalScreen(page, 'no-exact-date')
  })

  test('4216:1319 · Starter Tasks with the default Balanced week', async ({ page }) => {
    await goToStarterTasks(page)
    await expect(page.getByRole('radio', { name: /Balanced week/ })).toHaveAttribute('aria-checked', 'true')
    await expectCanonicalScreen(page, 'starter-tasks')
  })

  test('4216:1332 · Availability with unchanged weekday and weekend defaults', async ({ page }) => {
    await goToAvailability(page)
    await expect(page.getByRole('textbox', { name: 'Weekdays', exact: true })).toHaveValue('09:00–18:00')
    await expect(page.getByRole('textbox', { name: 'Weekends', exact: true })).toHaveValue('10:00–16:00')
    await expectCanonicalScreen(page, 'availability')
  })

  test('4198:90 · Fixed Commitments before adding a commitment', async ({ page }) => {
    await goToAvailability(page)
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Add fixed commitment', exact: true })).toBeVisible()
    await expectCanonicalScreen(page, 'fixed-commitments')
  })
})
