import type { BoardMembership } from './backlogConfig'

export type Zone = 'backlog' | 'planner' | 'archive'

// A code absent from both lists is Backlog — the default, not a special
// case. A code in both (an invalid state `set-board.sh` itself already
// self-heals against, but a stale client-side read mid-write could still
// observe transiently) resolves to archive, same precedence the plugin's
// `get-board.sh` enforces. A membership entry with no matching parsed story
// is simply never looked up here — this function is only ever called with a
// real story's own code, so a dangling entry is naturally skipped rather
// than surfaced as an error. Both lists hold bare codes (LB-0012).
export function computeZone(code: string, membership: BoardMembership): Zone {
  if (membership.archive.includes(code)) return 'archive'
  if (membership.planner.includes(code)) return 'planner'
  return 'backlog'
}
