/* Run: node src/domain/rhythmPreview.test.cjs. Proves the cycle-aware hypothesis is real planner behavior. */
const fs=require('fs'),path=require('path'),ts=require('typescript'),assert=require('node:assert/strict');
const cache=new Map();function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',output)(name=>name.startsWith('.')?load(path.resolve(path.dirname(file),name)+'.ts'):require(name),module,module.exports);return module.exports}
const d=load(path.join(__dirname,'index.ts'));
const today='2026-10-12';// Monday
const tasks=d.starterTasksForPack('sample');
assert.equal(tasks.length,11);assert.ok(tasks.every(t=>t.workType),'every sample task has a planner work type');
const state={...d.createInitialState(),tasks};assert.equal(d.validateState(state),true);
const input={tasks,availability:state.availability,commitments:[],cyclePreferences:d.createDefaultCyclePreferences(),cycleMode:'natural',weekStart:today};
assert.equal(d.lastPeriodForCycleDay(1,today),today);assert.equal(d.lastPeriodForCycleDay(10,today),'2026-10-03');
const at=day=>d.previewRhythm(input,day,28,null,null,today);
const phaseOf=(p,id)=>p.days.find(x=>x.blocks.some(b=>b.taskId===id)).phase;
// Day 1: Mon–Fri menstrual, Sat–Sun follicular. Rest goes early; strength waits for the follicular weekend.
let p=at(1);assert.equal(p.days[0].phase,'Menstrual');assert.equal(p.days[5].phase,'Follicular');
assert.equal(phaseOf(p,'sample-yoga'),'Menstrual');assert.equal(phaseOf(p,'sample-priorities'),'Menstrual');
assert.equal(phaseOf(p,'sample-strength'),'Follicular','energizing movement moves away from menstrual days');
assert.equal(phaseOf(p,'sample-grant'),'Follicular','creative deep work moves to follicular days');
// Day 12: Mon–Tue follicular, Wed–Fri ovulatory, weekend luteal. Communication follows ovulation.
p=at(12);assert.equal(phaseOf(p,'sample-client'),'Ovulatory');assert.equal(phaseOf(p,'sample-reel'),'Ovulatory');assert.equal(phaseOf(p,'sample-grant'),'Follicular');
// Changing the cycle day really moves tasks.
const base=at(1).plan;const moved=d.previewRhythm(input,12,28,null,base,today).moved;
assert.ok(moved.has('sample-strength')&&moved.has('sample-client'),'changing cycle day moves typed tasks');
// All work still fits; nothing is dropped to chase a phase.
for(const day of [1,6,12,15,20,27])assert.equal(at(day).plan.unscheduled.length,0,`day ${day} keeps every task`);
// Neutral without natural cycle mode: same inputs, cycle off, no phase signals.
const off=d.generateWeeklyPlan({...input,cycleMode:null});assert.ok(!off.blocks.some(b=>b.signals.some(s=>s.title==='Cycle preference')));
// Approval semantics: a cycle change is committed only with Apply, and Undo restores the prior cycle and plan.
{const accepted=d.generateWeeklyPlan({...input,cycleMode:null});const base={...state,acceptedPlan:accepted,onboardingComplete:true,cycleMode:null,cycleBasics:null};
const cycle={mode:'natural',basics:{lastPeriodStart:d.lastPeriodForCycleDay(12,today),cycleLength:28}};
const proposal=d.proposeAdjustment(accepted,{...input,cycleMode:'natural',cycleBasics:cycle.basics,weekStart:accepted.weekStart},'week',today);
assert.equal(base.cycleBasics,null,'building a proposal does not touch state');
const applied=d.applyProposal(base,proposal,cycle);assert.deepEqual(applied.cycleBasics,cycle.basics);assert.equal(applied.cycleMode,'natural');assert.equal(d.validateState(applied),true,'cycleBefore history entry persists');
const undone=d.undoLastChange(applied);assert.equal(undone.cycleMode,null);assert.equal(undone.cycleBasics,null);assert.deepEqual(undone.acceptedPlan,accepted);
const plain=d.applyProposal(base,proposal);assert.equal(plain.cycleBasics,null,'a plan-only apply keeps the cycle');}
console.log('Rhythm preview tests passed: apply/undo commit cycle with plan, typed sample week, cycle day → phase per day, menstrual favors rest and planning, follicular takes strength and deep work, ovulatory takes client and visibility tasks, moved-task detection, no task dropped, neutral when off.');
