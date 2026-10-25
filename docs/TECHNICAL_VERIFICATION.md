# Plan4Her — Technical fact check and implementation risk gate
Audit: October 25, 2026. This document distinguishes **verified source facts**, **design intent**, and **unverified runtime assumptions**. It does not claim the new feature code has been written, integration tested or deployed.

## 1. Confirmed: Project baseline and protected original
- The **only writable** repository is https://github.com/Paolag93/plan4her-stellar .
- The source original https://github.com/Paolag93/plan4HER- is private and **READ ONLY**. Both were compared at the initial template copy: 297 tracked file paths and blob SHA contents matched exactly. Original source commit: `9ec0c99ea8ff839c44dfb2a8bb4f9e1cdf55fbf5`.
- The original MVP is React 19, TypeScript, Vite 6, `localStorage` and a local deterministic cycle-aware planner; it is **NOT** a connected AI agent, encrypted backup product, hosted multiplayer service or blockchain application. Read its `README.md` and `CONTINUATION.md`.
- Code verifies existing 4 tabs `Today, Plan, Tasks, More` in `src/components/BottomNav.tsx`. `src/app/App.tsx` implements screen navigation; `src/styles/tokens.css` contains the real palette, spacing, typography. Existing components include `AppHeader`, `Button`, `ConsentCard`, `TaskCard`; Playwright screenshot fixtures exist.
- The Figma Design Master and FigJam journey were actually readable through connected Figma tools (metadata and board nodes). Their core structure is confirmed, but exact visual screenshot/context retrieval was blocked without a current selected layer; detailed pixel parity has **NOT** been verified. Use `docs/UX_UI_CONTINUITY.md` as the design handoff. Do NOT modify either original repo or Figma master.

## 2. Confirmed: Dates, track and judging
- HackMeridian official: https://www.hackmeridian.com/build and https://www.hackmeridian.com/schedule .
- Hackathon: **25–26 October 2026, Lisbon local time; submissions close Monday 26 October at 12:00, no late submissions**. Scale is the correct path for a preexisting working prototype; Genesis-only Unlocked/Composed tracks are **not mandatory for Scale**.
- Official site says AI-assisted development allowed. Judging is async using **demo video, pitch deck, GitHub repo and submission answers**. A clear README is critical. The event submission portal/login step and required individual fields must be independently inspected by owner/Claude authenticated browser; we have **not** submitted a project and should not claim otherwise.
- Scale criteria include milestone completion, SCF eligibility, production readiness and ecosystem impact. Existing work vs new hackathon work must be explicitly distinguished.

## 3. Confirmed: DeFindex
- Official developer documentation: https://docs.defindex.io/ and index https://docs.defindex.io/llms.txt .
- Official TypeScript SDK: https://github.com/defindex-io/defindex-sdk .
- SDK README/methods show `getVaultInfo`, `getVaultBalance`, `depositToVault`, `withdrawFromVault`, `withdrawShares`, `getVaultAPY`, `sendTransaction`. Server-side credentials are the default secure approach.
- **Important:** API transaction-building produces **unsigned XDR / operation data**. A wallet must sign, submit and wait for a confirmed ledger result. XDR preparation ≠ onchain success. Do not invent vault contract IDs, compatible assets/strategies or transaction hashes.
- Official docs index lists Testnet sandbox, creating a vault with Console, fees, deposits, withdrawals and balances. But we have **NOT** verified the founder's API key, her DeFindex console session, an available matching USDC Testnet vault/strategy, actual Testnet yield or API uptime at the moment of coding.
- A vault tracks **deposited assets and vault shares**. It is NOT a goal-tracking, community-reward or equal-yield distribution engine. Distinguish: (A) community UX + independently owned vault positions; (B) genuine community pooled contract/controller; (C) reward distribution simulation labeled as such. Do not call A or C an implemented onchain shared reward pool.
- Deposited capital is NOT guaranteed. No habit-based slashing, penalties or forfeiture; separately document liquidity, credit, depeg, smart-contract and negative-return risk. APY projections ≠ realized yield.

## 4. Confirmed: Cyra and Pinata privacy
- Cyra reference repo: https://github.com/OlaOlaPaola/Cyra (READ ONLY).
- Its `src/utils/encryption.ts` uses AES-GCM; `src/utils/ipfs.ts` uploads ciphertext to Pinata; `src/utils/supabaseStorage.ts` stores metadata. This legacy implementation is NOT an audited or safe data-vault product.
- **Critical legacy flaw 1:** `VITE_PINATA_JWT` may embed secret upload credential in public JavaScript bundle.
- **Critical legacy flaw 2:** `supabaseStorage.ts` saves the raw AES key as Base64 JSON alongside CID; Base64 is not encryption. Exposure of the metadata permits decryption.
- Current primary Plan4Her app stores plans/cycle data in unencrypted `localStorage` and creates plaintext local exports. The new privacy interface must explain these states accurately and support safe migration.
- Pinata docs https://docs.pinata.cloud/quickstart explicitly warn JWT is secret and client upload should use temporary signed upload credentials. Browser encryption must happen **before** upload; server secret must be restricted, authenticated and rate-limited.
- IPFS content/address access can be public even when content is ciphertext; encryption does not guarantee removal/deletion of previously pinned/replicated data. Consent revocation prevents future authorized access, not retroactive removal from third-party copies. Ensure no menstrual content in public files, metadata, logs, wallet memo or analytics.

