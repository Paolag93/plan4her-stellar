import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createInitialState, STORAGE_KEY } from '../src/domain/persistence'
import { weekDays } from '../src/domain/planner'
import { PLAN_BLOCKS } from '../src/features/plan/planData'

test.use({ timezoneId: 'UTC' })

// Baselines are unchanged 390 × 844 Figma screenshots. Their pixels were
// rechecked against get_design_context on 2026-10-08, never against app output.
const screens = [
  ['empty-today', '4250:4247', 'today'],
  ['ai-unavailable', '4250:4268', 'plan'],
  ['basic-fallback', '4250:4287', 'plan'],
] as const

for (const [qa, node, active] of screens) {
  test(`${node} · ${qa}: Figma pixels and exact static asset slots`, async ({ page }) => {
    await page.goto(`/?qa=${qa}`)
    await expect(page.locator(`[data-figma-node="${node}"]`)).toBeVisible()
    await expect(page).toHaveScreenshot(`p6-${qa}.png`, { animations: 'disabled', caret: 'hide' })
    const assets = await page.locator('.conditional-system-screen img').evaluateAll(images => images.map(image => {
      const img = image as HTMLImageElement
      const rect = img.getBoundingClientRect()
      return { remote: /^https?:/.test(img.getAttribute('src') ?? ''), slot: img.closest('.p4h-bottom-nav') ? 'navigation' : img.closest('.plan-block-card__more') ? 'block-actions' : 'state', loaded: img.complete && img.naturalWidth > 0, width: rect.width, height: rect.height }
    }))
    expect(assets.every(asset => asset.loaded)).toBe(true)
    expect(assets.some(asset => asset.remote)).toBe(false)
    expect(assets.filter(asset => asset.slot === 'state')).toEqual([{ remote: false, slot: 'state', loaded: true, width: 28, height: 28 }])
    const navigationImages = assets.filter(asset => asset.slot === 'navigation')
    expect(navigationImages).toHaveLength(4)
    expect(navigationImages.map(asset => [asset.width, asset.height])).toEqual(Array(4).fill([24, 24]))
    await expect(page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: active === 'today' ? 'Today' : 'Plan', exact: true })).toHaveAttribute('aria-current', 'page')
    if (qa === 'basic-fallback') {
      expect(assets.filter(asset => asset.slot === 'block-actions').map(asset => [asset.width, asset.height])).toEqual([[20, 20], [20, 20]])
    }
  })

  test(`${qa}: accessible controls and narrow-screen reachability`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 })
    await page.goto(`/?qa=${qa}`)
    const violations = (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations
    expect(violations.map(violation => ({ id: violation.id, nodes: violation.nodes.map(node => node.target) }))).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320)
    await expect(page.getByRole('main')).toHaveCSS('transform', 'none')
    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeInViewport({ ratio: 1 })
    const primary = page.getByRole('button', { name: qa === 'empty-today' ? 'Review Tasks' : qa === 'ai-unavailable' ? 'Continue without suggestions' : 'Review plan', exact: true })
    await primary.scrollIntoViewIfNeeded()
    await expect(primary).toBeInViewport({ ratio: 1 })
    expect(await primary.evaluate(element => {
      const box = element.getBoundingClientRect()
      const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
      return box.width >= 44 && box.height >= 44 && (hit === element || (hit !== null && element.contains(hit)))
    })).toBe(true)
  })
}

test('empty Today supports Tasks, repeated chooser dismissal and both capture paths', async ({ page }) => {
  await page.goto('/?qa=empty-today')
  await page.getByRole('button', { name: 'Review Tasks', exact: true }).click()
  await expect(page.locator('.tasks-screen')).toBeVisible()
  await page.goto('/?qa=empty-today')
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.getByRole('button', { name: 'Add task', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Add task', exact: true })).toBeFocused()
  }
  await page.getByRole('button', { name: 'Add task', exact: true }).click()
  await page.getByRole('button', { name: /Quick capture/ }).click()
  await expect(page.locator('.quick-capture-screen')).toBeVisible()
  await page.goto('/?qa=empty-today')
  await page.getByRole('button', { name: 'Add task', exact: true }).click()
  await page.getByRole('button', { name: /Add with details/ }).click()
  await expect(page.locator('.add-task-screen')).toBeVisible()
})

test('unavailable suggestions continue through fallback and Review; retry uses local generation', async ({ page }) => {
  await page.goto('/?qa=ai-unavailable')
  await page.getByRole('button', { name: 'Continue without suggestions', exact: true }).click()
  await expect(page.locator('[data-figma-node="4250:4287"]')).toBeVisible()
  await expect(page.locator('.plan-block-card')).toHaveCount(2)
  await page.getByRole('button', { name: 'Review plan', exact: true }).click()
  await expect(page.locator('.review-plan-screen')).toBeVisible()
  await page.goto('/?qa=ai-unavailable')
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.locator('.review-plan-screen')).toBeVisible({ timeout: 15000 })
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBeNull()
})

