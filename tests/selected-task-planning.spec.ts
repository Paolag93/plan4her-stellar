import { expect, test, type Page } from '@playwright/test'
import { createInitialState, STORAGE_KEY } from '../src/domain/persistence'
import { generateWeeklyPlan } from '../src/domain/planner'
import type { AppState, TaskItem } from '../src/domain/types'

const monday = '2026-10-12'
const selected: TaskItem = { id: 'selected', title: 'Selected backlog task', kind: 'Flexible', duration: '45 min', meta: '45 min', deadline: monday }
const unselected: TaskItem = { id: 'unselected', title: 'Leave in backlog', kind: 'Flexible', duration: '75 min', meta: '75 min', deadline: '2026-10-13' }
const existing: TaskItem = { id: 'existing', title: 'Existing planned work', kind: 'Flexible', duration: '60 min', meta: '60 min' }

function sampleState(extra: TaskItem[] = []): AppState {
  const state = createInitialState()
  state.tasks = [existing, selected, unselected, ...extra]
  state.commitments = [{ id: 'meeting', title: 'Protected meeting', date: monday, startTime: '11:00', endTime: '11:45' }]
  state.acceptedPlan = generateWeeklyPlan({ ...state, tasks: [existing], weekStart: monday })
  state.draftPlan = state.acceptedPlan
  state.onboardingComplete = true
  return state
}
async function seed(page: Page, state: AppState) {
  await page.clock.setFixedTime(new Date(`${monday}T08:00:00Z`))
  await page.addInitScript(({ key, state }) => {
    if (!sessionStorage.getItem('selection-seeded')) {
      localStorage.setItem(key, JSON.stringify(state))
      sessionStorage.setItem('selection-seeded', 'yes')
    }
  }, { key: STORAGE_KEY, state })
  await page.goto('/')
  await nav(page, 'Tasks')
}
async function nav(page: Page, name: string) {
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name, exact: true }).click()
}
async function saved(page: Page): Promise<AppState> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY)
}

