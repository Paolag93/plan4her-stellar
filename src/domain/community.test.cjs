/* Run: node src/domain/community.test.cjs. Rhythm Pool rules and savings-accounting invariants. */
const fs=require('fs'),path=require('path'),ts=require('typescript'),assert=require('node:assert/strict');
const cache=new Map();function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',output)(name=>name.startsWith('.')?load(path.resolve(path.dirname(file),name)+'.ts'):require(name),module,module.exports);return module.exports}
const c=load(path.join(__dirname,'community.ts')),sv=load(path.join(__dirname,'savings.ts'));
const now=new Date('2026-10-21T10:00:00Z');
const tasks=[1,2,3,4,5,6,7].map(n=>({taskId:'t'+n,title:'Private task '+n}));

// Join any day; the four-week challenge starts on the next Monday (same day if Monday).
assert.equal(c.nextMonday('2026-10-21'),'2026-10-26');assert.equal(c.nextMonday('2026-10-26'),'2026-10-26');assert.equal(c.nextMonday('2026-10-25'),'2026-10-26');assert.equal(c.nextMonday('2026-10-27'),'2026-11-02');
let s=c.joinPool(c.createCommunityState(),{shareProgress:false,pledgeYield:false},'2026-10-21',now);
const p0=c.activeParticipation(s);assert.equal(p0.startDate,'2026-10-26');assert.equal(c.poolEndDate(p0),'2026-11-22','28 days, four full weeks');
assert.equal(s.savings.optedIn,false);assert.deepEqual(s.savings.ledger,[],'joining needs no wallet or deposit');
assert.throws(()=>c.joinPool(s,{shareProgress:false,pledgeYield:false}),/already/);
assert.equal(c.currentWeek(p0,'2026-10-21'),0);assert.equal(c.currentWeek(p0,'2026-10-26'),1);assert.equal(c.currentWeek(p0,'2026-11-22'),4);assert.equal(c.currentWeek(p0,'2026-11-23'),5);
let pr=c.poolProgress(p0,'2026-10-21');assert.equal(pr.started,false);assert.equal(pr.daysUntilStart,5);assert.equal(pr.denominator,0);

// Week 1 commitments can be chosen before the start; 3–5 unique tasks only.
assert.equal(c.editableWeek(p0,'2026-10-21'),1);
assert.throws(()=>c.confirmCommitments(s,1,tasks.slice(0,2),'2026-10-21',now),/3 to 5/);
assert.throws(()=>c.confirmCommitments(s,1,tasks.slice(0,6),'2026-10-21',now),/3 to 5/);
assert.throws(()=>c.confirmCommitments(s,1,[tasks[0],tasks[0],tasks[1]],'2026-10-21',now),/3 to 5/);
assert.throws(()=>c.confirmCommitments(s,2,tasks.slice(0,3),'2026-10-21',now),/current week/);
s=c.confirmCommitments(s,1,tasks.slice(0,4),'2026-10-21',now);
assert.equal(c.editableWeek(c.activeParticipation(s),'2026-10-21'),null);
assert.throws(()=>c.setCommitmentStatus(s,1,'w1-c1','done','2026-10-21'),/not started/);

