import { expect, test, type Locator, type Page } from '@playwright/test'
import { createInitialState, STORAGE_KEY } from '../src/domain/persistence'
import { generateWeeklyPlan } from '../src/domain/planner'
import type { AppState } from '../src/domain/types'

test.use({ timezoneId: 'UTC' })

async function seedPlan(page: Page, count = 18, changeAvailability = true) {
  const state = createInitialState()
  state.tasks = Array.from({ length: count }, (_, index) => ({
    id: `review-${String(index + 1).padStart(2, '0')}`,
    title: `Review task ${index + 1}${index === count - 1 ? ' with a longer title that must remain fully readable' : ''}`,
    kind: 'Flexible', importance: 'Important', duration: '30 min', meta: '30 min',
  }))
  state.acceptedPlan = generateWeeklyPlan({ ...state, weekStart: '2026-10-12' })
  state.draftPlan = state.acceptedPlan
  state.onboardingComplete = true
  // The saved week is a valid previous plan; changed availability produces a
  // real preview with every task moved, without a special application fixture.
  if (changeAvailability) state.availability.Monday = '11:00–18:00'
  await page.clock.setFixedTime(new Date('2026-10-12T08:00:00Z'))
  await page.addInitScript(({ key, state }) => {
    if (!sessionStorage.getItem('review-changes-seeded')) {
      localStorage.setItem(key, JSON.stringify(state))
      sessionStorage.setItem('review-changes-seeded', 'yes')
    }
  }, { key: STORAGE_KEY, state })
  await page.goto('/')
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: 'Plan', exact: true }).click()
  return state
}

async function saved(page: Page): Promise<AppState> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY)
}

