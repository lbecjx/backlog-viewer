import { describe, expect, it } from 'vitest'
import { computeAcProgress } from './computeAcProgress'
import { parseStory } from './parseStory'
import { fetchStoryRaw } from './discoverStories'

const BASE_URL = 'http://localhost:8002/'

describe('computeAcProgress', () => {
  it('counts all-done ACs (MOCK-0001: 3/3)', async () => {
    const raw = await fetchStoryRaw(BASE_URL, 'MOCK-0001-story-done-normal.md')
    const { body } = parseStory(raw, 'MOCK-0001-story-done-normal.md')
    expect(computeAcProgress(body)).toEqual({ done: 3, total: 3 })
  })

  it('counts a mix of done/in-progress/pending (MOCK-0002: 1/5)', async () => {
    const raw = await fetchStoryRaw(BASE_URL, 'MOCK-0002-story-in-progress.md')
    const { body } = parseStory(raw, 'MOCK-0002-story-in-progress.md')
    expect(computeAcProgress(body)).toEqual({ done: 1, total: 5 })
  })

  it('returns null when the story has no gradable AC markers (MOCK-0003)', async () => {
    const raw = await fetchStoryRaw(BASE_URL, 'MOCK-0003-story-multiline-lists.md')
    const { body } = parseStory(raw, 'MOCK-0003-story-multiline-lists.md')
    expect(computeAcProgress(body)).toBeNull()
  })
})
