# Plan4Her — HackMeridian 2026 Engineering Master Brief
**Working repository:** https://github.com/Paolag93/plan4her-stellar (PRIVATE, writable)
**Original project — READ ONLY:** https://github.com/Paolag93/plan4HER-
**Legacy Cyra — READ ONLY:** https://github.com/OlaOlaPaola/Cyra
**Scale submission:** Monday, October 26, 2026 at 12:00 in Lisbon, according to the hackathon brief (confirm in submission portal).

## 1. Founder / product intent
Plan4Her is a privacy-first productivity app for women who pursue **their own personal goals** with cycle-aware planning, community support and optional rewards powered by Stellar. The original brand philosophy: tools should adapt to women, not women to rigid tools. Community members need not share the same habit, menstrual phase or productivity expectations.

Three pillars:
- **Privacy & Data Ownership** — Sensitive cycle, task, behavior and goal data remain private by default. User authorizes limited progress information for an accountability partner.
- **Community-Powered Habit & Yield Pools** — Open 30- or 90-day community challenges, individual goal-setting, progress/check-ins, accountability partners, optional small participant-funded contributions; a compatible DeFindex vault on Stellar supplies possible **variable yield**. Absolutely no sponsors, mandatory deposits, principal-based punishment, goal-failure slashing or guaranteed-yield claims.
- **Cycle-Aware Intelligence** — Build on current preference-based deterministic schedule. Make recommendations responsive to users' declared needs, preferences and constraints. No claims that cycle phases predict a universal performance pattern.

Suggested one-liner: “Plan4Her is a privacy-first productivity app empowering women through cycle-aware planning, community support and Stellar-powered rewards.”

## 2. What already exists (baseline; DO NOT REBUILD)
The copied original is a React 19 + TypeScript + Vite 6 local-first PWA with a mature set of screens, styles and Playwright tests.
- Task capture, task selection, weekly planning draft/review/accept, Today, completion/recovery, editable cycle-based work-type preferences, planning templates, local JSON backup/recovery and CSV export.
- No connected generative AI model, onchain payments or DeFindex integration.
- `localStorage` currently contains unencrypted plans and cycle context; this is a known privacy gap, not an implemented privacy guarantee.
- Existing backup/export files can contain plaintext sensitive information. Handle opt-in migration/exports thoughtfully.
- Original product's `CONTINUATION.md` documents biological limitations and emphasizes test coverage and source integrity.

Read `package.json`, `README.md`, `CONTINUATION.md`, the existing app router/state architecture, domain tests and Playwright suites before changing code. Preserve working original features, accessibility, responsive UI, original design language and user data migration compatibility.

Source provenance in `docs/HACKMERIDIAN_PROVENANCE.md`.

## 3. Desired end-to-end experience
1. Existing user opens Plan4Her and receives or edits a weekly plan around her declared preferences and constraints.
2. She creates **her personal habit goal** (e.g. study English four days/week); sets a measurable metric and a 30- or 90-day time horizon.
3. She joins a **community challenge** with other members pursuing their respective personal goals. No wallet or deposit is required for belonging.
4. She can invite an **accountability partner**, with opt-in progress fields and explicit permission boundaries. No access to cycle, symptoms, journal, monetary balances or task text by default.
5. An **optional** financial action allows a small Testnet contribution, subject to clear warning about investment risks and withdrawal/liquidity limits.
6. User connects a wallet compatible with Stellar Testnet, signs a real transaction to a vetted DeFindex vault, and sees confirmed underlying balance and vault shares from chain state.
7. She logs progress privately, sees cycle-aware planning suggestions, and voluntarily shares only a derived completion metric with partners/community.
8. At challenge end, the reward screen distinguishes contributed capital/share value, positive **realized** yield (if any), agreed eligible reward allocation, and projected APY. No financial amount is claimed to be earned without evidence.
9. User can request a vault withdrawal/redeem, subject to protocol conditions. No penalty because she missed goals.
10. Private synthetic data is encrypted locally, uploaded through Pinata to IPFS, retrieved via CID, and decrypted only by the authorized key.
11. Every live Testnet financial demonstration includes network, asset/vault contract identifier, wallet signature, confirmed transaction hash, explorer URL and final balance.

A beautiful UI without real backend or onchain verification is not a substitute for a working demo.

## 4. Critical financial architecture — decide before coding rewards
DeFindex manages **vaults, underlying assets, yield strategies and shares**. It does not natively know habits, partners or reward eligibility.

