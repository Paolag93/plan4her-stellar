# Plan4Her — HackMeridian 2026 architecture decisions

This document records what was built during HackMeridian on top of the existing Plan4Her MVP, and why. It describes the code on branch `ccr-068e87ad-nj66jj`. Status labels follow `docs/HACKMERIDIAN_EVIDENCE.md`.

## 1. Where the new features live (no new navigation)

| Entry point (existing) | New | Code |
| --- | --- | --- |
| More → **Community challenges** | Directory, challenge detail, create-your-own, goal editor, join confirmation, progress/check-in, leave | `src/features/community/CommunityScreens.tsx` |
| More → **Accountability partners** | List, invite with field-level consent, partner preview, revoke | `src/features/community/PartnerScreens.tsx` |
| More → **Savings & rewards · Testnet** | Risk consent, Freighter connect, on-chain position, deposit/withdraw, confirmations, reward **simulation** | `src/features/community/SavingsScreens.tsx`, `src/stellar/vault.ts` |
| More → **Encrypted backup**; Privacy & data → Encrypted backup | Passphrase encryption, encrypted download, optional IPFS upload/restore | `src/features/community/EncryptedBackupScreen.tsx`, `src/domain/encryption.ts`, `server/` |
| Today | "MY GOAL" card with check-in (only with a live accepted plan and active challenge) | `src/features/daily/TodayScreen.tsx` |
| Tasks → Plan | "Add this week's sessions to Tasks" creates ordinary flexible tasks; the existing selection → preview → apply flow places them with the existing cycle-aware planner | `goalSessionTasks()` in `src/domain/community.ts` |

The four root tabs (Today · Plan · Tasks · More), `AppHeader`, `BottomNav`, `Button`, `ConsentCard`, `TextField`, tokens and the 390 × 844 artboard are reused. No new font, palette or layout system.

## 2. Data model and storage

- Existing planner state is unchanged (`plan4her:local-state:v1`, same strict validator, same JSON backup format). This keeps existing backups and migrations compatible.
- Community data uses a **separate** key, `plan4her:community:v1`, with its own strict validator (`validateCommunityState`). Unreadable data is kept, not overwritten. "Clear data on this device" clears both keys.
- Community belonging never reads cycle data. The only bridge to planning is the goal's chosen *work type*, which the user's own editable phase preferences may match.

## 3. Privacy boundaries

- `partnerView()` is the only function that produces partner-visible data, and it is allow-list based (`SHARE_FIELDS`: completion %, check-ins this week, streak, last check-in date). Nothing is shared by default. Cycle data, task titles, goal names, wallet addresses, balances and rewards are never in that list. Tests assert those strings do not appear in partner output.
- Revocation clears permissions and blocks future views; UI states clearly it cannot recall what was already seen.
- **Limitation:** there is no multi-user backend yet. Partners and other challenge members are simulated on the device and labelled as such.

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

- **A — real, individual, non-custodial.** Each member deposits from her own Freighter wallet into the public DeFindex **XLM vault on Stellar Testnet** and receives vault shares *in her own wallet*. Plan4Her never holds keys or funds. Withdrawals are always available to her, subject only to vault conditions. No habit outcome touches her position.
- **C — simulated rewards.** The community reward rule (pledge 20% of *positive realized* yield; eligible members — those who reached their own personal target — split the pot equally; principal never included; losses contribute nothing; if nobody is eligible the pot stays with contributors) is computed on-device by `simulateRewardPool()` and **labelled SIMULATION** wherever it appears. Nothing is transferred.
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

Goal sessions are created as normal `TaskItem`s with deterministic ids (`goal-<challenge>-<weekStart>-<n>`, no duplicates), the goal's duration, work type and an end-of-week deadline. They pass the existing strict state schema, and the domain test proves the existing deterministic planner schedules them. The user still previews and applies every plan change. Marking a session task done records that day's check-in; un-marking removes it.

## 7. Confidential Tokens

Not integrated. OpenZeppelin's confidential token library ships contracts and circuits but no client SDK, and DeFindex vault interactions are not confidential. Kept out of the core demo as the brief requires.

## 8. Stellar Raven

Raven MCP tools were **not available** in this Claude Code cloud session, and this environment's network policy also blocked direct access to Stellar Testnet RPC, Horizon, Friendbot, DeFindex API and Pinata. Contract details were verified from DeFindex's and Pinata's official GitHub/npm sources instead. No Raven output is claimed.
