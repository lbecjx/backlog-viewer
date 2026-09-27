import { useEffect, useRef, useState } from 'react'
import { fetchBacklogStatuses, fetchBoardMembership } from '../lib/backlogConfig'
import { postStoryBoard, postStoryStatus } from '../lib/boardWrites'
import { computeAcProgress, type AcProgress } from '../lib/computeAcProgress'
import { computeZone, type Zone } from '../lib/computeZone'
import { discoverStories } from '../lib/discoverStories'
import { parseStory, type ParsedStory } from '../lib/parseStory'
import { sortStoriesNewestFirst } from '../lib/sortStories'
import { configureStatusColors, loadStatusPalette } from '../lib/statusColor'

export interface BacklogStory extends ParsedStory {
  progress: AcProgress | null
  zone: Zone
}

interface UseBacklogStoriesResult {
  stories: BacklogStory[]
  loading: boolean
  error: string | null
  // Optimistic: updates local state immediately, then persists to the
  // server. On failure, reverts the local change and rethrows — the caller
  // (a drag-and-drop drop handler) decides how to surface that to the human,
  // this hook only owns the story data itself.
  updateStoryStatus: (code: string, status: string) => Promise<void>
  // Moves a story to a different zone (backlog/planner/archive) with optional
  // resolution (for archive) and reason. Implements optimistic updates with
  // stale-rollback race protection.
  moveStoryToZone: (code: string, zone: Zone, resolution?: string, reason?: string) => Promise<void>
  // Set when a zone-changing action fails, cleared by clearActionError. Lives
  // here rather than in the calling component because those actions
  // optimistically change `zone` first — which removes the story from the
  // visible list and unmounts whatever component launched the action — so a
  // component-local error state would be dropped by the very unmount its
  // failed action triggered (found by adversarial review). `App` renders this
  // as a dismissible banner that survives that unmount.
  actionError: string | null
  clearActionError: () => void
}

// `discoverStories` requires an absolute base URL (it resolves each filename via
// `new URL(filename, baseUrl)`, which throws on a bare path) — build one from the
// current origin so this works both in dev (proxied to the mock server, see
// vite.config.ts) and once bundled into the published plugin's dist/.
function getBacklogBaseUrl(): string {
  return new URL('/backlog/', window.location.origin).toString()
}