Consider and document one of:
**A. Individual noncustodial positions.** Each participant owns DeFindex vault shares through her wallet. This makes ownership/withdrawals intuitive; however, automatic redistribution of one user's yield is NOT accomplished merely by displaying a community pool.
**B. True community pool controller.** Custom Soroban contract holds/controls contributed positions with explicit, auditable claims, individual receipts, withdrawal accounting and separate allocation of positive realized yield. This adds complexity and custody/contract risk. Require Testnet verification, abuse prevention, safe rounding and thorough tests.
**C. Verified vault deposit/withdraw plus offchain reward simulation.** Show actual vault transactions; clearly label the pooled reward formula as a model, not as real onchain distribution.

Select architecture by security, actual DeFindex API compatibility and demonstrability, not marketing. Start with A or C if B cannot be safely verified; do not misrepresent them as B.

Design and test:
- deposited contribution vs. vault shares vs. current redeemable underlying assets vs. returns;
- time-weighted capital contribution if relevant;
- fees, rounding, slippage, liquidity, negative returns, early withdrawal, wallet/account mismatch;
- reward eligibility based on individualized goals, not universal productivity benchmarks;
- configurable 30/90-day rules, transparent consent and settlement conditions;
- principal rights and eligibility for yield rewards tracked separately;
- a missed habit NEVER confiscates contributed capital; there is still genuine DeFi loss risk.

**On Testnet, yield may not materialize during the demo.** Do not mint imaginary return or use projected APY as accrued funds. A hypothetical distribution calculator is acceptable only with visible “simulation” labeling.

## 5. Security architecture — legacy Cyra reuse
Cyra contains:
- `src/utils/encryption.ts`: AES-256-GCM via Web Crypto;
- `src/utils/ipfs.ts`: Pinata file upload/fetch and CID use;
- `src/utils/secureStorage.ts`: persistence/recovery composition;
- `src/utils/supabaseStorage.ts`: metadata persistence;
- `src/config/wagmi.ts`: Oasis network and mock contract read/write, NOT Stellar deployment.

**Known critical weaknesses:** `VITE_PINATA_JWT` is used in client code and leaks credentials in a compiled frontend when configured. Supabase metadata stores `aesKey` as Base64 JSON alongside CID; Base64 is not key encryption. Do not copy insecure code literally. Debug code can log private data. Audit all legacy snippets.

Recommended:
- browser-side AES-256-GCM using random 96-bit IV per encryption; authenticated decryption;
- human-usable user-controlled key wrapping and recovery plan (e.g. securely passphrase-derived key, suitable KDF) with clear lost-key policy; do not store unwrapped raw keys next to ciphertext CIDs;
- encrypted payload ONLY to IPFS/Pinata, no plaintext menstrual data in filenames, metadata, logs, telemetry or chain;
- server-only Pinata JWT; authenticated, rate-limited issuance of restrictive temporary upload authorization; reject unauthenticated public issuance;
- allow explicit opt-in selective sharing, revocation for future reads, and user-facing privacy center;
- no PII in public group profiles by default;
- plan for existing plaintext localStorage migration and existing user backup compatibility;
- automated tests for wrong-key decryption, tampering, content inspection, credential scanning and unauthorized partner access.

Pinata/IPFS is a decentralized content-addressed storage layer, NOT automatic confidentiality and NOT guaranteed deletion. Do not make unsupported “complete ownership / erasure” claims.

## 6. Confidential finance — OPTIONAL, independent workstream
The workshop from HackMeridian (*Stellar Confidential Tokens*, Boyan Barakov, Oct 25 2026) distinguishes confidential amounts/balances from anonymity and from encryption of personal data. The OpenZeppelin implementation is a separate token suite with special contracts, proof verification and an evolving SDK. It can conceal transfer amounts/balances while addresses remain public. Deposits into or withdrawals from public underlying tokens can reveal amounts; DeFindex vault interaction is not confidential by default.

Do NOT make Confidential Tokens a prerequisite for shipping the community vault flow. If feasible after financial and privacy baselines:
- deploy/use only genuine compatible Testnet contracts and verify a confidential transfer;
- document visible vs hidden fields and contracts, hashes and SDK limitations;
- never claim direct confidential DeFindex vault support without demonstrated integration.

OpenZeppelin code (verified `main` branch): https://github.com/OpenZeppelin/stellar-contracts/tree/main/packages/confidential
Docs: https://docs.openzeppelin.com/stellar-contracts/tokens/confidential/build-with-the-sdk
Workshop slides must be supplied to Claude separately if not present in this repo.

## 7. Official tools/resources
**Raven (Stellar MCP):** https://raven.stellar.org/mcp — official connection docs: https://raven.stellar.org/docs ; this is an MCP/OAuth endpoint, not a human webpage. Request authorization and verify actual tool connectivity in current Claude session. Use Raven for current technical docs, supported asset contract IDs, network requirements, Soroban signing, contract compatibility and transaction verification. Never invent Raven output if unavailable.

