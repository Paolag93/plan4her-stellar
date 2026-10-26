import type { TaskItem } from './types'
/** A believable week for one woman, typed so the cycle-aware planner can place each task. */
export const SAMPLE_WEEK_TASKS:TaskItem[]=[
 {id:'sample-grant',title:'Deep work: grant proposal draft',kind:'Flexible',meta:'90 min',duration:'90 min',importance:'Must'},
 {id:'sample-reel',title:'Record reel for workshop promo',kind:'Flexible',meta:'45 min',duration:'45 min',importance:'Important'},
 {id:'sample-client',title:'Present project update to client',kind:'Flexible',meta:'60 min',duration:'60 min',importance:'Must'},
 {id:'sample-coffee',title:'Coffee with Lena',kind:'Flexible',meta:'60 min',duration:'60 min',importance:'Optional'},
 {id:'sample-strength',title:'Strength training session',kind:'Flexible',meta:'45 min',duration:'45 min',importance:'Important'},
 {id:'sample-yoga',title:'Gentle yoga and stretching',kind:'Flexible',meta:'30 min',duration:'30 min',importance:'Important'},
 {id:'sample-slides',title:'Finalize workshop slides',kind:'Flexible',meta:'60 min',duration:'60 min',importance:'Important'},
 {id:'sample-expenses',title:'Review monthly expenses and savings',kind:'Flexible',meta:'45 min',duration:'45 min',importance:'Important'},
 {id:'sample-priorities',title:'Plan next week’s priorities',kind:'Flexible',meta:'30 min',duration:'30 min',importance:'Important'},
 {id:'sample-meals',title:'Prep meals for the week',kind:'Flexible',meta:'60 min',duration:'60 min',importance:'Optional'},
 {id:'sample-dentist',title:'Call the dentist',kind:'Flexible',meta:'15 min',duration:'15 min',importance:'Important'},
]
export function starterTasksForPack(pack:'balanced'|'work'|'life'|'sample',customTask?:string):TaskItem[]{
 const work:TaskItem[]=[{id:'starter-prepare',title:'Prepare proposal',kind:'Flexible',meta:'90 min',duration:'90 min',importance:'Must'},{id:'starter-research',title:'Research notes',kind:'Flexible',meta:'60 min',duration:'60 min',importance:'Important'},{id:'starter-admin',title:'Admin follow-up',kind:'Flexible',meta:'30 min',duration:'30 min',importance:'Optional'}];
 const life:TaskItem[]=[{id:'starter-dentist',canonicalId:'dentist',title:'Call dentist',kind:'Flexible',meta:'30 min',duration:'30 min',importance:'Important'},{id:'starter-groceries',canonicalId:'groceries',title:'Buy groceries',kind:'Flexible',meta:'30 min',duration:'30 min',importance:'Important'}];
 const tasks=pack==='sample'?SAMPLE_WEEK_TASKS.map(task=>({...task})):pack==='work'?work:pack==='life'?life:[work[0],...life,work[2]];return customTask?.trim()?[...tasks,{id:'starter-custom',title:customTask.trim(),kind:'Flexible',meta:'30 min',duration:'30 min',importance:'Important'}]:tasks
}
