import { useId, useMemo, useState } from 'react'
import { AppHeader } from '../../components/AppHeader'
import { Button } from '../../components/Button'
import { CYCLE_PHASES, WORK_TYPE_LABELS, estimateCycleContext, type CyclePhase, type CyclePreferences, type WorkType } from '../../domain/cyclePreferences'
import { previewRhythm } from '../../domain/rhythmPreview'
import { generateWeeklyPlan } from '../../domain/planner'
import type { PlannerInput, TaskItem, WeeklyPlan } from '../../domain/types'
import './RhythmPreviewScreen.css'

const PHASE_NOTE: Record<CyclePhase, string> = {
  Menstrual: 'Turn inward. Rest, reflect, plan gently.',
  Follicular: 'Fresh energy. Start, create, move strongly.',
  Ovulatory: 'Most outward. Present, connect, collaborate.',
  Luteal: 'Detail mode. Finish, organize, wind down.',
}

export interface RhythmPreviewScreenProps {
  input: PlannerInput
  preferences: CyclePreferences
  accepted: WeeklyPlan | null
  savedDay: number | null
  cycleLength: number
  today: string
  onBack: () => void
  onApply?: (day: number) => void
  onEditPreferences?: () => void
  onAddTasks?: () => void
}

export function RhythmPreviewScreen({ input, preferences, accepted, savedDay, cycleLength, today, onBack, onApply, onEditPreferences, onAddTasks }: RhythmPreviewScreenProps) {
  const [day, setDay] = useState(savedDay ?? 1)
  const sliderId = useId()
  const taskById = useMemo(() => new Map(input.tasks.map(task => [task.id, task] as [string, TaskItem])), [input.tasks])
  const baseline = useMemo(() => savedDay ? previewRhythm(input, savedDay, cycleLength, accepted, null, today).plan : accepted ?? generateWeeklyPlan({ ...input, cycleMode: null }), [input, savedDay, cycleLength, accepted, today])
  const preview = useMemo(() => previewRhythm(input, day, cycleLength, accepted, baseline, today), [input, day, cycleLength, accepted, baseline, today])
  const todayPhase = preview.days.find(d => d.dateISO === today)?.phase ?? preview.days[0]?.phase ?? null
  const typed = input.tasks.some(task => !task.done && task.workType && task.workType !== 'general')
  const segments = CYCLE_PHASES.map(phase => ({ phase, days: Array.from({ length: cycleLength }, (_, i) => i + 1).filter(n => phaseForDay(n, cycleLength) === phase).length }))

  return <main className="rhythm-preview live-content-screen" data-testid="rhythm-preview">
    <AppHeader title="Rhythm preview" onBack={onBack} />
    <div className="rhythm-preview__content" tabIndex={0} role="region" aria-label="Rhythm preview content">
      <section className="rhythm-preview__intro">
        <span className="rhythm-eyebrow">Cycle-aware planning</span>
        <h2>Watch your week follow your rhythm</h2>
        <p>Change your cycle day. Plan4Her re-plans your week instantly.</p>
      </section>

      <section className="rhythm-dial" data-phase={todayPhase?.toLowerCase() ?? 'neutral'} aria-label="Cycle day">
        <div className="rhythm-dial__head">
          <div><span className="rhythm-dial__label">Today is cycle day</span><strong className="rhythm-dial__day">{day}</strong></div>
          {todayPhase ? <span className="rhythm-phase-pill" data-phase={todayPhase.toLowerCase()}>{todayPhase}</span> : null}
        </div>
        <label className="sr-only" htmlFor={sliderId}>Cycle day</label>
        <input id={sliderId} className="rhythm-dial__slider" type="range" min={1} max={cycleLength} step={1} value={day} onChange={e => setDay(Number(e.target.value))} aria-valuetext={`Cycle day ${day}${todayPhase ? `, ${todayPhase}` : ''}`} />
        <div className="rhythm-dial__track" aria-hidden="true">{segments.map(s => <span key={s.phase} data-phase={s.phase.toLowerCase()} style={{ flexGrow: s.days }} />)}</div>
        <div className="rhythm-dial__steps">
          <button type="button" className="rhythm-step" onClick={() => setDay(d => Math.max(1, d - 1))} aria-label="Previous cycle day" disabled={day <= 1}>−1 day</button>
          <button type="button" className="rhythm-step" onClick={() => setDay(d => Math.min(cycleLength, d + 1))} aria-label="Next cycle day" disabled={day >= cycleLength}>+1 day</button>
        </div>
        {todayPhase ? <p className="rhythm-dial__note">{PHASE_NOTE[todayPhase]}</p> : null}
      </section>

      {!input.tasks.length ? <section className="rhythm-empty">
        <strong>Add a few tasks first</strong>
        <p>Your rhythm needs something to arrange.</p>
        {onAddTasks ? <Button type="button" hierarchy="secondary" onClick={onAddTasks}>Go to Tasks</Button> : null}
      </section> : <>
        <p className="rhythm-moved" role="status" aria-live="polite">
          {preview.moved.size ? <><strong>{preview.moved.size} {preview.moved.size === 1 ? 'task moves' : 'tasks move'}</strong> to better-suited days.</> : day === savedDay ? 'This is your current rhythm.' : 'Your week already fits this rhythm.'}
        </p>
        <ol className="rhythm-week" aria-label="Week preview">
          {preview.days.map(d => <li key={d.dateISO} className="rhythm-day" data-phase={d.phase?.toLowerCase() ?? 'neutral'} data-today={d.dateISO === today || undefined}>
            <div className="rhythm-day__head">
              <span className="rhythm-day__date"><strong>{d.short}</strong> {d.number}</span>
              {d.phase ? <span className="rhythm-day__phase"><i aria-hidden="true" />{d.phase} · day {d.cycleDay}</span> : null}
            </div>
            {d.blocks.length ? <ul className="rhythm-day__tasks">
              {d.blocks.map(block => {
                const task = block.taskId ? taskById.get(block.taskId) : undefined
                const type = (task?.workType ?? 'general') as WorkType
                const fits = Boolean(d.phase && type !== 'general' && preferences.phaseWork[d.phase].includes(type))
                const moved = Boolean(block.taskId && preview.moved.has(block.taskId))
                return <li key={block.id} className={`rhythm-task${moved ? ' rhythm-task--moved' : ''}`}>
                  <span className="rhythm-task__title">{block.title}</span>
                  <span className="rhythm-task__meta">
                    {block.fixed ? 'Fixed' : type !== 'general' ? WORK_TYPE_LABELS[type] : 'No type'}
                    {fits ? <span className="rhythm-task__fit"> · fits {d.phase!.toLowerCase()}</span> : null}
                    {moved ? <span className="rhythm-task__moved"> · moved here</span> : null}
                  </span>
                </li>
              })}
            </ul> : <p className="rhythm-day__open">Open</p>}
          </li>)}
        </ol>
        {!typed ? <p className="rhythm-hint">Tip: give tasks a work type so your rhythm can place them.</p> : null}
      </>}

      <details className="rhythm-details">
        <summary>How each phase is used</summary>
        <ul>{CYCLE_PHASES.map(phase => <li key={phase}><span className="rhythm-phase-pill" data-phase={phase.toLowerCase()}>{phase}</span> {preferences.phaseWork[phase].length ? preferences.phaseWork[phase].map(t => WORK_TYPE_LABELS[t]).join(' · ') : 'No preference'}</li>)}</ul>
        <p>Deadlines, availability and fixed commitments always come first. Cycle days are estimated from your last period.</p>
      </details>

      <div className="rhythm-actions">
        {onApply ? <Button type="button" disabled={day === savedDay || !input.tasks.length} onClick={() => onApply(day)}>{day === savedDay ? 'This is your current rhythm' : `Use cycle day ${day}`}</Button> : null}
        {onEditPreferences ? <Button type="button" hierarchy="secondary" onClick={onEditPreferences}>Edit what each phase favors</Button> : null}
        {onApply && accepted ? <p className="rhythm-hint">You’ll review every change before your plan updates.</p> : null}
      </div>
    </div>
  </main>
}

/** Same estimate the planner uses, evaluated for an abstract cycle starting on a fixed date. */
function phaseForDay(day: number, length: number): CyclePhase | null {
  const start = new Date(Date.UTC(2026, 0, 1)), date = new Date(start.getTime() + (day - 1) * 86400000)
  const estimate = estimateCycleContext(date.toISOString().slice(0, 10), { enabled: true, lastPeriodStart: '2026-01-01', cycleLength: length })
  return estimate.status === 'estimated' ? estimate.phase : null
}

/** Shared entry point into the rhythm preview (Today, Plan, More). */
export function RhythmEntry({ onOpen, subtitle = 'Change your cycle day and watch tasks move.' }: { onOpen: () => void; subtitle?: string }) {
  return <button type="button" className="rhythm-entry" onClick={onOpen}>
    <span><strong>See your rhythm at work</strong><small>{subtitle}</small></span>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
  </button>
}
