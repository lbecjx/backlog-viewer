import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog'

describe('ConfirmDialog', () => {
  it('renders title, message, confirm and cancel buttons when open', () => {
    render(
      <ConfirmDialog
        open
        title="Delete item?"
        message="This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByText('Delete item?')).toBeInTheDocument()
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('disables interaction when open=false (but stays in DOM)', () => {
    const { rerender, container } = render(
      <ConfirmDialog
        open
        title="Confirm"
        message="Sure?"
        confirmLabel="Yes"
        cancelLabel="No"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    const dialogWhenOpen = container.querySelector('[role="dialog"]')!
    expect(dialogWhenOpen).toHaveClass('opacity-100')

    rerender(
      <ConfirmDialog
        open={false}
        title="Confirm"
        message="Sure?"
        confirmLabel="Yes"
        cancelLabel="No"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    const dialogWhenClosed = container.querySelector('[role="dialog"]')!
    expect(dialogWhenClosed).toHaveClass('pointer-events-none')
  })

  it('calls onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog
        open
        title="Confirm"
        message="Sure?"
        confirmLabel="Yes"
        cancelLabel="No"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Yes' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(
      <ConfirmDialog
        open
        title="Confirm"
        message="Sure?"
        confirmLabel="Yes"
        cancelLabel="No"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'No' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('calls onCancel when Escape key is pressed', () => {
    const onCancel = vi.fn()
    render(
      <ConfirmDialog
        open
        title="Confirm"
        message="Sure?"
        confirmLabel="Yes"
        cancelLabel="No"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('calls onCancel when scrim is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const { container } = render(
      <ConfirmDialog
        open
        title="Confirm"
        message="Sure?"
        confirmLabel="Yes"
        cancelLabel="No"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    )
    const scrim = container.querySelector('[aria-hidden="true"]')!
    await user.click(scrim)
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('renders children in the message area', () => {
    render(
      <ConfirmDialog
        open
        title="Archive"
        message="Set resolution:"
        confirmLabel="Archive"
        cancelLabel="Cancel"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      >
        <select>
          <option>Done</option>
          <option>Cancelled</option>
        </select>
      </ConfirmDialog>,
    )
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('does not respond to Escape when not open', () => {
    const onCancel = vi.fn()
    render(
      <ConfirmDialog
        open={false}
        title="Confirm"
        message="Sure?"
        confirmLabel="Yes"
        cancelLabel="No"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onCancel).not.toHaveBeenCalled()
  })
})
