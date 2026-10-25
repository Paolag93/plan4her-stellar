/* Run: node src/domain/cyclePreferences.test.cjs. Local TypeScript only. */
const fs = require('fs'), path = require('path'), ts = require('typescript'), assert = require('node:assert/strict');
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'module', 'exports', output)(name => name.startsWith('.') ? load(path.resolve(path.dirname(file), name) + '.ts') : require(name), module, module.exports);
  return module.exports;
}
const d = load(path.join(__dirname, 'index.ts'));
const c = load(path.join(__dirname, 'cyclePreferences.ts'));
const task = (id, extra = {}) => ({ id, title: id, kind: 'Flexible', duration: '30 min', meta: '30 min', importance: 'Important', ...extra });
const availability = Object.fromEntries(d.DAYS.map(day => [day, '09:00–12:00']));
const input = {
  weekStart: '2026-10-05', availability, commitments: [],
  cycleMode: 'natural', cycleBasics: { lastPeriodStart: '2026-10-04', cycleLength: 28 },
  cyclePreferences: c.createDefaultCyclePreferences(), tasks: [task('create', { workType: 'creation-start' })],
};
const blockFor = (plan, id) => plan.blocks.find(block => block.taskId === id);
const preferred = d.generateWeeklyPlan(input);
assert.equal(blockFor(preferred, 'create').dateISO, '2026-10-09');
assert.equal(blockFor(preferred, 'create').duration, '30 min');
assert.match(blockFor(preferred, 'create').rationale, /work preference favored/);
assert.match(blockFor(preferred, 'create').signals.find(signal => signal.title === 'Cycle preference').body, /2026-10-09 \(cycle day 6\)/);
assert.deepEqual(d.validatePlan(preferred, availability, input.tasks), []);
assert.deepEqual(preferred, d.generateWeeklyPlan(input));
assert.equal(input.cyclePreferences.phaseWork.Follicular[0], 'creation-start');

// Unset task classification is General, never inferred from a suggestive title.
const general = { ...input, tasks: [task('general', { title: 'Create a project presentation' })] };
const generalPlan = d.generateWeeklyPlan(general);
assert.equal(blockFor(generalPlan, 'general').dateISO, '2026-10-05');
assert.ok(!blockFor(generalPlan, 'general').signals.some(signal => signal.title === 'Cycle preference'));
assert.deepEqual(generalPlan, d.generateWeeklyPlan({ ...general, cycleMode: null }));

// Neither unknown/off modes nor invalid cycle inputs activate any template.
const baseline = d.generateWeeklyPlan({ ...input, cycleMode: null });
for (const mode of [undefined, null, 'unsure', 'predictable', 'unknown']) {
  for (const template of c.PLANNING_TEMPLATES) {
    const candidate = d.generateWeeklyPlan({ ...input, cycleMode: mode, cyclePreferences: { ...input.cyclePreferences, template } });
    assert.deepEqual(candidate, baseline, `${String(mode)} / ${template}`);
  }
}
for (const cycleBasics of [null, { lastPeriodStart: null, cycleLength: 28 }, { lastPeriodStart: '2026-02-30', cycleLength: 28 }, { lastPeriodStart: '2026-10-04', cycleLength: 14 }, { lastPeriodStart: '2026-10-04', cycleLength: 28.5 }, { lastPeriodStart: '2026-11-01', cycleLength: 28 }]) {
  assert.deepEqual(d.generateWeeklyPlan({ ...input, cycleBasics }), baseline);
}

// Mappings are editable and empty phase mappings are meaningful, valid choices.
const custom = c.createDefaultCyclePreferences();
custom.phaseWork.Menstrual = ['creation-start']; custom.phaseWork.Follicular = [];
assert.equal(blockFor(d.generateWeeklyPlan({ ...input, cyclePreferences: custom }), 'create').dateISO, '2026-10-05');
assert.deepEqual(c.createDefaultCyclePreferences().phaseWork.Follicular, ['creation-start']);
const noMapping = { ...custom, phaseWork: Object.fromEntries(c.CYCLE_PHASES.map(phase => [phase, []])) };
assert.equal(blockFor(d.generateWeeklyPlan({ ...input, cyclePreferences: noMapping }), 'create').dateISO, '2026-10-05');

