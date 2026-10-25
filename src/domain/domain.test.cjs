/* Run: node src/domain/domain.test.cjs. Uses installed TypeScript; no network or browser. */
const fs=require('fs'),path=require('path'),ts=require('typescript'),assert=require('node:assert/strict');
const cache=new Map();function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',output)(name=>name.startsWith('.')?load(path.resolve(path.dirname(file),name)+'.ts'):require(name),module,module.exports);return module.exports}
const d=load(path.join(__dirname,'index.ts'));const init=d.createInitialState();const availability=Object.fromEntries(d.DAYS.map(day=>[day,'09:00–10:00']));const task=(id,importance='Important',extra={})=>({id,title:id,kind:'Flexible',duration:'60 min',meta:'60 min',importance,...extra});
const input={weekStart:'2026-10-05',availability,commitments:[{id:'meeting',title:'Meeting',date:'2026-10-05',startTime:'09:00',endTime:'10:00'}],tasks:[task('optional','Optional'),task('important'),task('must','Must')]};
const plan=d.generateWeeklyPlan(input);assert.equal(plan.blocks.find(b=>b.taskId==='must').dateISO,'2026-10-06');assert.equal(plan.blocks.find(b=>b.taskId==='optional').dateISO,'2026-10-08');assert.equal(plan.week.length,7);assert.deepEqual(plan,d.generateWeeklyPlan(input));assert.deepEqual(d.validatePlan(plan,availability),[]);
assert.equal(d.generateWeeklyPlan({...input,tasks:[task('deadline','Must',{deadline:'2026-10-05'})]}).unscheduled.length,1);assert.equal(d.generateWeeklyPlan({...input,tasks:Array.from({length:8},(_,i)=>task(String(i)))}).unscheduled.length,2);
const collision=d.generateWeeklyPlan({...input,commitments:[...input.commitments,{id:'clash',title:'Clash',date:'2026-10-05',startTime:'09:30',endTime:'10:00'}]});assert.equal(collision.unscheduled.length,1);assert.deepEqual(d.validatePlan(collision),[]);
let state=d.acceptPlan({...init,availability,tasks:input.tasks,commitments:input.commitments},plan);assert.equal(state.history.length,1);const original=JSON.stringify(state.acceptedPlan);let p=d.proposeRecovery(state.acceptedPlan,'task-must','defer',input,'2026-10-05');assert.equal(JSON.stringify(state.acceptedPlan),original);const applied=d.applyProposal(state,p);assert.equal(applied.acceptedPlan.blocks.length,3);assert.deepEqual(d.undoLastChange(applied).acceptedPlan,state.acceptedPlan);assert.throws(()=>d.applyProposal(applied,p),/changed/);
const restore=d.proposeRestore(applied.acceptedPlan,applied.history.at(-1));assert.deepEqual(restore.after,state.acceptedPlan);assert.deepEqual(d.applyProposal(applied,restore).acceptedPlan,state.acceptedPlan);
const moved=d.proposeRecovery(plan,'task-must','move',input,'2026-10-05');assert.equal(moved.errors.length,0);assert.notEqual(moved.after.blocks.find(b=>b.id==='task-must').dateISO,'2026-10-06');const split=d.proposeRecovery(plan,'task-must','split',input,'2026-10-05');assert.equal(split.errors.length,0);assert.equal(split.after.blocks.filter(b=>b.taskId==='must').length,2);
state=d.updateBlockStatus(state,'task-must','done');assert.equal(state.tasks.find(t=>t.id==='must').done,true);let value=null;const storage={getItem:()=>value,setItem:(_,v)=>{value=v},removeItem:()=>{value=null}};assert.equal(d.saveState(state,storage).error,undefined);assert.deepEqual(d.loadState(storage).state,state);value='{broken';assert.ok(d.loadState(storage).error);assert.equal(value,'{broken');assert.ok(d.saveState(state,{setItem:()=>{throw Error('quota')}}).error);assert.equal(d.clearState(storage).error,undefined);assert.equal(value,null);assert.equal(d.validateState({...state,tasks:[{id:'invalid'}]}),false);assert.equal(d.migrateState({...init,version:0}).version,1);assert.throws(()=>d.migrateState({...init,version:20}));assert.equal(d.starterTasksForPack('work').length,3);assert.ok(d.starterTasksForPack('life','My task').some(t=>t.title==='My task'));
const partialState=d.updateBlockStatus(d.acceptPlan({...init,availability,tasks:input.tasks,commitments:input.commitments},plan),'task-must','partial');assert.equal(partialState.acceptedPlan.blocks.find(b=>b.id==='task-must').remainingMinutes,30);const partialMove=d.proposeRecovery(partialState.acceptedPlan,'task-must','move',input,'2026-10-05');assert.equal(partialMove.errors.length,0);assert.equal(partialMove.after.blocks.find(b=>b.id==='task-must-completed').duration,'30 min');assert.equal(partialMove.after.blocks.find(b=>b.id==='task-must').duration,'30 min');assert.equal(partialMove.after.blocks.filter(b=>b.taskId==='must').reduce((n,b)=>n+d.durationMinutes(b.duration),0),60);const partialDefer=d.proposeRecovery(partialState.acceptedPlan,'task-must','defer',input,'2026-10-05');assert.equal(partialDefer.after.blocks.find(b=>b.id==='task-must-completed').status,'done');assert.match(partialDefer.after.unscheduled.find(t=>t.taskId==='must').reason,/30 min/);
assert.equal(plan.scheduledMinutes,240);assert.equal(plan.scheduledLoad,57);const edited=d.proposeEdit(plan,{id:'task-must',title:'must',date:'Mon 5 Oct',dateISO:'2026-10-05',start:'09:00',duration:'60 min',fixed:false},availability);assert.ok(edited.errors.some(e=>e.includes('overlaps')));const adjusted=d.proposeAdjustment(plan,input,'today','2026-10-07');assert.equal(adjusted.errors.length,0);assert.deepEqual(adjusted.after.blocks.find(b=>b.id==='task-must'),plan.blocks.find(b=>b.id==='task-must'));const withCycle=d.generateWeeklyPlan({...input,cycleBasics:{lastPeriodStart:'2026-10-01',cycleLength:28}});assert.deepEqual(withCycle,plan);
// P1: later execution survives history travel; generated recovery progress does not duplicate.
const base=d.acceptPlan({...init,availability,tasks:input.tasks,commitments:input.commitments},plan);
const edit=d.proposeEdit(base.acceptedPlan,{id:'task-must',title:'Updated must',dateISO:'2026-10-09',date:'Fri 9 Oct',start:'09:00',duration:'60 min',fixed:false},availability);
assert.deepEqual(edit.errors,[]);
const changed=d.applyProposal(base,edit),finished=d.updateBlockStatus(changed,'task-must','done');
const restoredPreview=d.proposeRestore(finished.acceptedPlan,changed.history.at(-1));
assert.equal(restoredPreview.after.blocks.find(b=>b.id==='task-must').status,'done');
assert.equal(restoredPreview.after.blocks.find(b=>b.id==='task-must').completedMinutes,60);
const restoredState=d.applyProposal(finished,restoredPreview);assert.equal(restoredState.tasks.find(t=>t.id==='must').done,true);
const undoneFinished=d.undoLastChange(finished);assert.equal(undoneFinished.acceptedPlan.blocks.find(b=>b.id==='task-must').status,'done');assert.equal(undoneFinished.tasks.find(t=>t.id==='must').done,true);
const recoveredPartial=d.applyProposal(partialState,partialMove);
assert.deepEqual(d.undoLastChange(recoveredPartial).acceptedPlan,partialState.acceptedPlan);
assert.deepEqual(d.proposeRestore(recoveredPartial.acceptedPlan,recoveredPartial.history.at(-1)).after,partialState.acceptedPlan);
const splitPartial=d.applyProposal(partialState,d.proposeRecovery(partialState.acceptedPlan,'task-must','split',input,'2026-10-05'));
assert.deepEqual(d.undoLastChange(splitPartial).acceptedPlan,partialState.acceptedPlan);
const completedPart=d.updateBlockStatus(splitPartial,'task-must-part-1','done');
const undoCompletedPart=d.undoLastChange(completedPart),remainingBlock=undoCompletedPart.acceptedPlan.blocks.find(b=>b.id==='task-must');
assert.equal(remainingBlock.status,'partial');assert.equal(remainingBlock.completedMinutes,45);assert.equal(remainingBlock.remainingMinutes,15);
assert.equal(undoCompletedPart.acceptedPlan.blocks.filter(b=>b.taskId==='must').length,1);assert.equal(undoCompletedPart.tasks.find(t=>t.id==='must').done,false);
const deferredPartial=d.applyProposal(partialState,partialDefer);assert.equal(deferredPartial.tasks.find(t=>t.id==='must').done,false);
const missedLater=d.updateBlockStatus(changed,'task-must','missed');assert.equal(d.undoLastChange(missedLater).acceptedPlan.blocks.find(b=>b.id==='task-must').status,'missed');
// Malformed edits remain safe previews; incomplete/conflicted plans cannot be accepted.
for(const invalid of [{dateISO:'2026-99-99'},{dateISO:'2026-02-30'},{title:'  '},{duration:''},{duration:'0 min'},{start:'25:00'},{dateISO:undefined,date:'not a date'}]){
 const invalidPreview=d.proposeEdit(plan,{id:'task-must',title:'must',dateISO:'2026-10-09',date:'Fri 9 Oct',start:'09:00',duration:'60 min',fixed:false,...invalid},availability);
 assert.ok(invalidPreview.errors.length);assert.deepEqual(invalidPreview.after,plan);
}
const invalidFixed=d.generateWeeklyPlan({...input,commitments:[{id:'broken',title:'Broken commitment',date:'2026-99-99',startTime:'09:00',endTime:'10:00'}]});
assert.equal(invalidFixed.unscheduled.length,1);assert.throws(()=>d.acceptPlan({...init,availability},invalidFixed),/fixed commitment/);
const noSpace=d.generateWeeklyPlan({...input,tasks:Array.from({length:8},(_,i)=>task(String(i)))});assert.throws(()=>d.acceptPlan({...init,availability},noSpace),/available time/);
// Feasibility remedies are preview-only, draft-safe and never silently drop work.
const narrow=Object.fromEntries(d.DAYS.map(day=>[day,day==='Monday'?'09:00–10:00':'']));
const crowdedInput={weekStart:'2026-10-05',availability:narrow,commitments:[],tasks:[task('essential','Must'),task('extra','Optional'),task('important-extra')]};
const crowded=d.generateWeeklyPlan(crowdedInput),beforeCrowded=JSON.stringify(crowded);
const deferOne=d.proposeFeasibilityResolution(crowded,crowdedInput,'defer-lowest','2026-10-05');
assert.deepEqual(deferOne.errors,[]);assert.equal(JSON.stringify(crowded),beforeCrowded);assert.deepEqual(deferOne.after.deferredTaskIds,['extra']);assert.equal(deferOne.after.unscheduled.length,1);assert.ok(deferOne.changes.some(c=>c.kind==='Deferred'));
assert.throws(()=>d.acceptPlan({...init,availability:narrow,tasks:crowdedInput.tasks},deferOne.after));
const deferTwo=d.proposeFeasibilityResolution(deferOne.after,crowdedInput,'defer-lowest','2026-10-05');assert.deepEqual(deferTwo.errors,[]);assert.equal(deferTwo.after.unscheduled.length,0);
const feasible=d.acceptPlan({...init,availability:narrow,tasks:crowdedInput.tasks},deferTwo.after);assert.equal(feasible.tasks.find(t=>t.id==='extra').done,undefined);
const laterAdjustment=d.proposeAdjustment(feasible.acceptedPlan,crowdedInput,'week','2026-10-05');assert.deepEqual(laterAdjustment.errors,[]);assert.ok(!laterAdjustment.after.blocks.some(b=>b.taskId==='extra'));
let savedDeferred=null;const deferredStorage={getItem:()=>savedDeferred,setItem:(_,v)=>{savedDeferred=v},removeItem:()=>{}};assert.equal(d.saveState(feasible,deferredStorage).error,undefined);assert.deepEqual(d.loadState(deferredStorage).state.acceptedPlan.deferredTaskIds,deferTwo.after.deferredTaskIds);
assert.ok(d.proposeAdjustment(crowded,crowdedInput,'week','2026-10-05').errors.length);
const fragmentedInput={weekStart:'2026-10-05',availability:narrow,commitments:[{id:'middle',title:'Middle meeting',date:'2026-10-05',startTime:'09:20',endTime:'09:40'}],tasks:[task('fragmented','Must',{duration:'40 min',deadline:'2026-10-05'})]};
const fragmented=d.generateWeeklyPlan(fragmentedInput);assert.equal(fragmented.unscheduled.length,1);
const splitRemedy=d.proposeFeasibilityResolution(fragmented,fragmentedInput,'split','2026-10-05');assert.deepEqual(splitRemedy.errors,[]);assert.equal(splitRemedy.after.unscheduled.length,0);assert.equal(splitRemedy.after.blocks.filter(b=>b.taskId==='fragmented').length,2);assert.equal(splitRemedy.after.blocks.filter(b=>b.taskId==='fragmented').reduce((n,b)=>n+d.durationMinutes(b.duration),0),40);assert.deepEqual(d.validatePlan(splitRemedy.after,narrow),[]);
const splitTooLarge=d.proposeFeasibilityResolution(crowded,crowdedInput,'split','2026-10-05');assert.ok(splitTooLarge.errors.length);assert.deepEqual(splitTooLarge.after,crowded);
const deferredAfterAdjustment=d.proposeAdjustment(deferredPartial.acceptedPlan,input,'week','2026-10-05');assert.equal(d.applyProposal(deferredPartial,deferredAfterAdjustment).tasks.find(t=>t.id==='must').done,false);
const adjustStartedSplit=d.proposeAdjustment(completedPart.acceptedPlan,input,'week','2026-10-05');assert.equal(adjustStartedSplit.after.blocks.filter(b=>b.taskId==='must').length,3);assert.equal(adjustStartedSplit.after.blocks.find(b=>b.id==='task-must-part-2').duration,'15 min');
console.log('Domain tests passed: deterministic planning, priorities, deadlines, conflicts, capacity, seven days, proposal isolation, recovery move/split/defer, apply/stale guard/undo/restore, execution, persistence errors and migration.');
// Local-data hardening: malformed content is quarantined, never repaired in place.
const invalidStates=[
 {...init,version:99}, {...init,unexpected:'secret'}, {...init,cycleMode:'anything'},
 {...init,cycleBasics:{lastPeriodStart:'2026-02-30',cycleLength:28}},
 {...init,cycleBasics:{lastPeriodStart:null,cycleLength:0}},
 {...init,tasks:[task('bad','Important',{duration:'12 minutes of arbitrary junk'})]},
 {...init,tasks:[task('bad','Important',{duration:'1e6 min'})]},
 {...init,tasks:[task('bad','Important',{duration:'0.001 min'})]},
 {...init,tasks:[task('bad','Important',{fixedDate:'2026-13-01'})]},
 {...init,tasks:[task('bad','Important',{startTime:'23:99'})]},
 {...init,tasks:[task('duplicate'),task('duplicate')]},
 {...init,tasks:Array.from({length:1001},(_,i)=>task(String(i)))},
 {...init,tasks:[task('large','Important',{title:'x'.repeat(4097)})]},
 {...init,commitments:[{id:'c',title:'c',date:'2026-10-05',startTime:'10:00',endTime:'09:00'}]},
 ...[{status:{toString:'bad'}},{remainingMinutes:-1},{completedMinutes:99999},{dateISO:'2026-02-30'},{duration:'Infinity min'},{fixed:'yes'},{taskId:[]},{signals:[{title:'x',body:1}]}].map(extra=>({...base,acceptedPlan:{...plan,blocks:[{...plan.blocks[0],...extra}]}})),
 {...base,history:Array(31).fill(base.history[0])},
 JSON.parse(JSON.stringify(init).replace('"version":1','"version":1,"__proto__":{"polluted":true}')),
 {...init,availability:JSON.parse('{"Monday":"","Tuesday":"","Wednesday":"","Thursday":"","Friday":"","Saturday":"","Sunday":"","constructor":{"prototype":{"polluted":true}}}')},
]
for(const invalid of invalidStates){
 assert.equal(d.validateState(invalid),false)
 let raw=JSON.stringify(invalid),writes=0
 const adapter={getItem:()=>raw,setItem:(_,v)=>{raw=v;writes++},removeItem:()=>{raw=null}}
 const originalRaw=raw
 assert.ok(d.loadState(adapter).error);assert.equal(raw,originalRaw);assert.equal(writes,0)
 assert.ok(d.saveState(invalid,adapter).error);assert.equal(raw,originalRaw);assert.equal(writes,0)
 assert.ok(d.saveState(init,adapter).error);assert.equal(raw,originalRaw);assert.equal(writes,0)
 assert.equal(d.clearState(adapter).error,undefined);assert.equal(d.clearState(adapter).error,undefined);assert.equal(raw,null)
 assert.deepEqual(d.loadState(adapter).state,init)
}
assert.equal({}.polluted,undefined)
for(const raw of ['', '{broken', 'x'.repeat(d.MAX_STORAGE_CHARS+1)]){
 const adapter={getItem:()=>raw,setItem:()=>{throw Error('must not write')},removeItem:()=>{}}
 assert.ok(d.loadState(adapter).error)
}
const secret='synthetic-secret-do-not-display'
assert.ok(!d.loadState({getItem:()=>{throw Error(secret)}}).error.includes(secret))
assert.ok(!d.saveState(init,{setItem:()=>{throw Error(secret)}}).error.includes(secret))
assert.ok(!d.clearState({removeItem:()=>{throw Error(secret)}}).error.includes(secret))
const accessor={...init};Object.defineProperty(accessor,'tasks',{get(){throw Error('Do not run getters')},enumerable:true});assert.equal(d.validateState(accessor),false)
const cyclic={...init};cyclic.tasks=[cyclic];assert.equal(d.validateState(cyclic),false)
for(const text of ['1e3','30 min junk','1.2.3 hours','-30 min','0.001 min','1441 min','24.1 hours'])assert.ok(Number.isNaN(d.durationMinutes(text)),text)
assert.equal(d.durationMinutes('1.5 hours'),90);assert.equal(d.durationMinutes('24 h'),1440)
assert.equal(d.isISODate('2024-02-29'),true);assert.equal(d.isISODate('2026-02-29'),false)
const literalTitle='<img src=x onerror=alert(1)> & <script>alert(1)</script>'
assert.equal(d.validateState({...init,tasks:[task('literal','Important',{title:literalTitle})]}),true)
console.log('Security domain tests passed: bounded schemas, dates/times, prototype keys, corruption preservation, generic errors, literal text, and idempotent clear.');

