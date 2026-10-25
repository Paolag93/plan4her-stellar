import { expect, test } from '@playwright/test'

test.describe('MVP Tasks — canonical Figma flows', () => {
  test('Tasks root matches canonical content and opens chooser', async ({ page }) => {
    await page.goto('/?qa=tasks')
    await expect(page.locator('[data-figma-node="4198:253"]')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible()
    await expect(page.getByText('3 TASKS')).toBeVisible()
    await expect(page).toHaveScreenshot('p6-tasks-root.png', { fullPage: true, animations: 'disabled' })
    await page.getByRole('button', { name: 'Add task' }).click()
    await expect(page.locator('[data-figma-node="4578:6158"]')).toBeVisible()
  })

  test('Quick capture matches Figma, saves canonical prescription to Tasks and exposes Undo snackbar', async ({ page }) => {
    await page.goto('/?qa=quick-capture')
    await expect(page.locator('[data-figma-node="4198:239"]')).toBeVisible()
    await expect(page).toHaveScreenshot('p6-quick-capture.png', { fullPage: true, animations: 'disabled' })
    await page.getByRole('button', { name: 'Save to Tasks' }).click()
    await expect(page.locator('[data-figma-node="4216:3901"]')).toBeVisible()
    await expect(page.getByText('4 TASKS')).toBeVisible()
    await expect(page.getByText('Pick up prescription')).toBeVisible()
    await expect(page.getByText('Saved to Tasks')).toBeVisible()
    await expect(page).toHaveScreenshot('p6-tasks-added.png', { fullPage: true, animations: 'disabled' })
  })

  test('Add with details starts Important/Flexible and matches Figma', async ({ page }) => {
    await page.goto('/?qa=add-task')
    await expect(page.locator('[data-figma-node="4578:6002"]')).toBeVisible()
    await expect(page.getByRole('radio', { name: 'Important' })).toHaveAttribute('aria-checked', 'true')
    await expect(page).toHaveScreenshot('p6-add-task-flexible.png', { fullPage: true, animations: 'disabled' })
    await page.getByRole('button', { name: 'Save as Unscheduled' }).click()
    await expect(page.locator('[data-figma-node="4650:5836"]')).toBeVisible()
    await expect(page.getByText('Saved as Unscheduled')).toBeVisible()
  })

  test('Add with details Fixed matches canonical fixed state and task overlays', async ({ page }) => {
    await page.goto('/?qa=add-task')
    await page.getByRole('button', { name: 'Fixed', exact: true }).click()
    await expect(page.locator('[data-figma-node="4578:6074"]')).toBeVisible()
    await expect(page).toHaveScreenshot('p6-add-task-fixed.png', { fullPage: true, animations: 'disabled' })
    await page.getByRole('button', { name: 'Start time' }).click()
    await expect(page.locator('[data-figma-node="4690:7288"]')).toBeVisible()
  })

  test('Dentist detail matches Figma and focused/toggled nodes', async ({ page }) => {
    await page.goto('/?qa=task-details-dentist')
    await expect(page.locator('[data-figma-node="4198:266"]')).toBeVisible()
    await expect(page).toHaveScreenshot('p6-task-details.png', { fullPage: true, animations: 'disabled' })

    await page.getByRole('textbox', { name: 'Task' }).click()
    await expect(page.locator('[data-figma-node="4272:2747"]')).toBeVisible()

    await page.getByRole('textbox', { name: 'Duration' }).click()
    await expect(page.locator('[data-figma-node="4272:2805"]')).toBeVisible()

    await page.getByRole('textbox', { name: 'Deadline · optional' }).click()
    await expect(page.locator('[data-figma-node="4272:2863"]')).toBeVisible()

    await page.getByRole('button', { name: 'Fixed', exact: true }).click()
    await expect(page.locator('[data-figma-node="4272:2921"]')).toBeVisible()

    await page.getByRole('button', { name: 'Delete task' }).click()
    await expect(page.locator('[data-figma-node="4272:1853"]')).toBeVisible()
  })

  test('Groceries detail uses its canonical base, focus and toggle frames', async ({ page }) => {
    await page.goto('/?qa=task-details-groceries')
    await expect(page.locator('[data-figma-node="4272:4126"]')).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Deadline · optional' })).toHaveValue('No deadline')
    await page.getByRole('textbox', { name: 'Task' }).click()
    await expect(page.locator('[data-figma-node="4285:4339"]')).toBeVisible()
    await page.getByRole('textbox', { name: 'Duration' }).click()
    await expect(page.locator('[data-figma-node="4285:4397"]')).toBeVisible()
    await page.getByRole('textbox', { name: 'Deadline · optional' }).click()
    await expect(page.locator('[data-figma-node="4285:4455"]')).toBeVisible()
    await page.getByRole('button', { name: 'Fixed', exact: true }).click()
    await expect(page.locator('[data-figma-node="4285:4513"]')).toBeVisible()
  })

  test('Yoga detail uses canonical fixed frames and flexible toggle', async ({ page }) => {
    await page.goto('/?qa=task-details-yoga')
    await expect(page.locator('[data-figma-node="4272:4180"]')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start time' })).toContainText('18:00')
    await page.getByRole('textbox', { name: 'Task' }).click()
    await expect(page.locator('[data-figma-node="4285:4708"]')).toBeVisible()
    await page.getByRole('textbox', { name: 'Duration' }).click()
    await expect(page.locator('[data-figma-node="4285:4766"]')).toBeVisible()
    await page.getByRole('textbox', { name: 'Date' }).click()
    await expect(page.locator('[data-figma-node="4285:4824"]')).toBeVisible()
    await page.getByRole('button', { name: 'Flexible', exact: true }).click()
    await expect(page.locator('[data-figma-node="4285:4882"]')).toBeVisible()
  })

  test('Team meeting and prescription expose their canonical detail frames', async ({ page }) => {
    await page.goto('/?qa=task-details-meeting')
    await expect(page.locator('[data-figma-node="4273:3170"]')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start time' })).toContainText('11:00')

    await page.goto('/?qa=task-details-prescription')
    await expect(page.locator('[data-figma-node="4277:6209"]')).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Deadline · optional' })).toHaveValue('No deadline')
  })

  test('Done states map to exact 3-task Figma frames', async ({ page }) => {
    await page.goto('/?qa=tasks')
    await page.getByRole('button', { name: 'Mark Call dentist done' }).click()
    await expect(page.locator('[data-figma-node="4273:3371"]')).toBeVisible()

    await page.goto('/?qa=tasks-done-groceries')
    await expect(page.locator('[data-figma-node="4273:3467"]')).toBeVisible()

    await page.goto('/?qa=tasks-done-yoga')
    await expect(page.locator('[data-figma-node="4273:3563"]')).toBeVisible()
  })

  test('Done states map to exact 4-task added Figma frames', async ({ page }) => {
    await page.goto('/?qa=tasks-added-done-dentist')
    await expect(page.locator('[data-figma-node="4277:6284"]')).toBeVisible()

    await page.goto('/?qa=tasks-added-done-groceries')
    await expect(page.locator('[data-figma-node="4277:6401"]')).toBeVisible()

    await page.goto('/?qa=tasks-added-done-yoga')
    await expect(page.locator('[data-figma-node="4277:6514"]')).toBeVisible()

    await page.goto('/?qa=tasks-added-done-prescription')
    await expect(page.locator('[data-figma-node="4277:6631"]')).toBeVisible()
  })

  test('Empty state matches Figma and exposes canonical actions', async ({ page }) => {
    await page.goto('/?qa=tasks-empty')
    await expect(page.locator('[data-figma-node="4250:4047"]')).toBeVisible()
    await expect(page.getByText('No unscheduled tasks')).toBeVisible()
    await expect(page.locator('.tasks-screen__empty-add')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Quick capture', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add starter tasks', exact: true })).toBeVisible()
    await expect(page).toHaveScreenshot('p6-tasks-empty.png', { fullPage: true, animations: 'disabled' })
  })
})