// Week 1 runs: done, missed, replace one unfinished (denominator unchanged), task sync.
s=c.setCommitmentStatus(s,1,'w1-c1','done','2026-10-27',now);
s=c.setCommitmentStatus(s,1,'w1-c2','missed','2026-10-27',now);
s=c.replaceCommitment(s,1,'w1-c3',tasks[5],now);
assert.throws(()=>c.replaceCommitment(s,1,'w1-c4',tasks[6],now),/already replaced/);
let w1=c.activeParticipation(s).weeks[0];assert.equal(w1.count,4);assert.equal(w1.items.length,5);assert.equal(w1.items.find(i=>i.id==='w1-c3').status,'replaced');assert.equal(w1.items.find(i=>i.id==='w1-c3-r').replaces,'w1-c3');
assert.throws(()=>c.setCommitmentStatus(s,1,'w1-c3','done','2026-10-27'),/no longer change/);
assert.throws(()=>c.replaceCommitment(c.confirmCommitments(c.joinPool(c.createCommunityState(),{shareProgress:false,pledgeYield:false},'2026-10-26'),1,tasks.slice(0,3),'2026-10-26'),1,'w1-c1',tasks[1]),/already a commitment/);
s=c.syncTaskCompletion(s,'t6',true,'2026-10-28',now);assert.equal(c.activeParticipation(s).weeks[0].items.find(i=>i.id==='w1-c3-r').status,'done');
s=c.syncTaskCompletion(s,'t6',false,'2026-10-28',now);assert.equal(c.activeParticipation(s).weeks[0].items.find(i=>i.id==='w1-c3-r').status,'open','unticking a task reopens only task-sourced completion');
s=c.syncTaskCompletion(s,'t6',true,'2026-10-28',now);
s=c.syncTaskCompletion(s,'t1',false,'2026-10-28',now);assert.equal(c.activeParticipation(s).weeks[0].items[0].status,'done','manual completion is not undone by task sync');
s=c.syncTaskCompletion(s,'unrelated',true,'2026-10-28',now);
pr=c.poolProgress(c.activeParticipation(s),'2026-10-28');assert.equal(pr.done,2);assert.equal(pr.denominator,4);assert.equal(pr.ratio,0.5);assert.equal(pr.eligible,false);
const audit=c.activeParticipation(s).audit.map(a=>a.kind);assert.ok(audit.includes('replaced')&&audit.includes('missed')&&audit.includes('reopened'),'audit history kept');

// Skipped weeks count as minimum commitments not completed; aggregate four-week ratio.
let full=c.joinPool(c.createCommunityState(),{shareProgress:true,pledgeYield:true},'2026-10-26');
for(const [week,day] of [[1,'2026-10-26'],[2,'2026-11-02'],[3,'2026-11-09'],[4,'2026-11-16']]){
 full=c.confirmCommitments(full,week,tasks.slice(0,5),day);
 for(const n of [1,2,3,4])full=c.setCommitmentStatus(full,week,`w${week}-c${n}`,'done',day);
 full=c.setCommitmentStatus(full,week,`w${week}-c5`,'missed',day);
}
pr=c.poolProgress(c.activeParticipation(full),'2026-11-23');assert.equal(pr.ended,true);assert.equal(pr.done,16);assert.equal(pr.denominator,20);assert.equal(pr.ratio,0.8);assert.equal(pr.eligible,true,'70% threshold');
let skip=c.joinPool(c.createCommunityState(),{shareProgress:false,pledgeYield:false},'2026-10-26');
skip=c.confirmCommitments(skip,1,tasks.slice(0,3),'2026-10-26');for(const n of [1,2,3])skip=c.setCommitmentStatus(skip,1,`w1-c${n}`,'done','2026-10-26');
pr=c.poolProgress(c.activeParticipation(skip),'2026-11-23');assert.equal(pr.denominator,12);assert.equal(pr.ratio,0.25);assert.equal(pr.eligible,false);
assert.equal(c.editableWeek(c.activeParticipation(skip),'2026-11-23'),null,'no commitments after the four weeks');

// Opt-in aggregate only; sample members are simulated; leaving never touches savings.
assert.equal(c.communityAggregate(s,'2026-10-28').includesYou,false);
assert.equal(c.communityAggregate(full,'2026-11-23').includesYou,true);
const withSavings={...s,savings:{optedIn:true,ledger:[{kind:'deposit',txHash:'a'.repeat(64),amount:'100000000',shares:'99000000',ledger:1,at:'2026-10-26T00:00:00Z',vaultId:'C'.repeat(56)}]}};
const left=c.leavePool(withSavings,'2026-10-29');assert.equal(left.participation.status,'left');assert.deepEqual(left.savings,withSavings.savings);
const rejoined=c.joinPool(left,{shareProgress:false,pledgeYield:false},'2026-10-29');assert.equal(rejoined.history.length,1);assert.equal(rejoined.participation.startDate,'2026-11-02');

