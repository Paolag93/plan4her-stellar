import { dateFromISO, isISODate, localISO } from './planner'
import type { VaultLedgerEntry } from './savings'

/*
 * Rhythm Pool: one shared, ongoing community. Each member runs her own
 * four-week (28-day) challenge starting on a Monday, built from 3–5 weekly
 * commitments she picks from her existing Plan4Her schedule. Everything here
 * stays on this device: commitment titles, statuses and history are private
 * and never sent to Stellar, Pinata in plaintext, or any other member.
 * Completion is self-reported.
 */

export const RHYTHM_STORAGE_KEY = 'plan4her:rhythm:v1'
/** Earlier hackathon build; cleared with "Clear data", never read. */
export const LEGACY_COMMUNITY_KEY = 'plan4her:community:v1'
export const POOL_WEEKS = 4
export const POOL_DAYS = 28
export const MIN_COMMITMENTS = 3
export const MAX_COMMITMENTS = 5
export const REPLACEMENTS_PER_WEEK = 1
export const ELIGIBILITY_THRESHOLD = 0.7

export type CommitmentStatus = 'open' | 'done' | 'missed' | 'replaced'
export interface Commitment {
  id: string
  taskId: string
  title: string
  status: CommitmentStatus
  source?: 'manual' | 'task'
  replaces?: string
  replacedBy?: string
}
export interface WeekCommitments {
  week: number
  weekStart: string
  confirmedAt: string
  /** Original number of confirmed commitments: the week's fixed denominator. */
  count: number
  replacementsUsed: number
  items: Commitment[]
}
export interface AuditEvent { at: string; week: number; kind: 'confirmed' | 'done' | 'missed' | 'reopened' | 'replaced'; commitmentId: string; replacementId?: string }

export interface Participation {
  joinedOn: string
  startDate: string
  termsAcceptedAt: string
  shareProgress: boolean
  pledgeYield: boolean
  status: 'active' | 'left'
  leftOn?: string
  weeks: WeekCommitments[]
  audit: AuditEvent[]
}
export interface PastResult { startDate: string; done: number; denominator: number; ratio: number; eligible: boolean }

export interface CommunityState {
  version: 2
  participation: Participation | null
  history: PastResult[]
  savings: { optedIn: boolean; risksAcknowledgedAt?: string; ledger: VaultLedgerEntry[] }
  encryptedBackups: { cid: string; uploadedAt: string }[]
}

export function createCommunityState(): CommunityState {
  return { version: 2, participation: null, history: [], savings: { optedIn: false, ledger: [] }, encryptedBackups: [] }
}

export function addDays(iso: string, days: number): string {
  const date = dateFromISO(iso); date.setDate(date.getDate() + days); return localISO(date)
}
function daysBetween(from: string, to: string): number {
  return Math.round((dateFromISO(to).getTime() - dateFromISO(from).getTime()) / 86_400_000)
}

/** The challenge starts on the coming Monday; on a Monday it starts that day. */
export function nextMonday(today = localISO()): string {
  const offset = (8 - dateFromISO(today).getDay()) % 7
  return addDays(today, offset)
}
export function poolEndDate(p: Participation): string { return addDays(p.startDate, POOL_DAYS - 1) }
export function weekStartOf(p: Participation, week: number): string { return addDays(p.startDate, (week - 1) * 7) }

/** 0 = not started yet, 1–4 = running week, 5 = finished. */
export function currentWeek(p: Participation, today = localISO()): number {
  const days = daysBetween(p.startDate, today)
  if (days < 0) return 0
  return Math.min(POOL_WEEKS + 1, Math.floor(days / 7) + 1)
}

export function activeParticipation(state: CommunityState): Participation | null {
  return state.participation?.status === 'active' ? state.participation : null
}

export function joinPool(state: CommunityState, options: { shareProgress: boolean; pledgeYield: boolean }, today = localISO(), now = new Date()): CommunityState {
  if (activeParticipation(state)) throw new Error('You are already in the Rhythm Pool.')
  const archived = state.participation ? [...state.history, resultFor(state.participation, today)] : state.history
  return { ...state, history: archived, participation: { joinedOn: today, startDate: nextMonday(today), termsAcceptedAt: now.toISOString(), shareProgress: options.shareProgress, pledgeYield: options.pledgeYield, status: 'active', weeks: [], audit: [] } }
}

export function setSharing(state: CommunityState, patch: Partial<Pick<Participation, 'shareProgress' | 'pledgeYield'>>): CommunityState {
  if (!state.participation) return state
  return { ...state, participation: { ...state.participation, ...patch } }
}

