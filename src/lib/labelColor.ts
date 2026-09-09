// Complete, literal class strings — never built via interpolation (e.g.
// `bg-${x}-100`), because Tailwind only picks up classes it can find as exact
// text in scanned source. This lookup table IS that scannable text.
const LABEL_PALETTE = [
  'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300',
  'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
  'bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
  'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
]

// Deterministic: the same label string always maps to the same palette entry,
// across cards and across reloads — not random per render.
function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

export function getLabelColorClasses(label: string): string {
  return LABEL_PALETTE[hashString(label) % LABEL_PALETTE.length]
}
