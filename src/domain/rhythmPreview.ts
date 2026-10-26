import { addDaysISO } from './rhythmDates'
import { generateWeeklyPlan, localISO, currentWeekStart } from './planner'
import { proposeAdjustment } from './changes'
import { planningCycleContext, type CyclePhase } from './cyclePreferences'
import type { PlannerInput, WeeklyPlan, PlanBlockData } from './types'

/** Period start that makes `today` the given cycle day (day 1 = today). */
export function lastPeriodForCycleDay(day: number, today = localISO()): string {
  return addDaysISO(today, -(Math.max(1, Math.floor(day)) - 1))
}

export interface RhythmDay { dateISO: string; label: string; short: string; number: string; phase: CyclePhase | null; cycleDay: number | null; blocks: PlanBlockData[] }
export interface RhythmPreview { plan: WeeklyPlan; days: RhythmDay[]; moved: Set<string> }

/**
 * Re-runs the real planner as if today were `day` of the cycle. With an accepted
 * plan it uses the same adjustment path that Apply will use, so the preview and
 * the applied result match. Nothing is saved.
 */
export function previewRhythm(input: PlannerInput, day: number, cycleLength: number, accepted: WeeklyPlan | null, baseline: WeeklyPlan | null, today = localISO()): RhythmPreview {
  const cycleBasics = { lastPeriodStart: lastPeriodForCycleDay(day, today), cycleLength }
  const next: PlannerInput = { ...input, cycleMode: 'natural', cycleBasics, weekStart: accepted?.weekStart ?? input.weekStart ?? currentWeekStart(today) }
  const plan = accepted ? proposeAdjustment(accepted, next, 'week', today).after : generateWeeklyPlan(next)
  const before = new Map((baseline?.blocks ?? []).filter(b => b.taskId).map(b => [b.taskId!, `${b.dateISO}`]))
  const moved = new Set(plan.blocks.filter(b => b.taskId && before.has(b.taskId) && before.get(b.taskId) !== b.dateISO).map(b => b.taskId!))
  const days = plan.week.map(d => {
    const estimate = planningCycleContext(d.dateISO, 'natural', cycleBasics)
    return { dateISO: d.dateISO!, label: d.label ?? '', short: d.short, number: d.number, phase: estimate.status === 'estimated' ? estimate.phase : null, cycleDay: estimate.status === 'estimated' ? estimate.day : null, blocks: plan.blocks.filter(b => b.dateISO === d.dateISO) }
  })
  return { plan, days, moved }
}
