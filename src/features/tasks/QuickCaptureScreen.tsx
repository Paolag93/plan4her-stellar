import { useState } from 'react'
import { AppHeader } from '../../components/AppHeader'
import { Button } from '../../components/Button'
import { TextField } from '../../components/TextField'
import './QuickCaptureScreen.css'

export interface QuickCaptureScreenProps {
  initialTask?: string
  onBack: () => void
  onCancel: () => void
  onSave: (task: string) => void
}

export function QuickCaptureScreen({
  initialTask = 'Pick up prescription',
  onBack,
  onCancel,
  onSave,
}: QuickCaptureScreenProps) {
  const [task, setTask] = useState(initialTask)
  const [focused, setFocused] = useState(false)

  return (
    <main className="quick-capture-screen" data-figma-node={focused ? '4272:2681' : '4198:239'}>
      <AppHeader title="Quick capture" onBack={onBack} />
      <section className="quick-capture-screen__content">
        <h2>Capture a task</h2>
        <p className="quick-capture-screen__intro">
          Save it as Unscheduled. It won’t change your current plan.
        </p>

        <TextField
          className="quick-capture-screen__field"
          label="Task"
          text={task}
          filled
          focused={focused}
          editable
          onClick={() => setFocused(true)}
          onChangeText={setTask}
        />

        <p className="quick-capture-screen__note">
          Add duration, timing and importance later.
        </p>

        <Button
          className="quick-capture-screen__save"
          type="button"
          disabled={!task.trim()}
          onClick={() => onSave(task.trim())}
        >
          Save to Tasks
        </Button>
        <button className="quick-capture-screen__cancel" type="button" onClick={onCancel}>
          Cancel
        </button>
      </section>
    </main>
  )
}
