import { expect, test, type Page } from '@playwright/test'
import { chooseExactTime } from './picker-helpers'

const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('plan4her:local-state:v1')!))
const click = (page: Page, name: string) => page.getByRole('button', { name, exact: true }).click()
const nav = (page: Page, name: string) => page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name, exact: true }).click()
const task = (page: Page, title: string) => page.locator('.p4h-task-card').filter({ hasText: title }).locator('.p4h-task-card__content')
async function pickDate(page: Page, field: string, value: string) {
  await click(page, field)
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox', { name: 'Date (YYYY-MM-DD)', exact: true }).fill(value)
  await dialog.getByRole('button', { name: 'Use date', exact: true }).click()
}
async function sampleWeek(page: Page) {
  await page.clock.setFixedTime(new Date('2026-10-12T08:00:00'))
  await page.goto('/')
  await click(page, 'Build my first week'); await click(page, 'Continue'); await click(page, 'Continue without cycle context')
  await page.getByRole('radio', { name: /A full week, ready to plan/ }).click()
  await click(page, 'Continue'); await click(page, 'Continue'); await click(page, 'Skip for now')
  await expect(page.locator('.review-plan-screen')).toBeVisible({ timeout: 20000 })
  await click(page, 'Accept week')
}

test('flexible deadline and fixed date/time: create, edit, reload, plan; deadlines hold and fixed never moves with the cycle day', async ({ page }) => {
  await sampleWeek(page)
  await nav(page, 'Tasks')

  // Flexible task with an exact deadline, chosen in the calendar.
  await click(page, 'Add task'); await page.getByRole('button', { name: /Add with details/ }).click()
  await expect(page.getByRole('textbox', { name: 'Task', exact: true })).toHaveValue('')
  await page.getByRole('textbox', { name: 'Task', exact: true }).fill('Submit grant report')
  await click(page, 'Deadline · optional')
  await page.getByRole('dialog').getByRole('button', { name: 'Next month' }).click()
  await expect(page.getByRole('dialog').getByRole('heading')).toHaveText('November 2026')
  await page.getByRole('dialog').getByRole('button', { name: '3', exact: true }).click()
  await click(page, 'Save as Unscheduled')
  await expect.poll(async () => (await saved(page)).tasks.find((t: { title: string }) => t.title === 'Submit grant report')?.deadline).toBe('2026-11-03')

  // Edit the deadline (calendar, not a typed format).
  await task(page, 'Submit grant report').click()
  await expect(page.getByRole('button', { name: 'Deadline · optional', exact: true })).toContainText('Nov 3, 2026')
  await pickDate(page, 'Deadline · optional', '2026-10-13')
  await click(page, 'Save task')
  await expect.poll(async () => (await saved(page)).tasks.find((t: { title: string }) => t.title === 'Submit grant report')?.deadline).toBe('2026-10-13')

  // Fixed task with exact date, start and end time.
  await click(page, 'Add task'); await page.getByRole('button', { name: /Add with details/ }).click()
  await page.getByRole('textbox', { name: 'Task', exact: true }).fill('Dentist appointment')
  await click(page, 'Fixed')
  await pickDate(page, 'Date', '2026-10-15')
  await chooseExactTime(page, '14:00')
  await chooseExactTime(page, '15:30', 'End time')
  await click(page, 'Save as Unscheduled')
  await expect.poll(async () => (await saved(page)).tasks.find((t: { title: string }) => t.title === 'Dentist appointment')).toMatchObject({ kind: 'Fixed', fixedDate: '2026-10-15', startTime: '14:00', duration: '90 min' })

  // Edit fixed values, then reload and reopen.
  await task(page, 'Dentist appointment').click()
  await pickDate(page, 'Date', '2026-10-16')
  await chooseExactTime(page, '09:30')
  await click(page, 'Save task')
  await page.reload()
  await nav(page, 'Tasks')
  await task(page, 'Dentist appointment').click()
  await expect(page.getByRole('button', { name: 'Date', exact: true })).toContainText('Oct 16, 2026')
  await expect(page.getByRole('button', { name: 'Start time', exact: true })).toContainText('09:30')
  await click(page, 'Flexible') // switching kind keeps a single consistent timing on save
  await click(page, 'Fixed')
  await click(page, 'Save task')
  const fixedTask = (await saved(page)).tasks.find((t: { title: string }) => t.title === 'Dentist appointment')
  expect(fixedTask).toMatchObject({ kind: 'Fixed', fixedDate: '2026-10-16', startTime: '09:30', duration: '90 min' })
  expect(fixedTask.deadline).toBeUndefined()

  // Add both to the accepted plan.
  for (const title of ['Submit grant report', 'Dentist appointment']) await page.getByRole('button', { name: `Select ${title} for planning`, exact: true }).click()
  await click(page, 'Add to plan')
  await page.getByRole('button', { name: /^Apply/ }).click()
  const blocks = (await saved(page)).acceptedPlan.blocks as Array<{ taskId?: string; dateISO: string; start: string }>
  const ids = Object.fromEntries((await saved(page)).tasks.map((t: { title: string; id: string }) => [t.title, t.id]))
  const at = (list: typeof blocks, title: string) => list.find(b => b.taskId === ids[title])!
  expect(at(blocks, 'Dentist appointment')).toMatchObject({ dateISO: '2026-10-16', start: '09:30' })
  expect(at(blocks, 'Submit grant report').dateISO <= '2026-10-13').toBe(true)

  // Every cycle day keeps the fixed appointment in place and the deadline respected.
  await nav(page, 'Plan')
  await page.getByRole('button', { name: /Explore your week/ }).click()
  for (const day of ['1', '5', '12', '14', '20', '27']) {
    await page.getByRole('slider', { name: 'Cycle day' }).fill(day)
    const rows = await page.locator('.rhythm-day').evaluateAll(els => els.map(e => ({ date: e.querySelector('.rhythm-day__date')?.textContent ?? '', titles: [...e.querySelectorAll('.rhythm-task__title')].map(t => t.textContent) })))
    expect(rows.find(r => r.titles.includes('Dentist appointment'))?.date, `day ${day}`).toContain('16')
    const grant = rows.findIndex(r => r.titles.includes('Submit grant report'))
    expect(grant, `day ${day}`).toBeGreaterThanOrEqual(0)
    expect(grant, `day ${day}: deadline Tue 13`).toBeLessThanOrEqual(1)
  }
  await click(page, 'Review changes')
  await page.getByRole('button', { name: /^Apply/ }).click()
  const after = (await saved(page)).acceptedPlan.blocks
  expect(at(after, 'Dentist appointment')).toMatchObject({ dateISO: '2026-10-16', start: '09:30' })
  expect(at(after, 'Submit grant report').dateISO <= '2026-10-13').toBe(true)
})

