import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BacklogStory } from '../hooks/useBacklogStories'
import { configureStatusColors, type StatusPalette } from '../lib/statusColor'
import { PlannerBoard } from './PlannerBoard'

// Same small literal palette pattern as statusColor.test.ts — this file only
// tests PlannerBoard's own grouping/column logic, not the real palette content.
const PALETTE: StatusPalette = {
  neutral: { badge: 'bg-neutral-100', border: 'border-l-neutral-400' },
  blue: { badge: 'bg-blue-100', border: 'border-l-blue-500' },
  green: { badge: 'bg-green-100', border: 'border-l-green-500' },
  red: { badge: 'bg-red-100', border: 'border-l-red-500' },
}

const DEFAULT_STATUSES = [
  { name: 'Not Started', color: 'neutral' },
  { name: 'In Progress', color: 'blue' },
  { name: 'Done', color: 'green' },
]

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
    zone: 'planner',
    ...overrides,
  }
}

// `configureStatusColors` mutates module-level state (see statusColor.ts) —
// reset to a known state after each test so one test's custom config can't
// leak into the next.
afterEach(() => {
  configureStatusColors(PALETTE, DEFAULT_STATUSES)
})

// jsdom's native drag-and-drop has no real DataTransfer implementation —
// `fireEvent.dragStart` needs one supplied explicitly, or
// `event.dataTransfer` is null and the component's own `setData` call
// throws. `PlannerBoard` never reads `getData` back (it tracks the dragged
// code in its own component state), so this only needs to not throw.
function dragStart(element: HTMLElement) {
  const dataTransfer = { setData: vi.fn(), getData: vi.fn(() => ''), effectAllowed: '' }
  fireEvent.dragStart(element, { dataTransfer })
}

// The column's own drop target is the ancestor `<div>` with onDragOver/onDrop
// attached — two levels above the uppercase label span (label -> header row
// -> column div).
function getColumnDropTarget(label: string): HTMLElement {
  const heading = screen.getByText(label, { selector: '.uppercase' })
  return heading.closest('div')!.parentElement!
}

