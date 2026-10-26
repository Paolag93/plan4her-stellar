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
- **Explore your week** (Plan, Today, More): a cycle-day slider re-runs the real planner (`previewRhythm` → `proposeAdjustment`). Each day shows neutral context ("Day 14 · Ovulatory"). Tasks show their work type and "moved". The status line reads "N tasks moved".
- **Work types** added: Energizing movement and Rest & gentle movement. Default phase mapping:
  - Menstrual: review/planning, rest
  - Follicular: creation, energizing movement
  - Ovulatory: communication, energizing movement
  - Luteal: finishing/admin, rest
- **Sample week starter pack** with 11 typed tasks across work, movement, social life, self-care, admin and home.
- **Live plan day headers** show a passive phase tag. Today's cycle card shows the estimated day and phase without prescriptive advice. Task cards show the work type.
- **Interaction language:**
  - Section labels keep the Figma accent token (guarded by tests) but are semibold and letter-spaced.
  - Links are underlined; actions are buttons.
  - Status pills are flat and borderless; selectable chips have a dark border.
- **Progressive disclosure:**
  - Rhythm Pool terms use collapsible sections (commitments open; money/rewards and privacy collapsed).
  - The backup's "What to know" and the rewards rule are collapsed.
- **Watercolor wash:** a subtle CSS wash on intro panels, inspired by the brand's watercolor figure illustrations. The illustrations themselves were provided only as chat images, not files, so they are not embedded.
- **Baselines:** `p6-starter-tasks` was refreshed (new fourth starter card). All other baselines pass unchanged.

## Approval and neutral-copy pass (2026-10-26)
- **Nothing is applied automatically.** The slider, the preview and opening **Review changes** never write to storage; this is checked by comparing `localStorage` byte for byte in `tests/rhythm.spec.ts`.
  - **Back** returns to the preview, and **Keep plan as is** leaves the saved cycle and plan unchanged.
  - **Apply changes** commits the plan and the cycle day together in one save.
  - **Undo** restores both the prior plan and the prior cycle. The history entry records `cycleBefore`; the persistence validator accepts it as an optional field, so older saves still load.
- Saving Cycle Context in settings updates only the cycle. It never rearranges the accepted plan.
- **Prescriptive copy removed:**
  - Phase guidance ("Best for …") on Today
  - Phase notes and "fits {phase}" in the preview
  - The phase→activity mapping list
  - "Watch your week follow your rhythm"
  - The onboarding "energy tends to build" example

  The associations live only in the planner, as editable **Planning preferences**.
- **Savings progressive disclosure:**
  - The vault contract, share count and APY sit under a collapsed **Technical details** section.
  - Still visible: wallet balance, redeemable value, net contribution, change (can be negative), realized yield, Testnet status, fees, slippage, risk text, the public-transaction notice and the simulation label. An unverified vault asset shows a visible warning and deposits stay disabled.
- **Baselines:** none regenerated. The full suite passes: 357 Playwright tests, plus the domain and server tests.

## Final pre-submission hotfix (2026-10-26)
- **Why nothing seemed to move:** the founder's week came from the *Balanced* starter pack. Its tasks ("Prepare proposal", "Call dentist", "Buy groceries", "Admin follow-up") carried no activity type, so the cycle day had nothing to re-place.
- **Real planner result for the sample week** (accepted Monday 26 Oct; same tasks, availability and dates):
  - Day 1 → 2 tasks moved.
  - Day 12 → 6 tasks moved. Client presentation, workshop reel and coffee go Mon → Wed (ovulatory); slides, expenses and yoga go Mon → Sat (luteal).
  - Movement shrinks later in the week, because only the remaining days are planned: Wednesday shows 3 moves, Saturday shows none. The preview now says this honestly.
- **Automatic activity type:** a local, deterministic keyword classifier (`src/domain/activityClassifier.ts`). It is not AI. The real planner uses it whenever a task has no stored type. Ambiguous titles stay neutral, and stored or corrected types always win.
  - The 11 sample tasks no longer carry hand-set types; inference reproduces them exactly.
  - Add task no longer asks for a type. Edit task keeps an optional, collapsed **Activity type** correction.
- **Explore your week** lists each moved task with old → new day.
- **Today cards:** the Flexible/Fixed badge is content-sized (a broader full-width rule outranked it), and "⋯" sits beside the title instead of on an empty row.
- **More:** the fixed 358/390 px widths overflowed by 15 px whenever a classic vertical scrollbar appeared, causing horizontal scroll. They are now fluid, with the same 16 px padding. A sweep of Today, Plan, Tasks, More, Rhythm Pool, Savings, Backup, Explore and Add task at 320 / 390 / 1280 px with real scrollbars found no other overflow (the 7-day strips scroll by design).
- **Task scheduling:**
  - Edit task used typed `YYYY-MM-DD` fields for the deadline and fixed date. Both now open the same calendar as Add task: month/year navigation, exact-date fallback with validation, and Clear deadline.
  - Add task started live with a real value ("Prepare grant application", a fixture string); it now starts empty.
  - New `tests/task-scheduling.spec.ts` covers: create/edit/reload; plan; deadline held on cycle days 1, 5, 12, 14, 20 and 27; fixed appointment never moves; every field and Save reachable at 320 and 390 px.
- **Rhythm Pool:**
  - The primary **Join Rhythm Pool** button sits under the intro and leads to the terms. Members land on **My progress**. Connect wallet is secondary and labelled optional.
  - Done/Missed only exist for a joined member's commitments; this was already enforced.
  - New `tests/rhythm-pool-access.spec.ts` covers a non-member and a joined member without a wallet.
- **Known limitation, not changed:** the planner only covers the current calendar week, and there is no "plan next week" option. Adding one would change planning semantics app-wide, so it was left out before the deadline.
