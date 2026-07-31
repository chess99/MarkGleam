import type { ExportConfig } from '../types'
import { calculateSafePartHeight, groupBlockHeights } from './pagination'

export type SplitPaginationConfig = Pick<
  ExportConfig,
  'scale' | 'splitHeight' | 'splitMode'
>

export interface SplitPageGroup {
  start: number
  end: number
  height: number
  /**
   * Logical CSS-pixel offset from the top edge of the export surface.
   * This deliberately excludes any visual scaling applied by an ancestor.
   */
  startTop: number
}

export interface OversizedSplitBlock {
  index: number
  height: number
}

export interface SplitPagePlan {
  /** Safe logical page height after accounting for export pixel density. */
  pageHeight: number
  /** Height available to top-level content blocks on each page. */
  contentBudget: number
  groups: SplitPageGroup[]
  oversizedBlocks: OversizedSplitBlock[]
}

interface LogicalBlockRect {
  top: number
  bottom: number
  height: number
}

const cssLength = (value: string | undefined) => {
  const parsed = Number.parseFloat(value ?? '')
  return Number.isFinite(parsed) ? parsed : 0
}

const positiveRatio = (visualSize: number, logicalSize: number) => {
  if (visualSize <= 0 || logicalSize <= 0) return undefined
  const ratio = visualSize / logicalSize
  return Number.isFinite(ratio) && ratio > 0 ? ratio : undefined
}

/**
 * getBoundingClientRect() includes transforms from ancestors. Derive the
 * effective vertical scale from the surface's transformed and layout sizes so
 * all pagination arithmetic remains in logical CSS pixels.
 */
const getLogicalScaleY = (
  surface: HTMLElement,
  surfaceRect: DOMRect,
) => {
  const scaleFromHeight = positiveRatio(
    surfaceRect.height,
    surface.offsetHeight || surface.clientHeight,
  )
  if (scaleFromHeight) return scaleFromHeight

  const scaleFromWidth = positiveRatio(
    surfaceRect.width,
    surface.offsetWidth || surface.clientWidth,
  )
  return scaleFromWidth ?? 1
}

const fallbackBlockTop = (
  content: HTMLElement,
  child: HTMLElement,
) => content.offsetTop + child.offsetTop

const getLogicalBlockRect = (
  surfaceRect: DOMRect,
  scaleY: number,
  content: HTMLElement,
  child: HTMLElement,
): LogicalBlockRect => {
  const rectangle = child.getBoundingClientRect()
  if (rectangle.height > 0) {
    const top = (rectangle.top - surfaceRect.top) / scaleY
    const height = rectangle.height / scaleY
    return { top, bottom: top + height, height }
  }

  const top = fallbackBlockTop(content, child)
  const height =
    child.offsetHeight || cssLength(getComputedStyle(child).height)
  return { top, bottom: top + height, height }
}

const getLogicalElementHeight = (
  element: HTMLElement | null,
  scaleY: number,
) => {
  if (!element) return 0
  const rectangle = element.getBoundingClientRect()
  if (rectangle.height > 0) return rectangle.height / scaleY
  return (
    element.offsetHeight ||
    cssLength(getComputedStyle(element).height)
  )
}

export const calculateSplitContentBudget = (
  safePartHeight: number,
  verticalPadding: number,
  signatureHeight: number,
  contentPaddingBottom = 0,
) =>
  Math.max(
    1,
    Math.floor(
      safePartHeight -
        verticalPadding -
        signatureHeight -
        contentPaddingBottom,
    ),
  )

export const getSplitPagePlan = (
  surface: HTMLElement,
  config: SplitPaginationConfig,
): SplitPagePlan => {
  const pageHeight = calculateSafePartHeight(
    config.splitHeight,
    config.scale,
  )
  const surfaceRect = surface.getBoundingClientRect()
  const scaleY = getLogicalScaleY(surface, surfaceRect)
  const surfaceStyle = getComputedStyle(surface)
  const verticalPadding =
    cssLength(surfaceStyle.paddingTop) +
    cssLength(surfaceStyle.paddingBottom)

  const content = surface.querySelector<HTMLElement>(
    '[data-export-content]',
  )
  const signature = surface.querySelector<HTMLElement>(
    '[data-export-signature]',
  )
  const contentPaddingBottom = content
    ? cssLength(getComputedStyle(content).paddingBottom)
    : 0
  const signatureStyle = signature
    ? getComputedStyle(signature)
    : undefined
  const signatureHeight =
    getLogicalElementHeight(signature, scaleY) +
    cssLength(signatureStyle?.marginTop) +
    cssLength(signatureStyle?.marginBottom)
  const contentBudget = calculateSplitContentBudget(
    pageHeight,
    verticalPadding,
    signatureHeight,
    contentPaddingBottom,
  )

  if (!content) {
    return {
      pageHeight,
      contentBudget,
      groups: [],
      oversizedBlocks: [],
    }
  }

  const children = [...content.children] as HTMLElement[]
  const rectangles = children.map((child) =>
    getLogicalBlockRect(surfaceRect, scaleY, content, child),
  )
  const heights = rectangles.map((rectangle) => rectangle.height)
  const gapsBefore = rectangles.map((rectangle, index) =>
    index === 0
      ? 0
      : Math.max(0, rectangle.top - rectangles[index - 1].bottom),
  )
  const forcedBreaks = new Set<number>()
  children.forEach((child, index) => {
    if (child.hasAttribute('data-page-break')) forcedBreaks.add(index)
  })

  const groups = groupBlockHeights(
    heights,
    contentBudget,
    forcedBreaks,
    gapsBefore,
  ).map((group) => ({
    ...group,
    startTop: rectangles[group.start]?.top ?? 0,
  }))
  const oversizedBlocks = heights.flatMap((height, index) =>
    !forcedBreaks.has(index) && height > contentBudget
      ? [{ index, height }]
      : [],
  )

  return {
    pageHeight,
    contentBudget,
    groups,
    oversizedBlocks,
  }
}
