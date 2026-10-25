import { expect, test, type Page } from '@playwright/test'
import { createInitialState, STORAGE_KEY } from '../src/domain/persistence'
import { generateWeeklyPlan } from '../src/domain/planner'
import type { AppState } from '../src/domain/types'

test.use({ timezoneId: 'UTC', hasTouch: true })

async function saved(page: Page): Promise<AppState> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY)
}

async function seedWeek(page: Page, weekStart = '2026-10-12', fridayOnly = false) {
  await page.clock.setFixedTime(new Date(`${weekStart}T08:00:00Z`))
  const state = createInitialState()
  state.tasks = [{ id: 'anchor', title: 'Anchor task', kind: 'Flexible', importance: 'Must', duration: '30 min', meta: '30 min' }]
  if (fridayOnly) for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday'] as const) state.availability[day] = ''
  state.acceptedPlan = generateWeeklyPlan({ ...state, weekStart })
  state.draftPlan = state.acceptedPlan
  state.onboardingComplete = true
  await page.addInitScript(({ key, state }) => {
    if (!sessionStorage.getItem('custom-input-seeded')) {
      localStorage.setItem(key, JSON.stringify(state))
      sessionStorage.setItem('custom-input-seeded', 'yes')
    }
  }, { key: STORAGE_KEY, state })
  await page.goto('/')
  return state
}

async function nav(page: Page, name: 'Tasks' | 'Plan') {
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name, exact: true }).click()
}

async function addTask(page: Page, title: string) {
  await nav(page, 'Tasks')
  await page.getByRole('button', { name: 'Add task', exact: true }).click()
  await page.getByRole('button', { name: /Add with details/ }).click()
  await page.getByRole('textbox', { name: 'Task', exact: true }).fill(title)
}

