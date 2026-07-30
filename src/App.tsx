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
  LockKeyhole,
  Moon,
  PanelLeftClose,
  PanelRightClose,
  Settings2,
  ShieldCheck,
  Sun,
} from 'lucide-react'
import { EditorPane } from './components/EditorPane'
import { BrandMark } from './components/BrandMark'
import { ChangelogPage } from './components/ChangelogPage'
import { Inspector } from './components/Inspector'
import { LanguageSelect } from './components/LanguageSelect'
import { MarkdownPreview } from './components/MarkdownPreview'
import { Modal } from './components/Modal'
import { ToolContext } from './components/ToolContext'
import {
  getLocalizedEditorSample,
  getLocalizedPageContent,
  resolveToolPage,
  toolPages,
} from './data/toolPages'
import { PRODUCT } from './config/product'
import { getToolSample } from './data/toolSamples'
import { t } from './i18n'
import { useAppStore } from './store'
import type { MobilePane, ToolId } from './types'

type InfoModal = 'help' | 'privacy' | 'shortcuts' | null

const shortcutItems = [
  { key: 'S', action: { 'zh-CN': '打开导出', en: 'Open export' } },
  { key: 'O', action: { 'zh-CN': '导入文件', en: 'Import a file' } },
  { key: '/', action: { 'zh-CN': '打开帮助', en: 'Open help' } },
] as const

const ExportDialog = lazy(() =>
  import('./components/ExportDialog').then((module) => ({
    default: module.ExportDialog,
  })),
)

const BatchPane = lazy(() =>
  import('./components/BatchPane').then((module) => ({
    default: module.BatchPane,
  })),
)

const GitHubReadmeImporter = lazy(() =>
  import('./components/GitHubReadmeImporter').then((module) => ({
    default: module.GitHubReadmeImporter,
  })),
)

