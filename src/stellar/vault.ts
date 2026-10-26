/*
 * Real Stellar Testnet integration with a public DeFindex vault contract.
 * Transactions are built and simulated against Soroban RPC, signed in the
 * user's own Freighter wallet (non-custodial), submitted, and only recorded
 * after the network reports SUCCESS. No API keys or secrets are involved.
 *
 * Vault and asset ids come from DeFindex's published testnet address book:
 * https://github.com/paltalabs/defindex/blob/main/public/testnet.contracts.json
 * The vault's asset is re-verified on chain before any deposit is offered.
 */
import { Account, Address, BASE_FEE, Contract, Keypair, Networks, TransactionBuilder, nativeToScVal, rpc, scValToNative, xdr, type Transaction } from '@stellar/stellar-sdk'
import * as freighter from '@stellar/freighter-api'
import { minWithSlippage, type VaultLedgerEntry } from '../domain/community'

export const TESTNET = {
  name: 'Stellar Testnet',
  passphrase: Networks.TESTNET,
  rpcUrl: 'https://soroban-testnet.stellar.org',
  /** DeFindex "xlm_paltalabs_vault" (testnet address book, commit a0fcabf, 2026-07-01). */
  vaultId: 'CCLV4H7WTLJQ7ATLHBBQV2WW3OINF3FOY5XZ7VPHZO7NH3D2ZS4GFSF6',
  /** Native XLM Stellar Asset Contract on Testnet. */
  assetId: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
  assetSymbol: 'XLM',
  /** XLM kept back for the account reserve and fees. */
  reserveStroops: 20_000_000n,
  slippageBps: 100,
} as const

export const explorerTx = (hash: string) => `https://stellar.expert/explorer/testnet/tx/${hash}`
export const explorerContract = (id: string) => `https://stellar.expert/explorer/testnet/contract/${id}`
export const friendbotUrl = (address: string) => `https://friendbot.stellar.org/?addr=${encodeURIComponent(address)}`

export class VaultError extends Error {
  kind: 'no-wallet' | 'rejected' | 'wrong-network' | 'unfunded' | 'insufficient' | 'asset-mismatch' | 'simulation' | 'submit' | 'timeout' | 'network'
  hash?: string
  constructor(kind: VaultError['kind'], message: string, hash?: string) { super(message); this.kind = kind; this.hash = hash }
}

export interface WalletAdapter {
  name: string
  connect(): Promise<string>
  networkPassphrase(): Promise<string>
  sign(transactionXdr: string, address: string): Promise<string>
}

function walletError(error: { code?: number; message?: string } | undefined): never {
  const message = error?.message ?? 'The wallet returned an error.'
  if (error?.code === -4 || /reject|declin|denied/i.test(message)) throw new VaultError('rejected', 'You declined in Freighter. Nothing was sent.')
  throw new VaultError('network', message)
}

export const freighterWallet: WalletAdapter = {
  name: 'Freighter',
  async connect() {
    const status = await freighter.isConnected()
    if (!status.isConnected) throw new VaultError('no-wallet', 'Freighter was not detected. Install the Freighter browser extension, create a Testnet account, then try again.')
    const access = await freighter.requestAccess()
    if (access.error || !access.address) walletError(access.error)
    return access.address
  },
  async networkPassphrase() {
    const details = await freighter.getNetworkDetails()
    if (details.error) walletError(details.error)
    return details.networkPassphrase
  },
  async sign(transactionXdr, address) {
    const signed = await freighter.signTransaction(transactionXdr, { networkPassphrase: TESTNET.passphrase, address })
    if (signed.error || !signed.signedTxXdr) walletError(signed.error)
    return signed.signedTxXdr
  },
}

const server = () => new rpc.Server(TESTNET.rpcUrl)
const vault = () => new Contract(TESTNET.vaultId)
const asset = () => new Contract(TESTNET.assetId)
const i128 = (value: bigint) => nativeToScVal(value, { type: 'i128' })
const toBig = (value: unknown): bigint => typeof value === 'bigint' ? value : BigInt(value as number | string)

