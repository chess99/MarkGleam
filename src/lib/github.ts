const GITHUB_API_HOST = 'api.github.com'
const GITHUB_WEB_HOST = 'github.com'
const GITHUB_RAW_HOST = 'raw.githubusercontent.com'

export const DEFAULT_GITHUB_README_TIMEOUT_MS = 12_000
export const DEFAULT_GITHUB_README_MAX_BYTES = 2 * 1024 * 1024

export type GitHubReadmeErrorCode =
  | 'invalid-url'
  | 'unsupported-url'
  | 'not-found'
  | 'rate-limited'
  | 'forbidden'
  | 'too-large'
  | 'timeout'
  | 'network'
  | 'invalid-response'
  | 'http-error'

export class GitHubReadmeImportError extends Error {
  readonly code: GitHubReadmeErrorCode
  readonly status?: number
  readonly retryAt?: Date

  constructor(
    code: GitHubReadmeErrorCode,
    message: string,
    options: { status?: number; retryAt?: Date; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause })
    this.name = 'GitHubReadmeImportError'
    this.code = code
    this.status = options.status
    this.retryAt = options.retryAt
  }
}

export interface GitHubSourceContext {
  owner: string
  repo: string
  ref: string
  path: string
  repositoryUrl: string
  sourceUrl: string
  rawBaseUrl: string
  htmlBaseUrl: string
}

export interface GitHubReadmeImportResult {
  markdown: string
  originalMarkdown: string
  sourceContext: GitHubSourceContext
}

export interface ImportGitHubReadmeOptions {
  signal?: AbortSignal
  timeoutMs?: number
  maxBytes?: number
  fetch?: typeof globalThis.fetch
}

type GitHubTarget =
  | { kind: 'repository'; owner: string; repo: string }
  | {
      kind: 'file'
      owner: string
      repo: string
      ref: string
      path: string
      rawUrl: string
      htmlUrl: string
    }

interface GitHubReadmeApiResponse {
  content?: string
  encoding?: string
  download_url?: string | null
  html_url?: string
  path?: string
  size?: number
}

const normalizeRepo = (repo: string) => repo.replace(/\.git$/i, '')

const cleanSegments = (pathname: string) =>
  pathname
    .split('/')
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment))

const assertRepositoryParts = (owner?: string, repo?: string) => {
  if (!owner || !repo || owner === '.' || owner === '..' || repo === '.' || repo === '..') {
    throw new GitHubReadmeImportError(
      'unsupported-url',
      'GitHub URL must include a repository owner and name.',
    )
  }
}

const encodePath = (value: string) =>
  value
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')

const createFileTarget = (
  owner: string,
  repo: string,
  ref: string,
  path: string,
): GitHubTarget => {
  assertRepositoryParts(owner, repo)
  if (!ref || !path) {
    throw new GitHubReadmeImportError(
      'unsupported-url',
      'GitHub file URLs must include a ref and Markdown file path.',
    )
  }

  const encodedOwner = encodeURIComponent(owner)
  const encodedRepo = encodeURIComponent(normalizeRepo(repo))
  const encodedRef = encodeURIComponent(ref)
  const encodedPath = encodePath(path)
  return {
    kind: 'file',
    owner,
    repo: normalizeRepo(repo),
    ref,
    path,
    rawUrl: `https://${GITHUB_RAW_HOST}/${encodedOwner}/${encodedRepo}/${encodedRef}/${encodedPath}`,
    htmlUrl: `https://${GITHUB_WEB_HOST}/${encodedOwner}/${encodedRepo}/blob/${encodedRef}/${encodedPath}`,
  }
}

/**
 * Parse public github.com repository, blob/raw file and raw.githubusercontent.com
 * URLs. A ref containing a slash is inherently ambiguous in a raw URL; like
 * GitHub itself, this parser treats the first path segment as the ref.
 */
