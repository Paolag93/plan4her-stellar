import { expect, test, type Locator, type Page } from '@playwright/test'

const widths = [320, 360, 390, 430]
const heights = [844, 568]
const routes = ['today', 'tasks', 'more', 'plan-review', 'quick-capture', 'add-task', 'cycle-context', 'privacy-data']

async function noHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }))).toEqual({ document: page.viewportSize()!.width, viewport: page.viewportSize()!.width })
  const main = await page.getByRole('main').boundingBox()
  expect(main).not.toBeNull()
  expect(main!.x).toBeGreaterThanOrEqual(0)
  expect(main!.x + main!.width).toBeLessThanOrEqual(page.viewportSize()!.width)
  // A clipped internal pane can conceal an overflow even when the document fits.
  const overflowingPanes = await page.locator('main > div').evaluateAll(elements => elements
    .filter(el => /__(scroll|content)$|system-content/.test(el.className))
    .filter(el => el.scrollWidth > el.clientWidth + 1)
    .map(el => el.className))
  expect(overflowingPanes).toEqual([])
}

async function usableControl(control: Locator) {
  await expect(control).toHaveAccessibleName(/\S/)
  const box = await control.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.width, `Control width: ${await control.getAttribute('class')}`).toBeGreaterThanOrEqual(44)
  expect(box!.height, `Control height: ${await control.getAttribute('class')}`).toBeGreaterThanOrEqual(44)
}

async function reachable(page: Page, control: Locator) {
  await control.scrollIntoViewIfNeeded()
  await expect(control).toBeInViewport({ ratio: 1 })
  // Visibility alone does not detect an overlapping nav, FAB, or clipped target.
  expect(await control.evaluate(el => {
    const rect = el.getBoundingClientRect()
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)
    return hit === el || (hit !== null && el.contains(hit))
  })).toBe(true)
}

for (const width of widths) for (const height of heights) {
  test(`${width}×${height}: readable entry, setup and reachable first-week CTA`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await page.goto('/')
    await noHorizontalOverflow(page)
    const heading = page.getByRole('heading', { name: 'A weekly plan that adapts to you' })
    await expect(heading).toHaveCSS('font-size', '24px')
    // An unscaled font-size is not sufficient: its ancestor must not transform it.
    await expect(page.getByRole('main')).toHaveCSS('transform', 'none')
    for (const button of await page.getByRole('button').all()) await usableControl(button)
    await reachable(page, page.getByRole('button', { name: 'Build my first week', exact: true }))
    await page.getByRole('button', { name: 'Build my first week', exact: true }).click()
    await noHorizontalOverflow(page)
    for (const button of await page.getByRole('button').all()) await usableControl(button)
    await reachable(page, page.getByRole('button', { name: 'Continue', exact: true }))
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await noHorizontalOverflow(page)
    for (const radio of await page.getByRole('radio').all()) await usableControl(radio)
    await reachable(page, page.getByRole('button', { name: 'Continue without cycle context', exact: true }))
  })

  test(`${width}×${height}: primary screens keep controls named, full-size and navigation clear`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    for (const route of routes) await test.step(route, async () => {
      await page.goto(`/?qa=${route}`)
      await noHorizontalOverflow(page)
      await expect(page.getByRole('main')).toHaveCSS('transform', 'none')
      for (const control of await page.locator('button:visible, input:visible').all()) await usableControl(control)
      const nav = page.getByRole('navigation', { name: 'Primary', exact: true })
      if (await nav.count()) {
        await expect(nav).toBeInViewport({ ratio: 1 })
        const navBox = (await nav.boundingBox())!
        const fab = page.getByRole('button', { name: 'Add task', exact: true })
        if (await fab.count()) {
          await reachable(page, fab)
          const box = (await fab.boundingBox())!
          expect(box.y + box.height).toBeLessThanOrEqual(navBox.y)
        }
        for (const button of await nav.getByRole('button').all()) await reachable(page, button)
      }
      if (width < 390) {
        const clippedCopy = await page.locator('main > div > p, main > div > h1, main > div > h2').evaluateAll(elements =>
          elements.filter(el => el.scrollHeight > el.clientHeight + 1).map(el => el.textContent))
        expect(clippedCopy).toEqual([])
      }
    })
  })
}

test('keyboard navigation has a visible, high-contrast focus ring on actual controls', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  const first = page.getByRole('button', { name: 'See how Plan4Her works', exact: true })
  await expect(first).toBeFocused()
  await expect(first).toHaveCSS('outline-style', 'solid')
  await expect(first).toHaveCSS('outline-width', '2px')
  await expect(first).toHaveCSS('outline-color', 'rgb(22, 105, 122)')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Build my first week', exact: true })).toBeFocused()
  await page.goto('/?qa=quick-capture')
  const input = page.getByRole('textbox').first()
  await input.focus()
  await expect(input).toHaveCSS('outline-width', '2px')
  await usableControl(input)
})

test('desktop retains a centered, unscaled 390px phone canvas', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/?qa=today')
  await expect(page.getByRole('main')).toHaveCSS('width', '390px')
  await expect(page.getByRole('main')).toHaveCSS('height', '844px')
  expect((await page.getByRole('main').boundingBox())!.x).toBe(445)
})

test('320px setup fields, choices and calendar keep usable targets without scaling', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Build my first week', exact: true }).click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('button', { name: 'Continue without cycle context', exact: true }).click()
  await page.getByRole('radio', { name: /Work focus/ }).click()
  await noHorizontalOverflow(page)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await noHorizontalOverflow(page)
  for (const input of await page.getByRole('textbox').all()) await usableControl(input)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await noHorizontalOverflow(page)
  await page.getByRole('button', { name: 'Add fixed commitment', exact: true }).click()
  await noHorizontalOverflow(page)
  for (const input of await page.getByRole('textbox').all()) await usableControl(input)
  await page.getByRole('button', { name: 'Date', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeInViewport({ ratio: 1 })
  for (const button of await dialog.getByRole('button').all()) {
    await usableControl(button)
    await reachable(page, button)
  }
})
