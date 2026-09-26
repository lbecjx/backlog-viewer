// The actual Tailwind classes for each color name live in a JSON file
// fetched at runtime (`loadStatusPalette`, below), not hardcoded here. That
// file is the single source of truth the `local-backlog` plugin's shell
// scripts and skill docs also read directly (as a local file, not a fetch —
// see that plugin's own
// `skills/update-status/references/status-colors.json`), so both sides
// recognize the exact same set of color names without duplicating the list
// in two languages. `open-backlog.sh` (that plugin's script) copies its own
// copy of that file to this app's served root before opening the browser —
// see that script for why. `configureStatusColors` takes the fetched
// palette as an explicit argument rather than reading hidden module state,
// specifically so tests can exercise it directly with a literal object, no
// fetch mocking required. See src/index.css's `@source inline(...)` comment
// for why the class strings still have to appear as literal text somewhere
// Tailwind's scanner reads, even though they're not hardcoded in this file.

import type { StatusConfigEntry } from './backlogConfig'

export interface StatusColorClasses {
  badge: string
  border: string
}

export type StatusPalette = Record<string, StatusColorClasses>

const UNKNOWN_STATUS_COLOR = 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
const UNKNOWN_STATUS_ACCENT_BORDER = 'border-l-amber-500'

// The 3 defaults match this project's behavior before `.backlog-statuses.json`
// existed — a project with no such file keeps working exactly as before,
// with no migration required.
const DEFAULT_STATUSES: StatusConfigEntry[] = [
  { name: 'Not Started', color: 'neutral' },
  { name: 'In Progress', color: 'blue' },
  { name: 'Done', color: 'green' },
]

let knownStatusBadges = new Map<string, string>()
let knownStatusBorders = new Map<string, string>()
let knownStatusOrder: string[] = DEFAULT_STATUSES.map((s) => s.name)

// Fetched once, from the same served root as the app itself (not the
// per-project `/backlog/` folder — this is a fixed, project-independent
// asset). Failure here (network error, missing file, malformed JSON)
// resolves to an empty palette, which makes every status render as
// "unknown" — visible and debuggable, not a silent crash or a rejection the
// caller has to handle specially.
export async function loadStatusPalette(): Promise<StatusPalette> {
  try {
    const res = await fetch('/status-colors.json', { cache: 'no-store' })
    if (!res.ok) return {}
    const parsed: unknown = await res.json()
    return typeof parsed === 'object' && parsed !== null ? (parsed as StatusPalette) : {}
  } catch {
    return {}
  }
}

// Module-level, not React state: every consumer (StatusChip, StoryCard, ...)
// calls the plain functions below with just a status string, no config
// threaded through props. Called once with the fetched palette and a
// project's `.backlog-statuses.json` (or the defaults, if either is
// missing) — see `useBacklogStories.ts`.
export function configureStatusColors(
  palette: StatusPalette,
  statuses: StatusConfigEntry[] = DEFAULT_STATUSES,
): void {
  const badges = new Map<string, string>()
  const borders = new Map<string, string>()
  for (const { name, color } of statuses) {
    const classes = palette[color]
    // An unrecognized color name (a config referencing a color that isn't
    // in the palette) is treated the same as an unrecognized status —
    // visible, not silently coerced to a guess.
    badges.set(name, classes ? classes.badge : UNKNOWN_STATUS_COLOR)
    borders.set(name, classes ? classes.border : UNKNOWN_STATUS_ACCENT_BORDER)
  }
  knownStatusBadges = badges
  knownStatusBorders = borders
  knownStatusOrder = statuses.map((s) => s.name)
}

export function getStatusColorClasses(status: string): string {
  return knownStatusBadges.get(status) ?? UNKNOWN_STATUS_COLOR
}

export function getStatusAccentBorderClass(status: string): string {
  return knownStatusBorders.get(status) ?? UNKNOWN_STATUS_ACCENT_BORDER
}

// The Planner board's columns: whatever `.backlog-statuses.json` declared
// (in that file's order), or the same 3 defaults every other status-aware
// view already falls back to when the project has no such file.
export function getConfiguredStatuses(): string[] {
  return [...knownStatusOrder]
}