export const parseGitHubReadmeUrl = (input: string): GitHubTarget => {
  let url: URL
  try {
    url = new URL(input.trim())
  } catch (error) {
    throw new GitHubReadmeImportError('invalid-url', 'Enter a valid GitHub URL.', {
      cause: error,
    })
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new GitHubReadmeImportError(
      'unsupported-url',
      'Only public HTTP(S) GitHub URLs are supported.',
    )
  }

  const host = url.hostname.toLowerCase()
  const segments = cleanSegments(url.pathname)

  if (host === GITHUB_RAW_HOST) {
    const [owner, repo, ref, ...pathParts] = segments
    return createFileTarget(owner, repo, ref, pathParts.join('/'))
  }

  if (host !== GITHUB_WEB_HOST && host !== `www.${GITHUB_WEB_HOST}`) {
    throw new GitHubReadmeImportError(
      'unsupported-url',
      'Only public github.com and raw.githubusercontent.com URLs are supported.',
    )
  }

  const [owner, rawRepo, action, ref, ...pathParts] = segments
  const repo = normalizeRepo(rawRepo ?? '')
  assertRepositoryParts(owner, repo)

  if (!action) return { kind: 'repository', owner, repo }
  if ((action === 'blob' || action === 'raw') && ref && pathParts.length > 0) {
    return createFileTarget(owner, repo, ref, pathParts.join('/'))
  }

  throw new GitHubReadmeImportError(
    'unsupported-url',
    'Use a GitHub repository URL or a direct README blob/raw URL.',
  )
}

const parseRetryAt = (response: Response) => {
  const reset = Number(response.headers.get('x-ratelimit-reset'))
  if (Number.isFinite(reset) && reset > 0) return new Date(reset * 1000)

  const retryAfter = Number(response.headers.get('retry-after'))
  if (Number.isFinite(retryAfter) && retryAfter >= 0) {
    return new Date(Date.now() + retryAfter * 1000)
  }
  return undefined
}

const throwForResponse = (response: Response) => {
  if (response.ok) return
  const status = response.status
  if (status === 404) {
    throw new GitHubReadmeImportError(
      'not-found',
      'The public repository or README could not be found.',
      { status },
    )
  }

  const exhausted = response.headers.get('x-ratelimit-remaining') === '0'
  if (status === 429 || (status === 403 && exhausted)) {
    throw new GitHubReadmeImportError(
      'rate-limited',
      'GitHub request limit reached. Try again later or upload the Markdown file.',
      { status, retryAt: parseRetryAt(response) },
    )
  }

  if (status === 401 || status === 403) {
    throw new GitHubReadmeImportError(
      'forbidden',
      'GitHub refused this request. Only public repositories are supported.',
      { status },
    )
  }

  if (status === 413) {
    throw new GitHubReadmeImportError('too-large', 'The README is too large to import.', {
      status,
    })
  }

  throw new GitHubReadmeImportError(
    'http-error',
    `GitHub returned HTTP ${status}.`,
    { status },
  )
}

const assertContentLength = (response: Response, maxBytes: number) => {
  const contentLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new GitHubReadmeImportError(
      'too-large',
      `The README exceeds the ${maxBytes} byte import limit.`,
      { status: response.status },
    )
  }
}

const readLimitedBytes = async (response: Response, maxBytes: number) => {
  assertContentLength(response, maxBytes)
  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (bytes.byteLength > maxBytes) {
      throw new GitHubReadmeImportError(
        'too-large',
        `The README exceeds the ${maxBytes} byte import limit.`,
      )
    }
    return bytes
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > maxBytes) {
        await reader.cancel()
        throw new GitHubReadmeImportError(
          'too-large',
          `The README exceeds the ${maxBytes} byte import limit.`,
        )
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  const bytes = new Uint8Array(total)
  let offset = 0
  chunks.forEach((chunk) => {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  })
  return bytes
}