test('fallback block actions remain interactive after dismissal', async ({ page }) => {
  await page.goto('/?qa=basic-fallback')
  const actions = page.getByRole('button', { name: 'Actions for Prepare proposal', exact: true })
  await actions.click()
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await actions.click()
  await page.getByRole('dialog').getByRole('button', { name: /Why this time/ }).click()
  await expect(page.locator('.plan-rationale-screen')).toBeVisible()
})

async function seedWeek(page: Page, day: '12' | '13') {
  await page.clock.setFixedTime(new Date(`2026-10-${day}T08:00:00Z`))
  const state = createInitialState()
  state.availability.Monday = ''
  state.tasks = [{ id: 'tuesday-work', title: 'Prepare Tuesday proposal', kind: 'Flexible', duration: '60 min', meta: '60 min', importance: 'Important' }]
  state.acceptedPlan = {
    id: 'conditional-week', weekStart: '2026-10-12', week: weekDays('2026-10-12'),
    blocks: [{ ...PLAN_BLOCKS[0], id: 'tuesday-work-block', taskId: 'tuesday-work', title: 'Prepare Tuesday proposal', day: 'Tuesday', shortDay: 'Tue', dayNumber: '13', date: 'Tue 13 Oct', dateISO: '2026-10-13', start: '09:00', time: '09:00–10:00', duration: '60 min' }],
    unscheduled: [], warnings: [], scheduledLoad: 2,
  }
  state.draftPlan = state.acceptedPlan
  state.onboardingComplete = true
  await page.addInitScript(({ key, state }) => {
    if (!sessionStorage.getItem('conditional-seeded')) {
      localStorage.setItem(key, JSON.stringify(state))
      sessionStorage.setItem('conditional-seeded', 'yes')
    }
  }, { key: STORAGE_KEY, state })
  await page.goto('/')
  return state
}

test('live current empty day uses SS02 and keeps the accepted week intact through capture', async ({ page }) => {
  const state = await seedWeek(page, '12')
  await expect(page.locator('[data-figma-node="4250:4247"]')).toBeVisible()
  await expect(page.locator('.daily-phase-context')).toHaveCount(0)
  await expect(page.getByText('LATER TODAY', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: 'Week', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Add task', exact: true }).click()
  await page.getByRole('button', { name: /Quick capture/ }).click()
  await page.getByRole('textbox').fill('Capture an unscheduled idea')
  await page.getByRole('button', { name: 'Save to Tasks', exact: true }).click()
  await expect(page.locator('.tasks-screen')).toContainText('Capture an unscheduled idea')
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY)
  expect(saved.acceptedPlan).toEqual(state.acceptedPlan)
  await page.reload()
  await expect(page.locator('[data-figma-node="4250:4247"]')).toBeVisible()
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: 'Plan', exact: true }).click()
  await expect(page.locator('.active-plan-screen')).toContainText('Prepare Tuesday proposal')
})

test('other empty selected days retain week navigation back to scheduled work', async ({ page }) => {
  await seedWeek(page, '13')
  await expect(page.getByText('Prepare Tuesday proposal', { exact: true })).toBeVisible()
  await page.getByRole('navigation', { name: 'Week', exact: true }).getByRole('button', { name: /Wed 14/ }).click()
  await expect(page.getByRole('heading', { name: 'Nothing scheduled for Wednesday', exact: true })).toBeVisible()
  await page.getByRole('navigation', { name: 'Week', exact: true }).getByRole('button', { name: /Tue 13/ }).click()
  await expect(page.getByText('Prepare Tuesday proposal', { exact: true })).toBeVisible()
})
