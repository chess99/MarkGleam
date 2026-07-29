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

  it('counts actual collapsed gaps only between blocks on the same page', () => {
    expect(
      groupBlockHeights(
        [300, 300, 300],
        650,
        new Set(),
        [0, 40, 40],
      ),
    ).toEqual([
      { start: 0, end: 2, height: 640 },
      { start: 2, end: 3, height: 300 },
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
