import { useState } from 'react'
import { AddTaskChooser } from '../../components/AddTaskChooser'
import { AppHeader } from '../../components/AppHeader'
import { BottomNav, type RootTab } from '../../components/BottomNav'
import { Button } from '../../components/Button'
import { TaskCard, type TaskKind } from '../../components/TaskCard'
import type { WorkType } from '../../domain/cyclePreferences'
import './TasksScreen.css'

export type CanonicalTaskId = 'dentist' | 'groceries' | 'yoga' | 'meeting' | 'prescription'
export type TaskImportance = 'Must' | 'Important' | 'Optional'

export interface TaskItem {
  id: string
  canonicalId?: CanonicalTaskId
  title: string
  meta: string
  kind: TaskKind
  duration?: string
  deadline?: string
  fixedDate?: string
  startTime?: string
  importance?: TaskImportance
  workType?: WorkType
  done?: boolean
}

export interface TasksScreenProps {
  tasks: TaskItem[]
  /** Live backlog behavior; canonical Figma examples retain completion controls. */
  planningSelection?: boolean
  scheduledTaskIds?: string[]
  onAddToPlan?: (selectedTaskIds: string[]) => void
  planningError?: string
  addedState?: boolean
  savedMessage?: 'Saved to Tasks' | 'Saved as Unscheduled'
  onNavigate?: (tab: RootTab) => void
  onOpenTask?: (task: TaskItem) => void
  onToggleDone?: (task: TaskItem) => void
  onQuickCapture: () => void
  onAddWithDetails: () => void
  onAddStarterTasks?: () => void
  onUndoSaved?: () => void
}

const BASE_DONE_NODES: Partial<Record<CanonicalTaskId, string>> = {
  dentist: '4273:3371',
  groceries: '4273:3467',
  yoga: '4273:3563',
}

const ADDED_DONE_NODES: Partial<Record<CanonicalTaskId, string>> = {
  dentist: '4277:6284',
  groceries: '4277:6401',
  yoga: '4277:6514',
  prescription: '4277:6631',
}

