import { expect, test, type Page } from '@playwright/test'
import {
  acceptPlan, applyProposal, createInitialState, durationMinutes, generateWeeklyPlan,
  makeBlock, proposeAdjustment, proposeEdit, proposeRecovery, recalculate,
  STORAGE_KEY, undoLastChange, updateBlockStatus, validatePlan, validateState,
  type AppState, type TaskItem,
} from '../src/domain'

const monday = '2026-10-12'
const tuesday = '2026-10-13'
const alpha = 'Prepare a real weekly brief'
const beta = 'Review Tuesday evidence'

function liveState(): AppState {
  const state = createInitialState()
  state.tasks = [
    { id: 'alpha', title: alpha, kind: 'Flexible', duration: '60 min', meta: '60 min' },
    { id: 'beta', title: beta, kind: 'Flexible', duration: '45 min', meta: '45 min' },
    { id: 'gamma', title: 'Protected team meeting', kind: 'Fixed', duration: '30 min', meta: '30 min', fixedDate: monday, startTime: '11:00' },
  ]
  const plan = generateWeeklyPlan({ ...state, weekStart: monday })
  plan.blocks = plan.blocks.map(block => block.taskId === 'beta'
    ? makeBlock(block.id, block.title, tuesday, 10 * 60, 45, { taskId: block.taskId }) : block)
  state.acceptedPlan = recalculate(plan)
  state.draftPlan = structuredClone(state.acceptedPlan)
  state.onboardingComplete = true
  return state
}

async function seed(page: Page, state = liveState()) {
  await page.clock.setFixedTime(new Date(`${monday}T08:00:00Z`))
  await page.addInitScript(({ key, state }) => {
    if (!sessionStorage.getItem('navigation-state-seeded')) {
      localStorage.setItem(key, JSON.stringify(state))
      sessionStorage.setItem('navigation-state-seeded', 'yes')
    }
  }, { key: STORAGE_KEY, state })
  await page.goto('/')
  return state
}

async function nav(page: Page, name: string) {
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name, exact: true }).click()
}

async function saved(page: Page): Promise<AppState> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY)
}

async function failStorageWrites(page: Page) {
  await page.evaluate(() => {
    const original = Storage.prototype.setItem
    Reflect.set(window, 'restoreNavigationAuditWrites', () => { Storage.prototype.setItem = original })
    Storage.prototype.setItem = function (key, value) {
      if (key === 'plan4her:local-state:v1') throw new DOMException('Full', 'QuotaExceededError')
      original.call(this, key, value)
    }
  })
}

async function restoreStorageWrites(page: Page) {
  await page.evaluate(() => Reflect.get(window, 'restoreNavigationAuditWrites')())
}

test('rationale actions close, explain and edit the same live block without changing the plan', async ({ page }) => {
  const state = await seed(page)
  await nav(page, 'Plan')
  await page.getByRole('button', { name: `${alpha}, 09:00–10:00`, exact: true }).click()
  const actions = page.getByRole('button', { name: `Actions for ${alpha}`, exact: true })
  await actions.click()
  await expect(page.getByRole('dialog', { name: `${alpha} actions`, exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(actions).toBeFocused()
  await actions.click()
  await page.getByRole('dialog').getByRole('button', { name: /Why this time/ }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.plan-rationale-screen')).toContainText(alpha)
  await actions.click()
  await page.getByRole('dialog').getByRole('button', { name: /Edit or move/ }).click()
  await expect(page.locator('.edit-plan-block-screen')).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Task', exact: true })).toHaveValue(alpha)
  expect((await saved(page)).acceptedPlan).toEqual(state.acceptedPlan)
  expect((await saved(page)).history).toEqual([])
})

for (const caller of ['Today', 'Plan']) {
  for (const exit of ['Back', 'Cancel']) {
    test(`Add task ${exit} returns to its ${caller} caller without saving`, async ({ page }) => {
      const state = await seed(page)
      if (caller === 'Plan') await nav(page, 'Plan')
      await page.getByRole('button', { name: 'Add task', exact: true }).click()
      if (caller === 'Today') await page.getByRole('dialog').getByRole('button', { name: /Add with details/ }).click()
      await expect(page.locator('.add-task-screen')).toBeVisible()
      await page.getByRole('textbox', { name: 'Task', exact: true }).fill('Discard this new task')
      await page.getByRole('button', { name: exit, exact: true }).click()
      await expect(page.locator(caller === 'Today' ? '.today-screen' : '.active-plan-screen')).toBeVisible()
      await expect(page.getByRole('dialog')).toHaveCount(0)
      expect((await saved(page)).tasks).toEqual(state.tasks)
      expect((await saved(page)).acceptedPlan).toEqual(state.acceptedPlan)
    })
  }
}

test('Edit block Back returns to the direct menu caller, and rationale when opened from rationale', async ({ page }) => {
  const state = await seed(page)
  await nav(page, 'Plan')
  await page.getByRole('button', { name: `Actions for ${alpha}`, exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: /Edit or move/ }).click()
  await page.getByRole('textbox', { name: 'Task', exact: true }).fill('Do not apply this title')
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.locator('.active-plan-screen')).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: `${alpha}, 09:00–10:00`, exact: true }).click()
  await page.getByRole('button', { name: 'Adjust this block', exact: true }).click()
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.locator('.plan-rationale-screen')).toContainText(alpha)
  expect((await saved(page)).acceptedPlan).toEqual(state.acceptedPlan)
})