// Dates and availability are hard constraints even when no phase match fits.
const dueMonday = d.generateWeeklyPlan({ ...input, tasks: [task('deadline', { workType: 'creation-start', deadline: '2026-10-05' })] });
assert.equal(blockFor(dueMonday, 'deadline').dateISO, '2026-10-05');
assert.match(blockFor(dueMonday, 'deadline').signals.find(signal => signal.title === 'Deadline').body, /2026-10-05/);
assert.match(blockFor(dueMonday, 'deadline').signals.find(signal => signal.title === 'Duration estimate').body, /30 minute/);
assert.match(blockFor(dueMonday, 'deadline').signals.find(signal => signal.title === 'Cycle preference').body, /No feasible time matched/);
const tooLong = d.generateWeeklyPlan({ ...input, availability: Object.fromEntries(d.DAYS.map(day => [day, '09:00–09:15'])) });
assert.equal(tooLong.blocks.length, 0); assert.equal(tooLong.unscheduled.length, 1);

// Preference fragmentation must not lose any task the earliest plan could fit.
const crowdedInput = {
  ...input,
  availability: Object.fromEntries(d.DAYS.map(day => [day, day === 'Monday' ? '09:00–09:30' : day === 'Friday' ? '09:00–10:00' : ''])),
  tasks: [task('small-must', { importance: 'Must', workType: 'creation-start' }), task('large-important', { duration: '60 min' })],
};
const crowded = d.generateWeeklyPlan(crowdedInput);
assert.equal(crowded.unscheduled.length, 0);
assert.equal(blockFor(crowded, 'small-must').dateISO, '2026-10-05');
assert.equal(blockFor(crowded, 'large-important').dateISO, '2026-10-09');
assert.equal(crowded.scheduledMinutes, 90);
assert.ok(crowded.blocks.every(block => block.signals.some(signal => signal.title === 'Planning preference' && /left other work unscheduled/.test(signal.body))));
assert.deepEqual(d.validatePlan(crowded, crowdedInput.availability, crowdedInput.tasks), []);

// A match never lets optional work displace Must work in an overloaded week.
const priorityInput = { ...input, availability: Object.fromEntries(d.DAYS.map(day => [day, day === 'Friday' ? '09:00–09:30' : ''])), tasks: [task('optional', { importance: 'Optional', workType: 'creation-start' }), task('must', { importance: 'Must', workType: 'review-planning' })] };
const priorityPlan = d.generateWeeklyPlan(priorityInput);
assert.equal(priorityPlan.blocks.length, 1); assert.equal(priorityPlan.blocks[0].taskId, 'must');
assert.equal(priorityPlan.unscheduled[0].taskId, 'optional');

// Fixed tasks and commitments stay at exactly the chosen dates and times.
const fixedInput = { ...input, commitments: [{ id: 'meeting', title: 'Meeting', date: '2026-10-09', startTime: '09:00', endTime: '10:00' }], tasks: [...input.tasks, task('fixed', { kind: 'Fixed', fixedDate: '2026-10-06', startTime: '11:00', workType: 'creation-start' })] };
const fixedPlan = d.generateWeeklyPlan(fixedInput);
assert.equal(blockFor(fixedPlan, 'create').start, '10:00');
assert.equal(blockFor(fixedPlan, 'fixed').dateISO, '2026-10-06');
assert.equal(blockFor(fixedPlan, 'fixed').start, '11:00');
assert.equal(fixedPlan.blocks.find(block => block.id === 'commitment-meeting').start, '09:00');
assert.deepEqual(d.validatePlan(fixedPlan, availability, fixedInput.tasks), []);

// Recovery distributes full blocks across least-booked days, not smaller tasks.
const templateInput = { ...input, tasks: [task('a'), task('b'), task('c')] };
const balanced = d.generateWeeklyPlan(templateInput);
const recovery = d.generateWeeklyPlan({ ...templateInput, cyclePreferences: { ...input.cyclePreferences, template: 'recovery' } });
assert.deepEqual(balanced.blocks.map(block => block.dateISO), ['2026-10-05', '2026-10-05', '2026-10-05']);
assert.deepEqual(recovery.blocks.map(block => block.dateISO), ['2026-10-05', '2026-10-06', '2026-10-07']);
assert.equal(recovery.scheduledMinutes, balanced.scheduledMinutes);
assert.ok(blockFor(recovery, 'b').signals.some(signal => signal.title === 'Planning template' && /fewer minutes already booked/.test(signal.body)));
assert.ok(!blockFor(recovery, 'b').signals.some(signal => /phase/i.test(signal.body)), 'General work never claims phase matching');

