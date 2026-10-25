import { expect, test, type Page } from '@playwright/test'
import { createInitialState, STORAGE_KEY } from '../src/domain/persistence'
import { generateWeeklyPlan } from '../src/domain/planner'
import { createDefaultCyclePreferences } from '../src/domain/cyclePreferences'

const monday = '2026-10-12'
async function seed(page: Page, mode: string | null) {
  await page.clock.setFixedTime(new Date(`${monday}T08:00:00Z`))
  const state = createInitialState()
  state.cycleMode = mode
  state.cycleBasics = { lastPeriodStart: '2026-10-01', cycleLength: 28 }
  state.cyclePreferences = createDefaultCyclePreferences()
  const anchor = { id: 'anchor', title: 'Existing work', kind: 'Flexible' as const, duration: '30 min', meta: '30 min' }
  state.tasks = [anchor, { id: 'present', title: 'Present the project', kind: 'Flexible', duration: '60 min', meta: '60 min', workType: 'communication' }]
  state.acceptedPlan = generateWeeklyPlan({ ...state, tasks: [anchor], weekStart: monday })
  state.draftPlan = state.acceptedPlan
  state.onboardingComplete = true
  await page.addInitScript(({ state, key }) => {
    if (!sessionStorage.getItem('cycle-integration')) {
      localStorage.setItem(key, JSON.stringify(state)); sessionStorage.setItem('cycle-integration', 'yes')
    }
  }, { state, key: STORAGE_KEY })
  await page.goto('/')
  return state
}

for (const mode of ['natural', null, 'predictable'] as const) {
  test(`selected work uses truthful phase preference only for natural context: ${mode ?? 'off'}`, async ({ page }) => {
    const original = await seed(page, mode)
    await page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: 'Tasks', exact: true }).click()
    await page.getByRole('button', { name: 'Select Present the project for planning', exact: true }).click()
    await page.getByRole('button', { name: 'Add to plan', exact: true }).click()
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).acceptedPlan, STORAGE_KEY)).toEqual(original.acceptedPlan)
    await page.getByRole('button', { name: 'Apply changes', exact: true }).click()
    const actual = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).acceptedPlan, STORAGE_KEY)
    const added = actual.blocks.find((block: { taskId?: string }) => block.taskId === 'present')
    expect(added.dateISO).toBe(mode === 'natural' ? '2026-10-14' : monday)
    expect(added.duration).toBe('60 min')
    expect(actual.blocks.find((block: { taskId?: string }) => block.taskId === 'anchor')).toEqual(original.acceptedPlan!.blocks[0])
    await page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: 'Plan', exact: true }).click()
    await page.locator('.plan-block-card').filter({ hasText: 'Present the project' }).getByRole('button').first().click()
    const rationale = page.locator('.plan-rationale-screen')
    if (mode === 'natural') {
      await expect(rationale).toContainText('Cycle preference')
      await expect(rationale).toContainText('estimated ovulatory phase')
      await expect(rationale).toContainText('not an energy prediction')
    } else {
      await expect(rationale).not.toContainText('Cycle preference')
    }
    await page.reload()
    const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY)
    expect(saved.tasks.find((task: { id: string }) => task.id === 'present').workType).toBe('communication')
    expect(saved.acceptedPlan.blocks.find((block: { taskId?: string }) => block.taskId === 'present').dateISO).toBe(added.dateISO)
  })
}
