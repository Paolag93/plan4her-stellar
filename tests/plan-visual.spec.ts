import { expect, test } from '@playwright/test'

const cases = [
  ['plan-review','p6-pl01-review-plan.png','4198:128'],
  ['plan-rationale-prepare','p6-pl02-rationale.png','4250:1715'],
  ['plan-edit-prepare','p6-pl03-edit-block.png','4250:1732'],
  ['plan-accepted','p6-pl07-plan-accepted.png','4198:141'],
  ['plan-active','p6-pl08-active-plan.png','4198:286'],
  ['plan-feasibility','p6-pl04-feasibility-blocked.png','4250:1749'],
  ['recent-changes','p6-pl09-recent-changes.png','4250:1767'],
  ['restore-preview','p6-pl09-restore-preview.png','4272:1806'],
  ['restore-applied','p6-pl10-restore-applied.png','4318:5535'],
  ['adjust-scope','p6-pl05-adjust-scope.png','4199:1124'],
  ['adjust-week','p6-pl05-week-selected.png','4199:1139'],
  ['plan-diff-week','p6-pl06-week-diff.png','4199:1180'],
  ['plan-applied-week','p6-pl07-week-applied.png','4317:5381'],
  ['adjust-today','p6-pl05-today-selected.png','4380:5933'],
  ['plan-diff-today','p6-pl06-today-diff.png','4380:5991'],
  ['plan-applied-today','p6-pl07-today-applied.png','4380:6044'],
] as const

test.describe('MVP Plan visual parity with canonical Figma', () => {
  for (const [qa, snapshot, node] of cases) {
    test(`${node} · ${qa}`, async ({ page }) => {
      await page.goto(`/?qa=${qa}`)
      await expect(page.locator(`[data-figma-node="${node}"]`)).toBeVisible()
      await expect(page).toHaveScreenshot(snapshot, {
        animations: 'disabled',
        caret: 'hide',
        maxDiffPixelRatio: 0.05,
        threshold: 0.15,
      })
    })
  }
})
