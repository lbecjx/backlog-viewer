import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { BacklogStory } from '../hooks/useBacklogStories'
import { StoryCard } from './StoryCard'

function makeStory(overrides: Partial<BacklogStory>): BacklogStory {
  return {
    code: 'MOCK-0001',
    title: 'A story',
    type: 'Story',
    priority: 'Medium',
    status: 'Not Started',
    labels: [],
    created: '2026-08-01',
    updated: '2026-08-01',
    body: '',
    progress: null,
    zone: 'backlog',
    ...overrides,
  }
}

describe('StoryCard', () => {
  it('strikes through the title for an archived story, even if its status is not literally "Done"', () => {
    // Status is always "Done" for a real archived story today (a
    // server-side invariant), but the strikethrough is keyed off the zone
    // directly — this fixture status intentionally breaks that assumption
    // to prove it isn't what the styling actually depends on.
    const story = makeStory({ zone: 'archive', status: 'Not Started' })
    render(<StoryCard story={story} selected={false} onSelect={vi.fn()} />)
    expect(screen.getByText('A story')).toHaveClass('line-through')
  })

  it('does not strike through a Backlog story\'s title, even when its status is "Done"', () => {
    const story = makeStory({ zone: 'backlog', status: 'Done' })
    render(<StoryCard story={story} selected={false} onSelect={vi.fn()} />)
    expect(screen.getByText('A story')).not.toHaveClass('line-through')
  })

  it('does not strike through a Planner story\'s title', () => {
    const story = makeStory({ zone: 'planner', status: 'Done' })
    render(<StoryCard story={story} selected={false} onSelect={vi.fn()} />)
    expect(screen.getByText('A story')).not.toHaveClass('line-through')
  })

  it('calls onSelect when Enter key is pressed', async () => {
    const onSelect = vi.fn()
    const story = makeStory({ code: 'MOCK-0042' })
    const { container } = render(<StoryCard story={story} selected={false} onSelect={onSelect} />)
    const card = container.querySelector('[role="button"]')!
    fireEvent.keyDown(card, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledOnce()
  })

  it('calls onSelect when Space key is pressed', async () => {
    const onSelect = vi.fn()
    const story = makeStory({ code: 'MOCK-0042' })
    const { container } = render(<StoryCard story={story} selected={false} onSelect={onSelect} />)
    const card = container.querySelector('[role="button"]')!
    fireEvent.keyDown(card, { key: ' ' })
    expect(onSelect).toHaveBeenCalledOnce()
  })

  it('does not call onSelect for other keys', async () => {
    const onSelect = vi.fn()
    const story = makeStory({ code: 'MOCK-0042' })
    const { container } = render(<StoryCard story={story} selected={false} onSelect={onSelect} />)
    const card = container.querySelector('[role="button"]')!
    fireEvent.keyDown(card, { key: 'ArrowDown' })
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('adapts moveStoryToZone so the action menu receives the story code and zone', async () => {
    const user = userEvent.setup()
    const onMoveToZone = vi.fn().mockResolvedValue(undefined)
    const story = makeStory({ code: 'MOCK-0001', zone: 'backlog' })
    render(<StoryCard story={story} selected={false} onSelect={vi.fn()} onMoveToZone={onMoveToZone} />)

    await user.click(screen.getByRole('button', { name: 'Story actions' }))
    await user.click(screen.getByText('Move to Planner'))
    await user.click(screen.getByRole('button', { name: 'Move' }))

    expect(onMoveToZone).toHaveBeenCalledWith('MOCK-0001', 'planner', undefined, undefined)
  })

  it('does not select the card when the action menu trigger is clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const story = makeStory({ code: 'MOCK-0042' })
    render(
      <StoryCard story={story} selected={false} onSelect={onSelect} onMoveToZone={vi.fn().mockResolvedValue(undefined)} />,
    )

    await user.click(screen.getByRole('button', { name: 'Story actions' }))

    expect(onSelect).not.toHaveBeenCalled()
  })
})
