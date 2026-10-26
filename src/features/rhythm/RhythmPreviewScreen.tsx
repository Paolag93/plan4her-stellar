import { useId, useMemo, useState } from 'react'
import { AppHeader } from '../../components/AppHeader'
import { Button } from '../../components/Button'
import { CYCLE_PHASES, WORK_TYPE_LABELS, estimateCycleContext, type CyclePhase, type WorkType } from '../../domain/cyclePreferences'
import { previewRhythm } from '../../domain/rhythmPreview'
import { generateWeeklyPlan } from '../../domain/planner'
import type { PlannerInput, TaskItem, WeeklyPlan } from '../../domain/types'
import './RhythmPreviewScreen.css'

export interface RhythmPreviewScreenProps {
  input: PlannerInput
  accepted: WeeklyPlan | null
  savedDay: number | null
  cycleLength: number
  today: string
  onBack: () => void
  /** Opens the change review for this cycle day. Must not save anything. */
  onReview?: (day: number) => void
  onEditPreferences?: () => void
  onAddTasks?: () => void
}

export function RhythmPreviewScreen({ input, accepted, savedDay, cycleLength, today, onBack, onReview, onEditPreferences, onAddTasks }: RhythmPreviewScreenProps) {
  const [day, setDay] = useState(savedDay ?? 1)
  const sliderId = useId()
  const taskById = useMemo(() => new Map(input.tasks.map(task => [task.id, task] as [string, TaskItem])), [input.tasks])
  const baseline = useMemo(() => savedDay ? previewRhythm(input, savedDay, cycleLength, accepted, null, today).plan : accepted ?? generateWeeklyPlan({ ...input, cycleMode: null }), [input, savedDay, cycleLength, accepted, today])
  const preview = useMemo(() => previewRhythm(input, day, cycleLength, accepted, baseline, today), [input, day, cycleLength, accepted, baseline, today])
  const todayPhase = preview.days.find(d => d.dateISO === today)?.phase ?? preview.days[0]?.phase ?? null
  const typed = input.tasks.some(task => !task.done && task.workType && task.workType !== 'general')
  const segments = CYCLE_PHASES.map(phase => ({ phase, days: Array.from({ length: cycleLength }, (_, i) => i + 1).filter(n => phaseForDay(n, cycleLength) === phase).length }))

  return <main className="rhythm-preview live-content-screen" data-testid="rhythm-preview">
    <AppHeader title="Week preview" onBack={onBack} />
    <div className="rhythm-preview__content" tabIndex={0} role="region" aria-label="Explore your week content">
      <section className="rhythm-preview__intro">
        <span className="rhythm-eyebrow">Preview</span>
        <h2>Explore your week</h2>
        <p>Try another cycle day to see an alternative schedule. Your plan stays as it is unless you apply the changes.</p>
      </section>

      <section className="rhythm-dial" data-phase={todayPhase?.toLowerCase() ?? 'neutral'} aria-label="Cycle day">
        <div className="rhythm-dial__head">
          <div><span className="rhythm-dial__label">Cycle day today</span><strong className="rhythm-dial__day">{day}</strong></div>
          {todayPhase ? <span className="rhythm-phase-pill" data-phase={todayPhase.toLowerCase()}>{todayPhase}</span> : null}
        </div>
        <label className="sr-only" htmlFor={sliderId}>Cycle day</label>
        <input id={sliderId} className="rhythm-dial__slider" type="range" min={1} max={cycleLength} step={1} value={day} onChange={e => setDay(Number(e.target.value))} aria-valuetext={`Cycle day ${day}${todayPhase ? `, ${todayPhase}` : ''}`} />
        <div className="rhythm-dial__track" aria-hidden="true">{segments.map(s => <span key={s.phase} data-phase={s.phase.toLowerCase()} style={{ flexGrow: s.days }} />)}</div>
        <div className="rhythm-dial__steps">
          <button type="button" className="rhythm-step" onClick={() => setDay(d => Math.max(1, d - 1))} aria-label="Previous cycle day" disabled={day <= 1}>−1 day</button>
          <button type="button" className="rhythm-step" onClick={() => setDay(d => Math.min(cycleLength, d + 1))} aria-label="Next cycle day" disabled={day >= cycleLength}>+1 day</button>
        </div>
      </section>

      {!input.tasks.length ? <section className="rhythm-empty">
        <strong>Add a few tasks first</strong>
        <p>Your rhythm needs something to arrange.</p>
        {onAddTasks ? <Button type="button" hierarchy="secondary" onClick={onAddTasks}>Go to Tasks</Button> : null}
      </section> : <>
        <p className="rhythm-moved" role="status" aria-live="polite">
          {preview.moved.size ? <strong>{preview.moved.size} {preview.moved.size === 1 ? 'task moved' : 'tasks moved'}</strong> : day === savedDay ? 'This is your current plan.' : 'No changes for this day.'}
        </p>
        <ol className="rhythm-week" aria-label="Week preview">
          {preview.days.map(d => <li key={d.dateISO} className="rhythm-day" data-phase={d.phase?.toLowerCase() ?? 'neutral'} data-today={d.dateISO === today || undefined}>
            <div className="rhythm-day__head">
              <span className="rhythm-day__date"><strong>{d.short}</strong> {d.number}</span>
              {d.phase ? <span className="rhythm-day__phase"><i aria-hidden="true" />Day {d.cycleDay} · {d.phase}</span> : null}
            </div>
            {d.blocks.length ? <ul className="rhythm-day__tasks">
              {d.blocks.map(block => {
                const task = block.taskId ? taskById.get(block.taskId) : undefined
                const type = (task?.workType ?? 'general') as WorkType
                const moved = Boolean(block.taskId && preview.moved.has(block.taskId))
                return <li key={block.id} className={`rhythm-task${moved ? ' rhythm-task--moved' : ''}`}>
                  <span className="rhythm-task__title">{block.title}</span>
                  {block.fixed || type !== 'general' || moved ? <span className="rhythm-task__meta">
                    {block.fixed ? 'Fixed' : type !== 'general' ? WORK_TYPE_LABELS[type] : 'Task'}
                    {moved ? <span className="rhythm-task__moved"> · moved</span> : null}
                  </span> : null}
                </li>
              })}
            </ul> : <p className="rhythm-day__open">Open</p>}
          </li>)}
        </ol>
        {!typed ? <p className="rhythm-hint">Tip: give tasks a work type to see more options.</p> : null}
      </>}

      <details className="rhythm-details">
        <summary>How this works</summary>
        <p>Plan4Her arranges tasks using your planning preferences, which you can change at any time. Deadlines, availability and fixed commitments always come first. Cycle days are estimated from your last period.</p>
      </details>

      <div className="rhythm-actions">
        {onReview && accepted ? <Button type="button" disabled={day === savedDay || !input.tasks.length} onClick={() => onReview(day)}>Review changes</Button> : null}
        {onEditPreferences ? <Button type="button" hierarchy="secondary" onClick={onEditPreferences}>Planning preferences</Button> : null}
        {onReview && accepted ? <p className="rhythm-hint">Nothing changes until you choose Apply changes.</p> : null}
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
export function RhythmEntry({ onOpen, subtitle = 'Preview your schedule on another cycle day.' }: { onOpen: () => void; subtitle?: string }) {
  return <button type="button" className="rhythm-entry" onClick={onOpen}>
    <span><strong>Explore your week</strong><small>{subtitle}</small></span>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
  </button>
}
