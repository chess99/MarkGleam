import { useEffect, useRef, type ReactNode } from 'react'
import { ChevronDown, LayoutGrid, ListChecks, X } from 'lucide-react'
import {
  getLocalizedPageContent,
  toolPages,
  type ResolvedToolPage,
} from '../data/toolPages'

export function ToolContext({
  resolved,
  children,
}: {
  resolved: ResolvedToolPage
  children?: ReactNode
}) {
  const { page, locale } = resolved
  const copy = getLocalizedPageContent(page, locale)
  const contextRef = useRef<HTMLElement>(null)
  const desktopActiveLinkRef = useRef<HTMLAnchorElement>(null)
  const mobileActiveLinkRef = useRef<HTMLAnchorElement>(null)
  const visibleToolPages = toolPages.filter(
    (candidate) => candidate.id !== 'visual-workspace',
  )

  useEffect(() => {
    desktopActiveLinkRef.current?.scrollIntoView({
      block: 'nearest',
      inline: 'center',
    })
  }, [page.id])

  useEffect(() => {
    const closePopovers = (restoreFocus = false) => {
      const openPopover = contextRef.current?.querySelector<HTMLDetailsElement>(
        'details[open]',
      )
      if (!openPopover) return
      openPopover.open = false
      if (restoreFocus) {
        openPopover.querySelector<HTMLElement>('summary')?.focus()
      }
    }

    const dismissOutside = (event: PointerEvent) => {
      if (!contextRef.current?.contains(event.target as Node)) closePopovers()
    }
    const dismissWithEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePopovers(true)
    }

    document.addEventListener('pointerdown', dismissOutside)
    window.addEventListener('keydown', dismissWithEscape)
    return () => {
      document.removeEventListener('pointerdown', dismissOutside)
      window.removeEventListener('keydown', dismissWithEscape)
    }
  }, [])

  const renderToolLinks = (
    className: string,
    activeRef: typeof desktopActiveLinkRef,
  ) => (
    <nav
      className={className}
      aria-label={locale === 'zh-CN' ? '转换类型' : 'Converter type'}
    >
      {visibleToolPages.map((candidate) => {
        const isHomepageMarkdown =
          page.id === 'visual-workspace' &&
          candidate.id === 'markdown-to-image'
        const active = candidate.id === page.id || isHomepageMarkdown
        const href = isHomepageMarkdown
          ? locale === 'zh-CN'
            ? page.path
            : page.enPath
          : locale === 'zh-CN'
            ? candidate.path
            : candidate.enPath

        return (
          <a
            key={candidate.id}
            href={href}
            ref={active ? activeRef : undefined}
            aria-current={active ? 'page' : undefined}
          >
            {candidate.h1[locale]}
          </a>
        )
      })}
    </nav>
  )

  return (
    <section
      ref={contextRef}
      className="tool-context"
      aria-labelledby="tool-page-title"
    >
      <div className="tool-context-copy">
        <h1 id="tool-page-title">{copy.h1}</h1>
        <p>{copy.intro}</p>
      </div>
      {children}
      <div className="tool-context-actions">
        <details className="tool-context-details" name="tool-context-popover">
          <summary>
            <ListChecks
              className="tool-context-open-icon"
              size={15}
              aria-hidden="true"
            />
            <X
              className="tool-context-close-icon"
              size={16}
              aria-hidden="true"
            />
            <span>{locale === 'zh-CN' ? '操作说明' : 'How it works'}</span>
          </summary>
          <div className="tool-context-details-content">
            <div className="tool-context-details-heading">
              {locale === 'zh-CN' ? '操作说明' : 'How it works'}
            </div>
            <ol>
              {copy.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p>{copy.limitations}</p>
            <h2>{locale === 'zh-CN' ? '输入示例' : 'Input example'}</h2>
            <pre><code>{copy.sample}</code></pre>
          </div>
        </details>

        <details className="mobile-tool-switcher" name="tool-context-popover">
          <summary>
            <LayoutGrid size={15} aria-hidden="true" />
            <span>{locale === 'zh-CN' ? '切换工具' : 'Switch tool'}</span>
            <ChevronDown size={14} aria-hidden="true" />
          </summary>
          <div className="mobile-tool-menu">
            <div className="mobile-tool-menu-heading">
              {locale === 'zh-CN' ? '选择转换方式' : 'Choose a converter'}
            </div>
            {renderToolLinks('mobile-tool-links', mobileActiveLinkRef)}
          </div>
        </details>
      </div>
      {renderToolLinks('tool-links', desktopActiveLinkRef)}
    </section>
  )
}