/** Leaving keeps private history and never moves or penalizes savings. */
export function leavePool(state: CommunityState, today = localISO()): CommunityState {
  if (!activeParticipation(state)) return state
  return { ...state, participation: { ...state.participation!, status: 'left', leftOn: today } }
}

/** The week whose commitments can be chosen now: the current week, or week 1 before the start. */
export function editableWeek(p: Participation, today = localISO()): number | null {
  const week = Math.max(1, currentWeek(p, today))
  if (week > POOL_WEEKS) return null
  return p.weeks.some(w => w.week === week) ? null : week
}

export interface CommitmentChoice { taskId: string; title: string }

export function confirmCommitments(state: CommunityState, week: number, choices: CommitmentChoice[], today = localISO(), now = new Date()): CommunityState {
  const p = activeParticipation(state)
  if (!p) throw new Error('Join the Rhythm Pool first.')
  if (editableWeek(p, today) !== week) throw new Error('Commitments can only be set for the current week.')
  const unique = [...new Map(choices.map(c => [c.taskId, c])).values()]
  if (unique.length < MIN_COMMITMENTS || unique.length > MAX_COMMITMENTS) throw new Error(`Choose ${MIN_COMMITMENTS} to ${MAX_COMMITMENTS} commitments.`)
  const items: Commitment[] = unique.map((c, i) => ({ id: `w${week}-c${i + 1}`, taskId: c.taskId, title: c.title.slice(0, 200), status: 'open' }))
  const at = now.toISOString()
  const entry: WeekCommitments = { week, weekStart: weekStartOf(p, week), confirmedAt: at, count: items.length, replacementsUsed: 0, items }
  return { ...state, participation: { ...p, weeks: [...p.weeks, entry].sort((a, b) => a.week - b.week), audit: [...p.audit, ...items.map(item => ({ at, week, kind: 'confirmed' as const, commitmentId: item.id }))] } }
}

function updateWeek(state: CommunityState, week: number, fn: (w: WeekCommitments, p: Participation) => { week: WeekCommitments; events: AuditEvent[] }): CommunityState {
  const p = activeParticipation(state)
  if (!p) throw new Error('Join the Rhythm Pool first.')
  const target = p.weeks.find(w => w.week === week)
  if (!target) throw new Error('That week has no confirmed commitments.')
  const { week: next, events } = fn(target, p)
  return { ...state, participation: { ...p, weeks: p.weeks.map(w => w.week === week ? next : w), audit: [...p.audit, ...events] } }
}

/** Self-reported status. Future weeks and replaced items cannot be marked. */
export function setCommitmentStatus(state: CommunityState, week: number, id: string, status: 'done' | 'missed' | 'open', today = localISO(), now = new Date(), source: 'manual' | 'task' = 'manual'): CommunityState {
  return updateWeek(state, week, (w, p) => {
    if (currentWeek(p, today) < week) throw new Error('This week has not started yet.')
    const item = w.items.find(i => i.id === id)
    if (!item || item.status === 'replaced') throw new Error('This commitment can no longer change.')
    if (item.status === status) return { week: w, events: [] }
    const kind = status === 'open' ? 'reopened' : status
    return { week: { ...w, items: w.items.map(i => i.id === id ? { ...i, status, source } : i) }, events: [{ at: now.toISOString(), week, kind, commitmentId: id }] }
  })
}

/** Replaces one unfinished commitment per week; the denominator stays the same. */
export function replaceCommitment(state: CommunityState, week: number, id: string, choice: CommitmentChoice, now = new Date()): CommunityState {
  return updateWeek(state, week, w => {
    if (w.replacementsUsed >= REPLACEMENTS_PER_WEEK) throw new Error('You already replaced one commitment this week.')
    const item = w.items.find(i => i.id === id)
    if (!item || item.status === 'done' || item.status === 'replaced') throw new Error('Only an unfinished commitment can be replaced.')
    if (w.items.some(i => i.status !== 'replaced' && i.taskId === choice.taskId)) throw new Error('That task is already a commitment this week.')
    const replacement: Commitment = { id: `${id}-r`, taskId: choice.taskId, title: choice.title.slice(0, 200), status: 'open', replaces: id }
    const items = w.items.flatMap(i => i.id === id ? [{ ...i, status: 'replaced' as const, replacedBy: replacement.id }, replacement] : [i])
    return { week: { ...w, replacementsUsed: w.replacementsUsed + 1, items }, events: [{ at: now.toISOString(), week, kind: 'replaced', commitmentId: id, replacementId: replacement.id }] }
  })
}

