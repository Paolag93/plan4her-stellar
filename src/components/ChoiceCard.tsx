import { useLayoutEffect, useRef, type ButtonHTMLAttributes } from 'react'
import { enabledRadios, handleRadioKeyDown } from './radioKeyboard'
import './ChoiceCard.css'

export interface ChoiceCardProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  title: string
  description: string
  selected: boolean
}

export function ChoiceCard({ title, description, selected, className = '', ...props }: ChoiceCardProps) {
  const ref = useRef<HTMLButtonElement>(null)
  useLayoutEffect(() => {
    if (!ref.current) return
    const radios = enabledRadios(ref.current)
    const active = radios.find(radio => radio.getAttribute('aria-checked') === 'true') ?? radios[0]
    for (const radio of radios) radio.tabIndex = radio === active ? 0 : -1
  })
  return (
    <button
      ref={ref}
      tabIndex={selected ? 0 : -1}
      type="button"
      role="radio"
      aria-checked={selected}
      className={`p4h-choice-card ${selected ? 'p4h-choice-card--selected' : ''} ${className}`.trim()}
      {...props}
      onKeyDown={event => {
        props.onKeyDown?.(event)
        handleRadioKeyDown(event)
      }}
    >
      <span className={`p4h-choice-card__radio ${selected ? 'p4h-choice-card__radio--selected' : ''}`} aria-hidden="true">
        {selected ? <span className="p4h-choice-card__radio-dot" /> : null}
      </span>
      <span className="p4h-choice-card__content">
        <span className="p4h-choice-card__title">{title}</span>
        <span className="p4h-choice-card__description">{description}</span>
      </span>
    </button>
  )
}
