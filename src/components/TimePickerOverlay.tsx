import { CustomPickerEntry, useCustomPicker } from './CustomPickerEntry'
import { pickerTimeMinutes } from './pickerValues'
import { useDialogFocus } from './useDialogFocus'
import './TimePickerOverlay.css'

export interface TimePickerOverlayProps {
  mode: 'start' | 'end'
  selected: string
  onClose: () => void
  onSelect: (value: string) => void
  title?: string
  ariaLabel?: string
  options?: string[]
  figmaNode?: string
  customEntry?: 'time' | 'duration'
  afterTime?: string
}

const defaultOptions = ['10:30', '11:00', '11:30', '11:45', '12:00']

export function TimePickerOverlay({
  mode,
  selected,
  onClose,
  onSelect,
  title,
  ariaLabel,
  options = defaultOptions,
  figmaNode,
  customEntry,
  afterTime,
}: TimePickerOverlayProps) {
  const { custom, setCustom, draft, setDraft, customButtonRef } = useCustomPicker(selected)
  const dialogRef = useDialogFocus(onClose)
  const defaultNode = mode === 'start' ? '4637:5778' : '4637:5795'
  const resolvedTitle = title ?? (mode === 'start' ? 'Start time' : 'End time')
  const compact = options.length === 4
  const validate = (value: string) => afterTime !== undefined && pickerTimeMinutes(value) <= pickerTimeMinutes(afterTime) ? 'End time must be after start time on the same day.' : undefined

  return (
    <div className="commitment-overlay-layer">
      <section ref={dialogRef}
        className={`time-picker-overlay ${compact ? 'time-picker-overlay--compact' : ''} ${custom ? 'time-picker-overlay--custom' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? resolvedTitle}
        data-figma-node={figmaNode ?? defaultNode}
      >
        <h2>{resolvedTitle}</h2>
        {customEntry && !custom ? <button ref={customButtonRef} type="button" className="picker-custom-toggle" onClick={() => setCustom(true)}>Custom</button> : null}
        <button type="button" className="time-picker-overlay__close" onClick={onClose} aria-label="Close picker">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
        {custom && customEntry ? <CustomPickerEntry kind={customEntry} selected={selected} draft={draft} onDraftChange={setDraft} onApply={onSelect} onBack={() => setCustom(false)} validate={validate} /> : <div className="time-picker-overlay__options">
          {options.map((option) => {
            const isSelected = customEntry === 'time' ? pickerTimeMinutes(option) === pickerTimeMinutes(selected) : option === selected
            return (
              <button
                type="button"
                key={option}
                className={`time-picker-overlay__option ${isSelected ? 'time-picker-overlay__option--selected' : ''}`}
                onClick={() => onSelect(option)}
                disabled={Boolean(validate(option))}
                aria-pressed={isSelected}
              >
                <span>{option}</span>
                {isSelected ? (
                  <svg className="time-picker-overlay__check" viewBox="0 0 18 18" aria-hidden="true">
                    <path d="m4 9 3 3 7-7" />
                  </svg>
                ) : null}
              </button>
            )
          })}
        </div>}
      </section>
    </div>
  )
}
