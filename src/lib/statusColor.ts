// Complete, literal class strings — same reasoning as labelColor.ts: Tailwind
// only picks up classes it can find as exact text in scanned source.
const KNOWN_STATUS_COLORS: Record<string, string> = {
  Done: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300',
  'In Progress': 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  'Not Started': 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300',
}

// Any status outside the 3 standard ones (e.g. "Bloqueado por vendor" from a
// non-standard table) gets a distinct "needs attention" color rather than
// silently blending in as if it were a recognized state.
const UNKNOWN_STATUS_COLOR = 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'

export function getStatusColorClasses(status: string): string {
  return KNOWN_STATUS_COLORS[status] ?? UNKNOWN_STATUS_COLOR
}

const KNOWN_STATUS_ACCENT_BORDERS: Record<string, string> = {
  Done: 'border-l-green-500',
  'In Progress': 'border-l-blue-500',
  'Not Started': 'border-l-neutral-400 dark:border-l-neutral-600',
}

const UNKNOWN_STATUS_ACCENT_BORDER = 'border-l-amber-500'

// A solid left-edge accent matching the status color — same intent as the
// badge, just as a scannable strip along the card rather than only in the text.
export function getStatusAccentBorderClass(status: string): string {
  return KNOWN_STATUS_ACCENT_BORDERS[status] ?? UNKNOWN_STATUS_ACCENT_BORDER
}
