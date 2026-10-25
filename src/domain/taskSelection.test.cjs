/* Run: node src/domain/taskSelection.test.cjs. No network or browser needed. */
const fs = require('fs'), path = require('path'), ts = require('typescript'), assert = require('node:assert/strict');
// Freeze the full domain, including Apply's default clock, independently of the
// actual machine date. Individual cases advance this same clock explicitly.
const RealDate = Date;
let clockNow = new RealDate('2026-10-12T08:00:00').getTime();
class ControlledDate extends RealDate {
  constructor(...args) { if (args.length) super(...args); else super(clockNow); }
  static now() { return clockNow; }
}
global.Date = ControlledDate;
const cache = new Map();
function load(file) {
  file = path.resolve(file); if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'module', 'exports', output)(name => name.startsWith('.') ? load(path.resolve(path.dirname(file), name) + '.ts') : require(name), module, module.exports);
  return module.exports;
}
const d = load(path.join(__dirname, 'index.ts'));
const { proposeTaskSelection, validateTaskSelectionProposal } = load(path.join(__dirname, 'taskSelection.ts'));
const day = '2026-10-12';
const availability = Object.fromEntries(d.DAYS.map(name => [name, '09:00–17:00']));
const task = (id, extra = {}) => ({ id, title: id, kind: 'Flexible', duration: '30 min', meta: '30 min', importance: 'Important', ...extra });
const existing = [task('existing', { duration: '60 min' }), task('completed'), task('partial', { duration: '60 min' }), task('fixed-existing', { kind: 'Fixed', fixedDate: day, startTime: '13:00', duration: '45 min' })];
const selected = task('selected', { duration: '45 min', deadline: day });
const untouched = task('unselected', { duration: '75 min', deadline: '2026-10-13' });
const input = { weekStart: day, availability, commitments: [], tasks: [...existing, selected, untouched] };
let state = { ...d.createInitialState(), ...input, acceptedPlan: d.generateWeeklyPlan({ ...input, tasks: existing }), onboardingComplete: true };
state = d.updateBlockStatus(state, 'task-completed', 'done');
state = d.updateBlockStatus(state, 'task-partial', 'partial');
const before = JSON.stringify(state), originalTasks = JSON.stringify(input.tasks);
const preview = proposeTaskSelection(state.acceptedPlan, input, ['selected', 'selected'], day);
assert.deepEqual(preview.errors, []);
assert.deepEqual(preview.selectedTaskIds, ['selected']);
assert.deepEqual(preview.before, state.acceptedPlan);
assert.equal(preview.after.blocks.length, state.acceptedPlan.blocks.length + 1);
for (const block of state.acceptedPlan.blocks) assert.deepEqual(preview.after.blocks.find(item => item.id === block.id), block);
assert.equal(preview.after.blocks.find(block => block.taskId === 'selected').duration, '45 min');
assert.ok(!preview.after.blocks.some(block => block.taskId === 'unselected'));
assert.equal(JSON.stringify(state), before); assert.equal(JSON.stringify(input.tasks), originalTasks);
assert.deepEqual(preview, proposeTaskSelection(state.acceptedPlan, input, ['selected'], day));
const applied = d.applyProposal(state, preview);
assert.equal(applied.history.at(-1).kind, 'adjust');
assert.equal(applied.tasks.find(item => item.id === 'selected').done, false);
assert.deepEqual(applied.tasks.find(item => item.id === 'unselected'), untouched);
assert.deepEqual(d.undoLastChange(applied).acceptedPlan, state.acceptedPlan);
assert.throws(() => d.applyProposal(applied, preview), /changed/);

for (const ids of [[], ['missing'], ['existing'], ['completed'], ['partial']]) {
  const bad = proposeTaskSelection(state.acceptedPlan, { ...input, tasks: state.tasks }, ids, day);
  assert.ok(bad.errors.length); assert.deepEqual(bad.after, state.acceptedPlan); assert.deepEqual(bad.changes, []);
}
const fullInput = { ...input, tasks: [...input.tasks, task('cannot-fit', { duration: '24 hours' })] };
const cannotFit = proposeTaskSelection(state.acceptedPlan, fullInput, ['selected', 'cannot-fit'], day);
assert.ok(cannotFit.errors.some(error => error.includes('available time')));
assert.deepEqual(cannotFit.after, state.acceptedPlan); assert.deepEqual(cannotFit.changes, []);
assert.throws(() => d.applyProposal({ ...state, tasks: fullInput.tasks }, cannotFit));
assert.equal(JSON.stringify(state), before);