export function useBacklogStories(): UseBacklogStoriesResult {
  const [stories, setStories] = useState<BacklogStory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Per-story, per-field monotonic write counter. The optimistic-revert guard
  // cannot compare the *value* a call wrote: two different calls can target
  // the SAME value (a drag to `Done` overlapping an Archive→`Done`), so an
  // "is the field still showing my target" check can't tell whose write owns
  // it now. It must compare which call's write is still the LATEST instead:
  // each optimistic write bumps its field's counter, and a revert only
  // restores its captured previous value if no newer write to that same field
  // has landed since.
  const writeVersionRef = useRef<Record<string, number>>({})

  function nextWriteVersion(code: string, field: 'status' | 'zone'): number {
    const key = `${code}:${field}`
    const next = (writeVersionRef.current[key] ?? 0) + 1
    writeVersionRef.current[key] = next
    return next
  }

  function isLatestWrite(code: string, field: 'status' | 'zone', version: number): boolean {
    return writeVersionRef.current[`${code}:${field}`] === version
  }

  function clearActionError(): void {
    setActionError(null)
  }

  useEffect(() => {
    let cancelled = false
    const baseUrl = getBacklogBaseUrl()

    // All four resolve independently — none depends on another's result — a
    // project with none of these files gets configureStatusColors's own
    // defaults and every story defaulting to the Backlog zone (each config
    // fetch resolves to "nothing found" rather than rejecting; see
    // backlogConfig.ts and statusColor.ts).
    Promise.all([loadStatusPalette(), fetchBacklogStatuses(baseUrl), fetchBoardMembership(baseUrl), discoverStories(baseUrl)])
      .then(([palette, statuses, membership, discovered]) => {
        if (cancelled) return
        configureStatusColors(palette, statuses.statuses)
        const parsed = discovered.map(({ filename, raw }) => {
          const story = parseStory(raw, filename)
          return { ...story, progress: computeAcProgress(story.body), zone: computeZone(story.code, membership) }
        })
        // Sorted here (display concern), independent of whatever order
        // discoverStories itself returns filenames in — that function's own
        // job is just finding what exists, not deciding how it's shown.
        setStories(sortStoriesNewestFirst(parsed))
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    // No cleanup beyond the `cancelled` flag — there's nothing to abort mid-flight
    // that would leave a dangling side effect if this component unmounts early.
    return () => {
      cancelled = true
    }
  }, [])

  async function updateStoryStatus(code: string, status: string): Promise<void> {
    const previousStatus = stories.find((s) => s.code === code)?.status
    if (previousStatus === undefined) return

    const version = nextWriteVersion(code, 'status')
    setStories((current) => current.map((s) => (s.code === code ? { ...s, status } : s)))
    try {
      await postStoryStatus(window.location.origin, code, status)
    } catch (err) {
      // Revert only if THIS call's write is still the latest for that field.
      // A newer call — which may have even written the SAME value, so a
      // value-equality guard could never tell them apart — owns the field now
      // and its result must win. Found by adversarial review: the previous
      // `s.status === status` guard was an empirically reproducible same-value
      // race (a failed drag to `Done` clobbering an Archive that also set
      // `Done`).
      if (isLatestWrite(code, 'status', version)) {
        setStories((current) => current.map((s) => (s.code === code ? { ...s, status: previousStatus } : s)))
      }
      throw err
    }
  }

  async function moveStoryToZone(code: string, zone: Zone, resolution?: string, reason?: string): Promise<void> {
    const previousZone = stories.find((s) => s.code === code)?.zone
    if (previousZone === undefined) return

    // Optimistic update: move to the new zone immediately, bumping the zone's
    // write version so a later revert can tell whether anything newer landed.
    const zoneVersion = nextWriteVersion(code, 'zone')
    // A new zone action supersedes any error banner from a previous failed
    // zone action — without this, a later successful move/archive leaves a
    // stale error on screen. Only the zone-changing path clears it: the drag
    // path (updateStoryStatus) surfaces failures through its own inline
    // dragError and never sets this banner, so it must not clear it either.
    setActionError(null)
    setStories((current) => current.map((s) => (s.code === code ? { ...s, zone } : s)))

    try {
      // One board write for every zone. Moving preserves the story's Status —
      // only archiving changes it, and the server does that itself inside this
      // same /api/board request (Status → Done), so there is no client-side
      // status write at all. (The pre-split story had Move/Unarchive also
      // reset Status to Not Started via a second /api/status call; that forced
      // status change was wrong — a story keeps its status when it changes
      // zone.)
      await postStoryBoard(window.location.origin, code, zone, resolution, reason)
      if (zone === 'archive' && isLatestWrite(code, 'zone', zoneVersion)) {
        // Mirror only the server's own Done write, and only if THIS archive is
        // still the latest zone write — a newer move that already left archive
        // must win. Bump the status version only when the Done write actually
        // lands: bumping on a skipped write would falsely claim to be the
        // newest status write and suppress a legitimate in-flight drag revert.
        nextWriteVersion(code, 'status')
        setStories((current) =>
          current.map((s) => (s.code === code && s.zone === zone ? { ...s, status: 'Done' } : s)),
        )
      }
    } catch (err) {
      // Only the newest zone write owns the revert AND the error banner — a
      // superseded older failure must neither clobber a newer successful
      // action's state nor pop an error banner for it (which would defeat the
      // "a successful action clears a stale banner" behavior).
      if (isLatestWrite(code, 'zone', zoneVersion)) {
        setStories((current) => current.map((s) => (s.code === code ? { ...s, zone: previousZone } : s)))
        setActionError(err instanceof Error ? err.message : String(err))
      }
      throw err
    }
  }

  return { stories, loading, error, updateStoryStatus, moveStoryToZone, actionError, clearActionError }
}
