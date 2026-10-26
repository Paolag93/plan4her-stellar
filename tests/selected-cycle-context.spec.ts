import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createInitialState, STORAGE_KEY } from '../src/domain/persistence'
import { makeBlock, weekDays } from '../src/domain/planner'
import { selectedCycleContext } from '../src/features/daily/selectedCycleContext'

test.use({ timezoneId: 'UTC' })

// Verified in canonical Figma zctnzXqin1jZJLvxBlVxZz, 2026-10-08:
// phase/{menstrual,follicular,ovulatory,luteal}, variables 4121:1329–1332.
const phases = {
  Menstrual: { hex: '#d95e5e', rgb: 'rgb(217, 94, 94)' },
  Follicular: { hex: '#82c0cc', rgb: 'rgb(130, 192, 204)' },
  Ovulatory: { hex: '#f4d799', rgb: 'rgb(244, 215, 153)' },
  Luteal: { hex: '#cbcde1', rgb: 'rgb(203, 205, 225)' },
} as const

test.describe('display rules', () => {
  test('uses the existing setup thresholds at every 28-day phase boundary and rollover', () => {
    const cycle = { enabled: true, lastPeriodStart: '2026-10-01', cycleLength: 28 }
    for (const [date, day, phase] of [
      ['2026-10-01', 1, 'Menstrual'], ['2026-10-05', 5, 'Menstrual'],
      ['2026-10-06', 6, 'Follicular'], ['2026-10-13', 13, 'Follicular'],
      ['2026-10-14', 14, 'Ovulatory'], ['2026-10-16', 16, 'Ovulatory'],
      ['2026-10-17', 17, 'Luteal'], ['2026-10-28', 28, 'Luteal'],
      ['2026-10-29', 1, 'Menstrual'], ['2026-11-11', 14, 'Ovulatory'],
    ] as const) {
      expect(selectedCycleContext(date, cycle)).toEqual({ status: 'estimated', day, phase })
    }
  })

  test('respects the entered length, including existing 15-day and 90-day limits', () => {
    for (const [length, boundaries] of [
      [15, [[5, 'Menstrual'], [6, 'Follicular'], [7, 'Ovulatory'], [8, 'Ovulatory'], [9, 'Luteal'], [15, 'Luteal'], [16, 'Menstrual']]],
      [30, [[15, 'Follicular'], [16, 'Ovulatory'], [18, 'Ovulatory'], [19, 'Luteal'], [30, 'Luteal'], [31, 'Menstrual']]],
      [90, [[75, 'Follicular'], [76, 'Ovulatory'], [78, 'Ovulatory'], [79, 'Luteal'], [90, 'Luteal'], [91, 'Menstrual']]],
    ] as const) {
      for (const [offset, phase] of boundaries) {
        const date = new Date('2026-01-01T00:00:00Z')
        date.setUTCDate(offset)
        expect(selectedCycleContext(date.toISOString().slice(0, 10), { enabled: true, lastPeriodStart: '2026-01-01', cycleLength: length })).toEqual({ status: 'estimated', day: (offset - 1) % length + 1, phase })
      }
    }
  })

  test('counts calendar dates across daylight saving and leap-day boundaries', () => {
    expect(selectedCycleContext('2026-03-10', { enabled: true, lastPeriodStart: '2026-03-05', cycleLength: 28 })).toEqual({ status: 'estimated', day: 6, phase: 'Follicular' })
    expect(selectedCycleContext('2026-11-03', { enabled: true, lastPeriodStart: '2026-10-29', cycleLength: 28 })).toEqual({ status: 'estimated', day: 6, phase: 'Follicular' })
    expect(selectedCycleContext('2028-03-01', { enabled: true, lastPeriodStart: '2028-02-25', cycleLength: 28 })).toEqual({ status: 'estimated', day: 6, phase: 'Follicular' })
  })

  test('does not invent a phase for off, missing, invalid, or pre-start dates', () => {
    const cycle = { enabled: true, lastPeriodStart: '2026-10-01', cycleLength: 28 }
    expect(selectedCycleContext('2026-10-05', { ...cycle, enabled: false })).toEqual({ status: 'off', day: null, phase: null })
    expect(selectedCycleContext('2026-10-05', { ...cycle, lastPeriodStart: null })).toEqual({ status: 'no-date', day: null, phase: null })
    expect(selectedCycleContext('2026-09-30', cycle)).toEqual({ status: 'before-start', day: null, phase: null })
    for (const date of [undefined, '', 'Mon 5 Oct', '2026-02-30']) {
      expect(selectedCycleContext(date, cycle)).toEqual({ status: 'invalid-date', day: null, phase: null })
    }
    expect(selectedCycleContext('2026-10-05', { ...cycle, lastPeriodStart: '2026-02-30' }).status).toBe('invalid-date')
    for (const cycleLength of [0, 14, 91, 28.5, NaN, Infinity]) {
      expect(selectedCycleContext('2026-10-05', { ...cycle, cycleLength })).toEqual({ status: 'invalid-length', day: null, phase: null })
    }
  })
})

