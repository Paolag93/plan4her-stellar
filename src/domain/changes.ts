import { validateTaskSelectionProposal } from './taskSelection'
import type { AppState, WeeklyPlan, PlanProposal, PlanHistoryEntry, PlannerInput, Availability, BlockStatus, PlanBlockData, TaskItem, CycleSnapshot } from './types'
import type { PlanBlockEdit } from '../features/plan/planData'
import { comparePlanBlocks } from '../features/plan/planData'
import { clone, generateWeeklyPlan, makeBlock, minutes, durationMinutes, overlaps, availabilityWindow, recalculate, localISO, resolveDate } from './planner'
/** Validate unfinished work against current inputs, never a historical task copy.
 * Date-only deadlines use the same resolver as generation and include that day.
 * Completed blocks are execution history, not work to reschedule retroactively. */
export function validatePlan(plan:WeeklyPlan,availability?:Availability,tasks:TaskItem[]=[]):string[]{
 const errors:string[]=[],tasksById=new Map(tasks.map(task=>[task.id,task])),ids=new Set<string>()
 for(const b of plan.blocks){
  if(!b.id||ids.has(b.id))errors.push(`${b.title}: duplicate or missing block identity.`)
  ids.add(b.id)
  if(!b.dateISO||!plan.week.some(d=>d.dateISO===b.dateISO)||!Number.isFinite(minutes(b.start))||!Number.isFinite(durationMinutes(b.duration))||minutes(b.start)+durationMinutes(b.duration)>1440){errors.push(`${b.title}: invalid date or time.`);continue}
  if(b.status==='done')continue
  if(availability&&!b.fixed){const w=availabilityWindow(availability[b.day as keyof Availability]??'');if(!w||minutes(b.start)<w[0]||minutes(b.start)+durationMinutes(b.duration)>w[1])errors.push(`${b.title}: outside your availability.`)}
  const deadline=resolveDate(b.taskId?tasksById.get(b.taskId)?.deadline:undefined,plan.week)
  if(deadline&&b.dateISO>deadline)errors.push(`${b.title}: must finish on or before the deadline (${deadline}).`)
 }
 for(let i=0;i<plan.blocks.length;i++)for(let j=i+1;j<plan.blocks.length;j++)if(overlaps(plan.blocks[i],plan.blocks[j]))errors.push(`${plan.blocks[i].title} overlaps ${plan.blocks[j].title}.`)
 return errors
}
function proposal(before:WeeklyPlan|null,after:WeeklyPlan,kind:PlanProposal['kind'],label:string,errors:string[]=[]):PlanProposal{return {kind,label,before:clone(before),after:recalculate(after),changes:comparePlanBlocks(before?.blocks??[],after.blocks),errors}}
export function proposeEdit(plan:WeeklyPlan,edit:PlanBlockEdit,availability?:Availability,tasks:TaskItem[]=[]):PlanProposal {
 const after=clone(plan),old=after.blocks.find(b=>b.id===edit.id)
 if(!old)return proposal(plan,after,'edit','Edit block',['This block no longer exists.'])
 if(old.fixed&&(!old.taskId||tasks.find(task=>task.id===old.taskId)?.kind!=='Flexible'))return proposal(plan,after,'edit','Edit block',['Fixed commitments cannot be moved here. Edit the original commitment instead.'])
 if(old.status==='done')return proposal(plan,after,'edit','Edit block',['Completed blocks stay in your execution history and cannot be edited here.'])
 const date=resolveDate(edit.dateISO??edit.date,plan.week),start=minutes(edit.start??''),duration=durationMinutes(edit.duration)
 const errors:string[]=[]
 if(!edit.title?.trim())errors.push('Add a title for this block.')
 if(!date||!plan.week.some(d=>d.dateISO===date))errors.push('Choose a valid date in this week.')
 if(!Number.isFinite(start))errors.push('Choose a valid start time.')
 if(!edit.duration?.trim()||!Number.isFinite(duration)||duration<1||start+duration>1440)errors.push('Choose a valid duration that ends within this day.')
 if(old.status==='partial'&&(date!==old.dateISO||start!==minutes(old.start)||duration!==durationMinutes(old.duration)||Boolean(edit.fixed??old.fixed)!==Boolean(old.fixed)))errors.push('This block includes completed work. Use recovery to move or split only the remaining work.')
 if(errors.length)return proposal(plan,after,'edit',`Edit ${old.title}`,errors)
 after.blocks=after.blocks.map(b=>b.id===edit.id?makeBlock(b.id,edit.title.trim(),date!,start,duration,{taskId:b.taskId,status:b.status,completedMinutes:b.completedMinutes,remainingMinutes:b.remainingMinutes,fixed:edit.fixed??b.fixed}):b)
 return proposal(plan,after,'edit',`Edit ${old.title}`,validatePlan(after,availability,tasks))
}
export function planningIssues(plan:WeeklyPlan):string[]{return [...plan.unscheduled.filter(task=>!plan.deferredTaskIds?.includes(task.taskId)).map(task=>`${task.title}: ${task.reason}`),...plan.warnings]}
export function proposeAdjustment(plan:WeeklyPlan,input:PlannerInput,scope:'today'|'week'|null='week',today=localISO()):PlanProposal {
 const startedTasks=new Set(plan.blocks.filter(b=>b.taskId&&(b.status==='done'||b.status==='partial')).map(b=>b.taskId))
 const preserve=plan.blocks.filter(b=>b.fixed||b.status==='done'||b.status==='partial'||(b.taskId&&startedTasks.has(b.taskId))||(b.dateISO??'')<today||(scope==='today'&&b.dateISO!==today));
 const preservedTasks=new Set(preserve.map(b=>b.taskId).filter(Boolean));
 const availability={...input.availability};for(const d of plan.week){if(d.dateISO!<today||(scope==='today'&&d.dateISO!==today))availability[d.label as keyof Availability]='';else if(d.dateISO===today&&today===localISO()){const w=availabilityWindow(availability[d.label as keyof Availability]);const now=new Date(),start=Math.max(w?.[0]??1440,Math.ceil((now.getHours()*60+now.getMinutes())/15)*15);availability[d.label as keyof Availability]=w&&start<w[1]?`${String(Math.floor(start/60)).padStart(2,'0')}:${String(start%60).padStart(2,'0')}–${String(Math.floor(w[1]/60)).padStart(2,'0')}:${String(w[1]%60).padStart(2,'0')}`:''}}
 // Reserve protected blocks as fixed tasks, which support a valid 24:00 end.
 // The original objects are restored after generation, including execution data.
 const usedIds=new Set(input.tasks.map(task=>task.id))
 const reservations:TaskItem[]=preserve.map((block,index)=>{let id=`__adjust-reservation-${index}`;while(usedIds.has(id))id+='-reserved';usedIds.add(id);return {id,title:block.title,kind:'Fixed',meta:block.duration,duration:block.duration,fixedDate:block.dateISO,startTime:block.start}})
 const reservationIds=new Set(reservations.map(task=>task.id))
 const commitments=input.commitments.filter(commitment=>!preserve.some(block=>block.id===`commitment-${commitment.id}`))
 const after=generateWeeklyPlan({...input,weekStart:plan.weekStart,deferredTaskIds:plan.deferredTaskIds,availability,commitments,templateAnchors:preserve.filter(block=>!block.fixed),tasks:[...input.tasks.filter(task=>!preservedTasks.has(task.id)),...reservations]})
 after.blocks=after.blocks.filter(block=>!reservationIds.has(block.taskId??'')&&!preserve.some(original=>original.id===block.id))
 after.blocks.push(...clone(preserve))
 after.availableMinutes=Object.values(input.availability).reduce((sum,value)=>{const window=availabilityWindow(value);return sum+(window?window[1]-window[0]:0)},0)
 after.unscheduled=after.unscheduled.filter(task=>!preservedTasks.has(task.taskId))
 return proposal(plan,after,'adjust',scope==='today'?'Adjust today':'Adjust this week',[...validatePlan(after,input.availability,input.tasks),...planningIssues(after)])
}
/** A feasibility proposal is draft-only: remaining blockers stay visible and must
 * still pass acceptance. No accepted plan is changed while proposing a remedy. */
