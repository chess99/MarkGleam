const EXPORT_SCOPE =
  '[data-markgleam-export-surface] [data-export-content]'

const BLOCKED_SELECTOR_PATTERN =
  /(?:data-markgleam-export-surface|data-export-(?:content|signature))/i

const prefixSelectors = (selectorList: string) => {
  const selectors = selectorList
    .split(',')
    .map((selector) => selector.trim())
    .filter(Boolean)

  if (
    selectors.length === 0 ||
    selectors.some(
      (selector) =>
        /^[>+~&]/.test(selector) || BLOCKED_SELECTOR_PATTERN.test(selector),
    )
  ) {
    return ''
  }

  return selectors
    .map((selector) =>
      [':root', 'html', 'body'].includes(selector)
        ? EXPORT_SCOPE
        : `${EXPORT_SCOPE} ${selector}`,
    )
    .join(', ')
}

const scopeCssBlock = (css: string): string => {
  let output = ''
  let cursor = 0

  while (cursor < css.length) {
    const open = css.indexOf('{', cursor)
    if (open === -1) {
      const remainder = css.slice(cursor)
      output += remainder.trim().startsWith('@')
        ? '/* Unsupported custom CSS rule was ignored. */'
        : remainder
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
    } else if (
      lowerPrelude.startsWith('@font-face') ||
      lowerPrelude.startsWith('@keyframes') ||
      lowerPrelude.startsWith('@-webkit-keyframes') ||
      lowerPrelude.startsWith('@property')
    ) {
      output += `${prelude}{${body}}`
    } else if (prelude.startsWith('@')) {
      output += '/* Unsupported custom CSS rule was ignored. */'
    } else {
      const selectors = prefixSelectors(prelude)
      output += selectors
        ? `${selectors}{${body}}`
        : '/* Unsafe custom CSS selector was ignored. */'
    }
    cursor = index
  }
  return output
}

export const scopeCustomCss = async (css: string) => {
  if (!css.trim()) return ''
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const withoutExternalRules = withoutComments.replace(
    /@(charset|import|namespace)\b[^;{}]*;/gi,
    '',
  )
  return scopeCssBlock(withoutExternalRules)
}

export const sanitizeFilename = (filename: string, fallback = 'markgleam') => {
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
