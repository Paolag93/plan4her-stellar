import type { TaskItem } from './types'
import { WORK_TYPES, type WorkType } from './cyclePreferences'
import { dateFromISO, isISODate, localISO } from './planner'

/*
 * Community challenges, personal goals, accountability partners and the
 * optional Testnet savings ledger. Everything here is local to this browser.
 * Community belonging never requires cycle data, a wallet or a deposit.
 */

export const COMMUNITY_STORAGE_KEY = 'plan4her:community:v1'
export const CHALLENGE_LENGTHS = [30, 90] as const
export type ChallengeLength = typeof CHALLENGE_LENGTHS[number]

export interface ChallengeTemplate {
  id: string
  title: string
  purpose: string
  lengthDays: ChallengeLength
  /** Sample members are simulated so the demo has a community to show. */
  sampleMemberRates: number[]
  custom?: boolean
}

export const CHALLENGE_CATALOG: readonly ChallengeTemplate[] = [
  { id: 'learn-30', title: '30-day learning rhythm', purpose: 'Members each pick something to learn and check in on their own schedule.', lengthDays: 30, sampleMemberRates: [0.82, 0.64, 0.9, 0.45, 0.71] },
  { id: 'move-90', title: '90-day gentle movement', purpose: 'Walks, yoga, stretching or sport: any movement goal you choose, at your own pace.', lengthDays: 90, sampleMemberRates: [0.58, 0.77, 0.69, 0.93] },
  { id: 'focus-30', title: '30-day focused work', purpose: 'Protect focus sessions for a project that matters to you.', lengthDays: 30, sampleMemberRates: [0.74, 0.51, 0.86] },
]

export interface PersonalGoal {
  title: string
  sessionsPerWeek: number
  minutesPerSession: number
  workType: WorkType
  /** Personal threshold used only for optional reward eligibility (0.5–1). */
  rewardThreshold: number
}

export interface CheckIn { date: string; source: 'manual' | 'task'; taskId?: string }

export interface Membership {
  challengeId: string
  title: string
  lengthDays: ChallengeLength
  startDate: string
  goal: PersonalGoal
  checkIns: CheckIn[]
  status: 'active' | 'left'
  leftDate?: string
}

export const SHARE_FIELDS = ['completionRate', 'checkInsThisWeek', 'streakDays', 'lastCheckInDate'] as const
export type ShareField = typeof SHARE_FIELDS[number]
export const SHARE_FIELD_LABELS: Record<ShareField, string> = {
  completionRate: 'Goal completion %',
  checkInsThisWeek: 'Check-ins this week',
  streakDays: 'Current streak (days)',
  lastCheckInDate: 'Date of last check-in',
}
/** Data that is never part of any partner or community view. */
export const NEVER_SHARED = ['Cycle context, phases or period dates', 'Symptoms, notes or journal', 'Task titles and plan details', 'Wallet address, balances or rewards'] as const

export interface Partner {
  id: string
  displayName: string
  status: 'pending' | 'active' | 'revoked'
  permissions: ShareField[]
  invitedAt: string
  acceptedAt?: string
  revokedAt?: string
}

export interface VaultLedgerEntry {
  kind: 'deposit' | 'withdraw'
  txHash: string
  /** Underlying asset in stroops (7 decimals), decimal string. */
  amount: string
  /** Vault shares minted (deposit) or burned (withdraw), decimal string. */
  shares: string
  ledger: number
  at: string
  vaultId: string
}

export interface CommunityState {
  version: 1
  memberships: Membership[]
  partners: Partner[]
  shareWithCommunity: boolean
  savings: { optedIn: boolean; risksAcknowledgedAt?: string; ledger: VaultLedgerEntry[] }
  encryptedBackups: { cid: string; uploadedAt: string }[]
}

export function createCommunityState(): CommunityState {
  return { version: 1, memberships: [], partners: [], shareWithCommunity: false, savings: { optedIn: false, ledger: [] }, encryptedBackups: [] }
}