test('keeps all four exact canonical phase color tokens', async ({ page }) => {
  await page.goto('/?qa=today')
  for (const [phase, color] of Object.entries(phases)) {
    expect(await page.evaluate(token => getComputedStyle(document.documentElement).getPropertyValue(token).trim(), `--p4h-phase-${phase.toLowerCase()}`)).toBe(color.hex)
  }
})

async function seedWeek(page: Page, options: { weekStart?: string; today?: string; start?: string | null; enabled?: boolean; length?: number } = {}) {
  await page.clock.setFixedTime(new Date(`${options.today ?? '2026-10-05'}T08:00:00Z`))
  const state = createInitialState()
  const weekStart = options.weekStart ?? '2026-10-05'
  const week = weekDays(weekStart)
  state.cycleMode = options.enabled === false ? null : 'natural'
  state.cycleBasics = { lastPeriodStart: options.start === undefined ? '2026-10-01' : options.start, cycleLength: options.length ?? 28 }
  state.tasks = week.map(day => ({ id: `work-${day.dateISO}`, title: `Work for ${day.label}`, kind: 'Flexible', duration: '60 min', meta: '60 min', importance: 'Important' }))
  state.acceptedPlan = {
    id: 'selected-cycle-week', weekStart, week,
    blocks: week.map((day, i) => makeBlock(`block-${day.dateISO}`, state.tasks[i].title, day.dateISO!, 540, 60, { taskId: state.tasks[i].id })),
    unscheduled: [], warnings: [], scheduledLoad: 10,
  }
  state.draftPlan = state.acceptedPlan
  state.onboardingComplete = true
  await page.addInitScript(({ key, state }) => {
    if (!sessionStorage.getItem('selected-cycle-seeded')) {
      localStorage.setItem(key, JSON.stringify(state))
      sessionStorage.setItem('selected-cycle-seeded', 'yes')
    }
  }, { key: STORAGE_KEY, state })
  await page.goto('/')
  return state
}

async function expectPhase(page: Page, day: number, phase: keyof typeof phases) {
  const card = page.locator('.daily-phase-context')
  await expect(card.locator('.daily-phase-context__title-group > span')).toHaveText(`Day ${day}`)
  await expect(card.locator('.daily-phase-context__title-group > strong')).toHaveText(phase)
  await expect(card.locator('.daily-phase-context__estimated')).toHaveText('Estimated')
  await expect(card).toHaveAttribute('data-phase', phase.toLowerCase())
  await expect(card).toHaveCSS('background-color', phases[phase].rgb)
  await expect(card).toContainText('Your cycle day is estimated from your last period.')
  expect(await card.evaluate((_, token) => getComputedStyle(document.documentElement).getPropertyValue(token).trim(), `--p4h-phase-${phase.toLowerCase()}`)).toBe(phases[phase].hex)
}

async function selectDay(page: Page, label: string) {
  await page.getByRole('navigation', { name: 'Week', exact: true }).getByRole('button', { name: label, exact: true }).click()
}

test('selected future day crosses the menstrual boundary and returning restores its color', async ({ page }) => {
  const initial = await seedWeek(page)
  await expectPhase(page, 5, 'Menstrual')
  await selectDay(page, 'Tue 6')
  await expectPhase(page, 6, 'Follicular')
  await selectDay(page, 'Mon 5')
  await expectPhase(page, 5, 'Menstrual')
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).acceptedPlan, STORAGE_KEY)).toEqual(initial.acceptedPlan)
})

