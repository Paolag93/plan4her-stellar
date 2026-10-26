import type { CycleBasics } from './types'

export const WORK_TYPES = ['general', 'review-planning', 'creation-start', 'communication', 'finishing-admin', 'energizing-movement', 'restorative'] as const
export type WorkType = typeof WORK_TYPES[number]
export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  general: 'General',
  'review-planning': 'Review / planning',
  'creation-start': 'Creation / start',
  communication: 'Communication',
  'finishing-admin': 'Finishing / admin',
  'energizing-movement': 'Energizing movement',
  restorative: 'Rest & gentle movement',
}
export const CYCLE_PHASES = ['Menstrual', 'Follicular', 'Ovulatory', 'Luteal'] as const
export type CyclePhase = typeof CYCLE_PHASES[number]
export const PLANNING_TEMPLATES = ['balanced', 'high-output', 'recovery'] as const
export type PlanningTemplate = typeof PLANNING_TEMPLATES[number]
export const TEMPLATE_LABELS: Record<PlanningTemplate, string> = {
  balanced: 'Balanced', 'high-output': 'High-output', recovery: 'Recovery',
}
export interface CyclePreferences {
  template: PlanningTemplate
  phaseWork: Record<CyclePhase, WorkType[]>
}

/** Editable product defaults, not predicted energy or medical recommendations.
 * Each caller receives its own arrays, so editing cannot mutate later defaults.
 */
export function createDefaultCyclePreferences(): CyclePreferences {
  return {
    template: 'balanced',
    phaseWork: {
      Menstrual: ['review-planning', 'restorative'], Follicular: ['creation-start', 'energizing-movement'],
      Ovulatory: ['communication', 'energizing-movement'], Luteal: ['finishing-admin', 'restorative'],
    },
  }
}

export interface DisplayCycleValues {
  enabled: boolean
  mode?: string | null
  lastPeriodStart: string | null
  cycleLength: number
}
export type SelectedCycleContext =
  | { status: 'estimated'; day: number; phase: CyclePhase }
  | { status: 'off' | 'unsupported-pattern' | 'no-date' | 'invalid-date' | 'invalid-length' | 'before-start'; day: null; phase: null }

function calendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '0001-01-01') return false
  const timestamp = Date.parse(`${value}T00:00:00Z`)
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value
}

/** Shared calendar estimate, preserving the app's existing phase thresholds.
 * For 28 days: days 1–5, 6–13, 14–16, then 17–28. The shifted thresholds for
 * other lengths are a rough product heuristic, not a confidence or ovulation
 * prediction. Calendar-date arithmetic avoids daylight-saving-time drift.
 */
export function estimateCycleContext(dateISO: string | undefined, cycle: DisplayCycleValues): SelectedCycleContext {
  const unavailable = (status: Exclude<SelectedCycleContext['status'], 'estimated'>): SelectedCycleContext => ({ status, day: null, phase: null })
  if (!cycle.enabled) return unavailable('off')
  if (cycle.mode !== undefined && cycle.mode !== 'natural') return unavailable('unsupported-pattern')
  if (!cycle.lastPeriodStart) return unavailable('no-date')
  if (!calendarDate(dateISO) || !calendarDate(cycle.lastPeriodStart)) return unavailable('invalid-date')
  if (!Number.isInteger(cycle.cycleLength) || cycle.cycleLength < 15 || cycle.cycleLength > 90) return unavailable('invalid-length')
  const elapsed = (Date.parse(`${dateISO}T00:00:00Z`) - Date.parse(`${cycle.lastPeriodStart}T00:00:00Z`)) / 86400000
  if (elapsed < 0) return unavailable('before-start')
  const day = elapsed % cycle.cycleLength + 1
  const phase: CyclePhase = day <= 5 ? 'Menstrual'
    : day <= Math.max(6, cycle.cycleLength - 15) ? 'Follicular'
    : day <= Math.max(8, cycle.cycleLength - 12) ? 'Ovulatory'
    : 'Luteal'
  return { status: 'estimated', day, phase }
}

/** Only an explicitly selected natural cycle activates phase-work preferences.
 * A hormonal/unknown/off path never inherits a natural-cycle model by accident.
 */
export function planningCycleContext(dateISO: string | undefined, mode: string | null | undefined, basics: CycleBasics | null | undefined): SelectedCycleContext {
  return estimateCycleContext(dateISO, {
    enabled: mode === 'natural',
    lastPeriodStart: basics?.lastPeriodStart ?? null,
    cycleLength: basics?.cycleLength ?? 28,
  })
}