test('backlog selection previews only chosen work, preserves inputs and accepted blocks, and requires Apply', async ({ page }) => {
  const state = sampleState()
  await seed(page, state)
  const backlog = page.getByRole('region', { name: 'Unscheduled tasks', exact: true })
  const planned = page.getByRole('region', { name: 'Tasks in plan', exact: true })
  await expect(planned).toContainText(existing.title)
  await expect(planned.locator('.p4h-task-card__check-touch')).toHaveCount(0)
  await expect(backlog).not.toContainText(existing.title)
  await expect(page.getByRole('button', { name: 'Add to plan', exact: true })).toBeDisabled()
  await backlog.getByRole('button', { name: `Select ${selected.title} for planning`, exact: true }).click()
  await expect(backlog.getByRole('status')).toHaveText('1 selected')
  expect((await saved(page)).tasks).toEqual(state.tasks)
  expect((await saved(page)).acceptedPlan).toEqual(state.acceptedPlan)
  await expect(backlog.getByRole('button', { name: `Mark ${selected.title} done`, exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Add to plan', exact: true }).click()
  await expect(page.locator('.plan-diff-screen')).toBeVisible()
  await expect(page.locator('.plan-diff-card')).toHaveCount(1)
  await expect(page.locator('.plan-diff-card')).toContainText(selected.title)
  await expect(page.locator('.plan-diff-card')).not.toContainText(unselected.title)
  expect((await saved(page)).acceptedPlan).toEqual(state.acceptedPlan)
  expect((await saved(page)).draftPlan).toEqual(state.draftPlan)
  await page.getByRole('button', { name: 'Keep plan as is', exact: true }).click()
  expect((await saved(page)).acceptedPlan).toEqual(state.acceptedPlan)
  await nav(page, 'Tasks')
  await page.getByRole('button', { name: `Select ${selected.title} for planning`, exact: true }).click()
  await page.getByRole('button', { name: 'Add to plan', exact: true }).click()
  await page.getByRole('button', { name: /^Apply changes?$/ }).click()
  await expect.poll(async () => (await saved(page)).acceptedPlan?.blocks.some(block => block.taskId === selected.id)).toBe(true)
  const after = await saved(page)
  for (const block of state.acceptedPlan!.blocks) expect(after.acceptedPlan!.blocks.find(item => item.id === block.id)).toEqual(block)
  expect(after.acceptedPlan!.blocks.find(block => block.taskId === selected.id)).toMatchObject({ duration: '45 min', dateISO: monday, status: 'scheduled' })
  expect(after.acceptedPlan!.blocks.some(block => block.taskId === unselected.id)).toBe(false)
  expect(after.tasks.find(task => task.id === selected.id)).toMatchObject({ duration: '45 min', deadline: monday, done: false })
  expect(after.tasks.find(task => task.id === unselected.id)).toEqual(unselected)
  await page.reload()
  await nav(page, 'Tasks')
  await expect(page.getByRole('region', { name: 'Tasks in plan' })).toContainText(selected.title)
  await expect(page.getByRole('region', { name: 'Unscheduled tasks' })).toContainText(unselected.title)
})

test('clear selection is transient and explicit Mark done stays separate from Today completion', async ({ page }) => {
  const state = sampleState()
  await seed(page, state)
  await page.getByRole('button', { name: `Select ${selected.title} for planning`, exact: true }).click()
  await page.getByRole('button', { name: 'Clear selection', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Add to plan', exact: true })).toBeDisabled()
  expect((await saved(page)).tasks).toEqual(state.tasks)
  await page.getByRole('button', { name: `Mark ${selected.title} done`, exact: true }).click()
  await expect.poll(async () => (await saved(page)).tasks.find(task => task.id === selected.id)?.done).toBe(true)
  await expect(page.getByRole('button', { name: `Select ${selected.title} for planning`, exact: true })).toBeDisabled()
  expect((await saved(page)).acceptedPlan).toEqual(state.acceptedPlan)
  await page.getByRole('button', { name: `Mark ${selected.title} incomplete`, exact: true }).click()
  await page.getByRole('button', { name: `Select ${selected.title} for planning`, exact: true }).click()
  await page.reload()
  await nav(page, 'Tasks')
  await expect(page.getByRole('status')).toHaveText('0 selected')
  expect((await saved(page)).tasks.find(task => task.id === selected.id)?.done).toBe(false)
  await nav(page, 'Today')
  await page.locator('.today-plan-block').filter({ hasText: existing.title }).locator('xpath=following-sibling::button[1]').click()
  await expect(page.locator('.complete-block-screen')).toContainText(existing.title)
  await page.getByRole('radio', { name: /^Done Finished as planned/ }).click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect.poll(async () => (await saved(page)).acceptedPlan?.blocks.find(block => block.taskId === existing.id)?.status).toBe('done')
})

test('a selected batch with no fit leaves every task and the accepted plan unchanged', async ({ page }) => {
  const huge: TaskItem = { id: 'too-long', title: 'Cannot fit this task', kind: 'Flexible', duration: '24 hours', meta: '24 hours', deadline: monday }
  const state = sampleState([huge])
  await seed(page, state)
  await page.getByRole('button', { name: `Select ${selected.title} for planning`, exact: true }).click()
  await page.getByRole('button', { name: `Select ${huge.title} for planning`, exact: true }).click()
  await page.getByRole('button', { name: 'Add to plan', exact: true }).click()
  await expect(page.getByRole('alert').first()).toContainText(/deadline|available|fit/i)
  await expect(page.locator('.tasks-screen')).toBeVisible()
  const after = await saved(page)
  expect(after.acceptedPlan).toEqual(state.acceptedPlan)
  expect(after.draftPlan).toEqual(state.draftPlan)
  expect(after.tasks).toEqual(state.tasks)
  expect(after.history).toEqual([])
})

test('selected fixed work keeps its exact date, time and duration through preview and reload', async ({ page }) => {
  const fixed: TaskItem = { id: 'fixed-selected', title: 'Fixed backlog appointment', kind: 'Fixed', fixedDate: '2026-10-13', startTime: '12:15', duration: '45 min', meta: 'Tue 12:15–13:00', deadline: '2026-10-13' }
  const state = sampleState([fixed])
  await seed(page, state)
  await page.getByRole('button', { name: `Select ${fixed.title} for planning`, exact: true }).click()
  await page.getByRole('button', { name: 'Add to plan', exact: true }).click()
  await expect(page.locator('.plan-diff-card')).toContainText('12:15–13:00')
  expect((await saved(page)).acceptedPlan).toEqual(state.acceptedPlan)
  await page.getByRole('button', { name: /^Apply changes?$/ }).click()
  await expect.poll(async () => (await saved(page)).acceptedPlan?.blocks.find(block => block.taskId === fixed.id)?.start).toBe('12:15')
  await page.reload()
  expect((await saved(page)).acceptedPlan?.blocks.find(block => block.taskId === fixed.id)).toMatchObject({ fixed: true, dateISO: '2026-10-13', start: '12:15', duration: '45 min', status: 'scheduled' })
  expect((await saved(page)).tasks.find(task => task.id === fixed.id)).toMatchObject(fixed)
})
