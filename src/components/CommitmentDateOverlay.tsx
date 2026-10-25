import { useId, useState } from 'react'
import { isISODate, localISO } from '../domain/planner'
import { useDialogFocus } from './useDialogFocus'
import './CommitmentDateOverlay.css'

export interface CommitmentDateOverlayProps {
  selectedDay: number | null
  month?: string
  onClose: () => void
  onSelect: (day: number) => void
  figmaNode?: string
  ariaLabel?: string
  showSelection?: boolean
  onSelectDate?: (date: string) => void
  maxDate?: string
  onClear?: () => void
  clearLabel?: string
}

const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const calendarSlots: Array<number | null> = [null, null, 1, 2, 3, 4, 5, ...Array.from({ length: 26 }, (_, index) => index + 6)]

export function CommitmentDateOverlay({
  selectedDay,
  month,
  onClose,
  onSelect,
  figmaNode = '4636:5814',
  ariaLabel = 'Commitment date',
  showSelection = true,
  onSelectDate,
  maxDate,
  onClear,
  clearLabel = 'Clear date',
}: CommitmentDateOverlayProps) {
  const dialogRef = useDialogFocus(onClose)
  const dateHelpId = useId()
  const [visibleMonth, setVisibleMonth] = useState(month ?? '2023-10')
  const [dateInput, setDateInput] = useState(selectedDay ? `${month ?? '2023-10'}-${String(selectedDay).padStart(2, '0')}` : '')
  const shownMonth = month || onSelectDate ? new Date(`${visibleMonth}-01T12:00:00`) : null
  const monthTitle = shownMonth ? new Intl.DateTimeFormat('en', {month:'long', ...(onSelectDate ? {year:'numeric' as const} : {})}).format(shownMonth) : 'October'
  const monthDays: Array<number | null> = shownMonth ? [...Array.from({length:(shownMonth.getDay()+6)%7},()=>null), ...Array.from({length:new Date(shownMonth.getFullYear(),shownMonth.getMonth()+1,0).getDate()},(_,i)=>i+1)] : calendarSlots
  const entryTop = 90 + Math.ceil(monthDays.length / 7) * 49
  const dateError = !isISODate(dateInput) ? 'Enter a valid date in YYYY-MM-DD format.' : maxDate && dateInput > maxDate ? 'Choose today or an earlier date.' : undefined
  const changeMonth = (offset: number) => { const next = new Date(`${visibleMonth}-01T12:00:00`); next.setMonth(next.getMonth() + offset); setVisibleMonth(localISO(next).slice(0, 7)) }
  return (
    <div className="commitment-overlay-layer">
      <section ref={dialogRef}
        className="commitment-date-overlay"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        data-figma-node={figmaNode}
        style={onSelectDate ? {height: entryTop + (onClear ? 164 : 108)} : undefined}
      >
        <h2>{monthTitle}</h2>
        {onSelectDate ? <div className="commitment-date-overlay__navigation"><button type="button" aria-label="Previous month" onClick={() => changeMonth(-1)}>‹</button><button type="button" aria-label="Next month" disabled={Boolean(maxDate && visibleMonth >= maxDate.slice(0, 7))} onClick={() => changeMonth(1)}>›</button></div> : null}
        <button type="button" className="commitment-date-overlay__close" onClick={onClose} aria-label="Close date picker">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>

        <div className="commitment-date-overlay__weekdays" aria-hidden="true">
          {weekdays.map((weekday, index) => <span key={`${weekday}-${index}`}>{weekday}</span>)}
        </div>

        <div className="commitment-date-overlay__days">
          {monthDays.map((day, index) => {
            if (day === null) return <span className="commitment-date-overlay__day commitment-date-overlay__day--empty" key={`empty-${index}`} />
            return (
              <button
                type="button"
                key={day}
                disabled={Boolean(maxDate && `${visibleMonth}-${String(day).padStart(2, '0')}` > maxDate)}
                className={`commitment-date-overlay__day ${showSelection && selectedDay === day && (!onSelectDate || visibleMonth === month) ? 'commitment-date-overlay__day--selected' : ''}`}
                onClick={() => onSelectDate ? onSelectDate(`${visibleMonth}-${String(day).padStart(2, '0')}`) : onSelect(day)}
                aria-pressed={showSelection ? selectedDay === day && (!onSelectDate || visibleMonth === month) : undefined}
              >
                {day}
              </button>
            )
          })}
        </div>
        {onSelectDate ? <form className="commitment-date-overlay__entry" style={{top: entryTop}} noValidate onSubmit={event => { event.preventDefault(); if (!dateError) onSelectDate(dateInput) }}><label>Date (YYYY-MM-DD)<input value={dateInput} onChange={event => setDateInput(event.target.value)} placeholder="2026-10-12" aria-invalid={Boolean(dateError)} aria-describedby={dateError ? dateHelpId : undefined} /></label><button type="submit" disabled={Boolean(dateError)}>Use date</button>{dateError ? <p id={dateHelpId} role="alert">{dateError}</p> : null}</form> : null}
        {onSelectDate && onClear ? <button type="button" className="commitment-date-overlay__clear" onClick={onClear}>{clearLabel}</button> : null}
      </section>
    </div>
  )
}
