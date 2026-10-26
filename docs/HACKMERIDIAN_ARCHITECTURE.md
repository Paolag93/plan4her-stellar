# Plan4Her — HackMeridian 2026 architecture decisions

This document records what was built during HackMeridian on top of the existing Plan4Her MVP, and why. It describes the merged HackMeridian implementation on `main`. Status labels follow `docs/HACKMERIDIAN_EVIDENCE.md`.

## 1. Product model (final, 2026-10-26)

- Freemium planner; the hackathon shows the Premium experience (USD 6.99/month planned, **no billing implemented**).
- **One shared Rhythm Pool** replaces earlier thematic 30/90-day challenges. Members join any day; each member's own challenge is **four complete weeks (28 days) starting the next Monday** (the same day if she joins on a Monday). A member can be the first and only participant.
- Each week she confirms **3–5 commitments chosen from her existing Plan4Her tasks**. That confirmed count is the week's fixed denominator. Ordinary tasks can be added/removed freely and never change it. Commitments can be rescheduled in Plan without penalty (they reference the task, not a time slot). **One unfinished commitment per week can be replaced**; the original is kept as `replaced` with an audit entry, and the count is unchanged.
- Status is **self-reported** (done / missed / undo). Completing the linked task in Tasks or Today marks the current week's commitment done; un-ticking reopens it only if the task caused it.
- Result = completed / confirmed over four weeks. A week that ends without commitments counts as 3 not completed, so skipping cannot raise the ratio. **Eligibility threshold: 70%** (proposal).
- Accountability partners were removed from the primary journey.

## 2. Where it lives (no new navigation)

| Entry point (existing) | New | Code |
| --- | --- | --- |
| More → **Rhythm Pool** | Home, terms, weekly commitments, replace, progress/track, four-week result, leave | `src/features/community/RhythmScreens.tsx`, `CommunityFlow.tsx`, `src/domain/community.ts` |
| More → **Savings & rewards · Testnet** | Risk consent, Freighter, on-chain position, deposit/withdraw, reward **simulation** | `SavingsScreens.tsx`, `src/stellar/vault.ts`, `src/domain/savings.ts` |
| More → **Encrypted backup**; Privacy & data | Passphrase encryption, download, optional IPFS upload/restore | `EncryptedBackupScreen.tsx`, `src/domain/encryption.ts`, `server/` |
| Today | "RHYTHM POOL" card: this week's commitments done / count (live plans only) | `TodayScreen.tsx` |

Planner state (`plan4her:local-state:v1`) and its backup format are unchanged. Rhythm Pool data uses `plan4her:rhythm:v1` with a strict validator; the earlier hackathon key `plan4her:community:v1` is ignored and removed by "Clear data".

## 3. Privacy boundaries

- Commitment titles, task records, schedules, goals, notes, cycle and health context stay **on the device** (localStorage) and are never sent to Stellar, Pinata (except inside client-side ciphertext) or other members.
- The community view shows only simulated sample members plus, **with consent**, one percentage for the member.
- Wallet transactions are signed by the user and are **public on Stellar**; deposits are not confidential. No Plan4Her data is put in memos or contract calls.

## 4. Encryption and IPFS (Cyra weaknesses fixed)

| Cyra legacy issue | Plan4Her fix |
| --- | --- |
| `VITE_PINATA_JWT` in the browser bundle | JWT read only from server env (`PINATA_JWT`). Browser never calls Pinata. Server tests assert the JWT is not returned. |
| Raw AES key stored as Base64 next to the CID | A random AES-256-GCM data key is **wrapped** with a key derived from the user's passphrase (PBKDF2-SHA-256, 600 000 iterations, random 16-byte salt). Only ciphertext + wrapped key are stored. Passphrase never leaves the device. |
| Unauthenticated uploads | `POST /api/session` requires a demo access code (constant-time compare, 10 attempts / 15 min / IP) and returns a 30-minute HMAC session token. Uploads: 10 / hour / session and 30 / hour / IP. |
| Arbitrary content could be uploaded | Server accepts only a strictly-shaped encrypted envelope (`isEncryptedEnvelope`). Plaintext JSON is rejected before Pinata is contacted. File name is random (`p4h-<hex>.json`); no metadata/keyvalues. |

Wrong passphrase and tampering both fail authenticated decryption with one generic message. Lost passphrase = unrecoverable (explicit consent required before encrypting). IPFS content is public and content-addressed; the UI says ciphertext is downloadable by anyone with the CID and that deletion cannot be guaranteed.

