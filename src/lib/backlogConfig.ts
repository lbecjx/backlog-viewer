export interface BacklogConfig {
  prefix?: string
  lastCode?: number
}

// Served alongside the story files by the same static server — no separate
// endpoint, same reasoning as `discoverStories.ts`'s directory listing.
// Missing or malformed config is not an error: a project that never created
// `.backlog-config.json` should keep working exactly as before, with no
// migration required. Ticket-numbering data only — `Status` typing lives in
// the separate `.backlog-statuses.json`, fetched by `fetchBacklogStatuses`
// below; the two are unrelated concerns that happen to both be per-project
// config, not one file with two jobs.
export async function fetchBacklogConfig(baseUrl: string): Promise<BacklogConfig> {
  try {
    const res = await fetch(new URL('.backlog-config.json', baseUrl), { cache: 'no-store' })
    if (!res.ok) return {}
    const parsed: unknown = await res.json()
    if (typeof parsed !== 'object' || parsed === null) return {}
    return parsed as BacklogConfig
  } catch {
    // Network error, invalid JSON, whatever — same fallback as "file doesn't
    // exist": render with the defaults rather than surface a fetch failure
    // for a file the viewer only optionally depends on.
    return {}
  }
}

export interface ArchiveEntry {
  code: string
  resolution: string
  reason: string
}

export interface BoardMembership {
  planner: string[]
  archive: ArchiveEntry[]
}

// Same fetch-and-tolerate-absence shape as the two functions above. A
// project with no `.backlog-board.json` (or one that fails to parse) means
// every story is in the Backlog — computeZone treats an absent/empty list
// exactly like "not a member of it."
export async function fetchBoardMembership(baseUrl: string): Promise<BoardMembership> {
  const empty: BoardMembership = { planner: [], archive: [] }
  try {
    const res = await fetch(new URL('.backlog-board.json', baseUrl), { cache: 'no-store' })
    if (!res.ok) return empty
    const parsed: unknown = await res.json()
    if (typeof parsed !== 'object' || parsed === null) return empty
    const { planner, archive } = parsed as { planner?: unknown; archive?: unknown }
    const isValidArchiveEntry = (entry: unknown): entry is ArchiveEntry => {
      if (typeof entry !== 'object' || entry === null) return false
      const { code, resolution, reason } = entry as Record<string, unknown>
      return typeof code === 'string' && typeof resolution === 'string' && typeof reason === 'string'
    }
    // Filtering out only the bad entries, not gating the whole array on
    // `.every()`: one corrupted entry (a partial write, a hand-edit typo)
    // shouldn't erase every other story's real membership along with it —
    // for `archive` specifically, that would silently put an
    // already-archived story back in the visible Backlog list, the exact
    // thing this file exists to prevent (found via adversarial review).
    return {
      planner: Array.isArray(planner) ? planner.filter((c): c is string => typeof c === 'string') : [],
      archive: Array.isArray(archive) ? archive.filter(isValidArchiveEntry) : [],
    }
  } catch {
    return empty
  }
}

export interface StatusConfigEntry {
  name: string
  color: string
}

export interface BacklogStatuses {
  statuses?: StatusConfigEntry[]
}

// Same fetch-and-tolerate-absence shape as fetchBacklogConfig, for the
// sibling file. A project with no `.backlog-statuses.json` (or one that
// fails to parse) means `Status` isn't a closed set here — the viewer's
// `configureStatusColors` falls back to its own 3 defaults in that case.
export async function fetchBacklogStatuses(baseUrl: string): Promise<BacklogStatuses> {
  try {
    const res = await fetch(new URL('.backlog-statuses.json', baseUrl), { cache: 'no-store' })
    if (!res.ok) return {}
    const parsed: unknown = await res.json()
    if (typeof parsed !== 'object' || parsed === null) return {}
    const { statuses } = parsed as { statuses?: unknown }
    // `typeof === 'object'` alone doesn't guarantee `statuses` is the shape
    // configureStatusColors iterates and destructures — a present-but-wrong-
    // shaped value (not an array, or an array with a null/non-object entry)
    // would otherwise reach a `for (const {name, color} of statuses)` there
    // and throw, taking down the whole app for what should be a recoverable
    // typo (the same "malformed config is not an error" promise as
    // everywhere else in this file). Treat it exactly like an absent file.
    if (statuses !== undefined) {
      const isValidEntry = (entry: unknown): boolean =>
        typeof entry === 'object' && entry !== null && 'name' in entry && 'color' in entry
      if (!Array.isArray(statuses) || !statuses.every(isValidEntry)) return {}
    }
    return parsed as BacklogStatuses
  } catch {
    return {}
  }
}
