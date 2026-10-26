import { expect, test, type Page } from '@playwright/test'

async function goToPrivacy(page: Page) {
  await page.goto('/?qa=start')
  await page.getByRole('button', { name: 'Build my first week' }).click()
}

async function goToCycleMode(page: Page) {
  await goToPrivacy(page)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
}

async function goToCycleBasics(page: Page) {
  await goToCycleMode(page)
  await page.getByRole('radio', { name: /Natural menstrual cycle/ }).click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
}

test.describe('MVP entry + Quick Start', () => {
  test('P6 / START matches the canonical 390x844 viewport contract', async ({ page }) => {
    await page.goto('/')
    const screen = page.locator('[data-figma-node="4200:1120"]')
    await expect(screen).toBeVisible()
    await expect(screen).toHaveCSS('width', '390px')
    await expect(screen).toHaveCSS('height', '844px')
    await expect(page.getByRole('heading', { name: 'Your life isn’t linear. Your plan shouldn’t be.' })).toBeVisible()
    await expect(page).toHaveScreenshot('p6-start-user-entry.png', { fullPage: true, animations: 'disabled' })
  })

  test('START → Privacy follows the canonical Figma graph', async ({ page }) => {
    await goToPrivacy(page)
    await expect(page.locator('[data-figma-node="4800:6686"]')).toBeVisible()
    await expect(page.getByRole('checkbox', { name: 'Share anonymous product usage' })).toHaveAttribute('aria-checked', 'false')
  })

  test('Privacy → Cycle Mode and selection state', async ({ page }) => {
    await goToCycleMode(page)
    await expect(page.locator('[data-figma-node="4198:46"]')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled()
    await page.getByRole('radio', { name: /Natural menstrual cycle/ }).click()
    await expect(page.locator('[data-figma-node="4199:868"]')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled()
  })

  test('Cycle Basics calendar selects 16 Oct', async ({ page }) => {
    await goToCycleBasics(page)
    await page.getByRole('button', { name: /Last period started/ }).click()
    await expect(page.locator('[data-figma-node="4565:6079"]')).toBeVisible()
    await page.getByRole('button', { name: '16' }).click()
    await expect(page.locator('[data-figma-node="4272:2107"]')).toBeVisible()
    await expect(page.getByText('Day 8 · Follicular')).toBeVisible()
  })

  test('happy path reaches Loading Plan', async ({ page }) => {
    await goToCycleBasics(page)
    await page.getByRole('button', { name: /Last period started/ }).click()
    await page.getByRole('button', { name: '16' }).click()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await page.getByRole('button', { name: 'Skip for now' }).click()
    await expect(page.locator('[data-figma-node="4250:4238"]')).toBeVisible()
  })

  test('Continue without cycle context skips Cycle Basics', async ({ page }) => {
    await goToCycleMode(page)
    await page.getByRole('button', { name: 'Continue without cycle context' }).click()
    await expect(page.locator('[data-figma-node="4216:1319"]')).toBeVisible()
  })
})

test.describe('Quick Start branch states', () => {
  test('No exact date can continue without cycle context', async ({ page }) => {
    await goToCycleBasics(page)
    await page.getByRole('button', { name: 'I don’t remember the date' }).click()
    await expect(page.locator('[data-figma-node="4272:2163"]')).toBeVisible()
    await page.getByRole('button', { name: 'Continue without cycle context' }).click()
    await expect(page.locator('[data-figma-node="4216:1319"]')).toBeVisible()
  })

  test('Custom task state matches QS06 branch', async ({ page }) => {
    await goToCycleBasics(page)
    await page.getByRole('button', { name: 'I don’t remember the date' }).click()
    await page.getByRole('button', { name: 'Continue without cycle context' }).click()
    await page.getByRole('button', { name: 'Add my own task' }).click()
    await expect(page.locator('[data-figma-node="4272:2285"]')).toBeVisible()
  })

  test('Custom availability exposes per-day branch states', async ({ page }) => {
    await goToCycleBasics(page)
    await page.getByRole('button', { name: 'I don’t remember the date' }).click()
    await page.getByRole('button', { name: 'Continue without cycle context' }).click()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await page.getByRole('button', { name: 'Customize days' }).click()
    await expect(page.locator('[data-figma-node="4272:2380"]')).toBeVisible()
    await page.getByRole('textbox', { name: 'Monday' }).click()
    await expect(page.locator('[data-figma-node="4285:3954"]')).toBeVisible()
  })

  test('Fixed commitment editor saves and reaches the added state', async ({ page }) => {
    await goToCycleBasics(page)
    await page.getByRole('button', { name: 'I don’t remember the date' }).click()
    await page.getByRole('button', { name: 'Continue without cycle context' }).click()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await page.getByRole('button', { name: 'Add fixed commitment' }).click()
    await expect(page.locator('[data-figma-node="4636:5720"]')).toBeVisible()
    await page.getByRole('button', { name: 'Save commitment' }).click()
    await expect(page.locator('[data-figma-node="4272:2428"]')).toBeVisible()
    await page.getByRole('button', { name: 'Create my week' }).click()
    await expect(page.locator('[data-figma-node="4250:4238"]')).toBeVisible()
  })
})


test.describe('Commitment editor overlays', () => {
  async function goToCommitmentEditor(page: Page) {
    await goToCycleBasics(page)
    await page.getByRole('button', { name: 'I don’t remember the date' }).click()
    await page.getByRole('button', { name: 'Continue without cycle context' }).click()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await page.getByRole('button', { name: 'Add fixed commitment' }).click()
    await expect(page.locator('[data-figma-node="4636:5720"]')).toBeVisible()
  }

  test('date field opens centered Figma date overlay and selection closes it', async ({ page }) => {
    await goToCommitmentEditor(page)
    await page.getByRole('button', { name: 'Date' }).click()
    await expect(page.locator('[data-figma-node="4636:5814"]')).toBeVisible()
    await page.getByRole('button', { name: '23' }).click()
    await expect(page.locator('[data-figma-node="4636:5814"]')).toHaveCount(0)
  })

  test('start time uses Figma start-time overlay', async ({ page }) => {
    await goToCommitmentEditor(page)
    await page.getByRole('button', { name: 'Start time' }).click()
    await expect(page.locator('[data-figma-node="4637:5778"]')).toBeVisible()
    await page.getByRole('button', { name: '11:30' }).click()
    await expect(page.locator('[data-figma-node="4637:5778"]')).toHaveCount(0)
  })

  test('end time uses Figma end-time overlay', async ({ page }) => {
    await goToCommitmentEditor(page)
    await page.getByRole('button', { name: 'End time' }).click()
    await expect(page.locator('[data-figma-node="4637:5795"]')).toBeVisible()
    await page.getByRole('button', { name: '12:00' }).click()
    await expect(page.locator('[data-figma-node="4637:5795"]')).toHaveCount(0)
  })
})
