import { useState } from 'react'
import { Button } from '../../components/Button'
import { CommitmentDateOverlay } from '../../components/CommitmentDateOverlay'
import { SetupHeader } from '../../components/SetupHeader'
import { TextField } from '../../components/TextField'
import { TimePickerOverlay } from '../../components/TimePickerOverlay'
import { localISO, minutes } from '../../domain/planner'
import fixedCommitmentCalendarPlus from './assets/fixed-commitment-calendar-plus.svg'
import './FixedCommitmentsScreen.css'

export interface FixedCommitmentInput { id: string; title: string; date: string; startTime: string; endTime: string }
export interface FixedCommitmentsScreenProps {
  initialCommitments?: FixedCommitmentInput[]
  onChange?: (commitments: FixedCommitmentInput[]) => void
  onContinue?: (commitments: FixedCommitmentInput[]) => void
  onBack: () => void
  onAdd?: () => void
  onSkip: (commitments: FixedCommitmentInput[]) => void
}

type View = 'empty' | 'editor' | 'added'
type Overlay = 'date' | 'start' | 'end' | null

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M7 3v4M17 3v4M3 10h18" />
    </svg>
  )
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15 18 9 12l6-6" />
    </svg>
  )
}

function formatOctoberDate(day: number) {
  const weekday = new Intl.DateTimeFormat('en', { weekday: 'short' }).format(new Date(2023, 9, day))
  return `${weekday} ${day} Oct`
}