export function addDays(iso: string, days: number): string {
  const date = dateFromISO(iso); date.setDate(date.getDate() + days); return localISO(date)
}
function daysBetween(from: string, to: string): number {
  return Math.round((dateFromISO(to).getTime() - dateFromISO(from).getTime()) / 86_400_000)
}
function weekStartOf(iso: string): string {
  const date = dateFromISO(iso); date.setDate(date.getDate() - ((date.getDay() + 6) % 7)); return localISO(date)
}

export function validateGoal(goal: PersonalGoal): string[] {
  const errors: string[] = []
  if (!goal.title.trim()) errors.push('Name your personal goal.')
  if (goal.title.length > 80) errors.push('Keep the goal name under 80 characters.')
  if (!Number.isInteger(goal.sessionsPerWeek) || goal.sessionsPerWeek < 1 || goal.sessionsPerWeek > 7) errors.push('Choose 1 to 7 sessions a week.')
  if (!Number.isInteger(goal.minutesPerSession) || goal.minutesPerSession < 5 || goal.minutesPerSession > 240) errors.push('Choose 5 to 240 minutes per session.')
  if (!WORK_TYPES.includes(goal.workType)) errors.push('Choose a work type.')
  if (!(goal.rewardThreshold >= 0.5 && goal.rewardThreshold <= 1)) errors.push('Choose a personal threshold between 50% and 100%.')
  return errors
}

export function challengeTemplate(id: string, state?: CommunityState): ChallengeTemplate | undefined {
  const known = CHALLENGE_CATALOG.find(item => item.id === id)
  if (known) return known
  const own = state?.memberships.find(item => item.challengeId === id)
  return own ? { id, title: own.title, purpose: 'Your own challenge. Invite partners to cheer you on.', lengthDays: own.lengthDays, sampleMemberRates: [], custom: true } : undefined
}

export function activeMembership(state: CommunityState): Membership | undefined {
  return state.memberships.find(item => item.status === 'active')
}

/** Joining is free: no wallet, deposit or cycle information is requested. */
export function joinChallenge(state: CommunityState, template: Pick<ChallengeTemplate, 'id' | 'title' | 'lengthDays'>, goal: PersonalGoal, today = localISO()): CommunityState {
  const errors = validateGoal(goal)
  if (errors.length) throw new Error(errors.join(' '))
  if (!CHALLENGE_LENGTHS.includes(template.lengthDays)) throw new Error('Challenges last 30 or 90 days.')
  if (activeMembership(state)) throw new Error('Leave your current challenge before joining another one.')
  const membership: Membership = { challengeId: template.id, title: template.title.trim().slice(0, 80), lengthDays: template.lengthDays, startDate: today, goal: { ...goal, title: goal.title.trim() }, checkIns: [], status: 'active' }
  return { ...state, memberships: [...state.memberships.filter(item => item.challengeId !== template.id), membership] }
}

export function updateGoal(state: CommunityState, challengeId: string, goal: PersonalGoal): CommunityState {
  const errors = validateGoal(goal)
  if (errors.length) throw new Error(errors.join(' '))
  return { ...state, memberships: state.memberships.map(item => item.challengeId === challengeId ? { ...item, goal: { ...goal, title: goal.title.trim() } } : item) }
}

/** Leaving keeps your private history and never affects any savings position. */
export function leaveChallenge(state: CommunityState, challengeId: string, today = localISO()): CommunityState {
  return { ...state, memberships: state.memberships.map(item => item.challengeId === challengeId && item.status === 'active' ? { ...item, status: 'left', leftDate: today } : item) }
}

export function challengeEndDate(membership: Membership): string { return addDays(membership.startDate, membership.lengthDays - 1) }

/** One check-in per day keeps progress honest and idempotent. */
export function recordCheckIn(state: CommunityState, challengeId: string, date = localISO(), source: CheckIn['source'] = 'manual', taskId?: string): CommunityState {
  return { ...state, memberships: state.memberships.map(item => {
    if (item.challengeId !== challengeId || item.status !== 'active') return item
    if (date < item.startDate || date > challengeEndDate(item) || item.checkIns.some(check => check.date === date)) return item
    const checkIn: CheckIn = taskId ? { date, source, taskId } : { date, source }
    return { ...item, checkIns: [...item.checkIns, checkIn].sort((a, b) => a.date.localeCompare(b.date)) }
  }) }
}

