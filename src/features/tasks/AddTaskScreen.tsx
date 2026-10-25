import { useState } from 'react'
import { AppHeader } from '../../components/AppHeader'
import { Button } from '../../components/Button'
import { CommitmentDateOverlay } from '../../components/CommitmentDateOverlay'
import { ImportanceSelector, type Importance } from '../../components/ImportanceSelector'
import { TextField } from '../../components/TextField'
import { TimePickerOverlay } from '../../components/TimePickerOverlay'
import { pickerTimeMinutes, pickerTimeValue } from '../../components/pickerValues'
import { durationMinutes as parseDuration, localISO } from '../../domain/planner'
import type { WorkType } from '../../domain/cyclePreferences'
import { WorkTypeField } from '../cycle-preferences/WorkTypeField'
import type { TaskItem } from './TasksScreen'
import './AddTaskScreen.css'

type TaskType = 'Flexible' | 'Fixed'
type Overlay = 'duration' | 'deadline' | 'fixed-date' | 'start' | 'end' | null

export interface AddTaskScreenProps {
  liveMode?: boolean
  onBack: () => void
  onCancel: () => void
  onSave: (task: TaskItem) => void
}

export function AddTaskScreen({ onBack, onCancel, onSave, liveMode = false }: AddTaskScreenProps) {
  const [task, setTask] = useState('Prepare grant application')
  const [taskType, setTaskType] = useState<TaskType>('Flexible')
  const [taskFocused, setTaskFocused] = useState(false)
  const [duration, setDuration] = useState('60 min')
  const [deadlineDay, setDeadlineDay] = useState<number | null>(null)
  const [fixedDay, setFixedDay] = useState(liveMode ? new Date().getDate() : 23)
  const [fixedDate, setFixedDate] = useState(localISO())
  const [deadlineDate, setDeadlineDate] = useState<string | null>(null)
  const [startTime, setStartTime] = useState(liveMode ? '11:30' : '11:30 AM')
  const [endTime, setEndTime] = useState(liveMode ? '13:00' : '1:00 PM')
  const [importance, setImportance] = useState<Importance>('Important')
  const [workType, setWorkType] = useState<WorkType>('general')
  const [overlay, setOverlay] = useState<Overlay>(null)

  const fixed = taskType === 'Fixed'
  const figmaNode = taskFocused
    ? fixed ? '4690:7206' : '4690:7144'
    : fixed ? '4578:6074' : '4578:6002'

  const month = liveMode ? localISO().slice(0, 7) : '2023-10'
  const isoDate = (day: number) => `${month}-${String(day).padStart(2, '0')}`
  const displayDate = (date: string) => new Intl.DateTimeFormat('en', {weekday:'short', day:'numeric', month:'short'}).format(new Date(`${date}T12:00:00`))
  const startMinutes = pickerTimeMinutes(startTime)
  const endMinutes = pickerTimeMinutes(endTime)
  const durationMinutes = fixed ? endMinutes - startMinutes : parseDuration(duration)
  const timingError = fixed && (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes) || endMinutes <= startMinutes) ? 'End time must be after start time on the same day.' : undefined
  const valid = Boolean(task.trim()) && Number.isInteger(durationMinutes) && durationMinutes > 0 && durationMinutes <= 1440 && !timingError
  const save = () => {
    if (!valid) return
    const savedDuration = `${durationMinutes} min`
    const savedStart = liveMode ? `${String(Math.floor(startMinutes / 60)).padStart(2,'0')}:${String(startMinutes % 60).padStart(2,'0')}` : startTime
    const meta = fixed ? `${liveMode ? displayDate(fixedDate) : `Mon ${fixedDay} Oct`} · ${startTime}–${endTime}` : savedDuration
    onSave({ id: crypto.randomUUID(), title: task.trim(), meta, kind: taskType, duration: savedDuration, importance,
      ...(liveMode ? { workType } : {}),
      fixedDate: fixed ? (liveMode ? fixedDate : `Mon ${fixedDay} Oct`) : undefined,
      startTime: fixed ? savedStart : undefined,
      deadline: !fixed && deadlineDay ? (liveMode ? deadlineDate ?? isoDate(deadlineDay) : `Fri ${deadlineDay} Oct`) : undefined })
  }

  return (
    <main className={`add-task-screen${liveMode ? ' add-task-screen--live live-content-screen' : ''}`} data-figma-node={figmaNode}>
      <AppHeader title="Add task" onBack={onBack} />
      <section className="add-task-screen__content">
        <h2>Add task</h2>
        <p className="add-task-screen__intro" role={timingError ? 'alert' : undefined}>{timingError ?? 'Add the planning details now. The task will stay Unscheduled until you plan it.'}</p>

        <section className={`add-task-screen__card ${fixed ? 'add-task-screen__card--fixed' : ''}`}>
          <TextField
            className="add-task-screen__task"
            label="Task"
            text={task}
            filled
            focused={taskFocused}
            editable
            onClick={() => setTaskFocused(true)}
            onChangeText={setTask}
          />

          <p className="add-task-screen__type-label">TYPE</p>
          <button className={`add-task-screen__type add-task-screen__type--flex ${!fixed ? 'add-task-screen__type--selected' : ''}`} type="button" aria-pressed={!fixed} onClick={() => { setTaskType('Flexible'); setTaskFocused(false) }}>Flexible</button>
          <button className={`add-task-screen__type add-task-screen__type--fixed ${fixed ? 'add-task-screen__type--selected' : ''}`} type="button" aria-pressed={fixed} onClick={() => { setTaskType('Fixed'); setTaskFocused(false) }}>Fixed</button>

          {!fixed ? (
            <>
              <TextField className="add-task-screen__duration" label="Duration" text={duration} filled onClick={() => setOverlay('duration')} />
              <TextField className="add-task-screen__deadline" label="Deadline · optional" text={deadlineDay ? (liveMode ? displayDate(deadlineDate ?? isoDate(deadlineDay)) : `Fri ${deadlineDay} Oct`) : 'None'} filled={deadlineDay !== null} onClick={() => setOverlay('deadline')} />
              <p className="add-task-screen__importance-label">IMPORTANCE · OPTIONAL</p>
              <div className="add-task-screen__importance"><ImportanceSelector value={importance} onChange={setImportance} /></div>
            </>
          ) : (
            <>
              <TextField className="add-task-screen__date" label="Date" text={liveMode ? displayDate(fixedDate) : `Mon ${fixedDay} Oct`} filled onClick={() => setOverlay('fixed-date')} />
              <TextField className="add-task-screen__start" label="Start time" text={startTime} filled onClick={() => setOverlay('start')} />
              <TextField className="add-task-screen__end" label="End time" text={endTime} filled onClick={() => setOverlay('end')} />
              <p className="add-task-screen__importance-label add-task-screen__importance-label--fixed">IMPORTANCE · OPTIONAL</p>
              <div className="add-task-screen__importance add-task-screen__importance--fixed"><ImportanceSelector value={importance} onChange={setImportance} /></div>
            </>
          )}
          {liveMode ? <WorkTypeField value={workType} onChange={setWorkType} fixed={fixed} /> : null}
        </section>

        <Button className={`add-task-screen__save ${fixed ? 'add-task-screen__save--fixed' : ''}`} type="button" disabled={!valid} onClick={save}>Save as Unscheduled</Button>
        <button className={`add-task-screen__cancel ${fixed ? 'add-task-screen__cancel--fixed' : ''}`} type="button" onClick={onCancel}>Cancel</button>
      </section>

      {overlay === 'duration' ? (
        <TimePickerOverlay
          mode="start"
          title="Duration"
          customEntry={liveMode ? 'duration' : undefined}
          ariaLabel="Task duration"
          figmaNode="4690:7273"
          selected={duration}
          options={['30 min','45 min','60 min','90 min']}
          onClose={() => setOverlay(null)}
          onSelect={(value) => { setDuration(value); setOverlay(null) }}
        />
      ) : null}
      {overlay === 'deadline' ? (
        <CommitmentDateOverlay
          selectedDay={deadlineDay}
          month={liveMode ? deadlineDate?.slice(0, 7) ?? month : undefined}
          onSelectDate={liveMode ? value => { setDeadlineDate(value); setDeadlineDay(Number(value.slice(8, 10))); setOverlay(null) } : undefined}
          figmaNode="4690:7318"
          ariaLabel="Task deadline"
          onClear={liveMode && deadlineDay !== null ? () => { setDeadlineDate(null); setDeadlineDay(null); setOverlay(null) } : undefined}
          clearLabel="Clear deadline"
          onClose={() => setOverlay(null)}
          onSelect={(day) => { setDeadlineDay(day); setOverlay(null) }}
        />
      ) : null}
      {overlay === 'fixed-date' ? (
        <CommitmentDateOverlay
          selectedDay={fixedDay}
          month={liveMode ? fixedDate.slice(0, 7) : undefined}
          onSelectDate={liveMode ? value => { setFixedDate(value); setFixedDay(Number(value.slice(8, 10))); setOverlay(null) } : undefined}
          figmaNode="4690:7443"
          ariaLabel="Task fixed date"
          onClose={() => setOverlay(null)}
          onSelect={(day) => { setFixedDay(day); setOverlay(null) }}
        />
      ) : null}
      {overlay === 'start' ? (
        <TimePickerOverlay
          mode="start"
          title="Start time"
          customEntry={liveMode ? 'time' : undefined}
          figmaNode="4690:7288"
          selected={startTime}
          options={['10:30 AM','11:00 AM','11:30 AM','12:00 PM']}
          onClose={() => setOverlay(null)}
          onSelect={(value) => { setStartTime(liveMode ? pickerTimeValue(value) : value); setOverlay(null) }}
        />
      ) : null}
      {overlay === 'end' ? (
        <TimePickerOverlay
          mode="end"
          title="End time"
          customEntry={liveMode ? 'time' : undefined}
          afterTime={liveMode ? startTime : undefined}
          figmaNode="4690:7303"
          selected={endTime}
          options={['12:30 PM','1:00 PM','1:30 PM','2:00 PM']}
          onClose={() => setOverlay(null)}
          onSelect={(value) => { setEndTime(liveMode ? pickerTimeValue(value) : value); setOverlay(null) }}
        />
      ) : null}
    </main>
  )
}
