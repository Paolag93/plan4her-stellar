import { expect, test, type Locator, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createInitialState, STORAGE_KEY, validateState } from '../src/domain/persistence'
import { generateWeeklyPlan } from '../src/domain/planner'
import type { AppState, TaskItem } from '../src/domain/types'

test.use({ timezoneId: 'UTC' })
const weekStart = '2026-10-12'
const longTitle = 'Prepare the accessible project handover and review every remaining item'
const tokenTitle = `Reference-${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.repeat(5)}`
const metadata = '30 min · Tuesday afternoon · Bring the final review notes and the supporting project materials'

function contentState(): AppState {
  const state = createInitialState()
  const task = (id: string, title: string): TaskItem => ({ id, title, kind: 'Flexible', duration: '30 min', meta: metadata })
  const planned = [task('planned-long', longTitle), task('planned-token', tokenTitle)]
  state.tasks = [...planned, ...Array.from({ length: 24 }, (_, i) => task(`backlog-${i}`, `${i === 23 ? tokenTitle : longTitle} ${i + 1}`))]
  state.acceptedPlan = generateWeeklyPlan({ ...state, tasks: planned, weekStart })
  state.draftPlan = state.acceptedPlan
  state.onboardingComplete = true
  expect(validateState(state)).toBe(true)
  return state
}

async function seed(page: Page, state = contentState()) {
  await page.clock.setFixedTime(new Date(`${weekStart}T08:00:00Z`))
  await page.addInitScript(({ key, state }) => {
    if (!sessionStorage.getItem('content-layout-seeded')) {
      localStorage.setItem(key, JSON.stringify(state))
      sessionStorage.setItem('content-layout-seeded', 'yes')
    }
  }, { key: STORAGE_KEY, state })
  await page.goto('/')
  return state
}

async function navigate(page: Page, name: 'Tasks' | 'Plan' | 'Today') {
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name, exact: true }).click()
}

// Text-only enlargement catches fixed pixel slots that browser viewport zoom
// alone misses. Snapshot computed sizes before writing to avoid compounding.
async function enlargeText(page: Page, selector = 'main:visible, main:visible *') {
  await page.locator(selector).evaluateAll(elements => {
    const sizes = elements.map(el => {
      const style = getComputedStyle(el)
      return { el: el as HTMLElement, font: parseFloat(style.fontSize), line: parseFloat(style.lineHeight) }
    })
    for (const { el, font, line } of sizes) {
      el.style.fontSize = `${font * 2}px`
      if (Number.isFinite(line)) el.style.lineHeight = `${line * 2}px`
    }
  })
}

async function containedCopy(cards: Locator, selector: string) {
  const failures = await cards.evaluateAll((elements, selector) => {
    const failures: string[] = []
    for (const card of elements) {
      const outer = card.getBoundingClientRect()
      for (const copy of card.querySelectorAll(selector)) {
        const bounds = copy.getBoundingClientRect()
        const range = document.createRange()
        range.selectNodeContents(copy)
        const textRects = [...range.getClientRects()].filter(rect => rect.width && rect.height)
        if (bounds.left < outer.left - 1 || bounds.right > outer.right + 1 || bounds.top < outer.top - 1 || bounds.bottom > outer.bottom + 1 ||
            textRects.some(rect => rect.left < bounds.left - 1 || rect.right > bounds.right + 1 || rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1)) {
          failures.push(`${copy.className}: ${copy.textContent}`)
        }
      }
    }
    return failures
  }, selector)
  expect(failures).toEqual([])
}

