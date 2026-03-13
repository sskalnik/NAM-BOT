import type { KeyboardEvent } from 'react'

const CARD_TOGGLE_IGNORE_SELECTOR = 'button, a, input, textarea, select, option, label, pre, code, [data-no-card-toggle="true"]'

export function shouldIgnoreCardToggle(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false
  }

  return target.closest(CARD_TOGGLE_IGNORE_SELECTOR) !== null
}

export function handleCardToggleKeyDown(
  event: KeyboardEvent<HTMLElement>,
  onToggle: () => void
): void {
  if (shouldIgnoreCardToggle(event.target)) {
    return
  }

  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    onToggle()
  }
}
