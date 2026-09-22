import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadStatusPalette } from './statusColor'

// Unlike backlogConfig.test.ts's real-server tests, this fetches from the
// app's own served root (not the per-project /backlog/ mock server) — there
// is no real "app root" server in this test environment to point at, so
// this one function is the exception to the rest of this repo's
// real-server-over-mocked-fetch convention.
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('loadStatusPalette', () => {
  it('fetches and parses a real-shaped palette response', async () => {
    const palette = { neutral: { badge: 'bg-neutral-100', border: 'border-l-neutral-400' } }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(palette) }),
    )
    expect(await loadStatusPalette()).toEqual(palette)
  })

  it('returns an empty object, not a rejection, on a 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    expect(await loadStatusPalette()).toEqual({})
  })

  it('returns an empty object, not a rejection, on a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    expect(await loadStatusPalette()).toEqual({})
  })
})
