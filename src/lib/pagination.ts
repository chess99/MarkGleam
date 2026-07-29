export interface PageGroup {
  start: number
  end: number
  height: number
}

export const groupBlockHeights = (
  heights: number[],
  maxHeight: number,
  forcedBreaks = new Set<number>(),
): PageGroup[] => {
  if (heights.length === 0) return []

  const groups: PageGroup[] = []
  let start = 0
  let height = 0

  heights.forEach((blockHeight, index) => {
    if (forcedBreaks.has(index)) {
      if (index > start && height > 0) {
        groups.push({ start, end: index, height })
      }
      start = index + 1
      height = 0
      return
    }

    const measuredHeight = Math.max(1, blockHeight)
    const exceeds = height > 0 && height + measuredHeight > maxHeight

    if (exceeds && index > start) {
      groups.push({ start, end: index, height })
      start = index
      height = 0
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
