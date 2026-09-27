// Matches this project's ticket-code convention (e.g. `NB-0001-...md`,
// `MOCK-0001-...md`) without assuming a fixed prefix — any 2-6 uppercase letters
// followed by a 4-digit code. Anything else in the served directory (assets,
// `.backlog-config.json`, stray files) is ignored rather than treated as a story.
const STORY_FILENAME_PATTERN = /^[A-Z]{2,6}-\d{4}-.*\.md$/

export interface DiscoveredStory {
  filename: string
  raw: string
}

// `baseUrl` must end with a trailing slash — it's resolved against each filename
// with `new URL()`, and a missing slash silently drops the last path segment.
function assertTrailingSlash(baseUrl: string): void {
  if (!baseUrl.endsWith('/')) {
    throw new Error(`baseUrl must end with "/", got: ${baseUrl}`)
  }
}

// Relies on a real static file server (e.g. `python3 -m http.server`) auto-generating
// a directory listing when `baseUrl` has no `index.html` of its own — never a
// hand-maintained manifest. See docs/STORY_LOCAL_BACKLOG_VIEWER.md Section 3.
export async function discoverStoryFilenames(baseUrl: string): Promise<string[]> {
  assertTrailingSlash(baseUrl)
  // `no-store`: the whole point of this mechanism is that a story added, edited, or
  // removed on disk shows up on the next load — a browser serving a heuristically
  // "still fresh" cached response (verified empirically: it does, by default, even
  // right after the file changed) would silently break that promise.
  const res = await fetch(baseUrl, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`Failed to list ${baseUrl}: ${res.status} ${res.statusText}`)
  }
  const html = await res.text()
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const hrefs = Array.from(doc.querySelectorAll('a')).map((a) =>
    decodeURIComponent(a.getAttribute('href') ?? ''),
  )
  return hrefs.filter((href) => STORY_FILENAME_PATTERN.test(href)).sort()
}

// Distinguishes "the server answered with an HTTP error" (404, 500 — retrying
// changes nothing) from a transport-level failure (a dropped connection, which
// surfaces as a runtime-specific error type — `TypeError` in browsers/undici).
// Keying the retry off "is NOT this class" is more portable across runtimes
// than matching one specific error type.
class StoryFetchHttpError extends Error {}

export async function fetchStoryRaw(baseUrl: string, filename: string): Promise<string> {
  assertTrailingSlash(baseUrl)
  const res = await fetch(new URL(filename, baseUrl), { cache: 'no-store' })
  if (!res.ok) {
    throw new StoryFetchHttpError(`Failed to fetch story ${filename}: ${res.status} ${res.statusText}`)
  }
  return res.text()
}

// A bounded retry for the transient failure this whole mechanism exists to
// survive: under the server's small accept backlog, a burst of parallel story
// fetches can get a connection reset, and `fetch` then rejects before any HTTP
// response. That is transient and worth retrying. Our own HTTP-error throw
// above is a `StoryFetchHttpError` (a 404 or 500 won't heal on retry), so
// anything else is treated as retryable.
const STORY_FETCH_ATTEMPTS = 3
const STORY_FETCH_RETRY_BASE_MS = 50

function isRetryableFetchError(err: unknown): boolean {
  return !(err instanceof StoryFetchHttpError)
}

async function fetchStoryWithRetry(baseUrl: string, filename: string): Promise<string> {
  let lastError: unknown
  for (let attempt = 1; attempt <= STORY_FETCH_ATTEMPTS; attempt++) {
    try {
      return await fetchStoryRaw(baseUrl, filename)
    } catch (err) {
      lastError = err
      if (attempt >= STORY_FETCH_ATTEMPTS || !isRetryableFetchError(err)) break
      await new Promise((resolve) => setTimeout(resolve, STORY_FETCH_RETRY_BASE_MS * attempt))
    }
  }
  throw lastError
}

export async function discoverStories(baseUrl: string): Promise<DiscoveredStory[]> {
  const filenames = await discoverStoryFilenames(baseUrl)
  // Partial tolerance: one story fetch failing — even after the bounded retry
  // above — must not fail the whole load. The viewer renders the stories that
  // did come back instead of the single "Error reading the backlog" it used to
  // show for a backlog that actually exists. A failure of
  // `discoverStoryFilenames` (the listing) is deliberately NOT caught here:
  // zero stories is a genuine failure, not a partial one.
  const results = await Promise.all(
    filenames.map(async (filename) => {
      try {
        return { filename, raw: await fetchStoryWithRetry(baseUrl, filename) }
      } catch {
        return null
      }
    }),
  )
  const stories = results.filter((story): story is DiscoveredStory => story !== null)
  // All-fail is NOT "an empty backlog". If the listing found stories but every
  // one of them failed to load, surface an error — otherwise a dead server
  // renders the exact same empty view as a project that genuinely has no
  // stories, which is worse than the full error this change set out to soften.
  // A partial success (some loaded) still renders those successes above.
  if (filenames.length > 0 && stories.length === 0) {
    throw new Error(`Failed to load any of the ${filenames.length} story file(s) in ${baseUrl}`)
  }
  return stories
}
