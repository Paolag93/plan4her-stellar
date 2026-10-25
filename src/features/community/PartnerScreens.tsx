import { useState } from 'react'
import { Button } from '../../components/Button'
import { ConsentCard } from '../../components/ConsentCard'
import { TextField } from '../../components/TextField'
import type { RootTab } from '../../components/BottomNav'
import { NEVER_SHARED, SHARE_FIELDS, SHARE_FIELD_LABELS, partnerView, type CommunityState, type Partner, type ShareField } from '../../domain/community'
import { CommunityScreen, Row, SimulationBadge } from './shared'

const FIELD_HELP: Record<ShareField, string> = {
  completionRate: 'A single percentage of your own goal, for example 72%.',
  checkInsThisWeek: 'How many times you checked in this week.',
  streakDays: 'How many days in a row you have checked in.',
  lastCheckInDate: 'The date of your most recent check-in.',
}

function NeverShared({ name }: { name?: string }) {
  return <aside className="community-notice"><strong>{name ? `${name} will never see` : 'Partners never see'}</strong><ul>{NEVER_SHARED.map(item => <li key={item}>{item}</li>)}</ul></aside>
}

function statusBadge(partner: Partner) {
  if (partner.status === 'active') return <span className="community-badge community-badge--success">Sharing</span>
  if (partner.status === 'pending') return <span className="community-badge">Invite pending</span>
  return <span className="community-badge">Access revoked</span>
}

export function PartnersScreen({ community, onBack, onNavigate, onInvite, onOpen }: { community: CommunityState; onBack: () => void; onNavigate: (tab: RootTab) => void; onInvite: () => void; onOpen: (partner: Partner) => void }) {
  return <CommunityScreen title="Accountability partners" onBack={onBack} onNavigate={onNavigate} testId="partners">
    <section className="community-intro"><span>SUPPORT, ON YOUR TERMS</span><h2>Share progress, not your private life</h2><p>Invite someone to cheer you on. You choose exactly which progress numbers they see, and you can stop sharing at any time.</p></section>
    <p className="community-label">Your partners</p>
    {community.partners.length ? community.partners.map(partner => <button key={partner.id} type="button" className="community-card" onClick={() => onOpen(partner)}>
      <span className="community-card__top"><strong>{partner.displayName}</strong>{statusBadge(partner)}</span>
      <p>{partner.status === 'revoked' ? 'No longer receives updates.' : partner.permissions.length ? `Can see: ${partner.permissions.map(f => SHARE_FIELD_LABELS[f]).join(', ')}` : 'Can see nothing yet. Choose what to share.'}</p>
    </button>) : <p className="community-help">No partners yet. Belonging to a challenge works without one.</p>}
    <Button type="button" onClick={onInvite}>Invite a partner</Button>
    <NeverShared />
    <aside className="community-notice community-notice--warning"><strong>Demo limitation</strong><p>Partners are simulated on this device. There is no second account or server sync yet, so invitations are not actually sent. The preview shows exactly what a partner would receive.</p></aside>
  </CommunityScreen>
}

export function InvitePartnerScreen({ onBack, onInvite }: { onBack: () => void; onInvite: (name: string, fields: ShareField[]) => string | null }) {
  const [name, setName] = useState('')
  const [fields, setFields] = useState<ShareField[]>([])
  const [error, setError] = useState<string | null>(null)
  const toggle = (field: ShareField, on: boolean) => setFields(current => on ? [...current, field] : current.filter(f => f !== field))
  return <CommunityScreen title="Invite a partner" onBack={onBack} testId="invite-partner">
    <TextField label="Partner name or nickname" text={name} editable filled={Boolean(name)} onChangeText={setName} />
    <p className="community-h2">What may they see?</p>
    <p className="community-help">Nothing is shared until you select it. You can change this later.</p>
    {SHARE_FIELDS.map(field => <ConsentCard key={field} title={SHARE_FIELD_LABELS[field]} body={FIELD_HELP[field]} selected={fields.includes(field)} onChange={on => toggle(field, on)} />)}
    <NeverShared name={name.trim() || undefined} />
    {error ? <p className="community-error" role="alert">{error}</p> : null}
    <Button type="button" onClick={() => setError(onInvite(name, fields))}>Create invite <SimulationBadge>Simulated</SimulationBadge></Button>
  </CommunityScreen>
}

export function PartnerDetailScreen({ community, partner, today, onBack, onAccept, onPermissions, onRevoke }: {
  community: CommunityState; partner: Partner; today: string; onBack: () => void; onAccept: () => void; onPermissions: (fields: ShareField[]) => void; onRevoke: () => void
}) {
  const [confirm, setConfirm] = useState(false)
  const view = partnerView(community, partner.id, today)
  return <CommunityScreen title={partner.displayName} onBack={onBack} testId="partner-detail">
    <div className="community-card__top"><strong className="community-h2">{partner.displayName}</strong>{statusBadge(partner)}</div>
    {partner.status === 'pending' ? <>
      <p className="community-help">Waiting for {partner.displayName} to accept. In this demo, you can simulate acceptance to preview what they would see.</p>
      <Button hierarchy="secondary" type="button" onClick={onAccept}>Simulate {partner.displayName} accepting</Button>
    </> : null}
    <p className="community-label">What {partner.displayName} sees now</p>
    {view.status === 'active' ? <div className="community-rows" data-testid="partner-preview">
      <Row label="Challenge" value={view.challengeTitle} />
      {Object.keys(view.fields).length ? (Object.entries(view.fields) as [ShareField, string | number | null][]).map(([field, value]) => <Row key={field} label={SHARE_FIELD_LABELS[field]} value={value === null ? '—' : field === 'completionRate' ? `${value}%` : String(value)} />)
        : <Row label="Shared fields" value="None" />}
    </div> : <p className="community-help" data-testid="partner-preview">{view.status === 'revoked' ? 'Nothing. Access was revoked.' : view.status === 'pending' ? 'Nothing until they accept.' : 'Nothing yet: join a challenge to have progress to share.'}</p>}
    {partner.status !== 'revoked' ? <>
      <p className="community-label">Shared fields</p>
      {SHARE_FIELDS.map(field => <ConsentCard key={field} title={SHARE_FIELD_LABELS[field]} body={FIELD_HELP[field]} selected={partner.permissions.includes(field)} onChange={on => onPermissions(on ? [...partner.permissions, field] : partner.permissions.filter(f => f !== field))} />)}
      <NeverShared name={partner.displayName} />
      {confirm ? <aside className="community-notice community-notice--warning" role="alertdialog" aria-label="Confirm stop sharing">
        <strong>Stop sharing with {partner.displayName}?</strong>
        <p>They will stop receiving future updates. Anything they already saw cannot be recalled or erased from their memory or devices.</p>
        <Button hierarchy="destructive" type="button" onClick={onRevoke}>Stop sharing</Button>
        <Button hierarchy="tertiary" type="button" onClick={() => setConfirm(false)}>Keep sharing</Button>
      </aside> : <Button hierarchy="destructive" type="button" onClick={() => setConfirm(true)}>Stop sharing with {partner.displayName}</Button>}
    </> : <p className="community-help">Access was revoked{partner.revokedAt ? ` on ${new Date(partner.revokedAt).toLocaleDateString('en-GB')}` : ''}. Future updates are blocked; earlier views cannot be recalled.</p>}
  </CommunityScreen>
}
