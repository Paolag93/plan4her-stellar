import { MAX_STORAGE_CHARS, validateState } from './persistence'
import type { AppState, WeeklyPlan } from './types'

export const BACKUP_FORMAT = 'plan4her-backup'
export const BACKUP_VERSION = 1
// A saved state can contain up to two million UTF-16 characters. Leave enough
// bytes for UTF-8 and a small versioned envelope so valid exports round-trip.
export const MAX_BACKUP_BYTES = 8_000_000
const MAX_BACKUP_CHARS = MAX_STORAGE_CHARS + 1024

export interface LocalExportFile {
  filename: string
  content: string
  mimeType: string
}

export interface BackupPreview {
  state: AppState
  exportedAt: string
  summary: {
    tasks: number
    commitments: number
    history: number
    acceptedWeek: string | null
    draftWeek: string | null
    hasCycleData: boolean
  }
}

function stateText(state: AppState): string {
  if (!validateState(state)) throw new Error('This data could not be exported safely. Your saved data has not been changed.')
  const text = JSON.stringify(state)
  if (text.length > MAX_STORAGE_CHARS) throw new Error('This data is too large for a local backup. Your saved data has not been changed.')
  return text
}

function filename(kind: string, extension: string, at: Date): string {
  return `plan4her-${kind}-${at.toISOString().replace(/[:.]/g, '-')}.${extension}`
}

/** Complete portable backup; never writes storage, starts downloads or sends data. */
export function createBackupFile(state: AppState, at = new Date()): LocalExportFile {
  const saved = stateText(state)
  const exportedAt = at.toISOString()
  return {
    filename: filename('backup', 'json', at),
    mimeType: 'application/json;charset=utf-8',
    content: `{"format":"${BACKUP_FORMAT}","formatVersion":${BACKUP_VERSION},"exportedAt":${JSON.stringify(exportedAt)},"state":${saved}}\n`,
  }
}

/** Strictly accept our current envelope and the same bounded schema as storage. */
export function parseBackup(content: string): BackupPreview {
  if (content.length > MAX_BACKUP_CHARS) {
    throw new Error('This backup is too large for this app. Your current data has not been changed.')
  }
  if (new TextEncoder().encode(content).byteLength > MAX_BACKUP_BYTES) {
    throw new Error('This backup is too large. Choose a Plan4Her JSON backup under 8 MB.')
  }
  let value: unknown
  try { value = JSON.parse(content.replace(/^\uFEFF/, '')) }
  catch { throw new Error('This file is not valid JSON. Choose a Plan4Her JSON backup.') }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Choose a Plan4Her JSON backup, not a CSV summary.')
  const backup = value as Record<string, unknown>
  const allowed = ['format', 'formatVersion', 'exportedAt', 'state']
  if (Object.keys(backup).length !== allowed.length || Object.keys(backup).some(key => !allowed.includes(key)) || backup.format !== BACKUP_FORMAT) {
    throw new Error('This file is not a recognized Plan4Her backup.')
  }
  if (backup.formatVersion !== BACKUP_VERSION) throw new Error('This backup version is not supported by this app. Your current data has not been changed.')
  if (typeof backup.exportedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(backup.exportedAt) || !Number.isFinite(Date.parse(backup.exportedAt)) || new Date(backup.exportedAt).toISOString() !== backup.exportedAt) {
    throw new Error('The backup date is invalid. Your current data has not been changed.')
  }
  if (!validateState(backup.state) || JSON.stringify(backup.state).length > MAX_STORAGE_CHARS) {
    throw new Error('This backup contains invalid or unsupported data. Your current data has not been changed.')
  }
  const state = backup.state
  return {
    state,
    exportedAt: backup.exportedAt,
    summary: {
      tasks: state.tasks.length,
      commitments: state.commitments.length,
      history: state.history.length,
      acceptedWeek: state.acceptedPlan?.weekStart ?? null,
      draftWeek: state.draftPlan?.weekStart ?? null,
      hasCycleData: state.cycleBasics !== null || state.cycleMode !== null,
    },
  }
}

/** Quote every cell and neutralize spreadsheet formulas, including whitespace. */
export function csvCell(value: string | number | boolean | null | undefined): string {
  const text = value == null ? '' : String(value)
  const safe = /^[\s\u0000-\u001f\u007f]*[=+\-@]/u.test(text) || /^[\t\r\n]/.test(text) ? `'${text}` : text
  return `"${safe.replace(/"/g, '""')}"`
}

type CsvValue = Parameters<typeof csvCell>[0]
function csvFile(kind: string, rows: CsvValue[][], at: Date): LocalExportFile {
  return { filename: filename(kind, 'csv', at), mimeType: 'text/csv;charset=utf-8', content: `\uFEFF${rows.map(row => row.map(csvCell).join(',')).join('\r\n')}\r\n` }
}

export function createTasksCsvFile(state: AppState, at = new Date()): LocalExportFile {
  stateText(state)
  return csvFile('tasks', [
    ['Task ID', 'Title', 'Type', 'Work type', 'Duration', 'Deadline', 'Fixed date', 'Start time', 'Importance', 'Completed', 'Details'],
    ...state.tasks.map(task => [task.id, task.title, task.kind, task.workType ?? 'general', task.duration, task.deadline, task.fixedDate, task.startTime, task.importance, task.done ?? false, task.meta]),
  ], at)
}

function planRows(plan: WeeklyPlan | null, kind: 'Accepted' | 'Draft'): CsvValue[][] {
  if (!plan) return []
  return [
    ...plan.blocks.map(block => [kind, plan.weekStart, 'Scheduled block', block.id, block.taskId, block.title, block.dateISO, block.start, block.duration, block.status ?? 'scheduled', block.fixed ?? false, block.completedMinutes ?? 0, block.remainingMinutes, '']),
    ...plan.unscheduled.map(task => [kind, plan.weekStart, 'Unscheduled task', '', task.taskId, task.title, '', '', '', 'unscheduled', '', '', '', task.reason]),
  ]
}

export function createPlansCsvFile(state: AppState, at = new Date()): LocalExportFile {
  stateText(state)
  return csvFile('plans', [
    ['Plan', 'Week starting', 'Entry', 'Block ID', 'Task ID', 'Title', 'Date', 'Start time', 'Duration', 'Status', 'Fixed', 'Completed minutes', 'Remaining minutes', 'Unscheduled reason'],
    ...planRows(state.acceptedPlan, 'Accepted'),
    ...planRows(state.draftPlan, 'Draft'),
  ], at)
}
