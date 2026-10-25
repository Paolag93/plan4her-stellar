import type { ReactElement } from 'react'
import './BottomNav.css'

export type RootTab = 'today' | 'plan' | 'tasks' | 'more'

export interface BottomNavProps {
  active: RootTab
  onNavigate?: (tab: RootTab) => void
  iconSources?: Partial<Record<RootTab, string>>
}

export function BottomNav({ active, onNavigate, iconSources }: BottomNavProps) {
  const items: Array<{tab:RootTab; label:string; icon:ReactElement}> = [
    {tab:'today',label:'Today',icon:<TodayIcon/>},
    {tab:'plan',label:'Plan',icon:<PlanIcon/>},
    {tab:'tasks',label:'Tasks',icon:<TasksIcon/>},
    {tab:'more',label:'More',icon:<MoreIcon/>},
  ]

  return (
    <nav className="p4h-bottom-nav" aria-label="Primary">
      {items.map((item) => {
        const selected = item.tab === active
        return (
          <button
            key={item.tab}
            type="button"
            className={`p4h-bottom-nav__item ${selected ? 'p4h-bottom-nav__item--active' : ''}`}
            aria-current={selected ? 'page' : undefined}
            onClick={() => onNavigate?.(item.tab)}
          >
            <span className="p4h-bottom-nav__indicator">
              <span className="p4h-bottom-nav__icon">{iconSources?.[item.tab] ? <img src={iconSources[item.tab]} alt="" /> : item.icon}</span>
            </span>
            <span className="p4h-bottom-nav__label">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

function TodayIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10.5 12 3.5l8.5 7v9.5h-6v-5.5h-5V20h-6z"/></svg>}
function PlanIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="15" rx="2.5"/><path d="M7.5 3.5v4m9-4v4m-13 4h17"/><circle cx="8" cy="14" r="1" className="fill"/><circle cx="12" cy="14" r="1" className="fill"/><circle cx="16" cy="14" r="1" className="fill"/></svg>}
function TasksIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="3" height="3" rx=".8"/><path d="M10 6.5h10m-10 5.5h10m-10 5.5h10"/><rect x="4" y="10.5" width="3" height="3" rx=".8"/><path d="m4.5 17 1 1 2-2"/></svg>}
function MoreIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="1.8" className="fill"/><circle cx="12" cy="12" r="1.8" className="fill"/><circle cx="18" cy="12" r="1.8" className="fill"/></svg>}
