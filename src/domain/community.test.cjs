/* Run: node src/domain/community.test.cjs. Community, partner-permission and savings-accounting invariants. */
const fs=require('fs'),path=require('path'),ts=require('typescript'),assert=require('node:assert/strict');
const cache=new Map();function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',output)(name=>name.startsWith('.')?load(path.resolve(path.dirname(file),name)+'.ts'):require(name),module,module.exports);return module.exports}
const c=load(path.join(__dirname,'community.ts')),d=load(path.join(__dirname,'index.ts'));
const goal={title:'Study English',sessionsPerWeek:4,minutesPerSession:30,workType:'review-planning',rewardThreshold:0.7};
const learn=c.CHALLENGE_CATALOG.find(x=>x.id==='learn-30');

// Joining is free and independent of cycle data, wallets or deposits.
let s=c.createCommunityState();
s=c.joinChallenge(s,learn,goal,'2026-10-05');
assert.equal(c.activeMembership(s).startDate,'2026-10-05');assert.equal(s.savings.optedIn,false);assert.equal(s.savings.ledger.length,0);
assert.equal(c.challengeEndDate(c.activeMembership(s)),'2026-11-03');
assert.throws(()=>c.joinChallenge(s,c.CHALLENGE_CATALOG[1],goal,'2026-10-05'),/Leave your current/);
assert.throws(()=>c.joinChallenge(c.createCommunityState(),learn,{...goal,title:' '}),/Name your/);
assert.throws(()=>c.joinChallenge(c.createCommunityState(),{...learn,lengthDays:45},goal),/30 or 90/);
assert.throws(()=>c.joinChallenge(c.createCommunityState(),learn,{...goal,sessionsPerWeek:9}),/1 to 7/);
// Different members can hold different goals in the same challenge (goal lives on the membership).
const other=c.joinChallenge(c.createCommunityState(),learn,{...goal,title:'Learn guitar',sessionsPerWeek:2},'2026-10-05');
assert.notEqual(c.activeMembership(other).goal.title,c.activeMembership(s).goal.title);

// Check-ins: idempotent per day, bounded to the challenge window.
s=c.recordCheckIn(s,'learn-30','2026-10-05');s=c.recordCheckIn(s,'learn-30','2026-10-05');s=c.recordCheckIn(s,'learn-30','2026-10-06');s=c.recordCheckIn(s,'learn-30','2026-10-04');s=c.recordCheckIn(s,'learn-30','2026-12-01');
assert.equal(c.activeMembership(s).checkIns.length,2);
let p=c.goalProgress(c.activeMembership(s),'2026-10-07');
assert.equal(p.dayNumber,3);assert.equal(p.completed,2);assert.equal(p.expected,2);assert.equal(p.completionRate,1);assert.equal(p.streakDays,2);assert.equal(p.checkedInToday,false);assert.equal(p.checkInsThisWeek,2);
p=c.goalProgress(c.activeMembership(s),'2026-10-18');assert.equal(p.expected,8);assert.ok(p.completionRate<0.7);assert.equal(c.rewardEligible(c.activeMembership(s),'2026-10-18'),false);
p=c.goalProgress(c.activeMembership(s),'2026-12-01');assert.equal(p.ended,true);assert.equal(p.dayNumber,30);assert.equal(p.daysRemaining,0);
s=c.removeCheckIn(s,'learn-30','2026-10-06');assert.equal(c.activeMembership(s).checkIns.length,1);

// Goal sessions become ordinary planner tasks with deterministic ids and no duplicates.
const tasks=c.goalSessionTasks(c.activeMembership(s),'2026-10-05',[]);
assert.equal(tasks.length,4);assert.equal(tasks[0].id,'goal-learn-30-2026-10-05-1');assert.equal(tasks[0].workType,'review-planning');assert.equal(tasks[0].deadline,'2026-10-11');
assert.equal(c.goalSessionTasks(c.activeMembership(s),'2026-10-05',tasks).length,0);
assert.equal(c.challengeForGoalTask(tasks[0].id,s),'learn-30');assert.equal(c.challengeForGoalTask('dentist',s),null);
const appState={...d.createInitialState(),tasks};assert.equal(d.validateState(appState),true,'goal tasks must pass the existing strict state schema');
const plan=d.generateWeeklyPlan({tasks,availability:appState.availability,commitments:[],weekStart:'2026-10-05',cycleMode:'natural',cycleBasics:{lastPeriodStart:'2026-10-01',cycleLength:28},cyclePreferences:d.createDefaultCyclePreferences()});
assert.equal(plan.blocks.filter(b=>b.taskId&&b.taskId.startsWith('goal-')).length,4,'existing cycle-aware planner schedules goal sessions');

// Partners see only allow-listed fields, never cycle/task/wallet data.
let ps=c.invitePartner(s,'Ana',['completionRate','streakDays','cycle','walletAddress'],new Date('2026-10-06T10:00:00Z'));
const partner=ps.partners[0];assert.deepEqual(partner.permissions,['completionRate','streakDays']);
assert.deepEqual(c.partnerView(ps,partner.id,'2026-10-07'),{status:'pending'});
ps=c.simulatePartnerAccept(ps,partner.id);
let view=c.partnerView(ps,partner.id,'2026-10-07');assert.equal(view.status,'active');assert.deepEqual(Object.keys(view.fields).sort(),['completionRate','streakDays']);
const text=JSON.stringify(view);for(const banned of ['phase','period','Menstrual','lastPeriodStart','wallet','balance','Study English','txHash'])assert.ok(!text.includes(banned),banned+' leaked');
ps=c.setPartnerPermissions(ps,partner.id,[]);assert.deepEqual(c.partnerView(ps,partner.id,'2026-10-07').fields,{});
ps=c.revokePartner(ps,partner.id);assert.deepEqual(c.partnerView(ps,partner.id),{status:'revoked'});
ps=c.setPartnerPermissions(ps,partner.id,['completionRate']);assert.deepEqual(ps.partners[0].permissions,[],'revoked partner cannot be re-granted silently');
assert.throws(()=>c.invitePartner(s,'  ',[]),/name/);