const fixedTask = task('selected-fixed', { kind: 'Fixed', fixedDate: '2026-10-13', startTime: '12:15', duration: '45 min', deadline: '2026-10-13' });
const fixedInput = { ...input, tasks: [...input.tasks, fixedTask] };
const fixed = proposeTaskSelection(state.acceptedPlan, fixedInput, [fixedTask.id], day);
assert.deepEqual(fixed.errors, []);
assert.deepEqual(fixed.after.blocks.find(block => block.taskId === fixedTask.id).time, '12:15–13:00');
const collision = proposeTaskSelection(state.acceptedPlan, { ...fixedInput, tasks: [...input.tasks, { ...fixedTask, fixedDate: day, startTime: '13:00' }] }, [fixedTask.id], day);
assert.ok(collision.errors.some(error => error.includes('overlap'))); assert.deepEqual(collision.after, state.acceptedPlan);
for (const changes of [{ deadline: '2026-10-11' }, { deadline: 'unreadable date' }]) {
  const blocked = proposeTaskSelection(state.acceptedPlan, { ...input, tasks: [...existing, { ...selected, ...changes }, untouched] }, ['selected'], day);
  assert.ok(blocked.errors.some(error => error.includes('deadline'))); assert.deepEqual(blocked.after, state.acceptedPlan);
}
const pastFixed = proposeTaskSelection(state.acceptedPlan, { ...fixedInput, tasks: [...input.tasks, { ...fixedTask, fixedDate: '2026-10-11' }] }, [fixedTask.id], day);
assert.ok(pastFixed.errors.some(error => error.includes('passed'))); assert.deepEqual(pastFixed.after, state.acceptedPlan);

// Explicitly selecting deferred work reintroduces only that task, preserving all
// other deferred and unscheduled records. Neither selection nor preview mutates.
const deferredPlan = { ...d.clone(state.acceptedPlan), deferredTaskIds: ['selected', 'unselected'], unscheduled: [
  { taskId: 'selected', title: 'selected', reason: 'Deferred by you.' },
  { taskId: 'unselected', title: 'unselected', reason: 'Deferred by you.' },
] };
const resumed = proposeTaskSelection(deferredPlan, input, ['selected'], day);
assert.deepEqual(resumed.errors, []); assert.deepEqual(resumed.after.deferredTaskIds, ['unselected']);
assert.deepEqual(resumed.after.unscheduled, [deferredPlan.unscheduled[1]]);
assert.equal(deferredPlan.unscheduled.length, 2);

// A fresh draft schedules the explicit selection and current fixed commitments.
const freshInput = { ...input, commitments: [{ id: 'lunch', title: 'Lunch', date: day, startTime: '12:00', endTime: '13:00' }] };
const fresh = proposeTaskSelection(null, freshInput, ['selected'], day);
assert.deepEqual(fresh.errors, []); assert.equal(fresh.before, null);
assert.deepEqual(fresh.after.blocks.map(block => block.taskId).filter(Boolean), ['selected']);
assert.ok(fresh.after.blocks.some(block => block.id === 'commitment-lunch'));
const freshState = { ...d.createInitialState(), ...freshInput };
const freshApplied = d.applyDraftProposal(freshState, fresh);
assert.equal(freshApplied.acceptedPlan, null); assert.equal(freshApplied.draftPlan.blocks.length, 2);
assert.equal(freshState.draftPlan, null);
assert.throws(() => d.applyDraftProposal({ ...freshState, commitments: [{ ...freshInput.commitments[0], startTime: '12:15' }] }, fresh), /fixed commitment changed/);

