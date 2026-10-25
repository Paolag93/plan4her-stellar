import { useId, useState } from 'react'
import { Button } from '../../components/Button'
import { ConsentCard } from '../../components/ConsentCard'
import { TextField } from '../../components/TextField'
import type { RootTab } from '../../components/BottomNav'
import { WORK_TYPES, WORK_TYPE_LABELS } from '../../domain/cyclePreferences'
import {
  CHALLENGE_CATALOG, CHALLENGE_LENGTHS, activeMembership, challengeEndDate, communityAggregate, goalProgress, validateGoal,
  type ChallengeLength, type ChallengeTemplate, type CommunityState, type Membership, type PersonalGoal,
} from '../../domain/community'
import { CommunityScreen, ProgressBar, Row, SimulationBadge, Stat, percent } from './shared'

const shortDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

export function CommunityDirectoryScreen({ community, today, onBack, onNavigate, onOpen, onCreate, onProgress }: {
  community: CommunityState; today: string; onBack: () => void; onNavigate: (tab: RootTab) => void
  onOpen: (template: ChallengeTemplate) => void; onCreate: () => void; onProgress: () => void
}) {
  const active = activeMembership(community)
  const progress = active ? goalProgress(active, today) : null
  return <CommunityScreen title="Community" onBack={onBack} onNavigate={onNavigate} testId="community-directory">
    <section className="community-intro">
      <span>YOUR GOALS. YOUR RHYTHM. OUR COMMUNITY.</span>
      <h2>Grow a habit alongside others</h2>
      <p>Join a 30- or 90-day challenge with your own personal goal. Joining is free: no wallet, deposit or cycle details are needed.</p>
    </section>
    {active && progress ? <>
      <p className="community-label">Your challenge</p>
      <button type="button" className="community-card community-card--accent" onClick={onProgress}>
        <span className="community-card__top"><strong>{active.goal.title}</strong><span className="community-badge community-badge--brand">{progress.ended ? 'Ended' : `Day ${progress.dayNumber} of ${active.lengthDays}`}</span></span>
        <p>{active.title} · {percent(progress.completionRate)} of your own goal so far</p>
        <ProgressBar value={progress.completionRate} label="Your goal progress" />
      </button>
    </> : null}
    <p className="community-label">Open challenges</p>
    {CHALLENGE_CATALOG.map(template => <button key={template.id} type="button" className="community-card" onClick={() => onOpen(template)}>
      <span className="community-card__top"><strong>{template.title}</strong><span className="community-badge">{template.lengthDays} days</span></span>
      <p>{template.purpose}</p>
      <p>{template.sampleMemberRates.length} sample members · <SimulationBadge>Simulated members</SimulationBadge></p>
    </button>)}
    <Button hierarchy="secondary" type="button" onClick={onCreate} disabled={Boolean(active)}>Create your own challenge</Button>
    <aside className="community-notice">
      <strong>About this demo community</strong>
      <p>Other members are simulated sample data on this device. There is no shared server or second account yet, so nobody else sees your progress unless you invite a partner and choose what to share.</p>
    </aside>
  </CommunityScreen>
}

export function ChallengeDetailScreen({ template, community, today, onBack, onSetGoal, onProgress }: {
  template: ChallengeTemplate; community: CommunityState; today: string; onBack: () => void; onSetGoal: () => void; onProgress: () => void
}) {
  const active = activeMembership(community)
  const joinedHere = active?.challengeId === template.id
  const aggregate = communityAggregate(community, template, today)
  return <CommunityScreen title={template.title} onBack={onBack} testId="challenge-detail">
    <section className="community-intro"><span>{template.lengthDays}-DAY CHALLENGE</span><h2>{template.title}</h2><p>{template.purpose}</p></section>
    <div className="community-stats">
      <Stat label="Members" value={aggregate.members} />
      <Stat label="Average progress" value={aggregate.averageRate === null ? '—' : percent(aggregate.averageRate)} />
    </div>
    <p className="community-help">Averages use simulated sample members{aggregate.includesYou ? ' and your shared completion %' : ''}. Each member is measured only against her own goal.</p>
    <aside className="community-notice">
      <strong>How this challenge works</strong>
      <ul>
        <li>Your goal is personal. Members don't need the same habit, schedule or pace.</li>
        <li>Check-ins are self-reported. Nothing is verified on chain.</li>
        <li>Cycle details are never shared with the community.</li>
        <li>Money is optional. Joining is free and never needs a wallet.</li>
        <li>Leaving keeps your history and never affects any savings.</li>
      </ul>
    </aside>
    {joinedHere ? <Button type="button" onClick={onProgress}>View my progress</Button>
      : active ? <p className="community-help">You're already in “{active.title}”. Leave it first to join another challenge.</p>
      : <Button type="button" onClick={onSetGoal}>Set my personal goal</Button>}
  </CommunityScreen>
}

