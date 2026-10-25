import { chooseExactTime, chooseExactDate } from './picker-helpers'
import { expect, test, type Page } from '@playwright/test'
import type { AppState } from '../src/domain/types'

const STORAGE_KEY = 'plan4her:local-state:v1'
const CUSTOM_TASK = 'Audit roadmap'
const FIXED_TITLE = 'Design review with Ada'
const MONDAY = '2026-10-12'

test.use({ timezoneId: 'UTC' })

async function saved(page: Page): Promise<AppState> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), STORAGE_KEY)
}
async function nav(page: Page, name: 'Today' | 'Plan' | 'Tasks' | 'More') {
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name, exact: true }).click()
}
/** Start through the production route and enter all planning inputs through the UI. */
async function firstWeek(page: Page) {
  await page.clock.setFixedTime(new Date(`${MONDAY}T08:00:00Z`))
  await page.goto('/')
  await page.getByRole('button', { name: 'Build my first week', exact: true }).click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('button', { name: 'Continue without cycle context', exact: true }).click()
  await page.getByRole('radio', { name: /Work focus/ }).click()
  await page.getByRole('button', { name: 'Add my own task', exact: true }).click()
  await page.getByRole('textbox', { name: 'Add a task · optional', exact: true }).fill(CUSTOM_TASK)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('textbox', { name: 'Weekdays', exact: true }).fill('09:00–17:00')
  await page.getByRole('textbox', { name: 'Weekends', exact: true }).fill('')
  await page.getByRole('button', { name: 'Customize days', exact: true }).click()
  await page.getByRole('textbox', { name: 'Tuesday', exact: true }).fill('10:00–16:00')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('button', { name: 'Add fixed commitment', exact: true }).click()
  await page.getByRole('textbox', { name: 'Commitment', exact: true }).fill(FIXED_TITLE)
  await page.getByRole('button', { name: 'Date', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: '12', exact: true }).click()
  await page.getByRole('button', { name: 'Save commitment', exact: true }).click()
  await page.getByRole('button', { name: 'Create my week', exact: true }).click()
  await expect(page.locator('.review-plan-screen')).toBeVisible({ timeout: 15_000 })
  await expect.poll(async () => (await saved(page)).draftPlan?.blocks.length).toBeGreaterThan(0)
}
async function acceptWeek(page: Page) {
  await firstWeek(page)
  await page.getByRole('button', { name: 'Accept week', exact: true }).click()
  await expect.poll(async () => Boolean((await saved(page)).acceptedPlan)).toBe(true)
  await page.getByRole('button', { name: 'Start with Today', exact: true }).click()
  await expect(page.locator('.today-screen')).toBeVisible()
}
async function previewEdit(page: Page) {
  await nav(page, 'Plan')
  await page.getByRole('button', { name: 'Actions for Prepare proposal', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: /Edit or move/ }).click()
  await page.getByRole('textbox', { name: 'Task', exact: true }).fill('Proposal revision')
  await chooseExactTime(page, '14:00')
  await page.getByRole('button', { name: 'Preview changes', exact: true }).click()
  // The canonical edit journey can include the adjustment-scope step.
  if (await page.locator('.adjust-scope-screen').isVisible()) {
    await page.getByRole('radio', { name: /Rest of the week/ }).click()
    await page.getByRole('button', { name: 'Preview changes', exact: true }).click()
  }
  await expect(page.locator('.plan-diff-screen')).toBeVisible()
  await expect(page.locator('.plan-diff-screen')).toContainText('Proposal revision')
  await expect(page.locator('.plan-diff-screen')).toContainText('14:00')
}

