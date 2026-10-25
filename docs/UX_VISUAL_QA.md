# UX / visual QA — HackMeridian additions

Date: 2026-10-25/26. Branch `ccr-068e87ad-nj66jj`.

## Design authority used
- **Figma master and FigJam blueprint were NOT accessible** in this Claude Code cloud session (no Figma connector/tools available). As `docs/UX_UI_CONTINUITY.md` instructs, the **coded screens and existing Playwright screenshot baselines** were used as the visual authority. No Figma file was edited.
- Reused: `AppHeader`, `BottomNav` (4 tabs unchanged), `Button` (primary/secondary/tertiary/destructive), `ConsentCard`, `TextField`, Poppins, `tokens.css` colours/spacing/radii, the `live-content-screen` layout pattern, the brand-soft intro panel used by Cycle preferences, and the existing More menu button style.
- New CSS (`src/features/community/community.css`) only composes existing tokens. Three tinted badge colours (warning/success/brand-soft text) were added for "Simulated", "Sharing" and network badges; they are not in `tokens.css` and should be reviewed against Figma when access is available.

## Screens (390 × 844 unless noted) — `docs/screenshots/`
| File | Screen |
| --- | --- |
| `more.png` | More with new COMMUNITY section and Encrypted backup entry |
| `community.png`, `community-320.png` | Community directory (390 and 320 px) |
| `join-confirm.png` | Join confirmation (free, opt-in group average) |
| `community-progress.png` | My progress / check-in |
| `tasks-goal-sessions.png` | Goal sessions added to Tasks (existing selection UI) |
| `today-goal-card.png` | Today with the MY GOAL card |
| `partners.png`, `partners-active.png` | Partners list; partner preview with allowed fields |
| `savings.png`, `savings-optedin.png`, `savings-optedin-320.png` | Savings risk consent; connected-state layout |
| `rewards.png` | Rewards simulation |
| `backup.png` | Encrypted backup |

## Automated checks
- New Playwright spec `tests/community.spec.ts`: live journey with a pinned Monday clock (join, check-in, reload persistence, Today card, goal sessions → Tasks), partner allow-list and revocation, savings consent gating and no-wallet error, rewards simulation labelling, encrypted download → wrong passphrase → correct restore, four-tab navigation preserved, **44 px minimum touch targets and no horizontal scroll at 320 / 390 / 768 px** on all new root screens.
- `tests/axe-accessibility.spec.ts` now also scans `community`, `community-progress`, `partners`, `partners-active`, `savings`, `savings-optedin`, `rewards`, `backup` (WCAG 2.1 A/AA): 0 violations. One violation found during development (scrollable region not keyboard-focusable) was fixed by making the content region focusable and labelled.

## Existing baselines
- **No existing screenshot baseline was regenerated.** All existing visual tests pass unchanged.
- Note: More now has a COMMUNITY section and an "Encrypted backup" entry, and its intro reads "Planning context, community, privacy and help in one place." Its Figma-parity test (`p6-da07-more`, tolerance `maxDiffPixelRatio: 0.05`) still passes because the added outline buttons change few pixels; the More screen therefore **intentionally differs** from the Figma frame `4198:298` and should be updated in Figma by the design owner if approved.
- Today's goal card and Privacy & data's encrypted-backup entry/copy appear only in live (non-fixture) mode, so those Figma fixtures are unchanged.

## Known gaps
- Pixel comparison against Figma for the new screens: not possible without Figma access.
- Physical device, screen reader and Freighter mobile testing: not performed.
- Desktop: app stays centred at 390 px like the existing screens.
