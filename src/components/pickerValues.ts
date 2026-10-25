import { clock, minutes } from '../domain/planner'

/** Accept the branded 12-hour presets and normalize exact input for storage. */
export function pickerTimeMinutes(value: string): number {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return minutes(value)
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour < 1 || hour > 12 || minute > 59) return NaN
  return (hour % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0)) * 60 + minute
}

export function pickerTimeValue(value: string): string {
  const minute = pickerTimeMinutes(value)
  return Number.isFinite(minute) ? clock(minute) : ''
}

export function pickerCycleLength(value: string): number {
  const match = value.trim().match(/^(\d{1,2})\s*(?:days?)?$/i)
  const length = match ? Number(match[1]) : NaN
  return length >= 15 && length <= 90 ? length : NaN
}
