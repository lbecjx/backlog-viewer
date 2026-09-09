import { getLabelColorClasses } from './labelColor'

// Complete, literal class strings — same reasoning as labelColor.ts/statusColor.ts.
const KNOWN_TYPE_COLORS: Record<string, string> = {
  Bug: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  Story: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  Task: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  Epic: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
  Chore: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
}

const KNOWN_TYPE_ICONS: Record<string, string> = {
  Bug: '🐛',
  Story: '📗',
  Task: '✅',
  Epic: '🏔️',
  Chore: '🔧',
}

// Unlike Status (a small closed set where an outlier is a red flag worth
// highlighting), Type is open-ended like Labels — a project can invent its own
// issue types. An unrecognized one falls back to the same hash-based color as
// labels, not to a single "needs attention" color.
export function getTypeColorClasses(type: string): string {
  return KNOWN_TYPE_COLORS[type] ?? getLabelColorClasses(type)
}

export function getTypeIcon(type: string): string | undefined {
  return KNOWN_TYPE_ICONS[type]
}
