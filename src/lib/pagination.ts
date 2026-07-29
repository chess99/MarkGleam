export interface PageGroup {
  start: number
  end: number
  height: number
}

const MIN_PREFERRED_BREAK_FILL = 0.72

export const groupBlockHeights = (
  heights: number[],
  maxHeight: number,
  preferredBreaks = new Set<number>(),
): PageGroup[] => {
  if (heights.length === 0) return []

  const groups: PageGroup[] = []
  let start = 0
  let height = 0
  let preferredBreak: number | undefined
  let heightAtPreferredBreak = 0

  heights.forEach((blockHeight, index) => {
    if (preferredBreaks.has(index)) {
      if (height >= maxHeight * MIN_PREFERRED_BREAK_FILL) {
        preferredBreak = index
        heightAtPreferredBreak = height
      }
      return
    }

    const measuredHeight = Math.max(1, blockHeight)
    const exceeds = height > 0 && height + measuredHeight > maxHeight

    if (exceeds) {
      if (
        preferredBreak !== undefined &&
        preferredBreak >= start &&
        heightAtPreferredBreak > 0
      ) {
        groups.push({
          start,
          end: preferredBreak,
          height: heightAtPreferredBreak,
        })
        start = preferredBreak + 1
        height -= heightAtPreferredBreak
      }

      if (height > 0 && height + measuredHeight > maxHeight) {
        groups.push({ start, end: index, height })
        start = index
        height = 0
      }

      preferredBreak = undefined
      heightAtPreferredBreak = 0
    }

    height += measuredHeight
  })

  if (heights.length > start && height > 0) {
    groups.push({ start, end: heights.length, height })
  }
  return groups
}

export const calculateSafePartHeight = (
  requestedHeight: number,
  scale: number,
  safePixelHeight = 8192,
) => Math.max(640, Math.min(requestedHeight, Math.floor(safePixelHeight / scale)))

export const calculatePageContentHeight = (
  surfaceWidth: number,
  verticalPadding: number,
  availablePageWidth: number,
  availablePageHeight: number,
) =>
  Math.max(
    1,
    surfaceWidth * (availablePageHeight / Math.max(1, availablePageWidth)) -
      verticalPadding,
  )
