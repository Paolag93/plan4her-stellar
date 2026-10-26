import { useState, type ReactNode } from 'react'
import { AppHeader } from '../../components/AppHeader'
import { Button } from '../../components/Button'
import { BottomNav, type RootTab } from '../../components/BottomNav'
import localDevice from './assets/local-device.svg'
import analyticsOff from './assets/analytics-off.svg'
import analyticsOn from './assets/analytics-on.svg'
import offlineIcon from './assets/offline.svg'
import errorIcon from './assets/error.svg'
import './SystemScreens.css'

export interface BackProps { onBack: () => void }
export interface PrivacyDataScreenProps extends BackProps {
  onClear: () => void
  dataTools?: ReactNode
  analyticsEnabled?: boolean
  onAnalyticsChange?: (enabled: boolean) => void
  /** Number of user-initiated encrypted IPFS uploads; changes copy only when > 0. */
  encryptedUploads?: number
}
export function PrivacyDataScreen({ onBack, onClear, analyticsEnabled, onAnalyticsChange, dataTools, encryptedUploads = 0 }: PrivacyDataScreenProps) {
  const [localAnalytics, setLocalAnalytics] = useState(false)
  const enabled = analyticsEnabled ?? localAnalytics
  const toggle = () => { setLocalAnalytics(!enabled); onAnalyticsChange?.(!enabled) }
  return <main className="system-screen" data-figma-node={enabled ? '4272:3476' : '4250:4101'}>
    <AppHeader title="Privacy & data" onBack={onBack} />
    <section className="system-content privacy-content">
      {encryptedUploads > 0 ? <>
        <h2>Your data, your control</h2>
        <p className="system-body">Your task, cycle and plan content stays local. You uploaded {encryptedUploads} encrypted backup{encryptedUploads === 1 ? '' : 's'} to IPFS that only your passphrase can open. Automatic sync stays off.</p>
      </> : <>
        <h2>Your data, your control</h2>
        <p className="system-body">Plans, tasks and cycle details live on this device. Nothing syncs unless you create an encrypted backup.</p>
      </>}
      <div className="privacy-summary"><span className="privacy-summary__icon"><img src={localDevice} alt="" /></span><div><strong>Local by default</strong><p>Tasks · cycle context · accepted plans</p></div></div>
      <div className="privacy-analytics"><p>Anonymous product analytics<br />{enabled ? 'Enabled · no task or cycle content is included.' : 'No task or cycle content is included.'}</p><button type="button" role="switch" aria-label="Anonymous product analytics" aria-checked={enabled} className={`privacy-switch${enabled ? ' privacy-switch--on' : ''}`} onClick={toggle}><img src={enabled ? analyticsOn : analyticsOff} alt="" /></button></div>
      {dataTools}
      <div className="privacy-spacer" aria-hidden="true" />
      <Button hierarchy="destructive" onClick={onClear}>Clear data on this device</Button>
    </section>
  </main>
}
export interface ClearDataConfirmationProps extends BackProps { onCancel: () => void; onConfirm: () => void }
export function ClearDataConfirmation({ onBack, onCancel, onConfirm }: ClearDataConfirmationProps) {
  return <main className="system-screen" data-figma-node="4250:4121"><AppHeader title="Clear local data" onBack={onBack} /><section className="system-content clear-data-content"><h2>Clear data on this device?</h2><p className="system-body">This permanently deletes tasks, cycle context, accepted plans and local settings from this device.</p><Button hierarchy="secondary" onClick={onCancel}>Cancel</Button><Button hierarchy="destructive" onClick={onConfirm}>Clear data now</Button></section></main>
}
interface HelpCardProps { title: string; body: string; accent?: boolean; onClick?: () => void }
function HelpCard({ title, body, accent, onClick }: HelpCardProps) {
  const content = <><strong>{title}</strong><p>{body}</p></>
  const className = `system-help-card${accent ? ' system-help-card--accent' : ''}`
  return onClick ? <button type="button" className={className} onClick={onClick}>{content}</button> : <div className={className}>{content}</div>
}
export interface HelpScreenProps extends BackProps { onWeekly: () => void; onAdjust: () => void; onRecovery: () => void; onCycle: () => void }
export function HelpScreen({ onBack, onWeekly, onAdjust, onRecovery, onCycle }: HelpScreenProps) {
  return <main className="system-screen" data-figma-node="4397:5935"><AppHeader title="Help" onBack={onBack} /><section className="system-content system-help-content"><h2>Help & guidance</h2><HelpCard title="Weekly planning" body="How Plan4Her builds a week and what stays under your control." onClick={onWeekly} /><HelpCard title="Adjusting your plan" body="How previews, Apply and Undo work when plans change." onClick={onAdjust} /><HelpCard title="Unfinished work" body="What happens after a task is partially done or missed." onClick={onRecovery} /><HelpCard title="Cycle context" body="How cycle information can influence planning without becoming a rule." onClick={onCycle} /><p className="system-help-note">Open a topic for a short explanation. You can always come back.</p></section></main>
}
export function WeeklyPlanningHelp({ onBack }: BackProps) {
  return <main className="system-screen" data-figma-node="4317:5578"><AppHeader title="How weekly planning works" onBack={onBack} /><section className="system-content system-help-content"><h2>Your week stays under your control</h2><HelpCard title="Availability and fixed commitments first" body="Availability and fixed commitments define where work can fit." /><HelpCard title="Cycle context stays soft" body="Cycle context can influence placement, but it never overrides your choices." /><HelpCard accent title="You accept the week" body="The generated plan is a draft until you review and accept it." /><p className="system-help-note">You can edit flexible blocks later. Changes are previewed before they are applied.</p></section></main>
}
export function PlanAdjustmentsHelp({ onBack }: BackProps) {
  return <main className="system-screen" data-figma-node="4317:5621"><AppHeader title="How plan adjustments work" onBack={onBack} /><section className="system-content system-help-content"><h2>Plan changes stay under your control</h2><HelpCard title="Choose the range" body="Adjust only the rest of today or the rest of your week." /><HelpCard title="Preview every change" body="See exactly what moves before applying anything." /><HelpCard accent title="Undo stays available" body="After applying a change, you can restore the previous plan." /><p className="system-help-note">Fixed commitments and completed work stay protected.</p></section></main>
}
export interface SystemStateScreenProps extends BackProps {
  kind: 'offline' | 'error'
  onRetry: () => void
  onContinue: () => void
  onNavigate?: (tab: RootTab) => void
  onAdd?: () => void
}
export function SystemStateScreen({ kind, onBack, onRetry, onContinue, onNavigate, onAdd }: SystemStateScreenProps) {
  const offline = kind === 'offline'
  return <main className={`system-screen system-state--${kind}`} data-figma-node={offline ? '4250:4255' : '4250:4278'}>
    <AppHeader title={offline ? 'Today' : 'Couldn’t save change'} onBack={offline ? undefined : onBack} />
    <section className="system-content system-state-content"><div className="system-state-icon"><img src={offline ? offlineIcon : errorIcon} alt="" /></div><h2>{offline ? 'You’re offline' : 'We couldn’t save that change'}</h2><p className="system-body">{offline ? 'Today, your accepted plan and locally saved tasks still work.' : 'Your current plan is unchanged.'}</p>{offline && <><p className="system-state-label">UNAVAILABLE FOR NOW</p><p className="system-body">AI suggestions · optional cloud sync</p></>}<Button onClick={offline ? onContinue : onRetry}>{offline ? 'Continue offline' : 'Try again'}</Button><Button hierarchy="secondary" onClick={offline ? onRetry : onContinue}>{offline ? 'Try again' : 'Keep current plan'}</Button></section>
    {offline && <><button className="system-add-task" type="button" aria-label="Add task" onClick={onAdd}>+</button><BottomNav active="today" onNavigate={onNavigate} /></>}
  </main>
}
