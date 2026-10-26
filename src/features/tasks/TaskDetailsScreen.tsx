import { useState } from 'react'
import { AppHeader } from '../../components/AppHeader'
import { Button } from '../../components/Button'
import { ImportanceSelector, type Importance } from '../../components/ImportanceSelector'
import { TextField } from '../../components/TextField'
import { TimePickerOverlay } from '../../components/TimePickerOverlay'
import { pickerTimeValue } from '../../components/pickerValues'
import { isISODate, localISO } from '../../domain/planner'
import { WorkTypeField, type WorkTypeChoice } from '../cycle-preferences/WorkTypeField'
import type { CanonicalTaskId, TaskItem } from './TasksScreen'
import { DeleteTaskConfirmationScreen } from './DeleteTaskConfirmationScreen'
import './TaskDetailsScreen.css'

type TaskType = 'Flexible' | 'Fixed'
type Focused = 'task' | 'duration' | 'timing' | null

type DetailStateMap = {
  baseKind: TaskType
  base: string
  task: string
  duration: string
  timing: string
  toggled: string
  flexibleDeadline: string
  fixedDate: string
  startTime: string
}

const DETAIL_STATES: Record<CanonicalTaskId, DetailStateMap> = {
  dentist: {
    baseKind: 'Flexible',
    base: '4198:266',
    task: '4272:2747',
    duration: '4272:2805',
    timing: '4272:2863',
    toggled: '4272:2921',
    flexibleDeadline: 'Fri 27 Oct',
    fixedDate: 'Fri 27 Oct',
    startTime: '09:00',
  },
  groceries: {
    baseKind: 'Flexible',
    base: '4272:4126',
    task: '4285:4339',
    duration: '4285:4397',
    timing: '4285:4455',
    toggled: '4285:4513',
    flexibleDeadline: 'No deadline',
    fixedDate: 'Mon 23 Oct',
    startTime: '17:30',
  },
  yoga: {
    baseKind: 'Fixed',
    base: '4272:4180',
    task: '4285:4708',
    duration: '4285:4766',
    timing: '4285:4824',
    toggled: '4285:4882',
    flexibleDeadline: 'Wed 25 Oct',
    fixedDate: 'Wed 25 Oct',
    startTime: '18:00',
  },
  meeting: {
    baseKind: 'Fixed',
    base: '4273:3170',
    task: '4285:5077',
    duration: '4285:5135',
    timing: '4285:5193',
    toggled: '4285:5251',
    flexibleDeadline: 'Today',
    fixedDate: 'Mon 23 Oct',
    startTime: '11:00',
  },
  prescription: {
    baseKind: 'Flexible',
    base: '4277:6209',
    task: '4285:5446',
    duration: '4285:5504',
    timing: '4285:5562',
    toggled: '4285:5620',
    flexibleDeadline: 'No deadline',
    fixedDate: 'Fri 27 Oct',
    startTime: '16:00',
  },
}

export interface TaskDetailsScreenProps {
  liveMode?: boolean
  task: TaskItem
  onBack: () => void
  onSave: (task: TaskItem) => void
  onDelete: (task: TaskItem) => void
}

