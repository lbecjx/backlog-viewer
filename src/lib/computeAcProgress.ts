export interface AcProgress {
  done: number
  total: number
}

// Matches the `1. ✅ ...` / `2. 🔧 ...` / `3. ⬜ ...` convention used across every
// story in this project's own backlog. Returns null when a story's ACs don't use
// this marker convention at all (e.g. a plain numbered list with no status) — that's
// a valid "not gradable this way" result, not an error.
const AC_LINE_PATTERN = /^\s*\d+\.\s*(✅|🔧|⬜)/

export function computeAcProgress(body: string): AcProgress | null {
  let done = 0
  let total = 0

  for (const line of body.split('\n')) {
    const match = line.match(AC_LINE_PATTERN)
    if (!match) continue
    total++
    if (match[1] === '✅') done++
  }

  return total > 0 ? { done, total } : null
}
