import { describe, expect, it } from 'vitest'
import { getStatusColorClasses } from './statusColor'

describe('getStatusColorClasses', () => {
  it('gives each of the 3 standard statuses a distinct color', () => {
    const colors = new Set([
      getStatusColorClasses('Not Started'),
      getStatusColorClasses('In Progress'),
      getStatusColorClasses('Done'),
    ])
    expect(colors.size).toBe(3)
  })

  it('gives a non-standard status a distinct "needs attention" color, not blank/gray', () => {
    const unknown = getStatusColorClasses('Bloqueado por vendor')
    expect(unknown).not.toBe(getStatusColorClasses('Not Started'))
    expect(unknown).toMatch(/amber/)
  })
})
