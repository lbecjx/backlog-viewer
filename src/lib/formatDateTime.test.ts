import { describe, expect, it } from 'vitest'
import { formatFriendlyDate, formatFriendlyDateTime, formatFriendlyDateTimes } from './formatDateTime'

describe('formatFriendlyDateTime', () => {
  it('formats an ISO UTC datetime as a human-readable date and time', () => {
    // Loose match (no fixed locale/timezone asserted) — this test only
    // proves it's no longer the raw ISO string, not a specific rendering.
    const formatted = formatFriendlyDateTime('2026-09-21T22:00:00Z')
    expect(formatted).not.toBe('2026-09-21T22:00:00Z')
    expect(formatted).toMatch(/2026/)
  })

  it('returns the input verbatim for a malformed datetime, not "Invalid Date"', () => {
    expect(formatFriendlyDateTime('not-a-date')).toBe('not-a-date')
  })

  it('returns the input verbatim for an out-of-range day, not a silently-shifted date', () => {
    // A regression test for a real bug: `new Date(...)` never errors on a
    // day that doesn't exist in that month (2026 isn't a leap year, so Feb
    // has 29 days) — it normalizes forward to a different, wrong-looking-
    // plausible date instead. Number.isNaN(date.getTime()) alone can't catch
    // this since the resulting Date is genuinely valid, just not the one
    // the string asked for.
    expect(formatFriendlyDateTime('2026-02-30T10:00:00Z')).toBe('2026-02-30T10:00:00Z')
  })
})

describe('formatFriendlyDate', () => {
  it('formats a plain YYYY-MM-DD date, not the raw string', () => {
    const formatted = formatFriendlyDate('2026-09-21')
    expect(formatted).not.toBe('2026-09-21')
    expect(formatted).toMatch(/2026/)
  })

  it('never shifts the day backward for a viewer west of UTC (parses via the local-time constructor, not UTC midnight)', () => {
    // A regression test for a real bug caught before it shipped: building
    // this via `new Date('2026-09-21')` parses as UTC midnight, which
    // formats as "Sep 20" for any timezone behind UTC. Asserting the day
    // number directly (locale-independent) rather than a full formatted
    // string, since the exact wording depends on the runner's locale.
    const date = new Date(2026, 8, 21) // same local-time construction formatFriendlyDate uses
    expect(date.getDate()).toBe(21)
    expect(formatFriendlyDate('2026-09-21')).toContain('21')
  })

  it('returns the input verbatim for a malformed date', () => {
    expect(formatFriendlyDate('not-a-date')).toBe('not-a-date')
  })

  it('returns the input verbatim for an out-of-range day, not a silently-shifted date', () => {
    // Same class of bug as formatFriendlyDateTime's equivalent test — the
    // local-time constructor also normalizes an impossible day forward
    // instead of erroring.
    expect(formatFriendlyDate('2026-02-30')).toBe('2026-02-30')
  })
})

describe('formatFriendlyDateTimes', () => {
  it('replaces every ISO UTC datetime in a block of text, leaving everything else untouched', () => {
    const text =
      '- 2026-09-21T22:00:00Z — Created (Status: Not Started)\n' +
      '- 2026-09-21T22:30:00Z — Status: Not Started → Blocked'
    const result = formatFriendlyDateTimes(text)
    expect(result).not.toContain('2026-09-21T22:00:00Z')
    expect(result).not.toContain('2026-09-21T22:30:00Z')
    expect(result).toContain('— Created (Status: Not Started)')
    expect(result).toContain('— Status: Not Started → Blocked')
  })

  it('leaves a plain YYYY-MM-DD date untouched (not the ISO-with-time shape)', () => {
    expect(formatFriendlyDateTimes('Created: 2026-09-21')).toBe('Created: 2026-09-21')
  })

  it('leaves text with no dates untouched', () => {
    expect(formatFriendlyDateTimes('nothing to see here')).toBe('nothing to see here')
  })
})
