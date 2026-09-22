import { useEffect, useState } from 'react'
import { fetchBacklogStatuses } from '../lib/backlogConfig'
import { computeAcProgress, type AcProgress } from '../lib/computeAcProgress'
import { discoverStories } from '../lib/discoverStories'
import { parseStory, type ParsedStory } from '../lib/parseStory'
import { sortStoriesNewestFirst } from '../lib/sortStories'
import { configureStatusColors, loadStatusPalette } from '../lib/statusColor'

export interface BacklogStory extends ParsedStory {
  progress: AcProgress | null
}

interface UseBacklogStoriesResult {
  stories: BacklogStory[]
  loading: boolean
  error: string | null
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

  useEffect(() => {
    let cancelled = false
    const baseUrl = getBacklogBaseUrl()

    // Both resolve before stories render with them — a project with neither
    // file gets configureStatusColors's own defaults (both calls resolve to
    // "nothing found" rather than rejecting; see backlogConfig.ts and
    // statusColor.ts).
    Promise.all([loadStatusPalette(), fetchBacklogStatuses(baseUrl)])
      .then(([palette, statuses]) => {
        if (cancelled) return
        configureStatusColors(palette, statuses.statuses)
      })
      .then(() => discoverStories(baseUrl))
      .then((discovered) => {
        if (cancelled) return
        const parsed = discovered.map(({ filename, raw }) => {
          const story = parseStory(raw, filename)
          return { ...story, progress: computeAcProgress(story.body) }
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

  return { stories, loading, error }
}
