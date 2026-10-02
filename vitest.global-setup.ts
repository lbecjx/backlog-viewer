import { spawn, type ChildProcess } from 'node:child_process'

// Tests exercise the real discovery mechanism against a real `http.server` —
// no mocked fetch. A dedicated instance on a different port than `pnpm dev:server`
// (8001) avoids colliding with a dev session that might already be running.
const TEST_SERVER_PORT = 8002

// A fixed startup delay races the server's own bind/listen: on a slow cold
// start the first request hits a socket that isn't accepting yet, and an
// aggressively concurrent first batch can reset connections. Poll until the
// server actually answers instead of sleeping a blind interval.
const READY_TIMEOUT_MS = 5000
const READY_POLL_INTERVAL_MS = 50

let server: ChildProcess | undefined

async function waitUntilReady(): Promise<void> {
  const deadline = Date.now() + READY_TIMEOUT_MS
  let lastError: unknown
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://localhost:${TEST_SERVER_PORT}/`, { cache: 'no-store' })
      if (res.ok) return
      lastError = new Error(`unexpected status ${res.status}`)
    } catch (err) {
      lastError = err
    }
    await new Promise((resolve) => setTimeout(resolve, READY_POLL_INTERVAL_MS))
  }
  throw new Error(
    `Test server on :${TEST_SERVER_PORT} not ready within ${READY_TIMEOUT_MS}ms: ${String(lastError)}`,
  )
}

export async function setup() {
  server = spawn(
    'python3',
    ['-m', 'http.server', String(TEST_SERVER_PORT), '--directory', 'test-fixtures/local-backlog'],
    { stdio: 'ignore' },
  )
  await new Promise<void>((resolve, reject) => {
    server?.once('spawn', () => resolve())
    server?.once('error', reject)
  })
  await waitUntilReady()
}

export async function teardown() {
  server?.kill()
}