export function CreateChallengeScreen({ onBack, onContinue }: { onBack: () => void; onContinue: (title: string, lengthDays: ChallengeLength) => void }) {
  const [title, setTitle] = useState('')
  const [length, setLength] = useState<ChallengeLength>(30)
  const [error, setError] = useState<string | null>(null)
  return <CommunityScreen title="Create a challenge" onBack={onBack}>
    <p className="community-help">Start your own challenge. You can invite accountability partners afterwards.</p>
    <TextField label="Challenge name" text={title} editable filled={Boolean(title)} onChangeText={setTitle} invalid={Boolean(error)} supportingText={error ?? undefined} />
    <fieldset className="community-field"><legend>Length</legend>
      <div className="community-chips" role="radiogroup" aria-label="Challenge length">{CHALLENGE_LENGTHS.map(days => <button key={days} type="button" role="radio" aria-checked={length === days} className="community-chip" onClick={() => setLength(days)}>{days} days</button>)}</div>
    </fieldset>
    <Button type="button" onClick={() => { if (!title.trim() || title.trim().length > 80) { setError('Name your challenge (up to 80 characters).'); return } onContinue(title.trim(), length) }}>Continue</Button>
  </CommunityScreen>
}

export const DEFAULT_GOAL: PersonalGoal = { title: '', sessionsPerWeek: 3, minutesPerSession: 30, workType: 'general', rewardThreshold: 0.7 }

export function GoalEditorScreen({ challengeTitle, lengthDays, initial, mode, onBack, onSubmit }: {
  challengeTitle: string; lengthDays: ChallengeLength; initial: PersonalGoal; mode: 'join' | 'edit'; onBack: () => void; onSubmit: (goal: PersonalGoal) => void
}) {
  const [goal, setGoal] = useState<PersonalGoal>(initial)
  const [errors, setErrors] = useState<string[]>([])
  const workName = useId()
  const set = (patch: Partial<PersonalGoal>) => setGoal(current => ({ ...current, ...patch }))
  return <CommunityScreen title={mode === 'join' ? 'My personal goal' : 'Edit my goal'} onBack={onBack} testId="goal-editor">
    <p className="community-help">{challengeTitle} · {lengthDays} days. Choose a goal that fits your life. It only needs to make sense to you.</p>
    <TextField label="My goal" text={goal.title} editable filled={Boolean(goal.title)} onChangeText={title => set({ title })} ariaLabel="My goal" />
    <fieldset className="community-field"><legend>Sessions per week</legend>
      <div className="community-stepper">
        <Button hierarchy="secondary" size="medium" type="button" aria-label="Fewer sessions" style={{ minWidth: 44, width: 44 }} disabled={goal.sessionsPerWeek <= 1} onClick={() => set({ sessionsPerWeek: goal.sessionsPerWeek - 1 })}>−</Button>
        <output aria-live="polite" aria-label="Sessions per week">{goal.sessionsPerWeek}</output>
        <Button hierarchy="secondary" size="medium" type="button" aria-label="More sessions" style={{ minWidth: 44, width: 44 }} disabled={goal.sessionsPerWeek >= 7} onClick={() => set({ sessionsPerWeek: goal.sessionsPerWeek + 1 })}>+</Button>
      </div>
    </fieldset>
    <fieldset className="community-field"><legend>Minutes per session</legend>
      <div className="community-chips" role="radiogroup" aria-label="Minutes per session">{[15, 30, 45, 60, 90].map(m => <button key={m} type="button" role="radio" aria-checked={goal.minutesPerSession === m} className="community-chip" onClick={() => set({ minutesPerSession: m })}>{m} min</button>)}</div>
    </fieldset>
    <fieldset className="community-field"><legend>Kind of work (used by your planning preferences)</legend>
      {WORK_TYPES.map(type => <label key={type} className="community-option"><input type="radio" name={workName} checked={goal.workType === type} onChange={() => set({ workType: type })} />{WORK_TYPE_LABELS[type]}</label>)}
    </fieldset>
    <fieldset className="community-field"><legend>My personal target for optional rewards</legend>
      <div className="community-chips" role="radiogroup" aria-label="Personal reward threshold">{[0.5, 0.7, 0.9].map(t => <button key={t} type="button" role="radio" aria-checked={goal.rewardThreshold === t} className="community-chip" onClick={() => set({ rewardThreshold: t })}>{percent(t)}</button>)}</div>
      <p className="community-help">Only used if you later explore the simulated reward rules. Missing it never costs you anything you deposited.</p>
    </fieldset>
    {errors.length ? <p className="community-error" role="alert">{errors.join(' ')}</p> : null}
    <Button type="button" onClick={() => { const next = validateGoal(goal); setErrors(next); if (!next.length) onSubmit({ ...goal, title: goal.title.trim() }) }}>{mode === 'join' ? 'Review & join' : 'Save goal'}</Button>
  </CommunityScreen>
}

