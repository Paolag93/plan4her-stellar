import './AppHeader.css'

export interface AppHeaderProps {
  title: string
  onBack?: () => void
}

export function AppHeader({ title, onBack }: AppHeaderProps) {
  return (
    <header className="p4h-app-header">
      {onBack ? (
        <button className="p4h-app-header__back" type="button" onClick={onBack} aria-label="Back">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18 9 12l6-6" /></svg>
        </button>
      ) : null}
      <h1 className={onBack ? 'p4h-app-header__title p4h-app-header__title--detail' : 'p4h-app-header__title'}>{title}</h1>
    </header>
  )
}
