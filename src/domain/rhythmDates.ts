import { dateFromISO, localISO } from './planner'
export function addDaysISO(iso: string, days: number): string { const d = dateFromISO(iso); d.setDate(d.getDate() + days); return localISO(d) }
