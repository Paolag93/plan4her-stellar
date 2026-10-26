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
| DeFindex Testnet vault deposit / balance / withdraw (individual positions) | **Confirmed on Stellar Testnet** (synthetic key via the app's vault code); Freighter browser signing same path, to be shown in video | tx hashes below |
| Rewards (pledged realized yield or confirmed sponsor funds) | Simulation (labelled); no distribution contract; no sponsor confirmed | `simulateRewardPool` tests |
| AES-256-GCM encrypted backup + restore | Implemented & tested (browser + Node) | `encryption.test.cjs`, E2E |
| Pinata/IPFS upload & retrieval | **Code complete, tested with fake Pinata; live upload pending** `PINATA_JWT` | `server/api.test.ts` |
| Accountability partners, thematic 30/90-day challenges | Removed from primary journey (product decision 2026-10-26) | — |
| Billing (Premium USD 6.99/month), yield-sharing contract, sponsor system, Confidential Tokens | Not implemented (planned) | — |
| Separate public HTTPS demo | **Live and verified**: https://plan4her-stellar.onrender.com — onboarding, 4 tabs, Rhythm Pool join/commitments/persistence, savings consent and no-wallet state, encrypted backup wrong/right passphrase, at 390 px and 1280 px, 0 console errors; `/api/status` reports IPFS upload enabled | `DEPLOYMENT.md` |

## On-chain evidence (Stellar Testnet) — CONFIRMED 2026-10-26
Executed by Claude from the build environment with `npm run testnet:smoke`, which drives the app's own `src/stellar/vault.ts` (build → simulate → sign → submit → poll) with a **throwaway synthetic Testnet key** funded by Friendbot. The only difference from the browser is the signer: a local key instead of Freighter. Both hashes were independently re-checked on Horizon (`successful: true`).

- Network: Stellar **Testnet**, RPC `https://soroban-testnet.stellar.org`.
- Vault: DeFindex `xlm_paltalabs_vault` `CCLV4H7WTLJQ7ATLHBBQV2WW3OINF3FOY5XZ7VPHZO7NH3D2ZS4GFSF6`; asset verified on chain as native XLM SAC `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` (`get_assets`).
- Synthetic account: `GD7ZEYR5K6JJKSAYVY2UMXHP7G2OTS7CKW3KGQPYVYGKDX6XEG2YNG5D`.
- **Deposit** 10 XLM (`invest = true`) → 59,963 shares minted. Ledger 5391335. Tx `f82db6197d0dcf63dde25a9ec4ed178288bbd2e7af1f64a22d8c02485d8aff09` — https://stellar.expert/explorer/testnet/tx/f82db6197d0dcf63dde25a9ec4ed178288bbd2e7af1f64a22d8c02485d8aff09
- Redeemable value read from chain after deposit: 9.9998467 XLM.
- **Withdraw** 29,981 shares (50%) → 4.99984 XLM returned (min accepted 4.9498416 with 1% slippage). Ledger 5391336. Tx `43cb831154278282c0043dd042231519e5e64a5a03239779eb4dcc470a3b31b5` — https://stellar.expert/explorer/testnet/tx/43cb831154278282c0043dd042231519e5e64a5a03239779eb4dcc470a3b31b5
- Final position: 29,982 shares, redeemable 5.0000067 XLM. App accounting: realized result **−0.0000767 XLM**, unrealized −0.0000766 XLM (rounding/fees). **NO VERIFIED POSITIVE YIELD.**
- Network fee (max, simulated) for the deposit: 0.0305637 XLM.
- A Freighter-signed deposit by the founder in the browser is still recommended for the demo video; it uses the same code path.

## Encrypted storage evidence
- Payload: `{format:'plan4her-encrypted-bundle', v:1, app, community}` (synthetic data in tests).
- Algorithm: AES-256-GCM, random 96-bit IV; random 256-bit data key wrapped (AES-GCM) by PBKDF2-SHA-256 (600 000 iterations, 128-bit random salt) from the passphrase. Envelope contains only `format, v, kdf, wrap, data`.
- Decrypt roundtrip: passed (Node test and in Chromium E2E).
- Wrong key / tamper (ciphertext, wrapped key, IV): rejected — passed.
- No plaintext in envelope: asserted for cycle date, `lastPeriodStart`, task text and passphrase.
- Upload authorization: server-only `PINATA_JWT`; access-code session (HMAC token, 30 min); rate limits; ciphertext-only validation; neutral file name. Plaintext upload rejected (HTTP 422) before Pinata is called — tested.
- Synthetic IPFS CID: **PENDING** (needs Pinata key and deployment).

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

## Submission deliverables
- GitHub repo: private until founder review.
- Separate deployed demo URL: https://plan4her-stellar.onrender.com (Render, from `main`).
- Demo video: script in `docs/DEMO_SCRIPT.md`.
- Hackathon submission: not submitted by Claude.
- Real-money readiness: **Testnet demonstration only; no return or capital guarantee.** Production would need real accounts/auth, a multi-user backend for partners, an audited contract if rewards were ever distributed on chain, legal/compliance review and a security review.