async function customTime(page: Page, field: 'Start time' | 'End time', time: string) {
  await page.getByRole('button', { name: field, exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Custom', exact: true }).click()
  await dialog.getByRole('textbox', { name: 'Exact time (HH:MM)' }).fill(time)
  await dialog.getByRole('button', { name: 'Use time', exact: true }).click()
}

async function customDuration(page: Page, hours: string, minutes: string) {
  await page.getByRole('button', { name: 'Duration', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Custom', exact: true }).click()
  await dialog.getByRole('textbox', { name: 'Hours', exact: true }).fill(hours)
  await dialog.getByRole('textbox', { name: 'Minutes', exact: true }).fill(minutes)
  await dialog.getByRole('button', { name: 'Use duration', exact: true }).click()
}

async function editBlock(page: Page) {
  await nav(page, 'Plan')
  await page.getByRole('button', { name: 'Actions for Anchor task', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: /Edit or move/ }).click()
}

test('custom task durations validate, save, reopen and reach the planner without rounding to presets', async ({ page }) => {
  const original = await seedWeek(page)
  await addTask(page, 'Detailed research')
  const duration = page.getByRole('button', { name: 'Duration', exact: true })
  await duration.click()
  const dialog = page.getByRole('dialog', { name: 'Task duration', exact: true })
  await dialog.getByRole('button', { name: 'Custom', exact: true }).click()
  for (const [hours, minutes] of [['0', '0'], ['-1', '15'], ['1.5', '0'], ['0', '60'], ['24', '1']]) {
    await dialog.getByRole('textbox', { name: 'Hours', exact: true }).fill(hours)
    await dialog.getByRole('textbox', { name: 'Minutes', exact: true }).fill(minutes)
    await expect(dialog.getByRole('button', { name: 'Use duration', exact: true })).toBeDisabled()
  }
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(duration).toBeFocused()
  await expect(duration).toContainText('60 min')
  await customDuration(page, '1', '23')
  await page.getByRole('button', { name: 'Save as Unscheduled', exact: true }).click()
  await expect.poll(async () => (await saved(page)).tasks.find(task => task.title === 'Detailed research')?.duration).toBe('83 min')
  await page.reload()
  await nav(page, 'Tasks')
  await page.getByRole('button', { name: /^Detailed research/ }).click()
  await expect(page.getByRole('button', { name: 'Duration', exact: true })).toContainText('83 min')
  await customDuration(page, '2', '7')
  await page.getByRole('button', { name: 'Save task', exact: true }).click()
  await expect.poll(async () => (await saved(page)).tasks.find(task => task.title === 'Detailed research')?.duration).toBe('127 min')
  await page.reload()
  const state = await saved(page)
  expect(state.acceptedPlan).toEqual(original.acceptedPlan)
  const generated = generateWeeklyPlan({ ...state, weekStart: '2026-10-12' })
  expect(generated.blocks.find(block => block.title === 'Detailed research')).toMatchObject({ duration: '127 min', time: '09:30–11:37' })
})

test('fixed tasks accept exact start/end times and reject invalid or overnight endpoints', async ({ page }) => {
  await seedWeek(page)
  await addTask(page, 'Precise appointment')
  await page.getByRole('button', { name: 'Fixed', exact: true }).click()
  await customTime(page, 'Start time', '14:17')
  await expect(page.getByRole('button', { name: 'Save as Unscheduled', exact: true })).toBeDisabled()
  await expect(page.getByRole('alert')).toContainText('End time must be after start time')
  await page.getByRole('button', { name: 'End time', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'End time', exact: true })
  await expect(dialog.getByRole('button', { name: '2:00 PM', exact: true })).toBeDisabled()
  await dialog.getByRole('button', { name: 'Custom', exact: true }).click()
  const input = dialog.getByRole('textbox', { name: 'Exact time (HH:MM)' })
  for (const time of ['24:00', '14:60', '9:30', '00:00', '14:17', '14:16']) {
    await input.fill(time)
    await expect(dialog.getByRole('button', { name: 'Use time', exact: true })).toBeDisabled()
  }
  await input.fill('16:03')
  await input.press('Enter')
  await expect(page.getByRole('button', { name: 'End time', exact: true })).toContainText('16:03')
  await page.getByRole('button', { name: 'Save as Unscheduled', exact: true }).click()
  await expect.poll(async () => (await saved(page)).tasks.find(task => task.title === 'Precise appointment')?.duration).toBe('106 min')
  await page.reload()
  await nav(page, 'Tasks')
  await page.getByRole('button', { name: /^Precise appointment/ }).click()
  await expect(page.getByRole('button', { name: 'Start time', exact: true })).toContainText('14:17')
  await customTime(page, 'Start time', '13:07')
  await customDuration(page, '1', '11')
  await page.getByRole('button', { name: 'Save task', exact: true }).click()
  await expect.poll(async () => (await saved(page)).tasks.find(task => task.title === 'Precise appointment')?.startTime).toBe('13:07')
  const state = await saved(page)
  expect(generateWeeklyPlan({ ...state, weekStart: '2026-10-12' }).blocks.find(block => block.title === 'Precise appointment')).toMatchObject({ dateISO: '2026-10-12', time: '13:07–14:18', duration: '71 min', fixed: true })
})

test('live block selectors support touch, keyboard, cross-month dates and a reversible preview', async ({ page }) => {
  const original = await seedWeek(page, '2026-10-26', true)
  await editBlock(page)
  const dateButton = page.getByRole('button', { name: 'Date', exact: true })
  await dateButton.tap()
  const dateDialog = page.getByRole('dialog', { name: 'Edit block date', exact: true })
  await expect(dateDialog.getByRole('heading', { name: 'October 2026' })).toBeVisible()
  await expect(dateDialog.getByRole('button', { name: '30', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await dateDialog.getByRole('textbox', { name: 'Date (YYYY-MM-DD)' }).fill('2026-02-30')
  await expect(dateDialog.getByRole('button', { name: 'Use date', exact: true })).toBeDisabled()
  await expect(dateDialog.getByRole('alert')).toContainText('Enter a valid date')
  await page.keyboard.press('Escape')
  await expect(dateButton).toBeFocused()
  await expect(dateButton).toContainText('2026-10-30')
  await dateButton.press('Enter')
  await dateDialog.getByRole('button', { name: 'Next month', exact: true }).tap()
  await expect(dateDialog.getByRole('heading', { name: 'November 2026' })).toBeVisible()
  await dateDialog.getByRole('button', { name: '1', exact: true }).tap()
  await customTime(page, 'Start time', '12:17')
  await customDuration(page, '1', '23')
  await page.getByRole('button', { name: 'Preview changes', exact: true }).click()
  await page.getByRole('radio', { name: /Rest of the week/ }).click()
  await page.getByRole('button', { name: 'Preview changes', exact: true }).click()
  await expect(page.locator('.plan-diff-screen')).toContainText('12:17–13:40')
  expect((await saved(page)).acceptedPlan).toEqual(original.acceptedPlan)
  await page.getByRole('button', { name: /^Apply changes?$/ }).click()
  await expect.poll(async () => (await saved(page)).acceptedPlan?.blocks[0].dateISO).toBe('2026-11-01')
  await page.reload()
  expect((await saved(page)).acceptedPlan?.blocks[0]).toMatchObject({ dateISO: '2026-11-01', start: '12:17', duration: '83 min', time: '12:17–13:40' })
  await editBlock(page)
  await dateButton.click()
  await expect(dateDialog.getByRole('heading', { name: 'November 2026' })).toBeVisible()
  await expect(dateDialog.getByRole('button', { name: '1', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await dateDialog.getByRole('button', { name: 'Close date picker', exact: true }).click()
  await page.getByRole('button', { name: 'Duration', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Custom', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Hours', exact: true })).toHaveValue('1')
  await expect(page.getByRole('textbox', { name: 'Minutes', exact: true })).toHaveValue('23')
  await page.getByRole('textbox', { name: 'Minutes', exact: true }).fill('59')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Duration', exact: true })).toContainText('83 min')
})

test('fixed commitment custom times persist through week generation and reload', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-12T08:00:00Z'))
  await page.goto('/')
  await page.getByRole('button', { name: 'Build my first week', exact: true }).click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('button', { name: 'Continue without cycle context', exact: true }).click()
  await page.getByRole('radio', { name: /Work focus/ }).click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('button', { name: 'Add fixed commitment', exact: true }).click()
  await page.getByRole('textbox', { name: 'Commitment', exact: true }).fill('Exact commitment')
  await customTime(page, 'Start time', '09:17')
  await page.getByRole('button', { name: 'End time', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Custom', exact: true }).click()
  const timeInput = page.getByRole('textbox', { name: 'Exact time (HH:MM)' })
  await timeInput.fill('09:17')
  await expect(page.getByRole('button', { name: 'Use time', exact: true })).toBeDisabled()
  await timeInput.fill('10:43')
  await page.getByRole('button', { name: 'Use time', exact: true }).click()
  await page.getByRole('button', { name: 'Save commitment', exact: true }).click()
  await expect.poll(async () => (await saved(page)).commitments[0]?.endTime).toBe('10:43')
  await page.getByRole('button', { name: 'Create my week', exact: true }).click()
  await expect(page.locator('.review-plan-screen')).toBeVisible({ timeout: 15_000 })
  expect((await saved(page)).draftPlan?.blocks.find(block => block.title === 'Exact commitment')).toMatchObject({ dateISO: '2026-10-12', start: '09:17', duration: '86 min', time: '09:17–10:43', fixed: true })
  await page.getByRole('button', { name: 'Accept week', exact: true }).click()
  await page.reload()
  expect((await saved(page)).commitments[0]).toMatchObject({ date: '2026-10-12', startTime: '09:17', endTime: '10:43' })
})

test('narrow-screen custom fields and dates beyond the current month remain usable and persist', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await seedWeek(page, '2026-10-26')
  await addTask(page, 'Next month appointment')
  await page.getByRole('button', { name: 'Fixed', exact: true }).click()
  await page.getByRole('button', { name: 'Date', exact: true }).click()
  const dateDialog = page.getByRole('dialog', { name: 'Task fixed date', exact: true })
  await dateDialog.getByRole('button', { name: 'Next month', exact: true }).tap()
  await expect(dateDialog.getByRole('heading', { name: 'November 2026' })).toBeVisible()
  await dateDialog.getByRole('button', { name: '2', exact: true }).tap()
  await page.getByRole('button', { name: 'Start time', exact: true }).click()
  const timeDialog = page.getByRole('dialog', { name: 'Start time', exact: true })
  await timeDialog.getByRole('button', { name: 'Custom', exact: true }).tap()
  const exactTime = timeDialog.getByRole('textbox', { name: 'Exact time (HH:MM)' })
  await exactTime.fill('10:07')
  const inputBounds = await exactTime.boundingBox()
  const dialogBounds = await timeDialog.boundingBox()
  expect(inputBounds).not.toBeNull()
  expect(dialogBounds).not.toBeNull()
  expect(inputBounds!.x).toBeGreaterThanOrEqual(dialogBounds!.x)
  expect(inputBounds!.x + inputBounds!.width).toBeLessThanOrEqual(dialogBounds!.x + dialogBounds!.width)
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab')
    expect(await timeDialog.evaluate(dialog => dialog.contains(document.activeElement))).toBe(true)
  }
  await timeDialog.getByRole('button', { name: 'Use time', exact: true }).tap()
  await customTime(page, 'End time', '11:19')
  await page.getByRole('button', { name: 'Save as Unscheduled', exact: true }).click()
  await expect.poll(async () => (await saved(page)).tasks.find(task => task.title === 'Next month appointment')?.fixedDate).toBe('2026-11-02')
  await page.reload()
  const state = await saved(page)
  expect(state.tasks.find(task => task.title === 'Next month appointment')).toMatchObject({ fixedDate: '2026-11-02', startTime: '10:07', duration: '72 min' })
  expect(generateWeeklyPlan({ ...state, weekStart: '2026-11-02' }).blocks.find(block => block.title === 'Next month appointment')).toMatchObject({ dateISO: '2026-11-02', time: '10:07–11:19', fixed: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320)
})
