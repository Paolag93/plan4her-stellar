import type { LocalExportFile } from '../../domain/dataTransfer'

/** A user-triggered local download. No upload, fetch or third-party destination. */
export function downloadLocalFile(file: LocalExportFile): void {
  const url = URL.createObjectURL(new Blob([file.content], { type: file.mimeType }))
  const link = document.createElement('a')
  link.href = url
  link.download = file.filename
  link.hidden = true
  document.body.append(link)
  try { link.click() }
  finally {
    link.remove()
    // Give the browser time to begin the download before releasing the Blob.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
