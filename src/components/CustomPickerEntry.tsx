import { useId, useLayoutEffect, useRef, useState } from 'react'
import { durationMinutes, minutes } from '../domain/planner'
import { pickerTimeValue } from './pickerValues'
import './CustomPickerEntry.css'

export interface CustomPickerEntryProps {
  kind: 'time' | 'duration'
  selected: string
  onApply: (value: string) => void
  onBack: () => void
  validate?: (value: string) => string | undefined
  draft?: CustomPickerDraft
  onDraftChange?: (draft: CustomPickerDraft) => void
}

interface CustomPickerDraft { hours: string; remainder: string; time: string }

function initialDraft(selected: string): CustomPickerDraft {
  const initialMinutes = durationMinutes(selected)
  return { hours: Number.isFinite(initialMinutes) ? String(Math.floor(initialMinutes / 60)) : '0', remainder: Number.isFinite(initialMinutes) ? String(initialMinutes % 60) : '0', time: pickerTimeValue(selected) }
}

/** Keep unfinished input when visiting presets, but discard it when the picker closes. */
export function useCustomPicker(selected: string) {
  const [custom, setCustom] = useState(false)
  const [draft, setDraft] = useState(() => initialDraft(selected))
  const customButtonRef = useRef<HTMLButtonElement>(null)
  const wasCustom = useRef(false)
  useLayoutEffect(() => {
    if (wasCustom.current && !custom) customButtonRef.current?.focus({ preventScroll: true })
    wasCustom.current = custom
  }, [custom])
  return { custom, setCustom, draft, setDraft, customButtonRef }
}

export function CustomPickerEntry({ kind, selected, onApply, onBack, validate, draft, onDraftChange }: CustomPickerEntryProps) {
  const helpId = useId()
  const [localDraft, setLocalDraft] = useState(() => initialDraft(selected))
  const current = draft ?? localDraft
  const { hours, remainder, time } = current
  const update = (value: Partial<CustomPickerDraft>) => { const next = { ...current, ...value }; setLocalDraft(next); onDraftChange?.(next) }
  const integer = (value: string) => value === '' || /^\d+$/.test(value)
  const total = Number(hours) * 60 + Number(remainder)
  const value = kind === 'time' ? time.trim() : `${total} min`
  const inputError = kind === 'time'
    ? (!/^\d{2}:\d{2}$/.test(value) || !Number.isFinite(minutes(value)) ? 'Enter a time from 00:00 to 23:59 in HH:MM format.' : undefined)
    : !integer(hours) || !integer(remainder) || Number(remainder) > 59
      ? 'Use whole hours and 0–59 minutes.'
      : !Number.isSafeInteger(total) || total < 1 || total > 1440
        ? 'Enter a duration greater than 0, up to 24 hours.'
        : undefined
  const error = inputError ?? validate?.(value)

  return (
    <form className="picker-custom-entry" noValidate onSubmit={event => { event.preventDefault(); if (!error) onApply(value) }}>
      {kind === 'duration' ? (
        <div className="picker-custom-entry__fields">
          <label>Hours<input autoFocus inputMode="numeric" value={hours} onChange={event => update({ hours: event.target.value })} aria-invalid={Boolean(error)} aria-describedby={helpId} /></label>
          <label>Minutes<input inputMode="numeric" value={remainder} onChange={event => update({ remainder: event.target.value })} aria-invalid={Boolean(error)} aria-describedby={helpId} /></label>
        </div>
      ) : (
        <label>Exact time (HH:MM)<input autoFocus inputMode="text" placeholder="14:15" value={time} onChange={event => update({ time: event.target.value })} aria-invalid={Boolean(error)} aria-describedby={helpId} /></label>
      )}
      <p className={`picker-custom-entry__help ${error ? 'picker-custom-entry__help--error' : ''}`} id={helpId} aria-live="polite">{error ?? (kind === 'duration' ? `${total} minutes total` : 'Use 24-hour time, for example 14:15.')}</p>
      <button className="picker-custom-entry__apply" type="submit" disabled={Boolean(error)}>Use {kind}</button>
      <button className="picker-custom-entry__back" type="button" onClick={onBack}>Back to presets</button>
    </form>
  )
}