async function clearPane(page: Page, pane: Locator) {
  expect(await pane.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const paneBox = (await pane.boundingBox())!
  const headerBox = (await page.locator('main:visible > .p4h-app-header').boundingBox())!
  expect(paneBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height - 1)
  const navigation = page.getByRole('navigation', { name: 'Primary' })
  if (await navigation.count()) {
    const navBox = (await navigation.boundingBox())!
    expect(paneBox.y + paneBox.height).toBeLessThanOrEqual(navBox.y)
    for (const control of await navigation.getByRole('button').all()) await reachable(control)
  }
}

async function reachable(control: Locator) {
  await control.scrollIntoViewIfNeeded()
  await expect(control).toBeInViewport({ ratio: 1 })
  const box = (await control.boundingBox())!
  expect(box.width).toBeGreaterThanOrEqual(44)
  expect(box.height).toBeGreaterThanOrEqual(44)
  expect(await control.evaluate(el => {
    const box = el.getBoundingClientRect()
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
    return hit === el || (hit !== null && el.contains(hit))
  })).toBe(true)
}

async function noOverlap(card: Locator, selectors: string[]) {
  const overlaps = await card.evaluate((el, selectors) => {
    const boxes = selectors.map(selector => ({ selector, rect: el.querySelector(selector)?.getBoundingClientRect() })).filter(item => item.rect)
    return boxes.flatMap((a, i) => boxes.slice(i + 1).filter(b =>
      Math.min(a.rect!.right, b.rect!.right) - Math.max(a.rect!.left, b.rect!.left) > 1 &&
      Math.min(a.rect!.bottom, b.rect!.bottom) - Math.max(a.rect!.top, b.rect!.top) > 1,
    ).map(b => `${a.selector} / ${b.selector}`))
  }, selectors)
  expect(overlaps).toEqual([])
}

for (const width of [320, 360, 390, 430, 1280]) {
  test(`${width}px: live long titles and metadata reflow across Tasks, Today and Plan`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 })
    await seed(page)
    await containedCopy(page.locator('.today-plan-block'), 'strong, .today-plan-block__time, .today-plan-block__badge, p')
    await clearPane(page, page.locator('.today-screen__scroll'))
    await navigate(page, 'Tasks')
    const cards = page.locator('.p4h-task-card')
    await expect(cards).toHaveCount(26)
    await containedCopy(cards, '.p4h-task-card__title, .p4h-task-card__meta, .p4h-task-card__badge')
    for (const index of [0, 23, 25]) {
      await noOverlap(cards.nth(index), ['.p4h-task-card__title', '.p4h-task-card__meta', '.p4h-task-card__badge', '.p4h-task-card__done-action'])
      await reachable(cards.nth(index).locator('.p4h-task-card__done-action'))
    }
    await clearPane(page, page.locator('.tasks-screen__scroll'))
    await cards.first().locator('.p4h-task-card__check-touch').click()
    await expect(page.getByRole('status')).toHaveText('1 selected')
    await page.locator('.tasks-screen__scroll').evaluate(el => { el.scrollTop = 0 })
    await page.screenshot({ path: testInfo.outputPath(`synthetic-live-content-${width}.png`) })
    await navigate(page, 'Plan')
    await containedCopy(page.locator('.plan-block-card'), '.plan-block-card__top strong, .plan-block-card__time, .plan-block-card__badge')
    for (const card of await page.locator('.plan-block-card').all()) {
      await noOverlap(card, ['.plan-block-card__top', '.plan-block-card__time', '.plan-block-card__badge', '.plan-block-card__more'])
      await reachable(card.locator('.plan-block-card__more'))
    }
    await clearPane(page, page.locator('.active-plan-screen__scroll'))
  })
}

