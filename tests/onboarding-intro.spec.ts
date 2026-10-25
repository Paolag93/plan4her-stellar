import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const storageKey = 'plan4her:local-state:v1'
const intros = [
  ['intro-rhythm', '4198:16', 'onboarding-rhythm.png'],
  ['intro-control', '4198:27', 'onboarding-control.png'],
] as const

// These PNGs are untouched 390 × 844 Figma exports, not application captures.
// Canonical source: zctnzXqin1jZJLvxBlVxZz / 10 - Prototype, exported 2026-10-08.
for (const [route, node, screenshot] of intros) {
  test(`${node}: canonical Figma parity and local source assets`, async ({ page }) => {
    await page.goto(`/?qa=${route}`)
    await expect(page.locator(`[data-figma-node="${node}"]`)).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    await expect(page).toHaveScreenshot(screenshot, { animations: 'disabled' })
    for (const image of await page.locator('main img').all()) {
      expect(await image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
      expect(await image.getAttribute('src')).not.toContain('figma.com')
    }
    await expect(page.locator('.onboarding-intro__progress')).toHaveCSS('width', '32px')
    await expect(page.locator('.onboarding-intro__progress')).toHaveCSS('height', '8px')
    await expect(page.locator('.onboarding-intro__back img')).toHaveCSS('width', '20px')
    await expect(page.locator('.onboarding-intro__back img')).toHaveCSS('height', '20px')
  })

  test(`${route}: WCAG automated scan`, async ({ page }) => {
    await page.goto(`/?qa=${route}`)
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    expect(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([])
  })
}

async function seeHow(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'See how Plan4Her works', exact: true }).click()
  await expect(page.locator('[data-figma-node="4198:16"]')).toBeVisible()
}

test('START → Rhythm → Control → Privacy follows the live canonical education graph', async ({ page }) => {
  await seeHow(page)
  await expect(page.getByRole('region', { name: 'Example cycle context' })).toBeVisible()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.locator('[data-figma-node="4198:27"]')).toBeVisible()
  await page.getByRole('button', { name: 'Set up my week', exact: true }).click()
  await expect(page.locator('[data-figma-node="4800:6686"]')).toBeVisible()
  const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), storageKey)
  expect(state).toMatchObject({ cycleMode: null, cycleBasics: null, analyticsConsent: false, tasks: [], draftPlan: null, acceptedPlan: null })
})

test('Rhythm offers the direct Set up shortcut without the Control step', async ({ page }) => {
  await seeHow(page)
  await page.getByRole('button', { name: 'Set up my week', exact: true }).click()
  await expect(page.locator('[data-figma-node="4800:6686"]')).toBeVisible()
  await page.goBack()
  await expect(page.locator('[data-figma-node="4198:16"]')).toBeVisible()
})

test('Back cancels education without adding history; browser Forward restores the exact step', async ({ page }) => {
  await seeHow(page)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.locator('[data-figma-node="4198:16"]')).toBeVisible()
  await page.goForward()
  await expect(page.locator('[data-figma-node="4198:27"]')).toBeVisible()
  await page.goBack()
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.locator('[data-figma-node="4200:1120"]')).toBeVisible()
  await page.goForward()
  await expect(page.locator('[data-figma-node="4198:16"]')).toBeVisible()
})

test('Repeated education actions create one navigation and an interruption remains safe to restart', async ({ page }) => {
  await page.goto('/')
  const before = await page.evaluate(() => history.length)
  await page.getByRole('button', { name: 'See how Plan4Her works', exact: true }).evaluate((button: HTMLButtonElement) => { button.click(); button.click() })
  await expect(page.locator('[data-figma-node="4198:16"]')).toBeVisible()
  expect(await page.evaluate(() => history.length)).toBe(before + 1)
  await page.getByRole('button', { name: 'Continue', exact: true }).evaluate((button: HTMLButtonElement) => { button.click(); button.click() })
  await expect(page.locator('[data-figma-node="4198:27"]')).toBeVisible()
  expect(await page.evaluate(() => history.length)).toBe(before + 2)
  await page.reload()
  await expect(page.locator('[data-figma-node="4200:1120"]')).toBeVisible()
  await page.getByRole('button', { name: 'See how Plan4Her works', exact: true }).click()
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.locator('[data-figma-node="4200:1120"]')).toBeVisible()
})

test('Both direct QA intro routes have deterministic Back fallbacks', async ({ page }) => {
  await page.goto('/?qa=intro-control')
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.locator('[data-figma-node="4198:16"]')).toBeVisible()
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.locator('[data-figma-node="4200:1120"]')).toBeVisible()
})

for (const width of [320, 360, 390, 430]) for (const height of [568, 844]) {
  test(`${width} × ${height}: education is readable and all controls remain reachable`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    for (const [route] of intros) {
      await page.goto(`/?qa=${route}`)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
      await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('font-size', '24px')
      await expect(page.getByRole('main')).toHaveCSS('transform', 'none')
      for (const control of await page.getByRole('button').all()) {
        await control.scrollIntoViewIfNeeded()
        await expect(control).toBeInViewport({ ratio: 1 })
        const box = (await control.boundingBox())!
        expect(box.width).toBeGreaterThanOrEqual(44)
        expect(box.height).toBeGreaterThanOrEqual(44)
        expect(await control.evaluate(el => { const r = el.getBoundingClientRect(); const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return hit === el || (hit !== null && el.contains(hit)) })).toBe(true)
      }
    }
  })
}

test('Education keyboard traversal exposes only live controls and visible focus', async ({ page }) => {
  await page.goto('/?qa=intro-rhythm')
  for (const label of ['Back', 'Set up my week', 'Continue']) {
    await page.keyboard.press('Tab')
    const button = page.getByRole('button', { name: label, exact: true })
    await expect(button).toBeFocused()
    await expect(button).toHaveCSS('outline-width', '2px')
  }
})
