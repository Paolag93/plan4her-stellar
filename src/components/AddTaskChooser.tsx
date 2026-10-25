import { useDialogFocus } from './useDialogFocus'
import './AddTaskChooser.css'

export interface AddTaskChooserProps {
  onQuickCapture: () => void
  onAddWithDetails: () => void
  onDismiss?: () => void
}

export function AddTaskChooser({ onQuickCapture, onAddWithDetails, onDismiss }: AddTaskChooserProps) {
  const dialogRef = useDialogFocus(onDismiss)
  return (
    <div className="add-task-chooser-layer" onMouseDown={(event) => event.target === event.currentTarget && onDismiss?.()}>
      <section ref={dialogRef} className="add-task-chooser" role="dialog" aria-modal="true" aria-label="Add a task" data-figma-node="4578:6158">
        <h2>Add a task</h2>
        <p>Choose how much detail you want to add now.</p>
        <button type="button" className="add-task-chooser__option add-task-chooser__option--quick" onClick={onQuickCapture}>
          <strong>Quick capture</strong><span>Name only · save for later</span>
        </button>
        <button type="button" className="add-task-chooser__option add-task-chooser__option--details" onClick={onAddWithDetails}>
          <strong>Add with details</strong><span>Duration, timing and importance</span>
        </button>
      </section>
    </div>
  )
}