const decodeBase64Utf8 = (content: string) => {
  try {
    const binary = atob(content.replace(/\s/g, ''))
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch (error) {
    throw new GitHubReadmeImportError(
      'invalid-response',
      'GitHub returned an unreadable README.',
      { cause: error },
    )
  }
}

const directoryUrl = (url: string) => new URL('./', url).toString()

const createSourceContext = (target: Extract<GitHubTarget, { kind: 'file' }>) => ({
  owner: target.owner,
  repo: target.repo,
  ref: target.ref,
  path: target.path,
  repositoryUrl: `https://${GITHUB_WEB_HOST}/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}`,
  sourceUrl: target.rawUrl,
  rawBaseUrl: directoryUrl(target.rawUrl),
  htmlBaseUrl: directoryUrl(target.htmlUrl),
}) satisfies GitHubSourceContext

const isRelativeDestination = (destination: string) => {
  const value = destination.trim()
  if (!value || value.startsWith('#') || value.startsWith('/') || value.startsWith('//')) {
    return false
  }
  return !/^[a-z][a-z\d+.-]*:/i.test(value)
}

const resolveDestination = (
  destination: string,
  context: GitHubSourceContext,
  image: boolean,
) => {
  if (!isRelativeDestination(destination)) return destination
  try {
    return new URL(
      destination,
      image ? context.rawBaseUrl : context.htmlBaseUrl,
    ).toString()
  } catch {
    return destination
  }
}

const findClosingBracket = (source: string, start: number) => {
  let depth = 0
  for (let index = start; index < source.length; index += 1) {
    if (source[index] === '\\') {
      index += 1
      continue
    }
    if (source[index] === '[') depth += 1
    if (source[index] === ']') {
      depth -= 1
      if (depth === 0) return index
    }
  }
  return -1
}

const findClosingParen = (source: string, start: number) => {
  let depth = 0
  let angle = false
  let quote = ''
  for (let index = start; index < source.length; index += 1) {
    const character = source[index]
    if (character === '\\') {
      index += 1
      continue
    }
    if (quote) {
      if (character === quote) quote = ''
      continue
    }
    if (character === '<') angle = true
    else if (character === '>') angle = false
    else if (!angle && (character === '"' || character === "'")) quote = character
    else if (!angle && character === '(') depth += 1
    else if (!angle && character === ')') {
      depth -= 1
      if (depth === 0) return index
    }
  }
  return -1
}

const rewriteInlineDestination = (
  inside: string,
  context: GitHubSourceContext,
  image: boolean,
) => {
  const leading = inside.match(/^\s*/)?.[0] ?? ''
  const rest = inside.slice(leading.length)
  if (!rest) return inside

  if (rest.startsWith('<')) {
    const closing = rest.indexOf('>')
    if (closing < 0) return inside
    const destination = rest.slice(1, closing)
    return `${leading}<${resolveDestination(destination, context, image)}>${rest.slice(closing + 1)}`
  }

  let end = 0
  let nested = 0
  for (; end < rest.length; end += 1) {
    const character = rest[end]
    if (character === '\\') {
      end += 1
      continue
    }
    if (character === '(') nested += 1
    else if (character === ')' && nested > 0) nested -= 1
    else if (/\s/.test(character) && nested === 0) break
  }
  const destination = rest.slice(0, end)
  return `${leading}${resolveDestination(destination, context, image)}${rest.slice(end)}`
}

const collectImageReferenceLabels = (markdown: string) => {
  const labels = new Set<string>()
  const pattern = /!\[([^\]]*)\](?:\[([^\]]*)\])?/g
  for (const match of markdown.matchAll(pattern)) {
    labels.add((match[2] || match[1]).trim().toLowerCase())
  }
  return labels
}

