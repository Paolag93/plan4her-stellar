import { Button } from '../../components/Button'
import { SetupHeader } from '../../components/SetupHeader'
import './NoExactDateScreen.css'

export interface NoExactDateScreenProps {
  onBack: () => void
  onAddPeriodDate: () => void
  onContinueWithoutCycle: () => void
}

export function NoExactDateScreen({ onBack, onAddPeriodDate, onContinueWithoutCycle }: NoExactDateScreenProps) {
  return (
    <main className="no-exact-date-screen" data-figma-node="4272:2163">
      <SetupHeader label="1 of 4 · Cycle context" progress={0.25} onBack={onBack} />
      <h1 className="no-exact-date-screen__title">Not sure about your cycle timing?</h1>
      <p className="no-exact-date-screen__description">
        No problem. Your weekly plan still works without cycle context, and you can add a period date later.
      </p>
      <Button
        className="no-exact-date-screen__add-date"
        hierarchy="secondary"
        type="button"
        onClick={onAddPeriodDate}
      >
        Add a period date
      </Button>
      <div className="no-exact-date-screen__spacer" aria-hidden="true" />
      <Button
        className="no-exact-date-screen__continue"
        type="button"
        onClick={onContinueWithoutCycle}
      >
        Continue without cycle context
      </Button>
    </main>
  )
}