export function TaskDetailsScreen({ task, onBack, onSave, onDelete, liveMode = false }: TaskDetailsScreenProps) {
  const descriptor = task.canonicalId ? DETAIL_STATES[task.canonicalId] : undefined
  const [title, setTitle] = useState(task.title)
  const [taskType, setTaskType] = useState<TaskType>(task.kind)
  const [duration, setDuration] = useState(task.duration ?? (liveMode ? '30 min' : task.meta))
  const [deadline, setDeadline] = useState(task.deadline ?? (liveMode ? '' : descriptor?.flexibleDeadline ?? 'Fri 27 Oct'))
  const [fixedDate, setFixedDate] = useState(task.fixedDate ?? (liveMode ? localISO() : descriptor?.fixedDate ?? 'Fri 27 Oct'))
  const [startTime, setStartTime] = useState(task.startTime ?? descriptor?.startTime ?? '09:00')
  const [importance, setImportance] = useState<Importance>(task.importance ?? 'Important')
  const [workType, setWorkType] = useState<WorkTypeChoice>(task.workType ?? 'auto')
  const [focused, setFocused] = useState<Focused>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [overlay, setOverlay] = useState<'duration' | 'start' | null>(null)

  if (confirmDelete) {
    return (
      <DeleteTaskConfirmationScreen
        onBack={() => setConfirmDelete(false)}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => onDelete(task)}
      />
    )
  }

  const fixed = taskType === 'Fixed'
  const toggled = descriptor ? taskType !== descriptor.baseKind : false

  const figmaNode = descriptor
    ? toggled
      ? descriptor.toggled
      : focused === 'task'
        ? descriptor.task
        : focused === 'duration'
          ? descriptor.duration
          : focused === 'timing'
            ? descriptor.timing
            : descriptor.base
    : fixed
      ? '4272:2921'
      : focused === 'task'
        ? '4272:2747'
        : focused === 'duration'
          ? '4272:2805'
          : focused === 'timing'
            ? '4272:2863'
            : '4198:266'

  const durationMatch = duration.trim().match(/^(\d+(?:\.\d+)?)\s*(min(?:utes?)?|m|h(?:ours?)?)?$/i)
  const durationMinutes = durationMatch ? Number(durationMatch[1]) * (durationMatch[2]?.toLowerCase().startsWith('h') ? 60 : 1) : NaN
  const startMatch = startTime.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
  let startHour = Number(startMatch?.[1])
  if (startMatch?.[3]) startHour = startHour % 12 + (startMatch[3].toUpperCase() === 'PM' ? 12 : 0)
  const startMinute = Number(startMatch?.[2])
  const validTime = Boolean(startMatch) && (!startMatch?.[3] || (Number(startMatch[1]) >= 1 && Number(startMatch[1]) <= 12)) && startHour >= 0 && startHour < 24 && startMinute >= 0 && startMinute < 60
  const startMinutes = startHour * 60 + startMinute
  const normalizedStart = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`
  const validDate = isISODate
  const noDeadline = !deadline.trim() || /^(none|no deadline)$/i.test(deadline.trim())
  const invalidDate = liveMode && (fixed ? !validDate(fixedDate) : !noDeadline && !validDate(deadline))
  const timingError = invalidDate ? 'Enter a valid date in YYYY-MM-DD format.' : liveMode && fixed && validTime && startMinutes + durationMinutes > 1440 ? 'Choose a start time and duration that end by midnight.' : undefined
  const valid = Boolean(title.trim()) && (!liveMode || (Number.isInteger(durationMinutes) && durationMinutes > 0 && durationMinutes <= 1440 && (fixed ? validDate(fixedDate) && validTime && startMinutes + durationMinutes <= 1440 : noDeadline || validDate(deadline))))

  const save = () => {
    if (!valid) return
    const savedDuration = liveMode ? `${durationMinutes} min` : duration
    const savedStart = liveMode ? normalizedStart : startTime
    const updated: TaskItem = {
      ...task,
      title: title.trim(),
      kind: taskType,
      duration: savedDuration,
      deadline: liveMode ? (!fixed && !noDeadline ? deadline.trim() : undefined) : deadline,
      fixedDate: liveMode ? (fixed ? fixedDate : undefined) : fixedDate,
      startTime: liveMode ? (fixed ? savedStart : undefined) : startTime,
      importance,
      ...(liveMode ? { workType: workType === 'auto' ? undefined : workType } : {}),
      meta: fixed ? `${fixedDate} · ${savedStart} · ${savedDuration}` : savedDuration,
    }
    onSave(updated)
  }

  const setType = (next: TaskType) => {
    setTaskType(next)
    setFocused(null)
  }

  return (
    <main className={`task-details-screen${liveMode ? ' task-details-screen--live live-content-screen' : ''}`} data-figma-node={figmaNode}>
      <AppHeader title="Edit task" onBack={onBack} />
      <section className="task-details-screen__content">
        <h2>Edit task</h2>
        <p className="task-details-screen__intro" role={timingError ? 'alert' : undefined}>{timingError ?? 'Update the task here. Your current plan stays unchanged.'}</p>

        <section className={`task-details-screen__card ${fixed ? 'task-details-screen__card--fixed' : ''}`}>
          <TextField
            className="task-details-screen__task"
            label="Task"
            text={title}
            filled
            focused={focused === 'task'}
            editable
            onClick={() => setFocused('task')}
            onChangeText={setTitle}
          />

          <p className="task-details-screen__type-label">TYPE</p>
          <button
            className={`task-details-screen__type task-details-screen__type--flex ${!fixed ? 'task-details-screen__type--selected' : ''}`}
            type="button"
            aria-pressed={!fixed}
            onClick={() => setType('Flexible')}
          >
            Flexible
          </button>
          <button
            className={`task-details-screen__type task-details-screen__type--fixed ${fixed ? 'task-details-screen__type--selected' : ''}`}
            type="button"
            aria-pressed={fixed}
            onClick={() => setType('Fixed')}
          >
            Fixed
          </button>

          {!fixed ? (
            <>
              <TextField
                className="task-details-screen__duration"
                label="Duration"
                text={duration}
                filled
                focused={focused === 'duration'}
                editable={!liveMode}
                onClick={() => { setFocused('duration'); if (liveMode) setOverlay('duration') }}
                onChangeText={setDuration}
              />
              <TextField
                className="task-details-screen__deadline"
                label="Deadline · optional"
                text={deadline}
                ariaLabel={liveMode ? 'Deadline · optional (YYYY-MM-DD)' : undefined}
                invalid={invalidDate}
                supportingText={invalidDate ? 'Enter YYYY-MM-DD, or leave blank for no deadline.' : undefined}
                filled
                focused={focused === 'timing'}
                editable
                onClick={() => setFocused('timing')}
                onChangeText={setDeadline}
              />
              <p className="task-details-screen__importance-label">IMPORTANCE · OPTIONAL</p>
              <div className="task-details-screen__importance">
                <ImportanceSelector value={importance} onChange={setImportance} />
              </div>
            </>
          ) : (
            <>
              <TextField
                className="task-details-screen__date"
                label="Date"
                text={fixedDate}
                ariaLabel={liveMode ? 'Date (YYYY-MM-DD)' : undefined}
                invalid={invalidDate}
                supportingText={invalidDate ? 'Enter a valid date in YYYY-MM-DD format.' : undefined}
                filled
                focused={focused === 'timing'}
                editable
                onClick={() => setFocused('timing')}
                onChangeText={setFixedDate}
              />
              <TextField
                className="task-details-screen__start"
                label="Start time"
                text={startTime}
                onClick={liveMode ? () => setOverlay('start') : undefined}
                onChangeText={setStartTime}
                filled
              />
              <TextField
                className="task-details-screen__fixed-duration"
                label="Duration"
                text={duration}
                filled
                focused={focused === 'duration'}
                editable={!liveMode}
                onClick={() => { setFocused('duration'); if (liveMode) setOverlay('duration') }}
                onChangeText={setDuration}
              />
              <p className="task-details-screen__importance-label task-details-screen__importance-label--fixed">IMPORTANCE · OPTIONAL</p>
              <div className="task-details-screen__importance task-details-screen__importance--fixed">
                <ImportanceSelector value={importance} onChange={setImportance} />
              </div>
            </>
          )}
          {liveMode ? <WorkTypeField value={workType} onChange={setWorkType} title={title} fixed={fixed} /> : null}
        </section>

        <Button
          className={`task-details-screen__save ${fixed ? 'task-details-screen__save--fixed' : ''}`}
          type="button"
          disabled={!valid}
          onClick={save}
        >
          Save task
        </Button>
        <button
          className={`task-details-screen__delete ${fixed ? 'task-details-screen__delete--fixed' : ''}`}
          type="button"
          onClick={() => setConfirmDelete(true)}
        >
          Delete task
        </button>
      </section>
      {overlay === 'duration' ? <TimePickerOverlay mode="start" title="Duration" ariaLabel="Task duration" selected={duration} options={['30 min', '45 min', '60 min', '90 min']} customEntry="duration" onClose={() => setOverlay(null)} onSelect={value => { setDuration(value); setOverlay(null) }} /> : null}
      {overlay === 'start' ? <TimePickerOverlay mode="start" selected={startTime} options={['10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM']} customEntry="time" onClose={() => setOverlay(null)} onSelect={value => { setStartTime(pickerTimeValue(value)); setOverlay(null) }} /> : null}
    </main>
  )
}
