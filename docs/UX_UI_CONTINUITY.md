# Plan4Her — UX/UI continuity and new-feature design specification
**Critical instruction: extend the APPROVED product UX/UI; do NOT redesign, rebrand, replace, restyle or rebuild Plan4Her.**
**Writable code repository ONLY:** `Paolag93/plan4her-stellar`.
**Original repository & original Figma source:** READ ONLY. Do not change either without explicit founder approval.

## Verified design sources
- Figma Design Master: https://www.figma.com/design/zctnzXqin1jZJLvxBlVxZz/Plan4Her
  - 00 — MASTER / Read me: https://www.figma.com/design/zctnzXqin1jZJLvxBlVxZz/Plan4Her?node-id=4088-169
  - 01 — Brand: https://www.figma.com/design/zctnzXqin1jZJLvxBlVxZz/Plan4Her?node-id=4088-171
  - 02 — Foundations: https://www.figma.com/design/zctnzXqin1jZJLvxBlVxZz/Plan4Her?node-id=4088-172
  - 03 — Components: https://www.figma.com/design/zctnzXqin1jZJLvxBlVxZz/Plan4Her?node-id=4088-174
  - 04 — UX Architecture: https://www.figma.com/design/zctnzXqin1jZJLvxBlVxZz/Plan4Her?node-id=4088-176
  - 05–09 — MVP / Quick Start, Plan, Daily, Recovery, System States: pages `4088:177`, `4088:178`, `4088:179`, `4088:180`, `4088:181`.
  - 20 — V1: https://www.figma.com/design/zctnzXqin1jZJLvxBlVxZz/Plan4Her?node-id=4088-183
  - 90 — Handoff: page `4088:186`.
- FigJam journey / blueprint: https://www.figma.com/board/PywhrB51wdojiYi4JfvhRK/Plan4Her-journey-blueprint
- Existing original live preview (visual reference, NOT the new release, and public access not independently confirmed):
  https://plan4her-private-preview.sacred-cow-7485.chatgpt.site/#add-task
- Code: `src/styles/tokens.css`, `src/styles/global.css`, `src/app/App.tsx`, `src/components/*`, `src/features/*`, `src/domain/*`.

**Verification:** A connected Figma reader accessed master document metadata, confirmed these exact page names/IDs, and read the FigJam root board containing onboarding, planning, check-in and replan flows. A high-fidelity screenshot/design-context render could NOT be retrieved because the Figma app reported no selected layer. This is **not** proof of full pixel-level visual inspection. Claude must view the relevant actual Figma screens or existing app screenshots before implementing; if Figma access is unavailable, use the existing code and Playwright baseline as design authority, not speculative replacement visuals.

### Design authority and constraints
The master explicitly says new product UI must use Plan4Her variables/components, not new arbitrary color/spacing/radius values; editing/adaptive planning must be transparent/reversible; natural cycle heuristics are not biological truths. Its metadata notes the full Figma parity is still pending, and some journey/release conflicts remain open. Therefore preserve **working coded MVP behavior** before trying to align unbuilt future designs. Archive is historical reference, not current design authority.

## Verified existing UI system in copied repo
- **React 19 + TS + Vite 6** web PWA with global style/tokens.
- **Poppins** via `@fontsource/poppins`.
- Current brand primitives: `--p4h-brand-blue-300: #82c0cc`, `--p4h-brand-teal-600: #16697a`, `--p4h-brand-teal-800: #094745`, `--p4h-sage-100: #edefe3`; full palette/semantic roles are in `src/styles/tokens.css`.
- Shared spacing, typography, rounded corners, status colors, `--size-touch-min: 44px`, `--size-header: 64px`, `--size-nav-bar: 80px`. Avoid hardcoded new values where tokens exist.
- Reusable components: `AppHeader`, `BottomNav`, `Button`, `Checkbox`, `ConsentCard`, `ChoiceCard`, `TextField`, `TaskCard`, overlays, screen patterns. Use existing components; adapt where unavoidable.
- Primary bottom-nav tabs already are **Today · Plan · Tasks · More** (`src/components/BottomNav.tsx`); **do not replace the navigation** or introduce a fifth root tab without an explicit IA review.
- Current UI is designed around a **390 × 844** Figma artboard with responsive adjustments for smaller screens. Never scale down typography/touch targets; test 320, 390, 768 and desktop widths.
- Existing `PrivacyDataScreen` currently says **"Your data stays on this device. Cloud sync is off."**: this will be **inaccurate** after opt-in Pinata/IPFS storage is integrated. Update copy only when data actually syncs; clearly describe local vs encrypted cloud, what the user enables and what happens offline. Do not make premature privacy claims.
- Existing `src/app/App.tsx` uses a centralized `MvpScreen` union and screen state navigation, `src/domain` persistence and domain logic, screenshot fixture/`?qa=` testing. Extend carefully; do not bypass current navigation and data architecture.

