# Deploying the HackMeridian demo (separate from the original preview)

**Do not** deploy to, or change, the original ChatGPT Sites preview or the original repository. This is a new, separate HTTPS site. Deployment requires the founder's approval.

## What runs where
- `npm run build` produces the PWA in `dist/`.
- `npm start` runs `server/index.ts` (Node 22.18+): serves `dist/` with security headers (CSP allows only this site plus Stellar Testnet RPC/Horizon/Friendbot) and the encrypted-backup API under `/api/*`.
- Wallet and vault calls go **from the user's browser** to the public Stellar Testnet RPC; the server never touches funds or keys.

## Option 1 — Render (recommended, free tier, includes IPFS upload)
1. Founder signs in at https://render.com with GitHub and grants access to `Paolag93/plan4her-stellar` only.
2. New → Blueprint → select this repository and branch. Render reads `render.yaml`.
3. In the service's **Environment** settings (never in chat or in the repo) enter:
   - `PINATA_JWT` — a Pinata API key JWT scoped to file uploads (https://app.pinata.cloud → API Keys).
   - `DEMO_ACCESS_CODE` — any code you will give to judges for testing IPFS upload.
   - `PINATA_GATEWAY` — optional dedicated gateway host.
   `SESSION_SECRET` is generated automatically.
4. Deploy, then open `https://<service>.onrender.com/api/status`. Expect `{"uploads":true,"sessions":true,...}`.
5. Test in a private/incognito window (no login), per the evidence checklist.

## Option 2 — static only (no IPFS upload)
Any static HTTPS host serving `dist/` at the domain root works. Community, partners, planning, Testnet savings and the **encrypted file download/restore** all work; IPFS upload shows "not enabled on this deployment".

## Environment variables
See `.env.example`. None of them may be prefixed `VITE_`. `VITE_API_BASE` (optional, not secret) points the frontend to an API on another origin.