describe('PlannerBoard', () => {
  it('renders one column per configured status, in file order', () => {
    configureStatusColors(PALETTE, [
      { name: 'Blocked', color: 'red' },
      { name: 'Not Started', color: 'neutral' },
    ])
    render(<PlannerBoard stories={[]} selectedCode={null} onSelect={vi.fn()} onStatusChange={vi.fn(async () => {})} />)
    const headings = screen.getAllByText(/^(Blocked|Not Started)$/)
    expect(headings.map((h) => h.textContent)).toEqual(['Blocked', 'Not Started'])
  })

  it('groups each story into its own status column', () => {
    const stories = [
      makeStory({ code: 'MOCK-0001', title: 'Not started story', status: 'Not Started' }),
      makeStory({ code: 'MOCK-0002', title: 'In progress story', status: 'In Progress' }),
    ]
    render(<PlannerBoard stories={stories} selectedCode={null} onSelect={vi.fn()} onStatusChange={vi.fn(async () => {})} />)
    expect(screen.getByText('Not started story')).toBeInTheDocument()
    expect(screen.getByText('In progress story')).toBeInTheDocument()
  })

  it('falls back to the 3 built-in defaults when no .backlog-statuses.json exists', () => {
    configureStatusColors(PALETTE)
    render(<PlannerBoard stories={[]} selectedCode={null} onSelect={vi.fn()} onStatusChange={vi.fn(async () => {})} />)
    expect(screen.getByText('Not Started')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
  })

  it('adds an "Other" column only when a story has a status outside the configured set', () => {
    const stories = [makeStory({ status: 'Weird Custom Status' })]
    render(<PlannerBoard stories={stories} selectedCode={null} onSelect={vi.fn()} onStatusChange={vi.fn(async () => {})} />)
    expect(screen.getByText('Other')).toBeInTheDocument()
  })

  it('inserts "Other" right before the last configured column, not after it', () => {
    // DEFAULT_STATUSES ends in "Done" — a project's config conventionally
    // lists its terminal/completed status last, and unfiled stories should
    // read as "still open" (sitting ahead of Done), not as an afterthought
    // trailing behind it.
    const stories = [makeStory({ status: 'Weird Custom Status' })]
    render(<PlannerBoard stories={stories} selectedCode={null} onSelect={vi.fn()} onStatusChange={vi.fn(async () => {})} />)
    const headings = screen.getAllByText(/Not Started|In Progress|Done|Other/, { selector: '.uppercase' })
    expect(headings.map((h) => h.textContent)).toEqual(['Not Started', 'In Progress', '◌Other', 'Done'])
  })

  it('does not render an "Other" column when every story matches a configured status', () => {
    const stories = [makeStory({ status: 'Done' })]
    render(<PlannerBoard stories={stories} selectedCode={null} onSelect={vi.fn()} onStatusChange={vi.fn(async () => {})} />)
    expect(screen.queryByText('Other')).not.toBeInTheDocument()
  })

  it('calls onSelect with the story code when a card is clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const stories = [makeStory({ code: 'MOCK-0003', title: 'Click me', status: 'Not Started' })]
    render(<PlannerBoard stories={stories} selectedCode={null} onSelect={onSelect} onStatusChange={vi.fn(async () => {})} />)
    await user.click(screen.getByText('Click me'))
    expect(onSelect).toHaveBeenCalledWith('MOCK-0003')
  })

  it('keeps a real "Other" status in its own column instead of merging it with the catch-all bucket', () => {
    configureStatusColors(PALETTE, [...DEFAULT_STATUSES, { name: 'Other', color: 'red' }])
    const stories = [
      makeStory({ code: 'MOCK-0004', title: 'Really tagged Other', status: 'Other' }),
      makeStory({ code: 'MOCK-0005', title: 'Genuinely unmatched', status: 'Weird Custom Status' }),
    ]
    render(<PlannerBoard stories={stories} selectedCode={null} onSelect={vi.fn()} onStatusChange={vi.fn(async () => {})} />)
    // Two distinct column headers: the real configured "Other" status and
    // the synthetic catch-all both render (a `StoryCard`'s own status badge
    // also reads "Other" for the first story, so scope to column headers).
    expect(screen.getAllByText('Other', { selector: '.uppercase' })).toHaveLength(2)
    expect(screen.getByText('Really tagged Other')).toBeInTheDocument()
    expect(screen.getByText('Genuinely unmatched')).toBeInTheDocument()
  })

  it('collapses a duplicate status name in the config into a single column', () => {
    configureStatusColors(PALETTE, [
      { name: 'Blocked', color: 'red' },
      { name: 'Blocked', color: 'neutral' },
    ])
    const stories = [makeStory({ status: 'Blocked' })]
    render(<PlannerBoard stories={stories} selectedCode={null} onSelect={vi.fn()} onStatusChange={vi.fn(async () => {})} />)
    expect(screen.getAllByText('Blocked', { selector: '.uppercase' })).toHaveLength(1)
  })

  it('keeps a real status literally named after the catch-all sentinel in its own column', () => {
    configureStatusColors(PALETTE, [...DEFAULT_STATUSES, { name: '__other__', color: 'red' }])
    const stories = [
      makeStory({ code: 'MOCK-0006', title: 'Really tagged __other__', status: '__other__' }),
      makeStory({ code: 'MOCK-0007', title: 'Genuinely unmatched', status: 'Weird Custom Status' }),
    ]
    render(<PlannerBoard stories={stories} selectedCode={null} onSelect={vi.fn()} onStatusChange={vi.fn(async () => {})} />)
    expect(screen.getAllByText('__other__', { selector: '.uppercase' })).toHaveLength(1)
    expect(screen.getAllByText('Other', { selector: '.uppercase' })).toHaveLength(1)
    expect(screen.getByText('Really tagged __other__')).toBeInTheDocument()
    expect(screen.getByText('Genuinely unmatched')).toBeInTheDocument()
  })

  describe('drag and drop', () => {
    it('calls onStatusChange with the target column status when a card is dropped on it', () => {
      const onStatusChange = vi.fn().mockResolvedValue(undefined)
      const stories = [makeStory({ code: 'MOCK-0001', title: 'Card to drag', status: 'Not Started' })]
      render(<PlannerBoard stories={stories} selectedCode={null} onSelect={vi.fn()} onStatusChange={onStatusChange} />)

      dragStart(screen.getByText('Card to drag').closest('button')!)
      const target = getColumnDropTarget('In Progress')
      fireEvent.dragOver(target)
      fireEvent.drop(target)

      expect(onStatusChange).toHaveBeenCalledWith('MOCK-0001', 'In Progress')
    })

    it('does not call onStatusChange when a card is dropped back on its own column', () => {
      const onStatusChange = vi.fn().mockResolvedValue(undefined)
      const stories = [makeStory({ code: 'MOCK-0001', title: 'Card to drag', status: 'Not Started' })]
      render(<PlannerBoard stories={stories} selectedCode={null} onSelect={vi.fn()} onStatusChange={onStatusChange} />)

      dragStart(screen.getByText('Card to drag').closest('button')!)
      const target = getColumnDropTarget('Not Started')
      fireEvent.dragOver(target)
      fireEvent.drop(target)

      expect(onStatusChange).not.toHaveBeenCalled()
    })

    it('does not accept a drop on the "Other" column — it has no real status to assign', () => {
      const onStatusChange = vi.fn().mockResolvedValue(undefined)
      const stories = [
        makeStory({ code: 'MOCK-0001', title: 'Card to drag', status: 'Not Started' }),
        makeStory({ code: 'MOCK-0002', title: 'Uncategorized card', status: 'Weird Custom Status' }),
      ]
      render(<PlannerBoard stories={stories} selectedCode={null} onSelect={vi.fn()} onStatusChange={onStatusChange} />)

      dragStart(screen.getByText('Card to drag').closest('button')!)
      const otherColumn = getColumnDropTarget('Other')
      fireEvent.dragOver(otherColumn)
      fireEvent.drop(otherColumn)

      expect(onStatusChange).not.toHaveBeenCalled()
    })

    // The actual data revert on failure is verified at the hook level
    // (useBacklogStories.test.ts) — this test only covers the error banner's
    // own behavior, since PlannerBoard's `stories` prop here is static and
    // wouldn't reflect a revert even if one happened.
    it('shows a dismissible inline error when the update fails', async () => {
      const user = userEvent.setup()
      const onStatusChange = vi.fn().mockRejectedValue(new Error('network down'))
      const stories = [makeStory({ code: 'MOCK-0001', title: 'Card to drag', status: 'Not Started' })]
      render(<PlannerBoard stories={stories} selectedCode={null} onSelect={vi.fn()} onStatusChange={onStatusChange} />)

      dragStart(screen.getByText('Card to drag').closest('button')!)
      const target = getColumnDropTarget('In Progress')
      fireEvent.dragOver(target)
      fireEvent.drop(target)

      expect(await screen.findByText(/Couldn't update status: network down/)).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Dismiss error' }))
      expect(screen.queryByText(/Couldn't update status/)).not.toBeInTheDocument()
    })

    it('lets a card from the "Other" column be dragged into a real status column', () => {
      const onStatusChange = vi.fn().mockResolvedValue(undefined)
      const stories = [makeStory({ code: 'MOCK-0002', title: 'Uncategorized card', status: 'Weird Custom Status' })]
      render(<PlannerBoard stories={stories} selectedCode={null} onSelect={vi.fn()} onStatusChange={onStatusChange} />)

      dragStart(screen.getByText('Uncategorized card').closest('button')!)
      const target = getColumnDropTarget('In Progress')
      fireEvent.dragOver(target)
      fireEvent.drop(target)

      expect(onStatusChange).toHaveBeenCalledWith('MOCK-0002', 'In Progress')
    })
  })
})
