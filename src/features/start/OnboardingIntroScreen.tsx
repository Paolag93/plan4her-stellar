import { Button } from '../../components/Button'
import { PhaseContextCard } from '../daily/PhaseContextCard'
import backIcon from './assets/intro-back.svg'
import rhythmProgress from './assets/intro-rhythm-progress.svg'
import controlProgress from './assets/intro-control-progress.svg'
import '../quick-start/PrivacyScreen.css'
import './OnboardingIntroScreen.css'

interface OnboardingIntroScreenProps {
  step: 'rhythm' | 'control'
  onBack: () => void
  onContinue: () => void
  onSetUp: () => void
}

const principles = [
  ['Private by default', 'Your plans and cycle details stay on this device.'],
  ['Preview first', 'See what would move before applying it.'],
  ['Undo anytime', 'Restore the previous plan after a change.'],
] as const

/** The two optional education frames from the canonical MVP prototype. */
export function OnboardingIntroScreen({ step, onBack, onContinue, onSetUp }: OnboardingIntroScreenProps) {
  const rhythm = step === 'rhythm'
  return (
    <main className={`onboarding-intro onboarding-intro--${step}`} data-figma-node={rhythm ? '4198:16' : '4198:27'}>
      <header className="onboarding-intro__header">
        <button type="button" className="onboarding-intro__back" onClick={onBack} aria-label="Back">
          <span><img src={backIcon} alt="" /></span>
        </button>
        <img className="onboarding-intro__progress" src={rhythm ? rhythmProgress : controlProgress} alt={`How Plan4Her works: ${rhythm ? '1' : '2'} of 2`} />
      </header>
      <h1 className="onboarding-intro__title">{rhythm ? 'Your rhythm is your advantage' : 'You approve every change'}</h1>
      <p className="onboarding-intro__description">
        {rhythm ? 'Plan4Her uses your estimated cycle phase to place each kind of work where it can fit best. You always have the final say.' : 'Plan4Her proposes your week. Nothing moves until you review it.'}
      </p>
      {rhythm ? (
        <PhaseContextCard day="Day 8" pattern="Follicular · estimated" planNote="Example: Plan4Her arranges your week using planning preferences you can edit." />
      ) : (
        <section className="privacy-principles onboarding-intro__principles" aria-label="Privacy principles">
          {principles.map(([title, body]) => <article className="privacy-principle" key={title}><h2>{title}</h2><p>{body}</p></article>)}
        </section>
      )}
      <div className="onboarding-intro__spacer" aria-hidden="true" />
      {rhythm ? <Button type="button" hierarchy="tertiary" size="medium" className="onboarding-intro__skip" onClick={onSetUp}>Set up my week</Button> : null}
      <Button type="button" className="onboarding-intro__primary" onClick={rhythm ? onContinue : onSetUp}>{rhythm ? 'Continue' : 'Set up my week'}</Button>
      {!rhythm ? <p className="onboarding-intro__footnote">You can change these settings later.</p> : null}
    </main>
  )
}
