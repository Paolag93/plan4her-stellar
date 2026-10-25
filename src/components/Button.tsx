import type { ButtonHTMLAttributes, ReactNode } from 'react'
import './Button.css'

type ButtonHierarchy = 'primary' | 'secondary' | 'accent' | 'tertiary' | 'destructive'
type ButtonSize = 'medium' | 'large'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  hierarchy?: ButtonHierarchy
  size?: ButtonSize
  loading?: boolean
  children: ReactNode
}

export function Button({
  hierarchy = 'primary',
  size = 'large',
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`p4h-button p4h-button--${hierarchy} p4h-button--${size} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span className="p4h-button__spinner" aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  )
}
