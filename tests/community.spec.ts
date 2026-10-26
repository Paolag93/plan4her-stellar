import { expect, test, type Page } from '@playwright/test'
import { STORAGE_KEY } from '../src/domain/persistence'
import { RHYTHM_STORAGE_KEY } from '../src/domain/community'

const MONDAY = new Date('2026-10-12T08:00:00Z')
const community = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), RHYTHM_STORAGE_KEY)
const nav = (page: Page, name: string) => page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name, exact: true }).click()

async function onboardWithCycle(page: Page) {
  await page.clock.setFixedTime(MONDAY)
  await page.goto('/')
  await page.getByRole('button', { name: 'Build my first week', exact: true }).click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('button', { name: 'Continue without cycle context', exact: true }).click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('button', { name: 'Skip for now', exact: true }).click()
  await expect(page.locator('.review-plan-screen')).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: 'Accept week', exact: true }).click()
}

test('Rhythm Pool: review terms, set 3–5 weekly commitments, track truthfully, replace one, persist, sync with Tasks and Today', async ({ page }) => {
  const external: string[] = []
  page.on('request', r => { if (!r.url().startsWith('http://127.0.0.1')) external.push(r.url()) })
  await onboardWithCycle(page)
  await nav(page, 'More')
  await page.getByRole('button', { name: 'Rhythm Pool', exact: true }).click()
  await expect(page.getByTestId('rhythm-home')).toContainText('You can start on your own')
  await page.getByRole('button', { name: 'Join Rhythm Pool', exact: true }).click()
  await expect(page.getByTestId('rhythm-terms')).toContainText('28 days, four complete weeks')
  const join = page.getByRole('button', { name: 'Join the Rhythm Pool', exact: true })
  await expect(join).toBeDisabled()
  await page.getByRole('checkbox', { name: 'I accept the Rhythm Pool terms' }).click()
  await join.click()
  // Joined on a Monday: week 1 starts today. Commitments come from the existing schedule.
  const pick = page.getByTestId('rhythm-commitments')
  await expect(pick).toContainText('Week of Mon 12 Oct')
  const options = pick.getByRole('checkbox')
  expect(await options.count()).toBeGreaterThanOrEqual(4)
  const confirm = page.getByRole('button', { name: 'Confirm commitments', exact: true })
  await options.nth(0).check(); await options.nth(1).check()
  await expect(confirm).toBeDisabled()
  await options.nth(2).check()
  await confirm.click()
  const progress = page.getByTestId('rhythm-progress')
  await expect(progress).toContainText('Week 1 of 4')
  const cards = page.getByTestId('commitment')
  await expect(cards).toHaveCount(3)
  await cards.nth(0).getByRole('button', { name: 'Done', exact: true }).click()
  await cards.nth(1).getByRole('button', { name: 'Missed', exact: true }).click()
  await expect(progress).toContainText('1 of 3 commitments completed')
  // Replace one unfinished commitment: the denominator stays 3 and history is kept.
  await cards.nth(2).getByRole('button', { name: 'Replace', exact: true }).click()
  await page.getByTestId('rhythm-commitments').getByRole('checkbox').first().check()
  await page.getByRole('button', { name: 'Replace commitment', exact: true }).click()
  await expect(cards).toHaveCount(4)
  await expect(cards.nth(2)).toContainText('Replaced')
  await expect(page.getByRole('button', { name: 'Replace', exact: true })).toHaveCount(0)
  await expect(progress).toContainText('1 of 3 commitments completed')
  const saved = await community(page)
  expect(saved.participation).toMatchObject({ startDate: '2026-10-12', shareProgress: false, pledgeYield: false })
  expect(saved.participation.weeks[0].count).toBe(3)
  expect(saved.participation.audit.map((a: { kind: string }) => a.kind)).toEqual(expect.arrayContaining(['confirmed', 'done', 'missed', 'replaced']))
  expect(saved.savings.ledger).toEqual([])
  // Completing the replacement task in Tasks marks the commitment done; Today reflects it after reload.
  const replacementTitle: string = saved.participation.weeks[0].items.find((i: { replaces?: string }) => i.replaces).title
  await page.reload()
  await nav(page, 'Tasks')
  await page.getByRole('button', { name: `Mark ${replacementTitle} done`, exact: true }).first().click()
  await nav(page, 'Today')
  await expect(page.getByRole('region', { name: 'Rhythm Pool' })).toContainText('2 of 3 commitments done this week')
  // Private commitment names, schedules and cycle data never left the browser.
  expect(external).toEqual([])
})