async function openPreview(page: Page, scope: 'today' | 'week' = 'week') {
  await page.getByRole('button', { name: 'Adjust plan', exact: true }).click()
  await page.getByRole('radio', { name: scope === 'week' ? /Rest of the week/ : /Rest of today/ }).click()
  await page.getByRole('button', { name: 'Preview changes', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Proposed plan changes' })).toBeVisible()
}

async function reachable(control: Locator) {
  await control.scrollIntoViewIfNeeded()
  await expect(control).toBeInViewport({ ratio: 1 })
  expect(await control.evaluate(el => {
    const box = el.getBoundingClientRect()
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
    return hit === el || (hit !== null && el.contains(hit))
  })).toBe(true)
}

async function readWholeList(page: Page, pane: Locator, cards: Locator) {
  await expect(cards).toHaveCount(18)
  expect(await pane.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true)
  await pane.focus()
  await page.keyboard.press('End')
  await expect.poll(() => pane.evaluate(el => el.scrollTop)).toBeGreaterThan(0)
  // Check every row, including its final line, against the actual scroll pane.
  for (const card of await cards.all()) {
    await card.scrollIntoViewIfNeeded()
    await expect(card).toBeInViewport({ ratio: 1 })
    expect(await card.evaluate(el => {
      const box = el.getBoundingClientRect()
      return [...el.querySelectorAll('strong, p, small')].every(copy => {
        const text = copy.getBoundingClientRect()
        return text.top >= box.top && text.bottom <= box.bottom && text.left >= box.left && text.right <= box.right
      })
    })).toBe(true)
  }
  expect(await pane.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
}

for (const viewport of [{ width: 390, height: 844 }, { width: 390, height: 568 }, { width: 320, height: 568 }]) {
  test(`${viewport.width}×${viewport.height}: all 18 proposed and applied changes remain readable with reachable actions`, async ({ page }) => {
    await page.setViewportSize(viewport)
    const original = await seedPlan(page)
    const agenda = await page.locator('.active-plan-screen__scroll').boundingBox()
    expect(agenda!.y + agenda!.height).toBeLessThanOrEqual(viewport.height - 144)
    await reachable(page.getByRole('button', { name: 'Adjust plan', exact: true }))
    await openPreview(page)
    const pane = page.getByRole('region', { name: 'Proposed plan changes' })
    await readWholeList(page, pane, page.locator('.plan-diff-card'))
    expect((await saved(page)).acceptedPlan).toEqual(original.acceptedPlan)
    expect((await saved(page)).history).toEqual([])
    await reachable(page.getByRole('button', { name: 'Keep plan as is', exact: true }))
    const apply = page.getByRole('button', { name: 'Apply changes', exact: true })
    await reachable(apply)
    await pane.evaluate(el => { el.scrollTop = el.scrollHeight })
    const bottom = await apply.boundingBox()
    expect(bottom!.y + bottom!.height).toBeLessThanOrEqual(viewport.height - 24)
    await expect(page.getByRole('button', { name: 'Back', exact: true })).toBeInViewport({ ratio: 1 })
    await apply.click()
    await expect.poll(async () => (await saved(page)).history.length).toBe(1)
    await reachable(page.getByRole('button', { name: 'Review changes', exact: true }))
    await page.getByRole('button', { name: 'Review changes', exact: true }).click()
    await readWholeList(page, page.getByRole('region', { name: 'Recent plan changes' }), page.locator('.recent-change-card'))
    await reachable(page.getByRole('button', { name: 'Back to plan', exact: true }))
    await reachable(page.getByRole('button', { name: 'Restore previous plan', exact: true }))
  })
}

test('adjustment help opens the canonical topic and Back preserves an edited proposal', async ({ page }) => {
  const original = await seedPlan(page, 3, false)
  await page.getByRole('button', { name: 'Actions for Review task 1', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: /Edit or move/ }).click()
  await page.getByRole('textbox', { name: 'Task', exact: true }).fill('Edited task to retain')
  await page.getByRole('button', { name: 'Start time', exact: true }).click()
  const startPicker = page.getByRole('dialog', { name: 'Start time', exact: true })
  await startPicker.getByRole('button', { name: 'Custom', exact: true }).click()
  await startPicker.getByRole('textbox', { name: 'Exact time (HH:MM)', exact: true }).fill('11:00')
  await startPicker.getByRole('button', { name: 'Use time', exact: true }).click()
  await page.getByRole('button', { name: 'Preview changes', exact: true }).click()
  await expect(page.locator('.adjust-scope-screen')).toBeVisible()
  await page.getByRole('button', { name: 'How plan adjustments work', exact: true }).click()
  await expect(page.locator('[data-figma-node="4317:5621"]')).toBeVisible()
  await expect(page.getByText('Plan changes stay under your control', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.locator('.adjust-scope-screen')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Preview changes', exact: true })).toBeDisabled()
  await page.getByRole('radio', { name: /Rest of the week/ }).click()
  await page.getByRole('button', { name: 'Preview changes', exact: true }).click()
  await expect(page.locator('.plan-diff-card')).toHaveCount(1)
  await expect(page.locator('.plan-diff-card')).toContainText('Edited task to retain')
  const preview = await page.locator('.plan-diff-card').allTextContents()
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.getByRole('radio', { name: /Rest of the week/ })).toBeChecked()
  await page.getByRole('button', { name: 'Preview changes', exact: true }).click()
  expect(await page.locator('.plan-diff-card').allTextContents()).toEqual(preview)
  await page.getByRole('button', { name: 'Keep plan as is', exact: true }).click()
  expect((await saved(page)).acceptedPlan).toEqual(original.acceptedPlan)
  expect((await saved(page)).history).toEqual([])
})

test('today preview retains its selected range and exact proposal after time passes and Back/reopen', async ({ page }) => {
  const original = await seedPlan(page, 3)
  await openPreview(page, 'today')
  const preview = await page.locator('.plan-diff-card').allTextContents()
  expect(preview).toHaveLength(3)
  await page.clock.setFixedTime(new Date('2026-10-12T12:00:00Z'))
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.getByRole('radio', { name: /Rest of today/ })).toBeChecked()
  await page.getByRole('button', { name: 'Preview changes', exact: true }).click()
  expect(await page.locator('.plan-diff-card').allTextContents()).toEqual(preview)
  await page.goBack()
  await expect(page.getByRole('radio', { name: /Rest of today/ })).toBeChecked()
  await page.goForward()
  expect(await page.locator('.plan-diff-card').allTextContents()).toEqual(preview)
  expect((await saved(page)).acceptedPlan).toEqual(original.acceptedPlan)
  expect((await saved(page)).history).toEqual([])
})
