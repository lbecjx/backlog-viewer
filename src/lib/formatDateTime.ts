// Matches the exact shape `/local-backlog:update-status`'s History entries
// use — a full ISO 8601 UTC datetime (`YYYY-MM-DDTHH:MM:SSZ`) — the raw
// technical format that's correct to store (unambiguous regardless of who
// writes it) but wrong to show a human as-is.
const ISO_UTC_DATETIME = /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z\b/g

// Renders in the viewer's own locale/timezone (`undefined` locale lets
// `Intl.DateTimeFormat` pick the browser's own — this app's own UI text is
// Spanish, so defaulting to a hardcoded English format would be inconsistent
// for exactly the audience most likely to use it).
const FRIENDLY_FORMAT = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const ISO_DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})T/

export function formatFriendlyDateTime(isoUtc: string): string {
  const date = new Date(isoUtc)
  if (Number.isNaN(date.getTime())) return isoUtc // Malformed input: show it verbatim rather than "Invalid Date".
  // Number.isNaN alone doesn't catch an out-of-range day: the native parser
  // silently normalizes it (e.g. "2026-02-30" -> Mar 2) instead of failing,
  // so a typo renders as a different, wrong-but-plausible date instead of
  // the verbatim fallback this function's whole point is to provide.
  // Round-trip the UTC components the string itself specified against what
  // the parser actually produced.
  const match = ISO_DATE_PREFIX.exec(isoUtc)
  if (
    match &&
    (date.getUTCFullYear() !== Number(match[1]) ||
      date.getUTCMonth() !== Number(match[2]) - 1 ||
      date.getUTCDate() !== Number(match[3]))
  ) {
    return isoUtc
  }
  return FRIENDLY_FORMAT.format(date)
}

const FRIENDLY_DATE_FORMAT = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
const PLAIN_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

// For the metadata table's own `Created`/`Updated` fields, which are plain
// `YYYY-MM-DD` with no time component — a pure calendar date, not a moment
// in time, so there is nothing to convert from UTC to local. Building the
// `Date` via `new Date(isoDate)` (parsed as UTC midnight per the ISO 8601
// spec) and then formatting in the viewer's local timezone would shift the
// displayed day backward for anyone west of UTC — verified directly: a
// viewer at UTC-5 formatting "2026-09-21" that way renders "Sep 20", one day
// off. Parsing the Y/M/D components into `new Date(year, monthIndex, day)`
// instead (the local-time constructor, no timezone math involved at all)
// keeps the calendar date exactly what the string said, regardless of the
// viewer's own timezone.
export function formatFriendlyDate(isoDate: string): string {
  const match = PLAIN_DATE.exec(isoDate)
  if (!match) return isoDate
  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  // Same silent-normalization gap as formatFriendlyDateTime: new Date(y, m, d)
  // never errors on an out-of-range day (e.g. Feb 30 -> Mar 2), it just
  // returns a different, valid-looking date. Round-trip the constructed
  // date's own components against what was actually asked for.
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return isoDate
  }
  return FRIENDLY_DATE_FORMAT.format(date)
}

// Applied to a story's body before markdown rendering — see StoryBody in
// StoryDetail.tsx. Every ISO UTC datetime in the text (in practice, only
// ever in a `## History` line) becomes human-readable; anything that isn't
// that exact shape (a plain `YYYY-MM-DD` date, ordinary prose) is untouched.
export function formatFriendlyDateTimes(text: string): string {
  return text.replace(ISO_UTC_DATETIME, (match) => formatFriendlyDateTime(match))
}
