import { useEffect, useState } from 'react'
import type { RootTab } from '../../components/BottomNav'
import type { AppState } from '../../domain'
import {
  CHALLENGE_CATALOG, activeMembership, addDays, challengeTemplate, createCommunityState, invitePartner, joinChallenge, leaveChallenge,
  recordCheckIn, removeCheckIn, revokePartner, setPartnerPermissions, simulatePartnerAccept, updateGoal,
  type ChallengeLength, type ChallengeTemplate, type CommunityState, type Membership, type PersonalGoal,
} from '../../domain/community'
import { ChallengeDetailScreen, CommunityDirectoryScreen, CreateChallengeScreen, DEFAULT_GOAL, GoalEditorScreen, GoalProgressScreen, JoinConfirmScreen, LeaveConfirmScreen } from './CommunityScreens'
import { InvitePartnerScreen, PartnerDetailScreen, PartnersScreen } from './PartnerScreens'
import { RewardsSimulationScreen, SavingsScreen } from './SavingsScreens'
import { EncryptedBackupScreen, type BackupBundle } from './EncryptedBackupScreen'

export type CommunityEntry = 'community' | 'partners' | 'savings' | 'backup' | 'progress'
type View =
  | { name: 'directory' } | { name: 'detail'; template: ChallengeTemplate } | { name: 'create' }
  | { name: 'goal'; template: Pick<ChallengeTemplate, 'id' | 'title' | 'lengthDays'>; mode: 'join' | 'edit' }
  | { name: 'join'; template: Pick<ChallengeTemplate, 'id' | 'title' | 'lengthDays'>; goal: PersonalGoal }
  | { name: 'progress' } | { name: 'leave' } | { name: 'partners' } | { name: 'invite' } | { name: 'partner'; id: string }
  | { name: 'savings' } | { name: 'rewards' } | { name: 'backup' }

/** Synthetic fixtures for screenshot QA (`?qa=`). Never persisted. */
export function communityFixture(qa: string | null, today: string): CommunityState {
  let state = createCommunityState()
  if (!qa || qa === 'community') return state
  const start = addDays(today, -9)
  state = joinChallenge(state, CHALLENGE_CATALOG[0], { title: 'Study English', sessionsPerWeek: 4, minutesPerSession: 30, workType: 'review-planning', rewardThreshold: 0.7 }, start)
  for (const offset of [-9, -8, -6, -4, -2, -1]) state = recordCheckIn(state, 'learn-30', addDays(today, offset))
  if (qa.startsWith('partners')) {
    state = invitePartner(state, 'Ana', ['completionRate', 'checkInsThisWeek'], new Date(`${today}T09:00:00`))
    state = invitePartner(state, 'Marta', [], new Date(`${today}T09:30:00`))
    if (qa === 'partners-active') state = simulatePartnerAccept(state, state.partners[0].id)
  }
  if (qa === 'savings-optedin' || qa === 'rewards') state = { ...state, savings: { ...state.savings, optedIn: true, risksAcknowledgedAt: `${today}T10:00:00.000Z` } }
  return state
}

export function entryFromQa(qa: string | null): CommunityEntry | null {
  if (qa === 'community') return 'community'
  if (qa === 'community-progress') return 'progress'
  if (qa?.startsWith('partners')) return 'partners'
  if (qa?.startsWith('savings') || qa === 'rewards') return 'savings'
  if (qa === 'backup') return 'backup'
  return null
}

function initialView(entry: CommunityEntry, state: CommunityState, qa?: string | null): View {
  if (qa === 'rewards') return { name: 'rewards' }
  if (qa === 'partners-active' && state.partners[0]) return { name: 'partner', id: state.partners[0].id }
  if (entry === 'progress') return activeMembership(state) ? { name: 'progress' } : { name: 'directory' }
  if (entry === 'partners') return { name: 'partners' }
  if (entry === 'savings') return { name: 'savings' }
  if (entry === 'backup') return { name: 'backup' }
  return { name: 'directory' }
}

export interface CommunityFlowProps {
  entry: CommunityEntry
  navigationKey: number
  community: CommunityState
  app: AppState
  today: string
  qa?: string | null
  onChange: (next: CommunityState) => boolean
  onExit: () => void
  onNavigate: (tab: RootTab) => void
  onPlanSessions?: (membership: Membership) => string
  onRestore: (bundle: BackupBundle) => { error?: string }
}

