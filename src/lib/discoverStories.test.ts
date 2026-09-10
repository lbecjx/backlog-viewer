import { describe, expect, it } from 'vitest'
import { discoverStories, discoverStoryFilenames, fetchStoryRaw } from './discoverStories'

// Talks to the real `python3 -m http.server` instance spawned by
// vitest.global-setup.ts (port 8002) against public/backlog/ — no mocked fetch.
// This is the actual mechanism the app uses in production, exercised for real.
const BASE_URL = 'http://localhost:8002/'

describe('discoverStoryFilenames', () => {
  it('finds exactly the 5 mock stories, filtering out anything that is not one', async () => {
    const filenames = await discoverStoryFilenames(BASE_URL)
    expect(filenames).toEqual([
      'MOCK-0001-story-done-normal.md',
      'MOCK-0002-story-in-progress.md',
      'MOCK-0003-story-multiline-lists.md',
      'MOCK-0004-story-malformed-table.md',
      'MOCK-0005-story-code-blocks.md',
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
    expect(stories).toHaveLength(5)
    const mock1 = stories.find((s) => s.filename === 'MOCK-0001-story-done-normal.md')
    expect(mock1?.raw).toContain('Agregar botón de exportar a CSV')
  })
})
