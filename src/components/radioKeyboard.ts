import type { KeyboardEvent } from 'react'

export function enabledRadios(element: HTMLElement) {
  const group = element.closest('[role="radiogroup"]')
  return group ? Array.from(group.querySelectorAll<HTMLButtonElement>('[role="radio"]'))
    .filter(radio => !radio.disabled && radio.closest('[role="radiogroup"]') === group) : []
}

export function handleRadioKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
  if (event.defaultPrevented || !['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
  const radios = enabledRadios(event.currentTarget)
  if (!radios.length) return
  const index = radios.indexOf(event.currentTarget)
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? radios.length - 1
    : (index + (event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1) + radios.length) % radios.length
  event.preventDefault()
  radios[next].focus()
  radios[next].click()
}
