# Deployment and runtime configuration

## Architecture

`npm run build` produces the Vite frontend in `dist/`. `npm start` runs the Node server (`server/index.ts`, Node.js 22.18+) serving the static app plus the authenticated `/api/*` encrypted-backup endpoints.

Stellar Testnet operations run in the browser and require user authorization through Freighter. The server does not sign wallet transactions and does not receive private keys.

## Render hosting (Node server + IPFS upload)

The repository includes `render.yaml` to define the service. Configure sensitive environment variables in the hosting provider, **never in a frontend `VITE_` variable** or a Git commit.

- `PINATA_JWT` — restricted Pinata JWT, server-side only, for encrypted content upload.
- `DEMO_ACCESS_CODE` — access code used by the demonstration upload-session endpoint.
- `SESSION_SECRET` — server signing secret; see `render.yaml` / `.env.example`.
- `PINATA_GATEWAY` — optional host for Pinata file retrieval.

The `/api/status` endpoint reports feature availability without exposing secrets. Production use requires stronger identity verification and an independent security review; the access-code session is demonstration-grade.

## Static hosting

The `dist/` build can run on an HTTPS static host without the Node server. Local-first planning, Rhythm Pool, encrypted file export/import and Stellar Testnet interactions remain available; direct IPFS upload through the demonstration API is unavailable.

## Security notes

The app encrypts backup JSON on the client before submitting ciphertext to the server. The encrypted IPFS payload is publicly retrievable by CID; confidentiality depends on the passphrase, and deletion cannot be guaranteed. Sensitive cycle/task state is not encrypted at rest in browser localStorage. Stellar transactions are public.

See [`.env.example`](../.env.example) and [technical architecture](HACKMERIDIAN_ARCHITECTURE.md).
