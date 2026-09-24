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
