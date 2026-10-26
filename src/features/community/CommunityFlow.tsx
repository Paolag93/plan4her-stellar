import { useEffect, useState } from 'react'
import type { RootTab } from '../../components/BottomNav'
import type { AppState, TaskItem } from '../../domain'
import { dateFromISO } from '../../domain/planner'
import {
  activeParticipation, addDays, confirmCommitments, createCommunityState, joinPool, leavePool, replaceCommitment, setCommitmentStatus,
  type Commitment, type CommunityState,
} from '../../domain/community'
import { CommitmentsScreen, LeaveConfirmScreen, RhythmHomeScreen, RhythmProgressScreen, TermsScreen } from './RhythmScreens'
import { RewardsSimulationScreen, SavingsScreen } from './SavingsScreens'
import { EncryptedBackupScreen, type BackupBundle } from './EncryptedBackupScreen'

export type CommunityEntry = 'community' | 'progress' | 'savings' | 'backup'
type View =
  | { name: 'home' } | { name: 'terms' } | { name: 'progress' } | { name: 'leave' }
  | { name: 'commitments'; week: number } | { name: 'replace'; week: number; item: Commitment }
  | { name: 'savings' } | { name: 'rewards' } | { name: 'backup' }

/** Synthetic fixtures for screenshot QA (`?qa=`). Never persisted. */
export function communityFixture(qa: string | null, today: string): CommunityState {
  const state = createCommunityState()
  if (!qa || qa === 'community' || qa === 'rhythm-terms' || qa === 'backup') return state
  const thisMonday = addDays(today, -((dateFromISO(today).getDay() + 6) % 7))
  const ended = qa === 'community-result'
  const startDate = ended ? addDays(thisMonday, -28) : qa === 'community-commitments' ? thisMonday : addDays(thisMonday, -7)
  const choices = [['dentist', 'Call dentist'], ['groceries', 'Buy groceries'], ['yoga', 'Yoga class'], ['meeting', 'Team meeting']].map(([taskId, title]) => ({ taskId, title }))
  let s: CommunityState = { ...state, participation: { joinedOn: addDays(startDate, -2), startDate, termsAcceptedAt: `${addDays(startDate, -2)}T09:00:00.000Z`, shareProgress: true, pledgeYield: false, status: 'active', weeks: [], audit: [] } }
  if (qa === 'community-commitments') return s
  const weeks = ended ? [1, 2, 3, 4] : [1, 2]
  for (const week of weeks) {
    const weekDay = addDays(startDate, (week - 1) * 7)
    s = confirmCommitments(s, week, choices.slice(0, week === 2 && !ended ? 3 : 4), weekDay)
    if (week === 2 && !ended) { s = setCommitmentStatus(s, 2, 'w2-c1', 'done', weekDay); continue }
    for (const n of [1, 2, 3]) s = setCommitmentStatus(s, week, `w${week}-c${n}`, 'done', weekDay)
    s = setCommitmentStatus(s, week, `w${week}-c4`, 'missed', weekDay)
  }
  if (qa === 'savings-optedin' || qa === 'rewards') s = { ...s, savings: { ...s.savings, optedIn: true, risksAcknowledgedAt: `${today}T10:00:00.000Z` } }
  return s
}

export function entryFromQa(qa: string | null): CommunityEntry | null {
  if (qa === 'community' || qa === 'rhythm-terms') return 'community'
  if (qa === 'community-progress' || qa === 'community-commitments' || qa === 'community-result') return 'progress'
  if (qa?.startsWith('savings') || qa === 'rewards') return 'savings'
  if (qa === 'backup') return 'backup'
  return null
}

function initialView(entry: CommunityEntry, state: CommunityState, qa?: string | null): View {
  if (qa === 'rewards') return { name: 'rewards' }
  if (qa === 'rhythm-terms') return { name: 'terms' }
  if (qa === 'community-commitments') return { name: 'commitments', week: 1 }
  if (entry === 'progress') return activeParticipation(state) ? { name: 'progress' } : { name: 'home' }
  if (entry === 'savings') return { name: 'savings' }
  if (entry === 'backup') return { name: 'backup' }
  return { name: 'home' }
}

