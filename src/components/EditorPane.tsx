import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import {
  FileImage,
  FileUp,
  MoreHorizontal,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { t } from '../i18n'
import { saveAsset } from '../lib/assets'
import { useAppStore } from '../store'

const codeLanguages = [
  'typescript',
  'javascript',
  'python',
  'java',
  'go',
  'rust',
  'bash',
  'json',
  'css',
  'html',
  'plaintext',
]

const DesktopMarkdownEditor = lazy(() => import('./DesktopMarkdownEditor'))

const useMobileEditor = () => {
  const [mobile, setMobile] = useState(() =>
    typeof window === 'undefined'
      ? false
      : window.matchMedia('(max-width: 820px)').matches,
  )

  useEffect(() => {
    const query = window.matchMedia('(max-width: 820px)')
    const update = () => setMobile(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return mobile
}

export function EditorPane({
  onToast,
}: {
  onToast: (message: string, kind?: 'success' | 'error') => void
}) {
  const markdown = useAppStore((state) => state.markdown)
  const locale = useAppStore((state) => state.locale)
  const appearance = useAppStore((state) => state.appearance)
  const inputKind = useAppStore((state) => state.inputKind)
  const codeLanguage = useAppStore((state) => state.codeLanguage)
  const setMarkdown = useAppStore((state) => state.setMarkdown)
  const setCodeLanguage = useAppStore((state) => state.setCodeLanguage)
  const resetDocument = useAppStore((state) => state.resetDocument)
  const inputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const [dragging, setDragging] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const mobileEditor = useMobileEditor()
  const inputLabel =
    inputKind === 'mermaid'
      ? 'Mermaid'
      : inputKind === 'formula'
        ? locale === 'zh-CN'
          ? 'LaTeX 公式'
          : 'LaTeX formula'
        : inputKind === 'code'
          ? locale === 'zh-CN'
            ? '代码'
            : 'Code'
          : t(locale, 'markdown')
  const acceptsMarkdownFiles = inputKind === 'markdown'

  useEffect(() => {
    if (!menuOpen) return
    const dismiss = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      menuButtonRef.current?.focus()
    }
    document.addEventListener('pointerdown', dismiss)
    window.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [menuOpen])

  const importFile = async (file: File, currentMarkdown: string) => {
    if (
      file.type.startsWith('image/') ||
      /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name)
    ) {
      const asset = await saveAsset(file, 'image')
      const alt = file.name.replace(/\.[^.]+$/, '')
      return `${currentMarkdown.trimEnd()}\n\n![${alt}](md2img-asset://${asset.id})\n`
    }

    if (
      file.type === 'text/markdown' ||
      file.type === 'text/plain' ||
      /\.md(?:own)?$/i.test(file.name)
    ) {
      return file.text()
    }

    return undefined
  }

  const handleFiles = async (files: FileList | File[]) => {
    let nextMarkdown = useAppStore.getState().markdown
    let changed = false
    try {
      for (const file of [...files]) {
        const imported = await importFile(file, nextMarkdown)
        if (imported === undefined) {
          onToast(t(locale, 'unsupportedFile'), 'error')
          continue
        }
        nextMarkdown = imported
        changed = true
      }
      // Commit a multi-file import once. Incremental preview rerenders can
      // revoke an earlier image's Blob URL before Firefox has decoded it.
      if (changed) setMarkdown(nextMarkdown)
    } catch (error) {
      console.error(error)
      onToast(t(locale, 'importFailed'), 'error')
    }
  }

  const clearDocument = () => {
    const message =
      locale === 'zh-CN'
        ? '确定清空当前 Markdown？本地自动保存的内容也会更新。'
        : 'Clear the current Markdown? The locally saved copy will also update.'
    if (window.confirm(message)) setMarkdown('')
  }

  return (
    <section
      className={`pane editor-pane ${dragging ? 'is-dragging' : ''}`}
      aria-label={inputLabel}
      onDragEnter={(event) => {
        event.preventDefault()
        if (acceptsMarkdownFiles) setDragging(true)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setDragging(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        if (acceptsMarkdownFiles) void handleFiles(event.dataTransfer.files)
      }}
    >
      <header className="pane-header">
        <div className="pane-title">
          <span className="pane-icon pane-icon-coral" aria-hidden="true">
            <FileUp size={17} />
          </span>
          <span>{inputLabel}</span>
        </div>
        <div className="pane-actions">
          {inputKind === 'code' && (
            <select
              className="code-language-select"
              aria-label={locale === 'zh-CN' ? '代码语言' : 'Code language'}
              value={codeLanguage}
              onChange={(event) => setCodeLanguage(event.target.value)}
            >
              {codeLanguages.map((language) => (
                <option value={language} key={language}>
                  {language}
                </option>
              ))}
            </select>
          )}
          {acceptsMarkdownFiles && (
            <>
              <button
                className="icon-button"
                type="button"
                title={t(locale, 'uploadMd')}
                aria-label={t(locale, 'uploadMd')}
                onClick={() => inputRef.current?.click()}
              >
                <FileUp size={17} />
              </button>
              <button
                className="icon-button"
                type="button"
                title={t(locale, 'uploadAsset')}
                aria-label={t(locale, 'uploadAsset')}
                onClick={() => imageInputRef.current?.click()}
              >
                <FileImage size={17} />
              </button>
            </>
          )}
          <div className="menu-anchor" ref={menuRef}>
            <button
              ref={menuButtonRef}
              className="icon-button"
              type="button"
              aria-label={t(locale, 'more')}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <MoreHorizontal size={18} />
            </button>
            {menuOpen && (
              <div className="mini-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    resetDocument()
                    setMenuOpen(false)
                  }}
                >
                  <RotateCcw size={15} />
                  {t(locale, 'restore')}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    clearDocument()
                    setMenuOpen(false)
                  }}
                >
                  <Trash2 size={15} />
                  {t(locale, 'clear')}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="editor-shell" data-testid="markdown-editor">
        {mobileEditor ? (
          <textarea
            className="mobile-markdown-editor"
            aria-label={inputLabel}
            value={markdown}
            onChange={(event) => setMarkdown(event.target.value)}
            spellCheck={false}
          />
        ) : (
          <Suspense
            fallback={
              <textarea
                className="mobile-markdown-editor"
                aria-label={inputLabel}
                value={markdown}
                onChange={(event) => setMarkdown(event.target.value)}
                spellCheck={false}
              />
            }
          >
            <DesktopMarkdownEditor
              value={markdown}
              onChange={setMarkdown}
              dark={appearance === 'dark'}
            />
          </Suspense>
        )}
      </div>

      <div className="editor-status">
        <span>
          {acceptsMarkdownFiles
            ? t(locale, 'dropHint')
            : locale === 'zh-CN'
              ? `直接输入${inputLabel}`
              : `Enter ${inputLabel} directly`}
        </span>
        <span className="markdown-badge">
          {inputKind === 'markdown' ? 'M↓' : inputKind.slice(0, 2).toUpperCase()}
        </span>
      </div>

      {dragging && acceptsMarkdownFiles && (
        <div className="drop-overlay">{t(locale, 'dropHint')}</div>
      )}

      <input
        ref={inputRef}
        hidden
        type="file"
        accept=".md,.markdown,text/markdown,text/plain"
        onChange={(event) => {
          const files = event.target.files ? [...event.target.files] : []
          event.target.value = ''
          if (files.length) void handleFiles(files)
        }}
      />
      <input
        ref={imageInputRef}
        hidden
        type="file"
        accept="image/*"
        multiple
        onChange={(event) => {
          const files = event.target.files ? [...event.target.files] : []
          event.target.value = ''
          if (files.length) void handleFiles(files)
        }}
      />
    </section>
  )
}
