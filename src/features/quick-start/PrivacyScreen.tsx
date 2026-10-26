import { useState } from 'react'
import { Button } from '../../components/Button'
import { ConsentCard } from '../../components/ConsentCard'
import './PrivacyScreen.css'

export interface PrivacyScreenProps {
  initialConsent?: boolean
  onChange?: (consent: boolean) => void
  onContinue: (analyticsConsent: boolean) => void
}

const principles = [
  {
    title: 'Local by default',
    body: 'Tasks, availability and cycle details live on this device.',
  },
  {
    title: 'Planning, not diagnosis',
    body: 'Cycle insights shape your schedule. They are planning estimates, never medical advice.',
  },
  {
    title: 'Nothing leaves without you',
    body: 'Encrypted backups and Testnet savings happen only when you choose them.',
  },
] as const

export function PrivacyScreen({ onContinue, initialConsent, onChange }: PrivacyScreenProps) {
  const [analyticsConsent, setAnalyticsConsent] = useState(initialConsent ?? false)

  return (
    <main className="privacy-screen" data-figma-node="4800:6686">
      <p className="privacy-screen__eyebrow">PRIVACY BY DEFAULT</p>
      <h1 className="privacy-screen__title">Your data stays yours</h1>
      <p className="privacy-screen__description">
        Plan4Her can create your first plan without an account. Your planning and cycle information stay on this device unless you choose another option later.
      </p>

      <section className="privacy-principles" aria-label="Privacy principles">
        {principles.map((principle) => (
          <article className="privacy-principle" key={principle.title}>
            <h2>{principle.title}</h2>
            <p>{principle.body}</p>
          </article>
        ))}
      </section>

      <h2 className="privacy-screen__analytics-title">Optional product analytics</h2>
      <ConsentCard
        title="Share anonymous product usage"
        body="Help improve Plan4Her without including your task or cycle content."
        selected={analyticsConsent}
        onChange={(consent)=>{setAnalyticsConsent(consent);onChange?.(consent)}}
      />

      <div className="privacy-screen__spacer" aria-hidden="true" />
      <Button className="privacy-screen__continue" type="button" onClick={() => onContinue(analyticsConsent)}>
        Continue
      </Button>
      <p className="privacy-screen__footnote">You can review or change these choices later.</p>
    </main>
  )
}
