import { describe, expect, it } from 'vitest'
import { calculateSafePartHeight, groupBlockHeights } from './pagination'

describe('groupBlockHeights', () => {
  it('groups blocks without cutting a block', () => {
    expect(groupBlockHeights([300, 400, 500, 100], 800)).toEqual([
      { start: 0, end: 2, height: 700 },
      { start: 2, end: 4, height: 600 },
    ])
  })

  it('treats explicit break blocks as separators without empty pages', () => {
    expect(groupBlockHeights([100, 200, 300], 1000, new Set([1]))).toEqual([
      { start: 0, end: 1, height: 100 },
      { start: 2, end: 3, height: 300 },
    ])
    expect(groupBlockHeights([100, 1, 1, 300], 1000, new Set([1, 2]))).toEqual([
      { start: 0, end: 1, height: 100 },
      { start: 3, end: 4, height: 300 },
    ])
    expect(groupBlockHeights([1], 1000, new Set([0]))).toEqual([])
  })

  it('keeps a single oversized block on its own page', () => {
    expect(groupBlockHeights([1200, 200], 800)).toEqual([
      { start: 0, end: 1, height: 1200 },
      { start: 1, end: 2, height: 200 },
    ])
  })
})

describe('calculateSafePartHeight', () => {
  it('accounts for pixel density and clamps tiny requests', () => {
    expect(calculateSafePartHeight(7000, 2)).toBe(4096)
    expect(calculateSafePartHeight(100, 3)).toBe(640)
  })
})
