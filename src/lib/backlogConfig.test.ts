import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchBacklogConfig, fetchBacklogStatuses, fetchBoardMembership } from './backlogConfig'

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
      { name: 'Blocked', color: 'red' },
      { name: 'Done', color: 'green' },
    ])
  })

  it('returns an empty object, not a rejection, when the file does not exist', async () => {
    const statuses = await fetchBacklogStatuses('http://localhost:8002/nope/')
    expect(statuses).toEqual({})
  })

  // A malformed-but-object-shaped `statuses` value can't be exercised via
  // the shared real-server fixture (one fixed .backlog-statuses.json serves
  // every test in this file) without a second server instance for one case
  // — the same documented exception loadStatusPalette.test.ts makes, for
  // the same reason.
  describe('with a malformed statuses field (mocked fetch)', () => {
    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it.each([
      ['null', null],
      ['an object instead of an array', {}],
      ['an array with a non-object entry', ['Done']],
      ['an array with a null entry', [null]],
    ])(
      'falls back to {}, not a value configureStatusColors would crash on, when statuses is %s',
      async (_label, statuses) => {
        vi.stubGlobal(
          'fetch',
          vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ statuses }) }),
        )
        expect(await fetchBacklogStatuses('http://ignored/')).toEqual({})
      },
    )
  })
})

describe('fetchBoardMembership', () => {
  it('fetches and parses the real .backlog-board.json', async () => {
    const membership = await fetchBoardMembership(BASE_URL)
    expect(membership).toEqual({
      planner: ['MOCK-0002'],
      archive: [{ code: 'MOCK-0001', resolution: 'Done', reason: '' }],
    })
  })

  it('returns empty lists, not a rejection, when the file does not exist', async () => {
    const membership = await fetchBoardMembership('http://localhost:8002/nope/')
    expect(membership).toEqual({ planner: [], archive: [] })
  })

  // Same documented exception as fetchBacklogStatuses above — a malformed
  // shape can't be exercised through the one shared real-server fixture.
  describe('with a malformed shape (mocked fetch)', () => {
    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it.each([
      ['planner is not an array', { planner: 'MOCK-0001', archive: [] }],
      ['planner has a non-string entry', { planner: [123], archive: [] }],
      ['archive is not an array', { planner: [], archive: {} }],
      ['archive has an entry with no code', { planner: [], archive: [{ resolution: 'Done', reason: '' }] }],
      ['archive has an entry with a non-string code', { planner: [], archive: [{ code: 123 }] }],
      ['archive has an entry with no resolution', { planner: [], archive: [{ code: 'MOCK-0001', reason: '' }] }],
      ['archive has an entry with no reason', { planner: [], archive: [{ code: 'MOCK-0001', resolution: 'Done' }] }],
    ])('falls back to empty lists, not a value computeZone would misread, when %s', async (_label, body) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(body) }))
      expect(await fetchBoardMembership('http://ignored/')).toEqual({ planner: [], archive: [] })
    })

    it('keeps a valid entry even when a sibling entry in the same array is malformed', async () => {
      // Regression test for a real bug found by adversarial review: the
      // previous implementation gated each whole array on `.every()`, so
      // one corrupted entry (a partial write, a hand-edit typo) silently
      // discarded every OTHER story's real membership too — for `archive`,
      // that meant an already-archived story reappearing in the visible
      // Backlog list.
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              planner: ['MOCK-0001', 123],
              archive: [
                { code: 'MOCK-0002', resolution: 'Done', reason: '' },
                { resolution: 'Cancelled' }, // missing code — malformed
              ],
            }),
        }),
      )
      expect(await fetchBoardMembership('http://ignored/')).toEqual({
        planner: ['MOCK-0001'],
        archive: [{ code: 'MOCK-0002', resolution: 'Done', reason: '' }],
      })
    })
  })
})