**DeFindex:** interactive console signup supplied by mentors https://console.defindex.io/register (automated public access not confirmed; fallback https://www.defindex.io/); SDK https://github.com/defindex-io/defindex-sdk ; docs https://docs.defindex.io/ ; machine-readable official docs index https://docs.defindex.io/llms.txt .
SDK documented operations include `getVaultInfo`, `getVaultBalance`, `depositToVault`, `withdrawFromVault`, `withdrawShares`, `getVaultAPY`, `sendTransaction`. This is a **server-side-oriented API client**; API keys must not appear in Vite frontend builds. Building a transaction returns XDR for user signature, NOT an executed operation. Verify API/schema currently live, asset decimal precision and actual supported Testnet strategies. Do not invent vault IDs or real yield.

**Pinata:** https://docs.pinata.cloud/ ; use authenticated, expiring upload flow without exposing JWT.
**Stellar:** https://developers.stellar.org/ ; Testnet explorer URLs need real verified results.
**HackMeridian:** actual build/submission instructions and deadline https://www.hackmeridian.com/build ; legal IP/submission terms only https://www.hackmeridian.com/terms.html#submissions .
**Original version visual reference:** https://plan4her-private-preview.sacred-cow-7485.chatgpt.site/#add-task — user-provided preview URL; public/incognito reachability NOT independently verified, and it may require access or have changed; do not modify/publish through original channel.

## 8. Execution and non-regression phases
**Phase 0 — inventory & guardrails:** confirm git remote is `Paolag93/plan4her-stellar`; new feature branch; read code and tests; run existing suite; document baseline and fixes needed. Inspect Cyra read-only. Document architecture choice, active blockers and actual service availability.
**Phase 1 — product logic:** types/domain and tests for challenges, private goals, membership, partners, permissions, check-ins and opt-in pool participation. Responsive screens matching existing design.
**Phase 2 — authentic Stellar integration:** wallet connect, server-side DeFindex API, suitable existing vault or controlled vault creation, real testnet deposit, share/balance reads and withdrawal; failures/confirmation/fees handled. Explorer evidence.
**Phase 3 — encrypted storage:** secure key approach; Pinata signed uploads from backend; ciphertext-only IPFS upload; fetch/decrypt roundtrip; opt-in selective data sharing. Test no leaks.
**Phase 4 — connect three pillars:** habit goals synchronized with current plan; community participation independent of cycle mode; confidential transfers only as separate optional experiment.
**Phase 5 — hardening and demo:** typecheck, domain and integration tests, E2E, Playwright, accessibility, responsive manual checks, credential scan, real Testnet proof, final deployment to distinct HTTPS URL, README and provenance/evidence.

Run the project's documented commands (in Claude's cloud environment, not on founder's local device):
`npm ci`; `npm run typecheck`; `npm run test:domain`; `npm run build`; `npx playwright install chromium`; `npm run test:e2e`.
New tests must cover each material financial/security invariant. Tests are evidence only if they genuinely executed, not skipped. No branch merges or external deploy without founder's permission.

## 9. Founder handoffs and demo
The founder is NOT a developer and does not have local terminal. Claude Code Web should do all code/tests in its cloud environment; founder handles browser approvals, wallet signing in a wallet app, API account and secrets through secure hosting settings, and final public release review. Never ask for seed phrases, private keys, or API keys pasted in chat.

Create `docs/HACKMERIDIAN_EVIDENCE.md` with:
- initial original snapshot SHA, independent new repo commit and before/after feature matrix;
- test commands with actual results and timestamp;
- built functionality status (“confirmed on Stellar Testnet”, “code-only untested”, “demo simulation”, “not implemented”);
- actual vault token IDs, strategy, network and onchain transaction hashes/explorer links;
- IPFS example CID for synthetic encrypted data, with proof of decrypt roundtrip and no plaintext;
- data access and secret-handling limitations;
- separate deployment URL and demo video link when available;
- remaining gaps before production and product compliance notes.

**Final acceptance:** app can still plan tasks as before; user can join a challenge with no deposit, set distinct goals, share only consensual progress, operate a verified DeFindex Testnet deposit and withdrawal, save/recover encrypted test data, and access the demo without a GitHub or ChatGPT login. Everything unfinished is documented rather than disguised.

**Important:** This brief authorizes work only in the separate project repository. DO NOT CHANGE THE ORIGINAL REPOSITORY OR THE EXISTING CHATGPT SITES DEPLOYMENT.

## Link quality gate
Read `docs/RESOURCE_LINK_AUDIT.md`. Links labeled interactive/auth-dependent or not publicly verified are NOT proven reachable by an automated browser. Use primary verified docs and test all user-facing demo links in an unauthenticated browser before submission.
