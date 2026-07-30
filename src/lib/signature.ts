const relativeLuminance = (hex: string) => {
  const normalized = hex.trim().replace(/^#/, '')
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((character) => `${character}${character}`)
          .join('')
      : normalized.slice(0, 6)
  if (!/^[\da-f]{6}$/i.test(expanded)) return 1

  const channels = [0, 2, 4].map((offset) => {
    const channel = Number.parseInt(expanded.slice(offset, offset + 2), 16) / 255
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  })
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

const contrastRatio = (first: number, second: number) => {
  const lighter = Math.max(first, second)
  const darker = Math.min(first, second)
  return (lighter + 0.05) / (darker + 0.05)
}

export const getSignaturePalette = (
  backgroundColor: string,
  needsPanel: boolean,
) => {
  const backgroundLuminance = relativeLuminance(backgroundColor)
  const lightInk = '#f7f8f8'
  const darkInk = '#202326'
  const lightContrast = contrastRatio(
    backgroundLuminance,
    relativeLuminance(lightInk),
  )
  const darkContrast = contrastRatio(
    backgroundLuminance,
    relativeLuminance(darkInk),
  )
  const useLightInk = lightContrast > darkContrast
  // Near the black/white crossover, neither palette leaves enough headroom
  // for the softer signature tone. Give those backgrounds a local panel.
  const addPanel = needsPanel || Math.max(lightContrast, darkContrast) < 7

  return {
    ink: useLightInk ? lightInk : darkInk,
    muted: useLightInk ? '#e1e5e6' : '#34393d',
    border: useLightInk
      ? 'rgba(255, 255, 255, 0.42)'
      : 'rgba(20, 24, 28, 0.34)',
    accent: useLightInk ? '#ffffff' : '#171a1c',
    hasPanel: addPanel,
    panel: addPanel
      ? useLightInk
        ? 'rgba(15, 18, 20, 0.94)'
        : 'rgba(255, 255, 255, 0.94)'
      : 'transparent',
  }
}