export interface CommunityFlowProps {
  entry: CommunityEntry
  navigationKey: number
  community: CommunityState
  app: AppState
  tasks: TaskItem[]
  today: string
  qa?: string | null
  onChange: (next: CommunityState) => boolean
  onExit: () => void
  onNavigate: (tab: RootTab) => void
  onRestore: (bundle: BackupBundle) => { error?: string }
}

export function CommunityFlow({ entry, navigationKey, community, app, tasks, today, qa, onChange, onExit, onNavigate, onRestore }: CommunityFlowProps) {
  const [stack, setStack] = useState<View[]>(() => [initialView(entry, community, qa)])
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { if (navigationKey > 0) setStack([initialView(entry, community)]) }, [navigationKey])
  const view = stack.at(-1)!
  const push = (next: View) => { setError(null); setStack(current => [...current, next]) }
  const back = () => { setError(null); if (stack.length > 1) setStack(current => current.slice(0, -1)); else onExit() }
  const reset = (next: View) => { setError(null); setStack([next]) }
  const apply = (fn: (s: CommunityState) => CommunityState) => { try { const ok = onChange(fn(community)); if (ok) setError(null); return ok } catch (e) { setError(e instanceof Error ? e.message : 'That change could not be saved.'); return false } }
  const participation = activeParticipation(community)

  switch (view.name) {
    case 'home': return <RhythmHomeScreen community={community} today={today} onBack={back} onNavigate={onNavigate} onTerms={() => push({ name: 'terms' })} onProgress={() => push({ name: 'progress' })} />
    case 'terms': return <TermsScreen today={today} onBack={back} error={error} onJoin={options => { if (apply(s => joinPool(s, options, today))) reset({ name: 'commitments', week: 1 }) }} />
    case 'commitments': return participation ? <CommitmentsScreen participation={participation} week={view.week} tasks={tasks} mode="set" today={today} error={error} onBack={() => reset({ name: 'progress' })} onAddTasks={() => onNavigate('tasks')}
      onConfirm={choices => { if (apply(s => confirmCommitments(s, view.week, choices, today))) reset({ name: 'progress' }) }} /> : <RhythmHomeScreen community={community} today={today} onBack={onExit} onNavigate={onNavigate} onTerms={() => reset({ name: 'terms' })} onProgress={() => undefined} />
    case 'replace': return participation ? <CommitmentsScreen participation={participation} week={view.week} tasks={tasks} mode="replace" replacing={view.item} today={today} error={error} onBack={back} onAddTasks={() => onNavigate('tasks')}
      onConfirm={([choice]) => { if (choice && apply(s => replaceCommitment(s, view.week, view.item.id, choice))) back() }} /> : null
    case 'progress': return participation ? <RhythmProgressScreen participation={participation} today={today} error={error} onBack={back}
      onSetCommitments={week => push({ name: 'commitments', week })}
      onStatus={(week, id, status) => apply(s => setCommitmentStatus(s, week, id, status, today))}
      onReplace={(week, item) => push({ name: 'replace', week, item })}
      onSavings={() => push({ name: 'savings' })} onRewards={() => push({ name: 'rewards' })} onLeave={() => push({ name: 'leave' })}
      onRestart={() => { if (apply(s => leavePool(s, today))) reset({ name: 'terms' }) }} />
      : <RhythmHomeScreen community={community} today={today} onBack={onExit} onNavigate={onNavigate} onTerms={() => reset({ name: 'terms' })} onProgress={() => undefined} />
    case 'leave': return <LeaveConfirmScreen onBack={back} onConfirm={() => { if (apply(s => leavePool(s, today))) reset({ name: 'home' }) }} />
    case 'savings': return <SavingsScreen community={community} today={today} onBack={back} onNavigate={onNavigate} onChange={onChange} onRewards={() => push({ name: 'rewards' })} />
    case 'rewards': return <RewardsSimulationScreen community={community} today={today} onBack={back} />
    case 'backup': return <EncryptedBackupScreen app={app} community={community} onBack={back} onRestore={onRestore}
      onUploaded={(cid, uploadedAt) => onChange({ ...community, encryptedBackups: [...community.encryptedBackups, { cid, uploadedAt }] })} />
  }
}
