import { useState } from 'react'
import { Button } from '../../components/Button'
import { SetupHeader } from '../../components/SetupHeader'
import { TextField } from '../../components/TextField'
import './AvailabilityScreen.css'

export interface AvailabilityScreenProps {
  onBack: () => void
  onContinue: (values: AvailabilityValues) => void
  initialValues?: AvailabilityValues
  onChange?: (values: AvailabilityValues) => void
  onCustomize?: () => void
}

type BaseField = 'weekdays' | 'weekends' | null
export type Day = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'

export type AvailabilityValues = Record<Day, string>

const dayNodeIds: Record<Day, string> = {
  Monday: '4285:3954',
  Tuesday: '4285:4006',
  Wednesday: '4285:4058',
  Thursday: '4285:4110',
  Friday: '4285:4162',
  Saturday: '4285:4214',
  Sunday: '4285:4266',
}

const initialDayValues: Record<Day, string> = {
  Monday: '09:00–18:00',
  Tuesday: '09:00–18:00',
  Wednesday: '09:00–18:00',
  Thursday: '09:00–18:00',
  Friday: '09:00–18:00',
  Saturday: '10:00–16:00',
  Sunday: '10:00–16:00',
}

const support: Record<Day, string> = {
  Monday: 'Mon–Fri',
  Tuesday: 'Sat–Sun · optional',
  Wednesday: 'Mon–Fri',
  Thursday: 'Mon–Fri',
  Friday: 'Mon–Fri',
  Saturday: 'Mon–Fri',
  Sunday: 'Mon–Fri',
}

function validAvailability(value: string) {
  if (!value.trim()) return true
  const match = value.trim().match(/^(\d{2}):(\d{2})\s*[–—-]\s*(\d{2}):(\d{2})$/)
  return Boolean(match && Number(match[1]) < 24 && Number(match[3]) < 24 && Number(match[2]) < 60 && Number(match[4]) < 60 && `${match[1]}:${match[2]}` < `${match[3]}:${match[4]}`)
}

function hasCustomDays(values: AvailabilityValues) {
  return (Object.keys(values) as Day[]).some(day => values[day] !== values[day === 'Saturday' || day === 'Sunday' ? 'Saturday' : 'Monday'])
}

const availabilityHelp = 'Use HH:MM–HH:MM with the end after the start, or leave blank.'

