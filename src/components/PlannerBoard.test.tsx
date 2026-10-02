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
    resolution: undefined,
    note: undefined,
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

  it('strikes a resolved card and not an unresolved one (a surface that renders the card)', () => {
    // AC #5: the strikethrough follows the story's resolution on every surface
    // that renders a card. PlannerBoard is the Planner tab's surface.
    const stories = [
      makeStory({ code: 'MOCK-0001', title: 'Resolved story', status: 'Done', resolution: 'Done' }),
      makeStory({ code: 'MOCK-0002', title: 'Unresolved story', status: 'Done', resolution: undefined }),
    ]
    render(<PlannerBoard stories={stories} selectedCode={null} onSelect={vi.fn()} onStatusChange={vi.fn(async () => {})} />)
    expect(screen.getByText('Resolved story')).toHaveClass('line-through')
    expect(screen.getByText('Unresolved story')).not.toHaveClass('line-through')
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
    it('opens a note dialog on drop, and calls onStatusChange with no note when left blank', async () => {
      const user = userEvent.setup()
      const onStatusChange = vi.fn().mockResolvedValue(undefined)
      const stories = [makeStory({ code: 'MOCK-0001', title: 'Card to drag', status: 'Not Started' })]
      render(<PlannerBoard stories={stories} selectedCode={null} onSelect={vi.fn()} onStatusChange={onStatusChange} />)

      dragStart(screen.getByText('Card to drag').closest('[role="button"]')!)
      const target = getColumnDropTarget('In Progress')
      fireEvent.dragOver(target)
      fireEvent.drop(target)

      expect(onStatusChange).not.toHaveBeenCalled() // gated behind the dialog
      expect(screen.getByRole('dialog')).toHaveTextContent('Move to In Progress?')

      await user.click(screen.getByRole('button', { name: 'Move' }))

      expect(onStatusChange).toHaveBeenCalledWith('MOCK-0001', 'In Progress', undefined)
    })

    it('calls onStatusChange with the note when one is typed before confirming', async () => {
      const user = userEvent.setup()
      const onStatusChange = vi.fn().mockResolvedValue(undefined)
      const stories = [makeStory({ code: 'MOCK-0001', title: 'Card to drag', status: 'Not Started' })]
      render(<PlannerBoard stories={stories} selectedCode={null} onSelect={vi.fn()} onStatusChange={onStatusChange} />)

      dragStart(screen.getByText('Card to drag').closest('[role="button"]')!)
      const target = getColumnDropTarget('In Progress')
      fireEvent.dragOver(target)
      fireEvent.drop(target)

      await user.type(screen.getByLabelText('Note (optional)'), 'Picked this up today')
      await user.click(screen.getByRole('button', { name: 'Move' }))

      expect(onStatusChange).toHaveBeenCalledWith('MOCK-0001', 'In Progress', 'Picked this up today')
    })

    it('trims and collapses newlines in the note before sending it', async () => {
      const user = userEvent.setup()
      const onStatusChange = vi.fn().mockResolvedValue(undefined)
      const stories = [makeStory({ code: 'MOCK-0001', title: 'Card to drag', status: 'Not Started' })]
      render(<PlannerBoard stories={stories} selectedCode={null} onSelect={vi.fn()} onStatusChange={onStatusChange} />)

      dragStart(screen.getByText('Card to drag').closest('[role="button"]')!)
      const target = getColumnDropTarget('In Progress')
      fireEvent.dragOver(target)
      fireEvent.drop(target)

      await user.type(screen.getByLabelText('Note (optional)'), '  line one\nline two  ')
      await user.click(screen.getByRole('button', { name: 'Move' }))

      expect(onStatusChange).toHaveBeenCalledWith('MOCK-0001', 'In Progress', 'line one line two')
    })

    it('sends no note when the field is left whitespace-only', async () => {
      const user = userEvent.setup()
      const onStatusChange = vi.fn().mockResolvedValue(undefined)
      const stories = [makeStory({ code: 'MOCK-0001', title: 'Card to drag', status: 'Not Started' })]
      render(<PlannerBoard stories={stories} selectedCode={null} onSelect={vi.fn()} onStatusChange={onStatusChange} />)

      dragStart(screen.getByText('Card to drag').closest('[role="button"]')!)
      const target = getColumnDropTarget('In Progress')
      fireEvent.dragOver(target)
      fireEvent.drop(target)

      await user.type(screen.getByLabelText('Note (optional)'), '   ')
      await user.click(screen.getByRole('button', { name: 'Move' }))

      expect(onStatusChange).toHaveBeenCalledWith('MOCK-0001', 'In Progress', undefined)
    })

    // Reproduces a race found by adversarial review: cancelling a drop whose
    // confirm request is still in flight, then opening a SECOND drop before
    // the first request settles, must not let the stale first request close
    // the second dialog or wipe its note once it finally resolves.
    it('does not let a stale in-flight confirm close a later dialog or wipe its note', async () => {
      const user = userEvent.setup()
      let resolveFirst: (() => void) | undefined
      const onStatusChange = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveFirst = resolve
          }),
      )
      const stories = [
        makeStory({ code: 'MOCK-0001', title: 'First card', status: 'Not Started' }),
        makeStory({ code: 'MOCK-0002', title: 'Second card', status: 'Not Started' }),
      ]
      render(<PlannerBoard stories={stories} selectedCode={null} onSelect={vi.fn()} onStatusChange={onStatusChange} />)

      // Drop the first card and confirm — its request is now parked, pending.
      dragStart(screen.getByText('First card').closest('[role="button"]')!)
      fireEvent.dragOver(getColumnDropTarget('In Progress'))
      fireEvent.drop(getColumnDropTarget('In Progress'))
      await user.click(screen.getByRole('button', { name: 'Move' }))
      expect(onStatusChange).toHaveBeenCalledTimes(1)

      // Cancel it while the request is still in flight, then open a second
      // dialog for a different card and start typing a note.
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      dragStart(screen.getByText('Second card').closest('[role="button"]')!)
      fireEvent.dragOver(getColumnDropTarget('Done'))
      fireEvent.drop(getColumnDropTarget('Done'))
      expect(screen.getByRole('dialog')).toHaveTextContent('Move to Done?')
      await user.type(screen.getByLabelText('Note (optional)'), 'second note')

      // The first (cancelled) request finally settles.
      resolveFirst?.()
      await Promise.resolve()
      await Promise.resolve()

      // The second dialog must still be open, with its note intact, and
      // onStatusChange must not have been called a second time on its own.
      expect(onStatusChange).toHaveBeenCalledTimes(1)
      expect(screen.getByRole('dialog')).toHaveTextContent('Move to Done?')
      expect(screen.getByLabelText('Note (optional)')).toHaveValue('second note')

      // The second dialog's own Move button must still be usable — cancelling
      // the first one mid-flight must not have left it permanently disabled.
      expect(screen.getByRole('button', { name: 'Move' })).not.toBeDisabled()
    })

    // A second bug found reviewing the fix above: cancelling a dialog while
    // its own confirm request is still in flight must not leave the "in
    // flight" flag stuck true, which would permanently disable every later
    // dialog's Move button.
    it('does not leave the Move button disabled after cancelling mid-flight', async () => {
      const user = userEvent.setup()
      let resolveFirst: (() => void) | undefined
      const onStatusChange = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveFirst = resolve
          }),
      )
      const stories = [makeStory({ code: 'MOCK-0001', title: 'Card to drag', status: 'Not Started' })]
      render(<PlannerBoard stories={stories} selectedCode={null} onSelect={vi.fn()} onStatusChange={onStatusChange} />)

      dragStart(screen.getByText('Card to drag').closest('[role="button"]')!)
      fireEvent.dragOver(getColumnDropTarget('In Progress'))
      fireEvent.drop(getColumnDropTarget('In Progress'))
      await user.click(screen.getByRole('button', { name: 'Move' }))
      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      // Open a fresh dialog for the same card — its Move button must be
      // enabled even though the first request never settled.
      dragStart(screen.getByText('Card to drag').closest('[role="button"]')!)
      fireEvent.dragOver(getColumnDropTarget('Done'))
      fireEvent.drop(getColumnDropTarget('Done'))
      expect(screen.getByRole('button', { name: 'Move' })).not.toBeDisabled()

      resolveFirst?.() // let the abandoned first request settle, harmlessly
    })

    it('does not call onStatusChange when the note dialog is cancelled', async () => {
      const user = userEvent.setup()
      const onStatusChange = vi.fn().mockResolvedValue(undefined)
      const stories = [makeStory({ code: 'MOCK-0001', title: 'Card to drag', status: 'Not Started' })]
      render(<PlannerBoard stories={stories} selectedCode={null} onSelect={vi.fn()} onStatusChange={onStatusChange} />)

      dragStart(screen.getByText('Card to drag').closest('[role="button"]')!)
      const target = getColumnDropTarget('In Progress')
      fireEvent.dragOver(target)
      fireEvent.drop(target)

      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(onStatusChange).not.toHaveBeenCalled()
    })

    it('does not open a dialog when a card is dropped back on its own column', () => {
      const onStatusChange = vi.fn().mockResolvedValue(undefined)
      const stories = [makeStory({ code: 'MOCK-0001', title: 'Card to drag', status: 'Not Started' })]
      render(<PlannerBoard stories={stories} selectedCode={null} onSelect={vi.fn()} onStatusChange={onStatusChange} />)

      dragStart(screen.getByText('Card to drag').closest('[role="button"]')!)
      const target = getColumnDropTarget('Not Started')
      fireEvent.dragOver(target)
      fireEvent.drop(target)

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(onStatusChange).not.toHaveBeenCalled()
    })

    it('does not accept a drop on the "Other" column — it has no real status to assign', () => {
      const onStatusChange = vi.fn().mockResolvedValue(undefined)
      const stories = [
        makeStory({ code: 'MOCK-0001', title: 'Card to drag', status: 'Not Started' }),
        makeStory({ code: 'MOCK-0002', title: 'Uncategorized card', status: 'Weird Custom Status' }),
      ]
      render(<PlannerBoard stories={stories} selectedCode={null} onSelect={vi.fn()} onStatusChange={onStatusChange} />)

      dragStart(screen.getByText('Card to drag').closest('[role="button"]')!)
      const otherColumn = getColumnDropTarget('Other')
      fireEvent.dragOver(otherColumn)
      fireEvent.drop(otherColumn)

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
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

      dragStart(screen.getByText('Card to drag').closest('[role="button"]')!)
      const target = getColumnDropTarget('In Progress')
      fireEvent.dragOver(target)
      fireEvent.drop(target)
      await user.click(screen.getByRole('button', { name: 'Move' }))

      expect(await screen.findByText(/Couldn't update status: network down/)).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Dismiss error' }))
      expect(screen.queryByText(/Couldn't update status/)).not.toBeInTheDocument()
    })

    it('lets a card from the "Other" column be dragged into a real status column', async () => {
      const user = userEvent.setup()
      const onStatusChange = vi.fn().mockResolvedValue(undefined)
      const stories = [makeStory({ code: 'MOCK-0002', title: 'Uncategorized card', status: 'Weird Custom Status' })]
      render(<PlannerBoard stories={stories} selectedCode={null} onSelect={vi.fn()} onStatusChange={onStatusChange} />)

      dragStart(screen.getByText('Uncategorized card').closest('[role="button"]')!)
      const target = getColumnDropTarget('In Progress')
      fireEvent.dragOver(target)
      fireEvent.drop(target)
      await user.click(screen.getByRole('button', { name: 'Move' }))

      expect(onStatusChange).toHaveBeenCalledWith('MOCK-0002', 'In Progress', undefined)
    })
  })
})
