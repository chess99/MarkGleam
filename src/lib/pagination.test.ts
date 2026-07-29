import { describe, expect, it } from 'vitest'
import {
  calculatePageContentHeight,
  calculateSafePartHeight,
  groupBlockHeights,
} from './pagination'

describe('groupBlockHeights', () => {
  it('groups blocks without cutting a block', () => {
    expect(groupBlockHeights([300, 400, 500, 100], 800)).toEqual([
      { start: 0, end: 2, height: 700 },
      { start: 2, end: 4, height: 600 },
    ])
  })

  it('keeps short sections separated by break hints on the same page', () => {
    expect(groupBlockHeights([100, 200, 300], 1000, new Set([1]))).toEqual([
      { start: 0, end: 3, height: 400 },
    ])
    expect(groupBlockHeights([100, 1, 1, 300], 1000, new Set([1, 2]))).toEqual([
      { start: 0, end: 4, height: 400 },
    ])
    expect(groupBlockHeights([1], 1000, new Set([0]))).toEqual([])
  })

  it('prefers a break hint near the bottom when a page overflows', () => {
    expect(groupBlockHeights([600, 1, 100, 200], 800, new Set([1]))).toEqual([
      { start: 0, end: 1, height: 600 },
      { start: 2, end: 4, height: 300 },
    ])
  })

  it('ignores an early break hint that would leave most of a page empty', () => {
    expect(groupBlockHeights([300, 1, 400, 200], 800, new Set([1]))).toEqual([
      { start: 0, end: 3, height: 700 },
      { start: 3, end: 4, height: 200 },
    ])
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

describe('calculatePageContentHeight', () => {
  it('uses the actual printable page ratio and removes canvas padding', () => {
    expect(calculatePageContentHeight(1080, 144, 186, 273)).toBeCloseTo(
      1441.16,
      1,
    )
  })
})