export function proposeFeasibilityResolution(plan:WeeklyPlan,input:PlannerInput,kind:'defer-lowest'|'split',today=localISO()):PlanProposal {
 const deferred=new Set(plan.deferredTaskIds??[])
 const protectedTasks=new Set(plan.blocks.filter(b=>b.fixed||b.status==='done'||b.status==='partial'||(b.dateISO??'')<today).map(b=>b.taskId))
 const eligible=input.tasks.filter(task=>task.kind==='Flexible'&&!task.done&&!deferred.has(task.id)&&!protectedTasks.has(task.id))
 if(kind==='defer-lowest'){
  const rank={Optional:0,Important:1,Must:2},unscheduled=new Set(plan.unscheduled.map(t=>t.taskId))
  const task=eligible.sort((a,b)=>rank[a.importance??'Important']-rank[b.importance??'Important']||Number(unscheduled.has(b.id))-Number(unscheduled.has(a.id))||a.id.localeCompare(b.id))[0]
  if(!task)return proposal(plan,plan,'adjust','Defer one task',['No unfinished flexible task can be deferred. Edit the conflicting fixed commitment or availability instead.'])
  deferred.add(task.id)
  const prepared={...clone(plan),deferredTaskIds:[...deferred]}
  const generated=proposeAdjustment(prepared,input,'week',today)
  const result=proposal(plan,generated.after,'adjust',`Defer ${task.title} for this week`,validatePlan(generated.after,input.availability,input.tasks))
  result.changes.push({id:`defer-${task.id}`,title:task.title,kind:'Deferred',before:unscheduled.has(task.id)?'Unscheduled this week':'Included this week',after:'Deferred for this week; kept in Tasks',note:'This task stays unfinished. It will be excluded from adjustments to this week only after you apply this preview.'})
  return result
 }
 const rank={Must:0,Important:1,Optional:2},unscheduled=new Set(plan.unscheduled.map(t=>t.taskId))
 const task=eligible.filter(t=>unscheduled.has(t.id)&&durationMinutes(t.duration)>=2).sort((a,b)=>rank[a.importance??'Important']-rank[b.importance??'Important']||a.id.localeCompare(b.id))[0]
 if(!task)return proposal(plan,plan,'adjust','Split one task',['No unscheduled flexible task can be split. Splitting does not add available time.'])
 const total=durationMinutes(task.duration),parts=[Math.ceil(total/2),Math.floor(total/2)]
 const ids=parts.map((_,i)=>`${task.id}::split:${i+1}`)
 const tasks=input.tasks.filter(t=>t.id!==task.id).concat(parts.map((duration,i)=>({...task,id:ids[i],title:`${task.title} (${i+1}/2)`,duration:`${duration} min`,meta:`${duration} min`})))
 const generated=proposeAdjustment(plan,{...input,tasks},'week',today)
 const after=clone(generated.after),scheduled=after.blocks.filter(b=>ids.includes(b.taskId??''))
 if(scheduled.length!==2)return proposal(plan,plan,'adjust',`Split ${task.title}`,['Both parts must fit before the deadline. Splitting does not add available time; try deferring a task or editing availability.'])
 after.blocks=after.blocks.map(b=>ids.includes(b.taskId??'')?{...b,taskId:task.id}:b)
 const result=proposal(plan,after,'adjust',`Split ${task.title}`,validatePlan(after,input.availability,input.tasks))
 result.changes.push({id:`split-${task.id}`,title:task.title,kind:'Split',before:`${total} min unscheduled`,after:`${parts[0]} min + ${parts[1]} min scheduled`,note:'Both parts fit your availability. Total work and the original deadline are unchanged.'})
 return result
}
export function proposeRecovery(plan:WeeklyPlan,blockId:string,choice:'move'|'split'|'defer',input:PlannerInput,today=localISO()):PlanProposal {
 const old=plan.blocks.find(b=>b.id===blockId)
 if(!old)return proposal(plan,plan,'recovery','Recover block',['This block no longer exists.'])
 if(old.fixed)return proposal(plan,plan,'recovery','Recover block',['Fixed commitments stay at their chosen time.'])
 if(old.status==='done')return proposal(plan,plan,'recovery','Recover block',['This block is already complete.'])
 const after=clone(plan)
 after.blocks=after.blocks.filter(b=>b.id!==blockId)
 const fullDuration=durationMinutes(old.duration),remaining=old.status==='partial'?(old.remainingMinutes??Math.ceil(fullDuration/2)):fullDuration
 const completed=old.status==='partial'?(old.completedMinutes??fullDuration-remaining):0
 if(completed>0){let completedId=`${old.id}-completed`,suffix=2;while(after.blocks.some(block=>block.id===completedId))completedId=`${old.id}-completed-${suffix++}`;after.blocks.push(makeBlock(completedId,old.title,old.dateISO!,minutes(old.start),completed,{taskId:old.taskId,status:'done',completedMinutes:completed,remainingMinutes:0,rationale:'The completed part stays at its original time.',signals:[]}))}
 if(choice==='defer'){
  after.deferredTaskIds=[...new Set([...(after.deferredTaskIds??[]),old.taskId??old.id])]
  after.unscheduled.push({taskId:old.taskId??old.id,title:old.title,reason:`${remaining} min deferred by you; choose a new time when ready.`})
  return proposal(plan,after,'recovery',`Defer ${old.title}`,validatePlan(after,input.availability,input.tasks))
 }
 const deadline=resolveDate(input.tasks.find(task=>task.id===old.taskId)?.deadline,plan.week)
 const parts=choice==='split'?[Math.ceil(remaining/2),Math.floor(remaining/2)]:[remaining]
 if(parts.some(n=>n<1))return proposal(plan,plan,'recovery','Split block',['This block is too short to split.'])
 for(let i=0;i<parts.length;i++){
  let placed=false
  for(const day of plan.week){
   if(day.dateISO!<today||(deadline&&day.dateISO!>deadline))continue
   const window=availabilityWindow(input.availability[day.label as keyof Availability])
   if(!window)continue
   const now=new Date(),earliest=day.dateISO===localISO()?Math.ceil((now.getHours()*60+now.getMinutes())/15)*15:0
   for(let start=Math.max(window[0],earliest);start+parts[i]<=window[1];){
    const b=makeBlock(choice==='split'?`${old.id}-part-${i+1}`:old.id,old.title,day.dateISO!,start,parts[i],{taskId:old.taskId,status:'scheduled',remainingMinutes:parts[i],completedMinutes:0})
    const conflict=after.blocks.find(a=>overlaps(a,b))
    if(conflict){start=minutes(conflict.start)+durationMinutes(conflict.duration);continue}
    if(day.dateISO===old.dateISO&&start<=minutes(old.start)){start=minutes(old.start)+durationMinutes(old.duration);continue}
    after.blocks.push(b);placed=true;break
   }
   if(placed)break
  }
  if(!placed)return proposal(plan,plan,'recovery',`Recover ${old.title}`,[deadline?`There is not enough remaining time on or before the deadline (${deadline}). Try deferring or edit the task deadline or availability.`:'There is not enough remaining time this week. Try deferring or edit your availability.'])
 }
 return proposal(plan,after,'recovery',`${choice==='split'?'Split':'Move'} ${old.title}`,validatePlan(after,input.availability,input.tasks))
}
/** Execution is reconciled against the applied snapshot, not inferred from generated
 * done blocks. This keeps immediate recovery Undo exact while retaining later work. */
