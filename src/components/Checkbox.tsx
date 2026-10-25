import type { ButtonHTMLAttributes } from 'react'
import './Checkbox.css'

export interface CheckboxProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  checked: boolean
  indeterminate?: boolean
  label: string
}

export function Checkbox({ checked, indeterminate = false, label, className = '', ...props }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={label}
      className={`p4h-checkbox ${className}`.trim()}
      {...props}
    >
      <span className={`p4h-checkbox__box ${checked || indeterminate ? 'p4h-checkbox__box--selected' : ''}`} aria-hidden="true">
        {indeterminate ? <span className="p4h-checkbox__minus" /> : checked ? <span className="p4h-checkbox__check">✓</span> : null}
      </span>
    </button>
  )
}
