import { useEffect, useId, useState } from 'react'
import { useAppStore } from '../store'
import { t } from '../i18n'

let mermaidPromise: Promise<(typeof import('mermaid'))['default']> | undefined

const getMermaid = () => {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'base',
        fontFamily: 'inherit',
      })
      return mermaid
    })
  }
  return mermaidPromise
}

export function MermaidBlock({ chart }: { chart: string }) {
  const reactId = useId()
  const locale = useAppStore((state) => state.locale)
  const themeId = useAppStore((state) => state.themeId)
  const [renderState, setRenderState] = useState<{
    key: string
    svg: string
    error: boolean
  }>()
  const safeId = `md2img-mermaid-${reactId.replace(/:/g, '-')}`
  const renderKey = `${chart}:${themeId}`

  useEffect(() => {
    let cancelled = false

    const renderId = `${safeId}-${Math.random().toString(36).slice(2)}`
    getMermaid()
      .then((mermaid) => mermaid.render(renderId, chart))
      .then(({ svg: output }) => {
        if (!cancelled) setRenderState({ key: renderKey, svg: output, error: false })
      })
      .catch(() => {
        if (!cancelled) setRenderState({ key: renderKey, svg: '', error: true })
      })

    return () => {
      cancelled = true
    }
  }, [chart, renderKey, safeId, themeId])

  const current = renderState?.key === renderKey ? renderState : undefined

  if (current?.error) {
    return (
      <div className="mermaid-error" data-mermaid-state="error">
        {t(locale, 'renderError')}
      </div>
    )
  }

  if (current?.svg) {
    return (
      <div
        className="mermaid-block"
        data-mermaid-state="ready"
        aria-busy="false"
        dangerouslySetInnerHTML={{ __html: current.svg }}
      />
    )
  }

  return (
    <div
      className="mermaid-block"
      data-mermaid-state="loading"
      aria-busy="true"
    >
      <span className="render-loader" />
    </div>
  )
}
