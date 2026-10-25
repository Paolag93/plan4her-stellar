import { useLayoutEffect, useRef } from 'react'
import './DialogFocus.css'

const activeDialogs: HTMLElement[] = []
const focusableSelector = 'button, [href], input, select, textarea, [tabindex]'

/** Mount only while open. Keeps the existing dialog layout and restores its opener. */
export function useDialogFocus(onClose?: () => void) {
  const dialogRef = useRef<HTMLElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousTabIndex = dialog.getAttribute('tabindex')
    dialog.tabIndex = -1
    dialog.classList.add('p4h-dialog-focus')
    activeDialogs.push(dialog)

    // Dialogs are nested in their screen, not portals: inert siblings at every
    // ancestor level without making the dialog itself inert.
    const background = new Map<HTMLElement, boolean>()
    let branch: HTMLElement = dialog
    while (branch.parentElement) {
      for (const sibling of branch.parentElement.children) {
        if (sibling instanceof HTMLElement && sibling !== branch) {
          background.set(sibling, sibling.inert)
          sibling.inert = true
        }
      }
      if (branch.parentElement === document.body) break
      branch = branch.parentElement
    }
    const tabbable = () => Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
      .filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && !element.closest('[inert]') && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden')
    const isTopmost = () => activeDialogs[activeDialogs.length - 1] === dialog
    const onKeyDown = (event: KeyboardEvent) => {
      // Suspended screens keep their drafts mounted during an offline notice.
      // Their hidden dialogs must not trap keyboard input in the visible screen.
      if (!isTopmost() || !dialog.getClientRects().length || dialog.closest('[hidden], [inert]')) return
      if (event.key === 'Escape' && closeRef.current) {
        event.preventDefault()
        event.stopPropagation()
        closeRef.current()
      }
      if (event.key !== 'Tab') return
      const elements = tabbable()
      const first = elements[0]
      const last = elements[elements.length - 1]
      if (!first) {
        event.preventDefault()
        dialog.focus({ preventScroll: true })
      } else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog || !dialog.contains(document.activeElement))) {
        event.preventDefault()
        last.focus({ preventScroll: true })
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault()
        first.focus({ preventScroll: true })
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    // The named dialog provides context before its first control, and avoids
    // introducing a focused-button outline into pointer-opened Figma states.
    dialog.focus({ preventScroll: true })
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      activeDialogs.splice(activeDialogs.lastIndexOf(dialog), 1)
      for (const [element, wasInert] of background) element.inert = wasInert
      if (previousTabIndex === null) dialog.removeAttribute('tabindex')
      else dialog.setAttribute('tabindex', previousTabIndex)
      dialog.classList.remove('p4h-dialog-focus')
      if (opener?.isConnected && !opener.closest('[inert]')) opener.focus({ preventScroll: true })
    }
  }, [])

  return dialogRef
}