export function removeCheckIn(state: CommunityState, challengeId: string, date: string): CommunityState {
  return { ...state, memberships: state.memberships.map(item => item.challengeId === challengeId ? { ...item, checkIns: item.checkIns.filter(check => check.date !== date) } : item) }
}

export interface GoalProgress {
  dayNumber: number
  daysRemaining: number
  ended: boolean
  completed: number
  expected: number
  completionRate: number
  checkInsThisWeek: number
  streakDays: number
  lastCheckInDate: string | null
  checkedInToday: boolean
}

export function goalProgress(membership: Membership, today = localISO()): GoalProgress {
  const end = challengeEndDate(membership)
  const effectiveToday = today > end ? end : today
  const elapsed = Math.max(0, Math.min(membership.lengthDays, daysBetween(membership.startDate, effectiveToday) + 1))
  const inWindow = membership.checkIns.filter(check => check.date >= membership.startDate && check.date <= end)
  const completed = inWindow.length
  const expected = Math.max(1, Math.round(membership.goal.sessionsPerWeek * elapsed / 7))
  const week = weekStartOf(today)
  const dates = new Set(inWindow.map(check => check.date))
  let streak = 0
  let cursor = dates.has(today) ? today : addDays(today, -1)
  while (dates.has(cursor)) { streak++; cursor = addDays(cursor, -1) }
  return {
    dayNumber: elapsed,
    daysRemaining: Math.max(0, daysBetween(effectiveToday, end)),
    ended: today > end,
    completed,
    expected,
    completionRate: Math.min(1, completed / expected),
    checkInsThisWeek: inWindow.filter(check => check.date >= week && check.date <= today).length,
    streakDays: streak,
    lastCheckInDate: inWindow.at(-1)?.date ?? null,
    checkedInToday: dates.has(today),
  }
}

/** Eligibility compares a member only with her own goal and threshold. */
export function rewardEligible(membership: Membership, today = localISO()): boolean {
  return goalProgress(membership, today).completionRate >= membership.goal.rewardThreshold
}

/**
 * Builds this week's habit sessions as ordinary flexible tasks so the existing
 * cycle-aware planner can place them. Deterministic ids prevent duplicates.
 */
export function goalSessionTasks(membership: Membership, weekStart: string, existing: TaskItem[]): TaskItem[] {
  if (!isISODate(weekStart)) throw new Error('Choose a valid week.')
  const ids = new Set(existing.map(task => task.id))
  const deadline = addDays(weekStart, 6) > challengeEndDate(membership) ? challengeEndDate(membership) : addDays(weekStart, 6)
  const tasks: TaskItem[] = []
  for (let n = 1; n <= membership.goal.sessionsPerWeek; n++) {
    const id = goalTaskId(membership.challengeId, weekStart, n)
    if (ids.has(id)) continue
    tasks.push({ id, title: `${membership.goal.title} · session ${n}/${membership.goal.sessionsPerWeek}`, meta: `${membership.goal.minutesPerSession} min`, kind: 'Flexible', duration: `${membership.goal.minutesPerSession} min`, deadline, importance: 'Important', workType: membership.goal.workType })
  }
  return tasks
}
export function goalTaskId(challengeId: string, weekStart: string, n: number): string { return `goal-${challengeId}-${weekStart}-${n}` }
export function challengeForGoalTask(taskId: string, state: CommunityState): string | null {
  const match = state.memberships.find(item => taskId.startsWith(`goal-${item.challengeId}-`))
  return match?.challengeId ?? null
}

// --- Accountability partners -------------------------------------------------

