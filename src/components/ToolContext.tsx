import type { ReactNode } from 'react'
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
        aria-label={locale === 'zh-CN' ? '其他转换工具' : 'Other converters'}
      >
        {toolPages.map((candidate) => {
          const href = locale === 'zh-CN' ? candidate.path : candidate.enPath
          return (
            <a
              key={candidate.id}
              href={href}
              aria-current={candidate.id === page.id ? 'page' : undefined}
            >
              {candidate.h1[locale]}
            </a>
          )
        })}
      </nav>
    </section>
  )
}
