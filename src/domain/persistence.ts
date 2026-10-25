import { DAYS, type AppState, type Availability, type WeeklyPlan } from './types'
import { clock, dateFromISO, durationMinutes, isISODate, localISO, minutes } from './planner'
import { createDefaultCyclePreferences, CYCLE_PHASES, PLANNING_TEMPLATES, WORK_TYPES } from './cyclePreferences'
export const STORAGE_KEY='plan4her:local-state:v1'
// Bounds protect the local UI from accidentally imported or corrupted data. They
// are resource limits, not encryption or a guarantee against same-origin scripts.
export const MAX_STORAGE_CHARS=2_000_000
const MAX_ITEMS=1000, MAX_TEXT=4096
const UNREADABLE='Saved data could not be read. It has been kept on this device. Clear local data only if you want to start over.'
export interface StorageAdapter { getItem(key:string):string|null; setItem(key:string,value:string):void; removeItem(key:string):void }
export interface StorageResult { state:AppState; error?:string; snapshot?:string|null }
export interface StorageWriteResult { error?:string; conflict?:boolean }
export interface StorageWriteGuard { expectedRaw:string|null }
const CONFLICT = 'Saved data changed in another tab. Reload this tab before making changes.'
export function createInitialState():AppState{return {version:1,onboardingComplete:false,tasks:[],availability:Object.fromEntries(DAYS.map((day,i)=>[day,i<5?'09:00–18:00':'10:00–16:00'])) as Availability,commitments:[],cycleBasics:null,cycleMode:null,cyclePreferences:createDefaultCyclePreferences(),analyticsConsent:false,draftPlan:null,acceptedPlan:null,history:[]}}
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&(Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null)
const str=(v:unknown):v is string=>typeof v==='string'&&v.length<=MAX_TEXT
const id=(v:unknown):v is string=>str(v)&&v.length>0&&v.length<=256
const number=(v:unknown,max:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max
const optional=(v:unknown,check:(value:unknown)=>boolean)=>v===undefined||check(v)
const list=(v:unknown,check:(value:unknown)=>boolean,max=MAX_ITEMS):v is unknown[]=>Array.isArray(v)&&v.length<=max&&Array.from(v).every(check)
const keys=(v:Record<string,unknown>,allowed:string)=>Object.keys(v).every(key=>allowed.split(' ').includes(key))
const unique=(items:unknown[])=>new Set(items.map(item=>(item as Record<string,unknown>).id)).size===items.length
const time=(v:unknown)=>str(v)&&Number.isFinite(minutes(v))
const duration=(v:unknown)=>str(v)&&v.trim().length>0&&Number.isFinite(durationMinutes(v))
// Reject prototype keys, accessors, cyclic references, excessive nesting and work
// before inspecting the schema. Never coerce attacker-controlled objects to text.
function safeTree(value:unknown):boolean {
 let nodes=0,chars=0
 const seen=new Set<object>()
 function visit(v:unknown,depth:number):boolean {
  if(++nodes>100_000||depth>16)return false
  if(typeof v==='string'){chars+=v.length;return v.length<=MAX_TEXT&&chars<=MAX_STORAGE_CHARS}
  if(v===null||v===undefined||typeof v==='boolean')return true
  if(typeof v==='number')return Number.isFinite(v)
  if(typeof v!=='object'||(!Array.isArray(v)&&!record(v))||seen.has(v))return false
  seen.add(v)
  if(Array.isArray(v)&&v.length>MAX_ITEMS)return false
  for(const [key,descriptor] of Object.entries(Object.getOwnPropertyDescriptors(v))){
   if(['__proto__','prototype','constructor'].includes(key)||!('value'in descriptor)||!visit(descriptor.value,depth+1))return false
  }
  seen.delete(v);return true
 }
 return visit(value,0)
}
function validPlan(v:unknown):v is WeeklyPlan {
 if(!record(v)||!keys(v,'id weekStart week blocks unscheduled warnings scheduledLoad scheduledMinutes availableMinutes deferredTaskIds')||!id(v.id)||!isISODate(v.weekStart))return false
 if(!list(v.week,d=>record(d)&&keys(d,'short number label date dateISO')&&['short','number','label','date'].every(k=>str(d[k]))&&isISODate(d.dateISO),7)||v.week.length!==7)return false
 const dates=v.week.map(d=>(d as Record<string,unknown>).dateISO)
 if(new Set(dates).size!==7||dates[0]!==v.weekStart||dateFromISO(v.weekStart).getDay()!==1)return false
 for(let i=0;i<7;i++){const day=v.week[i] as Record<string,unknown>,expected=dateFromISO(v.weekStart);expected.setDate(expected.getDate()+i);if(day.dateISO!==localISO(expected)||day.label!==DAYS[i]||day.short!==DAYS[i].slice(0,3)||day.number!==String(expected.getDate()))return false}
 if(!list(v.blocks,b=>{
  if(!record(b)||!keys(b,'id title day shortDay dayNumber date time start duration rationale signals rationaleNode editNode overlayNode directRationaleNode directEditNode remainingMinutes completedMinutes taskId dateISO status fixed'))return false
  if(!id(b.id)||!['title','day','shortDay','dayNumber','date','time','rationale','rationaleNode','editNode','overlayNode'].every(k=>str(b[k]))||!isISODate(b.dateISO)||!dates.includes(b.dateISO)||!time(b.start)||!duration(b.duration))return false
  const length=durationMinutes(b.duration as string),day=dateFromISO(b.dateISO),label=DAYS[(day.getDay()+6)%7]
  if(b.day!==label||b.shortDay!==label.slice(0,3)||b.dayNumber!==String(day.getDate())||b.time!==`${clock(minutes(b.start as string))}–${clock(minutes(b.start as string)+length)}`)return false
  return minutes(b.start as string)+length<=1440&&optional(b.taskId,id)&&optional(b.fixed,x=>typeof x==='boolean')&&optional(b.status,x=>typeof x==='string'&&['scheduled','done','partial','missed','deferred'].includes(x))&&['directRationaleNode','directEditNode'].every(k=>optional(b[k],str))&&['remainingMinutes','completedMinutes'].every(k=>optional(b[k],x=>number(x,length)&&Number.isInteger(x)))&&list(b.signals,s=>record(s)&&keys(s,'title body')&&str(s.title)&&str(s.body),32)
 })||!unique(v.blocks))return false
 return list(v.unscheduled,t=>record(t)&&keys(t,'taskId title reason')&&id(t.taskId)&&str(t.title)&&str(t.reason))&&list(v.warnings,str)&&number(v.scheduledLoad,100)&&optional(v.scheduledMinutes,x=>number(x,10080))&&optional(v.availableMinutes,x=>number(x,10080))&&optional(v.deferredTaskIds,x=>list(x,id))
}
export function validateState(v:unknown):v is AppState {
 if(!safeTree(v)||!record(v)||!keys(v,'version onboardingComplete tasks availability commitments cycleBasics cycleMode cyclePreferences analyticsConsent draftPlan acceptedPlan history')||v.version!==1||typeof v.onboardingComplete!=='boolean'||typeof v.analyticsConsent!=='boolean')return false
 if(!(v.cycleMode===null||['natural','predictable','unsure'].includes(v.cycleMode as string))||!record(v.availability)||!keys(v.availability,DAYS.join(' '))||!DAYS.every(d=>str((v.availability as Record<string,unknown>)[d])))return false
 // Availability remains editable draft text; the planner validates its syntax.
 if(!list(v.tasks,t=>record(t)&&keys(t,'id canonicalId title meta kind duration deadline fixedDate startTime importance workType done')&&id(t.id)&&str(t.title)&&str(t.meta)&&['Flexible','Fixed'].includes(t.kind as string)&&optional(t.canonicalId,x=>['dentist','groceries','yoga','meeting','prescription'].includes(x as string))&&optional(t.duration,duration)&&optional(t.deadline,x=>x==='No deadline'||x===''||isISODate(x))&&optional(t.fixedDate,x=>x===''||isISODate(x))&&optional(t.startTime,x=>x===''||time(x))&&optional(t.importance,x=>['Must','Important','Optional'].includes(x as string))&&optional(t.workType,x=>WORK_TYPES.includes(x as typeof WORK_TYPES[number]))&&optional(t.done,x=>typeof x==='boolean'))||!unique(v.tasks))return false
 if(!list(v.commitments,c=>record(c)&&keys(c,'id title date startTime endTime')&&id(c.id)&&str(c.title)&&isISODate(c.date)&&time(c.startTime)&&time(c.endTime)&&minutes(c.startTime as string)<minutes(c.endTime as string))||!unique(v.commitments))return false
 if(!(v.cycleBasics===null||(record(v.cycleBasics)&&keys(v.cycleBasics,'lastPeriodStart cycleLength')&&(v.cycleBasics.lastPeriodStart===null||isISODate(v.cycleBasics.lastPeriodStart))&&number(v.cycleBasics.cycleLength,90)&&Number.isInteger(v.cycleBasics.cycleLength)&&(v.cycleBasics.cycleLength as number)>=15)))return false
 if(!optional(v.cyclePreferences,p=>record(p)&&keys(p,'template phaseWork')&&PLANNING_TEMPLATES.includes(p.template as typeof PLANNING_TEMPLATES[number])&&record(p.phaseWork)&&keys(p.phaseWork,CYCLE_PHASES.join(' '))&&CYCLE_PHASES.every(phase=>{const values=(p.phaseWork as Record<string,unknown>)[phase];return list(values,x=>WORK_TYPES.includes(x as typeof WORK_TYPES[number]),WORK_TYPES.length)&&new Set(values).size===values.length})))return false
 return (v.draftPlan===null||validPlan(v.draftPlan))&&(v.acceptedPlan===null||validPlan(v.acceptedPlan))&&list(v.history,h=>record(h)&&keys(h,'id label createdAt kind before after')&&id(h.id)&&str(h.label)&&str(h.createdAt)&&Number.isFinite(Date.parse(h.createdAt))&&['edit','adjust','recovery','restore','accept'].includes(h.kind as string)&&(h.before===null||validPlan(h.before))&&validPlan(h.after),30)
}
/** Explicit migration only. Unknown future versions are never silently overwritten. */
export function migrateState(raw:unknown):AppState {
 if(!safeTree(raw))throw new Error(UNREADABLE)
 if(record(raw)&&raw.version===0){const upgraded={...createInitialState(),...raw,version:1};if(validateState(upgraded))return upgraded}
 if(validateState(raw))return raw.cyclePreferences?raw:{...raw,cyclePreferences:createDefaultCyclePreferences()}
 throw new Error(UNREADABLE)
}
function browserStorage():StorageAdapter {return window.localStorage}
export function loadState(storage?:StorageAdapter):StorageResult {
 let raw:string|null
 try{raw=(storage??browserStorage()).getItem(STORAGE_KEY)}catch{return {state:createInitialState(),error:'Local storage is unavailable. Your saved data has not been changed.'}}
 if(raw===null)return {state:createInitialState(),snapshot:null}
 try{if(raw.length>MAX_STORAGE_CHARS)throw new Error(UNREADABLE);return {state:migrateState(JSON.parse(raw)),snapshot:raw}}catch{return {state:createInitialState(),error:UNREADABLE,snapshot:raw}}
}
export function saveState(state:AppState,storage?:StorageAdapter,guard?:StorageWriteGuard):StorageWriteResult{try{if(!validateState(state))throw new Error('Invalid state');const raw=JSON.stringify(state);if(raw.length>MAX_STORAGE_CHARS)throw new Error('State too large');const target=storage??browserStorage();const existing=target.getItem(STORAGE_KEY);if(guard&&existing!==guard.expectedRaw){if(existing===raw)return {};return {error:CONFLICT,conflict:true}};if(existing!==null){if(existing.length>MAX_STORAGE_CHARS)throw new Error('Unreadable existing state');migrateState(JSON.parse(existing))}target.setItem(STORAGE_KEY,raw);return {}}catch{return {error:'Changes could not be saved on this device. Keep this tab open and try again.'}}}
export function clearState(storage?:StorageAdapter,guard?:StorageWriteGuard):StorageWriteResult{try{const target=storage??browserStorage();if(guard&&target.getItem(STORAGE_KEY)!==guard.expectedRaw)return {error:CONFLICT,conflict:true};target.removeItem(STORAGE_KEY);return {}}catch{return {error:'Local data could not be cleared. Check browser storage permissions and try again.'}}}