export function invitePartner(state: CommunityState, displayName: string, permissions: ShareField[], now = new Date()): CommunityState {
  const name = displayName.trim()
  if (!name) throw new Error('Add a name or nickname for your partner.')
  if (name.length > 40) throw new Error('Keep the partner name under 40 characters.')
  if (state.partners.filter(item => item.status !== 'revoked').length >= 5) throw new Error('You can have up to 5 partners.')
  const safe = permissions.filter((field): field is ShareField => SHARE_FIELDS.includes(field))
  const partner: Partner = { id: `partner-${now.getTime().toString(36)}-${state.partners.length}`, displayName: name, status: 'pending', permissions: [...new Set(safe)], invitedAt: now.toISOString() }
  return { ...state, partners: [...state.partners, partner] }
}

/** Local demo only: there is no second account, so acceptance is simulated. */
export function simulatePartnerAccept(state: CommunityState, partnerId: string, now = new Date()): CommunityState {
  return { ...state, partners: state.partners.map(item => item.id === partnerId && item.status === 'pending' ? { ...item, status: 'active', acceptedAt: now.toISOString() } : item) }
}

export function setPartnerPermissions(state: CommunityState, partnerId: string, permissions: ShareField[]): CommunityState {
  const safe = [...new Set(permissions.filter((field): field is ShareField => SHARE_FIELDS.includes(field)))]
  return { ...state, partners: state.partners.map(item => item.id === partnerId && item.status !== 'revoked' ? { ...item, permissions: safe } : item) }
}

/** Revocation stops future access. It cannot recall what a partner already saw. */
export function revokePartner(state: CommunityState, partnerId: string, now = new Date()): CommunityState {
  return { ...state, partners: state.partners.map(item => item.id === partnerId ? { ...item, status: 'revoked', permissions: [], revokedAt: now.toISOString() } : item) }
}

export type PartnerView =
  | { status: 'revoked' | 'pending' | 'no-goal' }
  | { status: 'active'; challengeTitle: string; fields: Partial<Record<ShareField, string | number | null>> }

/** The only function that produces partner-visible data. It is allow-list based. */
export function partnerView(state: CommunityState, partnerId: string, today = localISO()): PartnerView {
  const partner = state.partners.find(item => item.id === partnerId)
  if (!partner || partner.status === 'revoked') return { status: 'revoked' }
  if (partner.status === 'pending') return { status: 'pending' }
  const membership = activeMembership(state)
  if (!membership) return { status: 'no-goal' }
  const progress = goalProgress(membership, today)
  const all: Record<ShareField, string | number | null> = {
    completionRate: Math.round(progress.completionRate * 100),
    checkInsThisWeek: progress.checkInsThisWeek,
    streakDays: progress.streakDays,
    lastCheckInDate: progress.lastCheckInDate,
  }
  const fields: Partial<Record<ShareField, string | number | null>> = {}
  for (const field of partner.permissions) if (SHARE_FIELDS.includes(field)) fields[field] = all[field]
  return { status: 'active', challengeTitle: membership.title, fields }
}

/** Voluntary group aggregate. Sample members are simulated and labelled as such. */
export function communityAggregate(state: CommunityState, template: ChallengeTemplate, today = localISO()): { members: number; averageRate: number | null; includesYou: boolean } {
  const rates = [...template.sampleMemberRates]
  const own = state.memberships.find(item => item.challengeId === template.id && item.status === 'active')
  const includesYou = Boolean(own && state.shareWithCommunity)
  if (own && includesYou) rates.push(goalProgress(own, today).completionRate)
  return { members: template.sampleMemberRates.length + (own ? 1 : 0), averageRate: rates.length ? rates.reduce((sum, rate) => sum + rate, 0) / rates.length : null, includesYou }
}

// --- Savings accounting (stroops as bigint) -----------------------------------

export const STROOPS_PER_UNIT = 10_000_000n

/** Parses a user-entered XLM amount to stroops without floating-point rounding. */
export function parseAmount(input: string): bigint {
  const text = input.trim().replace(',', '.')
  if (!/^\d+(\.\d{1,7})?$/.test(text)) throw new Error('Enter an amount with up to 7 decimal places.')
  const [whole, fraction = ''] = text.split('.')
  const value = BigInt(whole) * STROOPS_PER_UNIT + BigInt(fraction.padEnd(7, '0'))
  if (value <= 0n) throw new Error('Enter an amount greater than zero.')
  return value
}

