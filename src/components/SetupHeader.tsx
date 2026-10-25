import './SetupHeader.css'

export interface SetupHeaderProps {
  label: string
  progress: number
  onBack: () => void
}

export function SetupHeader({ label, progress, onBack }: SetupHeaderProps) {
  return (
    <>
      <button className="p4h-setup-header__back" type="button" onClick={onBack} aria-label="Back">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 18 9 12l6-6" />
        </svg>
      </button>
      <p className="p4h-setup-header__label">{label}</p>
      <div className="p4h-setup-header__track" aria-hidden="true">
        <span className="p4h-setup-header__fill" style={{ width: `${306 * progress}px` }} />
      </div>
      <div className="p4h-setup-header__spacer" aria-hidden="true" />
    </>
  )
}