assert.throws(()=>d.generateWeeklyPlan({...input,weekStart:'2026-02-30'}),/valid planning date/);

// Explicit timing constraints apply to every preview, commit and history restore.
// These dates precede the real clock so recovery has deterministic daily windows.
const deadlineTasks=[task('timed','Must',{deadline:'2026-10-05'})];
const deadlineInput={weekStart:'2026-10-05',availability,commitments:[],tasks:deadlineTasks};
const deadlinePlan=d.generateWeeklyPlan(deadlineInput);
assert.equal(deadlinePlan.blocks[0].dateISO,'2026-10-05');
assert.deepEqual(d.validatePlan(deadlinePlan,availability,deadlineTasks),[]);
const deadlineBase=d.acceptPlan({...init,availability,tasks:deadlineTasks},deadlinePlan);
const deadlineEdit=(dateISO,extra={})=>({id:'task-timed',title:'timed',date:dateISO,dateISO,start:'09:00',duration:'60 min',fixed:false,...extra});
assert.deepEqual(d.proposeEdit(deadlinePlan,deadlineEdit('2026-10-05'),availability,deadlineTasks).errors,[]);
for(const fixed of [false,true]){
 const lateEdit=d.proposeEdit(deadlinePlan,deadlineEdit('2026-10-07',{fixed}),availability,deadlineTasks);
 assert.ok(lateEdit.errors.some(e=>e.includes('deadline')));
 assert.throws(()=>d.applyProposal(deadlineBase,{...lateEdit,errors:[]}),/deadline/);
}
const deadlineOriginal=JSON.stringify(deadlineBase);
for(const choice of ['move','split']){
 const noFit=d.proposeRecovery(deadlinePlan,'task-timed',choice,deadlineInput,'2026-10-06');
 assert.ok(noFit.errors.some(e=>e.includes('deadline')));
 assert.deepEqual(noFit.after,deadlinePlan);
 assert.throws(()=>d.applyProposal(deadlineBase,noFit),/deadline/);
}
assert.equal(JSON.stringify(deadlineBase),deadlineOriginal);
assert.equal(d.generateWeeklyPlan({...deadlineInput,commitments:input.commitments}).unscheduled.length,1);
const fixedAfterDeadline=d.generateWeeklyPlan({...deadlineInput,tasks:[task('fixed-timed','Must',{kind:'Fixed',fixedDate:'2026-10-06',startTime:'09:00',deadline:'2026-10-05'})]});
assert.equal(fixedAfterDeadline.blocks.length,0);assert.match(fixedAfterDeadline.unscheduled[0].reason,/deadline/);