test('a different displayed week drives phase boundaries instead of today or weekday alone', async ({ page }) => {
  const initial = await seedWeek(page, { weekStart: '2026-10-12' })
  await expectPhase(page, 12, 'Follicular')
  await selectDay(page, 'Tue 13')
  await expectPhase(page, 13, 'Follicular')
  await selectDay(page, 'Wed 14')
  await expectPhase(page, 14, 'Ovulatory')
  await selectDay(page, 'Fri 16')
  await expectPhase(page, 16, 'Ovulatory')
  await selectDay(page, 'Sat 17')
  await expectPhase(page, 17, 'Luteal')
  // Opening settings and cancelling preserves the selected date and its phase.
  await page.locator('.daily-phase-context').click()
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expectPhase(page, 17, 'Luteal')
  await selectDay(page, 'Wed 14')
  await expectPhase(page, 14, 'Ovulatory')
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).acceptedPlan, STORAGE_KEY)).toEqual(initial.acceptedPlan)
})

test('selected date rolls to day one using the entered cycle length', async ({ page }) => {
  await seedWeek(page, { weekStart: '2026-10-26', length: 30 })
  await selectDay(page, 'Fri 30')
  await expectPhase(page, 30, 'Luteal')
  await selectDay(page, 'Sat 31')
  await expectPhase(page, 1, 'Menstrual')
})

for (const [description, options, message] of [
  ['off', { enabled: false }, 'Cycle context off'],
  ['no date', { start: null }, 'No date added'],
  ['before recorded start', { start: '2026-10-07' }, 'Before your recorded start'],
] as const) {
  test(`${description} has an explicit neutral state without an estimated phase`, async ({ page }) => {
    await seedWeek(page, options)
    const card = page.locator('.daily-phase-context')
    await expect(card.locator('.daily-phase-context__title-group > span')).toHaveText(message)
    await expect(card.locator('.daily-phase-context__title-group > strong')).toHaveText('Cycle context')
    await expect(card).toHaveAttribute('data-phase', 'neutral')
    await expect(card).toHaveCSS('background-color', 'rgb(241, 242, 249)')
    await expect(card.locator('.daily-phase-context__estimated')).toHaveCount(0)
    await expect(card).not.toContainText('NaN')
  })
}

test('turning cycle context off and back on updates the selected-day display', async ({ page }) => {
  await seedWeek(page)
  await selectDay(page, 'Tue 6')
  await expectPhase(page, 6, 'Follicular')
  for (const enabled of [false, true]) {
    await page.locator('.daily-phase-context').click()
    await page.getByRole('switch', { name: 'Use cycle context in planning', exact: true }).click()
    await page.getByRole('button', { name: 'Save cycle context', exact: true }).click()
    await page.getByRole('navigation', { name: 'Primary', exact: true }).getByRole('button', { name: 'Today', exact: true }).click()
    if (enabled) await expectPhase(page, 6, 'Follicular')
    else {
      await expect(page.locator('.daily-phase-context')).toContainText('Cycle context off')
      await expect(page.locator('.daily-phase-context')).toHaveCSS('background-color', 'rgb(241, 242, 249)')
    }
  }
})

test('the canonical Daily fixture and static introduction retain the default follicular card', async ({ page }) => {
  await page.goto('/?qa=today')
  await expect(page.locator('.daily-phase-context')).toHaveCSS('background-color', phases.Follicular.rgb)
  await expect(page.locator('.daily-phase-context__title-group')).toHaveText('Day 8Follicular')
  await page.goto('/?qa=intro-rhythm')
  const example = page.getByRole('region', { name: 'Example cycle context' })
  await expect(example).toBeVisible()
  await expect(example).toHaveCSS('background-color', phases.Follicular.rgb)
  expect(await example.evaluate(el => el.tagName)).toBe('SECTION')
})

for (const [phase, start] of [['Menstrual','2026-10-01'],['Follicular','2026-09-28'],['Ovulatory','2026-09-22'],['Luteal','2026-09-18']] as const) {
  test(`${phase}: estimated context text stays readable against its canonical phase color`, async ({page}) => {
    await seedWeek(page,{start})
    await expect(page.locator('.daily-phase-context')).toHaveCSS('background-color',phases[phase].rgb)
    const result=await new AxeBuilder({page}).include('.daily-phase-context').withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze()
    expect(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([])
  })
}