async function simulateRead(contract: Contract, method: string, args: xdr.ScVal[], source?: string): Promise<unknown> {
  // Read-only simulation does not need a funded account or a signature.
  const account = new Account(source ?? Keypair.random().publicKey(), '0')
  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: TESTNET.passphrase }).addOperation(contract.call(method, ...args)).setTimeout(30).build()
  let sim: rpc.Api.SimulateTransactionResponse
  try { sim = await server().simulateTransaction(tx) } catch { throw new VaultError('network', 'Stellar Testnet RPC could not be reached. Check your connection and try again.') }
  if (rpc.Api.isSimulationError(sim)) throw new VaultError('simulation', `The vault rejected this read: ${sim.error.slice(0, 200)}`)
  if (!sim.result) throw new VaultError('simulation', 'The vault returned no result.')
  return scValToNative(sim.result.retval)
}

export interface VaultSnapshot {
  address: string
  assetVerified: boolean
  walletBalance: bigint
  shares: bigint
  redeemable: bigint
  totalShares: bigint
  readAt: string
}

/** Reads balances directly from chain state. */
export async function readVault(address: string): Promise<VaultSnapshot> {
  const assets = await simulateRead(vault(), 'get_assets', []) as Array<{ address: string }>
  const assetVerified = Array.isArray(assets) && assets.length === 1 && assets[0]?.address === TESTNET.assetId
  const [walletBalance, shares, totalShares] = await Promise.all([
    simulateRead(asset(), 'balance', [new Address(address).toScVal()]).then(toBig),
    simulateRead(vault(), 'balance', [new Address(address).toScVal()]).then(toBig),
    simulateRead(vault(), 'total_supply', []).then(toBig),
  ])
  const redeemable = shares > 0n ? toBig((await simulateRead(vault(), 'get_asset_amounts_per_shares', [i128(shares)]) as unknown[])[0]) : 0n
  return { address, assetVerified, walletBalance, shares, redeemable, totalShares, readAt: new Date().toISOString() }
}

export interface PreparedVaultTx {
  kind: 'deposit' | 'withdraw'
  transaction: Transaction
  amount: bigint
  /** Estimated from simulation; the confirmed result is what gets recorded. */
  estimatedShares: bigint
  estimatedOut: bigint
  minimum: bigint
  feeStroops: bigint
  invest: boolean
}

async function loadAccount(address: string) {
  try { return await server().getAccount(address) } catch { throw new VaultError('unfunded', 'This Testnet account is not funded yet. Fund it with Friendbot, then try again.') }
}

async function ensureTestnet(wallet: WalletAdapter) {
  const passphrase = await wallet.networkPassphrase()
  if (passphrase !== TESTNET.passphrase) throw new VaultError('wrong-network', 'Freighter is not on Testnet. Switch the network to Testnet in Freighter, then try again.')
}

async function prepare(address: string, operation: xdr.Operation): Promise<{ prepared: Transaction; retval: unknown }> {
  const account = await loadAccount(address)
  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: TESTNET.passphrase }).addOperation(operation).setTimeout(300).build()
  const sim = await server().simulateTransaction(tx).catch(() => { throw new VaultError('network', 'Stellar Testnet RPC could not be reached.') })
  if (rpc.Api.isSimulationError(sim)) throw new VaultError('simulation', `Simulation failed, nothing was sent: ${sim.error.slice(0, 240)}`)
  const prepared = rpc.assembleTransaction(tx, sim).build()
  return { prepared, retval: sim.result ? scValToNative(sim.result.retval) : null }
}

export async function prepareDeposit(wallet: WalletAdapter, address: string, amount: bigint, snapshot: VaultSnapshot): Promise<PreparedVaultTx> {
  await ensureTestnet(wallet)
  if (!snapshot.assetVerified) throw new VaultError('asset-mismatch', 'The vault asset could not be verified as Testnet XLM. Deposits are disabled.')
  if (amount + TESTNET.reserveStroops > snapshot.walletBalance) throw new VaultError('insufficient', 'Not enough Testnet XLM. Keep at least 2 XLM for the account reserve and fees.')
  const minimum = minWithSlippage(amount, TESTNET.slippageBps)
  const call = (invest: boolean) => vault().call('deposit', xdr.ScVal.scvVec([i128(amount)]), xdr.ScVal.scvVec([i128(minimum)]), new Address(address).toScVal(), xdr.ScVal.scvBool(invest))
  // Prefer investing into the vault strategy; fall back to an idle deposit if the
  // strategy rejects it on Testnet. Either way the user keeps her own shares.
  let invest = true
  let result: Awaited<ReturnType<typeof prepare>>
  try { result = await prepare(address, call(true)) } catch (error) {
    if (!(error instanceof VaultError) || error.kind !== 'simulation') throw error
    invest = false; result = await prepare(address, call(false))
  }
  const [, shares] = (result.retval ?? []) as [unknown, unknown]
  return { kind: 'deposit', transaction: result.prepared, amount, estimatedShares: shares === undefined ? 0n : toBig(shares), estimatedOut: 0n, minimum, feeStroops: BigInt(result.prepared.fee), invest }
}

