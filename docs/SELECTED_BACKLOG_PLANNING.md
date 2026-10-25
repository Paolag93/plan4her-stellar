# Selected backlog planning

The live Tasks backlog intentionally differs from the original canonical Figma
examples following the user's updated instruction: a checkbox selects an
unscheduled task for planning. It does not complete that task. A separate
**Mark done** action records completion, and Today retains its existing
completion flow.

- Unscheduled tasks show a selected count, Clear selection, and Add to plan.
- Add to plan previews only the selected tasks. Apply is required to save it.
- Existing planned tasks remain accessible in a separate In plan section. They
  cannot be selected for planning a second time.
- Current blocks, including completed and partial work, are reserved unchanged.
  Unselected tasks and their duration, deadline, and fixed-time inputs are retained.
- Selected tasks keep their complete duration and explicit deadline/fixed times.
  The commit validates current inputs again in case they changed after preview.
  Live previews also expire when a newly selected block's start time passes;
  applying then asks for a fresh preview. Existing historical blocks are exempt.
- If any selected task cannot fit, the entire batch stays unchanged and an error
  explains the constraint. Selection does not silently shorten or move work.
- Selecting previously deferred unscheduled work explicitly reintroduces that
  task only. Other deferred tasks stay deferred.
- This uses the existing deterministic availability planner. Cycle context is
  informational and does not change scheduling.

The `?qa=tasks...` canonical examples keep their original completion-checkbox
behavior and layout for reference screenshot comparisons. They are examples,
not the live backlog interaction contract. New live browser regressions cover
selection, preview/cancel/apply, explicit completion, exact fixed times, no-fit
atomicity, reload persistence, and the unchanged Today completion flow.
