# HackMeridian 2026 — Scale submission pack

Deadline: **Monday 26 October 2026, 12:00 Lisbon** (official: https://www.hackmeridian.com/build). Judging is asynchronous: demo video, pitch deck, GitHub repo and submission answers. Verify the exact form fields in the portal; adapt the answers below.

## Links
- Live demo (no login, Stellar Testnet, synthetic data): https://plan4her-stellar.onrender.com — the first load can take ~50 s (free hosting wakes up)
- Code: https://github.com/Paolag93/plan4her-stellar (make it public only if the founder approves, or grant judges access)
- Evidence ledger: `docs/HACKMERIDIAN_EVIDENCE.md` · Architecture: `docs/HACKMERIDIAN_ARCHITECTURE.md` · Demo script: `docs/DEMO_SCRIPT.md`

## One-liner
Plan4Her is a privacy-first, cycle-aware productivity app for women, with a community Rhythm Pool and optional non-custodial Stellar savings. *Your goals. Your rhythm. Our community.*

## Draft answers (EN)
**Problem.** Productivity tools assume a fixed, linear rhythm and treat sensitive health context carelessly. Habit apps either isolate women or use punitive money mechanics.

**Solution.** Plan4Her plans each week around a woman's tasks, availability and optional, editable cycle preferences. Premium adds the **Rhythm Pool**: one shared community where each member runs her own four-week challenge. Each week she confirms 3–5 important commitments taken from her own plan, and the rest of her week stays flexible. She can optionally save on Stellar in a DeFindex vault position that remains hers. Missing commitments never confiscates her deposit.

**What existed before (Scale).** The React/Vite PWA: task capture, deterministic cycle-aware weekly planner, Today, recovery, local backup and 300+ automated tests (original commit `9ec0c99`).

**What we built during HackMeridian.**
- Rhythm Pool: join any day; four complete weeks from the next Monday; 3–5 weekly commitments with a fixed denominator; one replacement per week with an audit history; self-reported done/missed; 70% four-week threshold; works with a single member.
- Stellar Testnet + DeFindex: Freighter wallet, on-chain asset verification, simulated preview, user-signed deposit and withdrawal into the DeFindex XLM vault, shares and redeemable value read from chain, and average-cost accounting. **Confirmed on Testnet:**
  - deposit `f82db619…aff09`
  - withdraw `43cb8311…b31b5`
- Privacy: AES-256-GCM client-side encryption with a passphrase-wrapped key; encrypted backups to IPFS via Pinata, with the JWT held server-side only, access-code sessions, rate limits and a ciphertext-only server check. **Live CID:** `bafkreidxzbfnpgurblu2wozi6jhqlcch3v7aec5ifeym2loalxyoz7qlqe` (uploaded, retrieved, decrypted).
- Tests: 354 automated browser tests plus domain and server tests; WCAG scans; CI on GitHub Actions.

**How Stellar is used.** Soroban RPC on Testnet. The DeFindex vault contract `CCLV4H7W…FSF6` is called with `deposit`, `withdraw`, `balance` and `get_asset_amounts_per_shares`, and the native XLM SAC with `balance`. Freighter is used for non-custodial signing. No personal data, task names or cycle information ever goes on chain.

**Honest limitations.**
- Rewards (voluntarily pledged realized yield or confirmed sponsor funds) are a labelled simulation. There is no distribution contract and no sponsor is confirmed.
- Completion is self-reported.
- Other community members are simulated sample data.
- Testnet only; no positive yield has been verified.
- Access-code authentication is demo-grade.
- Billing (Premium USD 6.99/month) is not implemented.
- Confidential Tokens are not integrated.

**Next milestones.**
- Real accounts and multi-user sync for the community aggregate.
- An audited reward-distribution contract that uses realized yield only.
- Sponsor onboarding.
- Mainnet readiness review.
- Premium billing.

## Before you submit — checklist
- [ ] Open the live demo once (wake it up); test it in an incognito window.
- [ ] Record the video following `docs/DEMO_SCRIPT.md` (Freighter on Testnet, desktop Chrome).
- [ ] Decide repository visibility (public, or give judges access).
- [ ] Paste the links and answers into the portal; attach the deck.
- [ ] Submit before 12:00 Lisbon and keep the confirmation.
