import { describe, expect, it, vi } from 'vitest'
import { discoverStories, discoverStoryFilenames, fetchStoryRaw } from './discoverStories'

// Talks to the real `python3 -m http.server` instance spawned by
// vitest.global-setup.ts (port 8002) against test-fixtures/backlog/ — the real
// mechanism the app uses in production, exercised for real. The failure tests
// below inject a dropped connection through a `fetch` spy that still delegates
// to the real `fetch` for every other call — a partial spy for one failure,
// never a fake transport standing in for the whole discovery path.
const BASE_URL = 'http://localhost:8002/'

describe('discoverStoryFilenames', () => {
  it('finds exactly the 8 mock stories, filtering out anything that is not one', async () => {
    const filenames = await discoverStoryFilenames(BASE_URL)
    expect(filenames).toEqual([
      'MOCK-0001-story-done-normal.md',
      'MOCK-0002-story-in-progress.md',
      'MOCK-0003-story-multiline-lists.md',
      'MOCK-0004-story-malformed-table.md',
      'MOCK-0005-story-code-blocks.md',
      'MOCK-0006-story-no-labels-done.md',
      'MOCK-0007-spike-no-user-story.md',
      'MOCK-0008-bug-many-labels.md',
    ])
  })

  it('rejects a baseUrl without a trailing slash', async () => {
    await expect(discoverStoryFilenames('http://localhost:8002')).rejects.toThrow(/must end with/)
  })
})

describe('fetchStoryRaw', () => {
  it('fetches the real raw content of a specific story', async () => {
    const raw = await fetchStoryRaw(BASE_URL, 'MOCK-0001-story-done-normal.md')
    expect(raw).toContain('# MOCK-0001 · Agregar botón de exportar a CSV')
    expect(raw).toContain('**Status** | Done')
  })

  it('throws when the file does not exist', async () => {
    await expect(fetchStoryRaw(BASE_URL, 'NB-9999-nope.md')).rejects.toThrow(/404/)
  })
})

describe('discoverStories', () => {
  it('returns filename + raw content pairs for every discovered story', async () => {
    const stories = await discoverStories(BASE_URL)
    expect(stories).toHaveLength(8)
    const mock1 = stories.find((s) => s.filename === 'MOCK-0001-story-done-normal.md')
    expect(mock1?.raw).toContain('Agregar botón de exportar a CSV')
  })

  it('retries a single transient fetch failure instead of failing the whole load', async () => {
    // Inject exactly ONE dropped connection (the class of failure the server's
    // small accept backlog used to cause) for a single file, and delegate
    // everything else to the real fetch — not a whole-path mock. The bounded
    // retry in discoverStories must recover it, so the full load still
    // succeeds with all 8 stories.
    const realFetch = globalThis.fetch
    const target = 'MOCK-0002-story-in-progress.md'
    let failedOnce = false

    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      if (!failedOnce && url.endsWith(target)) {
        failedOnce = true
        throw new TypeError('fetch failed: ECONNRESET (injected)')
      }
      return realFetch(input, init)
    })

    try {
      const stories = await discoverStories(BASE_URL)
      expect(stories).toHaveLength(8)
      const recovered = stories.find((s) => s.filename === target)
      expect(recovered?.raw).toContain('MOCK-0002')
    } finally {
      spy.mockRestore()
    }
  })

  it('rejects when every story fetch fails, instead of rendering an empty backlog', async () => {
    // A dead/broken connection for every story must surface as an error, not as
    // "no stories" — an all-fail is a failed load, not an empty project.
    const realFetch = globalThis.fetch
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      if (url.endsWith('/')) return realFetch(input, init) // let the directory listing through
      throw new TypeError('fetch failed: ECONNRESET (injected)')
    })

    try {
      await expect(discoverStories(BASE_URL)).rejects.toThrow(/Failed to load any/)
    } finally {
      spy.mockRestore()
    }
  })
})
