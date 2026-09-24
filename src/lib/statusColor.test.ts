import { afterEach, describe, expect, it } from 'vitest'
import { configureStatusColors, getStatusAccentBorderClass, getStatusColorClasses, type StatusPalette } from './statusColor'

// A small literal palette, not the real status-colors.json — this file only
// tests configureStatusColors's own mapping logic, not the real content of
// that file (which lives in the local-backlog plugin, not this repo — see
// statusColor.ts's own comment).
const PALETTE: StatusPalette = {
  neutral: { badge: 'bg-neutral-100', border: 'border-l-neutral-400' },
  blue: { badge: 'bg-blue-100', border: 'border-l-blue-500' },
  green: { badge: 'bg-green-100', border: 'border-l-green-500' },
  red: { badge: 'bg-red-100', border: 'border-l-red-500' },
}

const DEFAULT_STATUSES = [
  { name: 'Not Started', color: 'neutral' },
  { name: 'In Progress', color: 'blue' },
  { name: 'Done', color: 'green' },
]

// `configureStatusColors` mutates module-level state (see statusColor.ts's
// own comment on why: every call site takes just a status string, no config
// threaded through props) — reset to a known state after each test so one
// test's custom config can't leak into the next.
afterEach(() => {
  configureStatusColors(PALETTE, DEFAULT_STATUSES)
})

describe('getStatusColorClasses', () => {
  it('gives each of the 3 standard statuses a distinct color', () => {
    configureStatusColors(PALETTE, DEFAULT_STATUSES)
    const colors = new Set([
      getStatusColorClasses('Not Started'),
      getStatusColorClasses('In Progress'),
      getStatusColorClasses('Done'),
    ])
    expect(colors.size).toBe(3)
  })

  it('gives a non-standard status a distinct "needs attention" color, not blank/gray', () => {
    configureStatusColors(PALETTE, DEFAULT_STATUSES)
    const unknown = getStatusColorClasses('Bloqueado por vendor')
    expect(unknown).not.toBe(getStatusColorClasses('Not Started'))
    expect(unknown).toMatch(/amber/)
  })
})

describe('configureStatusColors', () => {
  it('recognizes a project-defined status once configured', () => {
    configureStatusColors(PALETTE, [...DEFAULT_STATUSES, { name: 'Blocked', color: 'red' }])
    expect(getStatusColorClasses('Blocked')).toMatch(/red/)
    expect(getStatusAccentBorderClass('Blocked')).toMatch(/red/)
  })

  it('treats a status outside the configured set as unknown, even if it used to be recognized', () => {
    configureStatusColors(PALETTE, [{ name: 'Done', color: 'green' }])
    // "Not Started" isn't in this config — no longer treated as known.
    expect(getStatusColorClasses('Not Started')).toMatch(/amber/)
  })

  it('falls back to the unknown color for a config entry naming a color absent from the palette', () => {
    configureStatusColors(PALETTE, [{ name: 'Weird', color: 'chartreuse' }])
    expect(getStatusColorClasses('Weird')).toMatch(/amber/)
  })

  it('falls back to the unknown color entirely when the palette itself is empty (e.g. the fetch failed)', () => {
    configureStatusColors({}, DEFAULT_STATUSES)
    expect(getStatusColorClasses('Not Started')).toMatch(/amber/)
  })

  it('uses its own 3 defaults when called with no statuses argument', () => {
    configureStatusColors(PALETTE, [{ name: 'Done', color: 'green' }])
    configureStatusColors(PALETTE)
    expect(getStatusColorClasses('Not Started')).toBe('bg-neutral-100')
  })
})
