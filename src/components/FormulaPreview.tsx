import { useEffect, useState } from 'react'
import { useAppStore } from '../store'

export function FormulaPreview({ formula }: { formula: string }) {
  const locale = useAppStore((state) => state.locale)
  const [renderState, setRenderState] = useState<{
    formula: string
    html: string
    error: boolean
  }>()

  useEffect(() => {
    let active = true
    void import('katex').then(({ default: katex }) => {
      try {
        const html = katex.renderToString(formula, {
          displayMode: true,
          throwOnError: true,
          strict: 'warn',
          trust: false,
          output: 'htmlAndMathml',
        })
        if (active) setRenderState({ formula, html, error: false })
      } catch {
        if (active) setRenderState({ formula, html: '', error: true })
      }
    })
    return () => {
      active = false
    }
  }, [formula])

  const current = renderState?.formula === formula ? renderState : undefined

  if (!current) {
    return (
      <div className="katex-display" data-render-state="loading">
        <span className="render-loader" />
      </div>
    )
  }

  if (current.error) {
    return (
      <div className="mermaid-error" data-render-state="error">
        {locale === 'zh-CN'
          ? '公式无法渲染，请检查 LaTeX 语法。'
          : locale === 'ja'
            ? '数式を描画できません。LaTeX の構文を確認してください。'
            : 'The formula could not be rendered. Check the LaTeX syntax.'}
      </div>
    )
  }

  return (
    <div
      data-render-state="ready"
      dangerouslySetInnerHTML={{ __html: current.html }}
    />
  )
}
