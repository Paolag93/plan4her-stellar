import { useState } from 'react'
import { Button } from '../../components/Button'
import { ConsentCard } from '../../components/ConsentCard'
import type { RootTab } from '../../components/BottomNav'
import { activeParticipation, poolProgress, ELIGIBILITY_THRESHOLD, type CommunityState } from '../../domain/community'
import { formatAmount, parseAmount, positionSummary, simulateRewardPool, type VaultLedgerEntry } from '../../domain/savings'
import { CommunityScreen, Row, SimulationBadge, percent } from './shared'
import type { PreparedVaultTx, VaultSnapshot } from '../../stellar/vault'

// Static ids duplicated here so the screen renders without loading the Stellar SDK.
const VAULT_ID = 'CCLV4H7WTLJQ7ATLHBBQV2WW3OINF3FOY5XZ7VPHZO7NH3D2ZS4GFSF6'
const explorer = (path: string) => `https://stellar.expert/explorer/testnet/${path}`
const short = (value: string) => `${value.slice(0, 4)}…${value.slice(-4)}`
const loadVault = () => import('../../stellar/vault')

const RISKS = [
  { title: 'Testnet only: no real money', body: 'This demo uses Stellar Testnet XLM, which has no monetary value. No real funds are accepted.' },
  { title: 'My deposit is not guaranteed', body: 'Vault strategies can lose value through smart-contract, protocol, liquidity, asset or depeg risk. Withdrawals depend on vault conditions.' },
  { title: 'No penalties for missed commitments', body: 'Missing commitments never confiscates or locks my deposit. Rewards are not guaranteed and their distribution is simulated in this demo.' },
]

type TxState = { phase: 'idle' } | { phase: 'review'; tx: PreparedVaultTx } | { phase: 'signing' | 'submitting' } | { phase: 'pending'; hash: string; tx: PreparedVaultTx } | { phase: 'confirmed'; entry: VaultLedgerEntry } | { phase: 'failed'; message: string; hash?: string; tx?: PreparedVaultTx }