test('returning from a live Tuesday rationale retains the selected day', async ({ page }) => {
  const state = await seed(page)
  await page.getByRole('navigation', { name: 'Week', exact: true }).getByRole('button', { name: 'Tue 13', exact: true }).click()
  await page.getByRole('button', { name: `Actions for ${beta}`, exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: /Why this time/ }).click()
  await expect(page.locator('.plan-rationale-screen')).toContainText(beta)
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.getByRole('navigation', { name: 'Week', exact: true }).getByRole('button', { name: 'Tue 13', exact: true })).toHaveAttribute('aria-current', 'date')
  await expect(page.locator('.today-plan-block')).toContainText(beta)
  await expect(page.locator('.today-plan-block')).not.toContainText(alpha)
  expect((await saved(page)).acceptedPlan).toEqual(state.acceptedPlan)
})

test('browser Back from More privacy returns to the More caller', async ({ page }) => {
  await seed(page)
  await nav(page, 'More')
  await page.getByRole('button', { name: 'Privacy & data', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Clear data on this device', exact: true })).toBeVisible()
  await page.goBack()
  await expect(page.locator('.more-screen')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Preferences & support', exact: true })).toBeVisible()
})

test('browser Back from an infeasible adjustment shows the accepted week, never its rejected draft', async ({ page }) => {
  const state = liveState()
  state.tasks.push({ id: 'oversized', title: 'A backlog task that cannot fit', kind: 'Flexible', duration: '1440 min', meta: '1440 min', deadline: monday })
  await seed(page, state)
  await nav(page, 'Plan')
  await page.getByRole('button', { name: 'Adjust plan', exact: true }).click()
  await page.getByRole('radio', { name: /Rest of the week/ }).click()
  await page.getByRole('button', { name: 'Preview changes', exact: true }).click()
  await expect(page.locator('.feasibility-screen')).toContainText('A backlog task that cannot fit')
  expect((await saved(page)).acceptedPlan).toEqual(state.acceptedPlan)
  expect((await saved(page)).draftPlan).not.toEqual(state.acceptedPlan)
  await page.goBack()
  await expect(page.locator('.adjust-scope-screen')).toBeVisible()
  await page.goBack()
  await expect(page.locator('.active-plan-screen')).toBeVisible()
  await expect(page.locator(`#active-day-${tuesday}`)).toContainText(beta)
  await expect(page.locator(`#active-day-${monday}`)).not.toContainText(beta)
  await page.getByRole('button', { name: 'Recent changes', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Restore previous plan', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Back to plan', exact: true }).click()
  await expect(page.locator(`#active-day-${tuesday}`)).toContainText(beta)
  expect((await saved(page)).history).toEqual([])
})

test('recovered work actions refer to the changed block when another block comes first', async ({ page }) => {
  const state = liveState()
  state.acceptedPlan!.blocks = state.acceptedPlan!.blocks.map(block => block.taskId === 'beta'
    ? makeBlock(block.id, block.title, monday, 10 * 60, 45, { taskId: block.taskId }) : block)
  state.acceptedPlan = recalculate(state.acceptedPlan!)
  state.draftPlan = structuredClone(state.acceptedPlan)
  await seed(page, state)
  await page.locator('.today-plan-block').filter({ hasText: beta }).locator('xpath=following-sibling::button[1]').click()
  await page.getByRole('radio', { name: /^Missed / }).click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('button', { name: 'Choose what happens next', exact: true }).click()
  await page.getByRole('button', { name: /^Move later/ }).click()
  await page.getByRole('button', { name: 'Preview changes', exact: true }).click()
  await page.getByRole('button', { name: 'Apply change', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Plan updated', exact: true })).toBeVisible()
  await page.getByRole('button', { name: `Actions for ${beta}`, exact: true }).click()
  await expect(page.getByRole('dialog', { name: `${beta} actions`, exact: true })).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: /Edit or move/ }).click()
  await expect(page.getByRole('textbox', { name: 'Task', exact: true })).toHaveValue(beta)
  expect((await saved(page)).acceptedPlan!.blocks.find(block => block.taskId === 'alpha')).toEqual(state.acceptedPlan!.blocks.find(block => block.taskId === 'alpha'))
})

test('recovery actions select the moved split part rather than an earlier sibling of the same task', async ({ page }) => {
  const state = liveState()
  state.acceptedPlan!.blocks = state.acceptedPlan!.blocks.flatMap(block => block.taskId === 'beta' ? [
    makeBlock('task-beta-part-1', beta, monday, 10 * 60, 20, { taskId: 'beta' }),
    makeBlock('task-beta-part-2', beta, monday, 10 * 60 + 20, 25, { taskId: 'beta' }),
  ] : [block])
  state.acceptedPlan = recalculate(state.acceptedPlan!)
  state.draftPlan = structuredClone(state.acceptedPlan)
  await seed(page, state)
  await page.locator('.today-plan-block').filter({ hasText: beta }).nth(1).locator('xpath=following-sibling::button[1]').click()
  await page.getByRole('radio', { name: /^Missed / }).click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('button', { name: 'Choose what happens next', exact: true }).click()
  await page.getByRole('button', { name: /^Move later/ }).click()
  await page.getByRole('button', { name: 'Preview changes', exact: true }).click()
  await page.getByRole('button', { name: 'Apply change', exact: true }).click()
  const after = await saved(page)
  const moved = after.acceptedPlan!.blocks.find(block => block.id === 'task-beta-part-2')!
  expect(moved.start).toBe('11:30')
  expect(after.acceptedPlan!.blocks.find(block => block.id === 'task-beta-part-1')).toEqual(state.acceptedPlan!.blocks.find(block => block.id === 'task-beta-part-1'))
  await page.getByRole('button', { name: `Actions for ${beta}`, exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: /Edit or move/ }).click()
  await expect(page.getByRole('button', { name: 'Start time', exact: true })).toContainText(moved.start)
  await expect(page.getByRole('button', { name: 'Duration', exact: true })).toContainText('25 min')
})

test('leaving the final loading animation cancels its delayed completion', async ({ page }) => {
  const state = createInitialState()
  state.tasks = [{ id: 'oversized', title: 'Needs more than one window', kind: 'Flexible', duration: '1440 min', meta: '1440 min' }]
  state.draftPlan = generateWeeklyPlan({ ...state, weekStart: monday })
  await page.clock.install({ time: new Date(`${monday}T08:00:00Z`) })
  await seed(page, state)
  await page.getByRole('button', { name: 'Rebuild plan', exact: true }).click()
  await page.clock.runFor(1200)
  await expect(page.locator('.loading-plan-screen--leaving')).toBeVisible()
  await page.goBack()
  await expect(page.locator('.feasibility-screen')).toBeVisible()
  await page.getByRole('button', { name: 'Edit tasks', exact: true }).click()
  await expect(page.locator('.tasks-screen')).toBeVisible()
  await page.clock.runFor(150)
  await expect(page.locator('.tasks-screen')).toBeVisible()
  await expect(page.locator('.feasibility-screen')).toHaveCount(0)
})

test('adjustment range supports arrow, Home and End selection without mutating the plan', async ({ page }) => {
  const state = await seed(page)
  await nav(page, 'Plan')
  await page.getByRole('button', { name: 'Adjust plan', exact: true }).click()
  const today = page.getByRole('radio', { name: /Rest of today/ })
  const week = page.getByRole('radio', { name: /Rest of the week/ })
  await expect(page.getByRole('button', { name: 'Preview changes', exact: true })).toBeDisabled()
  await today.focus()
  await today.press('ArrowDown')
  await expect(week).toBeChecked()
  await expect(week).toBeFocused()
  await expect(today).toHaveAttribute('tabindex', '-1')
  await week.press('Home')
  await expect(today).toBeChecked()
  await expect(today).toBeFocused()
  await today.press('End')
  await expect(week).toBeChecked()
  expect((await saved(page)).acceptedPlan).toEqual(state.acceptedPlan)
})

test('a failed new task save keeps the form and retries once without duplicate work', async ({ page }) => {
  const state = await seed(page)
  await nav(page, 'Plan')
  await page.getByRole('button', { name: 'Add task', exact: true }).click()
  const title = 'A task saved only after storage recovers'
  await page.getByRole('textbox', { name: 'Task', exact: true }).fill(title)
  await failStorageWrites(page)
  await page.getByRole('button', { name: 'Save as Unscheduled', exact: true }).click()
  await expect(page.getByRole('alert').first()).toContainText(/could not be saved/i)
  await expect(page.locator('.add-task-screen')).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Task', exact: true })).toHaveValue(title)
  expect((await saved(page)).tasks).toEqual(state.tasks)
  await restoreStorageWrites(page)
  await page.getByRole('button', { name: 'Save as Unscheduled', exact: true }).click()
  await expect(page.locator('.tasks-screen')).toBeVisible()
  expect((await saved(page)).tasks.filter(task => task.title === title)).toHaveLength(1)
  expect((await saved(page)).acceptedPlan).toEqual(state.acceptedPlan)
  await page.reload()
  expect((await saved(page)).tasks.filter(task => task.title === title)).toHaveLength(1)
})

test('a failed task edit retains its title for retry and leaves the accepted plan unchanged', async ({ page }) => {
  const state = await seed(page)
  await nav(page, 'Tasks')
  await page.getByRole('region', { name: 'Tasks in plan', exact: true }).locator('.p4h-task-card__content').filter({ hasText: alpha }).click()
  const title = 'Edited task after storage recovery'
  await page.getByRole('textbox', { name: 'Task', exact: true }).fill(title)
  await failStorageWrites(page)
  await page.getByRole('button', { name: 'Save task', exact: true }).click()
  await expect(page.getByRole('alert').first()).toContainText(/could not be saved/i)
  await expect(page.locator('.task-details-screen')).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Task', exact: true })).toHaveValue(title)
  expect((await saved(page)).tasks).toEqual(state.tasks)
  await restoreStorageWrites(page)
  await page.getByRole('button', { name: 'Save task', exact: true }).click()
  await expect(page.locator('.tasks-screen')).toBeVisible()
  expect((await saved(page)).tasks.find(task => task.id === 'alpha')?.title).toBe(title)
  expect((await saved(page)).acceptedPlan).toEqual(state.acceptedPlan)
})

test('a failed cycle save preserves settings for retry before returning to More', async ({ page }) => {
  const state = liveState()
  state.cycleMode = 'natural'
  state.cycleBasics = { lastPeriodStart: '2026-10-05', cycleLength: 28 }
  await seed(page, state)
  await nav(page, 'More')
  await page.getByRole('button', { name: 'Cycle context', exact: true }).click()
  const length = page.getByRole('textbox', { name: 'Typical cycle length · optional', exact: true })
  await length.fill('31')
  await failStorageWrites(page)
  await page.getByRole('button', { name: 'Save cycle context', exact: true }).click()
  await expect(page.getByRole('alert').first()).toContainText(/could not be saved/i)
  await expect(page.locator('.cycle-context-screen')).toBeVisible()
  await expect(length).toHaveValue('31')
  expect((await saved(page)).cycleBasics).toEqual(state.cycleBasics)
  await restoreStorageWrites(page)
  await page.getByRole('button', { name: 'Save cycle context', exact: true }).click()
  await expect(page.locator('.more-screen')).toBeVisible()
  expect((await saved(page)).cycleBasics?.cycleLength).toBe(31)
  await page.reload()
  expect((await saved(page)).cycleBasics?.cycleLength).toBe(31)
})

test('an offline interruption preserves the unsaved form and returns focus to its input', async ({ page }) => {
  const state = await seed(page)
  await nav(page, 'Plan')
  await page.getByRole('button', { name: 'Add task', exact: true }).click()
  const title = page.getByRole('textbox', { name: 'Task', exact: true })
  await title.fill('Keep this offline draft')
  await title.focus()
  await page.evaluate(() => window.dispatchEvent(new Event('offline')))
  await expect(page.getByRole('heading', { name: 'You’re offline', exact: true })).toBeVisible()
  await expect(page.locator('.add-task-screen')).toBeHidden()
  await page.getByRole('button', { name: 'Continue offline', exact: true }).click()
  await expect(page.locator('.add-task-screen')).toBeVisible()
  await expect(title).toHaveValue('Keep this offline draft')
  await expect(title).toBeFocused()
  expect((await saved(page)).tasks).toEqual(state.tasks)
  expect((await saved(page)).acceptedPlan).toEqual(state.acceptedPlan)
})

function futureState(tasks: TaskItem[]) {
  const state = createInitialState()
  state.tasks = tasks
  return acceptPlan(state, generateWeeklyPlan({ ...state, weekStart: '2030-01-07' }))
}

test('repeated partial recovery preserves unique completed history and can undo the last move', () => {
  let state = futureState([{ id: 'repeat', title: 'Repeat partial work', kind: 'Flexible', duration: '60 min', meta: '60 min' }])
  state = updateBlockStatus(state, 'task-repeat', 'partial')
  state = applyProposal(state, proposeRecovery(state.acceptedPlan!, 'task-repeat', 'move', state, '2030-01-07'))
  state = updateBlockStatus(state, 'task-repeat', 'partial')
  const before = structuredClone(state.acceptedPlan)
  const preview = proposeRecovery(state.acceptedPlan!, 'task-repeat', 'move', state, '2030-01-07')
  expect(preview.errors).toEqual([])
  state = applyProposal(state, preview)
  const blocks = state.acceptedPlan!.blocks
  expect(new Set(blocks.map(block => block.id)).size).toBe(blocks.length)
  expect(blocks.reduce((sum, block) => sum + durationMinutes(block.duration), 0)).toBe(60)
  expect(blocks.filter(block => block.status === 'done').reduce((sum, block) => sum + durationMinutes(block.duration), 0)).toBe(45)
  expect(validateState(state)).toBe(true)
  expect(undoLastChange(state).acceptedPlan).toEqual(before)
})

test('week adjustment preserves a valid fixed block ending at midnight', () => {
  const state = futureState([
    { id: 'midnight', title: 'End at midnight', kind: 'Fixed', duration: '30 min', meta: '30 min', fixedDate: '2030-01-07', startTime: '23:30' },
    { id: 'flexible', title: 'Other flexible work', kind: 'Flexible', duration: '45 min', meta: '45 min' },
  ])
  const original = state.acceptedPlan!.blocks.find(block => block.taskId === 'midnight')
  const preview = proposeAdjustment(state.acceptedPlan!, state, 'week', '2030-01-07')
  expect(preview.errors).toEqual([])
  expect(preview.after.blocks.find(block => block.taskId === 'midnight')).toEqual(original)
  expect(preview.after.unscheduled).toEqual([])
  expect(validateState(applyProposal(state, preview))).toBe(true)
})

test('a user-pinned flexible block can be unlocked while original fixed tasks stay protected', () => {
  let state = futureState([
    { id: 'flexible', title: 'Pin and unpin', kind: 'Flexible', duration: '60 min', meta: '60 min' },
    { id: 'fixed', title: 'Fixed appointment', kind: 'Fixed', duration: '30 min', meta: '30 min', fixedDate: '2030-01-07', startTime: '11:00' },
  ])
  const original = state.acceptedPlan!.blocks.find(block => block.taskId === 'flexible')!
  const pin = proposeEdit(state.acceptedPlan!, { ...original, fixed: true }, state.availability, state.tasks)
  expect(pin.errors).toEqual([])
  state = applyProposal(state, pin)
  const unpin = proposeEdit(state.acceptedPlan!, { ...original, fixed: false }, state.availability, state.tasks)
  expect(unpin.errors).toEqual([])
  state = applyProposal(state, unpin)
  expect(state.acceptedPlan!.blocks.find(block => block.taskId === 'flexible')?.fixed).toBe(false)
  const fixed = state.acceptedPlan!.blocks.find(block => block.taskId === 'fixed')!
  expect(proposeEdit(state.acceptedPlan!, { ...fixed, fixed: false }, state.availability, state.tasks).errors).not.toEqual([])
  const duplicate = { ...state.acceptedPlan!, blocks: [...state.acceptedPlan!.blocks, { ...original, dateISO: '2030-01-08', day: 'Tuesday', shortDay: 'Tue', dayNumber: '8' }] }
  expect(validatePlan(duplicate, state.availability, state.tasks).join(' ')).toMatch(/unique|duplicate/i)
})

test('an offline notice suspends a hidden picker focus trap and restores its custom draft', async ({page}) => {
  const state=await seed(page)
  await nav(page,'Tasks')
  await page.getByRole('button',{name:'Add task',exact:true}).click()
  await page.getByRole('button',{name:/Add with details/}).click()
  await page.getByRole('button',{name:'Duration',exact:true}).click()
  await page.getByRole('dialog').getByRole('button',{name:'Custom',exact:true}).click()
  const hours=page.getByRole('textbox',{name:'Hours',exact:true})
  await hours.fill('2')
  await page.getByRole('textbox',{name:'Minutes',exact:true}).fill('17')
  await hours.focus()
  await page.evaluate(()=>window.dispatchEvent(new Event('offline')))
  await expect(page.getByRole('heading',{name:'You’re offline',exact:true})).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button',{name:'Continue offline',exact:true})).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(hours).toHaveValue('2')
  await expect(hours).toBeFocused()
  await expect(page.getByRole('textbox',{name:'Minutes',exact:true})).toHaveValue('17')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button',{name:'Duration',exact:true})).toBeFocused()
  expect((await saved(page)).tasks).toEqual(state.tasks)
})

test('setup Back follows the actual skipped-date caller and Forward restores the step',async({page})=>{
 await page.goto('/')
 await page.getByRole('button',{name:'Build my first week',exact:true}).click()
 await page.getByRole('button',{name:'Continue',exact:true}).click()
 await page.getByRole('radio',{name:/I’m not sure/}).click()
 await page.getByRole('button',{name:'Continue',exact:true}).click()
 await page.getByRole('button',{name:'Continue without cycle context',exact:true}).click()
 await expect(page.locator('.starter-tasks-screen')).toBeVisible()
 await page.getByRole('button',{name:'Back',exact:true}).click()
 await expect(page.locator('.no-exact-date-screen')).toBeVisible()
 await page.goForward()
 await expect(page.locator('.starter-tasks-screen')).toBeVisible()
})

test('rationale header Back preserves real browser Forward history',async({page})=>{
 await seed(page);await nav(page,'Plan')
 await page.getByRole('button',{name:`${alpha}, 09:00–10:00`,exact:true}).click()
 await expect(page.locator('.plan-rationale-screen')).toBeVisible()
 await page.getByRole('button',{name:'Back',exact:true}).click()
 await expect(page.locator('.active-plan-screen')).toBeVisible()
 await page.goForward()
 await expect(page.locator('.plan-rationale-screen')).toContainText(alpha)
})

test('Back from an edit preview retains its draft; a fresh edit starts from the saved block',async({page})=>{
 const state=await seed(page);await nav(page,'Plan')
 await page.getByRole('button',{name:`Actions for ${alpha}`,exact:true}).click()
 await page.getByRole('dialog').getByRole('button',{name:/Edit or move/}).click()
 await page.getByRole('textbox',{name:'Task',exact:true}).fill('Pending edited brief')
 await page.getByRole('button',{name:'Start time',exact:true}).click()
 await page.getByRole('dialog').getByRole('button',{name:'Custom',exact:true}).click()
 await page.getByRole('textbox',{name:'Exact time (HH:MM)',exact:true}).fill('13:17')
 await page.getByRole('button',{name:'Use time',exact:true}).click()
 await page.getByRole('button',{name:'Preview changes',exact:true}).click()
 await page.getByRole('radio',{name:/Rest of the week/}).click()
 await page.getByRole('button',{name:'Preview changes',exact:true}).click()
 await page.getByRole('button',{name:'Back',exact:true}).click()
 await page.getByRole('button',{name:'Back',exact:true}).click()
 await expect(page.getByRole('textbox',{name:'Task',exact:true})).toHaveValue('Pending edited brief')
 await expect(page.getByRole('button',{name:'Start time',exact:true})).toContainText('13:17')
 expect((await saved(page)).acceptedPlan).toEqual(state.acceptedPlan)
 await page.getByRole('button',{name:'Back',exact:true}).click()
 await page.getByRole('button',{name:`Actions for ${alpha}`,exact:true}).click()
 await page.getByRole('dialog').getByRole('button',{name:/Edit or move/}).click()
 await expect(page.getByRole('textbox',{name:'Task',exact:true})).toHaveValue(alpha)
 await expect(page.getByRole('button',{name:'Start time',exact:true})).toContainText('09:00')
})
