import type { TaskItem } from '../features/tasks/TasksScreen'
import type { PlanBlockData, PlanWeekDay, PlanChangeData } from '../features/plan/planData'
import type { CyclePreferences } from './cyclePreferences'
export type { TaskItem, PlanBlockData, PlanWeekDay, PlanChangeData }
export const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'] as const
export type Day = typeof DAYS[number]
export type Availability = Record<Day,string>
export interface CycleBasics { lastPeriodStart:string|null; cycleLength:number }
export interface FixedCommitment { id:string; title:string; date:string; startTime:string; endTime:string }
export interface UnscheduledTask { taskId:string; title:string; reason:string }
export interface WeeklyPlan { id:string; weekStart:string; week:PlanWeekDay[]; blocks:PlanBlockData[]; unscheduled:UnscheduledTask[]; warnings:string[]; scheduledLoad:number; scheduledMinutes?:number; availableMinutes?:number; deferredTaskIds?:string[] }
export interface PlannerInput { tasks:TaskItem[]; availability:Availability; commitments:FixedCommitment[]; cycleBasics?:CycleBasics|null; cycleMode?:string|null; cyclePreferences?:CyclePreferences; weekStart?:string; deferredTaskIds?:string[]; /** Original flexible blocks protected as reservations; preference metadata only. */ templateAnchors?:PlanBlockData[] }
export interface PlanProposal { kind:'edit'|'adjust'|'recovery'|'restore'|'accept'; label:string; before:WeeklyPlan|null; after:WeeklyPlan; changes:PlanChangeData[]; errors:string[]; selectedTaskIds?:string[] }
/** Cycle context committed together with a plan change, so Undo can restore it. */
export interface CycleSnapshot { mode:string|null; basics:CycleBasics|null }
export interface PlanHistoryEntry { id:string; kind:PlanProposal['kind']; label:string; createdAt:string; before:WeeklyPlan|null; after:WeeklyPlan; cycleBefore?:CycleSnapshot }
export interface AppState { version:1; onboardingComplete:boolean; tasks:TaskItem[]; availability:Availability; commitments:FixedCommitment[]; cycleBasics:CycleBasics|null; cycleMode:string|null; cyclePreferences?:CyclePreferences; analyticsConsent:boolean; draftPlan:WeeklyPlan|null; acceptedPlan:WeeklyPlan|null; history:PlanHistoryEntry[] }
export type BlockStatus = 'scheduled'|'done'|'partial'|'missed'|'deferred'