// Same-day moves and every split part may finish on the deadline date.
const laterTasks=[{...deadlineTasks[0],deadline:'2026-10-07'}],laterInput={...deadlineInput,tasks:laterTasks};
const moveWithinDeadline=d.proposeRecovery(deadlinePlan,'task-timed','move',laterInput,'2026-10-06');
assert.deepEqual(moveWithinDeadline.errors,[]);assert.equal(moveWithinDeadline.after.blocks[0].dateISO,'2026-10-06');
const splitWindows={...availability,Tuesday:'09:00–09:30',Wednesday:'09:00–09:30'};
const boundedSplit=d.proposeRecovery(deadlinePlan,'task-timed','split',{...laterInput,availability:splitWindows},'2026-10-06');
assert.deepEqual(boundedSplit.errors,[]);assert.deepEqual(boundedSplit.after.blocks.map(b=>b.dateISO),['2026-10-06','2026-10-07']);
const failedSecondPart=d.proposeRecovery(deadlinePlan,'task-timed','split',{...laterInput,availability:splitWindows,tasks:[{...deadlineTasks[0],deadline:'2026-10-06'}]},'2026-10-06');
assert.ok(failedSecondPart.errors.some(e=>e.includes('deadline')));assert.deepEqual(failedSecondPart.after,deadlinePlan);
const sameDayWindow={...availability,Monday:'09:00–11:00'};
const sameDayRecovery=d.proposeRecovery(deadlinePlan,'task-timed','move',{...deadlineInput,availability:sameDayWindow},'2026-10-05');
assert.deepEqual(sameDayRecovery.errors,[]);assert.equal(sameDayRecovery.after.blocks[0].dateISO,'2026-10-05');assert.equal(sameDayRecovery.after.blocks[0].start,'10:00');

