import { describe, expect, it } from 'vitest'
import { sortStoriesNewestFirst } from './sortStories'

describe('sortStoriesNewestFirst', () => {
  it('orders by code descending — highest (newest) code first', () => {
    const stories = [{ code: 'NB-0001' }, { code: 'NB-0003' }, { code: 'NB-0002' }]
    expect(sortStoriesNewestFirst(stories).map((s) => s.code)).toEqual(['NB-0003', 'NB-0002', 'NB-0001'])
  })

  it('sorts correctly across the 4-digit boundary (not lexicographically past it)', () => {
    const stories = [{ code: 'NB-0099' }, { code: 'NB-0100' }, { code: 'NB-0009' }]
    expect(sortStoriesNewestFirst(stories).map((s) => s.code)).toEqual(['NB-0100', 'NB-0099', 'NB-0009'])
  })

  it('does not reorder stories that already share the same code prefix and are equal', () => {
    expect(sortStoriesNewestFirst([{ code: 'NB-0001' }])).toEqual([{ code: 'NB-0001' }])
  })

  it('handles an empty list', () => {
    expect(sortStoriesNewestFirst([])).toEqual([])
  })
})