export function formatAmount(stroops: bigint, symbol = 'XLM'): string {
  const negative = stroops < 0n
  const abs = negative ? -stroops : stroops
  const whole = abs / STROOPS_PER_UNIT
  const fraction = (abs % STROOPS_PER_UNIT).toString().padStart(7, '0').replace(/0+$/, '')
  return `${negative ? '−' : ''}${whole.toString()}${fraction ? `.${fraction}` : ''} ${symbol}`.trim()
}

/** Minimum accepted output after slippage, rounded down. */
export function minWithSlippage(amount: bigint, slippageBps: number): bigint {
  if (!Number.isInteger(slippageBps) || slippageBps < 0 || slippageBps > 10_000) throw new Error('Invalid slippage.')
  return amount * BigInt(10_000 - slippageBps) / 10_000n
}

export interface PositionSummary {
  /** Remaining cost basis of shares still held (average-cost method). */
  contributed: bigint
  shares: bigint
  totalDeposited: bigint
  totalWithdrawn: bigint
  /** Net realized result of withdrawals; negative means a realized loss. */
  realized: bigint
  /** Current redeemable value minus remaining cost basis; may be negative. */
  unrealized: bigint | null
  redeemable: bigint | null
}

/**
 * Confirmed ledger entries only. Average-cost basis: each withdrawal realizes
 * amountOut − (basis × sharesBurned / sharesHeld). Rounding favours a lower
 * realized gain so yield is never overstated.
 */
export function positionSummary(ledger: VaultLedgerEntry[], redeemable: bigint | null = null): PositionSummary {
  let basis = 0n, shares = 0n, realized = 0n, deposited = 0n, withdrawn = 0n
  for (const entry of ledger) {
    const amount = BigInt(entry.amount), delta = BigInt(entry.shares)
    if (amount < 0n || delta < 0n) throw new Error('Ledger amounts must be positive.')
    if (entry.kind === 'deposit') { basis += amount; shares += delta; deposited += amount }
    else {
      if (delta > shares || shares === 0n) throw new Error('Withdrawal exceeds recorded shares.')
      const basisOut = delta === shares ? basis : (basis * delta + shares - 1n) / shares
      realized += amount - basisOut
      basis -= basisOut; shares -= delta; withdrawn += amount
    }
  }
  return { contributed: basis, shares, totalDeposited: deposited, totalWithdrawn: withdrawn, realized, redeemable, unrealized: redeemable === null ? null : redeemable - basis }
}

export interface RewardParticipant { id: string; realizedYield: bigint; principal: bigint; eligible: boolean }
export interface RewardAllocation { pot: bigint; pledgePercent: number; allocations: Record<string, bigint>; unallocated: bigint; principalTouched: false }

/**
 * SIMULATION of an agreed community rule: each participant pledges a share of
 * her own positive net realized yield. Principal is never part of the pot and
 * negative results contribute nothing. Eligible members split the pot equally;
 * if nobody is eligible the pot stays with its contributors (unallocated).
 */
export function simulateRewardPool(participants: RewardParticipant[], pledgePercent = 20): RewardAllocation {
  if (!Number.isInteger(pledgePercent) || pledgePercent < 0 || pledgePercent > 100) throw new Error('Pledge must be 0–100%.')
  const pot = participants.reduce((sum, p) => sum + (p.realizedYield > 0n ? p.realizedYield * BigInt(pledgePercent) / 100n : 0n), 0n)
  const eligible = participants.filter(p => p.eligible)
  const allocations: Record<string, bigint> = Object.fromEntries(participants.map(p => [p.id, 0n]))
  if (!eligible.length || pot === 0n) return { pot, pledgePercent, allocations, unallocated: pot, principalTouched: false }
  const each = pot / BigInt(eligible.length)
  for (const p of eligible) allocations[p.id] = each
  return { pot, pledgePercent, allocations, unallocated: pot - each * BigInt(eligible.length), principalTouched: false }
}

