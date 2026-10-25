import { useState } from 'react'
import { AppHeader } from '../../components/AppHeader'
import { Button } from '../../components/Button'
import { CommitmentDateOverlay } from '../../components/CommitmentDateOverlay'
import { TextField } from '../../components/TextField'
import { pickerTimeValue } from '../../components/pickerValues'
import { durationMinutes, isISODate, minutes } from '../../domain/planner'
import { EditBlockStartOverlay } from './EditBlockStartOverlay'
import { EditDurationOverlay } from './EditDurationOverlay'
import type { PlanBlockData, PlanBlockEdit } from './planData'
import './EditPlanBlockScreen.css'

type Focused = 'task' | 'date' | 'start' | 'duration' | null
type EditOverlay = 'date' | 'start' | 'duration' | null
function formatDate(day: number) { const weekday = new Intl.DateTimeFormat('en', { weekday: 'short' }).format(new Date(2023, 9, day)); return `${weekday} ${day} Oct` }

export function EditPlanBlockScreen({ block, source, onBack, onPreview }: { block: PlanBlockData; source: 'direct' | 'overlay'; onBack: () => void; onPreview: (edit: PlanBlockEdit) => void }) {
  const [task, setTask] = useState(block.title)
  const [date, setDate] = useState(block.dateISO ?? block.date)
  const [start, setStart] = useState(block.start)
  const [duration, setDuration] = useState(block.duration)
  const [fixed, setFixed] = useState(block.fixed ?? false)
  const [focused, setFocused] = useState<Focused>(null)
  const [overlay, setOverlay] = useState<EditOverlay>(null)
  const [startChoice, setStartChoice] = useState('11:30 AM')
  const baseNode = block.id === 'prepare' && source === 'direct' ? (block.directEditNode ?? block.editNode) : block.editNode
  const node = block.id === 'prepare' && source === 'direct' ? (fixed ? '4272:2636' : focused === 'task' ? '4272:2448' : focused === 'date' ? '4272:2495' : focused === 'start' ? '4272:2542' : focused === 'duration' ? '4272:2589' : baseNode) : baseNode
  const liveMode = Boolean(block.dateISO)
  const overlayMode = source === 'overlay' && !liveMode
  const usePickers = liveMode || overlayMode
  const selectedDate = isISODate(date) ? date : block.dateISO
  const selectedDay = selectedDate ? Number(selectedDate.slice(8, 10)) : Number(block.dayNumber)
  const totalMinutes = durationMinutes(duration)
  const valid = !liveMode || (Boolean(task.trim()) && isISODate(date) && Number.isFinite(minutes(start)) && Number.isFinite(totalMinutes) && minutes(start) + totalMinutes <= 1440)
  const preview = () => {
    if (!valid) return
    onPreview({ id: block.id, title: task.trim(), date, dateISO: isISODate(date) ? date : date === block.date ? block.dateISO : undefined, start, duration, fixed })
  }

  return <main className="edit-plan-block-screen" data-figma-node={node}>
    <AppHeader title="Edit block" onBack={onBack} />
    <div className="edit-plan-block-screen__content">
      <p className="edit-plan-block-screen__intro">Edit this block. You’ll preview any other changes to your plan before applying them.</p>
      <TextField label="Task" text={task} filled focused={!overlayMode && focused === 'task'} editable={!overlayMode} onClick={overlayMode ? undefined : () => setFocused('task')} onChangeText={setTask} />
      <TextField label="Date" text={date} filled focused={!usePickers && focused === 'date'} editable={!usePickers} onClick={usePickers ? () => setOverlay('date') : () => setFocused('date')} onChangeText={setDate} />
      <TextField label="Start time" text={start} filled focused={!usePickers && focused === 'start'} editable={!usePickers} onClick={usePickers ? () => setOverlay('start') : () => setFocused('start')} onChangeText={setStart} />
      <TextField label="Duration" text={duration} filled focused={!usePickers && focused === 'duration'} editable={!usePickers} onClick={usePickers ? () => setOverlay('duration') : () => setFocused('duration')} onChangeText={setDuration} />
      <div className="edit-plan-block-screen__fixed"><div><strong>Fixed time</strong><span>Turn on only if this block cannot move.</span></div><button type="button" role="switch" aria-label="Fixed time" aria-checked={fixed} aria-disabled={overlayMode || undefined} className={fixed ? 'edit-plan-block-screen__switch edit-plan-block-screen__switch--on' : 'edit-plan-block-screen__switch'} onClick={overlayMode ? undefined : () => { setFixed(!fixed); setFocused(null) }}><span /></button></div>
      <p className="edit-plan-block-screen__impact" role={!valid ? 'alert' : undefined}>{valid ? 'If this edit affects other flexible blocks, Plan4Her will show the differences before anything changes.' : 'Enter a task, valid date, start time and positive duration that ends by midnight.'}</p>
      <div className="edit-plan-block-screen__spacer" />
      <Button className="edit-plan-block-screen__preview" type="button" disabled={!valid} onClick={preview}>Preview changes</Button>
    </div>
    {overlay === 'date' ? <CommitmentDateOverlay selectedDay={selectedDay} month={liveMode ? selectedDate?.slice(0, 7) : undefined} showSelection={liveMode} figmaNode="4701:7826" ariaLabel="Edit block date" onClose={() => setOverlay(null)} onSelect={value => { setDate(formatDate(value)); setOverlay(null) }} onSelectDate={liveMode ? value => { setDate(value); setOverlay(null) } : undefined} /> : null}
    {overlay === 'start' ? <EditBlockStartOverlay selected={liveMode ? start : startChoice} allowCustom={liveMode} onClose={() => setOverlay(null)} onSelect={value => { setStartChoice(value); setStart(pickerTimeValue(value)); setOverlay(null) }} /> : null}
    {overlay === 'duration' ? <EditDurationOverlay selected={duration} allowCustom={liveMode} onClose={() => setOverlay(null)} onSelect={value => { setDuration(value); setOverlay(null) }} /> : null}
  </main>
}
