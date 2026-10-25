import { DAYS, type PlannerInput, type WeeklyPlan, type PlanBlockData, type PlanWeekDay, type TaskItem } from './types'
import { createDefaultCyclePreferences, planningCycleContext, WORK_TYPES, WORK_TYPE_LABELS } from './cyclePreferences'
export const clone = <T,>(value:T):T => JSON.parse(JSON.stringify(value)) as T
export function localISO(date=new Date()):string { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` }
export function isISODate(value:unknown):value is string { return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&value>='0001-01-01'&&localISO(new Date(`${value}T12:00:00`))===value }
export function dateFromISO(value:string):Date { return new Date(`${value}T12:00:00`) }
export function currentWeekStart(value=localISO()):string { if(!isISODate(value))throw new Error('Choose a valid planning date.');const d=dateFromISO(value); d.setDate(d.getDate()-((d.getDay()+6)%7)); return localISO(d) }
export function weekDays(start=currentWeekStart()):PlanWeekDay[] { const d=dateFromISO(start); return DAYS.map((label,i)=>{ const day=new Date(d); day.setDate(d.getDate()+i);return {label,short:label.slice(0,3),number:String(day.getDate()),date:`${day.getDate()} ${day.toLocaleString('en-GB',{month:'short'})}`,dateISO:localISO(day)} }) }
export function minutes(value:string):number { const m=value.trim().match(/^(\d{1,2}):(\d{2})$/); return m&&+m[1]<24&&+m[2]<60?+m[1]*60 + +m[2]:NaN }
export function clock(value:number):string { return `${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}` }
export function durationMinutes(value?:string):number { if(!value)return 30; const match=value.trim().match(/^(\d+(?:\.\d+)?)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours)?$/i);if(!match)return NaN;const n=Number(match[1])*(/^h/i.test(match[2]??'')?60:1);return Number.isFinite(n)&&n>=1&&n<=1440?Math.round(n):NaN }
export function availabilityWindow(value:string):[number,number]|null { const parts=value.split(/[–—-]/); if(parts.length!==2)return null;const a=minutes(parts[0]),b=minutes(parts[1]);return Number.isFinite(a)&&Number.isFinite(b)&&a<b?[a,b]:null }
export function resolveDate(value:string|undefined,week:PlanWeekDay[]):string|undefined { if(!value)return undefined; const iso=value.match(/\b(\d{4}-\d{2}-\d{2})\b/)?.[1];if(iso&&isISODate(iso))return iso;const clean=value.replace(/,/g,'').trim().toLowerCase();const match=week.find(d=>clean===d.label.toLowerCase()||clean===d.short.toLowerCase()||clean===d.date.toLowerCase()||clean===`${d.short} ${d.date}`.toLowerCase());return match?.dateISO }
export function makeBlock(id:string,title:string,dateISO:string,start:number,duration:number,extra:Partial<PlanBlockData>={}):PlanBlockData { const d=dateFromISO(dateISO),day=DAYS[(d.getDay()+6)%7],number=String(d.getDate());return {id,title,dateISO,day,shortDay:day.slice(0,3),dayNumber:number,date:`${day.slice(0,3)} ${number} ${d.toLocaleString('en-GB',{month:'short'})}`,start:clock(start),duration:`${duration} min`,time:`${clock(start)}–${clock(start+duration)}`,status:'scheduled',fixed:false,rationale:'Scheduled inside your available time without overlapping another block.',signals:[{title:'Availability',body:'This block fits the available time you entered.'}],rationaleNode:'4250:1715',editNode:'4250:1732',overlayNode:'4700:7670',...extra} }
export function overlaps(a:PlanBlockData,b:PlanBlockData):boolean { return a.dateISO===b.dateISO && minutes(a.start)<minutes(b.start)+durationMinutes(b.duration)&&minutes(b.start)<minutes(a.start)+durationMinutes(a.duration) }
export function recalculate(plan:WeeklyPlan):WeeklyPlan { const result=clone(plan);result.blocks.sort((a,b)=>(a.dateISO??'').localeCompare(b.dateISO??'')||minutes(a.start)-minutes(b.start)||a.id.localeCompare(b.id));result.scheduledMinutes=result.blocks.reduce((sum,b)=>sum+durationMinutes(b.duration),0);result.scheduledLoad=result.availableMinutes?Math.min(100,Math.round(result.scheduledMinutes/result.availableMinutes*100)):0;return result }
export function generateWeeklyPlan(input:PlannerInput):WeeklyPlan {
 const weekStart=currentWeekStart(input.weekStart),week=weekDays(weekStart);const now=new Date(),today=localISO(now),earliestMinute=Math.ceil((now.getHours()*60+now.getMinutes())/15)*15;const plan:WeeklyPlan={id:`plan-${weekStart}`,weekStart,week,blocks:[],unscheduled:[],warnings:[],scheduledLoad:0,...(input.deferredTaskIds?.length?{deferredTaskIds:[...input.deferredTaskIds]}:{}),availableMinutes:DAYS.reduce((sum,day)=>{const w=availabilityWindow(input.availability[day]??'');return sum+(w?w[1]-w[0]:0)},0)};
 const report=(task:{id:string;title:string},reason:string)=>plan.unscheduled.push({taskId:task.id,title:task.title,reason});
 const taskSignals=(task:TaskItem)=>{const deadline=resolveDate(task.deadline,week);return [{title:'Duration estimate',body:`The full ${durationMinutes(task.duration)} minute task estimate is scheduled.`},...(deadline?[{title:'Deadline',body:`This block finishes on or before your deadline of ${deadline}.`}]:[])]}
 for(const d of DAYS)if(input.availability[d]?.trim()&&!availabilityWindow(input.availability[d]))plan.warnings.push(`${d}: availability could not be read.`);
 for(const c of input.commitments){const date=resolveDate(c.date,week),start=minutes(c.startTime),end=minutes(c.endTime);if(!date||!Number.isFinite(start)||!Number.isFinite(end)||end<=start){plan.warnings.push(`${c.title}: check the fixed commitment date and times.`);report(c,'Add a valid fixed commitment date, start time and end time.');continue}if(!week.some(d=>d.dateISO===date))continue;const b=makeBlock(`commitment-${c.id}`,c.title,date,start,end-start,{fixed:true,rationale:'Your fixed commitment remains at the time you chose.',signals:[]});if(plan.blocks.some(a=>overlaps(a,b))){plan.warnings.push(`${c.title}: overlaps another fixed commitment. Resolve this conflict before accepting.`);report(c,'The fixed commitment overlaps another fixed commitment.');continue}plan.blocks.push(b)}
 const tasks=input.tasks.filter(t=>!t.done&&!input.deferredTaskIds?.includes(t.id));for(const t of tasks.filter(t=>t.kind==='Fixed')){const date=resolveDate(t.fixedDate,week),start=minutes(t.startTime??''),duration=durationMinutes(t.duration);if(!date||!Number.isFinite(start)||!Number.isFinite(duration)||start+duration>1440){report(t,'Add a valid fixed date, start time and duration.');continue}if(!week.some(d=>d.dateISO===date)){report(t,'The fixed date is outside this week.');continue}const deadline=resolveDate(t.deadline,week);if(deadline&&date>deadline){report(t,'The fixed time is after the deadline.');continue}const b=makeBlock(`task-${t.id}`,t.title,date,start,duration,{taskId:t.id,fixed:true,rationale:'Your fixed task stays at the date and time you chose.',signals:taskSignals(t)});if(plan.blocks.some(a=>overlaps(a,b))){report(t,'The fixed time overlaps another commitment.');continue}plan.blocks.push(b)}
 const priority={Must:0,Important:1,Optional:2};const flexible=tasks.filter(t=>t.kind!=='Fixed').sort((a,b)=>(priority[a.importance??'Important']-priority[b.importance??'Important'])||(resolveDate(a.deadline,week)??'9999').localeCompare(resolveDate(b.deadline,week)??'9999')||a.id.localeCompare(b.id));
 const preferences=input.cyclePreferences??createDefaultCyclePreferences()
 const context=(dateISO:string|undefined)=>planningCycleContext(dateISO,input.cycleMode,input.cycleBasics)
 const preferencesActive=week.some(day=>context(day.dateISO).status==='estimated')
 // Candidates are the edges of free intervals, not arbitrary medical scores.
 // One edge suffices for earliest/day-load ranking; both edges allow compact
 // placement next to an already scheduled flexible block without overlap.
 const candidates=(task:TaskItem,occupied:PlanBlockData[],compact:boolean):PlanBlockData[]=>{
  const result:PlanBlockData[]=[],duration=durationMinutes(task.duration),deadline=resolveDate(task.deadline,week)
  for(const day of week){
   if((!input.weekStart&&day.dateISO!<today)||(deadline&&day.dateISO!>deadline))continue
   const window=availabilityWindow(input.availability[day.label as typeof DAYS[number]]??'')
   if(!window)continue
   let cursor=!input.weekStart&&day.dateISO===today?Math.max(window[0],earliestMinute):window[0]
   const addGap=(start:number,end:number)=>{
    if(start+duration>end)return
    result.push(makeBlock(`task-${task.id}`,task.title,day.dateISO!,start,duration,{taskId:task.id}))
    if(compact&&end-duration>start)result.push(makeBlock(`task-${task.id}`,task.title,day.dateISO!,end-duration,duration,{taskId:task.id}))
   }
   const reservations=occupied.filter(block=>block.dateISO===day.dateISO).sort((a,b)=>minutes(a.start)-minutes(b.start))
   for(const reservation of reservations){
    const start=minutes(reservation.start),end=start+durationMinutes(reservation.duration)
    if(end<=cursor)continue
    addGap(cursor,Math.min(start,window[1]))
    cursor=Math.max(cursor,end)
    if(cursor>=window[1])break
   }
   addGap(cursor,window[1])
  }
  return result.sort((a,b)=>a.dateISO!.localeCompare(b.dateISO!)||minutes(a.start)-minutes(b.start))
 }
 const allocate=(usePreferences:boolean):WeeklyPlan=>{
  const result=clone(plan)
  for(const task of flexible){
   const duration=durationMinutes(task.duration),deadline=resolveDate(task.deadline,week)
   if(!Number.isFinite(duration)){result.unscheduled.push({taskId:task.id,title:task.title,reason:'Add a valid task duration.'});continue}
   if(task.deadline&&task.deadline!=='No deadline'&&!deadline)result.warnings.push(`${task.title}: deadline could not be read; enter an ISO date to enforce it.`)
   const slots=candidates(task,result.blocks,usePreferences&&preferences.template==='high-output')
   if(!slots.length){result.unscheduled.push({taskId:task.id,title:task.title,reason:deadline?'No available space before the deadline.':'Not enough available time this week.'});continue}
   const earliest=slots[0]
   if(usePreferences){
    const workType=WORK_TYPES.find(type=>type===task.workType)??'general'
    const matches=(block:PlanBlockData)=>{const estimate=context(block.dateISO);return workType!=='general'&&estimate.status==='estimated'&&preferences.phaseWork[estimate.phase].includes(workType)}
    const dailyMinutes=(block:PlanBlockData)=>result.blocks.filter(other=>other.dateISO===block.dateISO).reduce((sum,other)=>sum+durationMinutes(other.duration),0)
    const idleGap=(block:PlanBlockData)=>{
     // Selection/adjustment protect existing flexible work using fixed task
     // reservations. Retain its original identity for scoring only, never for
     // placement or mutation. Anchors must still have an actual reservation.
     const anchors=(input.templateAnchors??[]).filter(anchor=>!anchor.fixed&&anchor.dateISO===block.dateISO&&result.blocks.some(reservation=>reservation.dateISO===anchor.dateISO&&reservation.start===anchor.start&&durationMinutes(reservation.duration)===durationMinutes(anchor.duration)))
     const neighbors=[...result.blocks.filter(other=>other.dateISO===block.dateISO&&other.taskId&&!other.fixed),...anchors]
     return neighbors.length?Math.min(...neighbors.map(other=>Math.max(minutes(other.start)-(minutes(block.start)+duration),minutes(block.start)-(minutes(other.start)+durationMinutes(other.duration)),0))):Infinity
    }
    const templateScore=preferences.template==='recovery'?dailyMinutes:preferences.template==='high-output'?idleGap:()=>0
    const scores=new Map(slots.map(block=>[block,{match:Number(matches(block)),template:templateScore(block)}]))
    slots.sort((a,b)=>{const left=scores.get(a)!,right=scores.get(b)!;return right.match-left.match||(left.template===right.template?0:left.template<right.template?-1:1)||a.dateISO!.localeCompare(b.dateISO!)||minutes(a.start)-minutes(b.start)})
    const chosen=slots[0],estimate=context(chosen.dateISO),phaseChanged=matches(chosen)&&!matches(earliest)
    if(workType!=='general'&&estimate.status==='estimated'){
     const body=matches(chosen)
      ? `${phaseChanged?'Your editable preference favored this feasible day':'This feasible day also matches your editable preference'}: ${WORK_TYPE_LABELS[workType]} during the estimated ${estimate.phase.toLowerCase()} phase on ${chosen.dateISO} (cycle day ${estimate.day}). This is a preference, not an energy prediction.`
      : 'No feasible time matched this work type’s phase preference. Availability and deadlines determine this placement.'
     chosen.signals.push({title:'Cycle preference',body})
     if(phaseChanged)chosen.rationale=`Your ${estimate.phase.toLowerCase()} work preference favored this available day, after priority and deadline constraints.`
    }
    if(preferences.template!=='balanced'&&(chosen.dateISO!==earliest.dateISO||chosen.start!==earliest.start)&&!phaseChanged){
     const comparison=workType==='general'?'among feasible options':'among equally matching phase options'
     const body=preferences.template==='recovery'
      ? `Recovery preferred the feasible day with fewer minutes already booked, ${comparison}. Task duration is unchanged.`
      : `High-output preferred the feasible slot nearest already planned flexible work, ${comparison}. Task duration is unchanged.`
     chosen.signals.push({title:'Planning template',body})
     chosen.rationale=body
    }
   }
   slots[0].signals.push(...taskSignals(task))
   result.blocks.push(slots[0])
  }
  if(!input.tasks.length&&!input.commitments.length&&!input.deferredTaskIds?.length)result.warnings.push('Add at least one task to build your first week.')
  return recalculate(result)
 }
 const baseline=allocate(false)
 if(!preferencesActive)return baseline
 const preferred=allocate(true),preferredIds=new Set(preferred.blocks.map(block=>block.taskId))
 // A soft preference may never sacrifice a baseline task, including a higher
 // priority or earlier-deadline task, just to improve a match or distribution.
 // Both passes use the exact same full task durations and fixed reservations.
 if(baseline.blocks.every(block=>!block.taskId||preferredIds.has(block.taskId)))return preferred
 for(const block of baseline.blocks.filter(block=>!block.fixed)){
  block.signals.push({title:'Planning preference',body:'Earliest feasible placement was retained because applying the preferences left other work unscheduled. Every baseline task and its full duration are preserved.'})
 }
 return baseline
}
export interface PlannerAdapter { generate(input:PlannerInput):Promise<WeeklyPlan> }
export const localPlannerAdapter:PlannerAdapter={generate:async input=>generateWeeklyPlan(input)}
export async function generateWithAdapter(input:PlannerInput,adapter:PlannerAdapter=localPlannerAdapter,timeoutMs=5000):Promise<WeeklyPlan>{let timer:ReturnType<typeof setTimeout>|undefined;try{return await Promise.race([adapter.generate(input),new Promise<WeeklyPlan>((_,reject)=>{timer=setTimeout(()=>reject(new Error('Planning timed out. Your saved plan has not changed.')),timeoutMs)})])}finally{if(timer)clearTimeout(timer)}}
