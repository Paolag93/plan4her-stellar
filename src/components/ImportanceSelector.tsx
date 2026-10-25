import { handleRadioKeyDown } from './radioKeyboard'
import './ImportanceSelector.css'

export type Importance = 'Must' | 'Important' | 'Optional'

export interface ImportanceSelectorProps {
  value: Importance
  onChange: (value: Importance) => void
}

const values: Importance[] = ['Must', 'Important', 'Optional']

export function ImportanceSelector({ value, onChange }: ImportanceSelectorProps) {
  return (
    <div className="importance-selector" role="radiogroup" aria-label="Importance">
      {values.map((item) => (
        <button
          type="button"
          key={item}
          className={`importance-selector__segment ${value === item ? 'importance-selector__segment--selected' : ''}`}
          role="radio"
          aria-checked={value === item}
          tabIndex={value === item ? 0 : -1}
          onKeyDown={handleRadioKeyDown}
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      ))}
    </div>
  )
}
