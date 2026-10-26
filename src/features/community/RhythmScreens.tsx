import { useState } from 'react'
import { Button } from '../../components/Button'
import { ConsentCard } from '../../components/ConsentCard'
import type { RootTab } from '../../components/BottomNav'
import type { TaskItem } from '../../domain'
import {
  ELIGIBILITY_THRESHOLD, MAX_COMMITMENTS, MIN_COMMITMENTS, POOL_WEEKS, REPLACEMENTS_PER_WEEK,
  activeParticipation, communityAggregate, editableWeek, nextMonday, poolEndDate, poolProgress, weekStartOf,
  type Commitment, type CommitmentChoice, type CommunityState, type Participation,
} from '../../domain/community'
import { CommunityScreen, ProgressBar, Row, SimulationBadge, Stat, percent } from './shared'

const day = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

export function RhythmHomeScreen({ community, today, onBack, onNavigate, onTerms, onProgress }: {
  community: CommunityState; today: string; onBack: () => void; onNavigate: (tab: RootTab) => void; onTerms: () => void; onProgress: () => void
}) {
  const p = activeParticipation(community)
  const progress = p ? poolProgress(p, today) : null
  const aggregate = communityAggregate(community, today)
  return <CommunityScreen title="Rhythm Pool" onBack={onBack} onNavigate={onNavigate} testId="rhythm-home">
    <section className="community-intro">
      <span>PREMIUM PREVIEW · YOUR GOALS. YOUR RHYTHM. OUR COMMUNITY.</span>
      <h2>One community, your own four weeks</h2>
      <p>Join any day. Your four-week challenge starts on the next Monday. Each week you choose 3–5 commitments from your own plan; the rest of your week stays flexible.</p>
    </section>
    {p && progress ? <button type="button" className="community-card community-card--accent" onClick={onProgress}>
      <span className="community-card__top"><strong>My rhythm</strong><span className="community-badge community-badge--brand">{progress.ended ? 'Four weeks complete' : progress.started ? `Week ${progress.week} of ${POOL_WEEKS}` : `Starts ${day(p.startDate)}`}</span></span>
      <p>{progress.denominator ? `${progress.done} of ${progress.denominator} commitments completed · ${percent(progress.ratio)}` : 'Choose your first week\'s commitments.'}</p>
      <ProgressBar value={progress.ratio} label="Four-week consistency" />
    </button> : null}
    <p className="community-label">How it works</p>
    <ol className="community-steps">
      <li><strong>Review the terms.</strong> Joining is free and needs no wallet.</li>
      <li><strong>Set weekly commitments.</strong> Pick 3–5 tasks you already planned. Reschedule freely; replace one unfinished commitment per week.</li>
      <li><strong>Optionally save on Stellar Testnet.</strong> Your deposit stays in your own vault position.</li>
      <li><strong>Track consistency.</strong> After four weeks, reaching {percent(ELIGIBILITY_THRESHOLD)} of your commitments makes you eligible for any reward that actually exists.</li>
    </ol>
    {!p ? <Button type="button" onClick={onTerms}>Review terms</Button> : null}
    <p className="community-label">Community</p>
    <div className="community-stats">
      <Stat label="Sample members" value={aggregate.sampleMembers} />
      <Stat label="Average consistency" value={percent(aggregate.averageRate)} />
    </div>
    <p className="community-help"><SimulationBadge>Simulated</SimulationBadge> Members shown are sample data for this demo{aggregate.includesYou ? ', plus your shared percentage' : ''}. The pool works with one member: you never need to wait for others. Nobody sees your goals, tasks or cycle details.</p>
    {community.history.length ? <><p className="community-label">Past four-week results</p><div className="community-rows">{community.history.map(h => <Row key={h.startDate + h.done} label={`From ${day(h.startDate)}`} value={`${percent(h.ratio)} · ${h.done}/${h.denominator}`} note={h.eligible ? 'Reached 70%' : 'Below 70%'} />)}</div></> : null}
  </CommunityScreen>
}

