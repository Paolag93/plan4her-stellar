import './PhaseContextCard.css'
import type { CyclePhase } from './selectedCycleContext'

export interface PhaseContextCardProps {
  phase?:string
  tone?: CyclePhase | 'neutral'
  estimated?: boolean
  footnote?: string
  day: string
  pattern: string
  planNote: string
  onOpen?: () => void
}

export function PhaseContextCard({ phase='Follicular', tone='Follicular', estimated=true, footnote='Based on the cycle information you provided. You can adjust this anytime.', day, pattern, planNote, onOpen }: PhaseContextCardProps) {
  const Container = onOpen ? 'button' : 'section'
  return (
    <Container {...(onOpen ? { type: 'button' as const, onClick: onOpen } : { 'aria-label': 'Example cycle context' })} className="daily-phase-context" data-phase={tone.toLowerCase()}>
      <span className="daily-phase-context__header">
        <span className="daily-phase-context__title-group">
          <span>{day}</span>
          <strong>{phase}</strong>
        </span>
        {estimated ? <span className="daily-phase-context__estimated">Estimated</span> : null}
      </span>
      <strong className="daily-phase-context__pattern">{pattern}</strong>
      <span className="daily-phase-context__note">{planNote}</span>
      <small>{footnote}</small>
    </Container>
  )
}