for (const textScale of [1, 2]) {
  test(`320×568 at ${textScale * 100}% text: 24 selected additions remain readable through review and restore`, async ({ page }, testInfo) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: 320, height: 568 })
    const original = await seed(page)
    await navigate(page, 'Tasks')
    if (textScale === 2) await enlargeText(page)
    await containedCopy(page.locator('.p4h-task-card'), '.p4h-task-card__title, .p4h-task-card__meta, .p4h-task-card__badge')
    await clearPane(page, page.locator('.tasks-screen__scroll'))
    for (const control of await page.getByRole('region', { name: 'Unscheduled tasks', exact: true }).locator('.p4h-task-card__check-touch').all()) {
      await reachable(control)
      await control.click()
    }
    await expect(page.getByRole('status')).toHaveText('24 selected')
    await reachable(page.getByRole('button', { name: 'Add to plan', exact: true }))
    await page.getByRole('button', { name: 'Add to plan', exact: true }).click()
    await expect(page.locator('.plan-diff-card')).toHaveCount(24)
    if (textScale === 2) await enlargeText(page)
    await containedCopy(page.locator('.plan-diff-card'), 'strong, em, span, p, small')
    await clearPane(page, page.getByRole('region', { name: 'Proposed plan changes' }))
    await noOverlap(page.locator('.plan-diff-screen__content'), ['h1', '.plan-diff-screen__intro', '.plan-diff-screen__protected'])
    await page.screenshot({ path: testInfo.outputPath(`synthetic-review-${textScale * 100}-percent-text.png`) })
    const apply = page.getByRole('button', { name: 'Apply changes', exact: true })
    await reachable(apply)
    await apply.focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    await expect(apply).toBeFocused()
    expect(await apply.evaluate(el => parseFloat(getComputedStyle(el).outlineWidth))).toBeGreaterThanOrEqual(2)
    await expect(apply).toHaveCSS('outline-style', 'solid')
    await apply.click()
    await page.getByRole('button', { name: 'Review changes', exact: true }).click()
    await expect(page.locator('.recent-change-card')).toHaveCount(24)
    if (textScale === 2) await enlargeText(page)
    await containedCopy(page.locator('.recent-change-card'), 'strong, em, span, p, small')
    await clearPane(page, page.getByRole('region', { name: 'Recent plan changes' }))
    const restore = page.getByRole('button', { name: 'Restore previous plan', exact: true })
    await reachable(restore)
    await restore.click()
    await expect(page.locator('.restore-preview-card')).toHaveCount(24)
    if (textScale === 2) await enlargeText(page)
    await containedCopy(page.locator('.restore-preview-card'), 'strong, em, span, p, small')
    await noOverlap(page.locator('.restore-preview-screen__content'), ['h1', '.restore-preview-screen__intro', '.restore-preview-screen__notice'])
    await clearPane(page, page.getByRole('region', { name: 'Plan changes to restore' }))
    await reachable(page.getByRole('button', { name: 'Back to changes', exact: true }))
    await reachable(page.getByRole('button', { name: 'Restore previous plan', exact: true }))
    await page.getByRole('button', { name: 'Restore previous plan', exact: true }).click()
    await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).acceptedPlan.blocks.length, STORAGE_KEY)).toBe(original.acceptedPlan!.blocks.length)
  })
}

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }]) {
  test(`${viewport.width}×${viewport.height}: 200% Today and Plan text leaves every action and navigation reachable`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    await seed(page)
    await enlargeText(page)
    await containedCopy(page.locator('.today-plan-block'), 'strong, .today-plan-block__time, .today-plan-block__badge, p')
    await containedCopy(page.locator('.daily-phase-context'), 'strong, span, small')
    for (const card of await page.locator('.today-plan-block').all()) {
      await noOverlap(card, ['strong', '.today-plan-block__time', '.today-plan-block__badge', 'p', '.today-plan-block__more'])
      await reachable(card.locator('.today-plan-block__more'))
    }
    await clearPane(page, page.locator('.today-screen__scroll'))
    await navigate(page, 'Plan')
    await enlargeText(page)
    await containedCopy(page.locator('.plan-block-card'), '.plan-block-card__top strong, .plan-block-card__top em, .plan-block-card__time, .plan-block-card__badge')
    await clearPane(page, page.locator('.active-plan-screen__scroll'))
    await reachable(page.getByRole('button', { name: 'Adjust plan', exact: true }))
    await page.screenshot({ path: testInfo.outputPath(`synthetic-live-plan-${viewport.width}-200-percent-text.png`) })
    await navigate(page, 'Tasks')
    await enlargeText(page)
    await page.locator('.tasks-screen__selection-list').first().locator('.p4h-task-card').last().locator('.p4h-task-card__check-touch').click()
    await reachable(page.getByRole('button', { name: 'Add to plan', exact: true }))
    await clearPane(page, page.locator('.tasks-screen__scroll'))
  })
}