for (const [width, height] of [[320, 568], [390, 844]]) {
  test(`${width}px: every add/edit scheduling field and the save action are reachable`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await sampleWeek(page)
    await nav(page, 'Tasks')
    await click(page, 'Add task'); await page.getByRole('button', { name: /Add with details/ }).click()
    await page.getByRole('textbox', { name: 'Task', exact: true }).fill('Reachability check')
    for (const kind of ['Flexible', 'Fixed']) {
      await click(page, kind)
      const names = kind === 'Flexible' ? ['Duration', 'Deadline · optional', 'Must', 'Optional', 'Save as Unscheduled'] : ['Date', 'Start time', 'End time', 'Must', 'Optional', 'Save as Unscheduled']
      for (const name of names) { const b = ['Must', 'Optional'].includes(name) ? page.getByRole('radio', { name, exact: true }) : page.getByRole('button', { name, exact: true }); await b.scrollIntoViewIfNeeded(); await expect(b).toBeInViewport({ ratio: 0.95 }) }
    }
    await click(page, 'Save as Unscheduled')
    await task(page, 'Reachability check').click()
    for (const name of ['Date', 'Start time', 'Duration', 'Must', 'Save task', 'Delete task']) { const b = ['Must', 'Optional'].includes(name) ? page.getByRole('radio', { name, exact: true }) : page.getByRole('button', { name, exact: true }); await b.scrollIntoViewIfNeeded(); await expect(b).toBeInViewport({ ratio: 0.95 }) }
    await click(page, 'Flexible')
    for (const name of ['Duration', 'Deadline · optional', 'Save task']) { const b = ['Must', 'Optional'].includes(name) ? page.getByRole('radio', { name, exact: true }) : page.getByRole('button', { name, exact: true }); await b.scrollIntoViewIfNeeded(); await expect(b).toBeInViewport({ ratio: 0.95 }) }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}
