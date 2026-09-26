// Talks to the local server's write endpoints (idle_server.py, in the
// separate `local-backlog` plugin repo — see that server's `do_POST` for
// the exact contract this mirrors: always JSON, `{ result }` on 200,
// `{ error }` on any non-2xx status). Split out from backlogConfig.ts
// deliberately: that file is read-only config fetches, this is a write
// against a single story's own data — different concern, not just a
// different HTTP verb.
export async function postStoryStatus(origin: string, code: string, status: string): Promise<void> {
  const res = await fetch(new URL('/api/status', origin), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, status }),
  })
  if (res.ok) return

  // The server always responds with `{ error: string }` on failure — but a
  // response that never reached the server's own handler (a proxy 404, a
  // network intermediary) might not be JSON at all, so this still needs a
  // safe fallback rather than assuming the shape.
  const body: unknown = await res.json().catch(() => null)
  const message =
    body !== null && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
      ? body.error
      : `Failed to update status (HTTP ${res.status})`
  throw new Error(message)
}
