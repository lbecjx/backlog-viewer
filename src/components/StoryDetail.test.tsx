import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { BacklogStory } from '../hooks/useBacklogStories'
import { StoryDetail } from './StoryDetail'

const STORY: BacklogStory = {
  code: 'MOCK-0001',
  title: 'Agregar botón de exportar a CSV',
  type: 'Story',
  priority: 'High',
  status: 'In Progress',
  labels: ['export', 'ui'],
  created: '2026-08-01',
  updated: '2026-08-05',
  body: 'contenido de la story',
  progress: { done: 1, total: 3 },
  zone: 'backlog',
}

describe('StoryDetail', () => {
  it('shows the placeholder when no story is selected', () => {
    render(<StoryDetail story={null} />)
    expect(screen.getByText('Select a story to see its details')).toBeInTheDocument()
  })

  it('shows the same metadata the card shows: status, type, and labels', () => {
    render(<StoryDetail story={STORY} />)
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText(/Story/)).toBeInTheDocument()
    expect(screen.getByText('export')).toBeInTheDocument()
    expect(screen.getByText('ui')).toBeInTheDocument()
  })

  it('also shows metadata the card does not, each under its own sidebar label', () => {
    render(<StoryDetail story={STORY} />)
    expect(screen.getByText('Priority')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText('Progress')).toBeInTheDocument()
    expect(screen.getByText('1/3 ACs')).toBeInTheDocument()
  })

  it('shows Created/Updated in a friendly format, not the raw ISO date', () => {
    // Not asserting the exact formatted string — Intl.DateTimeFormat's
    // output depends on the runner's own locale, only that it isn't ISO.
    render(<StoryDetail story={STORY} />)
    expect(screen.getByText('Created')).toBeInTheDocument()
    expect(screen.getByText('Updated')).toBeInTheDocument()
    expect(screen.queryByText('2026-08-01')).not.toBeInTheDocument()
    expect(screen.queryByText('2026-08-05')).not.toBeInTheDocument()
  })

  it('does not render a Labels field when the story has none', () => {
    render(<StoryDetail story={{ ...STORY, labels: [] }} />)
    expect(screen.queryByText('Labels')).not.toBeInTheDocument()
    expect(screen.queryByText('export')).not.toBeInTheDocument()
  })
})
