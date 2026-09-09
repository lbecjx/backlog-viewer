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

export async function fetchStoryRaw(baseUrl: string, filename: string): Promise<string> {
  assertTrailingSlash(baseUrl)
  const res = await fetch(new URL(filename, baseUrl), { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`Failed to fetch story ${filename}: ${res.status} ${res.statusText}`)
  }
  return res.text()
}

export async function discoverStories(baseUrl: string): Promise<DiscoveredStory[]> {
  const filenames = await discoverStoryFilenames(baseUrl)
  return Promise.all(
    filenames.map(async (filename) => ({
      filename,
      raw: await fetchStoryRaw(baseUrl, filename),
    })),
  )
}
