const EXPORT_SCOPE = '#md2img-export-surface'

const prefixSelectors = (selectorList: string) =>
  selectorList
    .split(',')
    .map((selector) => {
      const trimmed = selector.trim()
      if (!trimmed) return ''
      if (trimmed.startsWith(EXPORT_SCOPE)) return trimmed
      if ([':root', 'html', 'body'].includes(trimmed)) return EXPORT_SCOPE
      return `${EXPORT_SCOPE} ${trimmed}`
    })
    .filter(Boolean)
    .join(', ')

const scopeCssBlock = (css: string): string => {
  let output = ''
  let cursor = 0

  while (cursor < css.length) {
    const open = css.indexOf('{', cursor)
    if (open === -1) {
      output += css.slice(cursor)
      break
    }

    const prelude = css.slice(cursor, open).trim()
    let depth = 1
    let index = open + 1
    let quote = ''

    for (; index < css.length && depth > 0; index += 1) {
      const character = css[index]
      const previous = css[index - 1]
      if (quote) {
        if (character === quote && previous !== '\\') quote = ''
        continue
      }
      if (character === '"' || character === "'") {
        quote = character
      } else if (character === '{') {
        depth += 1
      } else if (character === '}') {
        depth -= 1
      }
    }

    if (depth !== 0) return '/* Invalid custom CSS was ignored. */'

    const body = css.slice(open + 1, index - 1)
    const lowerPrelude = prelude.toLowerCase()
    if (
      lowerPrelude.startsWith('@media') ||
      lowerPrelude.startsWith('@supports') ||
      lowerPrelude.startsWith('@container') ||
      lowerPrelude.startsWith('@layer')
    ) {
      output += `${prelude}{${scopeCssBlock(body)}}`
    } else if (prelude.startsWith('@')) {
      output += `${prelude}{${body}}`
    } else {
      output += `${prefixSelectors(prelude)}{${body}}`
    }
    cursor = index
  }
  return output
}

export const scopeCustomCss = async (css: string) => {
  if (!css.trim()) return ''
  return scopeCssBlock(css)
}

export const sanitizeFilename = (filename: string, fallback = 'md2img') => {
  const sanitized = filename
    .trim()
    .replace(/[<>:"/\\|?*]/g, '-')
    .split('')
    .filter((character) => character.charCodeAt(0) > 31)
    .join('')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/-+\./g, '.')
    .replace(/^[.-]+|[.-]+$/g, '')
    .slice(0, 120)
  const safe = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(
    sanitized,
  )
    ? `_${sanitized}`
    : sanitized
  return safe || fallback
}
