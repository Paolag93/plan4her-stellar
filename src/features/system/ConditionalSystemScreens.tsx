import { useState } from 'react'
import { AddTaskChooser } from '../../components/AddTaskChooser'
import { AppHeader } from '../../components/AppHeader'
import { BottomNav, type RootTab } from '../../components/BottomNav'
import { Button } from '../../components/Button'
import { PlanBlockActionsOverlay } from '../plan/PlanBlockActionsOverlay'
import { PlanBlockCard } from '../plan/PlanBlockCard'
import { ScheduledLoad } from '../plan/PlanShared'
import { PLAN_BLOCKS, type PlanBlockData } from '../plan/planData'
import emptyTodayIcon from './assets/conditional/empty-today.svg'
import unavailableIcon from './assets/conditional/ai-unavailable.svg'
import fallbackIcon from './assets/conditional/basic-fallback.svg'
import todayActiveIcon from './assets/conditional/nav-today-active.svg'
import todayIcon from './assets/conditional/nav-today.svg'
import planActiveIcon from './assets/conditional/nav-plan-active.svg'
import planIcon from './assets/conditional/nav-plan.svg'
import tasksIcon from './assets/conditional/nav-tasks.svg'
import moreIcon from './assets/conditional/nav-more.svg'
import blockMoreIcon from './assets/conditional/block-more.svg'
import './SystemScreens.css'
import './ConditionalSystemScreens.css'

const todayIcons = { today: todayActiveIcon, plan: planIcon, tasks: tasksIcon, more: moreIcon }
const planIcons = { today: todayIcon, plan: planActiveIcon, tasks: tasksIcon, more: moreIcon }

interface ConditionalNavigationProps { onNavigate: (tab: RootTab) => void }

export interface EmptyTodayScreenProps extends ConditionalNavigationProps {
  onQuickCapture: () => void
  onAddWithDetails: () => void
}

export function EmptyTodayScreen({ onNavigate, onQuickCapture, onAddWithDetails }: EmptyTodayScreenProps) {
  const [chooser, setChooser] = useState(false)
  return <main className="system-screen conditional-system-screen conditional-system-screen--empty today-screen" data-figma-node="4250:4247">
    <AppHeader title="Today" />
    <section className="system-content conditional-system-content">
      <div className="conditional-system-icon"><img src={emptyTodayIcon} alt="" /></div>
      <h2>Today is open</h2>
      <p className="system-body conditional-system-body--reserved">Nothing is scheduled. Review Tasks or add something new.</p>
      <Button onClick={() => onNavigate('tasks')}>Review Tasks</Button>
    </section>
    <button className="system-add-task" type="button" aria-label="Add task" onClick={() => setChooser(true)}>+</button>
    <BottomNav active="today" onNavigate={onNavigate} iconSources={todayIcons} />
    {chooser && <AddTaskChooser onDismiss={() => setChooser(false)} onQuickCapture={() => { setChooser(false); onQuickCapture() }} onAddWithDetails={() => { setChooser(false); onAddWithDetails() }} />}
  </main>
}

export interface AIUnavailableScreenProps extends ConditionalNavigationProps {
  onContinue: () => void
  onRetry: () => void
}

/** Conditional presentation: showing it does not start or simulate a remote request. */
export function AIUnavailableScreen({ onNavigate, onContinue, onRetry }: AIUnavailableScreenProps) {
  return <main className="system-screen conditional-system-screen" data-figma-node="4250:4268">
    <AppHeader title="Plan" />
    <section className="system-content conditional-system-content">
      <div className="conditional-system-icon"><img src={unavailableIcon} alt="" /></div>
      <h2>Plan suggestions are temporarily unavailable</h2>
      <p className="system-body">You can still build your week from your tasks, available time and fixed commitments.</p>
      <p className="conditional-system-label">YOU CAN KEEP PLANNING</p>
      <p className="system-body conditional-system-body--reserved">Fixed commitments stay protected.</p>
      <Button onClick={onContinue}>Continue without suggestions</Button>
      <Button hierarchy="secondary" onClick={onRetry}>Try again</Button>
    </section>
    <BottomNav active="plan" onNavigate={onNavigate} iconSources={planIcons} />
  </main>
}

// Canonical presentation data is used only when no live plan is supplied.
const fallbackExampleBlocks: PlanBlockData[] = [
  { ...PLAN_BLOCKS[0], id: 'fallback-meeting', title: 'Team meeting', fixed: true, time: '11:00–11:45', start: '11:00', duration: '45 min', rationale: 'Fixed commitment preserved.' },
  PLAN_BLOCKS[0],
]

export interface BasicFallbackScreenProps extends ConditionalNavigationProps {
  blocks?: PlanBlockData[]
  scheduledLoad?: number
  onReview: () => void
  onOpenRationale: (block: PlanBlockData) => void
  onEditBlock: (block: PlanBlockData) => void
}

export function BasicFallbackScreen({ blocks = fallbackExampleBlocks, scheduledLoad, onNavigate, onReview, onOpenRationale, onEditBlock }: BasicFallbackScreenProps) {
  const [menuBlock, setMenuBlock] = useState<PlanBlockData | null>(null)
  return <main className="system-screen conditional-system-screen" data-figma-node="4250:4287">
    <AppHeader title="Plan" />
    <section className="system-content conditional-system-content conditional-system-content--fallback">
      <div className="conditional-system-icon"><img src={fallbackIcon} alt="" /></div>
      <p className="conditional-system-label">PLAN READY</p>
      <h2>Your week is ready</h2>
      <p className="system-body conditional-system-body--reserved">Built from your tasks, available time and fixed commitments. Extra suggestions are unavailable for now.</p>
      <ScheduledLoad value={scheduledLoad} />
      {blocks.map(block => <div key={block.id} className={block.fixed ? 'conditional-plan-block conditional-plan-block--fixed' : 'conditional-plan-block'}>
        <PlanBlockCard block={block} onOpen={() => onOpenRationale(block)} onMore={() => setMenuBlock(block)} moreIconSrc={blockMoreIcon} />
      </div>)}
      <Button onClick={onReview}>Review plan</Button>
    </section>
    <BottomNav active="plan" onNavigate={onNavigate} iconSources={planIcons} />
    {menuBlock && <PlanBlockActionsOverlay block={menuBlock} onClose={() => setMenuBlock(null)} onEdit={() => { setMenuBlock(null); onEditBlock(menuBlock) }} onWhy={() => { setMenuBlock(null); onOpenRationale(menuBlock) }} />}
  </main>
}
