import { describe, expect, it } from 'vitest'
import { extractCodeFromFilename, parseStory } from './parseStory'
import { fetchStoryRaw } from './discoverStories'

// Reads the real mock files from disk (via the same live server as
// discoverStories.test.ts) instead of inlining copies of their content —
// keeps this test honest against what actually ships in public/backlog/.
const BASE_URL = 'http://localhost:8002/'

describe('extractCodeFromFilename', () => {
  it('extracts the ticket code prefix from a filename', () => {
    expect(extractCodeFromFilename('MOCK-0001-story-done-normal.md')).toBe('MOCK-0001')
    expect(extractCodeFromFilename('NB-0042-something.md')).toBe('NB-0042')
  })
})

describe('parseStory', () => {
  it('parses a well-formed story (MOCK-0001) completely', async () => {
    const raw = await fetchStoryRaw(BASE_URL, 'MOCK-0001-story-done-normal.md')
    const story = parseStory(raw, 'MOCK-0001-story-done-normal.md')

    expect(story.code).toBe('MOCK-0001')
    expect(story.title).toBe('MOCK-0001 · Agregar botón de exportar a CSV')
    expect(story.type).toBe('Story')
    expect(story.priority).toBe('Medium')
    expect(story.status).toBe('Done')
    expect(story.labels).toEqual(['export', 'ui'])
    expect(story.created).toBe('2026-08-01')
    expect(story.updated).toBe('2026-08-05')
    expect(story.body).toContain('## Descripción')
    expect(story.body).toContain('Botón "Exportar CSV" visible')
  })

  it('parses multiple labels correctly (MOCK-0005)', async () => {
    const raw = await fetchStoryRaw(BASE_URL, 'MOCK-0005-story-code-blocks.md')
    const story = parseStory(raw, 'MOCK-0005-story-code-blocks.md')
    expect(story.labels).toEqual(['performance', 'api', 'cache', 'backend'])
  })

  it('preserves multi-line list content in the body verbatim, unmodified (MOCK-0003)', async () => {
    const raw = await fetchStoryRaw(BASE_URL, 'MOCK-0003-story-multiline-lists.md')
    const story = parseStory(raw, 'MOCK-0003-story-multiline-lists.md')

    // The continuation line of AC #1 must survive intact in the body — this
    // module must not truncate or "fix" it. Rendering it correctly is the
    // renderer's job (Task Group 5), not this parser's.
    expect(story.body).toContain('mostrando un error inline si falla la validación sin esperar')
    expect(story.body).toContain('la respuesta del servidor')
  })

  it('falls back to sensible defaults for a malformed metadata table (MOCK-0004), never crashing', async () => {
    const raw = await fetchStoryRaw(BASE_URL, 'MOCK-0004-story-malformed-table.md')
    const story = parseStory(raw, 'MOCK-0004-story-malformed-table.md')

    expect(story.code).toBe('MOCK-0004') // present in the table, used as-is
    expect(story.type).toBe('Story') // default — missing from the table
    expect(story.priority).toBe('Medium') // default — missing from the table
    expect(story.status).toBe('Bloqueado por vendor') // present, even if non-standard — not forced into a fixed enum
    expect(story.labels).toEqual([]) // default — missing from the table
    expect(story.created).toBeUndefined()
    expect(story.updated).toBeUndefined()
  })

  it('falls back to the filename code when the table has no Código row at all', () => {
    const raw = '# Sin tabla\n\n---\n\n## Descripción\nsin metadata'
    const story = parseStory(raw, 'NB-0007-sin-tabla.md')
    expect(story.code).toBe('NB-0007')
  })
})
