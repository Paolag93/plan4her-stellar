export type DailyDayKey='mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun'
export type DailyTaskId=string

export interface DailyTaskData { id:DailyTaskId; title:string; meta:string; kind:'Flexible'|'Fixed'; day?:DailyDayKey; done?:boolean }
export interface DailyDayData {
  key:DailyDayKey
  nodeId:string
  short:string
  number:string
  plan?:{title:string;time:string;rationale?:string;cta:'Update progress'|'View in Plan';planId:'prepare'|'research'|'review'|'admin'|'finalize'}
  tasks:DailyTaskData[]
  phase:{day:string;pattern:string;note:string}
  emptyHeadline?:string
  emptyBody?:string
}

export const DAILY_DAYS:DailyDayData[]=[
 {key:'mon',nodeId:'4198:154',short:'Mon',number:'23',plan:{title:'Prepare proposal',time:'09:00–10:30',cta:'Update progress',planId:'prepare'},tasks:[{id:'meeting',title:'Team meeting',meta:'11:00-11:45',kind:'Fixed'},{id:'groceries',title:'Buy groceries',meta:'17:30-18:00',kind:'Flexible'}],phase:{day:'Day 8',pattern:'Energy may be rising',note:'Your plan leaves a little more room for focused work today.'}},
 {key:'tue',nodeId:'4272:3513',short:'Tue',number:'24',plan:{title:'Research notes',time:'10:00–11:00',rationale:'Placed after your morning start to preserve a longer open window before afternoon errands.',cta:'View in Plan',planId:'research'},tasks:[{id:'dentist',title:'Call dentist',meta:'13:00–13:30',kind:'Flexible'},{id:'prescription',title:'Pick up prescription',meta:'17:00–17:30',kind:'Flexible'}],phase:{day:'Day 9',pattern:'Steady focus may be easier',note:'Your plan keeps one focused block and leaves space around personal errands.'}},
 {key:'wed',nodeId:'4272:3628',short:'Wed',number:'25',plan:{title:'Review proposal',time:'09:30–10:30',rationale:'Placed in a protected morning window before your fixed evening class.',cta:'View in Plan',planId:'review'},tasks:[{id:'yoga',title:'Yoga class',meta:'18:00–19:30',kind:'Fixed'}],phase:{day:'Day 10',pattern:'Focused work may feel easier',note:'The day stays lighter after the morning block to protect the fixed evening class.'}},
 {key:'thu',nodeId:'4272:3743',short:'Thu',number:'26',plan:{title:'Admin follow-up',time:'14:00–15:00',rationale:'Placed after lunch, leaving the morning open and protecting your fixed meeting.',cta:'View in Plan',planId:'admin'},tasks:[{id:'meeting',title:'Team meeting',meta:'16:00–16:45',kind:'Fixed'},{id:'prescription',title:'Pick up prescription',meta:'17:30–18:00',kind:'Flexible'}],phase:{day:'Day 11',pattern:'Energy may remain steady',note:'The plan groups lighter follow-up work around fixed commitments.'}},
 {key:'fri',nodeId:'4314:5512',short:'Fri',number:'27',plan:{title:'Finalize proposal',time:'09:00–10:00',rationale:'Placed early so the week closes with one clear delivery block.',cta:'View in Plan',planId:'finalize'},tasks:[{id:'groceries',title:'Buy groceries',meta:'17:30–18:00',kind:'Flexible'}],phase:{day:'Day 12',pattern:'Energy may be steady',note:'The plan keeps the afternoon open after the final delivery block.'}},
 {key:'sat',nodeId:'4314:5535',short:'Sat',number:'28',tasks:[],phase:{day:'Day 13',pattern:'Energy may stay steady',note:'No work block was added because your availability can remain open.'},emptyHeadline:'Nothing scheduled for Saturday',emptyBody:'Your accepted plan keeps this day open. Capture something new only if it needs attention.'},
 {key:'sun',nodeId:'4314:5558',short:'Sun',number:'29',tasks:[],phase:{day:'Day 14',pattern:'Energy can vary',note:'The planner leaves today open and does not fill empty time by default.'},emptyHeadline:'Nothing scheduled for Sunday',emptyBody:'Your week ends with open space. Review Tasks or leave the day unplanned.'},
]