test.describe('Local-first production journeys', () => {
  test('first use collects real inputs, protects fixed time, accepts and persists the week', async ({ page }) => {
    await firstWeek(page)
    const draft = await saved(page)
    expect(draft.cycleMode).toBeNull()
    expect(draft.cycleBasics).toBeNull()
    expect(draft.analyticsConsent).toBe(false)
    expect(draft.tasks.map(task => task.title)).toEqual(expect.arrayContaining(['Prepare proposal', 'Research notes', CUSTOM_TASK]))
    expect(draft.availability).toMatchObject({ Monday: '09:00–17:00', Tuesday: '10:00–16:00', Saturday: '', Sunday: '' })
    expect(draft.commitments).toEqual([expect.objectContaining({ title: FIXED_TITLE, date: MONDAY, startTime: '11:00', endTime: '11:45' })])
    expect(draft.acceptedPlan).toBeNull()
    expect(draft.draftPlan?.weekStart).toBe(MONDAY)
    const fixed = draft.draftPlan!.blocks.find(block => block.title === FIXED_TITLE)!
    expect(fixed).toMatchObject({ fixed: true, dateISO: MONDAY, time: '11:00–11:45' })
    expect(draft.draftPlan!.blocks.some(block => block.title === CUSTOM_TASK)).toBe(true)
    for (const block of draft.draftPlan!.blocks.filter(block => !block.fixed && block.dateISO === MONDAY)) {
      const end = block.time.split('–')[1]
      expect(end <= '11:00' || block.start >= '11:45').toBe(true)
    }
    await page.getByRole('button', { name: 'Accept week', exact: true }).click()
    await expect.poll(async () => (await saved(page)).onboardingComplete).toBe(true)
    const accepted = (await saved(page)).acceptedPlan
    expect(accepted?.blocks).toEqual(draft.draftPlan!.blocks)
    await page.reload()
    await expect(page.locator('.today-screen')).toBeVisible()
    await expect(page.getByRole('button', { name: /Mon 12/ })).toHaveAttribute('aria-current', 'date')
    expect((await saved(page)).acceptedPlan).toEqual(accepted)
    await nav(page, 'Plan')
    await expect(page.locator('.active-plan-screen')).toContainText(CUSTOM_TASK)
    await expect(page.locator('.active-plan-screen')).toContainText(FIXED_TITLE)
  })

  test('new task details and subsequent edits survive reload without silently changing the accepted plan', async ({ page }) => {
    await acceptWeek(page)
    const accepted = (await saved(page)).acceptedPlan
    await nav(page, 'Tasks')
    await page.getByRole('button', { name: 'Add task', exact: true }).click()
    await page.getByRole('button', { name: /Add with details/ }).click()
    await page.getByRole('textbox', { name: 'Task', exact: true }).fill('Write launch checklist')
    await page.getByRole('button', { name: 'Duration', exact: true }).click()
    await page.getByRole('dialog', { name: 'Task duration' }).getByRole('button', { name: '45 min', exact: true }).click()
    await page.getByRole('button', { name: 'Deadline · optional', exact: true }).click()
    await page.getByRole('dialog', { name: 'Task deadline' }).getByRole('button', { name: '16', exact: true }).click()
    await page.getByRole('button', { name: 'Save as Unscheduled', exact: true }).click()
    await expect.poll(async () => (await saved(page)).tasks.find(task => task.title === 'Write launch checklist')?.duration).toBe('45 min')
    await page.reload()
    await nav(page, 'Tasks')
    await page.getByRole('button', { name: /Write launch checklist/ }).filter({ hasText: 'Write launch checklist' }).click()
    await expect(page.getByRole('button', { name: 'Duration', exact: true })).toContainText('45 min')
    await page.getByRole('textbox', { name: 'Task', exact: true }).fill('Publish launch checklist')
    await page.getByRole('button', { name: 'Duration', exact: true }).click()
    await page.getByRole('dialog', { name: 'Task duration', exact: true }).getByRole('button', { name: '60 min', exact: true }).click()
    await page.getByRole('button', { name: 'Save task', exact: true }).click()
    await expect.poll(async () => (await saved(page)).tasks.find(task => task.title === 'Publish launch checklist')?.duration).toBe('60 min')
    await page.reload()
    const state = await saved(page)
    expect(state.tasks.find(task => task.title === 'Publish launch checklist')).toMatchObject({ kind: 'Flexible', duration: '60 min', deadline: '2026-10-16' })
    expect(state.acceptedPlan).toEqual(accepted)
  })

  test('block edit is a preview until apply, Undo restores it, and restore has its own preview', async ({ page }) => {
    await acceptWeek(page)
    const original = (await saved(page)).acceptedPlan!
    await previewEdit(page)
    expect((await saved(page)).acceptedPlan).toEqual(original)
    await page.getByRole('button', { name: /^Apply changes?$/ }).click()
    await expect.poll(async () => (await saved(page)).acceptedPlan?.blocks.find(block => block.title === 'Proposal revision')?.time).toBe('14:00–15:30')
    await page.getByRole('button', { name: 'Undo', exact: true }).click()
    await expect.poll(async () => (await saved(page)).acceptedPlan?.blocks).toEqual(original.blocks)
    await previewEdit(page)
    await page.getByRole('button', { name: /^Apply changes?$/ }).click()
    await expect.poll(async () => (await saved(page)).history.at(-1)?.kind).toBe('edit')
    const edited = (await saved(page)).acceptedPlan!
    await page.getByRole('button', { name: /^(Review changes|Recent changes)$/ }).click()
    await page.getByRole('button', { name: 'Restore previous plan', exact: true }).click()
    await expect(page.locator('.restore-preview-screen')).toBeVisible()
    expect((await saved(page)).acceptedPlan).toEqual(edited)
    await page.getByRole('button', { name: 'Restore previous plan', exact: true }).click()
    await expect.poll(async () => (await saved(page)).acceptedPlan?.blocks).toEqual(original.blocks)
    expect((await saved(page)).history.at(-1)?.kind).toBe('restore')
    await page.reload()
    expect((await saved(page)).acceptedPlan?.blocks).toEqual(original.blocks)
  })

  test('completing a real block persists its status and the linked task completion', async ({ page }) => {
    await acceptWeek(page)
    const block = (await saved(page)).acceptedPlan!.blocks.find(block => block.title === 'Prepare proposal')!
    await page.locator('.today-plan-block').filter({ hasText: 'Prepare proposal' }).locator('xpath=following-sibling::button[1]').click()
    await expect(page.locator('.complete-block-screen')).toContainText(block.title)
    await page.getByRole('radio', { name: /^Done Finished as planned/ }).click()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect.poll(async () => (await saved(page)).acceptedPlan?.blocks.find(item => item.id === block.id)?.status).toBe('done')
    await expect(page.getByRole('button', { name: 'Completed', exact: true }).first()).toBeDisabled()
    expect((await saved(page)).tasks.find(task => task.id === block.taskId)?.done).toBe(true)
    await page.reload()
    expect((await saved(page)).acceptedPlan?.blocks.find(item => item.id === block.id)?.status).toBe('done')
  })

  test('partial recovery previews only remaining work, protects fixed work and is reversible', async ({ page }) => {
    await acceptWeek(page)
    const original = (await saved(page)).acceptedPlan!
    const block = original.blocks.find(item => item.title === 'Prepare proposal')!
    await page.locator('.today-plan-block').filter({ hasText: 'Prepare proposal' }).locator('xpath=following-sibling::button[1]').click()
    await page.getByRole('radio', { name: /Partially done/ }).click()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page.getByRole('heading', { name: '45 minutes remain', exact: true })).toBeVisible()
    await expect.poll(async () => (await saved(page)).acceptedPlan?.blocks.find(item => item.id === block.id)?.status).toBe('partial')
    const beforeRecovery = (await saved(page)).acceptedPlan!
    await page.getByRole('button', { name: /Split into two/ }).click()
    await page.getByRole('button', { name: 'Preview changes', exact: true }).click()
    await expect(page.locator('.recovery-preview-screen')).toContainText('Prepare proposal')
    expect((await saved(page)).acceptedPlan).toEqual(beforeRecovery)
    await page.getByRole('button', { name: 'Apply change', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Plan updated', exact: true })).toBeVisible()
    await expect.poll(async () => (await saved(page)).history.at(-1)?.kind).toBe('recovery')
    const after = (await saved(page)).acceptedPlan!
    const remaining = after.blocks.filter(item => item.taskId === block.taskId && item.status !== 'done')
    expect(remaining).toHaveLength(2)
    expect(remaining.reduce((total, item) => total + parseInt(item.duration), 0)).toBe(45)
    const completed = after.blocks.filter(item => item.taskId === block.taskId && item.status === 'done')
    expect(completed.reduce((total, item) => total + parseInt(item.duration), 0)).toBe(45)
    expect(completed[0]).toMatchObject({ dateISO: block.dateISO, start: block.start })
    expect(after.blocks.filter(item => item.fixed)).toEqual(original.blocks.filter(item => item.fixed))
    await page.getByRole('button', { name: 'Undo', exact: true }).click()
    await expect.poll(async () => (await saved(page)).acceptedPlan).toEqual(beforeRecovery)
    await page.reload()
    expect((await saved(page)).acceptedPlan).toEqual(beforeRecovery)
  })

  test('privacy clear cancellation preserves data and explicit confirmation removes personal state', async ({ page }) => {
    await acceptWeek(page)
    const original = await saved(page)
    await nav(page, 'More')
    await page.getByRole('button', { name: 'Privacy & data', exact: true }).click()
    await page.getByRole('button', { name: 'Clear data on this device', exact: true }).click()
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    expect(await saved(page)).toEqual(original)
    await page.getByRole('button', { name: 'Clear data on this device', exact: true }).click()
    await page.getByRole('button', { name: 'Clear data now', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Build my first week', exact: true })).toBeVisible()
    await expect.poll(async () => (await saved(page)).tasks).toEqual([])
    const cleared = await saved(page)
    expect(cleared).toMatchObject({ onboardingComplete: false, tasks: [], commitments: [], history: [], acceptedPlan: null, draftPlan: null, cycleBasics: null, cycleMode: null })
    await page.reload()
    await expect(page.getByRole('button', { name: 'Build my first week', exact: true })).toBeVisible()
    expect(JSON.stringify(await saved(page))).not.toContain(CUSTOM_TASK)
  })

  test('rebuilding an accepted week shows the new draft and blocks accepting unscheduled work', async ({ page }) => {
    test.setTimeout(60_000)
    await acceptWeek(page)
    const accepted = (await saved(page)).acceptedPlan!
    await nav(page, 'Tasks')
    // Starter packs are offered from the empty task list. Delete through the
    // confirmation UI; the accepted plan must remain intact while rebuilding.
    for (const task of (await saved(page)).tasks) {
      await page.locator('.p4h-task-card').filter({ hasText: task.title }).locator('.p4h-task-card__content').click()
      await page.getByRole('button', { name: 'Delete task', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Delete this task?', exact: true })).toBeVisible()
      await page.getByRole('button', { name: 'Delete task', exact: true }).click()
    }
    await page.getByRole('button', { name: 'Add starter tasks', exact: true }).click()
    await page.getByRole('radio', { name: /Life admin/ }).click()
    await page.getByRole('textbox', { name: 'Add a task · optional', exact: true }).fill('Rebuilt life list')
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    // Existing per-day availability reopens its custom view; explicitly choose
    // common defaults before replacing every weekday with the test window.
    if (await page.getByRole('button', { name: 'Use weekday defaults', exact: true }).isVisible()) await page.getByRole('button', { name: 'Use weekday defaults', exact: true }).click()
    await page.getByRole('textbox', { name: 'Weekdays', exact: true }).fill('09:00–09:15')
    await page.getByRole('textbox', { name: 'Weekends', exact: true }).fill('')
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await page.getByRole('button', { name: 'Create my week', exact: true }).click()
    await expect(page.locator('.feasibility-screen')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('.feasibility-screen')).toContainText('Rebuilt life list')
    expect((await saved(page)).draftPlan!.unscheduled.length).toBeGreaterThan(0)
    expect((await saved(page)).acceptedPlan).toEqual(accepted)
    // Even reaching Review via Back cannot bypass the feasibility gate.
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await expect(page.locator('.review-plan-screen')).toBeVisible()
    await page.getByRole('button', { name: 'Accept week', exact: true }).click()
    await expect(page.locator('.feasibility-screen')).toBeVisible()
    expect((await saved(page)).acceptedPlan).toEqual(accepted)
    await page.getByRole('button', { name: 'Edit availability instead', exact: true }).click()
    await page.getByRole('textbox', { name: 'Weekdays', exact: true }).fill('09:00–17:00')
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await page.getByRole('button', { name: 'Create my week', exact: true }).click()
    await expect(page.locator('.review-plan-screen')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('.review-plan-screen')).toContainText('Rebuilt life list')
    await expect(page.locator('.review-plan-screen')).toContainText('Call dentist')
    await expect(page.locator('.review-plan-screen')).not.toContainText('Prepare proposal')
    const rebuilt = (await saved(page)).draftPlan!
    expect(rebuilt.unscheduled).toEqual([])
    expect((await saved(page)).acceptedPlan).toEqual(accepted)
    await page.getByRole('button', { name: 'Accept week', exact: true }).click()
    await expect.poll(async () => (await saved(page)).acceptedPlan?.blocks).toEqual(rebuilt.blocks)
    await page.reload()
    expect((await saved(page)).acceptedPlan?.blocks).toEqual(rebuilt.blocks)
  })

  test('changing adjustment scope after preview recomputes it and protects future-day blocks', async ({ page }) => {
    await acceptWeek(page)
    await nav(page, 'Plan')
    await page.getByRole('button', { name: 'Actions for Prepare proposal', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: /Edit or move/ }).click()
    await chooseExactDate(page, '2026-10-13')
    await chooseExactTime(page, '14:00')
    await page.getByRole('button', { name: 'Preview changes', exact: true }).click()
    await page.getByRole('radio', { name: /Rest of the week/ }).click()
    await page.getByRole('button', { name: 'Preview changes', exact: true }).click()
    await page.getByRole('button', { name: /^Apply changes?$/ }).click()
    await expect.poll(async () => (await saved(page)).acceptedPlan?.blocks.find(block => block.title === 'Prepare proposal')?.dateISO).toBe('2026-10-13')
    const before = (await saved(page)).acceptedPlan!
    await page.getByRole('button', { name: 'Adjust plan', exact: true }).click()
    await page.getByRole('radio', { name: /Rest of the week/ }).click()
    await page.getByRole('button', { name: 'Preview changes', exact: true }).click()
    await expect(page.locator('.plan-diff-card').filter({ hasText: 'Prepare proposal' })).toBeVisible()
    expect((await saved(page)).acceptedPlan).toEqual(before)
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await page.getByRole('radio', { name: /Rest of today/ }).click()
    await page.getByRole('button', { name: 'Preview changes', exact: true }).click()
    await expect(page.locator('.plan-diff-screen')).toBeVisible()
    await expect(page.locator('.plan-diff-card').filter({ hasText: 'Prepare proposal' })).toHaveCount(0)
    expect((await saved(page)).acceptedPlan).toEqual(before)
    await page.getByRole('button', { name: 'Apply change', exact: true }).click()
    await expect.poll(async () => (await saved(page)).history.at(-1)?.kind).toBe('adjust')
    const future = before.blocks.find(block => block.title === 'Prepare proposal')!
    expect((await saved(page)).acceptedPlan?.blocks.find(block => block.id === future.id)).toEqual(future)
  })

  test('an impossible block date shows a recoverable error without crashing or changing the accepted plan', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', error => pageErrors.push(error.message))
    await acceptWeek(page)
    const accepted = (await saved(page)).acceptedPlan!
    await nav(page, 'Plan')
    await page.getByRole('button', { name: 'Actions for Prepare proposal', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: /Edit or move/ }).click()
    await page.getByRole('button', { name: 'Date', exact: true }).click()
    const dateDialog = page.getByRole('dialog', { name: 'Edit block date', exact: true })
    await dateDialog.getByRole('textbox', { name: 'Date (YYYY-MM-DD)', exact: true }).fill('2026-13-40')
    await expect(dateDialog.getByRole('button', { name: 'Use date', exact: true })).toBeDisabled()
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.getByRole('alert')).not.toHaveText(/^\s*Dismiss\s*$/)
    await expect(page.locator('.edit-plan-block-screen')).toBeVisible()
    expect((await saved(page)).acceptedPlan).toEqual(accepted)
    expect(pageErrors).toEqual([])
    await dateDialog.getByRole('button', { name: 'Close date picker', exact: true }).click()
    await chooseExactDate(page, MONDAY)
    await chooseExactTime(page, '14:00')
    await page.getByRole('button', { name: 'Preview changes', exact: true }).click()
    await expect(page.locator('.adjust-scope-screen')).toBeVisible()
    expect((await saved(page)).acceptedPlan).toEqual(accepted)
    expect(pageErrors).toEqual([])
  })

})
