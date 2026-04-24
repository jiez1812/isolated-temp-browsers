import { describe, it, expect } from 'vitest'
import { reorder } from '../src/renderer/src/utils/reorder'

describe('reorder()', () => {
  const list = ['A', 'B', 'C', 'D']

  it('moves first item to last', () => {
    expect(reorder(list, 'A', 'D')).toEqual(['B', 'C', 'D', 'A'])
  })

  it('moves last item to first', () => {
    expect(reorder(list, 'D', 'A')).toEqual(['D', 'A', 'B', 'C'])
  })

  it('swaps adjacent items forward', () => {
    expect(reorder(list, 'A', 'B')).toEqual(['B', 'A', 'C', 'D'])
  })

  it('swaps adjacent items backward', () => {
    expect(reorder(list, 'C', 'B')).toEqual(['A', 'C', 'B', 'D'])
  })

  it('moves middle item to last', () => {
    expect(reorder(list, 'B', 'D')).toEqual(['A', 'C', 'D', 'B'])
  })

  it('returns same reference when dragging to same position', () => {
    const result = reorder(list, 'B', 'B')
    expect(result).toBe(list)
  })

  it('returns same reference when fromId not found', () => {
    const result = reorder(list, 'X', 'A')
    expect(result).toBe(list)
  })

  it('returns same reference when toId not found', () => {
    const result = reorder(list, 'A', 'X')
    expect(result).toBe(list)
  })

  it('does not mutate the original list', () => {
    const original = ['A', 'B', 'C']
    reorder(original, 'A', 'C')
    expect(original).toEqual(['A', 'B', 'C'])
  })
})