// Task edits can stale a preview without changing the accepted/draft snapshot.
const laterBase={...deadlineBase,tasks:laterTasks};
const validWednesday=d.proposeEdit(deadlinePlan,deadlineEdit('2026-10-07'),availability,laterTasks);
assert.deepEqual(validWednesday.errors,[]);
const tightened={...laterBase,tasks:[{...deadlineTasks[0],deadline:'2026-10-06'}]};
assert.throws(()=>d.applyProposal(tightened,validWednesday),/deadline/);
assert.throws(()=>d.acceptPlan(tightened,validWednesday.after),/deadline/);
const draftOnly={...init,availability,tasks:laterTasks,draftPlan:deadlinePlan};
assert.deepEqual(d.applyDraftProposal(draftOnly,validWednesday).draftPlan,validWednesday.after);
assert.throws(()=>d.applyDraftProposal({...draftOnly,tasks:tightened.tasks},validWednesday),/deadline/);
assert.throws(()=>d.applyDraftProposal({...draftOnly,draftPlan:validWednesday.after},validWednesday),/changed/);
assert.deepEqual(d.applyDraftProposal(draftOnly,validWednesday).history,[]);
assert.equal(d.applyDraftProposal(draftOnly,validWednesday).acceptedPlan,null);
const renamedDeadlineTask=[{...deadlineTasks[0],title:'New task title'}];
assert.ok(d.validatePlan(validWednesday.after,availability,renamedDeadlineTask).some(e=>e.includes('deadline')));

