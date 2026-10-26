import type { ReactNode } from 'react'
import { AppHeader } from '../../components/AppHeader'
import { BottomNav, type RootTab } from '../../components/BottomNav'
import './community.css'

export function CommunityScreen({ title, onBack, onNavigate, children, testId }: { title: string; onBack?: () => void; onNavigate?: (tab: RootTab) => void; children: ReactNode; testId?: string }) {
  return <main className={`community-screen live-content-screen${onNavigate ? ' community-screen--nav' : ''}`} data-testid={testId}>
    <AppHeader title={title} onBack={onBack} />
    <div className="community-screen__content" tabIndex={0} aria-label={`${title} content`} role="region">{children}</div>
    {onNavigate ? <BottomNav active="more" onNavigate={onNavigate} /> : null}
  </main>
}

export function Row({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return <div className="community-row"><span>{label}</span><strong>{value}{note ? <small>{note}</small> : null}</strong></div>
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return <div className="community-stat"><span>{label}</span><strong>{value}</strong></div>
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100)
  return <div className="community-progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><span style={{ width: `${pct}%` }} /></div>
}

export function SimulationBadge({ children = 'Simulated' }: { children?: ReactNode }) {
  return <span className="community-badge community-badge--warning">{children}</span>
}

export const percent = (value: number) => `${Math.round(value * 100)}%`
