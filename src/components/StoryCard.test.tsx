import { render, screen } from '@testing-library/react'
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
})
