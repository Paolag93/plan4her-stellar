/*
 * Optional Testnet savings accounting. Amounts are integer stroops (bigint).
 * Positions are individually owned vault shares; nothing here moves funds.
 */

export interface VaultLedgerEntry {
  kind: 'deposit' | 'withdraw'
  txHash: string
  /** Underlying asset in stroops (7 decimals), decimal string. */
  amount: string
  /** Vault shares minted (deposit) or burned (withdraw), decimal string. */
  shares: string
  ledger: number
  at: string
  vaultId: string
}

export const STROOPS_PER_UNIT = 10_000_000n

/** Parses a user-entered XLM amount to stroops without floating-point rounding. */
export function parseAmount(input: string): bigint {
  const text = input.trim().replace(',', '.')
  if (!/^\d+(\.\d{1,7})?$/.test(text)) throw new Error('Enter an amount with up to 7 decimal places.')
  const [whole, fraction = ''] = text.split('.')
  const value = BigInt(whole) * STROOPS_PER_UNIT + BigInt(fraction.padEnd(7, '0'))
  if (value <= 0n) throw new Error('Enter an amount greater than zero.')
  return value
}

export function formatAmount(stroops: bigint, symbol = 'XLM'): string {
  const negative = stroops < 0n
  const abs = negative ? -stroops : stroops
  const whole = abs / STROOPS_PER_UNIT
  const fraction = (abs % STROOPS_PER_UNIT).toString().padStart(7, '0').replace(/0+$/, '')
  return `${negative ? '−' : ''}${whole.toString()}${fraction ? `.${fraction}` : ''} ${symbol}`.trim()
}

/** Minimum accepted output after slippage, rounded down. */
export function minWithSlippage(amount: bigint, slippageBps: number): bigint {
  if (!Number.isInteger(slippageBps) || slippageBps < 0 || slippageBps > 10_000) throw new Error('Invalid slippage.')
  return amount * BigInt(10_000 - slippageBps) / 10_000n
}

export interface PositionSummary {
  /** Remaining cost basis of shares still held (average-cost method). */
  contributed: bigint
  shares: bigint
  totalDeposited: bigint
  totalWithdrawn: bigint
  /** Net realized result of withdrawals; negative means a realized loss. */
  realized: bigint
  /** Current redeemable value minus remaining cost basis; may be negative. */
  unrealized: bigint | null
  redeemable: bigint | null
}

/**
 * Confirmed ledger entries only. Average-cost basis: each withdrawal realizes
 * amountOut − (basis × sharesBurned / sharesHeld). Rounding favours a lower
 * realized gain so yield is never overstated.
 */
export function positionSummary(ledger: VaultLedgerEntry[], redeemable: bigint | null = null): PositionSummary {
  let basis = 0n, shares = 0n, realized = 0n, deposited = 0n, withdrawn = 0n
  for (const entry of ledger) {
    const amount = BigInt(entry.amount), delta = BigInt(entry.shares)
    if (amount < 0n || delta < 0n) throw new Error('Ledger amounts must be positive.')
    if (entry.kind === 'deposit') { basis += amount; shares += delta; deposited += amount }
    else {
      if (delta > shares || shares === 0n) throw new Error('Withdrawal exceeds recorded shares.')
      const basisOut = delta === shares ? basis : (basis * delta + shares - 1n) / shares
      realized += amount - basisOut
      basis -= basisOut; shares -= delta; withdrawn += amount
    }
  }
  return { contributed: basis, shares, totalDeposited: deposited, totalWithdrawn: withdrawn, realized, redeemable, unrealized: redeemable === null ? null : redeemable - basis }
}

export interface RewardParticipant {
  id: string
  realizedYield: bigint
  principal: bigint
  eligible: boolean
  /** Explicit, voluntary authorization to pledge part of positive realized yield. */
  pledgesYield: boolean
}
export interface RewardAllocation {
  pot: bigint
  yieldPot: bigint
  sponsorPot: bigint
  pledgePercent: number
  allocations: Record<string, bigint>
  unallocated: bigint
  principalTouched: false
}

/**
 * SIMULATION of a proposed Rhythm Pool reward rule. Two possible sources, neither
 * guaranteed: (1) a voluntary pledge of a member's own positive realized yield,
 * (2) sponsor funds, counted only when actually confirmed. Principal is never in
 * the pot and losses contribute nothing. Eligible members split the pot equally;
 * if nobody is eligible everything stays with whoever contributed it.
 */
export function simulateRewardPool(participants: RewardParticipant[], pledgePercent = 20, confirmedSponsorFunds = 0n): RewardAllocation {
  if (!Number.isInteger(pledgePercent) || pledgePercent < 0 || pledgePercent > 100) throw new Error('Pledge must be 0–100%.')
  if (confirmedSponsorFunds < 0n) throw new Error('Sponsor funds cannot be negative.')
  const yieldPot = participants.reduce((sum, p) => sum + (p.pledgesYield && p.realizedYield > 0n ? p.realizedYield * BigInt(pledgePercent) / 100n : 0n), 0n)
  const pot = yieldPot + confirmedSponsorFunds
  const eligible = participants.filter(p => p.eligible)
  const allocations: Record<string, bigint> = Object.fromEntries(participants.map(p => [p.id, 0n]))
  const base = { pot, yieldPot, sponsorPot: confirmedSponsorFunds, pledgePercent, allocations, principalTouched: false as const }
  if (!eligible.length || pot === 0n) return { ...base, unallocated: pot }
  const each = pot / BigInt(eligible.length)
  for (const p of eligible) allocations[p.id] = each
  return { ...base, unallocated: pot - each * BigInt(eligible.length) }
}