export function TasksScreen({
  tasks,
  planningSelection = false,
  scheduledTaskIds = [],
  onAddToPlan,
  planningError,
  addedState = false,
  savedMessage = 'Saved to Tasks',
  onNavigate,
  onOpenTask,
  onToggleDone,
  onQuickCapture,
  onAddWithDetails,
  onAddStarterTasks,
  onUndoSaved,
}: TasksScreenProps) {
  const [chooserOpen, setChooserOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const scheduled = new Set(scheduledTaskIds)
  const backlog = tasks.filter((task) => !scheduled.has(task.id))
  const plannedTasks = tasks.filter((task) => scheduled.has(task.id))
  const selected = selectedIds.filter((id) => backlog.some((task) => task.id === id && !task.done))
  const toggleSelection = (task: TaskItem) => setSelectedIds((current) => current.includes(task.id) ? current.filter((id) => id !== task.id) : [...current, task.id])
  const toggleDone = (task: TaskItem) => {
    setSelectedIds((current) => current.filter((id) => id !== task.id))
    onToggleDone?.(task)
  }
  const empty = tasks.length === 0
  const doneTask = tasks.find((task) => task.done)
  const quickCaptureAdded = addedState && savedMessage === 'Saved to Tasks' && tasks.some((task) => task.canonicalId === 'prescription')
  const doneNode = doneTask?.canonicalId
    ? (quickCaptureAdded ? ADDED_DONE_NODES[doneTask.canonicalId] : BASE_DONE_NODES[doneTask.canonicalId])
    : undefined

  const figmaNode = empty
    ? '4250:4047'
    : doneNode
      ?? (addedState && savedMessage === 'Saved as Unscheduled'
        ? '4650:5836'
        : addedState
          ? '4216:3901'
          : '4198:253')

  return (
    <main className={`tasks-screen${planningSelection ? ' tasks-screen--selection' : ''}`} data-figma-node={figmaNode}>
      <AppHeader title="Tasks" />

      {empty ? (
        <section className="tasks-screen__scroll tasks-screen__scroll--empty">
          <div className="tasks-screen__empty-visual" aria-hidden="true">
            <svg viewBox="0 0 28 28">
              <rect x="4" y="5" width="4" height="4" rx="1" />
              <path d="M11 7h9M11 13h9M11 19h5" />
              <rect x="4" y="11" width="4" height="4" rx="1" />
              <path d="m4.5 20 1.3 1.3L8.5 18.5M22 17v6M19 20h6" />
            </svg>
          </div>
          <h2>No unscheduled tasks</h2>
          <p className="tasks-screen__empty-body">Tasks you capture without scheduling will appear here.</p>
          <Button className="tasks-screen__empty-add" type="button" onClick={onAddWithDetails}>Add task</Button>
          <Button className="tasks-screen__empty-quick" hierarchy="secondary" type="button" onClick={onQuickCapture}>Quick capture</Button>
          <Button className="tasks-screen__empty-starter" hierarchy="tertiary" type="button" onClick={onAddStarterTasks}>Add starter tasks</Button>
        </section>
      ) : planningSelection ? (
        <section className="tasks-screen__scroll tasks-screen__scroll--selection">
          <section className="tasks-screen__group" aria-label="Unscheduled tasks">
            <h2>Unscheduled</h2>
            <p className="tasks-screen__selection-intro">Select tasks to preview adding them to your plan.</p>
            <div className="tasks-screen__selection-controls">
              <div className="tasks-screen__selection-summary">
                <span role="status" aria-live="polite">{selected.length} selected</span>
                <button type="button" disabled={!selected.length} onClick={() => setSelectedIds([])}>Clear selection</button>
              </div>
              <Button type="button" disabled={!selected.length || !onAddToPlan} onClick={() => onAddToPlan?.(selected)}>Add to plan</Button>
              <p>You’ll review the changes before applying them.</p>
            </div>
            {planningError ? <p className="tasks-screen__planning-error" role="alert">{planningError}</p> : null}
            <p className="tasks-screen__selection-count">{backlog.length} {backlog.length === 1 ? 'TASK' : 'TASKS'}</p>
            <div className="tasks-screen__selection-list">
              {backlog.map((task) => (
                <TaskCard key={task.id} title={task.title} meta={task.meta} kind={task.kind} done={task.done}
                  checkboxMode="selection" selected={selected.includes(task.id)} onToggleSelection={() => toggleSelection(task)}
                  onOpen={() => onOpenTask?.(task)} onToggleDone={() => toggleDone(task)} />
              ))}
            </div>
            {!backlog.length ? <p className="tasks-screen__selection-intro">No unscheduled tasks. Capture a task to add it here.</p> : null}
          </section>
          {plannedTasks.length ? <section className="tasks-screen__group" aria-label="Tasks in plan">
            <h2>In plan</h2>
            <p className="tasks-screen__selection-intro">These tasks are already on your plan. Open one to view its details.</p>
            <div className="tasks-screen__selection-list">
              {plannedTasks.map((task) => (
                <TaskCard key={task.id} title={task.title} meta={task.meta} kind={task.kind} done={task.done}
                  checkboxMode="none" onOpen={() => onOpenTask?.(task)} onToggleDone={() => toggleDone(task)} />
              ))}
            </div>
          </section> : null}
        </section>
      ) : (
        <section className="tasks-screen__scroll">
          <h2>Unscheduled</h2>
          <p className="tasks-screen__intro">Tasks that aren’t on your plan yet.</p>
          <p className="tasks-screen__count">{tasks.length} TASKS</p>

          <div className="tasks-screen__list">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                title={task.title}
                meta={task.meta}
                kind={task.kind}
                done={task.done}
                onOpen={() => onOpenTask?.(task)}
                onToggleDone={() => onToggleDone?.(task)}
              />
            ))}
          </div>

          <p className="tasks-screen__planning-note" style={{ top: 176 + tasks.length * 136 }}>
            They stay here until a future plan adjustment includes them.
          </p>
        </section>
      )}

      <BottomNav active="tasks" onNavigate={onNavigate} />

      {!addedState ? (
        <button className="tasks-screen__fab" type="button" aria-label="Add task" onClick={() => setChooserOpen(true)}>+</button>
      ) : null}

      {addedState ? (
        <div className="tasks-screen__snackbar" role="status">
          <span>{savedMessage}</span>
          <button type="button" onClick={onUndoSaved}>Undo</button>
        </div>
      ) : null}

      {chooserOpen ? (
        <AddTaskChooser
          onQuickCapture={() => { setChooserOpen(false); onQuickCapture() }}
          onAddWithDetails={() => { setChooserOpen(false); onAddWithDetails() }}
          onDismiss={() => setChooserOpen(false)}
        />
      ) : null}
    </main>
  )
}
