# Live-flow exploratory review

This pass supplements canonical screenshot regression with synthetic real-state
journeys, long content, 320–1280px layouts, short viewports, enlarged text, custom
picker drafts, keyboard navigation, storage failures and interrupted navigation.
It is not a claim that every Figma frame or physical device has been inspected.

Concrete corrections:

- Long live tasks, metadata and plan changes reflow rather than hiding or colliding.
  Validation messages and six-row date calendars remain reachable with large text.
- Cycle dates support previous months and exact dates. Invalid cycle drafts stay
  editable without writing NaN; Help and disabling context preserve valid data.
- Custom time/duration entry survives a visit to presets, optional deadlines can
  be cleared, and invalid task dates/availability give actionable feedback.
- Rationale Actions opens the existing menu. Add/Edit Back returns to its actual
  caller; Daily retains its selected day and More view through external screens.
- Explicit task/cycle/progress saves check persistence before showing success.
  Offline notices suspend, rather than discard, unsaved forms and picker focus.
- Accepted-plan screens do not display a pending infeasible draft after Back.
- Repeated partial recovery keeps unique history IDs. Recovery Actions targets
  the exact unfinished block/part, never an unrelated block or split sibling.
- Midnight-ending protected blocks remain valid during adjustment. User-pinned
  flexible blocks can be unlocked; original fixed commitments remain protected.
- Loading cleanup cancels both timers so an old generation cannot replace a
  newer screen. Adjustment ranges use the shared radio keyboard behavior.

Tests use synthetic inputs only. User-provided screenshots were not uploaded.
A subsequent owner-authorized block adds editable cycle-work preferences and local backups. Its separate domain and browser regressions cover actual ranking, neutral fallbacks, duration conservation, import validation and stale-tab protection. See the root README and current architecture/evidence documents for the implemented behavior and release scope.
