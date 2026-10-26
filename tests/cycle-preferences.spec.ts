import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createInitialState, STORAGE_KEY, validateState } from '../src/domain/persistence'
import { createDefaultCyclePreferences } from '../src/domain/cyclePreferences'
import { makeBlock, weekDays } from '../src/domain/planner'
import type { AppState } from '../src/domain/types'

test.use({ timezoneId: 'UTC' })

async function seed(page: Page) {
  const state = createInitialState()
  state.cycleMode = 'natural'
  state.cycleBasics = { lastPeriodStart: '2026-10-01', cycleLength: 28 }
  state.tasks = [{ id: 'existing-task', title: 'Existing task', kind: 'Flexible', duration: '30 min', meta: '30 min' }]
  state.acceptedPlan = {
    id: 'cycle-preferences-week', weekStart: '2026-10-12', week: weekDays('2026-10-12'),
    blocks: [makeBlock('existing-block', 'Existing task', '2026-10-12', 540, 30, { taskId: 'existing-task' })],
    unscheduled: [], warnings: [], scheduledLoad: 1,
  }
  state.draftPlan = state.acceptedPlan
  state.onboardingComplete = true
  expect(validateState(state)).toBe(true)
  await page.clock.setFixedTime(new Date('2026-10-12T08:00:00Z'))
  await page.addInitScript(({ key, state }) => {
    if (!sessionStorage.getItem('cycle-preferences-seeded')) {
      localStorage.setItem(key, JSON.stringify(state))
      sessionStorage.setItem('cycle-preferences-seeded', 'yes')
    }
  }, { key: STORAGE_KEY, state })
  await page.goto('/')
  return state
}

async function saved(page: Page): Promise<AppState> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY)
}

async function nav(page: Page, name: 'More' | 'Tasks') {
  await page.getByRole('navigation', { name: 'Primary', exact: true }).getByRole('button', { name, exact: true }).click()
}

