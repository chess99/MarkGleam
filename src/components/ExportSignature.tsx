import { Sparkles } from 'lucide-react'
import { PRODUCT } from '../config/product'
import { getTheme } from '../data/themes'
import { getSignaturePalette } from '../lib/signature'
import type {
  InputKind,
  Locale,
  SignatureConfig,
  ThemeId,
} from '../types'

const inputLabels: Record<InputKind, Record<Locale, string>> = {
  markdown: { 'zh-CN': 'MARKDOWN', en: 'MARKDOWN' },
  mermaid: { 'zh-CN': 'MERMAID', en: 'MERMAID' },
  formula: { 'zh-CN': 'LATEX', en: 'LATEX' },
  code: { 'zh-CN': 'CODE', en: 'CODE' },
}

interface ExportSignatureProps {
  config: SignatureConfig
  inputKind: InputKind
  locale: Locale
  themeId: ThemeId
  canvasWidth: number
  contentWidth: number
  backgroundColor: string
  transparent: boolean
}

export function ExportSignature({
  config,
  inputKind,
  locale,
  themeId,
  canvasWidth,
  contentWidth,
  backgroundColor,
  transparent,
}: ExportSignatureProps) {
  const theme = getTheme(themeId)
  const inputLabel = inputLabels[inputKind][locale]
  const fontSize = Math.max(11, Math.min(18, canvasWidth * 0.014))
  const palette = getSignaturePalette(
    transparent ? theme.surface : backgroundColor,
    transparent,
  )

  return (
    <footer
      className={[
        'export-signature',
        `signature-${config.style}`,
        `signature-${config.tone}`,
        contentWidth < 360 ? 'signature-compact' : '',
        palette.hasPanel ? 'signature-has-panel' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-export-signature
      aria-label={
        locale === 'zh-CN'
          ? `${PRODUCT.name} 导出署名`
          : `${PRODUCT.name} export signature`
      }
      style={
        {
          '--signature-font-size': `${fontSize}px`,
          '--signature-ink': palette.ink,
          '--signature-muted': palette.muted,
          '--signature-border': palette.border,
          '--signature-accent': palette.accent,
          '--signature-panel': palette.panel,
        } as React.CSSProperties
      }
    >
      {config.style === 'minimal' && (
        <>
          <span className="signature-minimal-copy">
            <Sparkles size={fontSize * 1.15} strokeWidth={1.7} />
            <span>
              {locale === 'zh-CN' ? '使用' : 'Made with'}{' '}
              <strong>{PRODUCT.name}</strong>
              {locale === 'zh-CN' && ' 制作'}
            </span>
          </span>
          <span className="signature-domain">{PRODUCT.domain}</span>
        </>
      )}

      {config.style === 'camera' && (
        <>
          <span className="signature-brand-lockup">
            <span className="signature-mark" aria-hidden="true">
              <Sparkles size={fontSize * 1.45} strokeWidth={1.7} />
            </span>
            <span>
              <strong>{PRODUCT.name}</strong>
              <small>{PRODUCT.signatureTagline[locale]}</small>
            </span>
          </span>
          <span className="signature-camera-meta">
            <strong>
              {inputLabel} · {theme.name[locale].toUpperCase()}
            </strong>
            <small>
              {canvasWidth} PX · {PRODUCT.domain}
            </small>
          </span>
        </>
      )}

      {config.style === 'stamp' && (
        <span className="signature-stamp-lockup">
          <span className="signature-stamp-mark" aria-hidden="true">
            MG
          </span>
          <span>
            <strong>{PRODUCT.name}</strong>
            <small>{PRODUCT.domain}</small>
          </span>
        </span>
      )}
    </footer>
  )
}
