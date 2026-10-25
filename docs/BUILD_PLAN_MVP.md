# Plan4Her MVP Build Plan

Source of truth for visual/product behavior: Figma `10 - Prototype` in file `zctnzXqin1jZJLvxBlVxZz`.
Future release pages (`20 — V1`, `30 — V2`, `40 — V3`) are explicitly out of MVP implementation scope.

See also: `docs/ORCHESTRATION_PLAN.md`.

## Definition of done for every slice
1. Uses Figma tokens/components instead of ad-hoc styling.
2. Matches canonical mobile viewport and target frame visually.
3. User-facing interactions match the Figma prototype graph.
4. Loading, empty, error, recovery and Undo states included when part of the slice.
5. Minimum interactive target 44 px.
6. WCAG AA contrast for resolvable solid text/background pairs.
7. Playwright happy-path/edge-path tests pass.
8. Visual screenshot regression accepted before moving to the next slice.

## Build sequence

### 00 — Foundations & app shell
- React + TypeScript + Vite + PWA.
- Poppins typography.
- P4H color/spacing/radius/type tokens from Figma.
- Shared Button, IconButton, TextField, Switch, Checkbox, Chip, Badge.
- AppHeader, BottomNav, NavItem, Snackbar primitives.
- 390x844 canonical mobile QA viewport.

### 01 — Entry + Quick Start
- `P6 / START — User entry`.
- Quick Start path and sample plan entry.
- Optional cycle context framing.
- No account required in MVP entry path.

### 02 — Cycle context
- Current cycle context input.
- Explain uncertainty as an estimate, not a measurement.
- User can continue without cycle context.

### 03 — Availability + fixed commitments
- Weekly availability.
- Weekday/weekend/custom states.
- Manual fixed commitments.

### 04 — Tasks
- Starter pack.
- Quick add.
- Fixed/flexible task model.
- Importance.
- Task detail/edit/delete and Undo where specified.

### 05 — Generate + Review Plan
- Generate state/loading/error.
- Review Plan Monday–Sunday.
- Rationale.
- Accept plan.

### 06 — Today + Active Plan
- Today.
- Plan.
- Tasks.
- More.
- Complete/partial/missed execution states.

### 07 — Recovery
- Missed block.
- Move/split/defer decision states supported by MVP.
- Preview before apply.
- Applied state with Undo.

### 08 — Adjust + Recent changes
- Scope selection.
- Diff.
- Apply.
- Undo.
- Recent changes.
- Restore preview/applied.

### 09 — More + privacy + system states
- Privacy/local-data surfaces.
- Offline/error/insufficient-data states.
- Clear data / destructive confirmations.

### 10 — End-to-end QA
- Figma screenshot comparison for canonical screens.
- Playwright full first-use journey.
- Back/cancel/error/empty/Undo/re-entry checks.
- PWA installability and viewport/safe-area checks.