export function SavingsScreen({ community, today, onBack, onNavigate, onChange, onRewards, qaAddress }: {
  community: CommunityState; today: string; onBack: () => void; onNavigate: (tab: RootTab) => void
  onChange: (next: CommunityState) => boolean; onRewards: () => void; qaAddress?: string
}) {
  const [risks, setRisks] = useState<boolean[]>(RISKS.map(() => false))
  const [address, setAddress] = useState<string | null>(qaAddress ?? null)
  const [snapshot, setSnapshot] = useState<VaultSnapshot | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<{ message: string; fund?: string } | null>(null)
  const [amount, setAmount] = useState('')
  const [tx, setTx] = useState<TxState>({ phase: 'idle' })
  const summary = positionSummary(community.savings.ledger, snapshot?.redeemable ?? null)

  if (!community.savings.optedIn) {
    const all = risks.every(Boolean)
    return <CommunityScreen title="Optional savings" onBack={onBack} onNavigate={onNavigate} testId="savings-optin">
      <section className="community-intro"><span>OPTIONAL · STELLAR TESTNET</span><h2>Save alongside your rhythm, if you want to</h2><p>Put a small Testnet deposit into the Rhythm Pool’s DeFindex vault during your four weeks. The position is held by your wallet, and you can withdraw anytime, subject to vault conditions. The Rhythm Pool and planning work fully without this.</p></section>
      <p className="community-h2">Before you continue</p>
      {RISKS.map((risk, i) => <ConsentCard key={risk.title} title={risk.title} body={risk.body} requirement="Required" selected={risks[i]} onChange={on => setRisks(current => current.map((v, j) => j === i ? on : v))} />)}
      <Button type="button" disabled={!all} onClick={() => onChange({ ...community, savings: { ...community.savings, optedIn: true, risksAcknowledgedAt: new Date().toISOString() } })}>I understand, continue</Button>
      <Button hierarchy="tertiary" type="button" onClick={onBack}>Not now</Button>
    </CommunityScreen>
  }

  const fail = (e: unknown, fundAddress?: string) => {
    const err = e as { message?: string; kind?: string; hash?: string }
    setError({ message: err.message ?? 'Something went wrong. Nothing was sent.', fund: err.kind === 'unfunded' ? fundAddress : undefined })
  }
  const refresh = async (who = address) => {
    if (!who) return
    setBusy('Reading your vault position from Stellar Testnet…'); setError(null)
    try { const { readVault } = await loadVault(); setSnapshot(await readVault(who)) } catch (e) { fail(e, who) } finally { setBusy(null) }
  }
  const connect = async () => {
    setBusy('Waiting for Freighter…'); setError(null)
    try {
      const { freighterWallet, TESTNET } = await loadVault()
      const who = await freighterWallet.connect()
      if (await freighterWallet.networkPassphrase() !== TESTNET.passphrase) throw new Error('Freighter is not on Testnet. Switch the network to Testnet in Freighter, then connect again.')
      setAddress(who); setBusy(null); await refresh(who)
    } catch (e) { setBusy(null); fail(e) }
  }
  const record = (entry: VaultLedgerEntry) => {
    if (community.savings.ledger.some(item => item.txHash === entry.txHash)) return
    onChange({ ...community, savings: { ...community.savings, ledger: [...community.savings.ledger, entry] } })
  }
  const review = async (kind: 'deposit' | 'withdraw', fraction?: number) => {
    if (!address || !snapshot) return
    setError(null)
    let value: bigint
    try { value = kind === 'deposit' ? parseAmount(amount) : snapshot.shares * BigInt(Math.round((fraction ?? 1) * 100)) / 100n } catch (e) { fail(e); return }
    setBusy('Simulating on Stellar Testnet…')
    try {
      const { freighterWallet, prepareDeposit, prepareWithdraw } = await loadVault()
      const prepared = kind === 'deposit' ? await prepareDeposit(freighterWallet, address, value, snapshot) : await prepareWithdraw(freighterWallet, address, value, snapshot)
      setTx({ phase: 'review', tx: prepared })
    } catch (e) { fail(e, address) } finally { setBusy(null) }
  }
  const sign = async (prepared: PreparedVaultTx) => {
    if (!address) return
    try {
      const { freighterWallet, signAndSubmit } = await loadVault()
      const entry = await signAndSubmit(freighterWallet, address, prepared, (phase, hash) => setTx(phase === 'pending' && hash ? { phase, hash, tx: prepared } : { phase: phase === 'pending' ? 'submitting' : phase }))
      record(entry); setTx({ phase: 'confirmed', entry }); setAmount(''); await refresh()
    } catch (e) {
      const err = e as { message?: string; hash?: string }
      setTx({ phase: 'failed', message: err.message ?? 'The transaction did not complete.', hash: err.hash, tx: prepared })
    }
  }
  const recheck = async (hash: string, prepared: PreparedVaultTx) => {
    setTx({ phase: 'pending', hash, tx: prepared })
    try { const { waitForResult } = await loadVault(); const entry = await waitForResult(hash, prepared, 30_000); record(entry); setTx({ phase: 'confirmed', entry }); await refresh() }
    catch (e) { const err = e as { message?: string }; setTx({ phase: 'failed', message: err.message ?? 'Still no result.', hash, tx: prepared }) }
  }

  const unit = (v: bigint | null) => v === null ? '—' : formatAmount(v)
  return <CommunityScreen title="Savings · Testnet" onBack={onBack} onNavigate={onNavigate} testId="savings">
    <div className="community-card__top"><span className="community-badge community-badge--brand">Stellar Testnet</span><span className="community-badge">Your wallet, your keys</span></div>
    {!address ? <>
      <p className="community-help">Connect the Freighter browser wallet on Testnet. Plan4Her never sees your secret key: you review and approve every transaction in Freighter.</p>
      <Button type="button" loading={Boolean(busy)} onClick={connect}>Connect Freighter (Testnet)</Button>
      <a className="community-link" href="https://www.freighter.app/" target="_blank" rel="noreferrer">Get Freighter</a>
    </> : <>
      <div className="community-rows">
        <Row label="Wallet" value={<span className="community-mono">{short(address)}</span>} note="Your address is public on Stellar. Plan4Her never puts your goals, tasks or cycle data on-chain." />
      </div>
      {snapshot && !snapshot.assetVerified ? <p className="community-error" role="alert">The vault’s asset could not be verified on chain, so deposits are turned off.</p> : null}
      <Button hierarchy="secondary" type="button" loading={Boolean(busy)} onClick={() => refresh()}>Refresh balance</Button>
    </>}
    {busy ? <p className="community-help" role="status">{busy}</p> : null}
    {error ? <div className="community-error" role="alert"><p>{error.message}</p>{error.fund ? <a className="community-link" href={`https://friendbot.stellar.org/?addr=${encodeURIComponent(error.fund)}`} target="_blank" rel="noreferrer">Fund with Friendbot (Testnet)</a> : null}</div> : null}

    <p className="community-label">My position</p>
    <div className="community-position" data-testid="position">
    <div className="community-rows">
      <Row label="Wallet balance" value={snapshot ? unit(snapshot.walletBalance) : '—'} note={snapshot ? `Read ${new Date(snapshot.readAt).toLocaleTimeString()}` : 'Connect to read from chain'} />
      <Row label="Redeemable now" value={snapshot ? unit(snapshot.redeemable) : '—'} note="Vault's current value of my shares" />
      <Row label="Net contribution" value={unit(summary.contributed)} note="Deposits minus the cost of shares withdrawn" />
      <Row label="Change vs net contribution" value={summary.unrealized === null ? '—' : unit(summary.unrealized)} note="Not yet withdrawn. Can be negative." />
      <Row label="Realized yield" value={unit(summary.realized)} note={summary.realized > 0n ? 'From completed withdrawals' : 'None realized yet'} />
    </div>
    <details className="community-details">
      <summary>Technical details</summary>
      <div className="community-rows">
        <Row label="Vault" value={<a className="community-link" href={explorer(`contract/${VAULT_ID}`)} target="_blank" rel="noreferrer">{short(VAULT_ID)}</a>} note={snapshot ? (snapshot.assetVerified ? 'DeFindex vault · asset verified on chain: native XLM' : 'DeFindex vault · asset not verified') : 'DeFindex vault on Stellar Testnet'} />
        <Row label="My vault shares" value={snapshot ? snapshot.shares.toString() : '—'} note="Owned by my wallet" />
        <Row label="APY" value="Not available" note="Not verified for this Testnet vault" />
      </div>
    </details>
    </div>

    {address && snapshot ? <>
      <p className="community-label">Deposit</p>
      <label className="community-field"><span>Amount (Testnet XLM)</span><input className="community-input" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} aria-label="Deposit amount in Testnet XLM" placeholder="e.g. 10" /></label>
      <Button type="button" disabled={!snapshot.assetVerified || tx.phase !== 'idle' && tx.phase !== 'confirmed' && tx.phase !== 'failed'} onClick={() => review('deposit')}>Review deposit</Button>
      {snapshot.shares > 0n ? <>
        <p className="community-label">Withdraw</p>
        <div className="community-chips">{[0.25, 0.5, 1].map(f => <button key={f} type="button" className="community-chip" onClick={() => review('withdraw', f)}>{f === 1 ? 'All' : percent(f)}</button>)}</div>
        <p className="community-help">Withdrawals return the vault's current value of your shares, which may be more or less than you deposited. There is never a penalty for missed commitments.</p>
      </> : null}
    </> : null}

    {tx.phase === 'review' ? <aside className="community-notice" data-testid="tx-review" aria-label="Review transaction">
      <strong>Review {tx.tx.kind}</strong>
      <div className="community-rows">
        {tx.tx.kind === 'deposit' ? <><Row label="Deposit" value={formatAmount(tx.tx.amount)} /><Row label="Minimum accepted" value={formatAmount(tx.tx.minimum)} note="1% slippage limit" /><Row label="Estimated shares" value={tx.tx.estimatedShares.toString()} note="Final amount comes from the confirmed result" /><Row label="Strategy" value={tx.tx.invest ? 'Invested by vault' : 'Held idle in vault'} /></>
          : <><Row label="Shares to redeem" value={tx.tx.amount.toString()} /><Row label="Estimated return" value={formatAmount(tx.tx.estimatedOut)} /><Row label="Minimum accepted" value={formatAmount(tx.tx.minimum)} note="1% slippage limit" /></>}
        <Row label="Network fee (max)" value={formatAmount(tx.tx.feeStroops)} />
        <Row label="Network" value="Stellar Testnet" />
      </div>
      <Button type="button" onClick={() => sign(tx.tx)}>Review &amp; sign in Freighter</Button>
      <Button hierarchy="tertiary" type="button" onClick={() => setTx({ phase: 'idle' })}>Cancel</Button>
    </aside> : null}
    {tx.phase === 'signing' ? <p className="community-help" role="status">Review and approve in Freighter. Nothing is sent until you do.</p> : null}
    {tx.phase === 'submitting' ? <p className="community-help" role="status">Submitting to Stellar Testnet…</p> : null}
    {tx.phase === 'pending' ? <p className="community-help" role="status">Waiting for confirmation… <span className="community-mono">{tx.hash}</span></p> : null}
    {tx.phase === 'confirmed' ? <aside className="community-notice" role="status" data-testid="tx-confirmed"><strong>Confirmed on Stellar Testnet</strong>
      <p>{tx.entry.kind === 'deposit' ? `Deposited ${formatAmount(BigInt(tx.entry.amount))} for ${tx.entry.shares} shares.` : `Redeemed ${tx.entry.shares} shares for ${formatAmount(BigInt(tx.entry.amount))}.`} Ledger {tx.entry.ledger}.</p>
      <a className="community-link" href={explorer(`tx/${tx.entry.txHash}`)} target="_blank" rel="noreferrer">View on Stellar Expert</a>
      <Button hierarchy="tertiary" type="button" onClick={() => setTx({ phase: 'idle' })}>Done</Button></aside> : null}
    {tx.phase === 'failed' ? <aside className="community-notice community-notice--warning" role="alert"><strong>Not confirmed</strong><p>{tx.message}</p>
      {tx.hash ? <><span className="community-mono">{tx.hash}</span><a className="community-link" href={explorer(`tx/${tx.hash}`)} target="_blank" rel="noreferrer">Check on Stellar Expert</a>{tx.tx ? <Button hierarchy="secondary" type="button" onClick={() => recheck(tx.hash!, tx.tx!)}>Check result again</Button> : null}</> : null}
      <Button hierarchy="tertiary" type="button" onClick={() => setTx({ phase: 'idle' })}>Close</Button></aside> : null}

    {community.savings.ledger.length ? <>
      <p className="community-label">Confirmed transactions</p>
      <div className="community-rows">{[...community.savings.ledger].reverse().map(entry => <Row key={entry.txHash} label={`${entry.kind === 'deposit' ? 'Deposit' : 'Withdrawal'} · ledger ${entry.ledger}`} value={<a className="community-link" href={explorer(`tx/${entry.txHash}`)} target="_blank" rel="noreferrer">{formatAmount(BigInt(entry.amount))}</a>} note={new Date(entry.at).toLocaleString('en-GB')} />)}</div>
    </> : null}

    <p className="community-label">Community rewards</p>
    <Button hierarchy="secondary" type="button" onClick={onRewards}>How rewards work <SimulationBadge>Simulation</SimulationBadge></Button>
    <aside className="community-notice"><strong>You control your vault position</strong><p>Your vault shares are held by your own wallet. Plan4Her never holds your keys or moves your funds, and the vault doesn’t shift yield based on habits. Vault value can go down. Stellar transactions are public; your goals, tasks and cycle data never go on-chain.</p></aside>
  </CommunityScreen>
}

