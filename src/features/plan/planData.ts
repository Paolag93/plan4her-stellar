export type CanonicalPlanBlockId='prepare'|'research'|'review'|'admin'|'finalize'
export type PlanBlockId=string

export interface PlanWeekDay { short:string;number:string;label:string;date:string;dateISO?:string }
export interface PlanBlockEdit { id:PlanBlockId;title:string;date:string;dateISO?:string;start:string;duration:string;fixed:boolean }
export interface PlanChangeData { id:string;title:string;kind:string;before:string;after:string;note:string }
export interface PlanComparisonProps { changes?:PlanChangeData[];before?:PlanBlockData[];after?:PlanBlockData[];previousVersion?:string;currentVersion?:string;scheduledLoad?:number }
export interface PlanViewDataProps { blocks?:PlanBlockData[];week?:readonly PlanWeekDay[];scheduledLoad?:number;todayISO?:string;/** dateISO → estimated phase, live plans only. */phases?:Readonly<Record<string,string>> }

export interface PlanSignal{title:string;body:string}
export interface PlanBlockData{
 id:PlanBlockId
 remainingMinutes?:number
 completedMinutes?:number
 taskId?:string
 dateISO?:string
 status?:string
 fixed?:boolean
 title:string
 day:string
 shortDay:string
 dayNumber:string
 date:string
 time:string
 start:string
 duration:string
 rationale:string
 signals:PlanSignal[]
 rationaleNode:string
 editNode:string
 overlayNode:string
 directRationaleNode?:string
 directEditNode?:string
}

const genericCycle='Cycle context is used only as a soft preference. Fixed commitments and your choices take priority.'

export const PLAN_BLOCKS:PlanBlockData[]=[
 {id:'prepare',title:'Prepare proposal',day:'Monday',shortDay:'Mon',dayNumber:'23',date:'Mon 23 Oct',time:'09:00–10:30',start:'09:00',duration:'90 min',
 rationale:'Placed before your fixed 11:00 meeting, inside your availability window.',
 signals:[
  {title:'Fixed commitment',body:'Your 11:00 meeting creates a boundary this task cannot overlap.'},
  {title:'Availability',body:'09:00–10:30 is inside the time window you said is available.'},
  {title:'Cycle context',body:genericCycle},
 ],rationaleNode:'4700:7586',editNode:'4700:7603',overlayNode:'4700:7670',directRationaleNode:'4250:1715',directEditNode:'4250:1732'},
 {id:'research',title:'Research notes',day:'Tuesday',shortDay:'Tue',dayNumber:'24',date:'Tue 24 Oct',time:'10:00–11:00',start:'10:00',duration:'60 min',
 rationale:'Placed after your morning start to preserve a longer open window later.',
 signals:[
  {title:'Availability',body:'10:00–11:00 fits the availability you set for Tuesday.'},
  {title:'Weekly balance',body:'This placement keeps more of the afternoon open.'},
  {title:'Cycle context',body:genericCycle},
 ],rationaleNode:'4700:7681',editNode:'4700:7698',overlayNode:'4700:7764'},
 {id:'review',title:'Review proposal',day:'Wednesday',shortDay:'Wed',dayNumber:'25',date:'Wed 25 Oct',time:'09:30–10:30',start:'09:30',duration:'60 min',
 rationale:'Placed in a protected morning window before your fixed evening class.',
 signals:[
  {title:'Fixed commitment',body:'Your evening class remains protected and unchanged.'},
  {title:'Availability',body:'09:30–10:30 fits the morning window you made available.'},
  {title:'Cycle context',body:genericCycle},
 ],rationaleNode:'4700:7775',editNode:'4700:7792',overlayNode:'4700:7858'},
 {id:'admin',title:'Admin follow-up',day:'Thursday',shortDay:'Thu',dayNumber:'26',date:'Thu 26 Oct',time:'14:00–15:00',start:'14:00',duration:'60 min',
 rationale:'Placed after lunch, leaving the morning open.',
 signals:[
  {title:'Availability',body:'14:00–15:00 fits your Thursday availability.'},
  {title:'Weekly balance',body:'The morning remains open instead of fragmenting the day.'},
  {title:'Cycle context',body:genericCycle},
 ],rationaleNode:'4700:7869',editNode:'4700:7886',overlayNode:'4700:7952'},
 {id:'finalize',title:'Finalize proposal',day:'Friday',shortDay:'Fri',dayNumber:'27',date:'Fri 27 Oct',time:'09:00–10:00',start:'09:00',duration:'60 min',
 rationale:'Placed early so the week closes with one clear delivery block.',
 signals:[
  {title:'Delivery timing',body:'An early block keeps the main delivery clear and visible.'},
  {title:'Availability',body:'09:00–10:00 is inside your Friday availability.'},
  {title:'Cycle context',body:genericCycle},
 ],rationaleNode:'4700:7963',editNode:'4700:7980',overlayNode:'4700:8046'},
]

export const WEEK_DAYS:readonly PlanWeekDay[]=[
 {short:'Mon',number:'23',label:'Monday',date:'23 Oct'},
 {short:'Tue',number:'24',label:'Tuesday',date:'24 Oct'},
 {short:'Wed',number:'25',label:'Wednesday',date:'25 Oct'},
 {short:'Thu',number:'26',label:'Thursday',date:'26 Oct'},
 {short:'Fri',number:'27',label:'Friday',date:'27 Oct'},
 {short:'Sat',number:'28',label:'Saturday',date:'28 Oct'},
 {short:'Sun',number:'29',label:'Sunday',date:'29 Oct'},
] as const

/** Presentation-only comparison. Scheduling decisions belong to the domain layer. */
export function comparePlanBlocks(before:PlanBlockData[],after:PlanBlockData[]):PlanChangeData[]{
 const old=new Map(before.map(block=>[block.id,block]))
 const next=new Map(after.map(block=>[block.id,block]))
 const describe=(block:PlanBlockData)=>`${block.day} · ${block.time}${block.fixed?' · Fixed':''}`
 return [...new Set([...old.keys(),...next.keys()])].flatMap(id=>{
  const a=old.get(id),b=next.get(id)
  if(a&&b&&a.title===b.title&&a.date===b.date&&a.dateISO===b.dateISO&&a.time===b.time&&a.fixed===b.fixed)return []
  return [{id,title:b?.title??a!.title,kind:!a?'Added':!b?'Removed':'Changed',before:a?`${a.title!==b?.title?a.title+' · ':''}${describe(a)}`:'Not scheduled',after:b?describe(b):'Not scheduled',note:'Review this change before applying it.'}]
 })
}
