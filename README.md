# Plan4Her

**Women aren't linear. Their productivity tools shouldn't be.**

**Your goals. Your rhythm. Our community.**

Plan4Her is a privacy-first, cycle-aware productivity planner for women. It combines editable weekly planning, personal goals and optional cycle context with four-week community commitments and voluntary, non-custodial savings on Stellar Testnet.

**Status:** Functional web MVP and HackMeridian 2026 **Scale** prototype. This is **not** a production financial product. The planner is currently deterministic; task-type inference uses local rules, not a connected AI model.

**[Open the live demo](https://plan4her-stellar.onrender.com)** · **[Source provenance](docs/HACKMERIDIAN_PROVENANCE.md)** · **[Technical architecture](docs/HACKMERIDIAN_ARCHITECTURE.md)** · **[Verification evidence](docs/HACKMERIDIAN_EVIDENCE.md)**

## Explore the product

No account is needed to test the planning and Rhythm Pool flows. In a fresh browser:

1. Select **Build my first week**, then **Continue without cycle context**.
2. Choose **A full week, ready to plan**, continue through availability, skip fixed commitments if desired, and **Accept week**.
3. Open **Plan → Explore your week**. Compare cycle days **1** and **12**. The preview identifies any genuinely moved tasks and their previous and proposed dates.
4. **Review changes**, then choose **Apply changes** or **Keep plan as is**. **Undo** restores both the accepted plan and the preceding cycle context.
5. Open **More → Rhythm Pool** to explore four-week commitments and optional **Savings & rewards · Testnet**.

The starter pack contains 11 realistic work, movement, personal and administrative tasks. Task categories are inferred locally from task titles; ambiguous tasks remain neutral and users can correct categories in task details. Fixed appointments and deadlines take precedence over phase preferences. Movement depends on remaining availability; changing cycle day does not guarantee that every task will move. The preview never changes saved data without approval.

The free Render deployment may need time to wake after inactivity.

## Product capabilities and status

| Area | Implemented | Qualification |
| --- | --- | --- |
| Weekly planning | Task capture, flexible tasks with deadlines, fixed appointments with exact date/time, availability, draft/review/accept, Today and recovery | Local-first MVP; phase preferences are editable, not universal biological predictions |
| Cycle-aware preview | Proposed schedule for another cycle day, moved-task comparison, explicit Apply / Keep / Undo | Uses the actual deterministic scheduling engine; no connected AI service |
| Automatic activity classification | Local task-title rules with neutral fallback and optional user correction | Heuristic classification, **not** an LLM |
| Rhythm Pool | Join after terms acceptance, select 3–5 weekly commitments over four weeks, self-report completion, replace one unfinished commitment per week, inspect progress | Individual participation and history are saved on this device; example community members/averages are **simulated** |
| Stellar savings | Freighter wallet signing; on-chain DeFindex Testnet XLM vault deposit, withdrawal and position reading | Voluntary, non-custodial, **Testnet only**; no verified positive yield; funds can lose value |
| Community rewards | Illustrative eligibility and potential reward-pool calculations | **Simulation only**: no on-chain payout, no confirmed sponsor and no yield-sharing distribution contract |
| Privacy / IPFS | Local AES-256-GCM encryption; a passphrase-protected data key; encrypted file backup/restore; optional encrypted Pinata/IPFS upload and CID retrieval | IPFS ciphertext is publicly accessible by CID and cannot be guaranteed erased; no cloud account sync |

### Verified Stellar Testnet transactions

- [10 XLM deposit through the founder's Freighter wallet](https://stellar.expert/explorer/testnet/tx/a5f2129e0fa6a8fd3796d389c09436c29885e0c0fbe3cbd8decc01144ef65578)
- [4.99984 XLM withdrawal through the founder's Freighter wallet](https://stellar.expert/explorer/testnet/tx/0d514e9702d5f650393bdb916059683655adf89e52ee2b3becb52f7bcbc094f6)
- [Encrypted synthetic-data backup on IPFS](https://gateway.pinata.cloud/ipfs/bafkreidxzbfnpgurblu2wozi6jhqlcch3v7aec5ifeym2loalxyoz7qlqe), uploaded, retrieved and decrypted in the application. Full live restoration was not executed; automated round-trip tests cover restoration.

Stellar wallet and vault transactions are **public**. Plan4Her does not write tasks, cycle history or health context to the blockchain. Testnet tokens have no real-money value. No guaranteed yield, principal protection, insurance or completed reward distribution is implied.

## What existed before vs. what was added at HackMeridian

**Before HackMeridian — Plan4Her:** A separate, functioning React/TypeScript web MVP with tasks, weekly scheduling, optional cycle context, daily planning, local persistence and UX/UI design. The source baseline was copied from [the original Plan4Her repository](https://github.com/Paolag93/plan4HER-) at commit [`9ec0c99`](https://github.com/Paolag93/plan4HER-/commit/9ec0c99ea8ff839c44dfb2a8bb4f9e1cdf55fbf5). Early discovery included **13 user interviews** and **13 waitlist questionnaire responses**; the samples may overlap and do not represent active users or paying customers.

**Earlier, separate work — CYRA:** Prior ETHGlobal-winning project [CYRA](https://github.com/OlaOlaPaola/Cyra) explored AES-256-GCM encryption and IPFS/Pinata. It informed this project's privacy approach, but its client-side credentials and key handling were **not** copied unchanged.

**Built and integrated during HackMeridian 2026:** Rhythm Pool; live **Stellar Testnet** wallet/vault deposits and withdrawals through Freighter and DeFindex; a rebuilt encrypted IPFS backup implementation with server-held Pinata credentials and passphrase-protected key wrapping; a clearer cycle-aware plan preview and approval experience; local task-category inference; and additional regression testing.

See [the source-provenance record](docs/HACKMERIDIAN_PROVENANCE.md) and [implementation evidence](docs/HACKMERIDIAN_EVIDENCE.md) for reproducible detail.

## Development

Node.js 22.18+ and npm are required.

```bash
npm ci
npm run dev
```

```bash
npm run typecheck
npm run test:domain
npm run test:server
npm run build
npx playwright install chromium
npm run test:e2e
```

The frontend uses React, TypeScript and Vite. The optional server provides the authenticated, rate-limited encrypted-backup API and holds the Pinata JWT outside the browser. The DeFindex integration uses the Stellar Testnet and Freighter; users sign transactions in their own wallet. For server configuration see [deployment documentation](docs/DEPLOYMENT.md) and [`.env.example`](.env.example). Never commit environment secrets or private keys.

## Privacy and release limitations

Tasks, schedules, cycle context and local Rhythm Pool participation are saved in **browser localStorage without at-rest encryption**. A backup is encrypted **before** file export or IPFS upload. Losing the backup passphrase makes encrypted data unrecoverable. Deleting local browser data can erase locally saved plans; IPFS copies cannot be reliably removed.

The prototype does **not** include production accounts, cross-device sync, a connected AI model, verified community membership, real reward redistribution, premium billing, mainnet launch or production financial compliance/audits. The 70% challenge threshold is a product rule demonstrated locally, not a guarantee of any earnings.

**Documentation:** [Architecture](docs/HACKMERIDIAN_ARCHITECTURE.md) · [Evidence](docs/HACKMERIDIAN_EVIDENCE.md) · [Provenance](docs/HACKMERIDIAN_PROVENANCE.md) · [Deployment](docs/DEPLOYMENT.md) · [UX quality checks](docs/UX_VISUAL_QA.md)
