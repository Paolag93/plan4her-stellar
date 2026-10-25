import { expect, test } from '@playwright/test'

test.describe('Privacy, help and system interactions', () => {
  test('More opens privacy and Back returns to More', async ({ page }) => {
    await page.goto('/?qa=more')
    await page.getByRole('button', { name: 'Privacy & data', exact: true }).click()
    await expect(page.locator('[data-figma-node="4250:4101"]')).toBeVisible()
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await expect(page.locator('[data-figma-node="4198:298"]')).toBeVisible()
  })

  test('Analytics toggles both ways and remains selected after navigation', async ({ page }) => {
    await page.goto('/?qa=privacy-data')
    const toggle = page.getByRole('switch', { name: 'Anonymous product analytics' })
    await expect(toggle).toHaveAttribute('aria-checked', 'false')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-checked', 'true')
    await expect(page.locator('[data-figma-node="4272:3476"]')).toBeVisible()
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await page.getByRole('button', { name: 'Privacy & data', exact: true }).click()
    await expect(toggle).toHaveAttribute('aria-checked', 'true')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-checked', 'false')
  })

  test('Clear-data cancellation preserves analytics and returns to privacy', async ({ page }) => {
    await page.goto('/?qa=privacy-data')
    await page.getByRole('switch', { name: 'Anonymous product analytics' }).click()
    await page.getByRole('button', { name: 'Clear data on this device', exact: true }).click()
    await expect(page.locator('[data-figma-node="4250:4121"]')).toBeVisible()
    await expect(page.getByText('This permanently deletes tasks, cycle context, accepted plans and local settings from this device.')).toBeVisible()
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  test('Clear-data Back returns without deleting', async ({ page }) => {
    await page.goto('/?qa=clear-data')
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await expect(page.locator('[data-figma-node="4250:4101"]')).toBeVisible()
  })

  for (const [name, node] of [
    ['Weekly planning', '4317:5578'],
    ['Adjusting your plan', '4317:5621'],
    ['Unfinished work', '4317:5659'],
    ['Cycle context', '4317:5697'],
  ] as const) {
    test(`Help opens ${name} and returns to the index`, async ({ page }) => {
      await page.goto('/?qa=help')
      await page.getByRole('button', { name: new RegExp(`^${name}`) }).click()
      await expect(page.locator(`[data-figma-node="${node}"]`)).toBeVisible()
      await page.getByRole('button', { name: 'Back', exact: true }).click()
      await expect(page.locator('[data-figma-node="4397:5935"]')).toBeVisible()
    })
  }

  test('More opens Help and Back returns to More', async ({ page }) => {
    await page.goto('/?qa=more')
    await page.getByRole('button', { name: 'Help & guidance', exact: true }).click()
    await expect(page.locator('[data-figma-node="4397:5935"]')).toBeVisible()
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await expect(page.locator('[data-figma-node="4198:298"]')).toBeVisible()
  })

  test('Offline continuation reaches Today', async ({ page }) => {
    await page.goto('/?qa=offline')
    await expect(page.locator('[data-figma-node="4250:4255"]')).toBeVisible()
    await page.getByRole('button', { name: 'Continue offline', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
  })

  test('Save-error retry returns to the existing difference preview', async ({ page }) => {
    await page.goto('/?qa=system-error')
    await expect(page.locator('[data-figma-node="4250:4278"]')).toBeVisible()
    await page.getByRole('button', { name: 'Try again', exact: true }).click()
    await expect(page.locator('[data-figma-node="4199:1180"]')).toBeVisible()
  })

  test('System SVG assets load at original design dimensions', async ({ page }) => {
    for (const [qa, sizes] of [
      ['privacy-data', [[22, 22], [44, 24]]],
      ['offline', [[28, 28]]],
      ['system-error', [[28, 28]]],
    ] as const) {
      await page.goto(`/?qa=${qa}`)
      await expect(page.locator('.system-content img')).toHaveCount(sizes.length)
      for (let i = 0; i < sizes.length; i++) {
        const img = page.locator('.system-content img').nth(i)
        await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true)
        const geometry = await img.evaluate((el: HTMLImageElement) => [el.naturalWidth, el.naturalHeight, el.getBoundingClientRect().width, el.getBoundingClientRect().height])
        expect(geometry).toEqual([...sizes[i], ...sizes[i]])
      }
    }
  })
})
