import { useEffect, useState } from 'react'
import { Button } from '../../components/Button'
import { ConsentCard } from '../../components/ConsentCard'
import { decryptJson, encryptJson, isEncryptedEnvelope, passphraseIssues, type EncryptedEnvelope } from '../../domain/encryption'
import { validateState, type AppState } from '../../domain'
import { validateCommunityState, type CommunityState } from '../../domain/community'
import { downloadLocalFile } from '../data-transfer/download'
import { CommunityScreen, Row } from './shared'

export const BUNDLE_FORMAT = 'plan4her-encrypted-bundle'
export interface BackupBundle { format: typeof BUNDLE_FORMAT; v: 1; app: AppState; community: CommunityState }

export function parseBundle(value: unknown): BackupBundle {
  const b = value as Partial<BackupBundle> | null
  if (!b || b.format !== BUNDLE_FORMAT || b.v !== 1 || !validateState(b.app) || !validateCommunityState(b.community)) throw new Error('The decrypted file is not a supported Plan4Her backup. Your data has not been changed.')
  return b as BackupBundle
}

const API = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

function PassphraseField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <label className="community-field"><span>{label}</span><input className="community-input" type="password" autoComplete="new-password" value={value} onChange={e => onChange(e.target.value)} aria-label={label} /></label>
}