## Feature UX — add, don't replace
### A. Community (30/90 days)
- Discover community challenges, view purpose/duration/participants/privacy rules.
- Create or join one 30-/90-day challenge with **personal**, measurable goal. Different members can work toward different goals. Display individual progress and **voluntary** group aggregates separately.
- Community belonging and accountability partner **must function without connecting a wallet or depositing funds**.
- The community reinforces effort at each woman's own rhythm, never ranks members by menstrual phase or pressures them to disclose symptoms.
- Design welcome/onboarding, list, detail, personal-goal editor, join/leave confirmation, progress/check-in, empty/no members, ended/inactive challenge states.
- Integration points: Today progress/check-in and Plan personalized scheduling; discover communities from More or another established navigation entry that requires the fewest disruptions.

### B. Accountability partners
- Opt-in invite, request/accept, shared progress summary, supportive check-ins, opt-out/remove and blocked/revoked states.
- The default shared dataset is MINIMAL (e.g. percentage/check-in status); **never** share task titles, notes, journal, symptoms, dates of periods, estimated phases, individual earnings/balances or wallet identifiers by default.
- Explain what is shared before granting permission. Offer explicit ability to revoke. Show access after revocation accurately; cannot erase copies another person previously downloaded.
- Reuse `ConsentCard` pattern and relevant system privacy screens. No false “anonymous” claims if wallet or identity can be inferred.

### C. Optional Stellar/DeFindex money experience
- Wallet connection with explicit Testnet badge and safe non-custodial signature prompts.
- Clearly distinguish **contribution**, **current redeemable vault share value**, **projected APY**, **actual realized yield**, **community-eligible reward**, and **withdrawal**. Never show fabricated APY as money actually earned.
- Money is optional. Joining challenges has no mandatory fee. No sponsors and no slashing/failure-based capital penalties.
- Disclose protocol, liquidity, stablecoin/depeg and principal-loss risks before authorizing any investment; **do not claim guaranteed principal protection or instantaneous withdrawal**.
- Include deposit input and fee/amount confirmation, signing/pending/confirmed/failure, explorer link, unexpected network, insufficient balance, rejected signature, and safe withdrawal flow.
- If accounting is offchain or rewards simulation-only, label it clearly at the point of display.

### D. Privacy & data ownership
- Adapt existing Privacy & data screen with local vs user-initiated encrypted IPFS backup/sync. Clear data-local deletion ≠ permanent public IPFS erasure.
- Explain passphrase/key creation, backup, recovery, wrong key, loss of decryption key, encrypted upload/download and selective sharing.
- No background upload of sensitive fields without user opt-in. No open analytics by default that leak menstrual or detailed habits data.
- Preserve the user's existing backup/restore paths through a safe, tested migration. Warn before loss/replacement.

### E. Cycle-aware planning
- Keep current deterministic planning and editable personal preferences; connect personal habit goals to existing tasks/calendar/check-ins.
- User is always allowed to accept/reject/replan. Do not invent a generative AI connection, medical assessment, “predictive energy” or guaranteed results.
- Collective challenge does NOT require menstrual details or a natural-cycle mode; all supported cycle modes remain optional and accessible.

## Design workflow expected from Claude
1. Read Figma master/blueprint if permitted, and inspect `tokens.css`, reusable components, current screens and original screenshot baselines.
2. Create `docs/NEW_FEATURE_UX_MAP.md` with screen inventory, existing-screen entry points, flows, component reuse, field/permission matrix and empty/error/offline states.
3. Design and implement **working clickable, stateful React screens** (not screenshots/mocks), one vertical journey at a time. Extend existing CSS tokens/components; no new visual system, new font or template UI.
4. Do not edit the original Figma master, original repo or existing ChatGPT Sites deployment. If Claude has Figma access, use it for READ ONLY reference; obtain separate approval to edit/design-copy the Figma master.
5. Test Playwright UI baselines and new flows (mobile 390×844 plus narrow/mobile/desktop); evaluate keyboard, focus, accessible names, 44px taps, visual regression and privacy copy.
6. Include `docs/UX_VISUAL_QA.md` with what was compared, screenshots of implemented screens, discrepancies, and any unverified Figma access. Existing baseline pixel parity is not automatically proven for new features.
