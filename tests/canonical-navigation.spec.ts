import { expect, test, type Page } from '@playwright/test'

async function cycleMode(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Build my first week', exact: true }).click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
}

test('Unsure Continue reaches No exact date, while its direct skip still reaches Starter Tasks', async ({ page }) => {
  await cycleMode(page)
  await page.getByRole('radio', { name: /I’m not sure/ }).click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.locator('[data-figma-node="4272:2163"]')).toBeVisible()
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.locator('[data-figma-node="4272:2068"]')).toBeVisible()
  await page.getByRole('button', { name: 'Continue without cycle context', exact: true }).click()
  await expect(page.locator('[data-figma-node="4216:1319"]')).toBeVisible()
})

test('No exact date returns to the actual Cycle Basics caller and permits entering a date', async ({ page }) => {
  await cycleMode(page)
  await page.getByRole('radio', { name: /Natural menstrual cycle/ }).click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('button', { name: 'I don’t remember the date', exact: true }).click()
  await expect(page.locator('[data-figma-node="4272:2163"]')).toBeVisible()
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.locator('[data-figma-node="4198:57"]')).toBeVisible()
  await page.goForward()
  await expect(page.locator('[data-figma-node="4272:2163"]')).toBeVisible()
  await page.getByRole('button', { name: 'Add a period date', exact: true }).click()
  await expect(page.locator('[data-figma-node="4198:57"]')).toBeVisible()
})

test('Skipping after an unsure answer keeps optional cycle context off', async ({ page }) => {
  await cycleMode(page)
  await page.getByRole('radio', { name: /I’m not sure/ }).click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('button', { name: 'Continue without cycle context', exact: true }).click()
  await expect(page.locator('[data-figma-node="4216:1319"]')).toBeVisible()
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('plan4her:local-state:v1')!))
  expect(state.cycleMode).toBeNull()
  expect(state.cycleBasics).toBeNull()
})

async function openQuickCapture(page: Page) {
  await page.getByRole('button', { name: 'Add task', exact: true }).click()
  await page.getByRole('button', { name: /Quick capture/ }).click()
  await expect(page.locator('[data-figma-node="4198:239"]')).toBeVisible()
}

for (const route of ['tasks', 'today']) {
  test(`Quick Capture Back returns to ${route}; Cancel explicitly goes to Today`, async ({ page }) => {
    await page.goto(`/?qa=${route}`)
    await openQuickCapture(page)
    await page.getByRole('textbox', { name: 'Task', exact: true }).fill('Unsaved capture')
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await expect(page.locator(route === 'tasks' ? '.tasks-screen' : '.today-screen')).toBeVisible()
    await expect(page.getByText('Unsaved capture', { exact: true })).toHaveCount(0)
    await openQuickCapture(page)
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(page.locator('.today-screen')).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })
}

test('Live Quick Capture Back preserves browser history and never saves a cancelled task', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('plan4her:local-state:v1')!)
    history.pushState({ screen: 'tasks', previousScreen: 'start' }, '', '#tasks')
    dispatchEvent(new PopStateEvent('popstate', { state: history.state }))
    return state
  })
  await expect(page.locator('.tasks-screen')).toBeVisible()
  await page.getByRole('button', { name: 'Quick capture', exact: true }).click()
  await page.getByRole('textbox', { name: 'Task', exact: true }).fill('Never save me')
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.locator('.tasks-screen')).toBeVisible()
  await page.goForward()
  await expect(page.locator('.quick-capture-screen')).toBeVisible()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.locator('.today-screen')).toBeVisible()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('plan4her:local-state:v1')!).tasks)).toEqual([])
})
