# CLAUDE.md — Plan4Her Stellar / HackMeridian 2026

> **Repository scope — non-negotiable:** THIS repository `Paolag93/plan4her-stellar` is the **only writable project** for this effort. The original `Paolag93/plan4HER-` is READ-ONLY. Never push, commit, open PRs, create branches/issues, alter settings or deploy from the original. Do not change the existing original ChatGPT Sites preview. If the working checkout/remote is not exactly this new repository, stop writes and correct it.

## Objective
Deliver an integrated **Plan4Her** HackMeridian 2026 Scale prototype, not a new app or generic landing page. Preserve existing responsive React/Vite/PWA design, navigation, tasks, cycle-aware weekly planning and tests. Add three connected capabilities:

1. **Privacy and Data Ownership**: encrypt personal/cycle/behavior data before IPFS/Pinata storage; allow selective, consent-based sharing of non-sensitive progress; do not expose menstrual details to community members or wallets.
2. **Community Habit & Yield Pools**: independent personal goals inside optional 30-/90-day group challenges; accountability partners and progress tracking; optional small contributions by participants themselves (NO SPONSORS), using Stellar Testnet and DeFindex yield vaults. No punitive deposit forfeiture or slashing for unmet goals. Potential rewards are drawn only from genuinely available positive **net realized yield**, under disclosed, agreed rules. Deposited principal is never confiscated for missing a habit, but invested principal is **NOT guaranteed** against protocol, liquidity, asset, credit, smart-contract or depeg losses.
3. **Cycle-Aware Planning**: reuse the already implemented deterministic planner and editable personal preferences; connect challenge goals to planning and check-ins. Avoid universal biological performance claims or false claims of a connected AI provider.

**Product framing:** “Your goals. Your rhythm. Our community.” Personal progress with shared encouragement, privacy by design, and optional financial motivation.