test('savings is optional, gated by explicit risk consent, and fails safely without a wallet', async ({ page }) => {
  await page.goto('/?qa=savings')
  const go = page.getByRole('button', { name: 'I understand, continue', exact: true })
  await expect(go).toBeDisabled()
  await expect(page.getByTestId('savings-optin')).toContainText('The Rhythm Pool and planning work fully without this')
  await page.getByRole('checkbox', { name: 'Testnet only: no real money' }).click()
  await page.getByRole('checkbox', { name: 'My deposit is not guaranteed' }).click()
  await expect(go).toBeDisabled()
  await page.getByRole('checkbox', { name: 'No penalties for missed commitments' }).click()
  await go.click()
  await expect(page.getByTestId('savings')).toContainText('Stellar Testnet')
  await expect(page.getByTestId('position')).toContainText('Not verified for this Testnet vault')
  await expect(page.getByRole('button', { name: 'Review deposit' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Connect Freighter (Testnet)', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Freighter was not detected', { timeout: 10000 })
})

test('rewards are labelled as a simulation and never include principal', async ({ page }) => {
  await page.goto('/?qa=rewards')
  await expect(page.getByTestId('rewards-simulation')).toContainText('SIMULATION: no rewards are paid')
  await expect(page.getByTestId('rewards-simulation')).toContainText('Deposits (principal) are never part of the pot')
  await expect(page.getByTestId('reward-table')).toContainText('None confirmed')
  await expect(page.getByTestId('reward-table')).toContainText('No verified yield yet')
})

test('encrypted backup: ciphertext download, wrong passphrase rejected, restore roundtrip', async ({ page }) => {
  await page.goto('/?qa=backup')
  await expect(page.getByTestId('ipfs-unavailable')).toContainText('IPFS upload is not enabled', { timeout: 10000 })
  const pass = 'synthetic demo passphrase'
  await page.getByLabel('Passphrase (12+ characters)').fill(pass)
  await page.getByLabel('Repeat passphrase').fill(pass)
  const download = page.getByRole('button', { name: 'Download encrypted file', exact: true })
  await expect(download).toBeDisabled()
  await page.getByRole('checkbox', { name: "I understand a lost passphrase can't be recovered" }).click()
  const [file] = await Promise.all([page.waitForEvent('download'), download.click()])
  const path = await file.path()
  const text = await (await import('node:fs/promises')).readFile(path, 'utf8')
  const envelope = JSON.parse(text)
  expect(Object.keys(envelope).sort()).toEqual(['data', 'format', 'kdf', 'v', 'wrap'])
  for (const plain of ['cycle', 'tasks', 'Study', 'plan4her-encrypted-bundle']) expect(text).not.toContain(plain)
  await page.getByLabel('Choose encrypted backup file').setInputFiles(path)
  await page.getByLabel('Passphrase for this backup').fill('not the right passphrase')
  await page.getByRole('button', { name: 'Decrypt', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Wrong passphrase', { timeout: 15000 })
  await page.getByLabel('Passphrase for this backup').fill(pass)
  await page.getByRole('button', { name: 'Decrypt', exact: true }).click()
  await expect(page.getByLabel('Confirm restore')).toContainText('Replace data on this device?', { timeout: 15000 })
})

test('More keeps the four-tab navigation and adds Rhythm Pool entries without partners', async ({ page }) => {
  await page.goto('/?qa=more')
  await expect(page.getByRole('navigation', { name: 'Primary' }).getByRole('button')).toHaveText(['Today', 'Plan', 'Tasks', 'More'])
  await expect(page.getByRole('button', { name: 'Accountability partners' })).toHaveCount(0)
  for (const name of ['Rhythm Pool', 'Savings & rewards · Testnet', 'Encrypted backup']) await expect(page.getByRole('button', { name, exact: true })).toBeVisible()
})

for (const width of [320, 390, 768]) test(`new screens keep 44px touch targets and no horizontal scroll at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 })
  for (const qa of ['community', 'rhythm-terms', 'community-commitments', 'community-progress', 'community-result', 'savings', 'backup']) {
    await page.goto(`/?qa=${qa}`)
    await page.locator('main').waitFor()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    const small = await page.locator('main button:visible').evaluateAll(els => els.filter(el => { const r = el.getBoundingClientRect(); return r.height < 44 || r.width < 44 }).map(el => el.textContent))
    expect(small, qa).toEqual([])
  }
})

test('four-week result shows the aggregate ratio against the 70% threshold', async ({ page }) => {
  await page.goto('/?qa=community-result')
  const progress = page.getByTestId('rhythm-progress')
  await expect(progress).toContainText('Your four-week result')
  await expect(progress).toContainText('You completed 75% of your commitments and reached the 70% threshold')
  await expect(page.getByRole('button', { name: 'Start another four weeks', exact: true })).toBeVisible()
})
