import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { BacklogStory } from '../hooks/useBacklogStories'
import { StoryList } from './StoryList'

// Plain fixtures — this tests UI behavior (search, filter), not the live-discovery
// mechanism, which is already covered end-to-end in src/lib/discoverStories.test.ts.
const STORIES: BacklogStory[] = [
  {
    code: 'MOCK-0001',
    title: 'Agregar botón de exportar a CSV',
    type: 'Story',
    priority: 'Medium',
    status: 'Done',
    labels: ['export', 'ui'],
    created: '2026-08-01',
    updated: '2026-08-05',
    body: 'contenido sobre exportar csv',
    progress: { done: 3, total: 3 },
    zone: 'backlog',
  },
  {
    code: 'MOCK-0002',
    title: 'Migrar autenticación a OAuth2',
    type: 'Story',
    priority: 'High',
    status: 'In Progress',
    labels: ['auth'],
    created: '2026-08-10',
    updated: '2026-08-20',
    body: 'contenido sobre login social con google',
    progress: { done: 1, total: 5 },
    zone: 'backlog',
  },
]

describe('StoryList', () => {
  it('shows every story with no filter applied', () => {
    render(<StoryList stories={STORIES} selectedCode={null} onSelect={vi.fn()} />)
    expect(screen.getByText('Agregar botón de exportar a CSV')).toBeInTheDocument()
    expect(screen.getByText('Migrar autenticación a OAuth2')).toBeInTheDocument()
  })

  it('filters by search text matching the body, not just the title', async () => {
    const user = userEvent.setup()
    render(<StoryList stories={STORIES} selectedCode={null} onSelect={vi.fn()} />)

    await user.type(screen.getByPlaceholderText(/Search/i), 'login social')

    expect(screen.queryByText('Agregar botón de exportar a CSV')).not.toBeInTheDocument()
    expect(screen.getByText('Migrar autenticación a OAuth2')).toBeInTheDocument()
  })

  it('shows "No results" when the search matches nothing', async () => {
    const user = userEvent.setup()
    render(<StoryList stories={STORIES} selectedCode={null} onSelect={vi.fn()} />)

    await user.type(screen.getByPlaceholderText(/Search/i), 'something that does not exist')

    expect(screen.getByText('No results')).toBeInTheDocument()
  })

  it('clicking a status chip filters to that status, clicking it again clears the filter', async () => {
    const user = userEvent.setup()
    render(<StoryList stories={STORIES} selectedCode={null} onSelect={vi.fn()} />)

    const doneChip = screen.getByRole('button', { name: 'Done' })
    await user.click(doneChip)

    expect(screen.getByText('Agregar botón de exportar a CSV')).toBeInTheDocument()
    expect(screen.queryByText('Migrar autenticación a OAuth2')).not.toBeInTheDocument()

    await user.click(doneChip)

    expect(screen.getByText('Agregar botón de exportar a CSV')).toBeInTheDocument()
    expect(screen.getByText('Migrar autenticación a OAuth2')).toBeInTheDocument()
  })

  it('calls onSelect with the story code when a card is clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<StoryList stories={STORIES} selectedCode={null} onSelect={onSelect} />)

    await user.click(screen.getByText('Agregar botón de exportar a CSV'))

    expect(onSelect).toHaveBeenCalledWith('MOCK-0001')
  })

  it('hides the status filter row when every visible story shares the same status', () => {
    // Filtering by the one status every card already has would do nothing —
    // Archive is the realistic case (every archived story is "Done" today),
    // but this is general StoryList behavior, not Archive-specific.
    const sameStatus: BacklogStory[] = STORIES.map((s) => ({ ...s, status: 'Done' }))
    render(<StoryList stories={sameStatus} selectedCode={null} onSelect={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument()
  })

  it('shows the status filter row once a second distinct status is present', () => {
    render(<StoryList stories={STORIES} selectedCode={null} onSelect={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'In Progress' })).toBeInTheDocument()
  })
})