/** Completing the linked task in Tasks/Today marks the current week's commitment done. */
export function syncTaskCompletion(state: CommunityState, taskId: string, done: boolean, today = localISO(), now = new Date()): CommunityState {
  const p = activeParticipation(state)
  if (!p) return state
  const week = currentWeek(p, today)
  const w = p.weeks.find(x => x.week === week)
  const item = w?.items.find(i => i.taskId === taskId && i.status !== 'replaced')
  if (!w || !item) return state
  if (done && item.status === 'open') return setCommitmentStatus(state, week, item.id, 'done', today, now, 'task')
  if (!done && item.status === 'done' && item.source === 'task') return setCommitmentStatus(state, week, item.id, 'open', today, now, 'task')
  return state
}

export interface WeekProgress { week: number; weekStart: string; confirmed: boolean; denominator: number; done: number; missed: number; open: number; elapsed: boolean }
export interface PoolProgress {
  week: number
  started: boolean
  ended: boolean
  daysUntilStart: number
  daysRemaining: number
  weeks: WeekProgress[]
  done: number
  denominator: number
  ratio: number
  eligible: boolean
}

/**
 * Aggregate four-week ratio = completed commitments / original confirmed count.
 * A week that ended without confirmed commitments counts as the minimum (3)
 * commitments not completed, so skipping weeks cannot raise the ratio. New
 * ordinary tasks never change the denominator.
 */
export function poolProgress(p: Participation, today = localISO()): PoolProgress {
  const week = currentWeek(p, today)
  const weeks: WeekProgress[] = []
  for (let n = 1; n <= POOL_WEEKS; n++) {
    const w = p.weeks.find(x => x.week === n)
    const elapsed = week > n
    const live = w ? w.items.filter(i => i.status !== 'replaced') : []
    const denominator = w ? w.count : elapsed ? MIN_COMMITMENTS : 0
    weeks.push({ week: n, weekStart: weekStartOf(p, n), confirmed: Boolean(w), denominator, done: live.filter(i => i.status === 'done').length, missed: live.filter(i => i.status === 'missed').length, open: live.filter(i => i.status === 'open').length, elapsed })
  }
  const done = weeks.reduce((s, w) => s + w.done, 0)
  const denominator = weeks.reduce((s, w) => s + w.denominator, 0)
  const ratio = denominator ? Math.min(1, done / denominator) : 0
  return {
    week, started: week >= 1, ended: week > POOL_WEEKS,
    daysUntilStart: Math.max(0, daysBetween(today, p.startDate)),
    daysRemaining: Math.max(0, daysBetween(today, poolEndDate(p))),
    weeks, done, denominator, ratio,
    eligible: week > POOL_WEEKS && ratio >= ELIGIBILITY_THRESHOLD,
  }
}

export function resultFor(p: Participation, today = localISO()): PastResult {
  const progress = poolProgress(p, today)
  return { startDate: p.startDate, done: progress.done, denominator: progress.denominator, ratio: progress.ratio, eligible: progress.ratio >= ELIGIBILITY_THRESHOLD }
}

/** Sample members are simulated for the demo; the pool works with one member. */
export const SAMPLE_MEMBER_RATES = [0.82, 0.64, 0.9, 0.45, 0.71, 0.77] as const
export function communityAggregate(state: CommunityState, today = localISO()): { sampleMembers: number; averageRate: number; includesYou: boolean } {
  const rates: number[] = [...SAMPLE_MEMBER_RATES]
  const p = activeParticipation(state)
  const includesYou = Boolean(p?.shareProgress && poolProgress(p, today).denominator > 0)
  if (p && includesYou) rates.push(poolProgress(p, today).ratio)
  return { sampleMembers: SAMPLE_MEMBER_RATES.length, averageRate: rates.reduce((s, r) => s + r, 0) / rates.length, includesYou }
}

// --- Persistence ----------------------------------------------------------------

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const isStr = (v: unknown, max = 256): v is string => typeof v === 'string' && v.length <= max
const intIn = (v: unknown, min: number, max: number) => Number.isInteger(v) && (v as number) >= min && (v as number) <= max
const digits = (v: unknown) => isStr(v, 40) && /^\d+$/.test(v)

