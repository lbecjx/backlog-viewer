import { useEffect, useState } from 'react'
import { computeAcProgress, type AcProgress } from '../lib/computeAcProgress'
import { discoverStories } from '../lib/discoverStories'
import { parseStory, type ParsedStory } from '../lib/parseStory'

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

    discoverStories(getBacklogBaseUrl())
      .then((discovered) => {
        if (cancelled) return
        const parsed = discovered.map(({ filename, raw }) => {
          const story = parseStory(raw, filename)
          return { ...story, progress: computeAcProgress(story.body) }
        })
        setStories(parsed)
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
