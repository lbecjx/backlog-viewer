import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { BacklogStory } from '../hooks/useBacklogStories'
import { StoryDetailDrawer } from './StoryDetailDrawer'

const STORY: BacklogStory = {
  code: 'MOCK-0002',
  title: 'Migrar autenticación a OAuth2',
  type: 'Story',
  priority: 'High',
  status: 'In Progress',
  labels: ['auth'],
  created: '2026-08-10',
  updated: '2026-08-20',
  body: 'contenido sobre login social',
  progress: { done: 1, total: 5 },
  zone: 'planner',
}

describe('StoryDetailDrawer', () => {
  it('renders the selected story', () => {
    render(<StoryDetailDrawer story={STORY} onClose={vi.fn()} />)
    expect(screen.getByText(/Migrar autenticación a OAuth2/)).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
  })

  it('renders nothing for a null story (closed state)', () => {
    render(<StoryDetailDrawer story={null} onClose={vi.fn()} />)
    expect(screen.queryByText(/Migrar autenticación/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Close story detail' })).not.toBeInTheDocument()
  })

  it('shows both Created and Updated, not just one', () => {
    render(<StoryDetailDrawer story={STORY} onClose={vi.fn()} />)
    expect(screen.getByText('Created')).toBeInTheDocument()
    expect(screen.getByText('Updated')).toBeInTheDocument()
  })

  it('shows an Acceptance Criteria progress summary and bar width matching the story progress', () => {
    render(<StoryDetailDrawer story={STORY} onClose={vi.fn()} />)
    expect(screen.getByText('1/5')).toBeInTheDocument()
    const bar = document.querySelector('.bg-indigo-600') as HTMLElement | null
    expect(bar).not.toBeNull()
    expect(bar?.style.width).toBe('20%')
  })

  it('does not render an Acceptance Criteria section when there are no ACs', () => {
    render(<StoryDetailDrawer story={{ ...STORY, progress: null }} onClose={vi.fn()} />)
    expect(screen.queryByText('Acceptance Criteria')).not.toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<StoryDetailDrawer story={STORY} onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'Close story detail' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the scrim is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { container } = render(<StoryDetailDrawer story={STORY} onClose={onClose} />)
    const scrim = container.querySelector('[aria-hidden="true"]') as HTMLElement
    await user.click(scrim)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Escape is pressed while open', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<StoryDetailDrawer story={STORY} onClose={onClose} />)
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not call onClose from Escape when already closed', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<StoryDetailDrawer story={null} onClose={onClose} />)
    await user.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('keeps showing the last story while sliding closed, instead of emptying on the same render', () => {
    // Regression test: `open` (drives the slide transform) and the content
    // gate used to be the exact same `story !== null` check, so the panel's
    // content vanished on the very render the close animation started —
    // found via adversarial review. The panel must still show MOCK-0002
    // one render after `story` clears, just positioned off-screen.
    const { container, rerender } = render(<StoryDetailDrawer story={STORY} onClose={vi.fn()} />)
    rerender(<StoryDetailDrawer story={null} onClose={vi.fn()} />)

    expect(screen.getByText(/Migrar autenticación a OAuth2/)).toBeInTheDocument()
    const panel = container.querySelector('.translate-x-full')
    expect(panel).not.toBeNull()
  })

  it('replaces the shown content when a different story is selected next', () => {
    const OTHER: BacklogStory = { ...STORY, code: 'MOCK-0003', title: 'Otra story distinta' }
    const { rerender } = render(<StoryDetailDrawer story={STORY} onClose={vi.fn()} />)
    rerender(<StoryDetailDrawer story={OTHER} onClose={vi.fn()} />)

    expect(screen.getByText('Otra story distinta')).toBeInTheDocument()
    expect(screen.queryByText(/Migrar autenticación a OAuth2/)).not.toBeInTheDocument()
  })
})
