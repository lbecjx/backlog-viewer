import { afterEach, describe, expect, it, vi } from 'vitest'
import { postStoryStatus } from './boardWrites'

// Same exception as loadStatusPalette.test.ts: this repo's own test-fixture
// server is a plain `python3 -m http.server`, which can't process POST
// requests at all — the real server that does (idle_server.py) lives in the
// separate `local-backlog` plugin repo. Mocked fetch is the only option.
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('postStoryStatus', () => {
  it('POSTs to /api/status with the code and status, relative to the given origin', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ result: 'ok' }) })
    vi.stubGlobal('fetch', fetchMock)

    await postStoryStatus('http://localhost:8001', 'MOCK-0002', 'Done')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit]
    expect(url.toString()).toBe('http://localhost:8001/api/status')
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(JSON.parse(init.body as string)).toEqual({ code: 'MOCK-0002', status: 'Done' })
  })

  it('resolves without throwing on a 200 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ result: 'ok' }) }))
    await expect(postStoryStatus('http://localhost:8001', 'MOCK-0002', 'Done')).resolves.toBeUndefined()
  })

  it('throws with the server-provided error message on a non-2xx response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: "missing or invalid 'status'" }),
      }),
    )
    await expect(postStoryStatus('http://localhost:8001', 'MOCK-0002', '')).rejects.toThrow(
      "missing or invalid 'status'",
    )
  })

  it('falls back to a generic message when the error response is not the expected JSON shape', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: () => Promise.reject(new Error('not JSON')),
      }),
    )
    await expect(postStoryStatus('http://localhost:8001', 'MOCK-0002', 'Done')).rejects.toThrow(
      'Failed to update status (HTTP 502)',
    )
  })
})
