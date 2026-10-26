# HackMeridian 2026 — Implementation Evidence

Status vocabulary: **Pre-existing** · **Implemented & tested** (automated tests actually executed) · **Code complete, live verification pending** · **Simulation** (labelled in UI) · **Not implemented**.

## Before vs after
- Before (original, read-only): `Paolag93/plan4HER-` @ `9ec0c99ea8ff839c44dfb2a8bb4f9e1cdf55fbf5` (see `HACKMERIDIAN_PROVENANCE.md`).
- After: `Paolag93/plan4her-stellar` `main`. PR #1 (merge `464e058`) added the first HackMeridian build; the follow-up PR consolidates it into the Rhythm Pool model.
- The original repository, the original ChatGPT Sites preview and the Figma files were **not** modified.

| Capability | Status | Evidence |
| --- | --- | --- |
| Existing planner, tasks, Today, recovery, cycle preferences, JSON backup | Pre-existing; **no regressions** in the full existing E2E suite | QA section |
| Rhythm Pool: one community, join any day, 28-day challenge from next Monday | Implemented & tested (on-device) | `src/domain/community.test.cjs`, `tests/community.spec.ts` |
| Weekly 3–5 commitments from existing tasks, fixed denominator, one replacement/week with audit, done/missed/undo, task sync, Today card | Implemented & tested | domain + E2E (live flow with pinned Monday clock) |
| Four-week aggregate ratio, 70% threshold, skipped weeks count as 3 not done | Implemented & tested | domain tests; `community-result` E2E |
| Completion verification | Self-reported only | UI terms |
| Community members / average | Simulation (labelled); own % only with consent | UI, domain test |
| DeFindex Testnet vault deposit / balance / withdraw (individual positions) | **Confirmed on Stellar Testnet** — (A) founder's own Freighter wallet through the deployed app; (B) separate automated check with a throwaway synthetic key | tx hashes below |
| Rewards (pledged realized yield or confirmed sponsor funds) | Simulation (labelled); no distribution contract; no sponsor confirmed | `simulateRewardPool` tests |
| AES-256-GCM encrypted backup + restore | Implemented & tested (browser + Node) | `encryption.test.cjs`, E2E |
| Pinata/IPFS upload & retrieval | **Live upload, retrieval and decryption confirmed** on the deployed app (CID `bafkreidxzbfnpgu…`); live restore replacement not exercised | below; `server/api.test.ts` |
| Accountability partners, thematic 30/90-day challenges | Removed from primary journey (product decision 2026-10-26) | — |
| Billing (Premium USD 6.99/month), yield-sharing contract, sponsor system, Confidential Tokens | Not implemented (planned) | — |
| Separate public HTTPS demo | **Live and verified**: https://plan4her-stellar.onrender.com — onboarding, 4 tabs, Rhythm Pool join/commitments/persistence, savings consent and no-wallet state, encrypted backup wrong/right passphrase, at 390 px and 1280 px, 0 console errors; `/api/status` reports IPFS upload enabled | `DEPLOYMENT.md` |

## On-chain evidence A — founder's Freighter wallet via the deployed app (2026-10-26)
Performed by the founder in desktop Chrome on https://plan4her-stellar.onrender.com, signing in her own **Freighter** wallet on Testnet. The app reported both as confirmed and showed vault shares, balances and transaction history. Claude independently re-checked both on Horizon: `successful: true`, one `invoke_host_function` each, contract and arguments decoded below.

- Wallet (Testnet): `GCTVW7VYEJAKVWI6RP7IVED62BNXVEFZVWBADHZM7P7NDEO5K2QNM4IE`.
- **Deposit 10 XLM** — `deposit([100000000], [99000000], GCTVW7…M4IE, invest=true)` on vault `CCLV4H7WTLJQ7ATLHBBQV2WW3OINF3FOY5XZ7VPHZO7NH3D2ZS4GFSF6`. Ledger 5391879, 2026-10-26T02:49:42Z. Tx `a5f2129e0fa6a8fd3796d389c09436c29885e0c0fbe3cbd8decc01144ef65578` — https://stellar.expert/explorer/testnet/tx/a5f2129e0fa6a8fd3796d389c09436c29885e0c0fbe3cbd8decc01144ef65578
- **Withdraw 29,981 shares → 4.99984 XLM** — `withdraw(29981, [49498416], GCTVW7…M4IE)` on the same vault. Ledger 5391926, 2026-10-26T02:53:37Z. Tx `0d514e9702d5f650393bdb916059683655adf89e52ee2b3becb52f7bcbc094f6` — https://stellar.expert/explorer/testnet/tx/0d514e9702d5f650393bdb916059683655adf89e52ee2b3becb52f7bcbc094f6
- No positive yield is claimed.

## On-chain evidence B — synthetic-key automated check by Claude (2026-10-26)
Executed by Claude from the build environment with `npm run testnet:smoke`, which drives the app's own `src/stellar/vault.ts` (build → simulate → sign → submit → poll) with a **throwaway synthetic Testnet key** funded by Friendbot. The only difference from the browser is the signer: a local key instead of Freighter. Both hashes were independently re-checked on Horizon (`successful: true`).