export function FixedCommitmentsScreen({ onBack, onAdd, onSkip, initialCommitments, onChange, onContinue }: FixedCommitmentsScreenProps) {
  const [view, setView] = useState<View>(initialCommitments?.length ? 'added' : 'empty')
  const [commitments, setCommitments] = useState<FixedCommitmentInput[]>(initialCommitments ?? [])
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [commitment, setCommitment] = useState('Team meeting')
  const [selectedDay, setSelectedDay] = useState(initialCommitments !== undefined ? new Date().getDate() : 23)
  const [selectedDate, setSelectedDate] = useState(localISO())
  const [startTime, setStartTime] = useState('11:00')
  const [endTime, setEndTime] = useState('11:45')
  const month = initialCommitments !== undefined ? selectedDate.slice(0,7) : '2023-10'
  const isoDate = `${month}-${String(selectedDay).padStart(2, '0')}`
  const date = initialCommitments !== undefined ? new Intl.DateTimeFormat('en', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${isoDate}T12:00:00`)) : formatOctoberDate(selectedDay)
  const leaveEditor = () => { setOverlay(null); setView(commitments.length ? 'added' : 'empty') }
  const beginAnother = () => { setCommitment(''); setView('editor'); onAdd?.() }
  const validTimes = Number.isFinite(minutes(startTime)) && Number.isFinite(minutes(endTime)) && minutes(startTime) < minutes(endTime)
  const valid = commitment.trim().length > 0 && validTimes


  if (view === 'editor') {
    return (
      <main className="commitment-editor" data-figma-node="4636:5720">
        <header className="commitment-editor__header">
          <button
            className="commitment-editor__back"
            type="button"
            onClick={() => {
              leaveEditor()
            }}
            aria-label="Back"
          >
            <BackIcon />
          </button>
          <h1>Add commitment</h1>
        </header>

        <div className="commitment-editor__content">
          <h2>Add fixed commitment</h2>
          <p className="commitment-editor__intro">
            Plan4Her will keep this time protected when it builds your week.
          </p>

          <section className="commitment-editor__card">
            <TextField
              className="commitment-editor__field commitment-editor__field--commitment"
              label="Commitment"
              text={commitment}
              filled
              editable
              onChangeText={setCommitment}
            />

            <TextField
              className="commitment-editor__field commitment-editor__field--date"
              label="Date"
              text={date}
              filled
              onClick={() => setOverlay('date')}
            />

            <TextField
              className="commitment-editor__field commitment-editor__field--start"
              label="Start time"
              text={startTime}
              filled
              onClick={() => setOverlay('start')}
            />

            <TextField
              className="commitment-editor__field commitment-editor__field--end"
              label="End time"
              text={endTime}
              filled
              onClick={() => setOverlay('end')}
            />

            <p className="commitment-editor__helper" role={!validTimes ? 'alert' : undefined}>{validTimes ? 'This commitment cannot move.' : 'End time must be after start time on the same day.'}</p>
          </section>

          <Button
            className="commitment-editor__save"
            type="button"
            disabled={!valid}
            onClick={() => {
              const next = [...commitments, {id: globalThis.crypto?.randomUUID?.() ?? `commitment-${Date.now()}-${commitments.length}`, title: commitment.trim(), date: isoDate, startTime, endTime}]
              setCommitments(next)
              onChange?.(next)
              setOverlay(null)
              setView('added')
            }}
          >
            Save commitment
          </Button>

          <button
            className="commitment-editor__cancel"
            type="button"
            onClick={() => {
              leaveEditor()
            }}
          >
            Cancel
          </button>
        </div>

        {overlay === 'date' ? (
          <CommitmentDateOverlay
            selectedDay={selectedDay}
            month={month}
            onSelectDate={initialCommitments !== undefined ? value => { setSelectedDate(value); setSelectedDay(Number(value.slice(8, 10))); setOverlay(null) } : undefined}
            onClose={() => setOverlay(null)}
            onSelect={(day) => {
              setSelectedDay(day)
              setOverlay(null)
            }}
          />
        ) : null}

        {overlay === 'start' ? (
          <TimePickerOverlay
            mode="start"
            customEntry={initialCommitments !== undefined ? 'time' : undefined}
            selected={startTime}
            onClose={() => setOverlay(null)}
            onSelect={(value) => {
              setStartTime(value)
              setOverlay(null)
            }}
          />
        ) : null}

        {overlay === 'end' ? (
          <TimePickerOverlay
            mode="end"
            customEntry={initialCommitments !== undefined ? 'time' : undefined}
            afterTime={initialCommitments !== undefined ? startTime : undefined}
            selected={endTime}
            onClose={() => setOverlay(null)}
            onSelect={(value) => {
              setEndTime(value)
              setOverlay(null)
            }}
          />
        ) : null}
      </main>
    )
  }

  if (view === 'added') {
    return (
      <main className={`fixed-commitments-screen ${commitments.length > 1 ? 'fixed-commitments-screen--multiple' : ''}`} data-figma-node="4272:2428">
        <SetupHeader label="4 of 4 · Fixed commitments" progress={1} onBack={onBack} />
        <h1 className="fixed-commitments-screen__title">Fixed commitments</h1>
        <p className="fixed-commitments-screen__description">
          Plan4Her will protect these times while it builds the rest of your week.
        </p>

        {commitments.map(item => <section key={item.id} className="fixed-commitments-screen__summary-card">
          <span className="fixed-commitments-screen__summary-icon" aria-hidden="true"><CalendarIcon /></span>
          <h2>{item.title}</h2>
          <p>{initialCommitments !== undefined ? new Intl.DateTimeFormat('en', {weekday:'short', day:'numeric', month:'short'}).format(new Date(`${item.date}T12:00:00`)) : formatOctoberDate(Number(item.date.slice(-2))).replace('23 Oct', '').trim()} {item.startTime}–{item.endTime} · Fixed</p>
          <small>Protected from automatic moves</small>
        </section>)}

        <Button
          className="fixed-commitments-screen__another"
          hierarchy="secondary"
          type="button"
          onClick={beginAnother}
        >
          Add another commitment
        </Button>

        <Button className="fixed-commitments-screen__create" type="button" onClick={() => (onContinue ?? onSkip)(commitments)}>
          Create my week
        </Button>

        <div className="fixed-commitments-screen__added-spacer" aria-hidden="true" />
      </main>
    )
  }

  return (
    <main className="fixed-commitments-screen" data-figma-node="4198:90">
      <SetupHeader label="4 of 4 · Fixed commitments" progress={1} onBack={onBack} />
      <h1 className="fixed-commitments-screen__title">Protect time that can’t move</h1>
      <p className="fixed-commitments-screen__description">
        Add meetings, classes or appointments with a fixed time. Plan4Her will schedule flexible work around them.
      </p>

      <section className="fixed-commitments-screen__empty-card">
        <span className="fixed-commitments-screen__icon" aria-hidden="true"><img src={fixedCommitmentCalendarPlus} alt="" /></span>
        <h2>Add a fixed commitment</h2>
        <p>Anything with a time that Plan4Her should never move.</p>
        <small>Optional · you can skip this step</small>
      </section>

      <Button
        className="fixed-commitments-screen__add"
        type="button"
        onClick={() => {
          setView('editor')
          onAdd?.()
        }}
      >
        Add fixed commitment
      </Button>

      <button className="fixed-commitments-screen__skip" type="button" onClick={() => onSkip(commitments)}>
        Skip for now
      </button>

      <div className="fixed-commitments-screen__spacer" aria-hidden="true" />
    </main>
  )
}