/** Rewrite relative inline and reference-style Markdown destinations. */
export const rewriteGitHubMarkdownLinks = (
  markdown: string,
  context: GitHubSourceContext,
) => {
  const imageReferences = collectImageReferenceLabels(markdown)
  const lines = markdown.split(/(\r?\n)/)
  let fenced = false
  let fenceMarker = ''

  return lines
    .map((line) => {
      if (/^\r?\n$/.test(line)) return line
      const fence = line.match(/^\s{0,3}(`{3,}|~{3,})/)
      if (fence) {
        if (!fenced) {
          fenced = true
          fenceMarker = fence[1][0]
        } else if (fence[1][0] === fenceMarker) {
          fenced = false
          fenceMarker = ''
        }
        return line
      }
      if (fenced) return line

      const definition = line.match(/^(\s{0,3}\[([^\]]+)\]:\s*)(<[^>]+>|\S+)(.*)$/)
      if (definition) {
        const wrapped = definition[3].startsWith('<') && definition[3].endsWith('>')
        const destination = wrapped ? definition[3].slice(1, -1) : definition[3]
        const resolved = resolveDestination(
          destination,
          context,
          imageReferences.has(definition[2].trim().toLowerCase()),
        )
        return `${definition[1]}${wrapped ? `<${resolved}>` : resolved}${definition[4]}`
      }

      let output = ''
      let cursor = 0
      let codeTicks = 0
      while (cursor < line.length) {
        if (line[cursor] === '`') {
          let count = 1
          while (line[cursor + count] === '`') count += 1
          if (codeTicks === 0) codeTicks = count
          else if (codeTicks === count) codeTicks = 0
          output += line.slice(cursor, cursor + count)
          cursor += count
          continue
        }

        const image = line[cursor] === '!' && line[cursor + 1] === '['
        const link = line[cursor] === '['
        if (codeTicks > 0 || (!image && !link)) {
          output += line[cursor]
          cursor += 1
          continue
        }

        const bracketStart = cursor + (image ? 1 : 0)
        const bracketEnd = findClosingBracket(line, bracketStart)
        if (bracketEnd < 0 || line[bracketEnd + 1] !== '(') {
          output += line[cursor]
          cursor += 1
          continue
        }
        const parenEnd = findClosingParen(line, bracketEnd + 1)
        if (parenEnd < 0) {
          output += line[cursor]
          cursor += 1
          continue
        }

        const prefix = line.slice(cursor, bracketEnd + 2)
        const inside = line.slice(bracketEnd + 2, parenEnd)
        output += `${prefix}${rewriteInlineDestination(inside, context, image)})`
        cursor = parenEnd + 1
      }
      return output
    })
    .join('')
}

const withRequestSignal = (
  externalSignal: AbortSignal | undefined,
  timeoutMs: number,
) => {
  const controller = new AbortController()
  let timedOut = false
  const abortFromExternal = () => controller.abort(externalSignal?.reason)
  if (externalSignal?.aborted) abortFromExternal()
  else externalSignal?.addEventListener('abort', abortFromExternal, { once: true })

  const timeout = window.setTimeout(() => {
    timedOut = true
    controller.abort(new DOMException('GitHub request timed out', 'TimeoutError'))
  }, timeoutMs)

  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    cleanup: () => {
      window.clearTimeout(timeout)
      externalSignal?.removeEventListener('abort', abortFromExternal)
    },
  }
}

const fetchResponse = async (
  fetcher: typeof globalThis.fetch,
  url: string,
  signal: AbortSignal,
  headers?: HeadersInit,
) => {
  try {
    return await fetcher(url, { signal, headers, cache: 'no-store' })
  } catch (error) {
    if (signal.aborted) throw error
    throw new GitHubReadmeImportError(
      'network',
      'Could not connect to GitHub. Check the network and try again.',
      { cause: error },
    )
  }
}

