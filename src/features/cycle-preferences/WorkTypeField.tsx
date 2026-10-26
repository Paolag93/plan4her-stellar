import { useId } from 'react'
import { inferWorkType } from '../../domain/activityClassifier'
import { WORK_TYPES, WORK_TYPE_LABELS, type WorkType } from '../../domain/cyclePreferences'
import './WorkTypeField.css'

export type WorkTypeChoice = WorkType | 'auto'

export interface WorkTypeFieldProps {
  value: WorkTypeChoice
  onChange: (value: WorkTypeChoice) => void
  /** Current title, used to show what automatic detection would pick. */
  title: string
  fixed?: boolean
}

/** Optional correction, collapsed by default. 'auto' means the type is inferred from the title at planning time. */
export function WorkTypeField({ value, onChange, title, fixed = false }: WorkTypeFieldProps) {
  const id = useId()
  const detected = inferWorkType(title)
  return (
    <details className="work-type-field" open={value !== 'auto' || undefined}>
      <summary>Activity type</summary>
      <label htmlFor={id}>Activity type · optional</label>
      <select id={id} value={value} onChange={event => onChange(event.target.value as WorkTypeChoice)} aria-describedby={`${id}-help`}>
        <option value="auto">Automatic{detected !== 'general' ? ` (${WORK_TYPE_LABELS[detected]})` : ''}</option>
        {WORK_TYPES.map(type => <option key={type} value={type}>{WORK_TYPE_LABELS[type]}</option>)}
      </select>
      <p id={`${id}-help`}>
        {fixed ? 'Fixed time stays in place. This can help if you make the task flexible.' : 'Plan4Her detects this from the task’s words with simple on-device rules. Change it only if it looks wrong.'}
      </p>
    </details>
  )
}
