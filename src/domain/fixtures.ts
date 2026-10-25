import { PLAN_BLOCKS, WEEK_DAYS } from '../features/plan/planData'
import { clone } from './planner'
import type { PlannerAdapter } from './planner'
import type { WeeklyPlan } from './types'
/** Explicit QA adapter only; production never selects it by default. */
export function fixturePlan():WeeklyPlan{return {id:'qa-week',weekStart:'2023-10-23',week:WEEK_DAYS.map((d,i)=>({...d,dateISO:`2023-10-${23+i}`})),blocks:clone(PLAN_BLOCKS).map((b,i)=>({...b,dateISO:`2023-10-${23+i}`,status:'scheduled'})),unscheduled:[],warnings:[],scheduledLoad:65,scheduledMinutes:330,availableMinutes:510}}
export const fixturePlannerAdapter:PlannerAdapter={generate:async()=>fixturePlan()}