const fetchRepositoryReadme = async (
  target: Extract<GitHubTarget, { kind: 'repository' }>,
  fetcher: typeof globalThis.fetch,
  signal: AbortSignal,
  maxBytes: number,
) => {
  const apiUrl = `https://${GITHUB_API_HOST}/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}/readme`
  const response = await fetchResponse(fetcher, apiUrl, signal, {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  })
  throwForResponse(response)
  assertContentLength(response, Math.max(maxBytes * 2, maxBytes + 64 * 1024))

  let payload: GitHubReadmeApiResponse
  try {
    payload = (await response.json()) as GitHubReadmeApiResponse
  } catch (error) {
    throw new GitHubReadmeImportError(
      'invalid-response',
      'GitHub returned invalid README metadata.',
      { cause: error },
    )
  }

  if (typeof payload.size === 'number' && payload.size > maxBytes) {
    throw new GitHubReadmeImportError(
      'too-large',
      `The README exceeds the ${maxBytes} byte import limit.`,
    )
  }
  if (!payload.download_url || !payload.html_url || !payload.path) {
    throw new GitHubReadmeImportError(
      'invalid-response',
      'GitHub did not provide a readable public README URL.',
    )
  }

  const fileTarget = parseGitHubReadmeUrl(payload.download_url)
  if (fileTarget.kind !== 'file') {
    throw new GitHubReadmeImportError(
      'invalid-response',
      'GitHub returned an invalid README download URL.',
    )
  }
  fileTarget.htmlUrl = payload.html_url

  if (payload.encoding === 'base64' && typeof payload.content === 'string') {
    const markdown = decodeBase64Utf8(payload.content)
    if (new TextEncoder().encode(markdown).byteLength > maxBytes) {
      throw new GitHubReadmeImportError('too-large', 'The README is too large to import.')
    }
    return { markdown, target: fileTarget }
  }

  const rawResponse = await fetchResponse(fetcher, fileTarget.rawUrl, signal)
  throwForResponse(rawResponse)
  const bytes = await readLimitedBytes(rawResponse, maxBytes)
  return { markdown: new TextDecoder().decode(bytes), target: fileTarget }
}

export const importGitHubReadme = async (
  input: string,
  options: ImportGitHubReadmeOptions = {},
): Promise<GitHubReadmeImportResult> => {
  const target = parseGitHubReadmeUrl(input)
  const timeoutMs = options.timeoutMs ?? DEFAULT_GITHUB_README_TIMEOUT_MS
  const maxBytes = options.maxBytes ?? DEFAULT_GITHUB_README_MAX_BYTES
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new RangeError('timeoutMs must be greater than zero')
  }
  if (!Number.isFinite(maxBytes) || maxBytes <= 0) {
    throw new RangeError('maxBytes must be greater than zero')
  }

  const fetcher = options.fetch ?? globalThis.fetch
  const request = withRequestSignal(options.signal, timeoutMs)
  try {
    let markdown: string
    let fileTarget: Extract<GitHubTarget, { kind: 'file' }>
    if (target.kind === 'repository') {
      const imported = await fetchRepositoryReadme(
        target,
        fetcher,
        request.signal,
        maxBytes,
      )
      markdown = imported.markdown
      fileTarget = imported.target
    } else {
      const response = await fetchResponse(fetcher, target.rawUrl, request.signal)
      throwForResponse(response)
      markdown = new TextDecoder().decode(await readLimitedBytes(response, maxBytes))
      fileTarget = target
    }

    const sourceContext = createSourceContext(fileTarget)
    return {
      originalMarkdown: markdown,
      markdown: rewriteGitHubMarkdownLinks(markdown, sourceContext),
      sourceContext,
    }
  } catch (error) {
    if (request.timedOut()) {
      throw new GitHubReadmeImportError(
        'timeout',
        'GitHub took too long to respond. Try again or upload the Markdown file.',
        { cause: error },
      )
    }
    if (options.signal?.aborted) throw error
    if (error instanceof GitHubReadmeImportError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new GitHubReadmeImportError(
      'network',
      'Could not import the GitHub README.',
      { cause: error },
    )
  } finally {
    request.cleanup()
  }
}
