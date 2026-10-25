# Canonical flow reconciliation

This increment closes independently verified gaps in the current prototype. It is
not evidence that every frame in the whole Figma file, or every original-chat
requirement, has been implemented. The full inventory is a separate review.

## Source evidence

File: `zctnzXqin1jZJLvxBlVxZz`, active prototype page `4088:182`.

- START `4200:1120`, action `4500:6059`: “See how Plan4Her works” opens
  Rhythm `4198:16`, then Control `4198:27`; setup proceeds to privacy `4800:6686`.
- Unsure mode `4272:2068`, action `4272:2078`: Continue opens no-exact-date
  `4272:2163`, rather than skipping directly to starter tasks.
- Quick Capture `4198:239`, Cancel `4198:252`: returns to Today. Header Back
  returns to the actual caller.
- Save error `4250:4278`: Try again `4250:4285` returns to difference preview
  `4199:1180`; Keep current plan `4250:4286` returns to active plan `4198:286`.
  Its wording specifically concerns a failed save and an unchanged current plan,
  so retry must preserve the pending proposal, not regenerate a week.
- Planning contract `4462:19964`: validate before preview, before commit and after
  restore. `4462:19983–19985`: explicit latest finish is enforced, never inferred,
  and no-fit is surfaced when the work cannot fit. The present task schema supplies
  date-only deadlines. These remain end-of-day constraints, not invented clock-time
  deadlines. Completed execution is historical evidence, not work to reschedule.

## Verification boundaries

The new intro image references are original Figma exports. Existing screenshot
baselines and thresholds must remain unchanged. Browser comparisons prove the
specified states against those references; passing the aggregate test suite does
not independently prove all-file design fidelity or physical-device usability.

Cycle mapping and its planning semantics are being reconciled separately. This
increment does not introduce a phase/productivity algorithm or an AI provider.

## Reported Privacy & data clipping

The owner reported that enabling the analytics switch cuts off its explanation.
The row had a fixed 52px height plus hidden overflow even when its text occupied
more lines. It now keeps the same text, font, switch and minimum row height, while
expanding to fit the explanation. This intentional content-fit correction applies
to both toggle states; 320/360/390/430px layout checks verify the whole text remains
inside its row and separate from the switch. Canonical PNG references stay intact.

## Requested live cycle-settings cleanup

The owner explicitly requested a consistent date selector and less repeated
“Cycle context” wording. The live screen reuses the existing Settings calendar
instead of a native browser date input. Its summary now shows the estimated day
and saved usual length, with one clear estimate disclaimer. It does not infer a
phase-to-productivity rule or alter task effort. The canonical fixture example
retains its original phase labels; separate live-data tests verify this cleanup.

## Reported Tasks checkmark alignment

The checkbox and 44px touch target were centered, but the check path occupied only
x=0–10 inside a 16px SVG, placing its center 3px left of the box center. The path is
translated by exactly 3px without changing its shape or the touch target. Separate
live-list geometry checks cover checked/unchecked states and 320–1024px viewports.

## Subsequent owner-requested interaction changes

These requests intentionally extend the original preset-only examples:

- Live task and block forms reuse branded date, duration and time dialogs, with
  custom hours/minutes, exact HH:MM, month navigation and ISO date entry.
- Long change/recent/restore lists scroll fully, with reachable actions and
  safe-area padding. Adjustment help opens its canonical article and returns
  without discarding the selected range or pending preview.
- Daily phase colors use the selected date's estimated context and the exact
  four Figma phase tokens. This is display behavior, not a new scheduling policy.
- The live Unscheduled backlog selects work for planning. Add to plan previews
  only selected tasks and preserves existing blocks; Apply revalidates current
  constraints. Completion is a separate explicit action. Planned tasks remain
  available in an In plan section; Today execution controls retain their meaning.

A cycle-specific scheduling rationale remains pending the actual approved
ranking policy. The current planner must not claim that cycle data influenced a
placement when it did not. No task duration is shortened to imitate examples.

The newly displayed menstrual card keeps the exact red phase token. Its small
estimate note is informational, not disabled content. Only that note's opacity
is raised from 72% to 100% to preserve readable contrast (3.37:1 → 4.88:1);
its smaller 12px size, text color and position retain the secondary hierarchy.
Other phase fills, canonical fixture colors and unrelated opacity are unchanged.