- Network: Stellar **Testnet**, RPC `https://soroban-testnet.stellar.org`.
- Vault: DeFindex `xlm_paltalabs_vault` `CCLV4H7WTLJQ7ATLHBBQV2WW3OINF3FOY5XZ7VPHZO7NH3D2ZS4GFSF6`; asset verified on chain as native XLM SAC `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` (`get_assets`).
- Synthetic account: `GD7ZEYR5K6JJKSAYVY2UMXHP7G2OTS7CKW3KGQPYVYGKDX6XEG2YNG5D`.
- **Deposit** 10 XLM (`invest = true`) → 59,963 shares minted. Ledger 5391335. Tx `f82db6197d0dcf63dde25a9ec4ed178288bbd2e7af1f64a22d8c02485d8aff09` — https://stellar.expert/explorer/testnet/tx/f82db6197d0dcf63dde25a9ec4ed178288bbd2e7af1f64a22d8c02485d8aff09
- Redeemable value read from chain after deposit: 9.9998467 XLM.
- **Withdraw** 29,981 shares (50%) → 4.99984 XLM returned (min accepted 4.9498416 with 1% slippage). Ledger 5391336. Tx `43cb831154278282c0043dd042231519e5e64a5a03239779eb4dcc470a3b31b5` — https://stellar.expert/explorer/testnet/tx/43cb831154278282c0043dd042231519e5e64a5a03239779eb4dcc470a3b31b5
- Final position: 29,982 shares, redeemable 5.0000067 XLM. App accounting: realized result **−0.0000767 XLM**, unrealized −0.0000766 XLM (rounding/fees). **NO VERIFIED POSITIVE YIELD.**
- Network fee (max, simulated) for the deposit: 0.0305637 XLM.

## Encrypted storage evidence
- Payload: `{format:'plan4her-encrypted-bundle', v:1, app, community}` (synthetic data in tests).
- Algorithm: AES-256-GCM, random 96-bit IV; random 256-bit data key wrapped (AES-GCM) by PBKDF2-SHA-256 (600 000 iterations, 128-bit random salt) from the passphrase. Envelope contains only `format, v, kdf, wrap, data`.
- Decrypt roundtrip: passed (Node test and in Chromium E2E).
- Wrong key / tamper (ciphertext, wrapped key, IV): rejected — passed.
- No plaintext in envelope: asserted for cycle date, `lastPeriodStart`, task text and passphrase.
- Upload authorization: server-only `PINATA_JWT`; access-code session (HMAC token, 30 min); rate limits; ciphertext-only validation; neutral file name. Plaintext upload rejected (HTTP 422) before Pinata is called — tested.
- **Live IPFS evidence (2026-10-26, deployed app https://plan4her-stellar.onrender.com, performed by the founder):** CID `bafkreidxzbfnpgurblu2wozi6jhqlcch3v7aec5ifeym2loalxyoz7qlqe`.
  - Encrypted backup **uploaded** to IPFS through the server (Pinata JWT server-side only, demo access code): succeeded.
  - Backup **retrieved** by its CID through the app: succeeded.
  - **Decryption with the correct passphrase** succeeded; the restore preview showed 4 tasks and cycle context.
  - The founder **cancelled** the final restore, so data replacement from IPFS was **not** exercised in this live session. Wrong-passphrase rejection was **not** tested live in this session (it is covered by automated tests and by a separate live check of the downloaded encrypted file).
  - Independent check by Claude: `https://gateway.pinata.cloud/ipfs/bafkreidxzbfnpgurblu2wozi6jhqlcch3v7aec5ifeym2loalxyoz7qlqe` returns HTTP 200, 4,414 bytes, containing only the envelope keys `format, v, kdf, wrap, data` (PBKDF2 600 000, AES-GCM). None of the strings `task`, `cycle`, `lastPeriod`, `Menstrual`, `title` or the bundle format name appear in the public content.

## QA evidence (run in Claude Code cloud, Node 22.22.0, 2026-10-25/26)
- `npm ci`: success.
- `npm run typecheck` (app, tooling, server): pass.
- `npm run test:domain`: pass (existing 3 suites + community + encryption).
- `npm run test:server`: pass.
- `npm run build`: pass (Stellar SDK code-split into a lazily loaded chunk).
- `npm run test:e2e` (Playwright, Chromium; `PW_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium` because the sandbox's preinstalled browser differs from the pinned Playwright build): **354 passed, 0 failed** (5.0 min) on the final code, including all pre-existing tests.
  - Baseline before any app change: 335/336 passed. The 1 failure (`security-local` "task markup stays literal…") was time-of-day dependent (run near midnight on a Sunday, so no time remained in the week). Fixed by pinning that test's clock to a Monday, like other tests already do.
- New tests: `tests/community.spec.ts` (Rhythm Pool live flow, savings gating, rewards labelling, encrypted backup roundtrip, four-week result, navigation, 44 px targets at 320/390/768 px), 9 new axe WCAG scans.
- CI: `.github/workflows/ci.yml` now also runs typecheck and server tests.

## Release scope

This is a Stellar Testnet prototype. Reward distribution is simulated; production would require real authentication, multi-user backend infrastructure, smart-contract security review and applicable legal/compliance assessment.

The final October 26 hotfix (merged PR #10) added local title-based task classification, corrected the exact date picker and mobile spacing, clarified Rhythm Pool access, and added targeted browser regression tests. The PR reports a clean full Git-history and bundle secret scan; see [PR #10](https://github.com/Paolag93/plan4her-stellar/pull/10) for its verification notes.
