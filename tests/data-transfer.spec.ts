import { expect, test, type Download, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { BACKUP_FORMAT, BACKUP_VERSION, MAX_BACKUP_BYTES, createBackupFile, createPlansCsvFile, createTasksCsvFile, csvCell, parseBackup } from '../src/domain/dataTransfer'
import { createInitialState, MAX_STORAGE_CHARS, STORAGE_KEY, validateState } from '../src/domain/persistence'
import { makeBlock, weekDays } from '../src/domain/planner'
import type { AppState } from '../src/domain/types'
import { chooseExactTime } from './picker-helpers'

const exportedAt = new Date('2026-10-09T01:00:00.000Z')
const marker = 'synthetic-private-portability-marker'

function sampleState(title = `Original ${marker}`): AppState {
  const state = createInitialState()
  state.onboardingComplete = true
  state.tasks = [
    { id: 'portable-task', title, kind: 'Flexible', duration: '45 min', meta: '45 min', importance: 'Important' },
    { id: 'waiting-task', title: 'Waiting, with "quotes"\nand a newline', kind: 'Flexible', duration: '30 min', meta: '30 min', importance: 'Optional' },
  ]
  state.cycleMode = 'natural'
  state.cycleBasics = { lastPeriodStart: '2026-10-05', cycleLength: 28 }
  state.commitments = [{ id: 'portable-commitment', title: 'Existing appointment', date: '2026-10-13', startTime: '11:00', endTime: '11:45' }]
  state.acceptedPlan = {
    id: 'portable-week', weekStart: '2026-10-12', week: weekDays('2026-10-12'),
    blocks: [makeBlock('task-portable', title, '2026-10-12', 9 * 60, 45, { taskId: 'portable-task' })],
    unscheduled: [{ taskId: 'waiting-task', title: state.tasks[1].title, reason: 'Deferred by you.' }],
    warnings: [], scheduledLoad: 10, scheduledMinutes: 45, availableMinutes: 450,
  }
  state.draftPlan = JSON.parse(JSON.stringify(state.acceptedPlan))
  state.history = [{ id: 'portable-history', kind: 'accept', label: 'Accepted week', createdAt: exportedAt.toISOString(), before: null, after: JSON.parse(JSON.stringify(state.acceptedPlan)) }]
  return state
}

function envelope(state: unknown, changes: Record<string, unknown> = {}): string {
  return JSON.stringify({ format: BACKUP_FORMAT, formatVersion: BACKUP_VERSION, exportedAt: exportedAt.toISOString(), state, ...changes })
}

test.describe('Data transfer domain', () => {
  test('versioned JSON preserves full Unicode state, settings, cycle data and history without mutation', () => {
    const state = sampleState('Preparar revisión 🌿 漢字')
    const before = JSON.stringify(state)
    const backup = createBackupFile(state, exportedAt)
    expect(backup.filename).toBe('plan4her-backup-2026-10-09T01-00-00-000Z.json')
    expect(backup.mimeType).toBe('application/json;charset=utf-8')
    const restored = parseBackup(backup.content)
    expect(restored.state).toEqual(state)
    expect(restored.state).not.toBe(state)
    expect(restored.summary).toEqual({ tasks: 2, commitments: 1, history: 1, acceptedWeek: '2026-10-12', draftWeek: '2026-10-12', hasCycleData: true })
    expect(restored.exportedAt).toBe(exportedAt.toISOString())
    expect(JSON.stringify(state)).toBe(before)
    expect(parseBackup(`\uFEFF${backup.content}`).state).toEqual(state)
  })

  test('an empty backup is valid but preserves its explicit empty summary', () => {
    const initial = createInitialState()
    const preview = parseBackup(createBackupFile(initial, exportedAt).content)
    expect(preview.state).toEqual(initial)
    expect(preview.summary).toEqual({ tasks: 0, commitments: 0, history: 0, acceptedWeek: null, draftWeek: null, hasCycleData: false })
  })

  test('rejects malformed envelopes, unknown versions, invalid dates and non-backup formats', () => {
    const state = sampleState()
    const invalid = [
      '', '{', 'null', '[]', createTasksCsvFile(state, exportedAt).content, JSON.stringify(state),
      envelope(state, { format: 'another-app' }), envelope(state, { formatVersion: 2 }),
      envelope(state, { exportedAt: '2026-02-30T01:00:00.000Z' }), envelope(state, { exportedAt: 'yesterday' }),
      envelope(state, { unrecognized: true }), envelope(state, { state: { ...state, version: 99 } }),
    ]
    for (const raw of invalid) expect(() => parseBackup(raw)).toThrow()
  })

  test('rejects prototype keys at every level without polluting objects or evaluating content', () => {
    const raw = createBackupFile(sampleState(), exportedAt).content
    for (const key of ['__proto__', 'constructor', 'prototype']) {
      expect(() => parseBackup(raw.replace('"state":{', `"state":{"${key}":{"polluted":true},`))).toThrow()
      expect(() => parseBackup(raw.replace('"id":"portable-task"', `"id":"portable-task","${key}":{"polluted":true}`))).toThrow()
      expect(() => parseBackup(raw.replace('"format":', `"${key}":{"polluted":true},"format":`))).toThrow()
    }
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted')).toBe(false)
    const text = '<script>alert("local-only")</script>'
    expect(parseBackup(createBackupFile(sampleState(text), exportedAt).content).state.tasks[0].title).toBe(text)
  })

  test('rejects invalid current schema, excessive strings, nested data and task counts', () => {
    const state = sampleState()
    const invalid = [
      { ...state, cycleBasics: { lastPeriodStart: '2026-02-30', cycleLength: 28 } },
      { ...state, tasks: [{ ...state.tasks[0], title: 'x'.repeat(4097) }] },
      { ...state, tasks: Array.from({ length: 1001 }, (_, i) => ({ ...state.tasks[0], id: String(i) })) },
      { ...state, tasks: [state.tasks[0], state.tasks[0]] },
      { ...state, acceptedPlan: { ...state.acceptedPlan, weekStart: '2026-10-13' } },
      { ...state, cyclePreferences: { malformed: true } },
      { ...state, tasks: [{ ...state.tasks[0], workType: 'unrecognized' }] },
      { ...state, additional: { nested: { data: true } } },
    ]
    for (const value of invalid) expect(() => parseBackup(envelope(value))).toThrow()
    expect(() => parseBackup(' '.repeat(MAX_STORAGE_CHARS + 1025))).toThrow(/too large/)
    expect(() => createBackupFile(invalid[0] as AppState)).toThrow(/exported safely/)
  })

  test('a large valid Unicode backup round-trips inside the byte cap', () => {
    const state = createInitialState()
    state.tasks = Array.from({ length: 450 }, (_, i) => ({ id: `unicode-${i}`, title: '漢'.repeat(4000), meta: '30 min', kind: 'Flexible' }))
    expect(validateState(state)).toBe(true)
    expect(JSON.stringify(state).length).toBeLessThan(MAX_STORAGE_CHARS)
    const backup = createBackupFile(state, exportedAt)
    expect(new TextEncoder().encode(backup.content).byteLength).toBeLessThan(MAX_BACKUP_BYTES)
    expect(parseBackup(backup.content).state.tasks).toEqual(state.tasks)
  })

  test('CSV quotes delimiters and line breaks and neutralizes formula prefixes', () => {
    expect(csvCell('a,"b"\r\nc')).toBe('"a,""b""\r\nc"')
    expect(csvCell(null)).toBe('""')
    expect(csvCell(false)).toBe('"false"')
    for (const value of ['=1+1', '+SUM(1,2)', '-1+2', '@SUM(1,2)', ' =1+1', '\t=1+1', '\r@cmd', '\n+SUM(1)', '\u0000=1', '\uFEFF=1']) {
      expect(csvCell(value)).toBe(`"'${value}"`)
    }
    expect(csvCell('Ordinary task')).toBe('"Ordinary task"')
    expect(csvCell('project-name')).toBe('"project-name"')
  })

  test('CSV includes tasks, draft/accepted and unscheduled work while omitting cycle and history fields', () => {
    const state = sampleState('=HYPERLINK("https://invalid.example","task")')
    const before = JSON.stringify(state)
    const tasks = createTasksCsvFile(state, exportedAt)
    const plans = createPlansCsvFile(state, exportedAt)
    expect(tasks.content.startsWith('\uFEFF"Task ID"')).toBe(true)
    expect(tasks.content).toContain(csvCell(state.tasks[0].title))
    expect(tasks.content).toContain(csvCell(state.tasks[1].title))
    expect(plans.content).toContain('"Accepted","2026-10-12","Scheduled block"')
    expect(plans.content).toContain('"Draft","2026-10-12","Unscheduled task"')
    expect(plans.content).toContain(csvCell(state.tasks[0].title))
    for (const file of [tasks, plans]) {
      expect(file.content).not.toContain('2026-10-05')
      expect(file.content).not.toContain('portable-history')
      expect(file.content).not.toContain('cycleLength')
    }
    expect(JSON.stringify(state)).toBe(before)
  })
})

async function openPrivacy(page: Page, state = sampleState()) {
  await page.clock.setFixedTime(new Date('2026-10-12T08:00:00Z'))
  await page.goto('/')
  await page.evaluate(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key: STORAGE_KEY, state })
  await page.reload()
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: 'More', exact: true }).click()
  await page.getByRole('button', { name: 'Privacy & data', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Back up & move your data' })).toBeVisible()
}

async function currentRaw(page: Page) { return page.evaluate(key => localStorage.getItem(key), STORAGE_KEY) }
async function chooseBackup(page: Page, content: string, name = 'plan4her-backup.json') {
  await page.getByLabel('Choose backup file', { exact: true }).setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(content) })
}
async function readDownload(download: Download): Promise<string> {
  const stream = await download.createReadStream()
  if (!stream) throw new Error('The download stream was unavailable')
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString('utf8')
}