**Access-code auth is demo-grade.** Production needs real accounts (e.g. a SEP-10 wallet challenge or email login) before public launch.

## 5. Financial architecture — option A + C (not B)

The master brief offered A (individual non-custodial positions), B (pooled controller contract), C (real vault transactions + off-chain reward simulation). We chose **A + C**:

- **A — real, individual, non-custodial.** Each Rhythm Pool member deposits from her own Freighter wallet into the public DeFindex **XLM vault on Stellar Testnet** and receives vault shares *in her own wallet*. Plan4Her never holds keys or funds. Withdrawals are always available to her, subject only to vault conditions. No commitment outcome touches her position.
- **C — simulated rewards.** Two possible sources, neither guaranteed: (1) a member's *voluntary* pledge of 20% of her own **positive realized** yield, (2) sponsor funds, counted only once actually confirmed (none are). Members at or above 70% split the pot equally; principal is never included; losses contribute nothing; if nobody is eligible everything stays with its contributors. Computed on-device by `simulateRewardPool()` and **labelled SIMULATION**. Nothing is transferred. The shared DeFindex vault holds individually owned positions and does **not** redistribute yield by habit completion.
- **Why not B:** a pooled controller contract would take custody, needs an audit, and DeFindex itself has no notion of habits or eligibility. It could not be built and safely verified before the deadline. We do not claim on-chain reward redistribution.

### Vault integration details

- Contract ids from DeFindex's published Testnet address book (`paltalabs/defindex`, `public/testnet.contracts.json`, commit `a0fcabf`, 2026-07-01):
  - Vault `xlm_paltalabs_vault`: `CCLV4H7WTLJQ7ATLHBBQV2WW3OINF3FOY5XZ7VPHZO7NH3D2ZS4GFSF6`
  - Native XLM Stellar Asset Contract (Testnet): `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`
- Function signatures verified in DeFindex's vault source (`apps/contracts/vault/src/lib.rs`): `deposit(amounts_desired, amounts_min, from, invest)`, `withdraw(withdraw_shares, min_amounts_out, from)`, `get_assets()`, `get_asset_amounts_per_shares(shares)`, SEP-41 `balance(id)` / `total_supply()` for shares.
- Before offering a deposit the app reads `get_assets()` **on chain** and only enables deposits if the vault's single asset equals the native XLM contract.
- Flow: build → `simulateTransaction` (shows estimated shares, minimum accepted with 1% slippage, max network fee) → user reviews → Freighter signs → `sendTransaction` → poll `getTransaction` until `SUCCESS`/`FAILED`. Only `SUCCESS` results are written to the local ledger, using the contract's actual return value (amounts, shares). A timeout never resubmits (no duplicate deposits); the user can re-check by hash.
- Deposits first try `invest = true`; if the strategy rejects simulation on Testnet, they fall back to `invest = false` (funds idle in vault) and the review screen says which.
- Safety checks: Testnet passphrase required, 2 XLM kept for reserve/fees, amounts parsed to integer stroops (no floats), unfunded account → Friendbot link, rejected signature → "Nothing was sent".
- **Accounting** (`positionSummary`): average-cost basis; realized result per withdrawal = amount out − basis × burned/held (basis rounded up so gains are never overstated); unrealized = redeemable − remaining basis (can be negative). Estimated APY is **not shown** because it could not be verified.
- **No DeFindex API key is needed** for this path: the app talks to the public Soroban RPC directly. The DeFindex REST API/SDK (server-side key) remains an optional future addition for APY data.

## 6. Cycle-aware planning link

Commitments are existing tasks, so they are placed, moved and explained by the existing deterministic cycle-aware planner and its editable preferences. Plan4Her makes no universal biological performance claims.

## 7. Confidential Tokens

Not integrated. OpenZeppelin's confidential token library ships contracts and circuits but no client SDK, and DeFindex vault interactions are not confidential. Kept out of the core demo as the brief requires.

## 8. Stellar Raven

Raven MCP tools were **not available** in this Claude Code cloud session, and this environment's network policy also blocked direct access to Stellar Testnet RPC, Horizon, Friendbot, DeFindex API and Pinata. Contract details were verified from DeFindex's and Pinata's official GitHub/npm sources instead. No Raven output is claimed.
