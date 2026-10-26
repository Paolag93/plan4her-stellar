# Plan4HER

> **HackMeridian 2026 · Scale track.** *Your goals. Your rhythm. Our community.* Plan4Her is a privacy-first, cycle-aware planner for women (freemium; Premium planned at USD 6.99/month, no billing implemented). The hackathon showcases the Premium **Rhythm Pool**: one shared community where each member runs her own four-week challenge built from 3–5 weekly commitments taken from her existing plan, with optional non-custodial savings in a DeFindex vault on **Stellar Testnet** and client-side encrypted backups to IPFS.

**Journey:** More (or Today) → Rhythm Pool → Join Rhythm Pool → accept terms → Set weekly commitments → (optional) Connect wallet & deposit → Participate → Track consistency → Four-week result.

## HackMeridian: what is implemented, simulated and planned

| Capability | Status |
| --- | --- |
| Cycle-aware weekly planner, tasks, Today, recovery, local JSON backup | **Pre-existing** (original commit `9ec0c99`) |
| "Explore your week": preview a different cycle day → review moved tasks (old → new day) → Apply or keep; Undo restores plan + cycle | **Implemented & tested** (hackathon period) |
| Automatic activity type from the task title (strength → energizing movement, yoga → rest, client presentation → communication, expenses → admin; unclear → neutral) | **Implemented & tested** as **local keyword rules**, not an AI model; nothing leaves the device; optional correction in Edit task |
| Rhythm Pool: join any day, four-week (28-day) challenge starting next Monday | **Implemented & tested** (on this device) |
| 3–5 weekly commitments chosen from the existing schedule; fixed weekly denominator; free rescheduling; one replacement per week with audit history; done/missed/undo; completing the task in Tasks marks it done | **Implemented & tested** |
| Aggregate four-week ratio, 70% eligibility threshold (unset elapsed weeks count as 3 not done) | **Implemented & tested** |
| Completion verification | **Self-reported** — not proof of real-world activity |
| Community members and average | **Simulated sample data**, labelled; your % joins only with consent; works with one member |
| DeFindex XLM vault deposit / withdraw / on-chain position via Freighter (individually owned positions) | **Confirmed on Stellar Testnet with the founder's Freighter wallet in the live app**: deposit 10 XLM [`a5f2129e…`](https://stellar.expert/explorer/testnet/tx/a5f2129e0fa6a8fd3796d389c09436c29885e0c0fbe3cbd8decc01144ef65578), withdraw 4.99984 XLM [`0d514e97…`](https://stellar.expert/explorer/testnet/tx/0d514e9702d5f650393bdb916059683655adf89e52ee2b3becb52f7bcbc094f6). Separate automated synthetic-key check: [`f82db619…`](https://stellar.expert/explorer/testnet/tx/f82db6197d0dcf63dde25a9ec4ed178288bbd2e7af1f64a22d8c02485d8aff09), [`43cb8311…`](https://stellar.expert/explorer/testnet/tx/43cb831154278282c0043dd042231519e5e64a5a03239779eb4dcc470a3b31b5). No positive yield verified |
| Rewards from voluntarily pledged positive realized yield or confirmed sponsor funds | **Simulation only** (no distribution contract; no sponsor confirmed) |
| AES-256-GCM encrypted backup, passphrase-wrapped key, download/restore | **Implemented & tested** |
| Encrypted upload/retrieve via Pinata/IPFS (server-held JWT, access code, rate limits, ciphertext only) | **Live upload, retrieval by CID and decryption confirmed** on the deployed app: [`bafkreidxzbfnpgu…`](https://gateway.pinata.cloud/ipfs/bafkreidxzbfnpgurblu2wozi6jhqlcch3v7aec5ifeym2loalxyoz7qlqe) (public content is ciphertext only) |
| Accountability partners, thematic challenges | **Removed from the primary journey** (product decision) |
| Billing, yield-sharing contract, sponsor system, Confidential Tokens | **Planned / not implemented** |

**Live demo (Stellar Testnet, synthetic data):** https://plan4her-stellar.onrender.com

Details: [`docs/HACKMERIDIAN_ARCHITECTURE.md`](docs/HACKMERIDIAN_ARCHITECTURE.md) · evidence ledger: [`docs/HACKMERIDIAN_EVIDENCE.md`](docs/HACKMERIDIAN_EVIDENCE.md) · submission pack: [`docs/SUBMISSION.md`](docs/SUBMISSION.md) · deployment: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) · demo script: [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) · UX QA: [`docs/UX_VISUAL_QA.md`](docs/UX_VISUAL_QA.md).

**Money safety:** Testnet only, no real funds. Deposits are held as the user's own vault shares in her own wallet; missing commitments never confiscates, locks or penalizes them. The shared vault does not redistribute yield by habit completion. Stellar transactions and vault deposits are public, not confidential. Deposits are **not guaranteed** (smart-contract, strategy, liquidity, asset and depeg risk). Estimated APY is not shown because it could not be verified. Rewards are a simulation.

