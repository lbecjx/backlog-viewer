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
})
