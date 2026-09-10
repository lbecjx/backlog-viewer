// Splits a story's raw Markdown into its metadata table (Code/Type/Priority/
// Status/Labels/Created/Updated) and everything else. The body is returned
// verbatim, unmodified — list-continuation handling and
// any other Markdown rendering concern belongs to the renderer (see
// docs/STORY_LOCAL_BACKLOG_VIEWER.md Section 5), not here. This module only
// ever reads metadata; it never fixes or reinterprets the Markdown structure.

export interface ParsedStory {
  code: string
  title: string
  type: string
  priority: string
  status: string
  labels: string[]
  created: string | undefined
  updated: string | undefined
  body: string
}

const DEFAULTS = {
  type: 'Story',
  priority: 'Medium',
  status: 'Unknown',
} as const

// A metadata row looks like `| **Code** | MOCK-0001 |` — bold key, plain value.
const METADATA_ROW_PATTERN = /^\|\s*\*\*(.+?)\*\*\s*\|\s*(.*?)\s*\|\s*$/gm

// Header-row label for the table itself ("| Field | Value |").
const TABLE_HEADER_LABELS = new Set(['field'])

function extractTitle(headerBlock: string): string {
  const match = headerBlock.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : 'Untitled'
}

function extractMetadataFields(headerBlock: string): Map<string, string> {
  const fields = new Map<string, string>()
  for (const match of headerBlock.matchAll(METADATA_ROW_PATTERN)) {
    const [, key, value] = match
    if (TABLE_HEADER_LABELS.has(key.trim().toLowerCase())) continue // header row of the table itself
    fields.set(key.trim(), value.trim())
  }
  return fields
}

function field(fields: Map<string, string>, key: string): string | undefined {
  return fields.get(key)
}

function parseLabels(raw: string | undefined): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((label) => label.trim())
    .filter((label) => label.length > 0)
}

export function extractCodeFromFilename(filename: string): string {
  const match = filename.match(/^([A-Z]{2,6}-\d{4})/)
  return match ? match[1] : filename
}

// The filename's own code prefix is the fallback when the table has no (or a
// blank) Code row — a story is never left without a code just because its
// table is malformed.
export function parseStory(raw: string, filename: string): ParsedStory {
  const separatorIndex = raw.search(/^---\s*$/m)
  const headerBlock = separatorIndex === -1 ? raw : raw.slice(0, separatorIndex)
  const body = separatorIndex === -1 ? '' : raw.slice(separatorIndex + 3).trim()

  const fields = extractMetadataFields(headerBlock)

  return {
    code: field(fields, 'Code') || extractCodeFromFilename(filename),
    title: extractTitle(headerBlock),
    type: field(fields, 'Type') || DEFAULTS.type,
    priority: field(fields, 'Priority') || DEFAULTS.priority,
    status: field(fields, 'Status') || DEFAULTS.status,
    labels: parseLabels(fields.get('Labels')),
    created: field(fields, 'Created'),
    updated: field(fields, 'Updated'),
    body,
  }
}
