import type { KeyboardEvent } from 'react'
import type { Zone } from '../lib/computeZone'
import { tabId, tabPanelId } from '../lib/tabIds'

interface TabBarProps {
  active: Zone
  onChange: (zone: Zone) => void
}

const TABS: { zone: Zone; label: string }[] = [
  { zone: 'backlog', label: 'Backlog' },
  { zone: 'planner', label: 'Planner' },
  { zone: 'archive', label: 'Archive' },
]

export function TabBar({ active, onChange }: TabBarProps) {
  // Arrow-key navigation is part of the same ARIA Tabs contract that
  // `role="tab"` opts into — a screen-reader/keyboard user landing on a
  // `tablist` expects Left/Right/Home/End to move between tabs, not just
  // Tab+Enter. Wraps around at either end.
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % TABS.length
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + TABS.length) % TABS.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = TABS.length - 1
    if (nextIndex === null) return

    event.preventDefault()
    const next = TABS[nextIndex]
    onChange(next.zone)
    document.getElementById(tabId(next.zone))?.focus()
  }

  return (
    <div className="flex border-b border-neutral-200 dark:border-neutral-800" role="tablist">
      {TABS.map(({ zone, label }, index) => (
        <button
          key={zone}
          id={tabId(zone)}
          type="button"
          role="tab"
          aria-selected={active === zone}
          aria-controls={tabPanelId(zone)}
          tabIndex={active === zone ? 0 : -1}
          onClick={() => onChange(zone)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          className={`flex-1 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            active === zone
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
