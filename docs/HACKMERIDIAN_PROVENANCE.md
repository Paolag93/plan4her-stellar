# Plan4Her — Source Provenance

This repository is the HackMeridian 2026 Scale continuation of an existing Plan4Her MVP. The original and HackMeridian repositories have distinct histories.

## Existing Plan4Her MVP

- Original source: https://github.com/Paolag93/plan4HER-
- Snapshot commit: `9ec0c99ea8ff839c44dfb2a8bb4f9e1cdf55fbf5`
- Independent HackMeridian repository: https://github.com/Paolag93/plan4her-stellar
- Initial copied snapshot in this repository: `302bef0ef2d42f11df4fdfea91ce0db7c4fa47f6`
- At the initial October 25 copy, tracked paths and file blob SHAs were verified as matching across the 297 source files.

The pre-existing application included onboarding, task management, deterministic cycle-aware weekly planning, Today, local data persistence, JSON import/export, and automated tests. It did not include live Stellar vault savings or encrypted IPFS backups.

Initial product discovery before HackMeridian included 13 user interviews and 13 waitlist survey responses; participation may overlap. These are preliminary discovery inputs, not paid-user or adoption metrics.

## CYRA: separate earlier project

[CYRA](https://github.com/OlaOlaPaola/Cyra), a previous ETHGlobal-winning project, explored Web Crypto AES-256-GCM encryption and IPFS/Pinata storage.

The CYRA proof of concept was useful prior work but included security problems: Pinata credentials could be included in the frontend build, and a raw AES key was stored as Base64 alongside a content identifier. Base64 is not encryption. The current Plan4Her backup design was rebuilt with server-side credentials and password-based AES key wrapping rather than reusing those unsafe patterns.

## HackMeridian additions

- Rhythm Pool: four-week personal commitments, local progress and clearly simulated community aggregates.
- Stellar: real Freighter-signed DeFindex vault deposits and withdrawals on **Testnet**.
- Privacy: client-side encrypted backup envelopes, server-authenticated Pinata/IPFS upload, retrieval and authenticated decryption.
- Product UX: a cycle-day scheduling preview with comparison and explicit approval, optional Undo, local activity-type inference, and refined task scheduling controls.
- Verification: transaction hashes, IPFS CID, domain/server/browser tests and CI.

See [architecture](HACKMERIDIAN_ARCHITECTURE.md) and [evidence](HACKMERIDIAN_EVIDENCE.md). Rewards are simulated, not distributed on-chain. No connected AI model or production mainnet integration is claimed.