// Savings accounting: exact stroops, average cost, negative results visible.
assert.equal(sv.parseAmount('10'),100000000n);assert.equal(sv.parseAmount('0.0000001'),1n);for(const bad of ['0','-1','1.12345678','abc','','1e3'])assert.throws(()=>sv.parseAmount(bad));
assert.equal(sv.formatAmount(15000000n),'1.5 XLM');assert.equal(sv.minWithSlippage(10000n,100),9900n);
const e=(kind,amount,shares)=>({kind,txHash:'b'.repeat(64),amount:String(amount),shares:String(shares),ledger:1,at:'x',vaultId:'C'.repeat(56)});
let pos=sv.positionSummary([e('deposit',1000,1000),e('withdraw',505,500)],505n);assert.equal(pos.realized,5n);assert.equal(pos.contributed,500n);
assert.equal(sv.positionSummary([e('deposit',1000,1000),e('withdraw',990,1000)]).realized,-10n);
assert.equal(sv.positionSummary([e('deposit',10,3),e('withdraw',3,1)]).realized,-1n,'basis rounds up; yield never overstated');
assert.equal(sv.positionSummary([e('deposit',1000,1000)],990n).unrealized,-10n);
assert.throws(()=>sv.positionSummary([e('withdraw',1,1)]),/exceeds/);

// Reward simulation: voluntary yield pledge + confirmed sponsor funds only; principal never.
const P=(id,y,eligible,pledgesYield=true)=>({id,realizedYield:y,principal:1000n,eligible,pledgesYield});
let r=sv.simulateRewardPool([P('a',100n,true),P('b',-50n,false),P('c',100n,true,false)],20);
assert.equal(r.yieldPot,20n,'only authorized pledges of positive yield');assert.equal(r.sponsorPot,0n);assert.equal(r.allocations.a,10n);assert.equal(r.allocations.c,10n);assert.equal(r.principalTouched,false);
r=sv.simulateRewardPool([P('a',0n,true)],20,0n);assert.equal(r.pot,0n,'no sponsor confirmed, no yield: nothing to share');
r=sv.simulateRewardPool([P('a',0n,true),P('b',0n,false)],20,1000n);assert.equal(r.allocations.a,1000n);assert.equal(r.allocations.b,0n);
r=sv.simulateRewardPool([P('a',1000n,false)],20,500n);assert.equal(r.unallocated,700n,'nobody eligible: everything stays with contributors');
r=sv.simulateRewardPool([P('a',100n,true),P('b',1n,true),P('x',5n,true)],10,1n);assert.equal(Object.values(r.allocations).reduce((a,b)=>a+b,0n)+r.unallocated,r.pot);
assert.throws(()=>sv.simulateRewardPool([],150));assert.throws(()=>sv.simulateRewardPool([],10,-1n));

// Persistence: strict, separate key, legacy key cleared, unreadable data kept.
let store={};const storage={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v},removeItem:k=>{delete store[k]}};
assert.deepEqual(c.saveCommunity(s,storage),{});assert.deepEqual(c.loadCommunity(storage).state,s);
assert.equal(c.validateCommunityState({...s,participation:{...s.participation,startDate:'2026-10-27'}}),false,'start must be a Monday');
assert.equal(c.validateCommunityState({...s,version:1}),false);
const bad=JSON.parse(JSON.stringify(s));bad.participation.weeks[0].count=2;assert.equal(c.validateCommunityState(bad),false);
store[c.LEGACY_COMMUNITY_KEY]='{}';c.clearCommunity(storage);assert.deepEqual(store,{});
store[c.RHYTHM_STORAGE_KEY]='{bad';assert.ok(c.loadCommunity(storage).error);assert.equal(store[c.RHYTHM_STORAGE_KEY],'{bad');
console.log('Rhythm Pool tests passed: next-Monday 28-day windows, free joining, 3–5 weekly commitments, fixed denominators, one replacement per week with audit, truthful done/missed/reopen, task sync, skipped-week penalty in ratio, 70% eligibility, opt-in aggregate, savings untouched by leaving, exact accounting, two-source yield/sponsor reward simulation and strict persistence.');