test('long task errors wrap, leave selection reachable, and pass the live accessibility scan', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 568 })
  const state = contentState()
  const impossible = state.tasks[2]
  impossible.title = tokenTitle
  impossible.duration = '24 hours'
  impossible.deadline = weekStart
  await seed(page, state)
  await navigate(page, 'Tasks')
  await page.getByRole('button', { name: `Select ${tokenTitle} for planning`, exact: true }).click()
  await page.getByRole('button', { name: 'Add to plan', exact: true }).click()
  const error = page.locator('.tasks-screen__planning-error')
  await expect(error).toContainText(tokenTitle)
  await enlargeText(page)
  await containedCopy(page.locator('.tasks-screen__group').first(), '.tasks-screen__planning-error')
  await clearPane(page, page.locator('.tasks-screen__scroll'))
  await noOverlap(page.locator('.tasks-screen__group').first(), ['.tasks-screen__selection-controls', '.tasks-screen__planning-error', '.tasks-screen__selection-count'])
  await error.scrollIntoViewIfNeeded()
  await page.screenshot({ path: testInfo.outputPath('synthetic-long-planning-error-200-percent-text.png') })
  await reachable(page.getByRole('button', { name: 'Clear selection', exact: true }))
  await page.getByRole('button', { name: 'Clear selection', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('0 selected')
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(node => node.target) }))).toEqual([])
})

for (const width of [320, 390]) {
  test(`${width}px: task-date fields, their calendar errors and the save action do not overlap`, async ({ page }) => {
    await page.setViewportSize({ width, height: 568 })
    await seed(page)
    await navigate(page, 'Tasks')
    await page.locator('.p4h-task-card__content').first().click()
    await page.getByRole('button', { name: 'Fixed', exact: true }).click()
    await page.getByRole('button', { name: 'Date', exact: true }).click()
    const exact = page.getByRole('dialog').getByRole('textbox', { name: 'Date (YYYY-MM-DD)', exact: true })
    await exact.fill('2026-02-31')
    await expect(exact).toHaveAttribute('aria-invalid', 'true')
    await page.keyboard.press('Escape')
    const card = page.locator('.task-details-screen__card')
    await containedCopy(card, '.p4h-text-field__label, .p4h-text-field__supporting')
    await noOverlap(card, ['.task-details-screen__date', '.task-details-screen__start', '.task-details-screen__fixed-duration', '.task-details-screen__importance'])
    await noOverlap(page.locator('.task-details-screen__content'), ['.task-details-screen__card', '.task-details-screen__save', '.task-details-screen__delete'])
    await reachable(page.getByRole('button', { name: 'Save task', exact: true }))
    await clearPane(page, page.locator('.task-details-screen__content'))
  })
}

test('six-week exact-date calendar keeps its error and final controls reachable at 200% text', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 568 })
  const state = contentState()
  state.cycleMode = 'natural'
  state.cycleBasics = { lastPeriodStart: '2026-08-05', cycleLength: 28 }
  await seed(page, state)
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: 'More', exact: true }).click()
  await page.getByRole('button', { name: 'Cycle context', exact: true }).click()
  await page.getByRole('button', { name: 'Last period started', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading')).toHaveText('August 2026')
  await dialog.getByRole('textbox', { name: 'Date (YYYY-MM-DD)', exact: true }).fill('2026-02-31')
  await enlargeText(page, '[role="dialog"], [role="dialog"] *')
  await expect(dialog).toBeInViewport({ ratio: 1 })
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
  // The calendar scrolls at large text sizes: each piece must fit its own
  // box and be reachable, rather than all rows appearing simultaneously.
  for (const copy of await dialog.locator('h2, .commitment-date-overlay__entry label, .commitment-date-overlay__entry p').all()) {
    await copy.scrollIntoViewIfNeeded()
    await expect(copy).toBeInViewport({ ratio: 1 })
    expect(await copy.evaluate(el => {
      const bounds = el.getBoundingClientRect(); const range = document.createRange(); range.selectNodeContents(el)
      return [...range.getClientRects()].filter(rect => rect.width && rect.height).every(rect => rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1 && rect.top >= bounds.top - 1 && rect.bottom <= bounds.bottom + 1)
    })).toBe(true)
  }
  await noOverlap(dialog, ['h2', '.commitment-date-overlay__navigation', '.commitment-date-overlay__close', '.commitment-date-overlay__weekdays', '.commitment-date-overlay__days', '.commitment-date-overlay__entry'])
  await reachable(dialog.getByRole('button', { name: '31', exact: true }))
  await reachable(dialog.getByRole('button', { name: 'Use date', exact: true }))
  await page.screenshot({ path: testInfo.outputPath('synthetic-six-week-calendar-200-percent-text.png') })
  await reachable(dialog.getByRole('button', { name: 'Close date picker', exact: true }))
  await dialog.getByRole('button', { name: 'Close date picker', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Last period started', exact: true })).toBeFocused()
})
