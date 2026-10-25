import { useDialogFocus } from './useDialogFocus'
import { CommitmentDateOverlay } from './CommitmentDateOverlay'
import './CalendarOverlay.css'

export interface CalendarOverlayProps {
  month?: string
  onClose: () => void
  onSelect: (day: number) => void
  selectedDay?: number | null
  mode?: 'setup'|'settings'
  onSelectDate?: (date: string) => void
  maxDate?: string
}

const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const days: Array<number | null> = [null, null, 1, 2, 3, 4, 5, ...Array.from({ length: 26 }, (_, index) => index + 6)]

export function CalendarOverlay(props: CalendarOverlayProps) {
  if (props.onSelectDate) return <CommitmentDateOverlay {...props} selectedDay={props.selectedDay ?? null} ariaLabel="Select last period start date" figmaNode={props.mode === 'settings' ? '4565:6154' : '4565:6079'} />
  return <PresetCalendarOverlay {...props} />
}

function PresetCalendarOverlay({ onClose, onSelect, selectedDay = null, mode = 'setup', month }: CalendarOverlayProps) {
  const dialogRef = useDialogFocus(onClose)
  const shownMonth = month ? new Date(`${month}-01T12:00:00`) : null
  const monthTitle = shownMonth ? new Intl.DateTimeFormat('en', {month:'long'}).format(shownMonth) : 'October'
  const monthDays: Array<number | null> = shownMonth ? [...Array.from({length:(shownMonth.getDay()+6)%7},()=>null), ...Array.from({length:new Date(shownMonth.getFullYear(),shownMonth.getMonth()+1,0).getDate()},(_,i)=>i+1)] : days
  const node=mode==='settings'?'4565:6154':'4565:6079'
  return (
    <div className="calendar-overlay-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} className="calendar-overlay" role="dialog" aria-modal="true" aria-label="Select last period start date" data-figma-node={node}>
        <header className="calendar-overlay__header">
          <h2>{monthTitle}</h2>
          <button type="button" className="calendar-overlay__close" onClick={onClose} aria-label="Close calendar">×</button>
        </header>
        <div className="calendar-overlay__weekdays" aria-hidden="true">
          {weekdays.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
        </div>
        <div className="calendar-overlay__days">
          {monthDays.map((day, index) => day === null ? (
            <span className="calendar-overlay__day calendar-overlay__day--empty" key={`empty-${index}`} />
          ) : (
            <button type="button" className={day===selectedDay?'calendar-overlay__day calendar-overlay__day--selected':'calendar-overlay__day'} key={day} aria-pressed={day === selectedDay} onClick={() => onSelect(day)}>{day}</button>
          ))}
        </div>
        <p className="calendar-overlay__hint">{mode==='settings'&&selectedDay?`Selected: ${selectedDay} ${monthTitle.slice(0,3)}`:'Choose a date'}</p>
      </section>
    </div>
  )
}
