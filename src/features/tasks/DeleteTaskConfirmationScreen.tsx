import { AppHeader } from '../../components/AppHeader'
import { Button } from '../../components/Button'
import './DeleteTaskConfirmationScreen.css'

export interface DeleteTaskConfirmationScreenProps {
  onBack: () => void
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteTaskConfirmationScreen({
  onBack,
  onCancel,
  onConfirm,
}: DeleteTaskConfirmationScreenProps) {
  return (
    <main className="delete-task-screen" data-figma-node="4272:1853">
      <AppHeader title="Delete task" onBack={onBack} />
      <section className="delete-task-screen__content">
        <h2>Delete this task?</h2>
        <p className="delete-task-screen__body">
          This task will be deleted and removed from future planning. Completed work is not affected.
        </p>
        <Button className="delete-task-screen__cancel" hierarchy="secondary" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button className="delete-task-screen__confirm" hierarchy="destructive" type="button" onClick={onConfirm}>
          Delete task
        </Button>
      </section>
    </main>
  )
}
