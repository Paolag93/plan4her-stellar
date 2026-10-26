// Real Stellar Testnet smoke test of src/stellar/vault.ts with a throwaway synthetic key funded by Friendbot.
// Run: npm run testnet:smoke   (needs network access to *.stellar.org; Testnet only, no real value)
import { Keypair, TransactionBuilder } from '@stellar/stellar-sdk'
import { TESTNET, readVault, prepareDeposit, prepareWithdraw, signAndSubmit, explorerTx, type WalletAdapter } from '../src/stellar/vault'
import { positionSummary, formatAmount } from '../src/domain/savings'
const kp = Keypair.random()
// Synthetic Testnet-only key generated for this run; never stored or reused.
const wallet: WalletAdapter = { name: 'synthetic-testnet-key', connect: async () => kp.publicKey(), networkPassphrase: async () => TESTNET.passphrase,
  sign: async (xdr) => { const tx = TransactionBuilder.fromXDR(xdr, TESTNET.passphrase); tx.sign(kp); return tx.toXDR() } }
const log = (...a: unknown[]) => console.log(...a)
;(async () => {
  const addr = kp.publicKey(); log('account', addr)
  const fb = await fetch(`https://friendbot.stellar.org/?addr=${addr}`); log('friendbot', fb.status)
  let snap = await readVault(addr); log('assetVerified', snap.assetVerified, 'wallet', formatAmount(snap.walletBalance), 'shares', snap.shares.toString(), 'totalShares', snap.totalShares.toString())
  const dep = await prepareDeposit(wallet, addr, 100_000_000n, snap); log('deposit prepared invest=', dep.invest, 'estShares', dep.estimatedShares.toString(), 'fee', formatAmount(dep.feeStroops))
  const d = await signAndSubmit(wallet, addr, dep, s => log(' ..', s)); log('DEPOSIT', JSON.stringify(d), explorerTx(d.txHash))
  snap = await readVault(addr); log('after deposit shares', snap.shares.toString(), 'redeemable', formatAmount(snap.redeemable))
  const half = snap.shares / 2n
  const w = await prepareWithdraw(wallet, addr, half, snap); log('withdraw prepared estOut', formatAmount(w.estimatedOut), 'min', formatAmount(w.minimum))
  const r = await signAndSubmit(wallet, addr, w, s => log(' ..', s)); log('WITHDRAW', JSON.stringify(r), explorerTx(r.txHash))
  snap = await readVault(addr); log('final shares', snap.shares.toString(), 'redeemable', formatAmount(snap.redeemable), 'wallet', formatAmount(snap.walletBalance))
  const pos = positionSummary([d, r], snap.redeemable); log('accounting', JSON.stringify(pos, (_, v) => typeof v === 'bigint' ? v.toString() : v))
})().catch(e => { console.error('ERROR', e.kind ?? '', e.message, e.hash ?? ''); process.exit(1) })
