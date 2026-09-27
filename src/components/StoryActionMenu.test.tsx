import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { BacklogStory } from '../hooks/useBacklogStories'
import { StoryActionMenu } from './StoryActionMenu'

function makeStory(overrides: Partial<BacklogStory>): BacklogStory {
  return {
    code: 'MOCK-0001',
    title: 'A story',
    type: 'Story',
    priority: 'Medium',
    status: 'Not Started',
    resolution: undefined,
    labels: [],
    created: '2026-08-01',
    updated: '2026-08-01',
    body: '',
    progress: null,
    zone: 'backlog',
    ...overrides,
  }
}

describe('StoryActionMenu', () => {
  it('does not keep the confirmation dialog mounted before any action is opened', () => {
    // Regression guard for lazy-mounted dialogs: the menu's ConfirmDialog
    // must not be in the DOM while no action is open — a large board mounts
    // one menu per card, and one always-mounted dialog per card would bloat
    // the render tree (see the DIALOG_FADE_MS comment in StoryActionMenu).
    const story = makeStory({ zone: 'backlog' })
    render(<StoryActionMenu story={story} onMoveToZone={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('archive stories show a menu with only Unarchive action', async () => {
    const user = userEvent.setup()
    const story = makeStory({ zone: 'archive' })
    render(<StoryActionMenu story={story} onMoveToZone={vi.fn()} />)

    const menuButton = screen.getByRole('button', { name: 'Story actions' })
    expect(menuButton).toBeInTheDocument()
    await user.click(menuButton)

    // The only menu item should be Unarchive; Move to Planner and Archive (in menu) should not exist
    const allButtons = screen.getAllByRole('button')
    const moveButton = allButtons.find((b) => b.textContent === 'Move to Planner' && b.className.includes('text-left'))
    const archiveMenuItem = allButtons.find((b) => b.textContent === 'Archive' && b.className.includes('text-left'))
    const unarchiveMenuItem = allButtons.find((b) => b.textContent === 'Unarchive' && b.className.includes('text-left'))

    expect(moveButton).toBeUndefined()
    expect(archiveMenuItem).toBeUndefined()
    expect(unarchiveMenuItem).toBeDefined()
  })

  it('shows Move to Planner and Archive for backlog stories', async () => {
    const user = userEvent.setup()
    const story = makeStory({ zone: 'backlog' })
    render(<StoryActionMenu story={story} onMoveToZone={vi.fn()} />)

    const menuButton = screen.getByRole('button', { name: 'Story actions' })
    await user.click(menuButton)

    const allButtons = screen.getAllByRole('button')
    const moveButton = allButtons.find((b) => b.textContent === 'Move to Planner')
    const archiveButton = allButtons.find((b) => b.textContent === 'Archive' && b.className.includes('text-left'))

    expect(moveButton).toBeInTheDocument()
    expect(archiveButton).toBeInTheDocument()
    expect(screen.queryByText('Unarchive')).not.toBeInTheDocument()
  })

  it('shows only Archive for planner stories', async () => {
    const user = userEvent.setup()
    const story = makeStory({ zone: 'planner' })
    render(<StoryActionMenu story={story} onMoveToZone={vi.fn()} />)

    const menuButton = screen.getByRole('button', { name: 'Story actions' })
    await user.click(menuButton)

    const allButtons = screen.getAllByRole('button')
    const moveButton = allButtons.find((b) => b.textContent === 'Move to Planner')
    const archiveButton = allButtons.find((b) => b.textContent === 'Archive' && b.className.includes('text-left'))
    const unarchiveButton = allButtons.find((b) => b.textContent === 'Unarchive')

    expect(moveButton).toBeUndefined()
    expect(archiveButton).toBeDefined()
    expect(unarchiveButton).toBeUndefined()
  })

  it('calls onMoveToZone with planner when Move to Planner is confirmed', async () => {
    const user = userEvent.setup()
    const onMoveToZone = vi.fn().mockResolvedValue(undefined)
    const story = makeStory({ zone: 'backlog' })
    render(<StoryActionMenu story={story} onMoveToZone={onMoveToZone} />)

    const menuButton = screen.getByRole('button', { name: 'Story actions' })
    await user.click(menuButton)
    await user.click(screen.getByText('Move to Planner'))
    await user.click(screen.getByRole('button', { name: 'Move' }))

    expect(onMoveToZone).toHaveBeenCalledWith('planner')
  })

  it('calls onMoveToZone when Archive menu item is clicked and confirmed', async () => {
    const user = userEvent.setup()
    const onMoveToZone = vi.fn().mockResolvedValue(undefined)
    const story = makeStory({ zone: 'backlog' })
    render(<StoryActionMenu story={story} onMoveToZone={onMoveToZone} />)

    const menuButton = screen.getByRole('button', { name: 'Story actions' })
    await user.click(menuButton)

    // Find and click the Archive menu item (in the dropdown)
    const allButtons = screen.getAllByRole('button')
    const archiveMenuItem = allButtons.find((b) => b.textContent === 'Archive' && b.className.includes('text-left'))!
    await user.click(archiveMenuItem)

    // Opening the dialog closes the menu, so the only button now named
    // "Archive" is the confirmation dialog's (the verb vs the menu item).
    const confirmButton = screen.getByRole('button', { name: 'Archive' })
    await user.click(confirmButton)

    expect(onMoveToZone).toHaveBeenCalledWith('archive', 'Done', '')
  })

  it('offers Won\'t Do (not Cancelled/Postponed) as the non-Done resolution, matching the server contract', async () => {
    const user = userEvent.setup()
    const story = makeStory({ zone: 'backlog' })
    render(<StoryActionMenu story={story} onMoveToZone={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Story actions' }))
    const allButtons = screen.getAllByRole('button')
    const archiveMenuItem = allButtons.find((b) => b.textContent === 'Archive' && b.className.includes('text-left'))!
    await user.click(archiveMenuItem)

    expect(screen.getByRole('option', { name: "Won't Do" })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Cancelled' })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Postponed' })).not.toBeInTheDocument()
  })

  it('shows an inline error and keeps the dialog open when the action fails', async () => {
    const user = userEvent.setup()
    const onMoveToZone = vi.fn().mockRejectedValue(new Error('Network error'))
    const story = makeStory({ zone: 'backlog' })
    render(<StoryActionMenu story={story} onMoveToZone={onMoveToZone} />)

    await user.click(screen.getByRole('button', { name: 'Story actions' }))
    await user.click(screen.getByText('Move to Planner'))
    await user.click(screen.getByRole('button', { name: 'Move' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Network error')
    // The dialog is still open — the confirmation title is still visible.
    expect(screen.getByText('Move to Planner?')).toBeInTheDocument()
  })

  it('does not fire the action twice when confirm is clicked twice before the first call resolves', async () => {
    const user = userEvent.setup()
    let resolveCall: () => void = () => {}
    const onMoveToZone = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveCall = resolve
        }),
    )
    const story = makeStory({ zone: 'backlog' })
    render(<StoryActionMenu story={story} onMoveToZone={onMoveToZone} />)

    await user.click(screen.getByRole('button', { name: 'Story actions' }))
    await user.click(screen.getByText('Move to Planner'))
    const confirmButton = screen.getByRole('button', { name: 'Move' })
    await user.click(confirmButton)
    await user.click(confirmButton)

    expect(onMoveToZone).toHaveBeenCalledTimes(1)
    resolveCall()
  })

  it('an abandoned confirm resolving late does not force-close a dialog the human has since opened', async () => {
    const user = userEvent.setup()
    let resolveMove: () => void = () => {}
    const onMoveToZone = vi
      .fn()
      .mockImplementationOnce(() => new Promise<void>((resolve) => (resolveMove = resolve)))
      .mockResolvedValue(undefined)
    const story = makeStory({ zone: 'backlog' })
    render(<StoryActionMenu story={story} onMoveToZone={onMoveToZone} />)

    // Start Move, leave its call in flight, then back out via Escape.
    await user.click(screen.getByRole('button', { name: 'Story actions' }))
    await user.click(screen.getByText('Move to Planner'))
    await user.click(screen.getByRole('button', { name: 'Move' }))
    await user.keyboard('{Escape}')

    // Open a different dialog (Archive) while the old Move call is still pending.
    await user.click(screen.getByRole('button', { name: 'Story actions' }))
    const allButtons = screen.getAllByRole('button')
    const archiveMenuItem = allButtons.find((b) => b.textContent === 'Archive' && b.className.includes('text-left'))!
    await user.click(archiveMenuItem)
    expect(screen.getByText('Archive this story?')).toBeInTheDocument()

    // Its confirm button must be enabled, not stuck disabled by the
    // abandoned Move call's still-true `submitting` flag.
    const archiveConfirmButtons = screen.getAllByRole('button', { name: 'Archive' })
    const archiveConfirmButton = archiveConfirmButtons[archiveConfirmButtons.length - 1]
    expect(archiveConfirmButton).not.toBeDisabled()

    // Now let the abandoned Move call resolve — it must not touch the
    // Archive dialog that's open now.
    resolveMove()
    await Promise.resolve()
    await Promise.resolve()

    expect(screen.getByText('Archive this story?')).toBeInTheDocument()
  })

  it('an abandoned confirm rejecting late does not bleed its error into a dialog opened afterward', async () => {
    const user = userEvent.setup()
    let rejectMove: (err: Error) => void = () => {}
    const onMoveToZone = vi.fn().mockImplementationOnce(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectMove = reject
        }),
    )
    const story = makeStory({ zone: 'backlog' })
    render(<StoryActionMenu story={story} onMoveToZone={onMoveToZone} />)

    await user.click(screen.getByRole('button', { name: 'Story actions' }))
    await user.click(screen.getByText('Move to Planner'))
    await user.click(screen.getByRole('button', { name: 'Move' }))
    await user.keyboard('{Escape}')

    await user.click(screen.getByRole('button', { name: 'Story actions' }))
    const allButtons = screen.getAllByRole('button')
    const archiveMenuItem = allButtons.find((b) => b.textContent === 'Archive' && b.className.includes('text-left'))!
    await user.click(archiveMenuItem)

    rejectMove(new Error('stale move failure'))
    await Promise.resolve()
    await Promise.resolve()

    expect(screen.queryByText('stale move failure')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('does not show resolution picker for Done stories during archive', async () => {
    const user = userEvent.setup()
    const onMoveToZone = vi.fn().mockResolvedValue(undefined)
    const story = makeStory({ zone: 'backlog', status: 'Done' })
    render(<StoryActionMenu story={story} onMoveToZone={onMoveToZone} />)

    const menuButton = screen.getByRole('button', { name: 'Story actions' })
    await user.click(menuButton)

    // Find and click the Archive menu item
    const allButtons = screen.getAllByRole('button')
    const archiveMenuItem = allButtons.find((b) => b.textContent === 'Archive' && b.className.includes('text-left'))!
    await user.click(archiveMenuItem)

    // Resolution select should not be visible for Done stories
    expect(screen.queryByDisplayValue('Done')).not.toBeInTheDocument()

    // Find and click the Archive confirmation button
    const confirmButtons = screen.getAllByRole('button', { name: 'Archive' })
    await user.click(confirmButtons[confirmButtons.length - 1])

    expect(onMoveToZone).toHaveBeenCalledWith('archive', 'Done', '')
  })

  it('calls onMoveToZone with backlog when Unarchive is confirmed', async () => {
    const user = userEvent.setup()
    const onMoveToZone = vi.fn().mockResolvedValue(undefined)
    const story = makeStory({ zone: 'archive' })
    render(<StoryActionMenu story={story} onMoveToZone={onMoveToZone} />)

    await user.click(screen.getByRole('button', { name: 'Story actions' }))
    await user.click(screen.getByText('Unarchive'))
    await user.click(screen.getByRole('button', { name: 'Restore' }))

    expect(onMoveToZone).toHaveBeenCalledWith('backlog')
  })

  it('passes the chosen resolution when archiving a non-Done story', async () => {
    const user = userEvent.setup()
    const onMoveToZone = vi.fn().mockResolvedValue(undefined)
    const story = makeStory({ zone: 'backlog' }) // status "Not Started"
    render(<StoryActionMenu story={story} onMoveToZone={onMoveToZone} />)

    await user.click(screen.getByRole('button', { name: 'Story actions' }))
    const archiveMenuItem = screen
      .getAllByRole('button')
      .find((b) => b.textContent === 'Archive' && b.className.includes('text-left'))!
    await user.click(archiveMenuItem)

    await user.selectOptions(screen.getByRole('combobox'), "Won't Do")
    await user.click(screen.getByRole('button', { name: 'Archive' }))

    expect(onMoveToZone).toHaveBeenCalledWith('archive', "Won't Do", '')
  })
})
