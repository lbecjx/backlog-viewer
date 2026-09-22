import { describe, expect, it } from 'vitest'
import { fetchBacklogConfig, fetchBacklogStatuses } from './backlogConfig'

// Real http.server instance, same as discoverStories.test.ts — see that
// file's comment for why this isn't a mocked fetch.
const BASE_URL = 'http://localhost:8002/'

describe('fetchBacklogConfig', () => {
  it('fetches and parses the real .backlog-config.json (prefix/lastCode only)', async () => {
    const config = await fetchBacklogConfig(BASE_URL)
    expect(config).toEqual({ prefix: 'MOCK', lastCode: 8 })
  })

  it('returns an empty object, not a rejection, when the file does not exist', async () => {
    const config = await fetchBacklogConfig('http://localhost:8002/nope/')
    expect(config).toEqual({})
  })
})

describe('fetchBacklogStatuses', () => {
  it('fetches and parses the real .backlog-statuses.json, a file separate from .backlog-config.json', async () => {
    const statuses = await fetchBacklogStatuses(BASE_URL)
    expect(statuses.statuses).toEqual([
      { name: 'Not Started', color: 'neutral' },
      { name: 'In Progress', color: 'blue' },
      { name: 'Done', color: 'green' },
      { name: 'Blocked', color: 'red' },
    ])
  })

  it('returns an empty object, not a rejection, when the file does not exist', async () => {
    const statuses = await fetchBacklogStatuses('http://localhost:8002/nope/')
    expect(statuses).toEqual({})
  })
})