function App() {
  const resolvedPage = useMemo(
    () => resolveToolPage(window.location.pathname),
    [],
  )
  const storedLocale = useAppStore((state) => state.locale)
  const locale = resolvedPage?.locale ?? storedLocale
  const markdown = useAppStore((state) => state.markdown)
  const inputKind = useAppStore((state) => state.inputKind)
  const appearance = useAppStore((state) => state.appearance)
  const canvas = useAppStore((state) => state.canvas)
  const editorCollapsed = useAppStore((state) => state.editorCollapsed)
  const inspectorCollapsed = useAppStore((state) => state.inspectorCollapsed)
  const mobilePane = useAppStore((state) => state.mobilePane)
  const setLocale = useAppStore((state) => state.setLocale)
  const setToolId = useAppStore((state) => state.setToolId)
  const setMarkdown = useAppStore((state) => state.setMarkdown)
  const setCodeLanguage = useAppStore((state) => state.setCodeLanguage)
  const setAppearance = useAppStore((state) => state.setAppearance)
  const toggleEditor = useAppStore((state) => state.toggleEditor)
  const toggleInspector = useAppStore((state) => state.toggleInspector)
  const setMobilePane = useAppStore((state) => state.setMobilePane)
  const setInspectorTab = useAppStore((state) => state.setInspectorTab)
  const updateCanvas = useAppStore((state) => state.updateCanvas)
  const updateExport = useAppStore((state) => state.updateExport)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const [exportSurface, setExportSurface] = useState<HTMLDivElement | null>(null)
  const [outputHeight, setOutputHeight] = useState(canvas.minHeight)
  const importRef = useRef<HTMLInputElement>(null)
  const helpMenuRef = useRef<HTMLDivElement>(null)
  const helpButtonRef = useRef<HTMLButtonElement>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [infoModal, setInfoModal] = useState<InfoModal>(null)
  const [helpMenuOpen, setHelpMenuOpen] = useState(false)
  const [changelogOpen, setChangelogOpen] = useState(
    () => window.location.hash === '#/changelog',
  )
  const [toast, setToast] = useState<{
    message: string
    kind: 'success' | 'error'
  }>()
  const darkAppearance = appearance === 'dark'

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
    if (storedLocale !== locale) setLocale(locale)
  }, [locale, setLocale, storedLocale])

  useEffect(() => {
    if (!resolvedPage) {
      document.title =
        locale === 'zh-CN'
          ? `页面不存在 · ${PRODUCT.name}`
          : `Page not found · ${PRODUCT.name}`
      document.querySelector('meta[name="robots"]')?.setAttribute('content', 'noindex,follow')
      return
    }

    const { page } = resolvedPage
    const copy = getLocalizedPageContent(page, locale)
    const editorSample = getLocalizedEditorSample(page, locale)
    setToolId(page.id as ToolId)
    const currentState = useAppStore.getState()
    const knownSamples = new Set([
      getToolSample(currentState.inputKind),
      ...toolPages.flatMap((candidate) => [
        candidate.sample['zh-CN'],
        candidate.sample.en,
      ]),
    ])
    if (knownSamples.has(currentState.markdown)) setMarkdown(editorSample)
    // The homepage is the general editor, so keep a returning user's export
    // and canvas choices. Purpose-specific routes intentionally apply the
    // settings needed to make their advertised workflow usable immediately.
    if (page.id !== 'visual-workspace') {
      updateExport({
        format: page.defaults.exportFormat,
        ...(page.defaults.splitHeight
          ? { splitHeight: page.defaults.splitHeight }
          : {}),
      })
      if (page.defaults.inspectorTab) setInspectorTab(page.defaults.inspectorTab)
      if (page.defaults.codeLanguage) setCodeLanguage(page.defaults.codeLanguage)
      if (page.defaults.canvasPreset === 'a4') {
        updateCanvas({ preset: 'a4', width: 794, minHeight: 1123 })
      } else if (page.defaults.canvasPreset === 'auto') {
        updateCanvas({ preset: 'auto', width: 1080, minHeight: 720 })
      }
    }

    document.title = copy.title
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', copy.description)
    document
      .querySelector('meta[name="robots"]')
      ?.setAttribute('content', 'index,follow,max-image-preview:large')
    document
      .querySelector('link[rel="canonical"]')
      ?.setAttribute('href', `${PRODUCT.origin}${resolvedPage.canonicalPath}`)
  }, [
    locale,
    resolvedPage,
    setCodeLanguage,
    setInspectorTab,
    setMarkdown,
    setToolId,
    updateCanvas,
    updateExport,
  ])

  useEffect(() => {
    document.documentElement.dataset.appearance = appearance
  }, [appearance])

  useEffect(() => {
    const syncRoute = () => {
      setChangelogOpen(window.location.hash === '#/changelog')
    }
    window.addEventListener('hashchange', syncRoute)
    return () => window.removeEventListener('hashchange', syncRoute)
  }, [])

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

  const changeLocale = (nextLocale: typeof locale) => {
    setLocale(nextLocale)
    if (!resolvedPage) return
    const nextPath =
      nextLocale === 'en' ? resolvedPage.page.enPath : resolvedPage.page.path
    if (nextPath !== window.location.pathname) window.location.assign(nextPath)
  }

  const editorLabel =
    inputKind === 'mermaid'
      ? 'Mermaid'
      : inputKind === 'formula'
        ? locale === 'zh-CN'
          ? '公式'
          : 'Formula'
        : inputKind === 'code'
          ? locale === 'zh-CN'
            ? '代码'
            : 'Code'
          : resolvedPage?.page.id === 'batch-markdown-to-image'
            ? locale === 'zh-CN'
              ? '文件'
              : 'Files'
            : t(locale, 'markdown')

  const mobileTabs: {
    id: MobilePane
    label: string
    icon: typeof FileText
  }[] = [
    { id: 'editor', label: editorLabel, icon: FileText },
    { id: 'preview', label: t(locale, 'preview'), icon: Eye },
    { id: 'settings', label: t(locale, 'settings'), icon: Settings2 },
  ]

  if (changelogOpen) {
    return (
      <ChangelogPage
        onBack={() => {
          window.location.hash = ''
        }}
      />
    )
  }

  if (!resolvedPage) {
    return (
      <main className="not-found-page">
        <ImageIcon size={38} />
        <h1>{locale === 'zh-CN' ? '这个页面不存在' : 'This page does not exist'}</h1>
        <p>
          {locale === 'zh-CN'
            ? '地址可能已变更。返回 Markdown 转图片工具继续使用。'
            : 'The address may have changed. Return to the Markdown to image tool.'}
        </p>
        <a href={locale === 'zh-CN' ? '/' : '/en/'}>
          {locale === 'zh-CN' ? '返回首页' : `Back to ${PRODUCT.name}`}
        </a>
      </main>
    )
  }

  const currentPageCopy = getLocalizedPageContent(resolvedPage.page, locale)

  return (
    <div className="app-shell" data-appearance={appearance}>
      <header className="topbar">
        <a
          className="brand"
          href={locale === 'zh-CN' ? '/' : '/en/'}
        >
          <BrandMark />
          <div className="brand-title">
            <span>{PRODUCT.name}</span>
            <span className="sr-only">
              {locale === 'zh-CN'
                ? '结构化内容视觉工作台'
                : 'Structured content visual workspace'}
            </span>
          </div>
          <span className="brand-tagline">
            <ShieldCheck size={14} />
            {t(locale, 'tagline')}
          </span>
        </a>

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
          <LanguageSelect locale={locale} onChange={changeLocale} />
          <button
            className="icon-button"
            type="button"
            aria-label={
              darkAppearance
                ? t(locale, 'lightTheme')
                : t(locale, 'darkTheme')
            }
            aria-pressed={darkAppearance}
            onClick={() => setAppearance(darkAppearance ? 'light' : 'dark')}
          >
            {darkAppearance ? (
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

      <ToolContext resolved={resolvedPage}>
        {resolvedPage.page.id === 'github-readme-to-image' && (
          <Suspense fallback={null}>
            <GitHubReadmeImporter
              locale={locale}
              initialUrl={getLocalizedPageContent(resolvedPage.page, locale).sample}
              onImported={(source) => setMarkdown(source)}
              onToast={showToast}
            />
          </Suspense>
        )}
      </ToolContext>

      <main
        className={`workspace ${editorCollapsed ? 'editor-collapsed' : ''} ${
          inspectorCollapsed ? 'inspector-collapsed' : ''
        } mobile-${mobilePane}`}
      >
        {!editorCollapsed &&
          (resolvedPage.page.id === 'batch-markdown-to-image' ? (
            <Suspense fallback={null}>
              <BatchPane
                locale={locale}
                onPreview={setMarkdown}
                onToast={showToast}
              />
            </Suspense>
          ) : (
            <EditorPane
              sample={getLocalizedEditorSample(resolvedPage.page, locale)}
              onToast={showToast}
            />
          ))}

        {editorCollapsed && (
          <button
            className="collapsed-rail rail-left"
            type="button"
            onClick={toggleEditor}
          >
            <ChevronRight size={16} />
            <span>{editorLabel}</span>
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
        <div className="mobile-pane-switcher">
          {mobileTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={mobilePane === id ? 'active' : ''}
              aria-pressed={mobilePane === id}
              onClick={() => setMobilePane(id)}
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="mobile-export"
          aria-label={t(locale, 'export')}
          onClick={openExport}
        >
          <ImageIcon size={21} />
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
          compact
        >
          <div className="info-copy">
            {infoModal === 'help' ? (
              <>
                <p>{t(locale, 'helpBody')}</p>
                <section className="context-help-note">
                  <span>
                    {locale === 'zh-CN' ? '当前工具' : 'Current tool'}
                  </span>
                  <strong>{currentPageCopy.h1}</strong>
                  <p>{currentPageCopy.limitations}</p>
                </section>
                <ul>
                  <li>
                    {locale === 'zh-CN'
                      ? '需要强制分页时，请单独一行输入 <!-- pagebreak -->；--- 会保留为普通分隔线。'
                      : 'Use <!-- pagebreak --> on its own line to force a page break; --- remains a thematic break.'}
                  </li>
                </ul>
              </>
            ) : infoModal === 'shortcuts' ? (
              <div className="shortcut-list" role="list">
                {shortcutItems.map((item) => (
                  <div className="shortcut-row" role="listitem" key={item.key}>
                    <span className="shortcut-combo">
                      <kbd>Ctrl / ⌘</kbd>
                      <span>+</span>
                      <kbd>{item.key}</kbd>
                    </span>
                    <span className="shortcut-action">{item.action[locale]}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p>{t(locale, `${infoModal}Body` as 'helpBody')}</p>
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
