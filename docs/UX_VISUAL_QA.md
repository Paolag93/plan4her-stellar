# UX / visual QA — HackMeridian additions

Date: 2026-10-25/26. Branch `ccr-068e87ad-nj66jj`.

## Design authority used
- **Figma master and FigJam blueprint were NOT accessible** in this Claude Code cloud session (no Figma connector/tools available). As `docs/UX_UI_CONTINUITY.md` instructs, the **coded screens and existing Playwright screenshot baselines** were used as the visual authority. No Figma file was edited.
- Reused: `AppHeader`, `BottomNav` (4 tabs unchanged), `Button` (primary/secondary/tertiary/destructive), `ConsentCard`, `TextField`, Poppins, `tokens.css` colours/spacing/radii, the `live-content-screen` layout pattern, the brand-soft intro panel used by Cycle preferences, and the existing More menu button style.
- New CSS (`src/features/community/community.css`) only composes existing tokens. Three tinted badge colours (warning/success/brand-soft text) were added for "Simulated", "Sharing" and network badges; they are not in `tokens.css` and should be reviewed against Figma when access is available.

## Screens (390 × 844) — `docs/screenshots/`
`more.png` (More with Rhythm Pool, Savings and Encrypted backup), `community.png` (Rhythm Pool home), `rhythm-terms.png`, `community-commitments.png` (weekly selection), `community-progress.png` (week 2 tracking), `community-result.png` (four-week result), `savings-optedin.png`, `rewards.png`, `backup.png`.

## Automated checks
- New Playwright spec `tests/community.spec.ts`: Rhythm Pool live journey with a pinned Monday clock (terms gating, 3–5 commitments, done/missed, one replacement with fixed count, reload persistence, task completion sync, Today card, no external requests), savings consent gating and no-wallet error, rewards simulation labelling, encrypted download → wrong passphrase → correct restore, four-tab navigation preserved, **44 px minimum touch targets and no horizontal scroll at 320 / 390 / 768 px** on all new root screens.
- `tests/axe-accessibility.spec.ts` now also scans `community`, `rhythm-terms`, `community-commitments`, `community-progress`, `community-result`, `savings`, `savings-optedin`, `rewards`, `backup` (WCAG 2.1 A/AA): 0 violations. One violation found during development (scrollable region not keyboard-focusable) was fixed by making the content region focusable and labelled.

## Existing baselines
- **Copy audit (2026-10-26):** six baselines were regenerated because their copy changed intentionally. No layout, component or color changes were made:
  - `p6-start-user-entry` (new landing headline and description)
  - `onboarding-rhythm` and `onboarding-control` (rhythm and onboarding copy)
  - `p6-help-cycle-context` (cycle help copy)
  - `p6-privacy-data` and `p6-analytics-enabled` (privacy headline and body)
- All other baselines are unchanged and still pass.
- Note: More now has a COMMUNITY section (Rhythm Pool, Savings & rewards) and an "Encrypted backup" entry, and its intro reads "Planning context, community, privacy and help in one place." Its Figma-parity test (`p6-da07-more`, tolerance `maxDiffPixelRatio: 0.05`) still passes because the added outline buttons change few pixels; the More screen therefore **intentionally differs** from the Figma frame `4198:298` and should be updated in Figma by the design owner if approved.
- Today's Rhythm Pool card and Privacy & data's encrypted-backup entry/copy appear only in live (non-fixture) mode, so those Figma fixtures are unchanged.

## Known gaps
- Pixel comparison against Figma for the new screens: not possible without Figma access.
- Physical device, screen reader and Freighter mobile testing: not performed.
- Desktop: app stays centred at 390 px like the existing screens.

## UX pass (2026-10-26, branch `ccr-068e87ad-nj66jj`)
- **Rhythm preview** (Plan, Today, More): a cycle-day slider re-runs the real planner (`previewRhythm` → `proposeAdjustment`). Each day shows its phase. Tasks are tagged with their work type, "fits {phase}" and "moved here". "Use cycle day N" goes through the existing review → Apply → Undo flow.
- **Work types** added: Energizing movement and Rest & gentle movement. Default phase mapping:
  - Menstrual: review/planning, rest
  - Follicular: creation, energizing movement
  - Ovulatory: communication, energizing movement
  - Luteal: finishing/admin, rest
- **Sample week starter pack** with 11 typed tasks across work, movement, social life, self-care, admin and home.
- **Live plan day headers** show a passive phase tag. Today's cycle card states what the phase is best for, and task cards show the work type.
- **Interaction language:**
  - Section labels keep the Figma accent token (guarded by tests) but are semibold and letter-spaced.
  - Links are underlined; actions are buttons.
  - Status pills are flat and borderless; selectable chips have a dark border.
- **Progressive disclosure:**
  - Rhythm Pool terms use collapsible sections (commitments open; money/rewards and privacy collapsed).
  - The backup's "What to know" and the rewards rule are collapsed.
- **Watercolor wash:** a subtle CSS wash on intro panels, inspired by the brand's watercolor figure illustrations. The illustrations themselves were provided only as chat images, not files, so they are not embedded.
- **Baselines:** `p6-starter-tasks` was refreshed (new fourth starter card). All other baselines pass unchanged.
