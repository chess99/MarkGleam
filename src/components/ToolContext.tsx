import { useEffect, useRef, type ReactNode } from 'react'
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
  const activeLinkRef = useRef<HTMLAnchorElement>(null)
  const visibleToolPages = toolPages.filter(
    (candidate) => candidate.id !== 'visual-workspace',
  )

  useEffect(() => {
    activeLinkRef.current?.scrollIntoView({
      block: 'nearest',
      inline: 'center',
    })
  }, [page.id])

  return (
    <section className="tool-context" aria-labelledby="tool-page-title">
      <div className="tool-context-copy">
        <h1 id="tool-page-title">{copy.h1}</h1>
        <p>{copy.intro}</p>
      </div>
      {children}
      <details className="tool-context-details">
        <summary>{locale === 'zh-CN' ? '操作与限制' : 'Steps and limits'}</summary>
        <ol>
          {copy.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p>{copy.limitations}</p>
        <h2>{locale === 'zh-CN' ? '输入示例' : 'Input example'}</h2>
        <pre><code>{copy.sample}</code></pre>
      </details>
      <nav
        className="tool-links"
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
              ref={active ? activeLinkRef : undefined}
              aria-current={active ? 'page' : undefined}
            >
              {candidate.h1[locale]}
            </a>
          )
        })}
      </nav>
    </section>
  )
}