// Community aggregate only includes you when you opt in.
assert.equal(c.communityAggregate(s,learn,'2026-10-07').includesYou,false);
const shared={...s,shareWithCommunity:true};const agg=c.communityAggregate(shared,learn,'2026-10-07');assert.equal(agg.includesYou,true);assert.equal(agg.members,6);

// Leaving never touches savings.
const withSavings={...s,savings:{optedIn:true,ledger:[{kind:'deposit',txHash:'a'.repeat(64),amount:'100000000',shares:'99000000',ledger:1,at:'2026-10-05T00:00:00Z',vaultId:'C'.repeat(56)}]}};
const left=c.leaveChallenge(withSavings,'learn-30','2026-10-10');assert.equal(left.memberships[0].status,'left');assert.deepEqual(left.savings,withSavings.savings);

// Amount parsing uses exact integer stroops.
assert.equal(c.parseAmount('10'),100000000n);assert.equal(c.parseAmount('0.0000001'),1n);assert.equal(c.parseAmount('1,5'),15000000n);
for(const bad of ['0','-1','1.12345678','abc','','1e3'])assert.throws(()=>c.parseAmount(bad));
assert.equal(c.formatAmount(15000000n),'1.5 XLM');assert.equal(c.formatAmount(-1n),'−0.0000001 XLM');
assert.equal(c.minWithSlippage(10000n,100),9900n);assert.equal(c.minWithSlippage(9999n,100),9899n);

// Average-cost accounting: realized result can be negative; yield never overstated.
const e=(kind,amount,shares)=>({kind,txHash:'b'.repeat(64),amount:String(amount),shares:String(shares),ledger:1,at:'2026-10-05T00:00:00Z',vaultId:'C'.repeat(56)});
let pos=c.positionSummary([e('deposit',1000,1000)],1010n);assert.equal(pos.unrealized,10n);assert.equal(pos.realized,0n);
pos=c.positionSummary([e('deposit',1000,1000),e('withdraw',505,500)],505n);assert.equal(pos.realized,5n);assert.equal(pos.contributed,500n);assert.equal(pos.shares,500n);
pos=c.positionSummary([e('deposit',1000,1000),e('withdraw',990,1000)]);assert.equal(pos.realized,-10n);assert.equal(pos.contributed,0n);
pos=c.positionSummary([e('deposit',10,3),e('withdraw',3,1)]);assert.equal(pos.realized,-1n,'basis rounds up so gains are not overstated');
assert.throws(()=>c.positionSummary([e('withdraw',1,1)]),/exceeds/);
assert.equal(c.positionSummary([e('deposit',1000,1000)],990n).unrealized,-10n,'loss is shown, principal not guaranteed');

// Reward simulation: only positive realized yield, never principal, no slashing.
let r=c.simulateRewardPool([{id:'a',realizedYield:100n,principal:1000n,eligible:true},{id:'b',realizedYield:-50n,principal:1000n,eligible:false},{id:'c',realizedYield:51n,principal:5n,eligible:true}],20);
assert.equal(r.pot,30n);assert.equal(r.allocations.a,15n);assert.equal(r.allocations.c,15n);assert.equal(r.allocations.b,0n);assert.equal(r.unallocated,0n);assert.equal(r.principalTouched,false);
r=c.simulateRewardPool([{id:'a',realizedYield:0n,principal:1000n,eligible:true}]);assert.equal(r.pot,0n);
r=c.simulateRewardPool([{id:'a',realizedYield:1000n,principal:1n,eligible:false}],20);assert.equal(r.pot,200n);assert.equal(r.unallocated,200n,'no eligible member: pot stays with contributors');
r=c.simulateRewardPool([{id:'a',realizedYield:100n,principal:0n,eligible:true},{id:'b',realizedYield:1n,principal:0n,eligible:true},{id:'x',realizedYield:5n,principal:0n,eligible:true}],10);
assert.equal(Object.values(r.allocations).reduce((a,b)=>a+b,0n)+r.unallocated,r.pot,'conservation');
assert.throws(()=>c.simulateRewardPool([],150));

// Persistence: strict validation, separate key, tolerant load.
let raw=null;const storage={getItem:()=>raw,setItem:(_,v)=>{raw=v},removeItem:()=>{raw=null}};
assert.deepEqual(c.saveCommunity(ps,storage),{});assert.deepEqual(c.loadCommunity(storage).state,ps);
assert.equal(c.validateCommunityState({...ps,savings:{optedIn:true,ledger:[{...e('deposit',1,1),txHash:'not-a-hash'}]}}),false);

raw='{bad';assert.ok(c.loadCommunity(storage).error);assert.equal(raw,'{bad','unreadable data kept');
c.clearCommunity(storage);assert.equal(raw,null);
console.log('Community tests passed: free joining, personal goals, 30/90 windows, idempotent check-ins, planner integration, allow-listed partner views, revocation, opt-in aggregates, exact amounts, average-cost accounting, yield-only reward simulation and strict persistence.');