async function openPreferences(page: Page) {
  await nav(page, 'More')
  await page.getByRole('button', { name: 'Planning preferences', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Cycle preferences', exact: true })).toBeVisible()
}

test('preferences save locally, cancel discards edits, and the accepted plan stays unchanged', async ({ page }) => {
  const initial = await seed(page)
  const original = await saved(page)
  await openPreferences(page)
  const follicular = page.getByRole('group', { name: 'Follicular Estimated', exact: true })
  await expect(follicular.getByRole('checkbox', { name: 'Creation / start', exact: true })).toBeChecked()
  await follicular.getByRole('checkbox', { name: 'Communication', exact: true }).check()
  await page.getByRole('radio', { name: /^Recovery / }).check()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  expect(await saved(page)).toEqual(original)

  await openPreferences(page)
  await expect(page.getByRole('radio', { name: /^Balanced / })).toBeChecked()
  await expect(follicular.getByRole('checkbox', { name: 'Communication', exact: true })).not.toBeChecked()
  await follicular.getByRole('checkbox', { name: 'Communication', exact: true }).check()
  await page.getByRole('radio', { name: /^Recovery / }).check()
  await page.getByRole('button', { name: 'Save preferences', exact: true }).click()
  await expect.poll(async () => (await saved(page)).cyclePreferences?.template).toBe('recovery')
  expect((await saved(page)).cyclePreferences?.phaseWork.Follicular).toEqual(['creation-start', 'energizing-movement', 'communication'])
  expect((await saved(page)).acceptedPlan).toEqual(initial.acceptedPlan)

  await page.reload()
  await openPreferences(page)
  await expect(page.getByRole('radio', { name: /^Recovery / })).toBeChecked()
  await expect(follicular.getByRole('checkbox', { name: 'Communication', exact: true })).toBeChecked()
  expect((await saved(page)).acceptedPlan).toEqual(initial.acceptedPlan)
})

test('edited phase choices persist and reset changes only the draft mapping', async ({ page }) => {
  await seed(page)
  await openPreferences(page)
  const menstrual = page.getByRole('group', { name: 'Menstrual Estimated', exact: true })
  await menstrual.getByRole('checkbox', { name: 'Review / planning', exact: true }).uncheck()
  await page.getByRole('radio', { name: /^High-output / }).check()
  await page.getByRole('button', { name: 'Save preferences', exact: true }).click()
  await expect.poll(async () => (await saved(page)).cyclePreferences?.phaseWork.Menstrual).toEqual(['restorative'])
  await page.reload()
  await openPreferences(page)
  await expect(menstrual.getByRole('checkbox', { name: 'Review / planning', exact: true })).not.toBeChecked()
  await page.getByRole('button', { name: 'Reset phase mapping', exact: true }).click()
  await expect(menstrual.getByRole('checkbox', { name: 'Review / planning', exact: true })).toBeChecked()
  await expect(page.getByRole('radio', { name: /^High-output / })).toBeChecked()
  expect((await saved(page)).cyclePreferences?.phaseWork.Menstrual).toEqual(['restorative'])
  await page.getByRole('button', { name: 'Save preferences', exact: true }).click()
  await expect.poll(async () => (await saved(page)).cyclePreferences?.phaseWork).toEqual(createDefaultCyclePreferences().phaseWork)
})

test('activity type is inferred automatically; an optional correction in task details survives edit and reload', async ({ page }) => {
  const initial = await seed(page)
  const field = () => page.getByRole('combobox', { name: 'Activity type · optional', exact: true })
  await nav(page, 'Tasks')
  await page.getByRole('button', { name: 'Add task', exact: true }).click()
  await page.getByRole('button', { name: /Add with details/ }).click()
  await expect(field()).toHaveCount(0) // no category to choose when creating a task
  await page.getByRole('textbox', { name: 'Task', exact: true }).fill('Draft launch story')
  await page.getByRole('button', { name: 'Save as Unscheduled', exact: true }).click()
  await expect.poll(async () => (await saved(page)).tasks.find(task => task.title === 'Draft launch story')?.title).toBe('Draft launch story')
  expect((await saved(page)).tasks.find(task => task.title === 'Draft launch story')?.workType).toBeUndefined()
  await page.reload()
  await nav(page, 'Tasks')
  await page.locator('.p4h-task-card').filter({ hasText: 'Draft launch story' }).locator('.p4h-task-card__content').click()
  await page.getByText('Activity type', { exact: true }).click()
  await expect(field()).toHaveValue('auto')
  await expect(field().locator('option[value=auto]')).toHaveText('Automatic (Creation / start)')
  await field().selectOption('communication')
  await page.getByRole('button', { name: 'Fixed', exact: true }).click()
  await expect(field()).toHaveValue('communication')
  await expect(page.getByText('Fixed time stays in place.', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Flexible', exact: true }).click()
  await page.getByRole('button', { name: 'Save task', exact: true }).click()
  await expect.poll(async () => (await saved(page)).tasks.find(task => task.title === 'Draft launch story')?.workType).toBe('communication')
  await page.reload()
  await nav(page, 'Tasks')
  await page.locator('.p4h-task-card').filter({ hasText: 'Draft launch story' }).locator('.p4h-task-card__content').click()
  await expect(field()).toHaveValue('communication') // a stored correction opens expanded
  await field().selectOption('auto')
  await page.getByRole('button', { name: 'Save task', exact: true }).click()
  await expect.poll(async () => (await saved(page)).tasks.find(task => task.title === 'Draft launch story')?.workType ?? 'auto').toBe('auto')
  expect((await saved(page)).acceptedPlan).toEqual(initial.acceptedPlan)
})

for (const width of [320, 390]) {
  test(`${width}px: preferences have readable, reachable controls and no accessibility violations`, async ({ page }) => {
    await page.setViewportSize({ width, height: 568 })
    await seed(page)
    await openPreferences(page)
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    expect(result.violations.map(violation => ({ id: violation.id, nodes: violation.nodes.map(node => node.target) }))).toEqual([])
    await page.locator('.cycle-preferences-screen__content, .cycle-preferences-screen__content *').evaluateAll(elements => {
      const styles = elements.map(element => ({ element: element as HTMLElement, font: parseFloat(getComputedStyle(element).fontSize), line: parseFloat(getComputedStyle(element).lineHeight) }))
      for (const { element, font, line } of styles) {
        element.style.fontSize = `${font * 2}px`
        if (Number.isFinite(line)) element.style.lineHeight = `${line * 2}px`
      }
    })
    expect(await page.locator('.cycle-preferences-screen__content').evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
    for (const control of await page.locator('.cycle-preferences-screen label, .cycle-preferences-screen button').all()) {
      await control.scrollIntoViewIfNeeded()
      await expect(control).toBeInViewport({ ratio: 1 })
      const box = (await control.boundingBox())!
      expect(box.width).toBeGreaterThanOrEqual(44)
      expect(box.height).toBeGreaterThanOrEqual(44)
    }
    await page.getByRole('button', { name: 'Save preferences', exact: true }).click()
    await expect(page.locator('.cycle-preferences-screen')).toHaveCount(0)
  })
}

test('canonical task fixtures keep work-type controls hidden', async ({ page }) => {
  for (const route of ['add-task', 'task-details-dentist']) {
    await page.goto(`/?qa=${route}`)
    await expect(page.getByRole('combobox', { name: 'Activity type · optional', exact: true })).toHaveCount(0)
  }
})
