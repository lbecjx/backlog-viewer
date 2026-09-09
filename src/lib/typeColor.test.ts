import { describe, expect, it } from 'vitest'
import { getTypeColorClasses, getTypeIcon } from './typeColor'
import { getLabelColorClasses } from './labelColor'

describe('getTypeColorClasses', () => {
  it('gives Bug and Story visibly distinct colors', () => {
    expect(getTypeColorClasses('Bug')).not.toBe(getTypeColorClasses('Story'))
  })

  it('falls back to the label hash palette for a non-standard type', () => {
    expect(getTypeColorClasses('Spike')).toBe(getLabelColorClasses('Spike'))
  })
})

describe('getTypeIcon', () => {
  it('has an icon for the 2 types actually used in this project (Story, Bug)', () => {
    expect(getTypeIcon('Story')).toBeTruthy()
    expect(getTypeIcon('Bug')).toBeTruthy()
  })

  it('returns undefined for an unrecognized type rather than a wrong guess', () => {
    expect(getTypeIcon('Spike')).toBeUndefined()
  })
})