function completedMinutes(block:PlanBlockData):number {
 const duration=durationMinutes(block.duration)
 return Math.max(0,Math.min(duration,block.status==='done'?duration:block.status==='partial'?(block.completedMinutes??Math.floor(duration/2)):0))
}
function executionKey(block:PlanBlockData):string { return block.taskId?`task:${block.taskId}`:`block:${block.id}` }
function reconcileExecution(target:WeeklyPlan,current:WeeklyPlan,baseline:WeeklyPlan):WeeklyPlan {
 const result=clone(target)
 const keys=new Set(current.blocks.map(executionKey))
 for(const key of keys){
  const currentBlocks=current.blocks.filter(b=>executionKey(b)===key)
  const baselineBlocks=baseline.blocks.filter(b=>executionKey(b)===key)
  const targetBlocks=result.blocks.filter(b=>executionKey(b)===key)
  const sum=(blocks:PlanBlockData[])=>blocks.reduce((n,b)=>n+completedMinutes(b),0)
  const delta=sum(currentBlocks)-sum(baselineBlocks)
  if(!targetBlocks.length){
   if(delta>0){
    let remaining=delta
    for(const b of currentBlocks){const amount=Math.min(remaining,completedMinutes(b));if(amount>0){result.blocks.push(makeBlock(b.id,b.title,b.dateISO!,minutes(b.start),amount,{taskId:b.taskId,fixed:b.fixed,status:'done',completedMinutes:amount,remainingMinutes:0,rationale:b.rationale,signals:clone(b.signals)}));remaining-=amount}}
    const taskId=currentBlocks[0]?.taskId
    if(taskId&&currentBlocks.every(b=>b.status==='done')&&!current.unscheduled.some(t=>t.taskId===taskId))result.unscheduled=result.unscheduled.filter(t=>t.taskId!==taskId)
   }
   continue
  }
  const capacity=targetBlocks.reduce((n,b)=>n+durationMinutes(b.duration),0)
  const wanted=Math.max(0,Math.min(capacity,sum(targetBlocks)+delta))
  let difference=wanted-sum(targetBlocks)
  for(const b of (difference<0?[...targetBlocks].reverse():targetBlocks)){
   const old=completedMinutes(b),duration=durationMinutes(b.duration)
   const amount=difference>0?Math.min(difference,duration-old):Math.max(difference,-old)
   if(amount!==0){const completed=old+amount;b.completedMinutes=completed;b.remainingMinutes=duration-completed;b.status=completed===duration?'done':completed>0?'partial':'scheduled';difference-=amount}
   // A later explicit missed/scheduled update is retained when no work remains
   // completed on this block. Structural block changes alone do not count.
   const live=currentBlocks.find(c=>c.id===b.id),previous=baselineBlocks.find(c=>c.id===b.id)
   if(completedMinutes(b)===0&&live&&previous&&live.status!==previous.status&&['missed','scheduled','deferred'].includes(live.status??'')){b.status=live.status;b.completedMinutes=0;b.remainingMinutes=duration}
  }
  const taskId=targetBlocks[0]?.taskId
  if(taskId&&targetBlocks.every(b=>b.status==='done'))result.unscheduled=result.unscheduled.filter(t=>t.taskId!==taskId)
 }
 return recalculate(result)
}
function syncTaskCompletion(state:AppState):AppState {
 if(!state.acceptedPlan)return state
 const plan=state.acceptedPlan
 state.tasks=state.tasks.map(task=>{const blocks=plan.blocks.filter(b=>b.taskId===task.id);return blocks.length?{...task,done:blocks.every(b=>b.status==='done')&&!plan.unscheduled.some(t=>t.taskId===task.id)&&!plan.deferredTaskIds?.includes(task.id)}:task})
 return state
}
export function proposeRestore(plan:WeeklyPlan,entry:PlanHistoryEntry,availability?:Availability,tasks:TaskItem[]=[]):PlanProposal {
 const target=reconcileExecution(entry.before??entry.after,plan,entry.after)
 return proposal(plan,target,'restore',`Restore before ${entry.label}`,validatePlan(target,availability,tasks))
}
function assertApplicable(state:AppState,p:PlanProposal,current:WeeklyPlan|null):void {
 if(p.errors.length)throw new Error(p.errors.join(' '))
 if(JSON.stringify(current)!==JSON.stringify(p.before))throw new Error('Your plan changed since this preview. Please preview again.')
 // Inputs can change while the plan snapshot stays identical. Preview validation
 // is advisory; every commit must enforce the current task constraints again.
 const errors=[...validatePlan(p.after,state.availability,state.tasks),...validateTaskSelectionProposal(p,{tasks:state.tasks,availability:state.availability,commitments:state.commitments,cycleBasics:state.cycleBasics})]
 if(errors.length)throw new Error(errors.join(' '))
}
function mirrorsAccepted(state:AppState):boolean{return !state.draftPlan||JSON.stringify(state.draftPlan)===JSON.stringify(state.acceptedPlan)}
/** Applies an approved proposal. An optional cycle change is committed in the same step and recorded for Undo. */
export function applyProposal(state:AppState,p:PlanProposal,cycle?:CycleSnapshot):AppState {
 assertApplicable(state,p,state.acceptedPlan)
 const next=clone(state)
 const entry:PlanHistoryEntry={id:`change-${Date.now()}-${state.history.length}`,kind:p.kind,label:p.label,createdAt:new Date().toISOString(),before:clone(p.before),after:clone(p.after)}
 if(cycle){entry.cycleBefore={mode:state.cycleMode,basics:clone(state.cycleBasics)};next.cycleMode=cycle.mode;next.cycleBasics=clone(cycle.basics)}
 next.acceptedPlan=clone(p.after);if(p.kind==='accept'||mirrorsAccepted(state))next.draftPlan=clone(p.after);next.history=[...next.history,entry].slice(-30);next.onboardingComplete=true
 return syncTaskCompletion(next)
}
export function applyDraftProposal(state:AppState,p:PlanProposal,cycle?:CycleSnapshot):AppState {
 assertApplicable(state,p,state.draftPlan)
 return {...clone(state),draftPlan:clone(p.after),...(cycle?{cycleMode:cycle.mode,cycleBasics:clone(cycle.basics)}:{})}
}
export function acceptPlan(state:AppState,plan:WeeklyPlan):AppState {return applyProposal(state,proposal(state.acceptedPlan,plan,'accept','Accept plan',[...validatePlan(plan,state.availability,state.tasks),...planningIssues(plan)]))}
export function undoLastChange(state:AppState):AppState {
 const last=state.history.at(-1)
 if(!last)return state
 const current=state.acceptedPlan??last.after,target=last.before?reconcileExecution(last.before,current,last.after):null
 if(target){const errors=validatePlan(target,state.availability,state.tasks);if(errors.length)throw new Error(errors.join(' '))}
 const next=clone(state)
 next.acceptedPlan=target;if(last.kind==='accept'||mirrorsAccepted(state))next.draftPlan=clone(target??reconcileExecution(last.after,current,last.after));next.history.pop();if(last.cycleBefore){next.cycleMode=last.cycleBefore.mode;next.cycleBasics=clone(last.cycleBefore.basics)}next.onboardingComplete=!!next.acceptedPlan
 return syncTaskCompletion(next)
}
export function updateBlockStatus(state:AppState,id:string,status:BlockStatus):AppState {const next=clone(state);if(!next.acceptedPlan)return next;next.acceptedPlan.blocks=next.acceptedPlan.blocks.map(b=>b.id===id?{...b,status,completedMinutes:status==='done'?durationMinutes(b.duration):status==='partial'?Math.floor(durationMinutes(b.duration)/2):0,remainingMinutes:status==='done'?0:status==='partial'?Math.ceil(durationMinutes(b.duration)/2):durationMinutes(b.duration)}:b);if(mirrorsAccepted(state))next.draftPlan=clone(next.acceptedPlan);return syncTaskCompletion(next)}
