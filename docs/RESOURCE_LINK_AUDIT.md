# Plan4Her — Verified resource links for Claude (HackMeridian 2026)
**Audit date:** 2026-10-25. **Scope:** `CLAUDE.md`, `START_HERE.md`, `docs/HACKMERIDIAN_MASTER_BRIEF.md`, `docs/HACKMERIDIAN_PROVENANCE.md`, `docs/HACKMERIDIAN_EVIDENCE.md`.
**Write isolation:** all corrections made ONLY in `Paolag93/plan4her-stellar`; original `Paolag93/plan4HER-` not modified.

This is a source/URL audit, **not** proof of service credentials, wallet access or transaction execution. All login-gated services and the existing preview need owner-side or Claude-session verification.

## A. Correct addresses and verified purpose

| Resource | Canonical address | Validation | Notes for Claude |
| --- | --- | --- | --- |
| Independent writable GitHub repo | https://github.com/Paolag93/plan4her-stellar | VERIFIED via authenticated GitHub connector | **Only writable repository**; private; owner authenticated. |
| Original read-only repo | https://github.com/Paolag93/plan4HER- | VERIFIED via authenticated GitHub connector | Private; never modify. |
| Legacy Cyra read-only repo | https://github.com/OlaOlaPaola/Cyra | VERIFIED via GitHub connector | Code reference only, with known IPFS key-security issues. |
| DeFindex official website | https://www.defindex.io/ | VERIFIED public live site | The “Get your API key” link on the website points to console registration below. |
| DeFindex console registration | https://console.defindex.io/register | OFFICIALLY LINKED, LOGIN/JS PAGE NOT INDEPENDENTLY FETCHABLE | Exact target of “Get your API key” on official DeFindex website. Founder must visit/login herself; cannot guarantee completion from an automated fetch. |
| DeFindex developer documentation | https://docs.defindex.io/ | VERIFIED public live docs | Read for vaults, strategies, Testnet and transaction semantics. |
| DeFindex machine-readable index | https://docs.defindex.io/llms.txt | VERIFIED public text | Best first index for Claude to discover precise live documentation URLs. |
| DeFindex TypeScript SDK | https://github.com/defindex-io/defindex-sdk | VERIFIED GitHub repo and README | Official `@defindex/sdk`; server-side API key and unsigned XDR flow. |
| Pinata dashboard | https://app.pinata.cloud/ | VERIFIED public login app shell | Authentication and dashboard functions require founder access. |
| Pinata documentation | https://docs.pinata.cloud/ | VERIFIED; redirects to /quickstart | Prevent client-side JWT exposure. |
| Stellar developer docs | https://developers.stellar.org/ | VERIFIED public official | Network, SDKs, contracts, wallet and transaction docs. |
| Stellar Raven MCP endpoint | https://raven.stellar.org/mcp | VERIFIED in official Raven documentation, MCP/OAuth endpoint | **Not a human-readable webpage.** Requires authorized streamable-HTTP MCP client; a browser/GET failure does not prove it is broken. |
| Stellar Raven setup / troubleshooting | https://raven.stellar.org/docs | VERIFIED public official | Instructions for connecting Claude Code and OAuth. |
| OpenZeppelin confidential-token code | https://github.com/OpenZeppelin/stellar-contracts/tree/main/packages/confidential | VERIFIED main branch + existing package | Corrected from **broken `tree/master` path**. |
| OpenZeppelin confidential token technical guide | https://docs.openzeppelin.com/stellar-contracts/tokens/confidential/confidential | VERIFIED public official | Confidentiality of amounts and balances, NOT identity anonymity or menstrual data. |
| OpenZeppelin old ‘Build with SDK’ URL | https://docs.openzeppelin.com/stellar-contracts/tokens/confidential/build-with-the-sdk | NOT VERIFIED (direct fetch fails) | Do **not** rely on this deep link or assume a distributable SDK exists. Use the officially verified Wallet Integration guide below. |\n| OpenZeppelin Wallet Integration | https://docs.openzeppelin.com/stellar-contracts/tokens/confidential/wallet-integration | VERIFIED official page | Explicitly says the library ships contracts/circuits but **does not ship a client SDK**; SDK behavior is a specification. |
| HackMeridian build, deadlines, judging | https://www.hackmeridian.com/build | VERIFIED official event page | **Primary for deadline 2026-10-26 12:00 Lisbon, Scale rules and judging.** |
| HackMeridian schedule | https://www.hackmeridian.com/schedule | VERIFIED official event page | Confirms deadline in Lisbon time. |
| HackMeridian legal terms | https://www.hackmeridian.com/terms.html#submissions | VERIFIED official legal document | **Legal IP/submission terms only, NOT application checklist.** Was incorrectly labeled as submission rules; corrected. |
| Claude Code cloud entry | https://claude.ai/code | VERIFIED in Anthropic's official Claude Help Center | Authentication prevents direct public scraper check. Works subject to subscription/GitHub permissions. |
| ChatGPT Sites old Plan4Her preview | https://plan4her-private-preview.sacred-cow-7485.chatgpt.site/#add-task | USER-PROVIDED; PUBLIC ACCESS NOT VERIFIED | Hash route is client-side; site may require published access; existing original preview MUST NOT be modified. Visual reference only. |

| Figma Plan4Her design master | https://www.figma.com/design/zctnzXqin1jZJLvxBlVxZz/Plan4Her | VERIFIED through connected Figma metadata tool | Current pages Master, Brand, Foundations, Components, MVP, UX Architecture, V1 and Handoff found; full rendered screenshot unavailable without selected layer. Read-only. |\n| Figma FigJam journey blueprint | https://www.figma.com/board/PywhrB51wdojiYi4JfvhRK/Plan4Her-journey-blueprint | VERIFIED through connected FigJam tool | Actual onboard→plan→checkin→replan nodes read; some future-state decision nodes flagged ambiguous by board. Read-only. |\n\n## B. What changed in prompt files
1. OpenZeppelin repository branch `master` → `main`.
2. HackMeridian actual build/submission URL now points to `/build`; legal `/terms.html#submissions` retained separately for IP rights.
3. Added official `/docs` for Raven setup and `/llms.txt` for DeFindex docs discovery.
4. Noted that `console.defindex.io/register` is confirmed to be **linked by DeFindex itself** but is an interactive sign-in page.
5. Added Figma Design Master and FigJam journey references verified by connected tools; required reuse of existing UX/UI instead of rebuilding it.\n6. Corrected OpenZeppelin claim: official onchain library does **not** include a client SDK; do not depend on the inaccessible Build with SDK deep link.\n7. Marked original ChatGPT Sites preview as not independently verified publicly; don't use as the hackathon's public demo link without incognito verification.

## C. Safety and verification criteria
- Check that the current Claude Code working Git remote is `Paolag93/plan4her-stellar` **before every code write**.
- Never interpret prepared DeFindex XDR as an onchain transaction without signature + submit + confirmed hash.
- Verify demo links with an unauthenticated browser. Do not submit a private ChatGPT Sites preview as a public demo unless owner has tested access.
- DeFindex annualized projections are not realized yield. No principal guarantee; no habit-failure forfeiture.
- OpenZeppelin Confidential Tokens do not imply private DeFindex deposits or encrypted medical data.
- Never paste API secrets or wallet private keys in GitHub or in chat.