export function TermsScreen({ today, onBack, onJoin, error }: { today: string; onBack: () => void; onJoin: (options: { shareProgress: boolean; pledgeYield: boolean }) => void; error?: string | null }) {
  const [accepted, setAccepted] = useState(false)
  const [share, setShare] = useState(false)
  const [pledge, setPledge] = useState(false)
  const start = nextMonday(today)
  const end = new Date(`${start}T12:00:00`); end.setDate(end.getDate() + 27)
  return <CommunityScreen title="Rhythm Pool terms" onBack={onBack} testId="rhythm-terms">
    <section className="community-intro"><span>FREE TO JOIN · NO WALLET NEEDED</span><h2>Your four weeks: {day(start)} – {end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</h2><p>28 days, four complete weeks, starting on Monday.</p></section>
    <aside className="community-notice">
      <strong>Commitments</strong>
      <ul>
        <li>Each week, confirm {MIN_COMMITMENTS}–{MAX_COMMITMENTS} important tasks from your Plan4Her schedule. That number is fixed for the week.</li>
        <li>Add or remove other tasks freely: they never change your count.</li>
        <li>Reschedule commitments any time without penalty. Replace up to {REPLACEMENTS_PER_WEEK} unfinished commitment per week; the change is kept in your history.</li>
        <li>You mark commitments done or missed yourself. Plan4Her does not verify real-world activity.</li>
        <li>A week you don't set up counts as {MIN_COMMITMENTS} commitments not completed.</li>
      </ul>
    </aside>
    <aside className="community-notice">
      <strong>Money and rewards</strong>
      <ul>
        <li>Saving is optional. Any deposit stays your own individual position in a DeFindex vault on Stellar Testnet (no real money).</li>
        <li>Missing commitments never confiscates, locks or penalizes your deposit. Vault value can still go down.</li>
        <li>Possible rewards: voluntarily pledged positive realized yield, or sponsor funds once actually confirmed. Neither is guaranteed. In this demo, reward distribution is a simulation.</li>
        <li>Eligibility: at least {percent(ELIGIBILITY_THRESHOLD)} of your commitments completed over the four weeks.</li>
      </ul>
    </aside>
    <aside className="community-notice">
      <strong>Privacy</strong>
      <ul>
        <li>Cycle and health context, schedules, goals, notes and task names stay on your device. They are never put on Stellar.</li>
        <li>Stellar transactions and vault deposits are public on the blockchain, not confidential.</li>
      </ul>
    </aside>
    <ConsentCard title="I accept the Rhythm Pool terms" body="Four weeks from Monday, self-reported commitments, no penalty on deposits, no guaranteed rewards." requirement="Required" selected={accepted} onChange={setAccepted} />
    <ConsentCard title="Share my consistency % with the community" body="Only one percentage joins the community average. Never names, tasks, dates or cycle details." selected={share} onChange={setShare} />
    <ConsentCard title="Pledge 20% of my positive realized yield" body="Only applies if you save and the vault actually realizes positive yield. Reward distribution is simulated in this demo." selected={pledge} onChange={setPledge} />
    {error ? <p className="community-error" role="alert">{error}</p> : null}
    <Button type="button" disabled={!accepted} onClick={() => onJoin({ shareProgress: share, pledgeYield: pledge })}>Join the Rhythm Pool</Button>
  </CommunityScreen>
}

export function CommitmentsScreen({ participation, week, tasks, mode, replacing, today, onBack, onConfirm, onAddTasks, error }: {
  participation: Participation; week: number; tasks: TaskItem[]; mode: 'set' | 'replace'; replacing?: Commitment; today: string
  onBack: () => void; onConfirm: (choices: CommitmentChoice[]) => void; onAddTasks: () => void; error?: string | null
}) {
  const [selected, setSelected] = useState<string[]>([])
  const taken = new Set(participation.weeks.find(w => w.week === week)?.items.filter(i => i.status !== 'replaced').map(i => i.taskId) ?? [])
  const options = tasks.filter(t => !t.done && !taken.has(t.id))
  const max = mode === 'replace' ? 1 : MAX_COMMITMENTS
  const min = mode === 'replace' ? 1 : MIN_COMMITMENTS
  const toggle = (id: string) => setSelected(current => current.includes(id) ? current.filter(x => x !== id) : current.length >= max ? (max === 1 ? [id] : current) : [...current, id])
  const start = weekStartOf(participation, week)
  return <CommunityScreen title={mode === 'replace' ? 'Replace a commitment' : `Week ${week} commitments`} onBack={onBack} testId="rhythm-commitments">
    <p className="community-help">{mode === 'replace' ? `Choose one task to replace “${replacing?.title}”. Your weekly count stays the same and the change is kept in your history.` : `Week of ${day(start)}${today < start ? ' (starts soon)' : ''}. Choose ${MIN_COMMITMENTS}–${MAX_COMMITMENTS} important tasks from your schedule. Everything else stays flexible.`}</p>
    <p className="community-help">Only you see these names. They stay on this device.</p>
    {options.length < min ? <>
      <p className="community-notice">You need at least {min} open task{min === 1 ? '' : 's'} in Tasks to choose from.</p>
      <Button type="button" hierarchy="secondary" onClick={onAddTasks}>Go to Tasks</Button>
    </> : <fieldset className="community-field"><legend>{selected.length} selected{mode === 'set' ? ` · ${MIN_COMMITMENTS}–${MAX_COMMITMENTS}` : ''}</legend>
      {options.map(task => <label key={task.id} className="community-option"><input type="checkbox" checked={selected.includes(task.id)} onChange={() => toggle(task.id)} disabled={!selected.includes(task.id) && selected.length >= max && max > 1} /><span>{task.title}<br /><small className="community-help">{task.kind === 'Fixed' ? `Fixed · ${task.meta}` : task.meta}</small></span></label>)}
    </fieldset>}
    {error ? <p className="community-error" role="alert">{error}</p> : null}
    <Button type="button" disabled={selected.length < min || selected.length > max} onClick={() => onConfirm(options.filter(t => selected.includes(t.id)).map(t => ({ taskId: t.id, title: t.title })))}>{mode === 'replace' ? 'Replace commitment' : 'Confirm commitments'}</Button>
  </CommunityScreen>
}

const STATUS_LABEL: Record<Commitment['status'], string> = { open: 'To do', done: 'Done', missed: 'Missed', replaced: 'Replaced' }

export function RhythmProgressScreen({ participation, today, onBack, onSetCommitments, onStatus, onReplace, onSavings, onRewards, onLeave, onRestart, error }: {
  participation: Participation; today: string; onBack: () => void; onSetCommitments: (week: number) => void
  onStatus: (week: number, id: string, status: 'done' | 'missed' | 'open') => void; onReplace: (week: number, item: Commitment) => void
  onSavings: () => void; onRewards: () => void; onLeave: () => void; onRestart: () => void; error?: string | null
}) {
  const progress = poolProgress(participation, today)
  const editable = editableWeek(participation, today)
  const current = participation.weeks.find(w => w.week === Math.max(1, progress.week))
  return <CommunityScreen title="My rhythm" onBack={onBack} testId="rhythm-progress">
    <section className="community-intro">
      <span>RHYTHM POOL · {day(participation.startDate).toUpperCase()} – {day(poolEndDate(participation)).toUpperCase()}</span>
      <h2>{progress.ended ? 'Your four-week result' : progress.started ? `Week ${progress.week} of ${POOL_WEEKS}` : `Starts in ${progress.daysUntilStart} day${progress.daysUntilStart === 1 ? '' : 's'}`}</h2>
      <p>{progress.ended ? (progress.ratio >= ELIGIBILITY_THRESHOLD ? `You completed ${percent(progress.ratio)} of your commitments and reached the ${percent(ELIGIBILITY_THRESHOLD)} threshold.` : `You completed ${percent(progress.ratio)} of your commitments. The threshold was ${percent(ELIGIBILITY_THRESHOLD)}; your deposit is unaffected either way.`) : `${progress.done} of ${progress.denominator} commitments completed so far. Eligibility needs ${percent(ELIGIBILITY_THRESHOLD)} over four weeks.`}</p>
    </section>
    <ProgressBar value={progress.ratio} label="Four-week consistency" />
    <div className="community-stats">
      <Stat label="Consistency" value={percent(progress.ratio)} />
      <Stat label="Completed" value={`${progress.done}/${progress.denominator}`} />
    </div>
    {error ? <p className="community-error" role="alert">{error}</p> : null}
    {editable ? <Button type="button" onClick={() => onSetCommitments(editable)}>Set week {editable} commitments</Button> : null}
    {current && !progress.ended ? <>
      <p className="community-label">Week {current.week} · from {day(current.weekStart)}</p>
      {current.items.map(item => <div key={item.id} className={`community-card${item.status === 'replaced' ? ' community-card--muted' : ''}`} data-testid="commitment">
        <span className="community-card__top"><strong>{item.title}</strong><span className={`community-badge${item.status === 'done' ? ' community-badge--success' : item.status === 'missed' ? ' community-badge--warning' : ''}`}>{STATUS_LABEL[item.status]}</span></span>
        {item.replaces ? <p>Replacement commitment</p> : null}
        {item.status === 'replaced' ? <p>Replaced. Kept in your history.</p> : !progress.started ? <p>Can be marked once the week starts.</p> : <div className="community-chips">
          {item.status === 'open' ? <>
            <button type="button" className="community-chip" onClick={() => onStatus(current.week, item.id, 'done')}>Done</button>
            <button type="button" className="community-chip" onClick={() => onStatus(current.week, item.id, 'missed')}>Missed</button>
          </> : <button type="button" className="community-chip" onClick={() => onStatus(current.week, item.id, 'open')}>Undo</button>}
          {item.status !== 'done' && current.replacementsUsed < REPLACEMENTS_PER_WEEK ? <button type="button" className="community-chip" onClick={() => onReplace(current.week, item)}>Replace</button> : null}
        </div>}
      </div>)}
      <p className="community-help">To reschedule a commitment, move its task in Plan as usual; there is no penalty. Completing the task in Tasks also marks it done here.</p>
    </> : null}
    <p className="community-label">Weeks</p>
    <div className="community-rows">{progress.weeks.map(w => <Row key={w.week} label={`Week ${w.week} · ${day(w.weekStart)}`} value={w.confirmed ? `${w.done}/${w.denominator} done` : w.elapsed ? `Not set · 0/${w.denominator}` : 'Not set yet'} note={w.missed ? `${w.missed} missed` : undefined} />)}</div>
    <p className="community-label">Savings &amp; rewards</p>
    <Button hierarchy="secondary" type="button" onClick={onSavings}>Connect wallet &amp; deposit · Testnet</Button>
    <Button hierarchy="secondary" type="button" onClick={onRewards}>How rewards would work <SimulationBadge>Simulation</SimulationBadge></Button>
    {progress.ended ? <Button type="button" onClick={onRestart}>Start another four weeks</Button> : <Button hierarchy="tertiary" type="button" onClick={onLeave}>Leave Rhythm Pool</Button>}
  </CommunityScreen>
}

export function LeaveConfirmScreen({ onBack, onConfirm }: { onBack: () => void; onConfirm: () => void }) {
  return <CommunityScreen title="Leave Rhythm Pool" onBack={onBack}>
    <h2 className="community-h2">Leave the Rhythm Pool?</h2>
    <p className="community-help">Your commitment history stays on this device. Any Testnet savings stay in your own wallet: leaving never moves, locks or penalizes funds.</p>
    <Button hierarchy="secondary" type="button" onClick={onBack}>Stay</Button>
    <Button hierarchy="destructive" type="button" onClick={onConfirm}>Leave Rhythm Pool</Button>
  </CommunityScreen>
}