## Source provenance
- Original repo (READ ONLY): https://github.com/Paolag93/plan4HER-
- Source snapshot when copied: `9ec0c99ea8ff839c44dfb2a8bb4f9e1cdf55fbf5` on `main`.
- Current working copy: https://github.com/Paolag93/plan4her-stellar
- Legacy reference repo (READ ONLY): https://github.com/OlaOlaPaola/Cyra
- Prior demo (visual reference ONLY, don't overwrite): https://plan4her-private-preview.sacred-cow-7485.chatgpt.site/#add-task

The current app uses React 19, TypeScript, Vite 6, localStorage, task/plan flows, optional cycle preferences, local JSON backup and CSV export; NO production wallet/DeFi, encrypted storage, multi-user auth, cloud sync or AI provider. Read `README.md`, `CONTINUATION.md`, `package.json`, existing tests and `docs/HACKMERIDIAN_MASTER_BRIEF.md` before coding. Existing features must not be misrepresented as new HackMeridian work.

## Technical documentation and Raven
- Stellar Raven MCP endpoint: https://raven.stellar.org/mcp (streamable-HTTP/OAuth; this is an MCP endpoint, not a normal public webpage). Setup and usage docs: https://raven.stellar.org/docs . Verify enabled and authorized inside the actual Claude Code session; use official Stellar documentation if MCP tools are unavailable.
- DeFindex signup console (exact link published by DeFindex; interactive login page not independently readable by public scraper): https://console.defindex.io/register ; fallback official portal: https://www.defindex.io/
- DeFindex TypeScript SDK: https://github.com/defindex-io/defindex-sdk
- DeFindex developer docs: https://docs.defindex.io/ ; exact searchable docs index: https://docs.defindex.io/llms.txt
- Pinata: https://docs.pinata.cloud/
- Stellar: https://developers.stellar.org/
- OpenZeppelin Confidential Tokens: https://github.com/OpenZeppelin/stellar-contracts/tree/main/packages/confidential
- Workshop: `Confidential Token Workshop, Meridian 2026, Lisbon.pptx` (founder may need to attach it to Claude).
- Event build/submission, deadlines, Scale and judging (primary): https://www.hackmeridian.com/build ; legal submission/IP terms only: https://www.hackmeridian.com/terms.html#submissions

Do NOT assume a DeFindex vault is private just because Confidential Tokens exist. The workshop explicitly differentiates **confidentiality of amounts/balances** from **anonymity of participants** and from **encryption of menstrual data**. Treat Confidential Tokens as a separate verified Testnet experiment until actual compatibility with vault flows is proven.

## Security and architecture rules
- Use existing Plan4Her code as the base; inspect first; don't rewrite app.
- No real funds. Use only Stellar **Testnet** and synthetic personal data.
- DeFindex server-side SDK/API key: never expose in `VITE_*` frontend variables or commit secrets. A prepared unsigned XDR is not a confirmed transaction: require wallet signature, submission, confirmation, and explorer evidence.
- Cyra's `src/utils/encryption.ts`, `ipfs.ts`, `secureStorage.ts` are starting references, not production-ready: `VITE_PINATA_JWT` exposes upload credentials; its `supabaseStorage.ts` persists recoverable raw AES key as Base64 in database metadata. Rebuild key custody and upload authorization securely; never copy these weaknesses.
- A backend endpoint issuing signed Pinata uploads must authenticate/rate-limit users; public unprotected upload issuance is unacceptable. Sensitive plaintext never goes on IPFS, Stellar, to analytics or external AI.
- Clearly separate user-owned **vault shares / invested principal** from discretionary community **reward allocation**. DeFindex itself does not decide behavioral eligibility. Select and document a feasible controller/ledger architecture. If only individual noncustodial vault shares work, don't claim a true pooled onchain reward redistribution.
- Share only opt-in progress aggregates with accountability partners, never health/cycle data by default. Revocation prevents future access; it cannot undo previously downloaded copies.
- Token balance/return projections ≠ realized rewards. Simulations and mock partner accounts must be prominently labeled.
- Avoid changing original GitHub repo and deployment under all circumstances.
- Request founder participation only for GitHub/Claude authorizations, hosted credentials, wallet transactions, deployment, or financial/compliance approval; never request secrets pasted into chat.

## Working approach
1. Inventory and baseline tests; record source provenance and new repo HEAD.
2. Implement community goals, 30/90-day challenges, privacy permissions, partner UX as a working vertical slice.
3. Integrate a real **compatible** DeFindex Stellar Testnet vault: wallet → unsigned XDR → user signature → submit → confirmed deposit/shares → withdrawal. Record actual contract IDs/hashes and errors.
4. Safely integrate local encryption + Pinata/IPFS roundtrip with synthetic data; test key-loss/wrong-key behavior and ensure no client-side JWT.
5. Connect cycle-aware planning to goals/check-ins and report truthful explanations.
6. Optionally demonstrate confidential-token transfer separately **after** core integration; never block primary demo on its unverified vault compatibility.
7. Run `npm ci`, `npm run typecheck`, `npm run test:domain`, `npm run build`, `npm run test:e2e` (install browsers as needed). Add tests for new behavior, financial accounting/security and permission boundaries.
8. Publish a **separate** HTTPS demo only with founder approval. Prepare README, `docs/HACKMERIDIAN_EVIDENCE.md`, screenshots, short video script, and clear Scale before/after changes.

**Submission cutoff:** Monday Oct 26 2026 12:00 Lisbon local time (verify official portal). Reserve submission time; do not over-engineer before a verified, accessible demo is ready. Continue coding, testing and reporting instead of stopping after an abstract plan.

## Link audit
Review `docs/RESOURCE_LINK_AUDIT.md` for verified links, interactive/auth-dependent pages and precise primary sources. The DeFindex console signup and the existing private-preview site may not be testable from automated public checks; verify manually rather than treating those URLs as guaranteed working.
