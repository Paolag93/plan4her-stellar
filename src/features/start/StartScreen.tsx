import markUrl from '../../assets/plan4her-mark.png'
import privateIcon from '../../assets/trust-private.svg'
import adjustableIcon from '../../assets/trust-adjustable.svg'
import undoIcon from '../../assets/trust-undo.svg'
import { Button } from '../../components/Button'
import './StartScreen.css'

const FIGMA_ASSETS = {
  mark: markUrl,
  private: privateIcon,
  adjustable: adjustableIcon,
  undo: undoIcon,
} as const

const previewRows = [
  { day: 'MON', time: '09:00', title: 'Prepare proposal', kind: 'Flexible' },
  { day: 'TUE', time: '10:00', title: 'Research notes', kind: 'Flexible' },
  { day: 'WED', time: '18:00', title: 'Yoga class', kind: 'Fixed' },
] as const

export interface StartScreenProps {
  onBuildFirstWeek?: () => void
  onHowItWorks?: () => void
}

export function StartScreen({ onBuildFirstWeek, onHowItWorks }: StartScreenProps) {
  return (
    <main className="start-screen" data-figma-node="4200:1120">
      <header className="start-brand" data-figma-node="4500:6023">
        <img className="start-brand__mark" src={FIGMA_ASSETS.mark} alt="" width="44" height="44" />
        <span className="start-brand__name">Plan4Her</span>
      </header>

      <h1 className="start-title">A weekly plan that adapts to you</h1>
      <p className="start-description">
        Plan4Her organizes your tasks around the time you actually have. Cycle context can add optional planning context.
      </p>

      <section className="week-preview" aria-label="Your week preview">
        <p className="week-preview__eyebrow">YOUR WEEK PREVIEW</p>
        {previewRows.map((row) => (
          <div className="week-preview__row" key={row.day}>
            <span className="week-preview__day">{row.day}</span>
            <span className="week-preview__time">{row.time}</span>
            <span className="week-preview__task">{row.title}</span>
            <span className={`week-preview__badge week-preview__badge--${row.kind.toLowerCase()}`}>{row.kind}</span>
          </div>
        ))}
      </section>

      <section className="value-promise">
        <strong>You stay in control</strong>
        <span>Preview the week, adjust it, and undo changes anytime.</span>
      </section>

      <section className="trust-strip" aria-label="Product principles">
        <TrustItem icon={FIGMA_ASSETS.private} label="Private" />
        <TrustItem icon={FIGMA_ASSETS.adjustable} label="Adjustable" />
        <TrustItem icon={FIGMA_ASSETS.undo} label="Undo" />
      </section>

      <button className="start-how" type="button" onClick={onHowItWorks}>See how Plan4Her works</button>
      <Button className="start-primary" type="button" onClick={onBuildFirstWeek}>Build my first week</Button>
      <p className="start-footnote">Cycle context is optional · Private by default</p>
    </main>
  )
}

function TrustItem({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="trust-item">
      <img src={icon} alt="" width="28" height="28" />
      <span>{label}</span>
    </div>
  )
}