export function AvailabilityScreen({ onBack, onContinue, onCustomize, initialValues, onChange }: AvailabilityScreenProps) {
  const [customByDay, setCustomByDay] = useState(() => initialValues ? hasCustomDays(initialValues) : false)
  const [focusedBaseField, setFocusedBaseField] = useState<BaseField>(null)
  const [focusedDay, setFocusedDay] = useState<Day | null>(null)
  const [weekdayValue, setWeekdayValue] = useState(initialValues?.Monday ?? '09:00–18:00')
  const [weekendValue, setWeekendValue] = useState(initialValues?.Saturday ?? '10:00–16:00')
  const [dayValues, setDayValues] = useState<AvailabilityValues>(initialValues ?? initialDayValues)

  const updateDays = (values: AvailabilityValues) => { setDayValues(values); onChange?.(values) }
  const setBase = (value: string, weekend: boolean) => {
    if (weekend) setWeekendValue(value); else setWeekdayValue(value)
    const next = { ...dayValues }
    ;(Object.keys(next) as Day[]).forEach(day => { if ((day === 'Saturday' || day === 'Sunday') === weekend) next[day] = value })
    updateDays(next)
  }
  const invalidDays = (Object.keys(dayValues) as Day[]).filter(day => !validAvailability(dayValues[day]))
  const valid = invalidDays.length === 0
  const customDays = hasCustomDays(dayValues)
  const leaveCustomDays = () => {
    if (['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].every(day => dayValues[day as Day] === dayValues.Monday)) setWeekdayValue(dayValues.Monday)
    if (dayValues.Saturday === dayValues.Sunday) setWeekendValue(dayValues.Saturday)
    setCustomByDay(false)
  }

  if (customByDay) {
    const figmaNode = focusedDay ? dayNodeIds[focusedDay] : '4272:2380'

    return (
      <main className="availability-screen availability-screen--custom" data-figma-node={figmaNode}>
        <SetupHeader label="3 of 4 · Availability" progress={0.75} onBack={leaveCustomDays} />
        <h1 className="availability-screen__title">Customize availability</h1>
        <p className="availability-screen__description">Edit only the days that differ from your usual schedule.</p>
        <section className="availability-screen__note">DEFAULT AVAILABILITY</section>

        <div className="availability-screen__day-fields">
          {(Object.keys(dayValues) as Day[]).map((day) => (
            <TextField
              key={day}
              label={day}
              text={dayValues[day]}
              supportingText={validAvailability(dayValues[day]) ? support[day] : availabilityHelp}
              invalid={!validAvailability(dayValues[day])}
              filled
              focused={focusedDay === day}
              editable
              onClick={() => setFocusedDay(day)}
              onChangeText={(value) => updateDays({ ...dayValues, [day]: value })}
            />
          ))}
        </div>

        <button
          className="availability-screen__customize"
          type="button"
          onClick={() => {
            setFocusedDay(null)
            updateDays(Object.fromEntries((Object.keys(dayValues) as Day[]).map(day => [day, day === 'Saturday' || day === 'Sunday' ? weekendValue : weekdayValue])) as AvailabilityValues)
            setCustomByDay(false)
          }}
        >
          Use weekday defaults
        </button>

        <div className="availability-screen__spacer" aria-hidden="true" />
        <Button className="availability-screen__continue" type="button" disabled={!valid} onClick={() => onContinue(dayValues)}>Continue</Button>
      </main>
    )
  }

  const figmaNode =
    focusedBaseField === 'weekdays'
      ? '4272:2326'
      : focusedBaseField === 'weekends'
        ? '4272:2353'
        : '4216:1332'

  return (
    <main className="availability-screen" data-figma-node={figmaNode}>
      <SetupHeader label="3 of 4 · Availability" progress={0.75} onBack={onBack} />
      <h1 className="availability-screen__title">When can flexible work fit?</h1>
      <p className="availability-screen__description" role={!valid ? 'alert' : undefined}>{!valid ? (customDays ? `Check ${invalidDays.join(', ')}. Open Customize days to fix those times.` : 'Check the highlighted times below.') : customDays ? 'Your custom days are saved. Open Customize days to review them.' : 'Use these defaults or change what doesn’t fit.'}</p>
      <section className="availability-screen__note">{customDays ? 'CUSTOM AVAILABILITY' : 'DEFAULT AVAILABILITY'}</section>

      <TextField
        label="Weekdays"
        text={weekdayValue}
        supportingText={validAvailability(weekdayValue) ? 'Mon–Fri' : availabilityHelp}
        invalid={!validAvailability(weekdayValue)}
        filled
        focused={focusedBaseField === 'weekdays'}
        editable
        onClick={() => setFocusedBaseField('weekdays')}
        onChangeText={(value) => setBase(value, false)}
      />

      <TextField
        label="Weekends"
        text={weekendValue}
        supportingText={validAvailability(weekendValue) ? 'Sat–Sun · optional' : availabilityHelp}
        invalid={!validAvailability(weekendValue)}
        filled
        focused={focusedBaseField === 'weekends'}
        editable
        onClick={() => setFocusedBaseField('weekends')}
        onChangeText={(value) => setBase(value, true)}
      />

      <button
        className="availability-screen__customize"
        type="button"
        onClick={() => {
          setFocusedBaseField(null)
          setCustomByDay(true)
          onCustomize?.()
        }}
      >
        Customize days
      </button>

      <div className="availability-screen__spacer" aria-hidden="true" />
      <Button className="availability-screen__continue" type="button" disabled={!valid} onClick={() => onContinue(dayValues)}>Continue</Button>
    </main>
  )
}
