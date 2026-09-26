import { describe, expect, it } from 'vitest'
import type { BoardMembership } from './backlogConfig'
import { computeZone } from './computeZone'

const EMPTY: BoardMembership = { planner: [], archive: [] }

describe('computeZone', () => {
  it('returns backlog for a code in neither list', () => {
    expect(computeZone('MOCK-0001', EMPTY)).toBe('backlog')
  })

  it('returns planner for a code in the planner list', () => {
    const membership: BoardMembership = { planner: ['MOCK-0001'], archive: [] }
    expect(computeZone('MOCK-0001', membership)).toBe('planner')
  })

  it('returns archive for a code in the archive list', () => {
    const membership: BoardMembership = {
      planner: [],
      archive: [{ code: 'MOCK-0001', resolution: 'Done', reason: '' }],
    }
    expect(computeZone('MOCK-0001', membership)).toBe('archive')
  })

  it('resolves to archive when a code is in both lists (same precedence as set-board.sh)', () => {
    const membership: BoardMembership = {
      planner: ['MOCK-0001'],
      archive: [{ code: 'MOCK-0001', resolution: 'Done', reason: '' }],
    }
    expect(computeZone('MOCK-0001', membership)).toBe('archive')
  })

  it('is unaffected by a dangling membership entry for a different code', () => {
    // Simulates a membership file referencing a story whose .md file no
    // longer exists — this function is only ever called with a real
    // story's own code, so a dangling entry for some other code is simply
    // never looked up here, not an error condition.
    const membership: BoardMembership = {
      planner: ['MOCK-9999'],
      archive: [{ code: 'MOCK-8888', resolution: 'Done', reason: '' }],
    }
    expect(computeZone('MOCK-0001', membership)).toBe('backlog')
  })
})
