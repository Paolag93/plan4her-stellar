import { expect, test } from '@playwright/test'

// Baselines are untouched 390 × 844 PNGs returned by Figma get_screenshot,
// file zctnzXqin1jZJLvxBlVxZz, retrieved 2026-10-08. Never generated from the app.
const cases = [
  ['privacy-data', 'privacy-data', '4250:4101'],
  ['privacy-data', 'analytics-enabled', '4272:3476'],
  ['clear-data', 'clear-data', '4250:4121'],
  ['help', 'help', '4397:5935'],
  ['weekly-help', 'weekly-help', '4317:5578'],
  ['adjust-help', 'adjust-help', '4317:5621'],
  ['offline', 'offline', '4250:4255'],
  ['system-error', 'system-error', '4250:4278'],
] as const

test.describe('System and help visual parity with canonical Figma', () => {
  for (const [qa, snapshot, node] of cases) {
    test(`${node} · ${snapshot}`, async ({ page }) => {
      await page.goto(`/?qa=${qa}`)
      if (snapshot === 'analytics-enabled') {
        await page.getByRole('switch', { name: 'Anonymous product analytics' }).click()
      }
      await expect(page.locator(`[data-figma-node="${node}"]`)).toBeVisible()
      await expect(page).toHaveScreenshot(`p6-${snapshot}.png`, { animations: 'disabled', caret: 'hide' })
    })
  }
})
