// Talks to the local server's write endpoints (idle_server.py, in the
// separate `local-backlog` plugin repo — see that server's `do_POST` for
// the exact contract this mirrors: always JSON, `{ result }` on 200,
// `{ error }` on any non-2xx status). Split out from backlogConfig.ts
// deliberately: that file is read-only config fetches, this is a write
// against a single story's own data — different concern, not just a
// different HTTP verb.
// The server always responds with `{ error: string }` on failure — but a
// response that never reached the server's own handler (a proxy 404, a
// network intermediary) might not be JSON at all, so this still needs a
// safe fallback rather than assuming the shape. Shared by both write
// endpoints, which differ only in their fallback message.
async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  const body: unknown = await res.json().catch(() => null)
  return body !== null && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
    ? body.error
    : fallback
}

export async function postStoryStatus(origin: string, code: string, status: string): Promise<void> {
  const res = await fetch(new URL('/api/status', origin), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, status }),
  })
  if (res.ok) return

  throw new Error(await parseErrorMessage(res, `Failed to update status (HTTP ${res.status})`))
}

// Updates a story's zone (backlog / planner / archive). Optional resolution
// and reason apply only to archive operations: resolution is the final status
// (defaults to 'Done' server-side), and reason is a human-readable note.
export async function postStoryBoard(
  origin: string,
  code: string,
  zone: string,
  resolution?: string,
  reason?: string,
): Promise<void> {
  const res = await fetch(new URL('/api/board', origin), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, zone, resolution, reason }),
  })
  if (res.ok) return

  throw new Error(await parseErrorMessage(res, `Failed to update board (HTTP ${res.status})`))
}
