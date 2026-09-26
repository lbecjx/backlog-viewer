import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TabBar } from './TabBar'

describe('TabBar', () => {
  it('marks the active tab as selected', () => {
    render(<TabBar active="planner" onChange={vi.fn()} />)
    expect(screen.getByRole('tab', { name: 'Planner' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Backlog' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: 'Archive' })).toHaveAttribute('aria-selected', 'false')
  })

  it('calls onChange with the clicked tab\'s zone', async () => {
    const onChange = vi.fn()
    render(<TabBar active="backlog" onChange={onChange} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Archive' }))
    expect(onChange).toHaveBeenCalledWith('archive')
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('renders all three tabs regardless of which one is active', () => {
    render(<TabBar active="archive" onChange={vi.fn()} />)
    expect(screen.getAllByRole('tab')).toHaveLength(3)
  })

  it('only puts the active tab in the normal tab order (roving tabindex)', () => {
    render(<TabBar active="planner" onChange={vi.fn()} />)
    expect(screen.getByRole('tab', { name: 'Planner' })).toHaveAttribute('tabIndex', '0')
    expect(screen.getByRole('tab', { name: 'Backlog' })).toHaveAttribute('tabIndex', '-1')
    expect(screen.getByRole('tab', { name: 'Archive' })).toHaveAttribute('tabIndex', '-1')
  })

  it('links each tab to its panel via aria-controls/id', () => {
    render(<TabBar active="backlog" onChange={vi.fn()} />)
    const tab = screen.getByRole('tab', { name: 'Backlog' })
    expect(tab).toHaveAttribute('id', 'tab-backlog')
    expect(tab).toHaveAttribute('aria-controls', 'tabpanel-backlog')
  })

  it('ArrowRight moves to the next tab and focuses it', async () => {
    const onChange = vi.fn()
    render(<TabBar active="backlog" onChange={onChange} />)
    screen.getByRole('tab', { name: 'Backlog' }).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenCalledWith('planner')
    expect(screen.getByRole('tab', { name: 'Planner' })).toHaveFocus()
  })

  it('ArrowLeft from the first tab wraps around to the last', async () => {
    const onChange = vi.fn()
    render(<TabBar active="backlog" onChange={onChange} />)
    screen.getByRole('tab', { name: 'Backlog' }).focus()
    await userEvent.keyboard('{ArrowLeft}')
    expect(onChange).toHaveBeenCalledWith('archive')
    expect(screen.getByRole('tab', { name: 'Archive' })).toHaveFocus()
  })

  it('ArrowRight from the last tab wraps around to the first', async () => {
    const onChange = vi.fn()
    render(<TabBar active="archive" onChange={onChange} />)
    screen.getByRole('tab', { name: 'Archive' }).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenCalledWith('backlog')
    expect(screen.getByRole('tab', { name: 'Backlog' })).toHaveFocus()
  })

  it('Home jumps to the first tab, End jumps to the last', async () => {
    const onChange = vi.fn()
    render(<TabBar active="planner" onChange={onChange} />)
    screen.getByRole('tab', { name: 'Planner' }).focus()

    await userEvent.keyboard('{Home}')
    expect(onChange).toHaveBeenLastCalledWith('backlog')

    await userEvent.keyboard('{End}')
    expect(onChange).toHaveBeenLastCalledWith('archive')
  })
})
