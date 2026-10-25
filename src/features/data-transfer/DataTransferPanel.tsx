import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
import { Button } from '../../components/Button'
import { createBackupFile, createPlansCsvFile, createTasksCsvFile, MAX_BACKUP_BYTES, parseBackup, type BackupPreview, type LocalExportFile } from '../../domain/dataTransfer'
import type { AppState } from '../../domain/types'
import { downloadLocalFile } from './download'
import './DataTransferPanel.css'

export interface DataTransferPanelProps {
  state: AppState
  /** Persist first; return an error without changing the current state on failure. */
  onRestore: (validated: AppState) => { error?: string }
}

export function DataTransferPanel({ state, onRestore }: DataTransferPanelProps) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const previewHeading = useRef<HTMLHeadingElement>(null)
  const readingRequest = useRef(0)
  const restoring = useRef(false)
  const [preview, setPreview] = useState<BackupPreview | null>(null)
  const [selectedName, setSelectedName] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [reading, setReading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => () => { readingRequest.current += 1 }, [])
  useEffect(() => { if (preview) previewHeading.current?.focus() }, [preview])

  function download(makeFile: (state: AppState) => LocalExportFile) {
    setError(null)
    setNotice(null)
    try {
      downloadLocalFile(makeFile(state))
      setNotice('Download started. Keep the file somewhere private.')
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'The download could not start. Your saved data has not been changed.')
    }
  }

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    const request = ++readingRequest.current
    setPreview(null)
    setConfirmed(false)
    setError(null)
    setNotice(null)
    setSelectedName(file.name)
    if (file.size > MAX_BACKUP_BYTES) {
      setReading(false)
      setError('This file is too large. Choose a Plan4Her JSON backup under 8 MB.')
      return
    }
    setReading(true)
    try {
      const text = await file.text()
      if (request !== readingRequest.current) return
      setPreview(parseBackup(text))
    } catch (problem) {
      if (request !== readingRequest.current) return
      setError(problem instanceof Error ? problem.message : 'This file could not be read. Your current data has not been changed.')
    } finally {
      if (request === readingRequest.current) setReading(false)
    }
  }

  function cancelImport() {
    readingRequest.current += 1
    setPreview(null)
    setConfirmed(false)
    setReading(false)
    setSelectedName('')
    setError(null)
    setNotice('Import canceled. Your current data has not been changed.')
    input.current?.focus()
  }

  function restore() {
    if (!preview || !confirmed || restoring.current) return
    restoring.current = true
    setError(null)
    setNotice(null)
    try {
      const result = onRestore(preview.state)
      if (result.error) {
        setError(result.error)
        return
      }
      setPreview(null)
      setConfirmed(false)
      setSelectedName('')
      setNotice('Backup restored on this device.')
    } catch {
      setError('The backup could not be saved. Your current data has not been changed. Try again when local storage is available.')
    } finally { restoring.current = false }
  }

  return <section className="data-transfer" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>Back up & move your data</h3>
    <p>Your files are created and read on this device. No account or subscription is needed.</p>
    <p className="data-transfer__privacy">Exports are not encrypted. A full backup includes personal cycle data, tasks, plans, history and settings. Save it somewhere private and share it only with people you trust.</p>
    <div className="data-transfer__actions">
      <Button type="button" hierarchy="secondary" onClick={() => download(createBackupFile)}>Download full backup (JSON)</Button>
      <Button type="button" hierarchy="secondary" onClick={() => download(createTasksCsvFile)}>Download tasks (CSV)</Button>
      <Button type="button" hierarchy="secondary" onClick={() => download(createPlansCsvFile)}>Download plans (CSV)</Button>
    </div>
    <p className="data-transfer__hint">CSV summaries include task details and available draft and accepted plans. They leave out cycle dates, history and settings, and cannot restore the app.</p>
    <div className="data-transfer__import">
      <h4>Restore a full backup</h4>
      <p id={`${id}-file-hint`}>Choose a Plan4Her JSON backup under 8 MB. Review it before replacing data saved on this device.</p>
      <label className="data-transfer__file-label" htmlFor={`${id}-file`}>Choose backup file</label>
      <input ref={input} id={`${id}-file`} className="data-transfer__file" type="file" accept=".json,application/json" aria-describedby={`${id}-file-hint`} onChange={selectFile} />
    </div>
    {reading ? <div className="data-transfer__reading"><p role="status">Reading backup…</p><Button type="button" hierarchy="secondary" onClick={cancelImport}>Cancel import</Button></div> : null}
    {preview ? <section className="data-transfer__preview" aria-labelledby={`${id}-preview-title`}>
      <h4 ref={previewHeading} tabIndex={-1} id={`${id}-preview-title`}>Review backup</h4>
      <p className="data-transfer__filename">{selectedName}</p>
      <dl>
        <div><dt>Created</dt><dd>{new Date(preview.exportedAt).toLocaleString()}</dd></div>
        <div><dt>Tasks</dt><dd>{preview.summary.tasks}</dd></div>
        <div><dt>Fixed commitments</dt><dd>{preview.summary.commitments}</dd></div>
        <div><dt>Accepted week</dt><dd>{preview.summary.acceptedWeek ?? 'None'}</dd></div>
        <div><dt>Draft week</dt><dd>{preview.summary.draftWeek ?? 'None'}</dd></div>
        <div><dt>Plan history entries</dt><dd>{preview.summary.history}</dd></div>
        <div><dt>Cycle context</dt><dd>{preview.summary.hasCycleData ? 'Included' : 'Not included'}</dd></div>
      </dl>
      <p>This replaces all current local data, including {state.tasks.length} tasks and your plans, cycle context and settings. Download a full backup first if you want to keep them.</p>
      <label className="data-transfer__confirmation"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.currentTarget.checked)} /><span>I understand this replaces the data on this device.</span></label>
      <Button type="button" hierarchy="secondary" onClick={cancelImport}>Cancel import</Button>
      <Button type="button" hierarchy="destructive" disabled={!confirmed} onClick={restore}>Replace with this backup</Button>
    </section> : null}
    {error ? <p className="data-transfer__error" role="alert">{error}</p> : null}
    {notice ? <p className="data-transfer__notice" role="status">{notice}</p> : null}
  </section>
}
