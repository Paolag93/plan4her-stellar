import type { TaskItem } from './types'
export function starterTasksForPack(pack:'balanced'|'work'|'life',customTask?:string):TaskItem[]{
 const work:TaskItem[]=[{id:'starter-prepare',title:'Prepare proposal',kind:'Flexible',meta:'90 min',duration:'90 min',importance:'Must'},{id:'starter-research',title:'Research notes',kind:'Flexible',meta:'60 min',duration:'60 min',importance:'Important'},{id:'starter-admin',title:'Admin follow-up',kind:'Flexible',meta:'30 min',duration:'30 min',importance:'Optional'}];
 const life:TaskItem[]=[{id:'starter-dentist',canonicalId:'dentist',title:'Call dentist',kind:'Flexible',meta:'30 min',duration:'30 min',importance:'Important'},{id:'starter-groceries',canonicalId:'groceries',title:'Buy groceries',kind:'Flexible',meta:'30 min',duration:'30 min',importance:'Important'}];
 const tasks=pack==='work'?work:pack==='life'?life:[work[0],...life,work[2]];return customTask?.trim()?[...tasks,{id:'starter-custom',title:customTask.trim(),kind:'Flexible',meta:'30 min',duration:'30 min',importance:'Important'}]:tasks
}
