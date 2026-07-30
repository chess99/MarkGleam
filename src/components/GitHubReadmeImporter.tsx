import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  GitHubReadmeImportError,
  importGitHubReadme,
  type GitHubSourceContext,
} from '../lib/github'
import type { Locale } from '../types'

export interface GitHubReadmeImporterProps {
  locale?: Locale
  initialUrl?: string
  disabled?: boolean
  className?: string
  onImported: (
    markdown: string,
    sourceContext: GitHubSourceContext,
  ) => void | Promise<void>
  onToast?: (message: string, kind?: 'success' | 'error') => void
}

const copy = {
  'zh-CN': {
    label: 'GitHub README 地址',
    placeholder: 'https://github.com/owner/repository',
    import: '导入 README',
    importing: '正在从 GitHub 导入…',
    cancel: '取消导入',
    success: 'README 已导入，可以继续编辑。',
    publicOnly: '仅支持公开仓库，不读取 Token；分支名含 / 时请使用仓库地址或 GitHub 复制的 Raw 地址。',
    errors: {
      'invalid-url': '请输入有效的 GitHub 地址。',
      'unsupported-url': '请使用公开仓库地址，或 README 的 GitHub blob/raw 地址。',
      'not-found': '没有找到公开仓库或 README。私有仓库无法直接导入。',
      'rate-limited': 'GitHub 请求次数已达上限，请稍后重试或改为上传 Markdown 文件。',
      forbidden: 'GitHub 拒绝了请求；这里只支持无需登录即可访问的公开仓库。',
      'too-large': 'README 文件过大，无法在浏览器中直接导入。',
      timeout: 'GitHub 响应超时，请重试或改为上传 Markdown 文件。',
      network: '暂时无法连接 GitHub，请检查网络后重试。',
      'invalid-response': 'GitHub 返回的 README 数据无法读取。',
      'http-error': 'GitHub 暂时无法完成请求，请稍后重试。',
    },
    unknownError: 'README 导入失败，请重试或上传 Markdown 文件。',
  },
  en: {
    label: 'GitHub README URL',
    placeholder: 'https://github.com/owner/repository',
    import: 'Import README',
    importing: 'Importing from GitHub…',
    cancel: 'Cancel import',
    success: 'README imported. You can continue editing it.',
    publicOnly: 'Public repositories only; no token is read. For branch names containing /, use the repository URL or GitHub\'s copied Raw URL.',
    errors: {
      'invalid-url': 'Enter a valid GitHub URL.',
      'unsupported-url': 'Use a public repository URL or a README blob/raw URL.',
      'not-found': 'The public repository or README was not found. Private repositories cannot be imported.',
      'rate-limited': 'The GitHub request limit has been reached. Try later or upload the Markdown file.',
      forbidden: 'GitHub refused the request. Only repositories available without signing in are supported.',
      'too-large': 'This README is too large to import in the browser.',
      timeout: 'GitHub took too long to respond. Try again or upload the Markdown file.',
      network: 'GitHub could not be reached. Check the network and try again.',
      'invalid-response': 'GitHub returned README data that could not be read.',
      'http-error': 'GitHub could not complete the request. Try again later.',
    },
    unknownError: 'The README could not be imported. Try again or upload the Markdown file.',
  },
} as const

export function GitHubReadmeImporter({
  locale = 'zh-CN',
  initialUrl = '',
  disabled = false,
  className,
  onImported,
  onToast,
}: GitHubReadmeImporterProps) {
  const labels = copy[locale]
  const [url, setUrl] = useState(initialUrl)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(
    () => () => {
      controllerRef.current?.abort()
    },
    [],
  )

  const cancel = () => {
    controllerRef.current?.abort()
    controllerRef.current = null
    setLoading(false)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (loading || disabled) return

    const controller = new AbortController()
    controllerRef.current = controller
    setLoading(true)
    setError(undefined)
    try {
      const result = await importGitHubReadme(url, { signal: controller.signal })
      if (controller.signal.aborted) return
      await onImported(result.markdown, result.sourceContext)
      if (controller.signal.aborted) return
      onToast?.(labels.success, 'success')
    } catch (caught) {
      if (controller.signal.aborted) return
      const message =
        caught instanceof GitHubReadmeImportError
          ? labels.errors[caught.code]
          : labels.unknownError
      setError(message)
      onToast?.(message, 'error')
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null
        setLoading(false)
      }
    }
  }

  return (
    <form
      className={['github-readme-importer', className].filter(Boolean).join(' ')}
      onSubmit={(event) => void submit(event)}
    >
      <label htmlFor="github-readme-url">{labels.label}</label>
      <div className="github-readme-importer-controls">
        <input
          id="github-readme-url"
          type="url"
          inputMode="url"
          value={url}
          placeholder={labels.placeholder}
          disabled={disabled || loading}
          required
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onChange={(event) => setUrl(event.target.value)}
        />
        {loading ? (
          <button type="button" onClick={cancel}>
            {labels.cancel}
          </button>
        ) : (
          <button type="submit" disabled={disabled || !url.trim()}>
            {labels.import}
          </button>
        )}
      </div>
      <small>{loading ? labels.importing : labels.publicOnly}</small>
      {error && (
        <p className="github-readme-importer-error" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
