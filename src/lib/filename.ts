import { sanitizeFilename } from './css'

const stripFrontmatter = (markdown: string) =>
  markdown.replace(/^\s*---\s*\r?\n[\s\S]*?\r?\n---\s*(?:\r?\n|$)/, '')

const toPlainText = (markdown: string) =>
  markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^\s{0,3}(?:#{1,6}|>|[-+*]\s+|\d+[.)]\s+)/gm, '')
    .replace(/[*_~`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

export const suggestFilename = (markdown: string, fallback = 'md2img') => {
  const content = stripFrontmatter(markdown).trimStart()
  const firstLine = content.split(/\r?\n/, 1)[0]?.trim() ?? ''
  const heading = firstLine.match(/^#\s+(.+?)(?:\s+#+)?$/)?.[1]
  const source = heading || toPlainText(content)
  const shortened = [...source].slice(0, 48).join('')
  return sanitizeFilename(shortened, fallback)
}