### Try the demo (fresh browser, no account, about 1 minute)
1. Open https://plan4her-stellar.onrender.com and tap **Build my first week**.
2. **Continue** → **Continue without cycle context** → choose **A full week, ready to plan** → **Continue** → **Continue** → **Skip for now** → **Accept week**.
3. **Plan** → **Explore your week**. Move the slider to cycle day **1**, then **12**: the list shows which tasks move and to which day.
4. **Review changes** → **Apply changes** (or **Keep plan as is**). **Undo** restores both the plan and the cycle day.

Data stays in the browser (no account, nothing shared). The planner only uses the remaining days of the current week. Early in the week, several tasks move. Later in the week, fewer days remain, so fewer tasks can move, and the preview says so. On a Sunday evening, the sample week may not fit at all.

**Prior work disclosure.**
- **Before HackMeridian:** the Plan4Her planning MVP (planner, tasks, Today, cycle context), its branding and its Figma designs.
- **Earlier CYRA experiments:** AES-GCM encryption and IPFS/Pinata storage. Only used as reference; key custody and upload authorization were rebuilt here.
- **New during HackMeridian:** the Stellar/DeFindex Testnet savings, the Rhythm Pool, server-authorized encrypted IPFS backups, Explore your week with explicit approval, and local activity-type inference.

### Try the Testnet savings flow
1. Install the [Freighter](https://www.freighter.app/) browser extension, create an account and switch the network to **Testnet**; fund it with Friendbot (Freighter offers this).
2. In Plan4Her: More → Savings & rewards · Testnet → accept the three risk notes → Connect Freighter → Review deposit → sign in Freighter.

### Server (optional, for IPFS upload)
`npm start` serves `dist/` and `/api/*` (Node 22.18+). Configure `PINATA_JWT`, `DEMO_ACCESS_CODE`, `SESSION_SECRET` in the host's environment — see `.env.example`. Without them, everything else works and IPFS upload says it is not enabled. Tests: `npm run test:server`.

A local-first weekly planning web app built with React 19, TypeScript and Vite 6. Package version: 0.1.0. It includes task capture and selection, weekly draft/accept flows, Today, completion/recovery and browser-local persistence. Scheduling is deterministic, with editable phase/work preferences and Balanced, High-output and Recovery placement templates; cycle context is estimated. See [CONTINUATION.md](CONTINUATION.md) for remaining product work and release qualifications.

## Run independently

Use Node.js 22 (the CI version) and npm. No ChatGPT subscription, Sites runtime, API key or paid service is needed to run or build the source. This repository includes the dependency lockfile, assets, configuration and tests. Initial dependency and browser downloads require internet access.

Clone the repository with an account that has access, then run:

```sh
npm ci
npm run dev
```

Use the local URL printed by Vite. Private-repository access and any hosting account are managed separately from ChatGPT access.

## Build and verify

```sh
npm run typecheck
npm run test:domain
npm run build
npx playwright install chromium
npm run test:e2e
```

On Linux, Playwright may also need system dependencies (`npx playwright install --with-deps chromium`). The end-to-end configuration starts a production build and preview server on port 4173; stop stale preview servers before testing a changed build. `npm run test:visual` runs `tests/visual.spec.ts` only; the full end-to-end command also includes other visual and accessibility tests.

To inspect the production build locally:

```sh
npm run build
npm run preview -- --host 127.0.0.1
```

Preview is a local verification server, not a production hosting service.

## Deploy a static build

Publish the contents of `dist/` to a static HTTPS host. The existing asset paths, manifest ID, start URL and scope assume the domain root (`/`). Deployment under a subdirectory requires adapting Vite base, asset paths and PWA manifest settings and retesting installation/offline behavior. No backend is required by the current implementation.

Use HTTPS outside localhost for service-worker/PWA behavior. The PWA is configured for automatic updates, but an already-open tab or installed app may keep an older version until the update activates. Reopen/reload after deployment and verify the served build. If investigating stale assets, use browser developer tools to inspect/unregister the service worker and clear its asset caches; do not clear all site data casually, because that also removes locally saved plans. This repository does not by itself provide a production hosting URL or native-store publication.

## Move your saved app data

In the app, open More → Privacy & data → Back up & move your data. Download a full JSON backup before changing browsers or hosting origins. On the new installation, choose that file, review the summary and confirm replacement. CSV downloads are readable task/plan summaries and cannot restore the app. Files are generated locally and are unencrypted; keep them private.

## Privacy and scope

Tasks, cycle details, plans and Rhythm Pool commitments are stored in this browser's localStorage, without encryption at rest. Optional encrypted backups are encrypted on the device with the user's passphrase before download or IPFS upload; IPFS ciphertext is public by CID and cannot be guaranteed deleted. They are not saved to GitHub. Switching browser, device, profile or site origin does not transfer them; deleting site data can erase them. Do not treat localStorage as secure encrypted storage or a backup.

The current build has no account/cloud sync (only user-initiated encrypted backups), connected AI provider, external calendar sync or native iOS/Android release. UI preferences do not establish those integrations. Deployment hosts may log normal web requests under their own policies.

Do not commit real user exports, source specifications containing private material, credentials, `.env` files, installed dependencies or generated build/test caches. Create portable source archives from reviewed tracked files, excluding `.git`, `node_modules`, `dist` and test output. Preserve the lockfile and source assets.
