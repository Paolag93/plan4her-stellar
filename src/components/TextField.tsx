import { useId } from "react"
import type { ChangeEventHandler, ReactNode } from 'react'
import './TextField.css'

export interface TextFieldProps {
  label: string
  text: string
  supportingText?: string
  invalid?: boolean
  filled?: boolean
  focused?: boolean
  editable?: boolean
  trailing?: ReactNode
  className?: string
  onClick?: () => void
  onBlur?: () => void
  onChangeText?: (value: string) => void
  inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email' | 'url' | 'search'
  ariaLabel?: string
}

export function TextField({
  label,
  text,
  supportingText,
  invalid = false,
  filled = false,
  focused = false,
  editable = false,
  trailing,
  className = '',
  onClick,
  onBlur,
  onChangeText,
  inputMode = 'text',
  ariaLabel,
}: TextFieldProps) {
  const helpId = useId()
  const surfaceClass = `p4h-text-field__surface ${focused ? 'p4h-text-field__surface--focused' : ''}`.trim()
  const textClass = `p4h-text-field__text ${filled ? 'p4h-text-field__text--filled' : ''}`.trim()

  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    onChangeText?.(event.target.value)
  }

  return (
    <div className={`p4h-text-field ${className}`.trim()}>
      <span className="p4h-text-field__label">{label}</span>
      {editable ? (
        <div className={surfaceClass}>
          <input
            className={`${textClass} p4h-text-field__input`}
            aria-label={ariaLabel ?? label}
            aria-invalid={invalid || undefined}
            aria-describedby={supportingText ? helpId : undefined}
            value={text}
            onChange={handleChange}
            onFocus={onClick}
            onBlur={onBlur}
            inputMode={inputMode}
            autoFocus={focused}
          />
          {trailing ? <span className="p4h-text-field__trailing">{trailing}</span> : null}
        </div>
      ) : (
        <button type="button" className={surfaceClass} onClick={onClick} aria-label={ariaLabel ?? label}
            aria-invalid={invalid || undefined}
            aria-describedby={supportingText ? helpId : undefined}>
          <span className={textClass}>{text}</span>
          {trailing ? <span className="p4h-text-field__trailing">{trailing}</span> : null}
        </button>
      )}
      {supportingText ? <span id={helpId} aria-live={invalid ? "polite" : undefined} className="p4h-text-field__supporting">{supportingText}</span> : null}
    </div>
  )
}
