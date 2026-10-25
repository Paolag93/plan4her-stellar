# Plan4HER

> **HackMeridian 2026 · Scale track.** *Your goals. Your rhythm. Our community.* Plan4Her is a privacy-first planner for women: cycle-aware weekly planning (existing), plus — new this hackathon — free 30/90-day community habit challenges with personal goals, accountability partners with field-level consent, optional non-custodial savings in a DeFindex vault on **Stellar Testnet**, and client-side encrypted backups to IPFS.

## HackMeridian: what is new, and what is real

| Capability | Status | Where |
| --- | --- | --- |
| Cycle-aware weekly planner, tasks, Today, recovery, local backup | **Pre-existing** (before HackMeridian, original commit `9ec0c99`) | Today · Plan · Tasks |
| 30/90-day challenges, personal goals, check-ins, Today goal card | **Implemented & tested** (local to this device) | More → Community challenges |
| Goal sessions → tasks placed by the existing cycle-aware planner | **Implemented & tested** | Progress → "Add this week's sessions to Tasks" |
| Accountability partners, allow-listed sharing, revocation | **Implemented & tested; partner accounts simulated** (no multi-user backend yet) | More → Accountability partners |
| Other challenge members / group average | **Simulated sample data**, labelled in the UI | Community |
| DeFindex XLM vault deposit / withdraw / on-chain balance via Freighter | **Implemented; live Testnet transaction pending founder wallet signature** (this build environment could not reach Stellar Testnet) | More → Savings & rewards · Testnet |
| Community reward pot (yield-only, principal never touched) | **Simulation**, labelled; nothing is paid | Savings → How rewards would work |
| AES-256-GCM encrypted backup, passphrase-wrapped key, download/restore | **Implemented & tested** (works offline) | More → Encrypted backup |
| Encrypted upload/retrieve via Pinata/IPFS, server-held JWT, rate limits | **Implemented & tested against a fake Pinata; live upload pending Pinata key + deployment** | Encrypted backup |
| OpenZeppelin Confidential Tokens | **Not implemented** (no client SDK; not compatible with DeFindex vault privacy) | — |

Details: [`docs/HACKMERIDIAN_ARCHITECTURE.md`](docs/HACKMERIDIAN_ARCHITECTURE.md) · evidence ledger: [`docs/HACKMERIDIAN_EVIDENCE.md`](docs/HACKMERIDIAN_EVIDENCE.md) · deployment: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) · demo script: [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) · UX QA: [`docs/UX_VISUAL_QA.md`](docs/UX_VISUAL_QA.md).

**Money safety:** Testnet only, no real funds. Deposits are held as the user's own vault shares in her own wallet; missing a goal never confiscates, locks or penalizes them. Deposits are **not guaranteed** (smart-contract, strategy, liquidity, asset and depeg risk). Estimated APY is not shown because it could not be verified. Rewards are a simulation.

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

Tasks, cycle details, plans and community goals are stored in this browser's localStorage, without encryption at rest. Optional encrypted backups are encrypted on the device with the user's passphrase before download or IPFS upload; IPFS ciphertext is public by CID and cannot be guaranteed deleted. They are not saved to GitHub. Switching browser, device, profile or site origin does not transfer them; deleting site data can erase them. Do not treat localStorage as secure encrypted storage or a backup.

The current build has no account/cloud sync (only user-initiated encrypted backups), connected AI provider, external calendar sync or native iOS/Android release. UI preferences do not establish those integrations. Deployment hosts may log normal web requests under their own policies.

Do not commit real user exports, source specifications containing private material, credentials, `.env` files, installed dependencies or generated build/test caches. Create portable source archives from reviewed tracked files, excluding `.git`, `node_modules`, `dist` and test output. Preserve the lockfile and source assets.
