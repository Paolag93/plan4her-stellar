import { useId } from 'react'
import { WORK_TYPES, WORK_TYPE_LABELS, type WorkType } from '../../domain/cyclePreferences'
import './WorkTypeField.css'

export interface WorkTypeFieldProps {
  value: WorkType
  onChange: (value: WorkType) => void
  fixed?: boolean
}

/** Optional user-selected metadata; titles never imply a work type. */
export function WorkTypeField({ value, onChange, fixed = false }: WorkTypeFieldProps) {
  const id = useId()
  return (
    <div className="work-type-field">
      <label htmlFor={id}>Work type · optional</label>
      <select id={id} value={value} onChange={event => onChange(event.target.value as WorkType)} aria-describedby={`${id}-help`}>
        {WORK_TYPES.map(type => <option key={type} value={type}>{WORK_TYPE_LABELS[type]}</option>)}
      </select>
      <p id={`${id}-help`}>
        {fixed ? 'Fixed time stays in place. This preference can help if you make the task flexible.' : 'Choose a type to use your phase-work preferences. General has no phase preference.'}
      </p>
    </div>
  )
}