// A changed deadline blocks unfinished historical placements, atomically.
const wednesdayState=d.applyProposal(laterBase,validWednesday);
const backToMonday=d.proposeEdit(wednesdayState.acceptedPlan,deadlineEdit('2026-10-05'),availability,laterTasks);
const mondayAgain=d.applyProposal(wednesdayState,backToMonday);
const constrainedHistory={...mondayAgain,tasks:tightened.tasks};
const historyBefore=JSON.stringify(constrainedHistory),latestTimingChange=constrainedHistory.history.at(-1);
const invalidRestore=d.proposeRestore(constrainedHistory.acceptedPlan,latestTimingChange,availability,constrainedHistory.tasks);
assert.ok(invalidRestore.errors.some(e=>e.includes('deadline')));
assert.throws(()=>d.applyProposal(constrainedHistory,{...invalidRestore,errors:[]}),/deadline/);
assert.throws(()=>d.undoLastChange(constrainedHistory),/deadline/);
assert.equal(JSON.stringify(constrainedHistory),historyBefore);
const priorValidRestore=d.proposeRestore({...wednesdayState.acceptedPlan},wednesdayState.history.at(-1),availability,tightened.tasks);
assert.deepEqual(priorValidRestore.errors,[]);assert.equal(priorValidRestore.after.blocks[0].dateISO,'2026-10-05');

