import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import { useBacklogStories } from './hooks/useBacklogStories'

// The hook owns fetching; this test only cares about how App renders its
// returned `actionError`/`clearActionError`, so the hook is mocked — driving a
// real fetch failure through App would test the hook, not the banner.
vi.mock('./hooks/useBacklogStories')

function mockHook(overrides: {
  actionError: string | null
  clearActionError?: () => void
  projectName?: string | null
}) {
  vi.mocked(useBacklogStories).mockReturnValue({
    stories: [],
    loading: false,
    error: null,
    projectName: overrides.projectName ?? null,
    updateStoryStatus: vi.fn(),
    moveStoryToZone: vi.fn(),
    actionError: overrides.actionError,
    clearActionError: overrides.clearActionError ?? vi.fn(),
  })
}

describe('App', () => {
  it('shows the action-error banner with the failure message, dismissible via clearActionError', async () => {
    const clearActionError = vi.fn()
    mockHook({ actionError: 'board failed', clearActionError })

    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByText(/Couldn't update the story: board failed/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Dismiss error' }))
    expect(clearActionError).toHaveBeenCalledOnce()
  })

  it('renders no banner when there is no action error', () => {
    mockHook({ actionError: null })
    render(<App />)
    expect(screen.queryByRole('button', { name: 'Dismiss error' })).not.toBeInTheDocument()
  })

  describe('header project name', () => {
    it('shows the project name when present', () => {
      mockHook({ actionError: null, projectName: 'backlog-viewer' })
      render(<App />)
      expect(screen.getByText('backlog-viewer')).toBeInTheDocument()
    })

    it('shows nothing extra when the project name is null (missing/unreachable project.json)', () => {
      mockHook({ actionError: null, projectName: null })
      render(<App />)
      // The brand mark and tabs still render; just no extra name text.
      expect(screen.getByText('Backlog Viewer')).toBeInTheDocument()
      expect(screen.queryByTitle(/.+/)).not.toBeInTheDocument()
    })

    it('does not break rendering with a very long project name', () => {
      const longName = 'a'.repeat(200)
      mockHook({ actionError: null, projectName: longName })
      render(<App />)
      expect(screen.getByText(longName)).toBeInTheDocument()
    })
  })
})
