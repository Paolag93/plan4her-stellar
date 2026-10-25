# Plan4Her MVP — Development Orchestration Plan

## 1. Sources of truth

Priority order when implementation decisions conflict:

1. Figma file `zctnzXqin1jZJLvxBlVxZz`, page `10 - Prototype` for visual/UI behavior.
2. Canonical MVP product scope and release decisions documented in the Plan4Her project.
3. This repository's domain contracts and automated tests.
4. Implementation convenience.

V1, V2 and V3 Figma pages are explicitly out of MVP build scope unless a feature has been formally moved into MVP.

## 2. Product-development rule

Do not translate Figma frames into one React page per frame.

Use shared components and explicit UI state:

- one screen component may render multiple Figma states;
- overlays remain overlays;
- selected/focused/loading/error/applied states are represented by props or state machines;
- duplicated visual frames are not duplicated in code.

The implementation must remain visually equivalent to the canonical frame for each state.

## 3. Technology baseline

### Frontend
- React 19
- TypeScript
- Vite
- PWA
- CSS + design tokens extracted from Figma
- Poppins

### QA
- Playwright for interaction and E2E
- screenshot regression at 390×844 canonical viewport
- WCAG AA contrast checks
- minimum interactive target 44×44 px

### Product architecture
- UI layer
- feature/application state
- domain types and planner contracts
- persistence adapter
- planning/AI adapter
- integration adapters

The UI must not depend directly on a specific AI provider, storage provider, calendar provider or authentication vendor.

## 4. Development sequence

### Milestone M0 — Foundations
Status: in progress / core complete

Deliverables:
- app scaffold;
- Figma primitive tokens;
- Button;
- Checkbox;
- ConsentCard;
- ChoiceCard;
- TextField;
- setup/progress header;
- test harness.

Gate:
- shared primitives match Figma component contracts;
- no ad-hoc colors/spacing unless the Figma frame uses an explicit local value.

### Milestone M1 — First-use Quick Start
Status: implementation complete pending executable visual QA

Canonical journey:

`START → Privacy → Cycle Mode → Cycle Basics or skip → Starter Tasks → Availability → Fixed Commitments → Loading Plan`

Completed in current checkpoint:
- START;
- Privacy;
- Analytics consent behavior;
- Cycle Mode + selection variants;
- Cycle Basics happy path;
- last-period calendar overlay;
- cycle estimate selected state;
- Starter Tasks happy path;
- Availability happy path;
- Fixed Commitments skip path;
- Loading Plan.

Remaining branch work before M1 is fully closed:
- executable screenshot regression in a package-enabled runtime;
- localize short-lived START Figma assets into the repository.

Gate:
- every Figma branch in QS03–QS08 is reachable through user interaction or explicit QA route;
- screenshot regression for canonical base and branch states;
- Back behavior matches Figma graph.

### Milestone M2 — Tasks
Deliverables:
- Tasks root;
- quick add;
- fixed/flexible semantics;
- Importance;
- task details/edit;
- delete/confirmation/Undo;
- empty/error states.

Gate:
- task state persists locally;
- no V1-only Role/Urgency/Focus functionality leaks into MVP.

### Milestone M3 — Plan generation + Review
Deliverables:
- planner input contract;
- deterministic mock planner first;
- Loading Plan;
- generation success/error/insufficient-data states;
- Monday–Sunday Review Plan;
- rationale;
- Accept Plan.

Implementation order:
1. render with fixture data;
2. lock visual parity;
3. introduce planner interface;
4. replace fixture provider without changing UI.

Gate:
- complete first-use journey can be tested with no network and no AI provider.

### Milestone M4 — Today + Active Plan
Deliverables:
- Today;
- Plan;
- Tasks;
- More;
- bottom navigation;
- done/partial/missed execution;
- plan block detail/actions.

Gate:
- root navigation is `Today / Plan / Tasks / More` everywhere;
- Monday–Sunday visible on weekly plan surfaces.

### Milestone M5 — Recovery
Deliverables:
- missed block;
- recovery options;
- move/split states supported by MVP;
- preview;
- apply;
- Undo.

Gate:
- no accepted-plan mutation is applied without the Figma preview/approval step;
- every applied change has a reversible path where specified.

### Milestone M6 — Adjust / Recent Changes
Deliverables:
- adjustment scope;
- proposal/diff;
- apply;
- recent changes;
- restore preview;
- restore applied;
- Undo.

Gate:
- exact `preview → apply → feedback/Undo` grammar preserved.

### Milestone M7 — More / Privacy / System States
Deliverables:
- More;
- privacy/local-data surfaces;
- clear data;
- offline;
- error;
- empty;
- insufficient-data states;
- destructive confirmations.

Gate:
- destructive operations never bypass confirmation unless explicitly reversible in Figma;
- privacy language remains user-facing, nontechnical and consistent with Figma.

### Milestone M8 — Persistence and domain stabilization
Deliverables:
- local-first repository interfaces;
- persistent cycle context;
- tasks;
- availability;
- fixed commitments;
- accepted plan;
- recent changes;
- schema/version migration strategy.

Gate:
- refresh/relaunch preserves expected MVP state;
- UI remains independent of storage implementation.

### Milestone M9 — Planning engine integration
Deliverables:
- `generateWeeklyPlan(input): WeeklyPlan` contract;
- planner adapter;
- timeout/failure/fallback handling;
- deterministic fixture adapter for tests.

Gate:
- Playwright can run entirely with fixture planner;
- provider changes do not alter components.

### Milestone M10 — Full E2E and visual release gate
Required journeys:
- first use with cycle context;
- first use without cycle context;
- edit before acceptance;
- accepted plan execution;
- missed task → recovery → preview → apply → Undo;
- adjust plan → diff → apply → recent changes → restore;
- privacy / clear data;
- offline/error recovery;
- re-entry after reload.

Release gate:
- no P0/P1 functional defects;
- canonical screenshots accepted;
- no cross-release feature leakage;
- build + typecheck + E2E + visual suite pass in CI.

## 5. Figma-to-code protocol for every screen

For every new screen/state:

1. identify canonical Figma node ID;
2. retrieve design context;
3. inspect exact node bounds where Auto Layout output is ambiguous;
4. reuse existing code components first;
5. implement only the delta required by the state;
6. wire interactions from Figma prototype graph;
7. add `data-figma-node` to the canonical rendered state;
8. write Playwright interaction test;
9. capture 390×844 screenshot;
10. compare and correct before closing the slice.

## 6. Agent / Codex task format

Each implementation task should contain:
- exact Figma node IDs;
- scope boundary;
- files allowed to change;
- expected interactions;
- acceptance screenshots;
- tests required;
- explicit out-of-scope release features.

A task is not accepted because code compiles. It is accepted only after functional and visual gates pass.

## 7. Git workflow once repository authorization is available

Recommended:
- `main`: releasable checkpoints only;
- `build/mvp-foundations`;
- `build/mvp-quick-start`;
- `build/mvp-tasks`;
- `build/mvp-plan`;
- etc.

Each milestone ends with a focused PR containing:
- implementation;
- tests;
- screenshot baselines;
- status update;
- no unrelated refactors.

## 8. Current operational constraint

GitHub is connected to `Paolag93/plan4HER-` and development now occurs directly on the private repository.

This execution environment still has no external npm package-network access. Source and repository structure can be changed here, but package installation, Vite build and Playwright screenshot execution require a package-enabled runtime.
