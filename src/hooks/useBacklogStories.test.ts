import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useBacklogStories } from './useBacklogStories'

// Same exception as loadStatusPalette.test.ts and boardWrites.test.ts: this
// hook's discovery/config fetches resolve against the app's own served root
// (window.location.origin), which has no real server to point at in this
// test environment — only the real per-project /local-backlog/ mock server
// (test-fixtures/local-backlog/, port 8002) does, and that's a different origin.
// Mocked fetch, routed by URL, is the only option. This test only covers
// `updateStoryStatus` — discovery and parsing are already covered for real
// in discoverStories.test.ts / parseStory.test.ts.
const RAW_STORY = `# MOCK-0001 · A story

| Field | Value |
|---|---|
| **Code** | MOCK-0001 |
| **Type** | Story |
| **Priority** | Medium |
| **Status** | Not Started |
| **Labels** | |

Body text.
`

function notFound() {
  return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) })
}

function okHtml(html: string) {
  return Promise.resolve({ ok: true, text: () => Promise.resolve(html) })
}

function okText(text: string) {
  return Promise.resolve({ ok: true, text: () => Promise.resolve(text) })
}

// `statusEndpointOk` and `boardEndpointOk` control the `/api/status` and
// `/api/board` routes — each test can exercise success or failure paths
// independently.
function makeMockFetch(statusEndpointOk: boolean = true, boardEndpointOk: boolean = true) {
  return (input: RequestInfo | URL) => {
    const href = input.toString()
    if (href.endsWith('/status-colors.json')) return notFound()
    if (href.endsWith('/project.json')) return notFound()
    if (href.endsWith('.backlog-statuses.json')) return notFound()
    if (href.endsWith('.backlog-board.json')) return notFound()
    if (href.endsWith('/local-backlog/')) return okHtml('<a href="MOCK-0001-a-story.md">MOCK-0001-a-story.md</a>')
    if (href.endsWith('MOCK-0001-a-story.md')) return okText(RAW_STORY)
    if (href.endsWith('/api/status')) {
      return statusEndpointOk
        ? Promise.resolve({ ok: true, json: () => Promise.resolve({ result: 'ok' }) })
        : Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ error: 'status failed' }) })
    }
    if (href.endsWith('/api/board')) {
      return boardEndpointOk
        ? Promise.resolve({ ok: true, json: () => Promise.resolve({ result: 'ok' }) })
        : Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ error: 'board failed' }) })
    }
    throw new Error(`unexpected fetch in test: ${href}`)
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useBacklogStories', () => {
  describe('updateStoryStatus', () => {
    it('optimistically updates the story locally, then persists it', async () => {
      vi.stubGlobal('fetch', vi.fn(makeMockFetch(true)))

      const { result } = renderHook(() => useBacklogStories())
      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(result.current.stories[0].status).toBe('Not Started')

      await act(() => result.current.updateStoryStatus('MOCK-0001', 'Done'))

      expect(result.current.stories[0].status).toBe('Done')
    })

    it('forwards an optional note to the server, and omits it when not given', async () => {
      const postedBodies: unknown[] = []
      const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const href = input.toString()
        if (href.endsWith('/status-colors.json')) return notFound()
        if (href.endsWith('/project.json')) return notFound()
        if (href.endsWith('.backlog-statuses.json')) return notFound()
        if (href.endsWith('.backlog-board.json')) return notFound()
        if (href.endsWith('/local-backlog/')) return okHtml('<a href="MOCK-0001-a-story.md">MOCK-0001-a-story.md</a>')
        if (href.endsWith('MOCK-0001-a-story.md')) return okText(RAW_STORY)
        if (href.endsWith('/api/status')) {
          postedBodies.push(JSON.parse(init?.body as string))
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ result: 'ok' }) })
        }
        throw new Error(`unexpected fetch in test: ${href}`)
      })
      vi.stubGlobal('fetch', fetchMock)

      const { result } = renderHook(() => useBacklogStories())
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(() => result.current.updateStoryStatus('MOCK-0001', 'Done', 'Finished early'))
      await act(() => result.current.updateStoryStatus('MOCK-0001', 'In Progress'))

      expect(postedBodies[0]).toEqual({ code: 'MOCK-0001', status: 'Done', note: 'Finished early' })
      expect(postedBodies[1]).not.toHaveProperty('note')
    })

    it('reverts the local change when the server call fails', async () => {
      vi.stubGlobal('fetch', vi.fn(makeMockFetch(false)))

      const { result } = renderHook(() => useBacklogStories())
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await expect(result.current.updateStoryStatus('MOCK-0001', 'Done')).rejects.toThrow('status failed')
      })

      expect(result.current.stories[0].status).toBe('Not Started')
    })

    it('does not let an older call, failing after a newer one already succeeded, clobber the newer status', async () => {
      // Reproduces the stale-rollback race found during FULL-depth adversarial
      // review: two overlapping updateStoryStatus calls for the same code, where
      // the OLDER call's request settles (rejects) after the NEWER call's request
      // has already resolved successfully. The older call's rollback must not
      // blindly restore its own captured `previousStatus` — the newer status is
      // the correct final state.
      let statusCallCount = 0
      let rejectFirstCall: (() => void) | undefined
      const fetchMock = vi.fn((input: RequestInfo | URL) => {
        const href = input.toString()
        if (href.endsWith('/status-colors.json')) return notFound()
        if (href.endsWith('/project.json')) return notFound()
        if (href.endsWith('.backlog-statuses.json')) return notFound()
        if (href.endsWith('.backlog-board.json')) return notFound()
        if (href.endsWith('/local-backlog/')) return okHtml('<a href="MOCK-0001-a-story.md">MOCK-0001-a-story.md</a>')
        if (href.endsWith('MOCK-0001-a-story.md')) return okText(RAW_STORY)
        if (href.endsWith('/api/status')) {
          statusCallCount += 1
          if (statusCallCount === 1) {
            // The first call's request is parked here — it only settles (as a
            // rejection) once the test explicitly triggers it below, after the
            // second call has already resolved.
            return new Promise((_resolve, reject) => {
              rejectFirstCall = () => reject(new Error('boom'))
            })
          }
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ result: 'ok' }) })
        }
        throw new Error(`unexpected fetch in test: ${href}`)
      })
      vi.stubGlobal('fetch', fetchMock)

      const { result } = renderHook(() => useBacklogStories())
      await waitFor(() => expect(result.current.loading).toBe(false))

      let firstCall: Promise<void> = Promise.resolve()
      await act(async () => {
        firstCall = result.current.updateStoryStatus('MOCK-0001', 'In Progress')
        // Let the first call's optimistic update and fetch call happen before
        // the second call starts, so they genuinely overlap rather than run
        // sequentially.
        await Promise.resolve()
      })
      expect(result.current.stories[0].status).toBe('In Progress')

      await act(async () => {
        await result.current.updateStoryStatus('MOCK-0001', 'Done')
      })
      expect(result.current.stories[0].status).toBe('Done')

      await act(async () => {
        rejectFirstCall?.()
        await expect(firstCall).rejects.toThrow('boom')
      })

      expect(result.current.stories[0].status).toBe('Done')
    })

    it('does nothing for a code that is not in the current story list', async () => {
      vi.stubGlobal('fetch', vi.fn(makeMockFetch(true)))

      const { result } = renderHook(() => useBacklogStories())
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await expect(result.current.updateStoryStatus('MOCK-9999', 'Done')).resolves.toBeUndefined()
      })
      expect(result.current.stories[0].status).toBe('Not Started')
    })
  })

  describe('moveStoryToZone', () => {
    it('archive: single call to /api/board with zone=archive, resolution, and reason', async () => {
      const fetchMock = vi.fn(makeMockFetch(true, true))
      vi.stubGlobal('fetch', fetchMock)

      const { result } = renderHook(() => useBacklogStories())
      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(result.current.stories[0].zone).toBe('backlog')

      await act(() => result.current.moveStoryToZone('MOCK-0001', 'archive', 'Done', 'Finished'))

      expect(result.current.stories[0].zone).toBe('archive')
      // Verify only one call was made (to /api/board, not /api/status)
      const boardCall = fetchMock.mock.calls.find((call) => {
        const [url] = call as [URL]
        return url.toString().includes('/api/board')
      })
      expect(boardCall).toBeDefined()
      const statusCall = fetchMock.mock.calls.find((call) => {
        const [url] = call as [URL]
        return url.toString().includes('/api/status')
      })
      expect(statusCall).toBeUndefined()
    })

    it('archive: reverts zone when /api/board call fails', async () => {
      vi.stubGlobal('fetch', vi.fn(makeMockFetch(true, false)))

      const { result } = renderHook(() => useBacklogStories())
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await expect(result.current.moveStoryToZone('MOCK-0001', 'archive')).rejects.toThrow('board failed')
      })

      expect(result.current.stories[0].zone).toBe('backlog')
    })

    it('move/unarchive: single call to /api/board only, preserving the story status', async () => {
      // A zone move must NOT touch the story's Status — the pre-split design
      // forced a second /api/status call setting Not Started, which was wrong
      // (a story keeps its status when it changes zone). Only archive changes
      // status, and the server does that itself.
      const inProgressStory = RAW_STORY.replace('| **Status** | Not Started |', '| **Status** | In Progress |')
      const fetchMock = vi.fn((input: RequestInfo | URL) => {
        const href = input.toString()
        if (href.endsWith('MOCK-0001-a-story.md')) return okText(inProgressStory)
        return makeMockFetch(true, true)(input)
      })
      vi.stubGlobal('fetch', fetchMock)

      const { result } = renderHook(() => useBacklogStories())
      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(result.current.stories[0].status).toBe('In Progress')

      await act(() => result.current.moveStoryToZone('MOCK-0001', 'planner'))

      expect(result.current.stories[0].zone).toBe('planner')
      expect(result.current.stories[0].status).toBe('In Progress')
      const boardCall = fetchMock.mock.calls.find((call) => {
        const [url] = call as [URL]
        return url.toString().includes('/api/board')
      })
      expect(boardCall).toBeDefined()
      const statusCall = fetchMock.mock.calls.find((call) => {
        const [url] = call as [URL]
        return url.toString().includes('/api/status')
      })
      expect(statusCall).toBeUndefined()
    })

    it('move/unarchive: reverts zone when /api/board call fails', async () => {
      vi.stubGlobal('fetch', vi.fn(makeMockFetch(true, false)))

      const { result } = renderHook(() => useBacklogStories())
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await expect(result.current.moveStoryToZone('MOCK-0001', 'planner')).rejects.toThrow('board failed')
      })

      expect(result.current.stories[0].zone).toBe('backlog')
    })

    it('archive: sets local status to Done on success, matching what the confirmation dialog states', async () => {
      vi.stubGlobal('fetch', vi.fn(makeMockFetch(true, true)))

      const { result } = renderHook(() => useBacklogStories())
      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(result.current.stories[0].status).toBe('Not Started')

      await act(() => result.current.moveStoryToZone('MOCK-0001', 'archive', 'Done', ''))

      expect(result.current.stories[0].status).toBe('Done')
    })

    it('archive: mirrors the resolution onto the story on success, so the strike is right without a reload', async () => {
      // The card's strikethrough follows the story's resolution, not its zone.
      // The archive write is what puts a `| **Resolution** |` row on disk, so
      // the client must mirror it — otherwise a just-archived card reads as
      // NOT closed (and an unarchived one as closed) until a full reload.
      vi.stubGlobal('fetch', vi.fn(makeMockFetch(true, true)))

      const { result } = renderHook(() => useBacklogStories())
      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(result.current.stories[0].resolution).toBeUndefined()

      await act(() => result.current.moveStoryToZone('MOCK-0001', 'archive', "Won't Do", ''))

      expect(result.current.stories[0].resolution).toBe("Won't Do")
      expect(result.current.stories[0].status).toBe('Done')
    })

    it('archive: does not mirror a resolution when the write fails', async () => {
      vi.stubGlobal('fetch', vi.fn(makeMockFetch(true, false)))

      const { result } = renderHook(() => useBacklogStories())
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await expect(result.current.moveStoryToZone('MOCK-0001', 'archive', 'Done', '')).rejects.toThrow('board failed')
      })

      expect(result.current.stories[0].resolution).toBeUndefined()
      expect(result.current.stories[0].status).toBe('Not Started')
    })

    it('move: preserves a non-Done status (does not reset it to Not Started)', async () => {
      const inProgressStory = RAW_STORY.replace('| **Status** | Not Started |', '| **Status** | In Progress |')
      const fetchMock = vi.fn((input: RequestInfo | URL) => {
        const href = input.toString()
        if (href.endsWith('MOCK-0001-a-story.md')) return okText(inProgressStory)
        return makeMockFetch(true, true)(input)
      })
      vi.stubGlobal('fetch', fetchMock)

      const { result } = renderHook(() => useBacklogStories())
      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(result.current.stories[0].status).toBe('In Progress')

      await act(() => result.current.moveStoryToZone('MOCK-0001', 'planner'))

      expect(result.current.stories[0].zone).toBe('planner')
      expect(result.current.stories[0].status).toBe('In Progress')
    })

    it('archive: does not let a stale successful call clobber a newer zone/status with status=Done', async () => {
      // Same race shape as the failure-path rollback test below, but on the
      // SUCCESS path: an older archive call's board write resolves only
      // after a newer, unrelated `planner` call for the same code has
      // already fully succeeded. The stale archive call's status='Done'
      // write must not land on top of the newer zone='planner' result.
      let boardCallCount = 0
      let resolveFirstCall: (() => void) | undefined
      const fetchMock = vi.fn((input: RequestInfo | URL) => {
        const href = input.toString()
        if (href.endsWith('/status-colors.json')) return notFound()
        if (href.endsWith('/project.json')) return notFound()
        if (href.endsWith('.backlog-statuses.json')) return notFound()
        if (href.endsWith('.backlog-board.json')) return notFound()
        if (href.endsWith('/local-backlog/')) return okHtml('<a href="MOCK-0001-a-story.md">MOCK-0001-a-story.md</a>')
        if (href.endsWith('MOCK-0001-a-story.md')) return okText(RAW_STORY)
        if (href.endsWith('/api/board')) {
          boardCallCount += 1
          if (boardCallCount === 1) {
            return new Promise((resolve) => {
              resolveFirstCall = () => resolve({ ok: true, json: () => Promise.resolve({ result: 'ok' }) })
            })
          }
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ result: 'ok' }) })
        }
        if (href.endsWith('/api/status')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ result: 'ok' }) })
        }
        throw new Error(`unexpected fetch in test: ${href}`)
      })
      vi.stubGlobal('fetch', fetchMock)

      const { result } = renderHook(() => useBacklogStories())
      await waitFor(() => expect(result.current.loading).toBe(false))

      let staleArchiveCall: Promise<void> = Promise.resolve()
      await act(async () => {
        staleArchiveCall = result.current.moveStoryToZone('MOCK-0001', 'archive', 'Done', '')
        await Promise.resolve()
      })
      expect(result.current.stories[0].zone).toBe('archive')

      await act(async () => {
        await result.current.moveStoryToZone('MOCK-0001', 'planner')
      })
      expect(result.current.stories[0].zone).toBe('planner')
      expect(result.current.stories[0].status).toBe('Not Started')

      await act(async () => {
        resolveFirstCall?.()
        await staleArchiveCall
      })

      // The stale archive call's own success must not overwrite the newer,
      // already-settled planner/Not-Started result.
      expect(result.current.stories[0].zone).toBe('planner')
      expect(result.current.stories[0].status).toBe('Not Started')
    })

    it('does not let an older call, failing after a newer one already succeeded, clobber the newer zone', async () => {
      let boardCallCount = 0
      let rejectFirstCall: (() => void) | undefined
      const fetchMock = vi.fn((input: RequestInfo | URL) => {
        const href = input.toString()
        if (href.endsWith('/status-colors.json')) return notFound()
        if (href.endsWith('/project.json')) return notFound()
        if (href.endsWith('.backlog-statuses.json')) return notFound()
        if (href.endsWith('.backlog-board.json')) return notFound()
        if (href.endsWith('/local-backlog/')) return okHtml('<a href="MOCK-0001-a-story.md">MOCK-0001-a-story.md</a>')
        if (href.endsWith('MOCK-0001-a-story.md')) return okText(RAW_STORY)
        if (href.endsWith('/api/board')) {
          boardCallCount += 1
          if (boardCallCount === 1) {
            return new Promise((_resolve, reject) => {
              rejectFirstCall = () => reject(new Error('boom'))
            })
          }
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ result: 'ok' }) })
        }
        if (href.endsWith('/api/status')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ result: 'ok' }) })
        }
        throw new Error(`unexpected fetch in test: ${href}`)
      })
      vi.stubGlobal('fetch', fetchMock)

      const { result } = renderHook(() => useBacklogStories())
      await waitFor(() => expect(result.current.loading).toBe(false))

      let firstCall: Promise<void> = Promise.resolve()
      await act(async () => {
        firstCall = result.current.moveStoryToZone('MOCK-0001', 'planner')
        await Promise.resolve()
      })
      expect(result.current.stories[0].zone).toBe('planner')

      await act(async () => {
        await result.current.moveStoryToZone('MOCK-0001', 'archive')
      })
      expect(result.current.stories[0].zone).toBe('archive')

      await act(async () => {
        rejectFirstCall?.()
        await expect(firstCall).rejects.toThrow('boom')
      })

      expect(result.current.stories[0].zone).toBe('archive')
    })

    it('does nothing for a code that is not in the current story list', async () => {
      vi.stubGlobal('fetch', vi.fn(makeMockFetch(true, true)))

      const { result } = renderHook(() => useBacklogStories())
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await expect(result.current.moveStoryToZone('MOCK-9999', 'archive')).resolves.toBeUndefined()
      })
      expect(result.current.stories[0].zone).toBe('backlog')
    })
  })

  describe('same-value rollback race across the two write paths', () => {
    it('a failed drag to Done does not roll back a status already set to Done by a concurrent archive', async () => {
      // Reproduces the same-value race: a drag to `Done` and an Archive→`Done`
      // both target the value "Done", so a value-equality revert guard ("is the
      // field still my target?") couldn't tell them apart. The archive's Done
      // must win; the failed drag must not roll the status back to the story's
      // previous "Not Started".
      let statusCallCount = 0
      let rejectDragStatus: (() => void) | undefined
      const fetchMock = vi.fn((input: RequestInfo | URL) => {
        const href = input.toString()
        if (href.endsWith('/status-colors.json')) return notFound()
        if (href.endsWith('/project.json')) return notFound()
        if (href.endsWith('.backlog-statuses.json')) return notFound()
        if (href.endsWith('.backlog-board.json')) return notFound()
        if (href.endsWith('/local-backlog/')) return okHtml('<a href="MOCK-0001-a-story.md">MOCK-0001-a-story.md</a>')
        if (href.endsWith('MOCK-0001-a-story.md')) return okText(RAW_STORY)
        if (href.endsWith('/api/status')) {
          statusCallCount += 1
          if (statusCallCount === 1) {
            return new Promise((_resolve, reject) => {
              rejectDragStatus = () => reject(new Error('drag failed'))
            })
          }
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ result: 'ok' }) })
        }
        if (href.endsWith('/api/board')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ result: 'ok' }) })
        }
        throw new Error(`unexpected fetch in test: ${href}`)
      })
      vi.stubGlobal('fetch', fetchMock)

      const { result } = renderHook(() => useBacklogStories())
      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(result.current.stories[0].status).toBe('Not Started')

      let dragCall: Promise<void> = Promise.resolve()
      await act(async () => {
        dragCall = result.current.updateStoryStatus('MOCK-0001', 'Done')
        await Promise.resolve()
      })
      expect(result.current.stories[0].status).toBe('Done')

      await act(async () => {
        await result.current.moveStoryToZone('MOCK-0001', 'archive', 'Done', '')
      })
      expect(result.current.stories[0].zone).toBe('archive')
      expect(result.current.stories[0].status).toBe('Done')

      await act(async () => {
        rejectDragStatus?.()
        await expect(dragCall).rejects.toThrow('drag failed')
      })

      // The archive's Done is the correct final state — the failed drag must
      // NOT have rolled it back to "Not Started".
      expect(result.current.stories[0].status).toBe('Done')
    })
  })

  describe('actionError lifecycle', () => {
    it('exposes the failure message after a failed zone change and clears it on the next successful one', async () => {
      // Finding from re-validation: success paths never cleared a previous
      // failure's banner, so a stale "Couldn't update the story" outlived a
      // later action that actually worked.
      let boardShouldFail = true
      const fetchMock = vi.fn((input: RequestInfo | URL) => {
        const href = input.toString()
        if (href.endsWith('/status-colors.json')) return notFound()
        if (href.endsWith('/project.json')) return notFound()
        if (href.endsWith('.backlog-statuses.json')) return notFound()
        if (href.endsWith('.backlog-board.json')) return notFound()
        if (href.endsWith('/local-backlog/')) return okHtml('<a href="MOCK-0001-a-story.md">MOCK-0001-a-story.md</a>')
        if (href.endsWith('MOCK-0001-a-story.md')) return okText(RAW_STORY)
        if (href.endsWith('/api/board')) {
          return boardShouldFail
            ? Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ error: 'board failed' }) })
            : Promise.resolve({ ok: true, json: () => Promise.resolve({ result: 'ok' }) })
        }
        if (href.endsWith('/api/status')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ result: 'ok' }) })
        }
        throw new Error(`unexpected fetch in test: ${href}`)
      })
      vi.stubGlobal('fetch', fetchMock)

      const { result } = renderHook(() => useBacklogStories())
      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(result.current.actionError).toBeNull()

      await act(async () => {
        await expect(result.current.moveStoryToZone('MOCK-0001', 'planner')).rejects.toThrow('board failed')
      })
      expect(result.current.actionError).toBe('board failed')

      boardShouldFail = false
      await act(async () => {
        await result.current.moveStoryToZone('MOCK-0001', 'planner')
      })
      expect(result.current.actionError).toBeNull()
    })

    it('clears actionError on demand via clearActionError', async () => {
      const fetchMock = vi.fn((input: RequestInfo | URL) => {
        const href = input.toString()
        if (href.endsWith('/status-colors.json')) return notFound()
        if (href.endsWith('/project.json')) return notFound()
        if (href.endsWith('.backlog-statuses.json')) return notFound()
        if (href.endsWith('.backlog-board.json')) return notFound()
        if (href.endsWith('/local-backlog/')) return okHtml('<a href="MOCK-0001-a-story.md">MOCK-0001-a-story.md</a>')
        if (href.endsWith('MOCK-0001-a-story.md')) return okText(RAW_STORY)
        if (href.endsWith('/api/board')) {
          return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ error: 'board failed' }) })
        }
        throw new Error(`unexpected fetch in test: ${href}`)
      })
      vi.stubGlobal('fetch', fetchMock)

      const { result } = renderHook(() => useBacklogStories())
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await expect(result.current.moveStoryToZone('MOCK-0001', 'planner')).rejects.toThrow('board failed')
      })
      expect(result.current.actionError).toBe('board failed')

      await act(() => result.current.clearActionError())
      expect(result.current.actionError).toBeNull()
    })
  })

  describe('board membership (the archive regression)', () => {
    it('resolves an archived story to the archive zone, so it does not show in Backlog', async () => {
      // The live regression this story closes: the reader rejected real
      // archive entries, so an archived story fell back to `backlog` and
      // reappeared in the Backlog list. This drives the real membership file
      // through the hook into `computeZone` — the reader-to-list path no
      // other test covered.
      vi.stubGlobal(
        'fetch',
        vi.fn((input: RequestInfo | URL) => {
          const href = input.toString()
          if (href.endsWith('/status-colors.json')) return notFound()
          if (href.endsWith('/project.json')) return notFound()
          if (href.endsWith('.backlog-statuses.json')) return notFound()
          if (href.endsWith('.backlog-board.json')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ planner: [], archive: ['MOCK-0001'] }),
            })
          }
          if (href.endsWith('/local-backlog/')) return okHtml('<a href="MOCK-0001-a-story.md">MOCK-0001-a-story.md</a>')
          if (href.endsWith('MOCK-0001-a-story.md')) return okText(RAW_STORY)
          throw new Error(`unexpected fetch in test: ${href}`)
        }),
      )

      const { result } = renderHook(() => useBacklogStories())
      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.stories[0].zone).toBe('archive')
      expect(result.current.stories.filter((s) => s.zone === 'backlog')).toHaveLength(0)
    })
  })

  describe('projectName', () => {
    it('exposes the fetched project name', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn((input: RequestInfo | URL) => {
          const href = input.toString()
          if (href.endsWith('/status-colors.json')) return notFound()
          if (href.endsWith('/project.json'))
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ name: 'backlog-viewer' }) })
          if (href.endsWith('.backlog-statuses.json')) return notFound()
          if (href.endsWith('.backlog-board.json')) return notFound()
          if (href.endsWith('/local-backlog/')) return okHtml('<a href="MOCK-0001-a-story.md">MOCK-0001-a-story.md</a>')
          if (href.endsWith('MOCK-0001-a-story.md')) return okText(RAW_STORY)
          throw new Error(`unexpected fetch in test: ${href}`)
        }),
      )

      const { result } = renderHook(() => useBacklogStories())
      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.projectName).toBe('backlog-viewer')
    })

    it('exposes null when project.json is missing (older plugin version)', async () => {
      vi.stubGlobal('fetch', vi.fn(makeMockFetch(true)))

      const { result } = renderHook(() => useBacklogStories())
      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.projectName).toBeNull()
    })
  })
})