// Later completed work survives history travel even if the task deadline shrinks.
const finishedTiming=d.updateBlockStatus(constrainedHistory,'task-timed','done');
const completedRestore=d.proposeRestore(finishedTiming.acceptedPlan,latestTimingChange,availability,finishedTiming.tasks);
assert.deepEqual(completedRestore.errors,[]);assert.equal(completedRestore.after.blocks[0].status,'done');
const completeUndo=d.undoLastChange(finishedTiming);
assert.equal(completeUndo.acceptedPlan.blocks[0].dateISO,'2026-10-07');assert.equal(completeUndo.acceptedPlan.blocks[0].completedMinutes,60);
assert.equal(completeUndo.tasks[0].done,true);assert.equal(d.applyProposal(finishedTiming,completedRestore).tasks[0].done,true);
const partialTiming=d.updateBlockStatus(constrainedHistory,'task-timed','partial');
assert.ok(d.proposeRestore(partialTiming.acceptedPlan,latestTimingChange,availability,partialTiming.tasks).errors.some(e=>e.includes('deadline')));
assert.throws(()=>d.undoLastChange(partialTiming),/deadline/);
assert.equal(partialTiming.acceptedPlan.blocks[0].completedMinutes,30);
const partialDue=d.updateBlockStatus(deadlineBase,'task-timed','partial');
for(const choice of ['move','split']){
 const noFit=d.proposeRecovery(partialDue.acceptedPlan,'task-timed',choice,deadlineInput,'2026-10-06');
 assert.ok(noFit.errors.some(e=>e.includes('deadline')));assert.deepEqual(noFit.after,partialDue.acceptedPlan);
}
const expiredTasks=[{...deadlineTasks[0],deadline:'2026-10-04'}];
const deferExpired=d.proposeRecovery(partialDue.acceptedPlan,'task-timed','defer',{...deadlineInput,tasks:expiredTasks},'2026-10-06');
assert.deepEqual(deferExpired.errors,[]);assert.equal(deferExpired.after.blocks[0].duration,'30 min');assert.equal(deferExpired.after.blocks[0].status,'done');
const deferredExpired=d.applyProposal({...partialDue,tasks:expiredTasks},deferExpired);
assert.equal(deferredExpired.tasks[0].done,false);assert.match(deferredExpired.acceptedPlan.unscheduled[0].reason,/30 min deferred/);
assert.ok(d.proposeRecovery(finishedTiming.acceptedPlan,'task-timed','move',laterInput,'2026-10-06').errors.length);
assert.ok(d.proposeAdjustment(partialDue.acceptedPlan,{...deadlineInput,tasks:expiredTasks},'week','2026-10-05').errors.some(e=>e.includes('deadline')));

