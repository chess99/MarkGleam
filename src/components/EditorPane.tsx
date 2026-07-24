import { useRef, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { markdown as markdownLanguage } from '@codemirror/lang-markdown'
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

export function EditorPane() {
  const markdown = useAppStore((state) => state.markdown)
  const locale = useAppStore((state) => state.locale)
  const themeId = useAppStore((state) => state.themeId)
  const setMarkdown = useAppStore((state) => state.setMarkdown)
  const resetDocument = useAppStore((state) => state.resetDocument)
  const inputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const importFile = async (file: File) => {
    if (
      file.type.startsWith('image/') ||
      /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name)
    ) {
      const asset = await saveAsset(file, 'image')
      const alt = file.name.replace(/\.[^.]+$/, '')
      setMarkdown(`${markdown.trimEnd()}\n\n![${alt}](md2img-asset://${asset.id})\n`)
      return
    }

    if (
      file.type === 'text/markdown' ||
      file.type === 'text/plain' ||
      /\.md(?:own)?$/i.test(file.name)
    ) {
      setMarkdown(await file.text())
    }
  }

  const handleFiles = async (files: FileList | File[]) => {
    for (const file of [...files]) await importFile(file)
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
      aria-label={t(locale, 'markdown')}
      onDragEnter={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setDragging(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        void handleFiles(event.dataTransfer.files)
      }}
    >
      <header className="pane-header">
        <div className="pane-title">
          <span className="pane-icon pane-icon-coral" aria-hidden="true">
            <FileUp size={17} />
          </span>
          <span>{t(locale, 'markdown')}</span>
        </div>
        <div className="pane-actions">
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
          <div className="menu-anchor">
            <button
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
        <CodeMirror
          value={markdown}
          height="100%"
          minHeight="100%"
          extensions={[markdownLanguage()]}
          onChange={setMarkdown}
          theme={themeId === 'night' || themeId === 'terminal' ? 'dark' : 'light'}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
            highlightActiveLineGutter: true,
            autocompletion: true,
            bracketMatching: true,
            searchKeymap: true,
          }}
        />
      </div>

      <div className="editor-status">
        <span>{t(locale, 'dropHint')}</span>
        <span className="markdown-badge">M↓</span>
      </div>

      {dragging && <div className="drop-overlay">{t(locale, 'dropHint')}</div>}

      <input
        ref={inputRef}
        hidden
        type="file"
        accept=".md,.markdown,text/markdown,text/plain"
        onChange={(event) => {
          if (event.target.files) void handleFiles(event.target.files)
          event.target.value = ''
        }}
      />
      <input
        ref={imageInputRef}
        hidden
        type="file"
        accept="image/*"
        onChange={(event) => {
          if (event.target.files) void handleFiles(event.target.files)
          event.target.value = ''
        }}
      />
    </section>
  )
}