const SAMPLE = [
  { id: 'Member A (sample)', yieldStroops: 1_200_000n, eligible: true, pledges: true },
  { id: 'Member B (sample)', yieldStroops: 0n, eligible: true, pledges: true },
  { id: 'Member C (sample)', yieldStroops: -300_000n, eligible: false, pledges: true },
  { id: 'Member D (sample)', yieldStroops: 800_000n, eligible: false, pledges: false },
]
/** No sponsor funds are confirmed for this demo, so the sponsor source is zero. */
const CONFIRMED_SPONSOR_FUNDS = 0n

export function RewardsSimulationScreen({ community, today, onBack }: { community: CommunityState; today: string; onBack: () => void }) {
  const p = activeParticipation(community)
  const progress = p ? poolProgress(p, today) : null
  const mine = positionSummary(community.savings.ledger)
  const eligible = Boolean(progress && progress.ratio >= ELIGIBILITY_THRESHOLD)
  const participants = [{ id: 'You', realizedYield: mine.realized, principal: mine.contributed, eligible, pledgesYield: Boolean(p?.pledgeYield) }, ...SAMPLE.map(s => ({ id: s.id, realizedYield: s.yieldStroops, principal: 100_000_000n, eligible: s.eligible, pledgesYield: s.pledges }))]
  const result = simulateRewardPool(participants, 20, CONFIRMED_SPONSOR_FUNDS)
  return <CommunityScreen title="Rewards simulation" onBack={onBack} testId="rewards-simulation">
    <aside className="community-notice community-notice--warning"><strong>SIMULATION: no rewards are paid</strong><p>This models a proposed Rhythm Pool rule on your device. Nothing is distributed on-chain and no funds move.</p></aside>
    <details className="community-details">
    <summary>How the proposed rule works</summary>
    <ul>
      <li><strong>Pledged yield:</strong> members can choose to pledge 20% of their own <strong>positive realized</strong> yield. A verified way to distribute it doesn’t exist yet.</li>
      <li><strong>Sponsor funds:</strong> counted only once confirmed. None are confirmed for this demo.</li>
      <li>Neither source is guaranteed. Deposits (principal) are never part of the pot; losses contribute nothing.</li>
      <li>Members who complete at least {percent(ELIGIBILITY_THRESHOLD)} of their four-week commitments share the pot equally. Falling short never touches anyone’s deposit.</li>
    </ul>
    </details>
    <div className="community-rows" data-testid="reward-table">
      <Row label="Your realized yield" value={formatAmount(mine.realized > 0n ? mine.realized : 0n)} note={mine.realized > 0n ? 'From your confirmed withdrawals' : 'No verified yield yet'} />
      <Row label="Your yield pledge" value={p?.pledgeYield ? '20% authorized' : 'Not authorized'} />
      <Row label="Your consistency" value={progress ? `${percent(progress.ratio)} · ${eligible ? 'at or above 70%' : 'below 70%'}` : 'Join the Rhythm Pool first'} />
      <Row label="Sponsor funds (confirmed)" value={formatAmount(result.sponsorPot)} note="None confirmed" />
      <Row label="Simulated pot" value={formatAmount(result.pot)} />
      {participants.map(x => <Row key={x.id} label={x.id} value={formatAmount(result.allocations[x.id] ?? 0n)} note={x.eligible ? 'Eligible' : 'Not eligible'} />)}
      <Row label="Unallocated" value={formatAmount(result.unallocated)} note="Stays with contributors" />
    </div>
    <p className="community-help">Sample members and their yields are invented for illustration.</p>
  </CommunityScreen>
}