// High-output stays close to prior flexible work even when an earlier day fits.
const compactInput = { ...input, tasks: [task('a-create', { workType: 'creation-start' }), task('b-general')] };
const compact = d.generateWeeklyPlan({ ...compactInput, cyclePreferences: { ...input.cyclePreferences, template: 'high-output' } });
assert.equal(blockFor(compact, 'a-create').dateISO, '2026-10-09');
assert.equal(blockFor(compact, 'b-general').dateISO, '2026-10-09');
assert.equal(blockFor(compact, 'b-general').start, '09:30');
assert.equal(compact.scheduledMinutes, 60);
assert.ok(blockFor(compact, 'b-general').signals.some(signal => signal.title === 'Planning template' && /nearest already planned flexible work/.test(signal.body)));

// Adjustment reservations preserve pinned and partially executed blocks exactly.
const pinned = d.clone(preferred); pinned.blocks[0].fixed = true;
const adjusted = d.proposeAdjustment(pinned, { ...input, tasks: [...input.tasks, task('second', { workType: 'creation-start' })], cyclePreferences: custom }, 'week', '2026-10-05');
assert.deepEqual(adjusted.errors, []);
assert.deepEqual(blockFor(adjusted.after, 'create'), pinned.blocks[0]);

// Protected flexible blocks remain compact-template neighbors during selected
// backlog additions, despite being converted to fixed reservations internally.
const RealDate = Date;
class SelectionClock extends RealDate {
  constructor(...args) { if (args.length) super(...args); else super('2026-10-05T08:00:00'); }
  static now() { return new RealDate('2026-10-05T08:00:00').getTime(); }
}
global.Date = SelectionClock;
try {
  const anchor = d.makeBlock('task-anchor', 'Existing flexible work', '2026-10-05', 16 * 60, 60, { taskId: 'anchor' });
  const pin = d.makeBlock('task-pin', 'Pinned flexible work', '2026-10-05', 11 * 60, 30, { taskId: 'pin', fixed: true });
  const anchorInput = { ...input, availability: Object.fromEntries(d.DAYS.map(day => [day, '09:00–18:00'])), cyclePreferences: { ...input.cyclePreferences, template: 'high-output' }, tasks: [task('anchor', { duration: '60 min' }), task('pin'), task('add')] };
  const anchorPlan = d.recalculate({ ...d.generateWeeklyPlan({ ...anchorInput, tasks: [] }), warnings: [], blocks: [anchor, pin] });
  const before = JSON.stringify(anchorPlan);
  const selection = d.proposeTaskSelection(anchorPlan, anchorInput, ['add'], '2026-10-05');
  assert.deepEqual(selection.errors, []);
  assert.equal(blockFor(selection.after, 'add').start, '15:30');
  assert.equal(blockFor(selection.after, 'add').duration, '30 min');
  assert.deepEqual(blockFor(selection.after, 'anchor'), anchor);
  assert.deepEqual(blockFor(selection.after, 'pin'), pin);
  assert.equal(JSON.stringify(anchorPlan), before);
  assert.deepEqual(d.validatePlan(selection.after, anchorInput.availability, anchorInput.tasks), []);
  const neutral = d.proposeTaskSelection(anchorPlan, { ...anchorInput, cycleMode: null }, ['add'], '2026-10-05');
  assert.deepEqual(neutral.errors, []); assert.equal(blockFor(neutral.after, 'add').start, '09:00');
  const onlyPin = d.proposeTaskSelection({ ...anchorPlan, blocks: [pin] }, anchorInput, ['add'], '2026-10-05');
  assert.deepEqual(onlyPin.errors, []); assert.equal(blockFor(onlyPin.after, 'add').start, '09:00', 'Pinned work is not relabeled as a flexible neighbor');
  const fridayAnchor = d.makeBlock('task-anchor', 'Friday flexible work', '2026-10-09', 10 * 60, 30, { taskId: 'anchor' });
  const crossDayInput = { ...anchorInput, availability: Object.fromEntries(d.DAYS.map(day => [day, ['Monday', 'Friday'].includes(day) ? '09:00–12:00' : ''])) };
  const crossDay = d.proposeTaskSelection({ ...anchorPlan, blocks: [fridayAnchor] }, crossDayInput, ['add'], '2026-10-05');
  assert.deepEqual(crossDay.errors, []);
  assert.equal(blockFor(crossDay.after, 'add').dateISO, '2026-10-09');
  assert.equal(blockFor(crossDay.after, 'add').start, '09:30');
  assert.deepEqual(blockFor(crossDay.after, 'anchor'), fridayAnchor);
  // Started work is also protected during adjustment. Its remaining duration
  // and original status stay identical while another block is compacted nearby.
  const partialAnchor = { ...anchor, status: 'partial', completedMinutes: 15, remainingMinutes: 45 };
  const adjustment = d.proposeAdjustment({ ...anchorPlan, blocks: [partialAnchor, pin] }, anchorInput, 'week', '2026-10-05');
  assert.deepEqual(adjustment.errors, []);
  assert.equal(blockFor(adjustment.after, 'add').start, '15:30');
  assert.deepEqual(blockFor(adjustment.after, 'anchor'), partialAnchor);
  assert.deepEqual(blockFor(adjustment.after, 'pin'), pin);
} finally { global.Date = RealDate; }

