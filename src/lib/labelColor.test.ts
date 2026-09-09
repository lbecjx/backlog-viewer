import { describe, expect, it } from 'vitest'
import { getLabelColorClasses } from './labelColor'

describe('getLabelColorClasses', () => {
  it('returns the same classes for the same label every time', () => {
    expect(getLabelColorClasses('export')).toBe(getLabelColorClasses('export'))
  })

  it('returns different classes for at least some different labels', () => {
    const labels = ['export', 'ui', 'auth', 'backend', 'security', 'performance', 'api', 'cache']
    const distinctColors = new Set(labels.map(getLabelColorClasses))
    expect(distinctColors.size).toBeGreaterThan(1)
  })

  it('always includes a dark: variant', () => {
    expect(getLabelColorClasses('anything')).toMatch(/dark:/)
  })
})