// Commit-time validation must reject inputs changed after a safe preview even
// when the accepted plan snapshot has stayed byte-for-byte identical.
for (const change of [{ duration: '90 min' }, { deadline: '2026-10-11' }, { done: true }, { kind: 'Fixed', fixedDate: day, startTime: '16:00' }]) {
  const updatedTasks = state.tasks.map(item => item.id === 'selected' ? { ...item, ...change } : item);
  assert.ok(validateTaskSelectionProposal(preview, { ...input, tasks: updatedTasks }).length);
  assert.throws(() => d.applyProposal({ ...state, tasks: updatedTasks }, preview));
}
const removed = state.tasks.filter(item => item.id !== 'selected');
assert.ok(validateTaskSelectionProposal(preview, { ...input, tasks: removed }).length);
assert.throws(() => d.applyProposal({ ...state, tasks: removed }, preview));
const changedFixed = fixedInput.tasks.map(item => item.id === fixedTask.id ? { ...item, startTime: '14:00' } : item);
assert.ok(validateTaskSelectionProposal(fixed, { ...fixedInput, tasks: changedFixed }).some(error => error.includes('fixed')));
assert.throws(() => d.applyProposal({ ...state, tasks: changedFixed }, fixed), /fixed/);
const chosen = preview.after.blocks.find(block => block.taskId === 'selected');
const newCommitment = { id: 'new', title: 'New appointment', date: chosen.dateISO, startTime: chosen.start, endTime: d.clock(d.minutes(chosen.start) + 30) };
assert.throws(() => d.applyProposal({ ...state, commitments: [newCommitment] }, preview), /commitment/);
const changedExisting = d.clone(preview); changedExisting.after.blocks.find(block => block.taskId === 'existing').title = 'Unexpected rewrite';
assert.ok(validateTaskSelectionProposal(changedExisting, input).some(error => error.includes('unchanged')));
assert.throws(() => d.applyProposal(state, changedExisting), /unchanged/);
assert.deepEqual(validateTaskSelectionProposal({ ...preview, selectedTaskIds: undefined }, input), []);

// Existing reservations can end at midnight without corrupting or dropping them.
const midnight = { ...d.clone(state.acceptedPlan), blocks: [d.makeBlock('late', 'Late work', day, 23 * 60, 60, { fixed: true })] };
const midnightPreview = proposeTaskSelection(midnight, input, ['selected'], day);
assert.deepEqual(midnightPreview.errors, []); assert.deepEqual(midnightPreview.after.blocks.find(block => block.id === 'late'), midnight.blocks[0]);

// A live preview cannot be applied after a newly selected start passes, even
// when no plan or task data changed. Historical protected blocks are exempt.
assert.deepEqual(validateTaskSelectionProposal(preview, input), []);
const fixtureStart = preview.after.blocks.find(block => block.taskId === 'selected');
assert.ok(validateTaskSelectionProposal(preview, input, new Date(`${fixtureStart.dateISO}T${fixtureStart.start}:01`)).some(error => error.includes('start time has passed')));
try {
  const live = proposeTaskSelection(state.acceptedPlan, input, ['selected']);
  assert.deepEqual(live.errors, []);
  const addition = live.after.blocks.find(block => block.taskId === 'selected');
  const startsAt = new RealDate(`${addition.dateISO}T${addition.start}:00`).getTime();
  clockNow = startsAt - 1;
  assert.deepEqual(validateTaskSelectionProposal(live, input), []);
  assert.doesNotThrow(() => d.applyProposal(state, live));
  assert.ok(state.acceptedPlan.blocks.some(block => new RealDate(`${block.dateISO}T${block.start}:00`).getTime() < clockNow));
  clockNow = startsAt + 1;
  assert.throws(() => d.applyProposal(state, live), /start time has passed/);
  assert.equal(JSON.stringify(state), before);
  clockNow = new RealDate(`${day}T08:00:00`).getTime();
  const liveFixed = proposeTaskSelection(state.acceptedPlan, fixedInput, [fixedTask.id]);
  assert.deepEqual(liveFixed.errors, []);
  clockNow = new RealDate(`${fixedTask.fixedDate}T${fixedTask.startTime}:01`).getTime();
  assert.throws(() => d.applyProposal({ ...state, tasks: fixedInput.tasks }, liveFixed), /start time has passed/);
  // An explicit planning date never bypasses the real-time Apply guard. Tests
  // can instead inject their intended clock directly into the validator.
  assert.ok(validateTaskSelectionProposal(preview, input).some(error => error.includes('start time has passed')));
  assert.deepEqual(validateTaskSelectionProposal(preview, input, new RealDate(`${day}T08:00:00`)), []);
} finally {
  global.Date = RealDate;
}
console.log('Selected backlog planning passed: atomic previews, protected blocks, selected-only additions, no-fit, duration/deadline/fixed constraints, commit revalidation, elapsed-start guards, deterministic clock fixtures, draft creation, explicit deferred work and undo.');