function validParticipation(p: unknown): boolean {
  if (!isRecord(p) || !isISODate(p.joinedOn) || !isISODate(p.startDate) || dateFromISO(p.startDate as string).getDay() !== 1 || !isStr(p.termsAcceptedAt, 40)) return false
  if (typeof p.shareProgress !== 'boolean' || typeof p.pledgeYield !== 'boolean' || !['active', 'left'].includes(p.status as string) || (p.leftOn !== undefined && !isISODate(p.leftOn))) return false
  if (!Array.isArray(p.weeks) || p.weeks.length > POOL_WEEKS || !p.weeks.every(w => isRecord(w) && intIn(w.week, 1, POOL_WEEKS) && isISODate(w.weekStart) && isStr(w.confirmedAt, 40)
    && intIn(w.count, MIN_COMMITMENTS, MAX_COMMITMENTS) && intIn(w.replacementsUsed, 0, REPLACEMENTS_PER_WEEK)
    && Array.isArray(w.items) && w.items.length <= MAX_COMMITMENTS + REPLACEMENTS_PER_WEEK && w.items.filter(i => isRecord(i) && i.status !== 'replaced').length === w.count
    && w.items.every(i => isRecord(i) && isStr(i.id, 32) && isStr(i.taskId) && isStr(i.title, 200) && ['open', 'done', 'missed', 'replaced'].includes(i.status as string)
      && [i.replaces, i.replacedBy].every(x => x === undefined || isStr(x, 32)) && (i.source === undefined || ['manual', 'task'].includes(i.source as string))))) return false
  if (new Set(p.weeks.map(w => (w as WeekCommitments).week)).size !== p.weeks.length) return false
  return Array.isArray(p.audit) && p.audit.length <= 400 && p.audit.every(a => isRecord(a) && isStr(a.at, 40) && intIn(a.week, 1, POOL_WEEKS) && ['confirmed', 'done', 'missed', 'reopened', 'replaced'].includes(a.kind as string) && isStr(a.commitmentId, 32) && (a.replacementId === undefined || isStr(a.replacementId, 32)))
}

export function validateCommunityState(v: unknown): v is CommunityState {
  if (!isRecord(v) || v.version !== 2 || !(v.participation === null || validParticipation(v.participation))) return false
  if (!Array.isArray(v.history) || v.history.length > 100 || !v.history.every(h => isRecord(h) && isISODate(h.startDate) && intIn(h.done, 0, 100) && intIn(h.denominator, 0, 100) && typeof h.ratio === 'number' && h.ratio >= 0 && h.ratio <= 1 && typeof h.eligible === 'boolean')) return false
  const s = v.savings
  if (!isRecord(s) || typeof s.optedIn !== 'boolean' || (s.risksAcknowledgedAt !== undefined && !isStr(s.risksAcknowledgedAt, 40)) || !Array.isArray(s.ledger) || s.ledger.length > 500
    || !s.ledger.every(e => isRecord(e) && ['deposit', 'withdraw'].includes(e.kind as string) && isStr(e.txHash, 64) && /^[0-9a-f]{64}$/.test(e.txHash) && digits(e.amount) && digits(e.shares) && intIn(e.ledger, 0, 2 ** 32) && isStr(e.at, 40) && isStr(e.vaultId, 56))) return false
  return Array.isArray(v.encryptedBackups) && v.encryptedBackups.length <= 50 && v.encryptedBackups.every(b => isRecord(b) && isStr(b.cid, 128) && /^[a-zA-Z0-9]+$/.test(b.cid) && isStr(b.uploadedAt, 40))
}

export interface CommunityStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }

export function loadCommunity(storage?: CommunityStorage): { state: CommunityState; error?: string } {
  try {
    const raw = (storage ?? window.localStorage).getItem(RHYTHM_STORAGE_KEY)
    if (raw === null) return { state: createCommunityState() }
    const parsed: unknown = JSON.parse(raw)
    if (!validateCommunityState(parsed)) throw new Error('invalid')
    return { state: parsed }
  } catch { return { state: createCommunityState(), error: 'Rhythm Pool data could not be read. It has been kept on this device.' } }
}
export function saveCommunity(state: CommunityState, storage?: CommunityStorage): { error?: string } {
  try {
    if (!validateCommunityState(state)) throw new Error('invalid')
    ;(storage ?? window.localStorage).setItem(RHYTHM_STORAGE_KEY, JSON.stringify(state)); return {}
  } catch { return { error: 'Rhythm Pool changes could not be saved on this device.' } }
}
export function clearCommunity(storage?: CommunityStorage): void {
  try { const target = storage ?? window.localStorage; target.removeItem(RHYTHM_STORAGE_KEY); target.removeItem(LEGACY_COMMUNITY_KEY) } catch { /* storage unavailable */ }
}