// Use the existing date resolver; do not infer an absent/unreadable deadline.
for(const deadline of [undefined,'','No deadline','not a date']){
 assert.deepEqual(d.validatePlan(validWednesday.after,availability,[{...deadlineTasks[0],deadline}]),[]);
}
assert.ok(d.generateWeeklyPlan({...deadlineInput,tasks:[{...deadlineTasks[0],deadline:'not a date'}]}).warnings.some(e=>e.includes('deadline could not be read')));
assert.ok(d.proposeEdit(deadlinePlan,deadlineEdit('2026-10-06'),availability,[{...deadlineTasks[0],deadline:'Mon 5 Oct'}]).errors.some(e=>e.includes('deadline')));
console.log('Timing constraint regressions passed: deadline-bound recovery/edit/splits, stale accepted and draft commits, atomic undo/restore, completed history and partial work.');

// Block editing must not rewrite completed execution to bypass timing checks.
const doneEdit=d.proposeEdit(finishedTiming.acceptedPlan,deadlineEdit('2026-10-07'),availability,finishedTiming.tasks);
assert.ok(doneEdit.errors.some(e=>e.includes('Completed')));assert.deepEqual(doneEdit.after,finishedTiming.acceptedPlan);
for(const extra of [{dateISO:'2026-10-07'},{start:'09:30'},{duration:'15 min'},{duration:'45 min'},{duration:'90 min'},{fixed:true}]){
 const partialEdit=d.proposeEdit(partialDue.acceptedPlan,deadlineEdit('2026-10-05',extra),availability,deadlineTasks);
 assert.ok(partialEdit.errors.some(e=>e.includes('completed work')));assert.deepEqual(partialEdit.after,partialDue.acceptedPlan);
}
const partialTitleEdit=d.proposeEdit(partialDue.acceptedPlan,deadlineEdit('2026-10-05',{title:'Clearer title'}),availability,deadlineTasks);
assert.deepEqual(partialTitleEdit.errors,[]);
const renamedPartial=d.applyProposal(partialDue,partialTitleEdit);
assert.equal(renamedPartial.acceptedPlan.blocks[0].completedMinutes,30);assert.equal(renamedPartial.acceptedPlan.blocks[0].remainingMinutes,30);assert.equal(d.validateState(renamedPartial),true);
console.log('Completed execution edit guards passed: done blocks immutable; partial timing changes use remaining-work recovery.');

