import { spawn, type ChildProcess } from 'node:child_process'

// Tests exercise the real discovery mechanism against a real `http.server` —
// no mocked fetch. A dedicated instance on a different port than `pnpm dev:server`
// (8001) avoids colliding with a dev session that might already be running.
const TEST_SERVER_PORT = 8002

let server: ChildProcess | undefined

export async function setup() {
  server = spawn('python3', ['-m', 'http.server', String(TEST_SERVER_PORT), '--directory', 'test-fixtures/backlog'], {
    stdio: 'ignore',
  })
  await new Promise<void>((resolve, reject) => {
    server?.once('spawn', () => setTimeout(resolve, 200))
    server?.once('error', reject)
  })
}

export async function teardown() {
  server?.kill()
}