test.describe('Data transfer browser', () => {
  test('explicit local downloads preserve JSON state and protect CSV formulas without leaking content', async ({ page }) => {
    const state = sampleState(`=1+1 ${marker}`)
    await openPrivacy(page, state)
    const before = await currentRaw(page)
    const leaks: string[] = []
    page.on('request', request => {
      if (request.url().includes(marker) || request.postData()?.includes(marker) || (/^https?:/.test(request.url()) && new URL(request.url()).origin !== new URL(page.url()).origin)) leaks.push(request.url())
    })
    await expect(page.getByText(/Exports are not encrypted/)).toBeVisible()
    const backupPending = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download full backup (JSON)', exact: true }).click()
    const backup = await backupPending
    expect(backup.suggestedFilename()).toMatch(/^plan4her-backup-.*\.json$/)
    expect(parseBackup(await readDownload(backup)).state).toEqual(JSON.parse(before!))
    for (const name of ['Download tasks (CSV)', 'Download plans (CSV)']) {
      const pending = page.waitForEvent('download')
      await page.getByRole('button', { name, exact: true }).click()
      const csv = await readDownload(await pending)
      expect(csv).toContain(`"'=1+1 ${marker}"`)
      expect(csv).not.toContain('2026-10-05')
    }
    expect(await currentRaw(page)).toBe(before)
    expect(leaks).toEqual([])
  })

  test('preview, checkbox and cancel never replace data; explicit restore persists and resets navigation', async ({ page }) => {
    await openPrivacy(page)
    const before = await currentRaw(page)
    const replacement = sampleState('Imported portable task 🌿')
    replacement.tasks = replacement.tasks.slice(0, 1)
    replacement.acceptedPlan!.unscheduled = []
    replacement.draftPlan = null
    replacement.history = []
    const content = createBackupFile(replacement, exportedAt).content
    await chooseBackup(page, content)
    const review = page.getByRole('region', { name: 'Review backup', exact: true })
    await expect(review).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Review backup', exact: true })).toBeFocused()
    await expect(page.getByRole('button', { name: 'Replace with this backup', exact: true })).toBeDisabled()
    expect(await currentRaw(page)).toBe(before)
    await page.getByRole('checkbox', { name: 'I understand this replaces the data on this device.' }).check()
    expect(await currentRaw(page)).toBe(before)
    await page.getByRole('button', { name: 'Cancel import', exact: true }).click()
    await expect(review).toHaveCount(0)
    await expect(page.getByLabel('Choose backup file', { exact: true })).toBeFocused()
    expect(await currentRaw(page)).toBe(before)
    await chooseBackup(page, content)
    await expect(page.getByRole('button', { name: 'Replace with this backup', exact: true })).toBeDisabled()
    await page.getByRole('checkbox', { name: 'I understand this replaces the data on this device.' }).check()
    await page.getByRole('button', { name: 'Replace with this backup', exact: true }).click()
    await expect.poll(async () => JSON.parse((await currentRaw(page))!)).toEqual(replacement)
    await expect(page.locator('.today-screen')).toBeVisible()
    await expect(page.locator('.today-screen')).toContainText('Imported portable task 🌿')
    await expect(page.locator('body')).not.toContainText(`Original ${marker}`)
    await page.reload()
    await expect(page.locator('.today-screen')).toContainText('Imported portable task 🌿')
    expect(JSON.parse((await currentRaw(page))!)).toEqual(replacement)
  })

  test('invalid files and oversized selections keep storage intact and cannot leave a previous preview actionable', async ({ page }) => {
    await openPrivacy(page)
    const before = await currentRaw(page)
    await chooseBackup(page, createBackupFile(sampleState('Pending valid task'), exportedAt).content)
    await expect(page.getByRole('heading', { name: 'Review backup', exact: true })).toBeVisible()
    const raw = createBackupFile(sampleState(), exportedAt).content
    for (const content of ['{"broken":', envelope(sampleState(), { formatVersion: 999 }), raw.replace('"state":{', '"state":{"__proto__":{"polluted":true},'), ' '.repeat(MAX_BACKUP_BYTES + 1)]) {
      await chooseBackup(page, content)
      await expect(page.locator('.data-transfer').getByRole('alert')).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Review backup', exact: true })).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Replace with this backup', exact: true })).toHaveCount(0)
      expect(await currentRaw(page)).toBe(before)
    }
    expect(await page.evaluate(() => Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted'))).toBe(false)
  })

  test('editing from Today after restore updates only the imported accepted plan and preserves a distinct draft', async ({ page }) => {
    await openPrivacy(page)
    const replacement = sampleState('Imported accepted task')
    replacement.draftPlan!.id = 'separate-imported-draft'
    replacement.draftPlan!.blocks = [makeBlock('task-portable', 'Separate imported draft task', '2026-10-12', 14 * 60, 45, { taskId: 'portable-task' })]
    const acceptedBefore = JSON.parse(JSON.stringify(replacement.acceptedPlan))
    const draftBefore = JSON.parse(JSON.stringify(replacement.draftPlan))
    await chooseBackup(page, createBackupFile(replacement, exportedAt).content)
    await page.getByRole('checkbox', { name: 'I understand this replaces the data on this device.' }).check()
    await page.getByRole('button', { name: 'Replace with this backup', exact: true }).click()
    await expect(page.locator('.today-screen')).toBeVisible()
    await page.getByRole('button', { name: 'Actions for Imported accepted task', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: /Edit or move/ }).click()
    await expect(page.getByRole('textbox', { name: 'Task', exact: true })).toHaveValue('Imported accepted task')
    await page.getByRole('textbox', { name: 'Task', exact: true }).fill('Edited imported accepted task')
    await chooseExactTime(page, '10:00')
    await page.getByRole('button', { name: 'Preview changes', exact: true }).click()
    await expect(page.locator('.adjust-scope-screen')).toBeVisible()
    await page.getByRole('radio', { name: /Rest of the week/ }).click()
    await page.getByRole('button', { name: 'Preview changes', exact: true }).click()
    const previewState: AppState = JSON.parse((await currentRaw(page))!)
    expect(previewState.acceptedPlan).toEqual(acceptedBefore)
    expect(previewState.draftPlan).toEqual(draftBefore)
    await expect(page.locator('.plan-diff-screen')).toContainText('09:00–09:45')
    await expect(page.locator('.plan-diff-screen')).not.toContainText('Separate imported draft task')
    await page.getByRole('button', { name: /^Apply changes?$/ }).click()
    await expect.poll(async () => JSON.parse((await currentRaw(page))!).acceptedPlan?.blocks[0].title).toBe('Edited imported accepted task')
    const applied: AppState = JSON.parse((await currentRaw(page))!)
    expect(applied.acceptedPlan!.blocks[0]).toMatchObject({ title: 'Edited imported accepted task', start: '10:00', time: '10:00–10:45' })
    expect(applied.draftPlan).toEqual(draftBefore)
    expect(applied.history.at(-1)?.before).toEqual(acceptedBefore)
    await page.reload()
    expect(JSON.parse((await currentRaw(page))!).draftPlan).toEqual(draftBefore)
    await expect(page.locator('.today-screen')).toContainText('Edited imported accepted task')
  })

  test('a failed local save keeps the previous data and preview so explicit restore can be retried', async ({ page }) => {
    await openPrivacy(page)
    const before = await currentRaw(page)
    const replacement = sampleState('Storage retry task')
    await chooseBackup(page, createBackupFile(replacement, exportedAt).content)
    await page.getByRole('checkbox', { name: 'I understand this replaces the data on this device.' }).check()
    await page.evaluate(key => {
      const original = Storage.prototype.setItem
      Storage.prototype.setItem = function (name, value) { if (name === key) throw new DOMException('Storage full', 'QuotaExceededError'); original.call(this, name, value) }
      Reflect.set(window, 'restoreStorageWrites', () => { Storage.prototype.setItem = original })
    }, STORAGE_KEY)
    await page.getByRole('button', { name: 'Replace with this backup', exact: true }).click()
    await expect(page.locator('.data-transfer').getByRole('alert')).toContainText(/could not be saved/)
    await expect(page.getByRole('heading', { name: 'Review backup', exact: true })).toBeVisible()
    expect(await currentRaw(page)).toBe(before)
    await page.evaluate(() => Reflect.get(window, 'restoreStorageWrites')())
    await page.getByRole('button', { name: 'Replace with this backup', exact: true }).click()
    await expect.poll(async () => JSON.parse((await currentRaw(page))!)).toEqual(replacement)
  })

  test('restoring in one tab blocks stale writes in another tab until it reloads the imported data', async ({ page, context }) => {
    await openPrivacy(page)
    const other = await context.newPage()
    await other.clock.setFixedTime(new Date('2026-10-12T08:00:00Z'))
    await other.goto('/')
    await other.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: 'Tasks', exact: true }).click()
    await expect(other.getByRole('button', { name: `Mark Original ${marker} done`, exact: true })).toBeVisible()
    const replacement = sampleState('Imported across two tabs')
    await chooseBackup(page, createBackupFile(replacement, exportedAt).content)
    await page.getByRole('checkbox', { name: 'I understand this replaces the data on this device.' }).check()
    await page.getByRole('button', { name: 'Replace with this backup', exact: true }).click()
    await expect(other.getByRole('button', { name: 'Reload saved data', exact: true })).toBeVisible()
    expect(JSON.parse((await currentRaw(other))!)).toEqual(replacement)
    // Dismissing the notice does not release the stale tab's write guard.
    await other.getByRole('button', { name: 'Dismiss', exact: true }).click()
    await other.getByRole('button', { name: `Mark Original ${marker} done`, exact: true }).click()
    await expect(other.getByRole('button', { name: 'Reload saved data', exact: true })).toBeVisible()
    expect(JSON.parse((await currentRaw(other))!)).toEqual(replacement)
    await other.getByRole('button', { name: 'Reload saved data', exact: true }).click()
    await expect(other.locator('.today-screen')).toContainText('Imported across two tabs')
    await expect(other.locator('body')).not.toContainText(`Original ${marker}`)
    expect(JSON.parse((await currentRaw(page))!)).toEqual(replacement)
    await other.close()
  })

  test('stale writes cannot replace an imported backup even when storage events have not reached the old tab', async ({ page, context }) => {
    await openPrivacy(page)
    const other = await context.newPage()
    // Model an event-loop gap: the stale tab has not received any notification.
    await other.addInitScript(() => window.addEventListener('storage', event => event.stopImmediatePropagation(), { capture: true }))
    await other.clock.setFixedTime(new Date('2026-10-12T08:00:00Z'))
    await other.goto('/')
    await other.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: 'Tasks', exact: true }).click()
    const replacement = sampleState('Imported before storage notification')
    await chooseBackup(page, createBackupFile(replacement, exportedAt).content)
    await page.getByRole('checkbox', { name: 'I understand this replaces the data on this device.' }).check()
    await page.getByRole('button', { name: 'Replace with this backup', exact: true }).click()
    await expect.poll(async () => JSON.parse((await currentRaw(page))!)).toEqual(replacement)
    await expect(other.getByRole('alert')).toHaveCount(0)
    await other.getByRole('button', { name: `Mark Original ${marker} done`, exact: true }).click()
    await expect(other.getByRole('alert')).toContainText(/changed|another tab|reload/i)
    expect(JSON.parse((await currentRaw(other))!)).toEqual(replacement)
    expect(JSON.parse((await currentRaw(page))!)).toEqual(replacement)
    await other.reload()
    await expect(other.locator('.today-screen')).toContainText('Imported before storage notification')
    await other.close()
  })

  test('canceling an in-flight file read prevents its late result from opening a replace preview', async ({ page }) => {
    await openPrivacy(page)
    const before = await currentRaw(page)
    await page.evaluate(() => {
      const read = File.prototype.text
      File.prototype.text = function () {
        const file = this
        return new Promise<string>((resolve, reject) => { Reflect.set(window, 'finishBackupRead', () => read.call(file).then(resolve, reject)) })
      }
    })
    await chooseBackup(page, createBackupFile(sampleState('Canceled late task'), exportedAt).content)
    await expect(page.getByText('Reading backup…', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Cancel import', exact: true }).click()
    await page.evaluate(() => Reflect.get(window, 'finishBackupRead')())
    await expect(page.getByText('Import canceled. Your current data has not been changed.', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Review backup', exact: true })).toHaveCount(0)
    expect(await currentRaw(page)).toBe(before)
  })

  test('320px import preview reflows and supports keyboard confirmation without accessibility violations', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    await openPrivacy(page)
    await chooseBackup(page, createBackupFile(sampleState(), exportedAt).content, `${'long-local-file-name-'.repeat(8)}.json`)
    const confirmation = page.getByRole('checkbox', { name: 'I understand this replaces the data on this device.' })
    await confirmation.focus()
    await confirmation.press('Space')
    await expect(confirmation).toBeChecked()
    const cancel = page.getByRole('button', { name: 'Cancel import', exact: true })
    await page.keyboard.press('Tab')
    await expect(cancel).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Replace with this backup', exact: true })).toBeFocused()
    const horizontalOverflow = await page.locator('.data-transfer').evaluate(element => element.scrollWidth > element.clientWidth)
    expect(horizontalOverflow).toBe(false)
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false)
    const accessibility = await new AxeBuilder({ page }).include('.data-transfer').analyze()
    expect(accessibility.violations).toEqual([])
    await cancel.press('Enter')
    await expect(page.getByLabel('Choose backup file', { exact: true })).toBeFocused()
  })
})
