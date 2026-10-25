# Plan4HER

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

Tasks, cycle details and plans are stored in this browser's localStorage, without encryption at rest. They are not saved to GitHub. Switching browser, device, profile or site origin does not transfer them; deleting site data can erase them. Do not treat localStorage as secure encrypted storage or a backup.

The current build has no account/cloud sync, connected AI provider, external calendar sync or native iOS/Android release. UI preferences do not establish those integrations. Deployment hosts may log normal web requests under their own policies.

Do not commit real user exports, source specifications containing private material, credentials, `.env` files, installed dependencies or generated build/test caches. Create portable source archives from reviewed tracked files, excluding `.git`, `node_modules`, `dist` and test output. Preserve the lockfile and source assets.
