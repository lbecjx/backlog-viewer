import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StoryBody } from './StoryBody'

describe('StoryBody', () => {
  it('renders the story body as sanitized HTML once markdown rendering resolves', async () => {
    // JSX string attributes don't process `\n` as an escape — needs a real
    // JS expression (curly braces) for the newline to actually separate the
    // heading from the paragraph once parsed as markdown.
    render(<StoryBody body={'# Título\n\nContenido de prueba.'} />)
    expect(await screen.findByText('Contenido de prueba.')).toBeInTheDocument()
  })

  it('shows a loading state before the async render resolves', () => {
    render(<StoryBody body="algo" />)
    expect(screen.getByText('Rendering…')).toBeInTheDocument()
  })

  describe('History segments (LB-0010 format)', () => {
    // Each History entry is one markdown bullet, so its own text — including
    // LB-0010's optional ` · Resolution:`/` · Note:` segments — can never bleed
    // into a different entry's line; this is a property of markdown list
    // rendering, not something the viewer code has to enforce.
    it('renders both segments attached to their own transition line', async () => {
      const body =
        '## History\n\n' +
        '- 2026-10-02T15:00:00Z — Status: Not Started → Done · Resolution: Done · Note: Shipped early\n'
      render(<StoryBody body={body} />)
      const item = await screen.findByRole('listitem')
      expect(item).toHaveTextContent('Status: Not Started → Done · Resolution: Done · Note: Shipped early')
    })

    it('renders a resolution-only segment (note skipped) on its own line', async () => {
      const body = '## History\n\n- 2026-10-02T15:00:00Z — Status: In Progress → Done · Resolution: Done\n'
      render(<StoryBody body={body} />)
      const item = await screen.findByRole('listitem')
      expect(item).toHaveTextContent('Status: In Progress → Done · Resolution: Done')
      expect(item).not.toHaveTextContent('Note:')
    })

    it('renders a note-only segment (non-Done move) on its own line', async () => {
      const body =
        '## History\n\n- 2026-10-02T15:00:00Z — Status: Blocked → In Progress · Note: Unblocked by infra fix\n'
      render(<StoryBody body={body} />)
      const item = await screen.findByRole('listitem')
      expect(item).toHaveTextContent('Status: Blocked → In Progress · Note: Unblocked by infra fix')
      expect(item).not.toHaveTextContent('Resolution:')
    })

    it('renders a legacy line with neither segment exactly as before', async () => {
      const body = '## History\n\n- 2026-10-02T15:00:00Z — Status: Not Started → In Progress\n'
      render(<StoryBody body={body} />)
      const item = await screen.findByRole('listitem')
      expect(item).toHaveTextContent('Status: Not Started → In Progress')
      expect(item).not.toHaveTextContent('Resolution:')
      expect(item).not.toHaveTextContent('Note:')
    })

    it('keeps each History line self-contained when multiple entries are present', async () => {
      const body =
        '## History\n\n' +
        '- 2026-10-01T10:00:00Z — Status: Not Started → In Progress · Note: Picked up\n' +
        '- 2026-10-02T15:00:00Z — Status: In Progress → Done · Resolution: Done\n'
      render(<StoryBody body={body} />)
      const items = await screen.findAllByRole('listitem')
      expect(items).toHaveLength(2)
      expect(items[0]).toHaveTextContent('Note: Picked up')
      expect(items[0]).not.toHaveTextContent('Resolution:')
      expect(items[1]).toHaveTextContent('Resolution: Done')
      expect(items[1]).not.toHaveTextContent('Note:')
    })
  })
})
