# HackMeridian Scale — Source Provenance and Repository Isolation

This is **Paolag93/plan4her-stellar**, an independent private template copy prepared for HackMeridian 2026. The user explicitly requires the existing Plan4Her original to remain untouched.

## Source of pre-existing work
- Source repository **READ ONLY**: https://github.com/Paolag93/plan4HER-
- Source `main` commit at copying/verification: `9ec0c99ea8ff839c44dfb2a8bb4f9e1cdf55fbf5`
- Separate destination: https://github.com/Paolag93/plan4her-stellar
- Initial destination commit (before these handoff docs): `302bef0ef2d42f11df4fdfea91ce0db7c4fa47f6`
- GitHub connector verification on October 25, 2026: **297 tracked files in each repository; path lists and per-file blob SHAs matched exactly**, including resources and tests; neither has missing/different files at initial comparison.
- They are independent Git repositories, not the same branch. Editing the destination does not write to the source. Do not merge back into the original unless the owner explicitly requests that as a separate future action.

## Existing features (before HackMeridian)
- React/TypeScript/Vite PWA and design assets, onboarding, tasks, weekly plans and daily experience.
- Deterministic cycle-aware editable preferences/templates; no connected AI model.
- LocalStorage persistence, backup/import and CSV export; not yet encrypted.
- Existing Playwright / TypeScript / domain tests.

## Legacy inspiration
- https://github.com/OlaOlaPaola/Cyra — earlier hackathon work; includes AES-GCM and IPFS/Pinata code, but contains known security flaws. Do not reuse unchanged; do not represent unverified mocked blockchain interactions as deployed.

## Implemented in separate HackMeridian repo after copying
- Claude working instructions and architecture brief (documentation only at time of creation).
- All other HackMeridian functionality must be recorded in subsequent commits, PRs and the evidence report, alongside genuine Testnet transactions and actual test results.

## Review and publication restrictions
The destination should remain private until credential scanning and owner approval. Do not modify the original repository, its existing preview website or any production domain. Do not upload health data, secrets or private keys to GitHub.
