# Continuation and release qualifications

This is a handoff for continuing the local-first web app independently of its original development environment. It is not a statement that the entire product roadmap is complete.

## Current implementation boundary

The repository contains a React/TypeScript/Vite PWA, deterministic local planner, task capture/selection, draft/accept and edit/recovery flows, local state and automated tests. There is no connected AI provider, account/cloud sync, external calendar integration or native-store release. Natural-cycle estimates can now guide editable work-type preferences and placement templates. This is preference-based deterministic scheduling, not a biological prediction or connected AI service.

## Cycle-aware planning and local data portability

Implemented in this release:

- Optional task work type, with General as a neutral fallback.
- Editable mapping of estimated phases to preferred work types. Initial mapping: menstrual review/planning, follicular creation/start, ovulatory communication, luteal finishing/admin. These are editable product preferences, not medical rules.
- Balanced chooses a matching feasible phase then the earliest fit; High-output prefers a matching feasible phase then groups work closer to other flexible blocks; Recovery prefers a matching feasible phase then a less-booked day. These transparent implementation defaults are not numeric energy predictions.
- Hard constraints, fixed commitments/pins, priorities, deadlines and full task duration remain protected. If preference placement loses any task that fits the baseline plan, the baseline is retained. Off, unknown, unsupported hormonal patterns and missing dates do not activate phase ranking. General work does not receive a phase match.
- Explanations record the actual chosen task duration, deadline and phase/date preference when applicable. Manual edits and recovery use fresh explanations rather than carrying stale phase claims.
- Preferences affect new proposals; accepted plans require review/apply. Recovery move/split continues to prioritize feasible constraints and does not claim phase optimization.
- Local JSON backup/validated restore, with explicit replacement confirmation; CSV task/plan summaries. Exports stay in the browser and are unencrypted. Restore preserves existing data on validation/storage failure.

The source's illustrative day table is not a complete biological model. The shared calendar heuristic retains the app's established thresholds (28-day example: days 1–5, 6–13, 14–16, 17–28); other lengths shift thresholds and remain estimates. No confidence score, diagnosis, contraceptive-phase prediction, inferred personal energy, or reduced total work duration is claimed.

The owner's authoritative product document remains private and must not be committed. Its broader functional direction should guide subsequent work, subject to later owner changes and the existing no-payments/no-cloud-transmission constraints.

Broader specification areas still require separate implementation/verification: recurring tasks, projects and soft time budgets, end-of-day feedback and learning, PDF summary/analytics reporting, integrations and their consents, account/cloud architecture, and native distribution. This list is a continuation guide, not authorization to add paid services, transmit personal data or expand permissions.

## Verification record

Final release verification is tracked in GitHub PR #4 and its checks: https://github.com/Paolag93/plan4HER-/pull/4. This document is committed before that final run; consult the exact released commit’s checks for the authoritative result.

The release branch is `main` after PR #4 is merged. The commit shown by GitHub and its matching CI run are the source of truth for the full browser suite, domain checks and build. The downloadable source backup includes a separate commit receipt. Re-run the README commands after subsequent changes; do not reuse a green result from a different commit. Older checkpoint documents are historical.

Known validation limits: user-supplied screenshot retrieval was blocked by access errors (403), so direct comparison to those screenshots was not completed. Physical-device and screen-reader checks remain unverified. Automated accessibility/browser checks do not replace those checks. A passing PWA test does not establish native-store delivery or universal device installability.

## Portability and security

See README for setup, static hosting, PWA update behavior and localStorage limitations. Preserve `package-lock.json`, source assets and test baselines. Exclude `.git`, installed dependencies, generated builds, caches, user data and private source documents from a distributable source archive. Optional environment-specific deployment metadata is not an application runtime dependency.

A limited read-only source credential-pattern check can detect obvious mistakes, but cannot certify the repository or its history as secret-free. Review tracked files and the final release diff before distributing. Do not include real credentials or personal information in test fixtures or release notes.