// --- Persistence ----------------------------------------------------------------

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const isStr = (v: unknown, max = 256): v is string => typeof v === 'string' && v.length <= max
const intIn = (v: unknown, min: number, max: number) => Number.isInteger(v) && (v as number) >= min && (v as number) <= max
const digits = (v: unknown) => isStr(v, 40) && /^\d+$/.test(v)

export function validateCommunityState(v: unknown): v is CommunityState {
  if (!isRecord(v) || v.version !== 1 || typeof v.shareWithCommunity !== 'boolean') return false
  if (!Array.isArray(v.memberships) || v.memberships.length > 50 || !v.memberships.every(m => isRecord(m)
    && isStr(m.challengeId, 64) && isStr(m.title, 80) && CHALLENGE_LENGTHS.includes(m.lengthDays as ChallengeLength) && isISODate(m.startDate)
    && ['active', 'left'].includes(m.status as string) && (m.leftDate === undefined || isISODate(m.leftDate))
    && isRecord(m.goal) && validateGoal(m.goal as unknown as PersonalGoal).length === 0
    && Array.isArray(m.checkIns) && m.checkIns.length <= 400 && m.checkIns.every(c => isRecord(c) && isISODate(c.date) && ['manual', 'task'].includes(c.source as string) && (c.taskId === undefined || isStr(c.taskId))))) return false
  if (v.memberships.filter(m => (m as Membership).status === 'active').length > 1) return false
  if (!Array.isArray(v.partners) || v.partners.length > 50 || !v.partners.every(p => isRecord(p) && isStr(p.id, 64) && isStr(p.displayName, 40)
    && ['pending', 'active', 'revoked'].includes(p.status as string) && Array.isArray(p.permissions) && p.permissions.every(f => SHARE_FIELDS.includes(f as ShareField))
    && isStr(p.invitedAt, 40) && [p.acceptedAt, p.revokedAt].every(x => x === undefined || isStr(x, 40)))) return false
  const s = v.savings
  if (!isRecord(s) || typeof s.optedIn !== 'boolean' || (s.risksAcknowledgedAt !== undefined && !isStr(s.risksAcknowledgedAt, 40)) || !Array.isArray(s.ledger) || s.ledger.length > 500
    || !s.ledger.every(e => isRecord(e) && ['deposit', 'withdraw'].includes(e.kind as string) && isStr(e.txHash, 64) && /^[0-9a-f]{64}$/.test(e.txHash) && digits(e.amount) && digits(e.shares) && intIn(e.ledger, 0, 2 ** 32) && isStr(e.at, 40) && isStr(e.vaultId, 56))) return false
  return Array.isArray(v.encryptedBackups) && v.encryptedBackups.length <= 50 && v.encryptedBackups.every(b => isRecord(b) && isStr(b.cid, 128) && /^[a-zA-Z0-9]+$/.test(b.cid) && isStr(b.uploadedAt, 40))
}

export interface CommunityStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }

export function loadCommunity(storage?: CommunityStorage): { state: CommunityState; error?: string } {
  try {
    const raw = (storage ?? window.localStorage).getItem(COMMUNITY_STORAGE_KEY)
    if (raw === null) return { state: createCommunityState() }
    const parsed: unknown = JSON.parse(raw)
    if (!validateCommunityState(parsed)) throw new Error('invalid')
    return { state: parsed }
  } catch { return { state: createCommunityState(), error: 'Community data could not be read. It has been kept on this device.' } }
}
export function saveCommunity(state: CommunityState, storage?: CommunityStorage): { error?: string } {
  try {
    if (!validateCommunityState(state)) throw new Error('invalid')
    ;(storage ?? window.localStorage).setItem(COMMUNITY_STORAGE_KEY, JSON.stringify(state)); return {}
  } catch { return { error: 'Community changes could not be saved on this device.' } }
}
export function clearCommunity(storage?: CommunityStorage): void {
  try { (storage ?? window.localStorage).removeItem(COMMUNITY_STORAGE_KEY) } catch { /* storage unavailable */ }
}