// One shared calendar-date heuristic supports display and scheduling.
const cycle = { enabled: true, mode: 'natural', lastPeriodStart: '2026-10-01', cycleLength: 28 };
assert.deepEqual(c.estimateCycleContext('2026-10-06', cycle), { status: 'estimated', day: 6, phase: 'Follicular' });
assert.deepEqual(c.estimateCycleContext('2026-10-14', cycle), { status: 'estimated', day: 14, phase: 'Ovulatory' });
assert.deepEqual(c.estimateCycleContext('2026-10-17', cycle), { status: 'estimated', day: 17, phase: 'Luteal' });
assert.deepEqual(c.estimateCycleContext('2026-10-29', cycle), { status: 'estimated', day: 1, phase: 'Menstrual' });
assert.equal(c.estimateCycleContext('2026-10-06', { ...cycle, mode: 'predictable' }).status, 'unsupported-pattern');
assert.equal(c.estimateCycleContext('2026-10-06', { ...cycle, enabled: false }).status, 'off');
assert.equal(c.estimateCycleContext('2026-10-06', { ...cycle, lastPeriodStart: '2026-02-30' }).status, 'invalid-date');
assert.equal(c.estimateCycleContext('2026-09-30', cycle).status, 'before-start');

// Additive schema migration preserves older local data, never normalizes corruption.
const state = { ...d.createInitialState(), ...input, acceptedPlan: preferred, draftPlan: preferred };
assert.equal(d.validateState(state), false, 'Planner-only weekStart is not a state key');
delete state.weekStart;
assert.equal(d.validateState(state), true);
let saved = null;
const storage = { getItem: () => saved, setItem: (_, value) => { saved = value; }, removeItem: () => { saved = null; } };
assert.deepEqual(d.saveState(state, storage), {}); assert.deepEqual(d.loadState(storage).state, state);
const old = d.clone(state); delete old.cyclePreferences;
assert.equal(d.validateState(old), true);
assert.deepEqual(d.migrateState(old).cyclePreferences, c.createDefaultCyclePreferences());
assert.equal(old.cyclePreferences, undefined);
for (const corrupt of [
  { ...state, cyclePreferences: null },
  { ...state, cyclePreferences: { ...custom, template: 'medical' } },
  { ...state, cyclePreferences: { ...custom, extra: true } },
  { ...state, cyclePreferences: { ...custom, phaseWork: { ...custom.phaseWork, Menstrual: ['review-planning', 'review-planning'] } } },
  { ...state, cyclePreferences: { ...custom, phaseWork: { ...custom.phaseWork, Menstrual: ['invented'] } } },
  { ...state, cyclePreferences: { ...custom, phaseWork: { Menstrual: [] } } },
  { ...state, tasks: [task('bad', { workType: 'inferred-health' })] },
]) {
  assert.equal(d.validateState(corrupt), false);
  const raw = JSON.stringify(corrupt); let writes = 0;
  const corruptStorage = { getItem: () => raw, setItem: () => { writes++; } };
  assert.ok(d.loadState(corruptStorage).error);
  assert.ok(d.saveState(state, corruptStorage).error);
  assert.equal(writes, 0);
}
console.log('Cycle preference tests passed: neutral modes, editable mappings, feasible phase matching, templates, duration/deadline/priority conservation, capacity fallback, pins, truthful reasons, shared estimates and strict additive migration.');
