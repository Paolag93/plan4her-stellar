import { Checkbox } from './Checkbox'
import './ConsentCard.css'

export interface ConsentCardProps {
  title: string
  body: string
  requirement?: 'Optional' | 'Required'
  selected: boolean
  onChange: (selected: boolean) => void
}

export function ConsentCard({ title, body, requirement = 'Optional', selected, onChange }: ConsentCardProps) {
  const toggle = () => onChange(!selected)

  return (
    <div className={`p4h-consent-card ${selected ? 'p4h-consent-card--selected' : ''}`} data-selected={selected}>
      <Checkbox checked={selected} label={title} onClick={toggle} />
      <button type="button" className="p4h-consent-card__content" onClick={toggle} aria-pressed={selected}>
        <span className="p4h-consent-card__title-row">
          <span className="p4h-consent-card__title">{title}</span>
          <span className="p4h-consent-card__requirement">{requirement}</span>
        </span>
        <span className="p4h-consent-card__body">{body}</span>
      </button>
    </div>
  )
}