// Optimistic snapshots protect restored data before a queued storage event arrives.
{
 let raw=null; const memory={getItem:()=>raw,setItem:(_,value)=>{raw=value},removeItem:()=>{raw=null}};
 const old=d.createInitialState(); d.saveState(old,memory); const read=d.loadState(memory);
 const restored={...old,tasks:[task('restored-backup')]}; assert.deepEqual(d.saveState(restored,memory,{expectedRaw:read.snapshot}),{});
 const replacement=raw; assert.equal(d.saveState({...old,analyticsConsent:true},memory,{expectedRaw:read.snapshot}).conflict,true); assert.equal(raw,replacement);
 assert.equal(d.clearState(memory,{expectedRaw:read.snapshot}).conflict,true); assert.equal(raw,replacement);
 assert.deepEqual(d.saveState({...restored,analyticsConsent:true},memory,{expectedRaw:replacement}),{});
 const fresh=d.loadState(memory); assert.deepEqual(d.clearState(memory,{expectedRaw:fresh.snapshot}),{}); assert.equal(raw,null);
 console.log('Storage snapshot guards passed: stale saves and clears preserve the replacement backup.');
}

{
 let raw=null; const memory={getItem:()=>raw,setItem:(_,value)=>{raw=value},removeItem:()=>{raw=null}};
 const clean=d.createInitialState();d.saveState(clean,memory);const prior=raw;assert.deepEqual(d.saveState(clean,memory,{expectedRaw:null}),{});assert.equal(raw,prior);
 const accepted=d.generateWeeklyPlan(input);const independent={...accepted,id:'independent-draft'};const state={...init,tasks:input.tasks,availability,commitments:input.commitments,acceptedPlan:accepted,draftPlan:independent};
 const preview=d.proposeRecovery(accepted,'task-must','defer',input,'2026-10-05');const applied=d.applyProposal(state,preview);assert.deepEqual(applied.draftPlan,independent);assert.deepEqual(d.undoLastChange(applied).draftPlan,independent);assert.deepEqual(d.updateBlockStatus(state,'task-must','done').draftPlan,independent);
 console.log('Independent imported drafts survive accepted-plan apply, undo and completion; duplicate clean-tab saves are idempotent.');
}
