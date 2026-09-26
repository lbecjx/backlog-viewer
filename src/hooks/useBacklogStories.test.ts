import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useBacklogStories } from './useBacklogStories'

// Same exception as loadStatusPalette.test.ts and boardWrites.test.ts: this
// hook's discovery/config fetches resolve against the app's own served root
// (window.location.origin), which has no real server to point at in this
// test environment — only the real per-project /backlog/ mock server
// (test-fixtures/backlog/, port 8002) does, and that's a different origin.
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

// `statusEndpointOk` controls only the `/api/status` route — the one
// `updateStoryStatus` itself triggers — so each test can exercise either
// the success or the failure path through the exact same discovery setup.
function makeMockFetch(statusEndpointOk: boolean) {
  return (input: RequestInfo | URL) => {
    const href = input.toString()
    if (href.endsWith('/status-colors.json')) return notFound()
    if (href.endsWith('.backlog-statuses.json')) return notFound()
    if (href.endsWith('.backlog-board.json')) return notFound()
    if (href.endsWith('/backlog/')) return okHtml('<a href="MOCK-0001-a-story.md">MOCK-0001-a-story.md</a>')
    if (href.endsWith('MOCK-0001-a-story.md')) return okText(RAW_STORY)
    if (href.endsWith('/api/status')) {
      return statusEndpointOk
        ? Promise.resolve({ ok: true, json: () => Promise.resolve({ result: 'ok' }) })
        : Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ error: 'boom' }) })
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

    it('reverts the local change when the server call fails', async () => {
      vi.stubGlobal('fetch', vi.fn(makeMockFetch(false)))

      const { result } = renderHook(() => useBacklogStories())
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await expect(result.current.updateStoryStatus('MOCK-0001', 'Done')).rejects.toThrow('boom')
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
        if (href.endsWith('.backlog-statuses.json')) return notFound()
        if (href.endsWith('.backlog-board.json')) return notFound()
        if (href.endsWith('/backlog/')) return okHtml('<a href="MOCK-0001-a-story.md">MOCK-0001-a-story.md</a>')
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
})
