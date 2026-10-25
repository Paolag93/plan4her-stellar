import './TaskCard.css'

export type TaskKind = 'Flexible' | 'Fixed'

export interface TaskCardProps {
  title: string
  meta: string
  kind: TaskKind
  done?: boolean
  checkboxMode?: 'completion' | 'selection' | 'none'
  selected?: boolean
  onOpen?: () => void
  onToggleDone?: () => void
  onToggleSelection?: () => void
}

export function TaskCard({ title, meta, kind, done = false, checkboxMode = 'completion', selected = false, onOpen, onToggleDone, onToggleSelection }: TaskCardProps) {
  const selecting = checkboxMode === 'selection'
  const checked = selecting ? selected : done
  return (
    <article className={`p4h-task-card ${done ? 'p4h-task-card--done' : ''} ${checkboxMode !== 'completion' ? 'p4h-task-card--planning' : ''} ${checkboxMode === 'none' ? 'p4h-task-card--no-checkbox' : ''} ${selecting && selected ? 'p4h-task-card--selected' : ''}`}>
      {checkboxMode !== 'none' ? <button
        type="button"
        className="p4h-task-card__check-touch"
        aria-pressed={checked}
        aria-label={selecting ? `${selected ? 'Deselect' : 'Select'} ${title} for planning` : done ? `Mark ${title} incomplete` : `Mark ${title} done`}
        disabled={selecting && done}
        onClick={(event) => { event.stopPropagation(); if (selecting) onToggleSelection?.(); else onToggleDone?.() }}
      >
        <span className={`p4h-task-card__checkbox ${checked ? 'p4h-task-card__checkbox--done' : ''}`}>
          {checked ? <svg viewBox="0 0 16 16" aria-hidden="true"><path transform="translate(3 0)" d="M0 8.5 3.2 11.5 10 4.5" /></svg> : null}
        </span>
      </button> : null}
      <button type="button" className="p4h-task-card__content" onClick={onOpen}>
        <span className="p4h-task-card__top">
          <span className="p4h-task-card__title">{title}</span>
          {done ? <span className="p4h-task-card__status">Done</span> : null}
        </span>
        <span className="p4h-task-card__meta">{meta}</span>
        <span className={`p4h-task-card__badge p4h-task-card__badge--${kind.toLowerCase()}`}>{kind}</span>
      </button>
      {checkboxMode !== 'completion' ? <button type="button" className="p4h-task-card__done-action" aria-label={done ? `Mark ${title} incomplete` : `Mark ${title} done`} onClick={onToggleDone}>{done ? 'Undo done' : 'Mark done'}</button> : null}
    </article>
  )
}