export async function prepareWithdraw(wallet: WalletAdapter, address: string, shares: bigint, snapshot: VaultSnapshot): Promise<PreparedVaultTx> {
  await ensureTestnet(wallet)
  if (shares <= 0n || shares > snapshot.shares) throw new VaultError('insufficient', 'Choose an amount within your vault shares.')
  const expected = toBig((await simulateRead(vault(), 'get_asset_amounts_per_shares', [i128(shares)], address) as unknown[])[0])
  const minimum = minWithSlippage(expected, TESTNET.slippageBps)
  const { prepared, retval } = await prepare(address, vault().call('withdraw', i128(shares), xdr.ScVal.scvVec([i128(minimum)]), new Address(address).toScVal()))
  const out = Array.isArray(retval) && retval.length ? toBig(retval[0]) : expected
  return { kind: 'withdraw', transaction: prepared, amount: shares, estimatedShares: shares, estimatedOut: out, minimum, feeStroops: BigInt(prepared.fee), invest: false }
}

/** Signs in the wallet, submits once, and waits for a final ledger result. */
export async function signAndSubmit(wallet: WalletAdapter, address: string, tx: PreparedVaultTx, onStatus?: (status: 'signing' | 'submitting' | 'pending', hash?: string) => void): Promise<VaultLedgerEntry> {
  onStatus?.('signing')
  const signedXdr = await wallet.sign(tx.transaction.toXDR(), address)
  const signed = TransactionBuilder.fromXDR(signedXdr, TESTNET.passphrase)
  onStatus?.('submitting')
  const sent = await server().sendTransaction(signed).catch(() => { throw new VaultError('network', 'Could not reach Stellar Testnet to submit. Nothing was confirmed.') })
  if (sent.status === 'ERROR') throw new VaultError('submit', 'The network rejected this transaction. Nothing changed.', sent.hash)
  if (sent.status === 'TRY_AGAIN_LATER') throw new VaultError('submit', 'The network is busy. Nothing was submitted; try again in a moment.')
  onStatus?.('pending', sent.hash)
  return waitForResult(sent.hash, tx)
}

/** Polls without resubmitting, so a retry can never duplicate a deposit. */
export async function waitForResult(hash: string, tx: Pick<PreparedVaultTx, 'kind' | 'amount' | 'estimatedShares'>, timeoutMs = 90_000): Promise<VaultLedgerEntry> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const result = await server().getTransaction(hash).catch(() => null)
    if (result?.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      const value = result.returnValue ? scValToNative(result.returnValue) : null
      let amount = tx.amount, shares = tx.estimatedShares
      if (tx.kind === 'deposit' && Array.isArray(value)) { amount = toBig((value[0] as unknown[])[0]); shares = toBig(value[1]) }
      if (tx.kind === 'withdraw' && Array.isArray(value)) { shares = tx.amount; amount = toBig(value[0]) }
      return { kind: tx.kind, txHash: hash, amount: amount.toString(), shares: shares.toString(), ledger: result.ledger, at: new Date().toISOString(), vaultId: TESTNET.vaultId }
    }
    if (result?.status === rpc.Api.GetTransactionStatus.FAILED) throw new VaultError('submit', 'The transaction failed on chain. Your balances did not change.', hash)
    await new Promise(resolve => setTimeout(resolve, 2500))
  }
  throw new VaultError('timeout', 'No final result yet. Do not resend: check the explorer, then refresh.', hash)
}
