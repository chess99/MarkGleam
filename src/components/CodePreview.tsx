import { useEffect, useState } from 'react'

export function CodePreview({
  code,
  language,
}: {
  code: string
  language: string
}) {
  const renderKey = `${language}:${code}`
  const [renderState, setRenderState] = useState<{
    key: string
    highlighted: string
    language: string
  }>()

  useEffect(() => {
    let active = true
    void import('highlight.js').then(({ default: hljs }) => {
      let highlighted: string
      let resolvedLanguage = language
      try {
        if (language && hljs.getLanguage(language)) {
          highlighted = hljs.highlight(code, { language }).value
        } else {
          const result = hljs.highlightAuto(code)
          highlighted = result.value
          resolvedLanguage = result.language ?? ''
        }
      } catch {
        highlighted = hljs.highlight(code, { language: 'plaintext' }).value
        resolvedLanguage = 'plaintext'
      }
      if (active) {
        setRenderState({
          key: renderKey,
          highlighted,
          language: resolvedLanguage,
        })
      }
    })
    return () => {
      active = false
    }
  }, [code, language, renderKey])

  const current = renderState?.key === renderKey ? renderState : undefined

  if (!current) {
    return (
      <pre data-render-state="loading">
        <code>{code}</code>
      </pre>
    )
  }

  return (
    <pre data-render-state="ready">
      <code
        className={`hljs${current.language ? ` language-${current.language}` : ''}`}
        dangerouslySetInnerHTML={{ __html: current.highlighted }}
      />
    </pre>
  )
}