export function JoinConfirmScreen({ challengeTitle, lengthDays, goal, share, today, onShareChange, onBack, onJoin, error }: {
  challengeTitle: string; lengthDays: ChallengeLength; goal: PersonalGoal; share: boolean; today: string; onShareChange: (value: boolean) => void; onBack: () => void; onJoin: () => void; error?: string | null
}) {
  const end = new Date(`${today}T12:00:00`); end.setDate(end.getDate() + lengthDays - 1)
  return <CommunityScreen title="Join challenge" onBack={onBack} testId="join-confirm">
    <section className="community-intro"><span>FREE TO JOIN</span><h2>{challengeTitle}</h2><p>From {shortDate(today)} to {end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}. No wallet, deposit or cycle details required.</p></section>
    <div className="community-rows">
      <Row label="My goal" value={goal.title} />
      <Row label="Rhythm" value={`${goal.sessionsPerWeek}× a week · ${goal.minutesPerSession} min`} />
      <Row label="Kind of work" value={WORK_TYPE_LABELS[goal.workType]} />
    </div>
    <ConsentCard title="Add my completion % to the group average" body="Only a percentage is shared with the challenge average. Your goal name, check-in dates and cycle context are never shared." selected={share} onChange={onShareChange} />
    {error ? <p className="community-error" role="alert">{error}</p> : null}
    <Button type="button" onClick={onJoin}>Join for free</Button>
    <Button hierarchy="tertiary" type="button" onClick={onBack}>Back</Button>
  </CommunityScreen>
}

export function GoalProgressScreen({ membership, today, onBack, onCheckIn, onUndoCheckIn, onPlanSessions, onEdit, onPartners, onSavings, onLeave, planMessage }: {
  membership: Membership; today: string; onBack: () => void; onCheckIn: () => void; onUndoCheckIn: () => void; onPlanSessions?: () => void
  onEdit: () => void; onPartners: () => void; onSavings: () => void; onLeave: () => void; planMessage?: string | null
}) {
  const p = goalProgress(membership, today)
  return <CommunityScreen title="My progress" onBack={onBack} testId="goal-progress">
    <section className="community-intro"><span>{membership.title.toUpperCase()}</span><h2>{membership.goal.title}</h2>
      <p>{p.ended ? `Challenge ended on ${shortDate(challengeEndDate(membership))}.` : `Day ${p.dayNumber} of ${membership.lengthDays} · ${p.daysRemaining} days left`}</p></section>
    <ProgressBar value={p.completionRate} label="Progress toward my goal" />
    <div className="community-stats">
      <Stat label="Of my goal so far" value={percent(p.completionRate)} />
      <Stat label="This week" value={`${p.checkInsThisWeek}/${membership.goal.sessionsPerWeek}`} />
      <Stat label="Check-ins" value={`${p.completed}/${p.expected}`} />
      <Stat label="Streak" value={`${p.streakDays} d`} />
    </div>
    {p.ended ? <p className="community-help">Well done for showing up. Your history stays on this device. You can start a new challenge whenever you like.</p>
      : p.checkedInToday ? <><p className="community-success" role="status">Checked in for today.</p><Button hierarchy="tertiary" type="button" onClick={onUndoCheckIn}>Undo today's check-in</Button></>
      : <Button type="button" onClick={onCheckIn}>Check in for today</Button>}
    <p className="community-help">Check-ins are self-reported on this device. Rest days are part of a healthy rhythm.</p>
    {!p.ended && onPlanSessions ? <>
      <p className="community-label">Plan</p>
      <Button hierarchy="secondary" type="button" onClick={onPlanSessions}>Add this week's sessions to Tasks</Button>
      <p className="community-help">Sessions become flexible tasks with your chosen kind of work. Select them in Tasks to preview where your planning preferences would place them. Nothing changes until you apply.</p>
      {planMessage ? <p className="community-success" role="status">{planMessage}</p> : null}
    </> : null}
    <p className="community-label">Support</p>
    <Button hierarchy="secondary" type="button" onClick={onPartners}>Accountability partners</Button>
    <Button hierarchy="secondary" type="button" onClick={onSavings}>Optional savings · Testnet</Button>
    {!p.ended ? <Button hierarchy="secondary" type="button" onClick={onEdit}>Edit my goal</Button> : null}
    <Button hierarchy="tertiary" type="button" onClick={onLeave}>{p.ended ? 'Close this challenge' : 'Leave challenge'}</Button>
  </CommunityScreen>
}

export function LeaveConfirmScreen({ title, onBack, onConfirm }: { title: string; onBack: () => void; onConfirm: () => void }) {
  return <CommunityScreen title="Leave challenge" onBack={onBack}>
    <h2 className="community-h2">Leave “{title}”?</h2>
    <p className="community-help">Your check-in history stays on this device. Any Testnet savings stay in your own wallet: leaving never moves, locks or penalizes funds.</p>
    <Button hierarchy="secondary" type="button" onClick={onBack}>Stay in challenge</Button>
    <Button hierarchy="destructive" type="button" onClick={onConfirm}>Leave challenge</Button>
  </CommunityScreen>
}
