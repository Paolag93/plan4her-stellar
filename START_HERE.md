# START HERE — Claude Code Web + Stellar Raven (no local terminal)

This is the independent HackMeridian copy of Plan4Her. **Do not select or edit `Paolag93/plan4HER-` (the original).** All new development belongs to `Paolag93/plan4her-stellar`.

## What the founder does in her browser
1. Open https://claude.ai/code (official Claude Help Center confirms this route; availability and GitHub connection are subject to your Claude plan).
2. Connect/authorize GitHub and choose **`Paolag93/plan4her-stellar`**, not `Paolag93/plan4HER-`.
3. Open a new Claude Code task/session. Allow Claude to work in its own cloud workspace; no local terminal is required.
4. If the interface offers an MCP/connector management page, add or authorize **Stellar Raven** at **https://raven.stellar.org/mcp** (official docs: https://raven.stellar.org/docs). Verify Raven tools are actually available inside that Claude Code session. If Claude Code Web can't use this remote MCP, use official Stellar documentation directly; do not install unrelated software or claim Raven was used.
5. Give Claude this exact task message:

> Work ONLY on the GitHub repository `Paolag93/plan4her-stellar`. Never write to the original `Paolag93/plan4HER-`. Read `CLAUDE.md`, `docs/HACKMERIDIAN_MASTER_BRIEF.md`, `docs/HACKMERIDIAN_PROVENANCE.md`, `README.md`, and `CONTINUATION.md` completely. These are your product, implementation and safety requirements. Inspect existing code first; preserve all screens and working flows.
>
> I am the nontechnical founder and am using Claude Code in the browser. You may use your own cloud terminal, run code/tests, create a separate feature branch and propose a PR **in plan4her-stellar only**, but do not ask me to run a terminal locally. Use Stellar Raven MCP if actually available, otherwise official docs, to verify current Testnet, DeFindex and Soroban integration details. Work from the copied existing React app; do not rebuild it.
>
> Implement community challenges (30/90 days), individual goals, accountability partners, opt-in financial participation and privacy permissions; an authentic Stellar Testnet DeFindex vault deposit/balance/withdraw flow; and encrypted synthetic data storage with Pinata/IPFS using protected server credentials. Reuse suitable ideas from Cyra read-only but fix its Pinata JWT and AES key-custody issues. Explain how vault shares and personal capital remain distinct from reward-eligibility accounting; don't claim guaranteed funds or yield. Do not block the entire build on OpenZeppelin Confidential Tokens; investigate and add as an independent Testnet experiment only if feasible.
>
> Execute coding and verification, not just a plan. Record evidence in `docs/HACKMERIDIAN_EVIDENCE.md`; clearly mark real blockchain operations versus demos/simulations. Show me a concise list of actions requiring my browser authorization (API accounts, OAuth, wallet signing, deployment). Do not request passwords, seed phrases or private keys through chat.
>
> Our HackMeridian Scale submission is due **October 26, 2026 at 12:00 Lisbon time**; verify portal and reserve time to submit. Do not modify the original repo or existing Plan4Her preview/domain. Use a separate deployment.

## External accounts (only when implementation requires them)
- DeFindex: https://console.defindex.io/register — DeFindex's own official Get your API key link; interactive registration needs browser login. If unavailable, use official https://www.defindex.io/ and docs https://docs.defindex.io/ for API key instructions. User controls registration/API credentials.
- Pinata: https://app.pinata.cloud/ — API tokens must be kept server-side, never committed or sent via public frontend.
- Stellar Raven MCP: https://raven.stellar.org/mcp — optional authorized research tool, not a public webpage or a live payment system; setup docs: https://raven.stellar.org/docs.
- GitHub source: https://github.com/Paolag93/plan4HER- — reference only.
- GitHub legacy Cyra: https://github.com/OlaOlaPaola/Cyra — read-only reference; avoid copying insecure code.
- Stellar docs: https://developers.stellar.org/ ; DeFindex SDK: https://github.com/defindex-io/defindex-sdk ; primary event submission guidance/deadline: https://www.hackmeridian.com/build .
- Confidential Tokens workshop deck: founder should attach `[ext] Confidential Token Workshop, Meridian 2026, Lisbon.pptx` directly to Claude if desired; not stored here because a public/private GitHub repository is not a suitable place for large reference attachments by default.

## Before publishing or presenting
Claude must show real Testnet vault transactions or label the financial preview simulated; test wallet signatures/deposits/withdrawal; ensure no private health details or upload JWT leaked; verify hosted demo in anonymous browser; document newly built HackMeridian functionality separately from the existing MVP. The owner approves public release. Until then keep the repository private.

## Protection against accidental cross-repository writes
Every code-writing session must verify its working GitHub remote is precisely **Paolag93/plan4her-stellar**. If Claude accidentally opens **Paolag93/plan4HER-**, it must stop and restart from the correct repository. Do not give Claude broad authority to publish, spend funds or merge back into the original.

For the current audit of each external link and the known interactive-only/uncertain links, see `docs/RESOURCE_LINK_AUDIT.md`. Do not confuse the legal Terms of Service URL with the actual Build/Submission guidance.