export function CommunityFlow({ entry, navigationKey, community, app, today, qa, onChange, onExit, onNavigate, onPlanSessions, onRestore }: CommunityFlowProps) {
  const [stack, setStack] = useState<View[]>(() => [initialView(entry, community, qa)])
  const [share, setShare] = useState(community.shareWithCommunity)
  const [error, setError] = useState<string | null>(null)
  const [planMessage, setPlanMessage] = useState<string | null>(null)
  useEffect(() => { if (navigationKey > 0) setStack([initialView(entry, community)]) }, [navigationKey])
  const view = stack.at(-1)!
  const push = (next: View) => { setError(null); setStack(current => [...current, next]) }
  const back = () => { setError(null); if (stack.length > 1) setStack(current => current.slice(0, -1)); else onExit() }
  const reset = (next: View) => setStack([next])
  const apply = (fn: (s: CommunityState) => CommunityState) => { try { return onChange(fn(community)) } catch (e) { setError(e instanceof Error ? e.message : 'That change could not be saved.'); return false } }
  const membership = activeMembership(community)

  switch (view.name) {
    case 'directory': return <CommunityDirectoryScreen community={community} today={today} onBack={back} onNavigate={onNavigate} onOpen={template => push({ name: 'detail', template })} onCreate={() => push({ name: 'create' })} onProgress={() => push({ name: 'progress' })} />
    case 'detail': return <ChallengeDetailScreen template={view.template} community={community} today={today} onBack={back} onSetGoal={() => push({ name: 'goal', template: view.template, mode: 'join' })} onProgress={() => push({ name: 'progress' })} />
    case 'create': return <CreateChallengeScreen onBack={back} onContinue={(title: string, lengthDays: ChallengeLength) => push({ name: 'goal', template: { id: `own-${Date.now().toString(36)}`, title, lengthDays }, mode: 'join' })} />
    case 'goal': return <GoalEditorScreen challengeTitle={view.template.title} lengthDays={view.template.lengthDays} mode={view.mode} initial={view.mode === 'edit' && membership ? membership.goal : DEFAULT_GOAL} onBack={back}
      onSubmit={goal => { if (view.mode === 'join') push({ name: 'join', template: view.template, goal }); else if (membership && apply(s => updateGoal(s, membership.challengeId, goal))) back() }} />
    case 'join': return <JoinConfirmScreen challengeTitle={view.template.title} lengthDays={view.template.lengthDays} goal={view.goal} share={share} today={today} onShareChange={setShare} onBack={back} error={error}
      onJoin={() => { if (apply(s => ({ ...joinChallenge(s, view.template, view.goal, today), shareWithCommunity: share }))) reset({ name: 'progress' }) }} />
    case 'progress': {
      if (!membership) return <CommunityDirectoryScreen community={community} today={today} onBack={onExit} onNavigate={onNavigate} onOpen={template => reset({ name: 'detail', template })} onCreate={() => reset({ name: 'create' })} onProgress={() => undefined} />
      return <GoalProgressScreen membership={membership} today={today} planMessage={planMessage} onBack={back}
        onCheckIn={() => apply(s => recordCheckIn(s, membership.challengeId, today))}
        onUndoCheckIn={() => apply(s => removeCheckIn(s, membership.challengeId, today))}
        onPlanSessions={onPlanSessions ? () => setPlanMessage(onPlanSessions(membership)) : undefined}
        onEdit={() => push({ name: 'goal', template: challengeTemplate(membership.challengeId, community) ?? { id: membership.challengeId, title: membership.title, lengthDays: membership.lengthDays }, mode: 'edit' })}
        onPartners={() => push({ name: 'partners' })} onSavings={() => push({ name: 'savings' })} onLeave={() => push({ name: 'leave' })} />
    }
    case 'leave': return membership ? <LeaveConfirmScreen title={membership.title} onBack={back} onConfirm={() => { if (apply(s => leaveChallenge(s, membership.challengeId, today))) reset({ name: 'directory' }) }} /> : null
    case 'partners': return <PartnersScreen community={community} onBack={back} onNavigate={onNavigate} onInvite={() => push({ name: 'invite' })} onOpen={partner => push({ name: 'partner', id: partner.id })} />
    case 'invite': return <InvitePartnerScreen onBack={back} onInvite={(name, fields) => {
      try { const next = invitePartner(community, name, fields); if (onChange(next)) { setStack(current => [...current.slice(0, -1), { name: 'partner', id: next.partners.at(-1)!.id }]) } return null } catch (e) { return e instanceof Error ? e.message : 'Could not create the invite.' }
    }} />
    case 'partner': {
      const partner = community.partners.find(item => item.id === view.id)
      if (!partner) return <PartnersScreen community={community} onBack={back} onNavigate={onNavigate} onInvite={() => push({ name: 'invite' })} onOpen={p => push({ name: 'partner', id: p.id })} />
      return <PartnerDetailScreen community={community} partner={partner} today={today} onBack={back} onAccept={() => apply(s => simulatePartnerAccept(s, partner.id))} onPermissions={fields => apply(s => setPartnerPermissions(s, partner.id, fields))} onRevoke={() => apply(s => revokePartner(s, partner.id))} />
    }
    case 'savings': return <SavingsScreen community={community} today={today} onBack={back} onNavigate={onNavigate} onChange={onChange} onRewards={() => push({ name: 'rewards' })} />
    case 'rewards': return <RewardsSimulationScreen community={community} today={today} onBack={back} />
    case 'backup': return <EncryptedBackupScreen app={app} community={community} onBack={back} onRestore={onRestore}
      onUploaded={(cid, uploadedAt) => onChange({ ...community, encryptedBackups: [...community.encryptedBackups, { cid, uploadedAt }] })} />
  }
}
