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
    resolution: undefined,
    note: undefined,
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
  it('strikes through the title when the story has a resolution, in any zone', () => {
    const story = makeStory({ resolution: "Won't Do", zone: 'planner', status: 'In Progress' })
    render(<StoryCard story={story} selected={false} onSelect={vi.fn()} />)
    expect(screen.getByText('A story')).toHaveClass('line-through')
  })

  it('does not strike through a story with no resolution, even one archived or Done', () => {
    // Status and zone are irrelevant to the rule — this fixture sets both to
    // the values that used to imply "closed" (archived, Done) and still must
    // not be struck, because there is no resolution.
    const story = makeStory({ resolution: undefined, zone: 'archive', status: 'Done' })
    render(<StoryCard story={story} selected={false} onSelect={vi.fn()} />)
    expect(screen.getByText('A story')).not.toHaveClass('line-through')
  })

  it('does not strike a Done story that was never archived and has no resolution', () => {
    // Synthetic: real data holds `Status: Done ⇔ Resolution set`, so a Done
    // story with no resolution cannot actually occur — the fixture exists only
    // to prove the rule reads the resolution and never the Status.
    const story = makeStory({ resolution: undefined, zone: 'backlog', status: 'Done' })
    render(<StoryCard story={story} selected={false} onSelect={vi.fn()} />)
    expect(screen.getByText('A story')).not.toHaveClass('line-through')
  })

  it('does not strike through on a present-but-empty resolution row', () => {
    const story = makeStory({ resolution: '', zone: 'archive' })
    render(<StoryCard story={story} selected={false} onSelect={vi.fn()} />)
    expect(screen.getByText('A story')).not.toHaveClass('line-through')
  })

  it('strikes through an unrecognized resolution value just the same (presence, not a value list)', () => {
    // The canonical set lives in the plugin's story-model.json and grows, so
    // the strike must key off presence — never a hardcoded list of values.
    const story = makeStory({ resolution: 'Superseded', zone: 'backlog', status: 'Not Started' })
    render(<StoryCard story={story} selected={false} onSelect={vi.fn()} />)
    expect(screen.getByText('A story')).toHaveClass('line-through')
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
