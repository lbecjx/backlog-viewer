import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchProjectName } from './projectInfo'

// Same exception as loadStatusPalette.test.ts: this fetches from the app's
// own served root, which has no real server to point at in this test
// environment, so mocked fetch is the only option.
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchProjectName', () => {
  it('returns the name from a real-shaped response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ name: 'my-project' }) }))
    expect(await fetchProjectName()).toBe('my-project')
  })

  it('returns null, not a rejection, on a 404 (no project.json — older plugin version)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    expect(await fetchProjectName()).toBeNull()
  })

  it('returns null on a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    expect(await fetchProjectName()).toBeNull()
  })

  it('returns null when the response has no name field', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }))
    expect(await fetchProjectName()).toBeNull()
  })

  it('returns null when name is present but not a string', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ name: 42 }) }))
    expect(await fetchProjectName()).toBeNull()
  })

  it('returns null when the response body is not an object', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve('not an object') }))
    expect(await fetchProjectName()).toBeNull()
  })
})
