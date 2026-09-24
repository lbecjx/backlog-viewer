import type { BoardMembership } from './backlogConfig'

export type Zone = 'backlog' | 'planner' | 'archive'

// A code absent from both lists is Backlog — the default, not a special
// case. A code in both (an invalid state `set-board.sh` itself already
// self-heals against, but a stale client-side read mid-write could still
// observe transiently) resolves to archive, same precedence TG1 enforces
// server-side. A membership entry with no matching parsed story is simply
// never looked up here — this function is only ever called with a real
// story's own code, so a dangling entry is naturally skipped rather than
// surfaced as an error.
export function computeZone(code: string, membership: BoardMembership): Zone {
  if (membership.archive.some((entry) => entry.code === code)) return 'archive'
  if (membership.planner.includes(code)) return 'planner'
  return 'backlog'
}