## 5. Confirmed: Confidential Tokens — important correction
- The live **official** OpenZeppelin page https://docs.openzeppelin.com/stellar-contracts/tokens/confidential/confidential explains confidential token contracts and their privacy model.
- The live wallet guide https://docs.openzeppelin.com/stellar-contracts/tokens/confidential/wallet-integration explicitly states **“The library does not ship an SDK”**; it ships on-chain contracts and Noir circuits. The SDK is described as a client behavior/specification, not a ready-to-install library. An older deep link `/build-with-the-sdk` failed direct verification and is not a safe implementation prerequisite.
- Confidential Tokens conceal some private **amounts/balances** but do **not** anonymize sender/receiver addresses, timing or public deposit/withdraw amounts. They do **NOT** encrypt cycle or health data or make DeFindex vault operations confidential by default.
- A working privacy-preserving financial payment requires compatible real wallet/client, prover, indexer and contracts. Before claiming anything, prove an actual Testnet transaction and document observable fields. Because the SDK delivery is unverified, this is a **separate optional experiment**, not core dependency. The workshop slides are a reference, not proof of a shipped integration.

## 6. Confirmed: Stellar Raven
- Official Raven docs https://raven.stellar.org/docs ; MCP URL https://raven.stellar.org/mcp .
- Raven is a documentation/ecosystem-research MCP server requiring HTTP/OAuth authorization; it is not a signing agent, full node, wallet or transaction settlement network. Its tool access within **Claude Code Web/cloud** must be checked in that session. If unavailable, consult Stellar's official docs https://developers.stellar.org/ .
- Do not imply that an MCP endpoint failing to render in a normal browser means it is broken; don't claim Raven has been connected without successful tool call.

## 7. Confirmed: Claude web and Figma
- Claude cloud sessions documentation: https://code.claude.com/docs/en/claude-code-on-the-web . GitHub repo and permissions must be selected/approved by founder; no local terminal needed. A connected GitHub repo and account access are prerequisites.
- Figma Design Master: https://www.figma.com/design/zctnzXqin1jZJLvxBlVxZz/Plan4Her ; journey: https://www.figma.com/board/PywhrB51wdojiYi4JfvhRK/Plan4Her-journey-blueprint . We inspected real Figma document structure and FigJam data; full UI pixel fidelity is not assured without screenshot access. Never alter Figma master without explicit consent; implement new components using existing code design tokens as the reliable fallback.
- Existing preview: https://plan4her-private-preview.sacred-cow-7485.chatgpt.site/#add-task is user-supplied, **NOT independently verified as a publicly accessible demo**. Use a distinct deployment for HackMeridian.

## 8. Outstanding steps requiring *real* user permissions or external evidence
- Claude GitHub access to the **new repo only**, any Figma connector authorization, Raven login.
- DeFindex API credential and actual Testnet USDC-compatible vault selection; wallet connection and signed transaction.
- Pinata account/access and securely hosted upload endpoint (current MVP has no backend; do not put JWT in browser).
- Client/server sync/partner authentication and true cross-user data sharing; a local seeded account demo must be labeled such.
- Actual wallet-based deposit and withdrawal on Testnet and confirmation hash.
- Actual IPFS CID, encrypted roundtrip, wrong-key/tamper tests.
- Build + typecheck + automated tests + visual regression; all not yet run in the new repo.
- Separate HTTPS deployment and unauthenticated viewing; hackathon form submission and video/pitch verification.

## 9. Implementation prioritization
1. Protect original, baseline tests and UI; create new branch inside separate repo.
2. Implement real goal/community/partner user experience **on existing UI**, including synthetic data and honest sync status.
3. Integrate demonstrable DeFindex Testnet deposit/balance/withdraw; record evidence.
4. Encrypt local data and get real Pinata roundtrip with server-only credentials.
5. Connect goals to cycle-aware planner; check UX states, consent and privacy.
6. Review reward-accounting architecture; implement actual distribution ONLY if technical/legal/security conditions are met; otherwise clearly marked simulation.
7. Optional OpenZeppelin experiment separately, never as assumed DeFindex vault privacy.
8. Re-run all tests and submit evidence in a clear README before cutoff.

**Rule: No new feature may be marked “working”, “secure”, “confidential”, “onchain”, “audited”, “permissioned” or “production-ready” unless tests/evidence actually support that claim.**
