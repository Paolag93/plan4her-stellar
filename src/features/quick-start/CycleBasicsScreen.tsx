import { useState } from 'react'
import { Button } from '../../components/Button'
import { CalendarOverlay } from '../../components/CalendarOverlay'
import { pickerCycleLength } from '../../components/pickerValues'
import { NoExactDateScreen } from './NoExactDateScreen'
import { SetupHeader } from '../../components/SetupHeader'
import { TextField } from '../../components/TextField'
import { isISODate, localISO } from '../../domain/planner'
import { selectedCycleContext } from '../daily/selectedCycleContext'
import './CycleBasicsScreen.css'
import cycleCalendarOutline from './assets/cycle-calendar-outline.svg'

export interface CycleBasicsValues { lastPeriodStart: string | null; cycleLength: number }
export interface CycleBasicsScreenProps {
  cycleMode?: 'natural' | 'predictable' | 'unsure'
  onBack: () => void
  onNoExactDate?: () => void
  onContinue: (values: CycleBasicsValues) => void
  initialValues?: CycleBasicsValues
  onChange?: (values: CycleBasicsValues) => void
}
function CalendarIcon() { return <img src={cycleCalendarOutline} alt="" aria-hidden="true" /> }

export function CycleBasicsScreen({ onBack, onContinue, initialValues, onChange, cycleMode, onNoExactDate }: CycleBasicsScreenProps) {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(initialValues?.lastPeriodStart ?? null)
  const [noExactDate, setNoExactDate] = useState(false)
  const [cycleLengthFocused, setCycleLengthFocused] = useState(false)
  const [cycleLength, setCycleLength] = useState(`${initialValues?.cycleLength ?? 28} days`)
  const liveMode = initialValues !== undefined
  const hasDate = selectedDate !== null
  const validDate = hasDate && isISODate(selectedDate) && selectedDate <= localISO()
  const selectedDay = selectedDate ? Number(selectedDate.slice(-2)) : null
  const calendarMonth = selectedDate?.slice(0, 7) ?? (liveMode ? localISO().slice(0, 7) : '2023-10')
  const parsedLength = pickerCycleLength(cycleLength)
  const validLength = Number.isFinite(parsedLength)
  // Date changes must never write an unfinished/invalid length into saved state.
  const values = (date = selectedDate, length = cycleLength): CycleBasicsValues => ({ lastPeriodStart: date, cycleLength: Number.isFinite(pickerCycleLength(length)) ? pickerCycleLength(length) : initialValues?.cycleLength ?? 28 })
  const context = selectedCycleContext(localISO(), { enabled: true, lastPeriodStart: selectedDate, cycleLength: parsedLength })
  const estimate = !liveMode ? 'Day 8 · Follicular' : !validLength ? 'Check cycle length' : !validDate ? 'Choose today or a past date' : context.status === 'estimated' ? `Day ${context.day} · ${context.phase}` : 'Choose a date'
  const selectDate = (date: string) => { setSelectedDate(date); onChange?.(values(date)); setCycleLengthFocused(false); setCalendarOpen(false) }
  if (noExactDate) return <NoExactDateScreen onBack={() => setNoExactDate(false)} onAddPeriodDate={() => setNoExactDate(false)} onContinueWithoutCycle={() => onContinue({ ...values(), lastPeriodStart: null })} />
  const figmaNode = hasDate ? (cycleLengthFocused ? '4272:2135' : '4272:2107') : '4198:57'

  return <main className="cycle-basics-screen" data-figma-node={figmaNode}>
    <SetupHeader label="1 of 4 · Cycle context" progress={0.25} onBack={onBack} />
    <h1 className="cycle-basics-screen__title">{hasDate ? 'Your cycle estimate' : 'When did your last period start?'}</h1>
    <p className="cycle-basics-screen__description">{hasDate ? 'Estimated from your last period start and usual cycle length.' : 'Choose the first day of your most recent period. Plan4Her uses it to estimate cycle day and phase.'}</p>
    <section className="cycle-basics-screen__path" aria-label="Selected cycle path"><span>{cycleMode === 'predictable' ? 'Predictable hormonal pattern' : 'Natural cycle'}</span><small>Day 1 = first day of bleeding.</small></section>
    <TextField label="Last period started" text={hasDate && isISODate(selectedDate) ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(`${selectedDate}T12:00:00`)) : 'Select a date'} supportingText={liveMode && hasDate && !validDate ? 'Choose today or an earlier date.' : hasDate ? 'Used to estimate today’s cycle context.' : 'Choose the first day of your most recent period.'} invalid={liveMode && hasDate && !validDate} filled={hasDate} onClick={() => { setCycleLengthFocused(false); setCalendarOpen(true) }} trailing={<span className="cycle-basics-screen__calendar-icon"><CalendarIcon /></span>} />
    {hasDate ? <>
      <TextField label="Typical cycle length · optional" text={cycleLength} editable inputMode="numeric" onChangeText={text => { setCycleLength(text); if (Number.isFinite(pickerCycleLength(text))) onChange?.(values(selectedDate, text)) }} invalid={!validLength} supportingText={validLength ? 'Change this only if you know your usual length.' : 'Enter a whole number from 15 to 90 days.'} filled focused={cycleLengthFocused} onClick={() => setCycleLengthFocused(true)} onBlur={() => setCycleLengthFocused(false)} />
      <section className="cycle-basics-screen__estimate"><span>ESTIMATED TODAY</span><strong>{estimate}</strong><p>{!liveMode ? 'Possible pattern: focused work may feel easier.' : 'An estimate for planning, not a measurement.'}</p></section>
      <div className="cycle-basics-screen__selected-spacer" aria-hidden="true" />
      <Button className="cycle-basics-screen__continue" type="button" disabled={!validLength || (liveMode && !validDate)} onClick={() => onContinue(values())}>Continue</Button>
    </> : <>
      <button className="cycle-basics-screen__remember" type="button" onClick={() => onNoExactDate ? onNoExactDate() : setNoExactDate(true)}>I don’t remember the date</button>
      <div className="cycle-basics-screen__initial-spacer" aria-hidden="true" />
      <Button className="cycle-basics-screen__continue" type="button" disabled>Continue</Button>
    </>}
    {calendarOpen ? <CalendarOverlay month={liveMode ? calendarMonth : undefined} selectedDay={selectedDay} maxDate={liveMode ? localISO() : undefined} onSelectDate={liveMode ? selectDate : undefined} onClose={() => setCalendarOpen(false)} onSelect={day => selectDate(`${calendarMonth}-${String(day).padStart(2, '0')}`)} /> : null}
  </main>
}
