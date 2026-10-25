import { useState } from 'react'
import { Button } from '../../components/Button'
import { ChoiceCard } from '../../components/ChoiceCard'
import './CycleModeScreen.css'

export type CycleMode = 'natural' | 'predictable' | 'unsure'

export interface CycleModeScreenProps {
  initialMode?: CycleMode | null
  onChange?: (mode: CycleMode) => void
  onBack: () => void
  onContinue: (mode: CycleMode) => void
  onSkip: () => void
}

const choices: Array<{ value: CycleMode; title: string; description: string }> = [
  { value: 'natural', title: 'Natural menstrual cycle', description: 'Estimate from your most recent period.' },
  { value: 'predictable', title: 'Predictable hormonal pattern', description: 'Use a recent bleed date if it is meaningful for you.' },
  { value: 'unsure', title: 'I’m not sure', description: 'You can skip cycle context for now.' },
]

export function CycleModeScreen({ onBack, onContinue, onSkip, initialMode, onChange }: CycleModeScreenProps) {
  const [selected, setSelected] = useState<CycleMode | null>(initialMode ?? null)
  const figmaNode = selected === 'natural' ? '4199:868' : selected === 'predictable' ? '4272:2029' : selected === 'unsure' ? '4272:2068' : '4198:46'
  return (
    <main className="cycle-mode-screen" data-figma-node={figmaNode}>
      <button className="cycle-mode-screen__back" type="button" onClick={onBack} aria-label="Back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18 9 12l6-6" /></svg></button>
      <p className="cycle-mode-screen__progress-label">1 of 4 · Cycle context</p>
      <div className="cycle-mode-screen__progress-track" aria-hidden="true"><span className="cycle-mode-screen__progress-fill" /></div>
      <div className="cycle-mode-screen__header-spacer" aria-hidden="true" />
      <h1 className="cycle-mode-screen__title">What best matches your cycle?</h1>
      <p className="cycle-mode-screen__description">Pick the closest option, or continue without cycle context.</p>
      <div className="cycle-mode-screen__choices" role="radiogroup" aria-label="Cycle context">
        {choices.map((choice) => <ChoiceCard key={choice.value} title={choice.title} description={choice.description} selected={selected === choice.value} onClick={() => {setSelected(choice.value); onChange?.(choice.value)}} />)}
      </div>
      <p className="cycle-mode-screen__note">Optional · for planning only, not medical guidance.</p>
      <div className="cycle-mode-screen__spacer" aria-hidden="true" />
      <button className="cycle-mode-screen__skip" type="button" onClick={onSkip}>Continue without cycle context</button>
      <Button className="cycle-mode-screen__continue" type="button" disabled={!selected} onClick={() => selected && onContinue(selected)}>Continue</Button>
    </main>
  )
}
