# Plan4Her — Proposed New Feature UX Map (starter, refine during implementation)

> **Superseded 2026-10-26:** the final product uses one shared **Rhythm Pool** (see `docs/HACKMERIDIAN_ARCHITECTURE.md`). Thematic challenges and accountability partners were removed from the primary journey.
**Status:** Proposed extension based on the existing code and verified Figma page structure; new screens themselves are NOT currently approved Figma screens. Claude must reconcile this with actual Figma screenshots, existing design patterns, implementation and founder's product intent.

## Navigation constraint
The current `BottomNav.tsx` has `Today / Plan / Tasks / More`. Preserve it. Use nested features and return/back flows. Suggested, not mandatory:
- **Today:** personal-goal check-in / current challenge summary, with privacy-respecting quick progress.
- **Plan:** view goal-related scheduled blocks and cycle-aware recommendations already supported by current planner; no overrides of fixed plans.
- **Tasks:** convert personal habits into actionable existing task objects; do not duplicate task records or break task state.
- **More:** entry to `Communities`, `Accountability partners`, `My savings & rewards` and existing `Privacy & data`.

## Suggested screens and acceptance
| Screen | Entry / back | Primary action | Critical state |
| --- | --- | --- | --- |
| Community directory | More → Communities | Explore/join 30/90-day challenge | Empty/loading/private group/closed |
| Community detail | Directory | Review purpose, dates, rules, members (opt-in only) | Challenge closed / full |
| My personal goal | Community join | Set individualized measurable goal, units/frequency | Required fields / deadline |
| Join confirmation | Goal editor | Join for FREE | Clear opt-in, no wallet required |
| Community progress | Today / group detail | Check-in / view own progress | Confidential defaults; group only opt-in aggregates |
| Accountability partners | More / community detail | Invite/request / accept | Pending/rejected/removed/unavailable |
| Share permissions | Partner invite/review | Select safe summary fields | Off by default, revoke, last shared |
| Savings opt-in | Challenge detail / More | Learn about investing, risks and optional wallet | Nonfinancial participation is equally available |
| Wallet connect | Savings opt-in | Connect supported Stellar Testnet wallet | Unsupported network, deny, disconnect |
| Vault detail | Savings | Display position, actual shares, APY estimate, realized yield | No investment/unknown yield/ineligible asset |
| Deposit review | Vault detail | Review amount, asset, risks, quote/fees and sign | Invalid amount, rejected signature, pending |
| Deposit confirmation | Pending | Check confirmed transaction/explorer | Failed, timeout, retries without duplicate |
| Withdraw review | Vault detail | Request redemption, show availability and risks | Insufficient liquidity, loss, slippage |
| Rewards | Challenge | Show eligible/earned amounts | Simulation visibly labeled; no guaranteed reward |
| Privacy & encrypted backup | Existing More → Privacy & data | Enable encrypted IPFS backup or keep local | Opt-in / failed upload / lost key / migration |

## Core invariants in microcopy and behavior
- Your own goals, your own rhythm. No universal hormone/productivity scoring.
- Community belonging never requires menstrual disclosure or financial contributions.
- A completed check-in ≠ onchain verified real-world compliance. Declare how verification works.
- Accountability partner sees only expressly authorized summary fields, never personal cycle data by default.
- The *same* member can miss goals and still retain ownership of her vault shares; DeFi loss remains possible.
- 30/90 day challenge period does not imply a fixed investment lock, guaranteed liquidity or rate.
- Show "Estimated APY" separately from "Yield realized" (may be zero) and "Reward eligible."
- Current `PrivacyDataScreen` mentions local-only storage. Replace that sentence **only when** optional encrypted IPFS upload is actually available and approved by user.
- Avoid copying raw wallet addresses or transaction metadata into public habit/progress posts.

## UI QA matrix
- 390×844 master, 320×568 narrow, 768px tablet, desktop with app centered.
- Tap targets 44px or larger, keyboard focus and logical back navigation, screen reader labels, appropriate modal focus trap, WCAG contrast.
- Color only from project design tokens; Poppins; existing brand background and original illustrations/assets.
- Privacy and financial UX: explicit risk, consent, pending/error/empty states. No aesthetic trading dashboard takeover.
- Screen snapshots for new states, nonregression snapshots for existing Plan4Her routes and flows.