export function EncryptedBackupScreen({ app, community, onBack, onUploaded, onRestore }: {
  app: AppState; community: CommunityState; onBack: () => void
  onUploaded: (cid: string, uploadedAt: string) => void
  onRestore: (bundle: BackupBundle) => { error?: string }
}) {
  const [pass, setPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [understood, setUnderstood] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [server, setServer] = useState<{ uploads: boolean; sessions: boolean } | null>(null)
  const [accessCode, setAccessCode] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const [cidInput, setCidInput] = useState('')
  const [restorePass, setRestorePass] = useState('')
  const [pending, setPending] = useState<BackupBundle | null>(null)
  const [restoreEnvelope, setRestoreEnvelope] = useState<EncryptedEnvelope | null>(null)

  useEffect(() => {
    let live = true
    fetch(`${API}/api/status`).then(r => r.ok ? r.json() : null).then(s => { if (live) setServer(s && typeof s.uploads === 'boolean' ? s : { uploads: false, sessions: false }) }).catch(() => { if (live) setServer({ uploads: false, sessions: false }) })
    return () => { live = false }
  }, [])

  const issues = passphraseIssues(pass)
  const ready = !issues.length && pass === confirm && understood
  const bundle = (): BackupBundle => ({ format: BUNDLE_FORMAT, v: 1, app, community })
  const run = async (label: string, work: () => Promise<void>) => {
    setBusy(label); setError(null); setMessage(null)
    try { await work() } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong. Your data has not been changed.') } finally { setBusy(null) }
  }
  const encrypt = () => encryptJson(bundle(), pass)

  const download = () => run('Encrypting on this device…', async () => {
    const envelope = await encrypt()
    downloadLocalFile({ filename: `plan4her-encrypted-${new Date().toISOString().slice(0, 10)}.p4h.json`, content: JSON.stringify(envelope), mimeType: 'application/json' })
    setMessage('Encrypted file downloaded. Keep your passphrase separately: without it, nobody can open this file.')
  })
  const signIn = () => run('Checking access code…', async () => {
    const res = await fetch(`${API}/api/session`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ accessCode }) })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error ?? 'Could not start a session.')
    setToken(body.token); setAccessCode('')
  })
  const upload = () => run('Encrypting, then uploading ciphertext only…', async () => {
    const envelope = await encrypt()
    const res = await fetch(`${API}/api/ipfs/upload`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(envelope) })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error ?? 'Upload failed. Nothing was stored.')
    onUploaded(body.cid, body.uploadedAt)
    setMessage(`Encrypted backup stored on IPFS. CID: ${body.cid}`)
  })
  const openFile = (file: File | undefined) => {
    if (!file) return
    run('Reading file…', async () => {
      if (file.size > 3_200_000) throw new Error('This file is too large to be a Plan4Her encrypted backup.')
      let parsed: unknown
      try { parsed = JSON.parse(await file.text()) } catch { throw new Error('This is not a Plan4Her encrypted backup.') }
      if (!isEncryptedEnvelope(parsed)) throw new Error('This is not a Plan4Her encrypted backup.')
      setRestoreEnvelope(parsed); setPending(null)
    })
  }
  const fetchCid = () => run('Retrieving ciphertext from IPFS…', async () => {
    const res = await fetch(`${API}/api/ipfs/${encodeURIComponent(cidInput.trim())}`, { headers: { authorization: `Bearer ${token}` } })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error ?? 'Could not retrieve that CID.')
    if (!isEncryptedEnvelope(body)) throw new Error('This CID does not contain a Plan4Her encrypted backup.')
    setRestoreEnvelope(body); setPending(null)
  })
  const decrypt = () => run('Decrypting on this device…', async () => {
    if (!restoreEnvelope) return
    setPending(parseBundle(await decryptJson(restoreEnvelope, restorePass)))
    setRestorePass('')
  })

  return <CommunityScreen title="Encrypted backup" onBack={onBack} testId="encrypted-backup">
    <section className="community-intro"><span>OPTIONAL · YOU HOLD THE KEY</span><h2>Your backup, your key</h2><p>Your tasks, cycle context, plans and Rhythm Pool commitments are encrypted on this device with your passphrase before anything leaves it. Plan4Her never receives your passphrase or unencrypted data.</p></section>
    <aside className="community-notice">
      <strong>What to know</strong>
      <ul>
        <li>Encrypted on your device with AES-256-GCM. Your passphrase protects the key.</li>
        <li>Lose your passphrase and nobody can recover the backup, including us.</li>
        <li>IPFS is public storage. Anyone with the CID can download the encrypted file, but only your passphrase can open it.</li>
        <li>IPFS copies can’t be guaranteed deleted, and clearing this device doesn’t remove them.</li>
        <li>For this demo, use synthetic data only.</li>
      </ul>
    </aside>
    <p className="community-label">Create a backup</p>
    <PassphraseField label="Passphrase (12+ characters)" value={pass} onChange={setPass} />
    <PassphraseField label="Repeat passphrase" value={confirm} onChange={setConfirm} />
    {pass && issues.length ? <p className="community-error">{issues.join(' ')}</p> : null}
    {confirm && pass !== confirm ? <p className="community-error">Passphrases don't match.</p> : null}
    <ConsentCard title="I understand a lost passphrase can't be recovered" body="Plan4Her does not store your passphrase or key, so it cannot reset or recover them." requirement="Required" selected={understood} onChange={setUnderstood} />
    <Button type="button" disabled={!ready || Boolean(busy)} onClick={download}>Download encrypted file</Button>
    {server?.uploads && server.sessions ? (token
      ? <Button hierarchy="secondary" type="button" disabled={!ready || Boolean(busy)} onClick={upload}>Upload encrypted backup to IPFS</Button>
      : <><label className="community-field"><span>Demo access code (for IPFS upload)</span><input className="community-input" type="password" autoComplete="off" value={accessCode} onChange={e => setAccessCode(e.target.value)} aria-label="Demo access code" /></label>
        <Button hierarchy="secondary" type="button" disabled={!accessCode || Boolean(busy)} onClick={signIn}>Unlock IPFS upload</Button></>)
      : <p className="community-help" data-testid="ipfs-unavailable">{server === null ? 'Checking whether IPFS upload is available…' : 'IPFS upload is not enabled on this deployment. The encrypted file download works offline.'}</p>}
    {busy ? <p className="community-help" role="status">{busy}</p> : null}
    {message ? <p className="community-success" role="status">{message}</p> : null}
    {error ? <p className="community-error" role="alert">{error}</p> : null}

    {community.encryptedBackups.length ? <><p className="community-label">Your IPFS backups</p><div className="community-rows">{community.encryptedBackups.map(b => <Row key={b.cid} label={new Date(b.uploadedAt).toLocaleString('en-GB')} value={<span className="community-mono">{b.cid}</span>} />)}</div></> : null}

    <p className="community-label">Restore</p>
    <label className="community-field"><span>Choose encrypted file</span><input type="file" accept=".json,application/json" onChange={e => openFile(e.target.files?.[0])} aria-label="Choose encrypted backup file" /></label>
    {token ? <><label className="community-field"><span>…or IPFS CID</span><input className="community-input" value={cidInput} onChange={e => setCidInput(e.target.value)} aria-label="IPFS CID" /></label><Button hierarchy="secondary" type="button" disabled={!cidInput || Boolean(busy)} onClick={fetchCid}>Retrieve from IPFS</Button></> : null}
    {restoreEnvelope && !pending ? <><PassphraseField label="Passphrase for this backup" value={restorePass} onChange={setRestorePass} /><Button type="button" disabled={!restorePass || Boolean(busy)} onClick={decrypt}>Decrypt</Button></> : null}
    {pending ? <aside className="community-notice community-notice--warning" aria-label="Confirm restore">
      <strong>Replace data on this device?</strong>
      <div className="community-rows">
        <Row label="Tasks" value={pending.app.tasks.length} />
        <Row label="Accepted plan" value={pending.app.acceptedPlan ? `Week of ${pending.app.acceptedPlan.weekStart}` : 'None'} />
        <Row label="Cycle context" value={pending.app.cycleBasics ? 'Included' : 'None'} />
        <Row label="Rhythm Pool" value={pending.community.participation ? 'Included' : 'None'} />
      </div>
      <Button hierarchy="destructive" type="button" onClick={() => { const r = onRestore(pending); if (r.error) setError(r.error) }}>Replace with this backup</Button>
      <Button hierarchy="tertiary" type="button" onClick={() => { setPending(null); setRestoreEnvelope(null) }}>Cancel</Button>
    </aside> : null}
  </CommunityScreen>
}
