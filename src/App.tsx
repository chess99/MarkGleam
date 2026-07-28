import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Eye,
  FileText,
  Image as ImageIcon,
  Languages,
  LockKeyhole,
  Moon,
  PanelLeftClose,
  PanelRightClose,
  Settings2,
  ShieldCheck,
  Sun,
} from 'lucide-react'
import { EditorPane } from './components/EditorPane'
import { Inspector } from './components/Inspector'
import { MarkdownPreview } from './components/MarkdownPreview'
import { Modal } from './components/Modal'
import { t } from './i18n'
import { useAppStore } from './store'
import type { MobilePane } from './types'

type InfoModal = 'help' | 'privacy' | 'shortcuts' | null

const ExportDialog = lazy(() =>
  import('./components/ExportDialog').then((module) => ({
    default: module.ExportDialog,
  })),
)

function App() {
  const locale = useAppStore((state) => state.locale)
  const markdown = useAppStore((state) => state.markdown)
  const themeId = useAppStore((state) => state.themeId)
  const canvas = useAppStore((state) => state.canvas)
  const editorCollapsed = useAppStore((state) => state.editorCollapsed)
  const inspectorCollapsed = useAppStore((state) => state.inspectorCollapsed)
  const mobilePane = useAppStore((state) => state.mobilePane)
  const setLocale = useAppStore((state) => state.setLocale)
  const setMarkdown = useAppStore((state) => state.setMarkdown)
  const setThemeId = useAppStore((state) => state.setThemeId)
  const toggleEditor = useAppStore((state) => state.toggleEditor)
  const toggleInspector = useAppStore((state) => state.toggleInspector)
  const setMobilePane = useAppStore((state) => state.setMobilePane)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const [exportSurface, setExportSurface] = useState<HTMLDivElement | null>(null)
  const [outputHeight, setOutputHeight] = useState(canvas.minHeight)
  const importRef = useRef<HTMLInputElement>(null)
  const helpMenuRef = useRef<HTMLDivElement>(null)
  const helpButtonRef = useRef<HTMLButtonElement>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [infoModal, setInfoModal] = useState<InfoModal>(null)
  const [helpMenuOpen, setHelpMenuOpen] = useState(false)
  const [toast, setToast] = useState<{
    message: string
    kind: 'success' | 'error'
  }>()
  const darkTheme = themeId === 'night' || themeId === 'terminal'

  const stats = useMemo(() => {
    const plain = markdown
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/[#>*_`[\]()|-]/g, ' ')
      .trim()
    const cjk = plain.match(/[\u3400-\u9fff]/g)?.length ?? 0
    const words = plain
      .replace(/[\u3400-\u9fff]/g, ' ')
      .split(/\s+/)
      .filter(Boolean).length
    return {
      words: cjk + words,
      lines: markdown.split('\n').length,
    }
  }, [markdown])

  const showToast = (message: string, kind: 'success' | 'error' = 'success') => {
    setToast({ message, kind })
  }

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  useEffect(() => {
    if (!toast) return
    const timeout = setTimeout(() => setToast(undefined), 3600)
    return () => clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    if (!helpMenuOpen) return
    const dismiss = (event: PointerEvent) => {
      if (!helpMenuRef.current?.contains(event.target as Node)) {
        setHelpMenuOpen(false)
      }
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setHelpMenuOpen(false)
      helpButtonRef.current?.focus()
    }
    document.addEventListener('pointerdown', dismiss)
    window.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [helpMenuOpen])

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const modifier = event.ctrlKey || event.metaKey
      if (!modifier) return

      if (event.key.toLowerCase() === 's') {
        event.preventDefault()
        setExportOpen(true)
      }
      if (event.key.toLowerCase() === 'o') {
        event.preventDefault()
        importRef.current?.click()
      }
      if (event.key === '/') {
        event.preventDefault()
        setInfoModal('help')
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  const openExport = () => {
    if (!exportSurface) return
    setExportOpen(true)
  }

  const mobileTabs: {
    id: MobilePane
    label: string
    icon: typeof FileText
  }[] = [
    { id: 'editor', label: t(locale, 'markdown'), icon: FileText },
    { id: 'preview', label: t(locale, 'preview'), icon: Eye },
    { id: 'settings', label: t(locale, 'settings'), icon: Settings2 },
  ]

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <ImageIcon size={20} strokeWidth={2.4} />
          </span>
          <h1 className="brand-title">
            <span>MD2IMG</span>
            <span className="sr-only">
              {locale === 'zh-CN'
                ? '免费 Markdown 转图片工具'
                : 'Free Markdown to image converter'}
            </span>
          </h1>
          <span className="brand-tagline">
            <ShieldCheck size={14} />
            {t(locale, 'tagline')}
          </span>
        </div>

        <div className="topbar-actions">
          <button
            className="icon-button desktop-panel-toggle"
            type="button"
            aria-label={`${editorCollapsed ? t(locale, 'expand') : t(locale, 'collapse')} ${t(locale, 'markdown')}`}
            title={`${editorCollapsed ? t(locale, 'expand') : t(locale, 'collapse')} ${t(locale, 'markdown')}`}
            onClick={toggleEditor}
          >
            <PanelLeftClose size={18} />
          </button>
          <button
            className="icon-button desktop-panel-toggle"
            type="button"
            aria-label={`${inspectorCollapsed ? t(locale, 'expand') : t(locale, 'collapse')} ${t(locale, 'settings')}`}
            title={`${inspectorCollapsed ? t(locale, 'expand') : t(locale, 'collapse')} ${t(locale, 'settings')}`}
            onClick={toggleInspector}
          >
            <PanelRightClose size={18} />
          </button>
          <label className="language-select">
            <Languages size={16} />
            <select
              aria-label={locale === 'zh-CN' ? '界面语言' : 'Interface language'}
              value={locale}
              onChange={(event) =>
                setLocale(event.target.value as 'zh-CN' | 'en')
              }
            >
              <option value="zh-CN">简体中文</option>
              <option value="en">English</option>
            </select>
          </label>
          <button
            className="icon-button"
            type="button"
            aria-label={darkTheme ? t(locale, 'lightTheme') : t(locale, 'darkTheme')}
            onClick={() => setThemeId(darkTheme ? 'paper' : 'night')}
          >
            {darkTheme ? (
              <Sun size={18} />
            ) : (
              <Moon size={18} />
            )}
          </button>
          <div className="menu-anchor" ref={helpMenuRef}>
            <button
              ref={helpButtonRef}
              className="icon-button"
              type="button"
              aria-label={t(locale, 'help')}
              aria-expanded={helpMenuOpen}
              onClick={() => setHelpMenuOpen((open) => !open)}
            >
              <CircleHelp size={18} />
            </button>
            {helpMenuOpen && (
              <div className="mini-menu help-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setInfoModal('help')
                    setHelpMenuOpen(false)
                  }}
                >
                  <BookOpen size={15} /> {t(locale, 'help')}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setInfoModal('privacy')
                    setHelpMenuOpen(false)
                  }}
                >
                  <LockKeyhole size={15} /> {t(locale, 'privacy')}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setInfoModal('shortcuts')
                    setHelpMenuOpen(false)
                  }}
                >
                  <span className="shortcut-glyph">⌘</span>
                  {t(locale, 'shortcuts')}
                </button>
              </div>
            )}
          </div>
          <button className="primary-button top-export" type="button" onClick={openExport}>
            <ImageIcon size={17} />
            {t(locale, 'export')}
          </button>
        </div>
      </header>

      <main
        className={`workspace ${editorCollapsed ? 'editor-collapsed' : ''} ${
          inspectorCollapsed ? 'inspector-collapsed' : ''
        } mobile-${mobilePane}`}
      >
        {!editorCollapsed && <EditorPane onToast={showToast} />}

        {editorCollapsed && (
          <button
            className="collapsed-rail rail-left"
            type="button"
            onClick={toggleEditor}
          >
            <ChevronRight size={16} />
            <span>{t(locale, 'markdown')}</span>
          </button>
        )}

        <section className="pane preview-pane" aria-label={t(locale, 'preview')}>
          <header className="pane-header">
            <div className="pane-title">
              <span className="pane-icon pane-icon-green" aria-hidden="true">
                <Eye size={17} />
              </span>
              <span>{t(locale, 'preview')}</span>
            </div>
            <div className="preview-meta">
              <span>
                {canvas.width} × {Math.max(canvas.minHeight, outputHeight)}
                px
              </span>
              <span className="local-chip">
                <LockKeyhole size={12} />
                {t(locale, 'free')}
              </span>
            </div>
          </header>
          <MarkdownPreview
            surfaceRef={surfaceRef}
            onSurfaceReady={setExportSurface}
            onHeightChange={setOutputHeight}
          />
        </section>

        {inspectorCollapsed && (
          <button
            className="collapsed-rail rail-right"
            type="button"
            onClick={toggleInspector}
          >
            <ChevronLeft size={16} />
            <span>{t(locale, 'settings')}</span>
          </button>
        )}

        {!inspectorCollapsed && (
          <Inspector onOpenExport={openExport} onToast={showToast} />
        )}
      </main>

      <footer className="statusbar">
        <div>
          <span>
            {t(locale, 'words')} <b>{stats.words}</b>
          </span>
          <span>
            {t(locale, 'lines')} <b>{stats.lines}</b>
          </span>
        </div>
        <div className="status-output">
          <ImageIcon size={14} />
          {t(locale, 'output')} {canvas.width} × {canvas.minHeight}+ px
        </div>
        <div className="saved-status">
          <CheckCircle2 size={15} />
          {t(locale, 'saved')}
        </div>
      </footer>

      <nav className="mobile-nav" aria-label={t(locale, 'settings')}>
        {mobileTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={mobilePane === id ? 'active' : ''}
            onClick={() => setMobilePane(id)}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
        <button type="button" className="mobile-export" onClick={openExport}>
          <ImageIcon size={18} />
          <span>{t(locale, 'export')}</span>
        </button>
      </nav>

      <input
        ref={importRef}
        hidden
        type="file"
        accept=".md,.markdown,text/markdown,text/plain"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            void file
              .text()
              .then(setMarkdown)
              .catch((error) => {
                console.error(error)
                showToast(t(locale, 'importFailed'), 'error')
              })
          }
          event.target.value = ''
        }}
      />

      {exportOpen && exportSurface && (
        <Suspense fallback={null}>
          <ExportDialog
            surface={exportSurface}
            onClose={() => setExportOpen(false)}
            onToast={showToast}
          />
        </Suspense>
      )}

      {infoModal && (
        <Modal
          title={t(locale, `${infoModal}Title` as 'helpTitle')}
          onClose={() => setInfoModal(null)}
          closeLabel={t(locale, 'close')}
        >
          <div className="info-copy">
            <p>{t(locale, `${infoModal}Body` as 'helpBody')}</p>
            {infoModal === 'help' && (
              <ul>
                <li>
                  {locale === 'zh-CN'
                    ? '使用 --- 分隔内容时，PDF 与分片导出会优先从该处分页。'
                    : 'Use --- to suggest a page break for PDF and sliced exports.'}
                </li>
                <li>
                  {locale === 'zh-CN'
                    ? '远程图片受浏览器跨域规则约束，本地拖入最可靠。'
                    : 'Remote images follow browser CORS rules; local drop is the reliable path.'}
                </li>
              </ul>
            )}
          </div>
        </Modal>
      )}

      {toast && (
        <div
          className={`toast toast-${toast.kind}`}
          role={toast.kind === 'error' ? 'alert' : 'status'}
          aria-live={toast.kind === 'error' ? 'assertive' : 'polite'}
        >
          {toast.kind === 'success' ? <CheckCircle2 size={17} /> : null}
          {toast.message}
        </div>
      )}
    </div>
  )
}

export default App
