import { useRef, useState } from 'react'
import { Check, ImagePlus, RotateCcw, Type, X } from 'lucide-react'
import { themes } from '../data/themes'
import { t } from '../i18n'
import { deleteAsset, saveAsset } from '../lib/assets'
import { useAppStore } from '../store'
import type {
  CanvasPreset,
  ExportFormat,
  InspectorTab,
  ThemeId,
} from '../types'
import { Field } from './Field'

const canvasPresets: {
  id: CanvasPreset
  width: number
  minHeight: number
  label:
    | 'auto'
    | 'square'
    | 'ratio34'
    | 'xiaohongshu'
    | 'social'
    | 'xCard'
    | 'linkedin'
    | 'wechatHeader'
    | 'custom'
}[] = [
  { id: 'auto', width: 1080, minHeight: 720, label: 'auto' },
  { id: 'square', width: 1080, minHeight: 1080, label: 'square' },
  { id: 'portrait', width: 1080, minHeight: 1440, label: 'ratio34' },
  { id: 'xiaohongshu', width: 1080, minHeight: 1440, label: 'xiaohongshu' },
  { id: 'social', width: 1200, minHeight: 630, label: 'social' },
  { id: 'x', width: 1600, minHeight: 900, label: 'xCard' },
  { id: 'linkedin', width: 1200, minHeight: 627, label: 'linkedin' },
  { id: 'wechat', width: 900, minHeight: 383, label: 'wechatHeader' },
  { id: 'custom', width: 1080, minHeight: 720, label: 'custom' },
]

const formats: ExportFormat[] = [
  'png',
  'jpeg',
  'webp',
  'svg',
  'pdf',
  'print',
  'clipboard',
  'split-zip',
]

export function Inspector({
  onOpenExport,
  onToast,
}: {
  onOpenExport: () => void
  onToast: (message: string, kind?: 'success' | 'error') => void
}) {
  const locale = useAppStore((state) => state.locale)
  const themeId = useAppStore((state) => state.themeId)
  const canvas = useAppStore((state) => state.canvas)
  const exportConfig = useAppStore((state) => state.export)
  const customCss = useAppStore((state) => state.customCss)
  const activeTab = useAppStore((state) => state.inspectorTab)
  const setThemeId = useAppStore((state) => state.setThemeId)
  const updateCanvas = useAppStore((state) => state.updateCanvas)
  const updateExport = useAppStore((state) => state.updateExport)
  const setCustomCss = useAppStore((state) => state.setCustomCss)
  const setInspectorTab = useAppStore((state) => state.setInspectorTab)
  const resetSettings = useAppStore((state) => state.resetSettings)
  const backgroundInputRef = useRef<HTMLInputElement>(null)
  const fontInputRef = useRef<HTMLInputElement>(null)
  const [advancedOpen, setAdvancedOpen] = useState(Boolean(customCss))

  const tabs: { id: InspectorTab; label: string }[] = [
    { id: 'theme', label: t(locale, 'theme') },
    { id: 'canvas', label: t(locale, 'canvas') },
    { id: 'export', label: t(locale, 'format') },
  ]

  const removeAsset = async (
    key: 'backgroundAssetId' | 'customFontAssetId',
    id?: string,
  ) => {
    if (id) await deleteAsset(id)
    updateCanvas({ [key]: undefined })
  }

  return (
    <aside className="pane inspector-pane" aria-label={t(locale, 'settings')}>
      <div className="inspector-tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => setInspectorTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="inspector-scroll">
        {activeTab === 'theme' && (
          <>
            <section className="control-section">
              <div className="section-heading">{t(locale, 'themePreset')}</div>
              <div className="theme-grid">
                {themes.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    className={`theme-card ${themeId === theme.id ? 'active' : ''}`}
                    aria-pressed={themeId === theme.id}
                    onClick={() => setThemeId(theme.id as ThemeId)}
                  >
                    <span
                      className="theme-swatch"
                      style={{
                        background: theme.preview[0],
                        color: theme.preview[1],
                        borderColor: theme.border,
                      }}
                    >
                      <b>Aa</b>
                      <i style={{ background: theme.preview[1] }} />
                      <i style={{ background: theme.preview[2] }} />
                    </span>
                    <span>{theme.name[locale]}</span>
                    {themeId === theme.id && (
                      <span className="theme-check">
                        <Check size={12} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </section>

            <section className="control-section">
              <div className="section-heading">{t(locale, 'fontSize')}</div>
              <Field label={t(locale, 'fontSize')} value={`${canvas.fontSize}px`}>
                <input
                  type="range"
                  min="18"
                  max="42"
                  value={canvas.fontSize}
                  onChange={(event) =>
                    updateCanvas({ fontSize: Number(event.target.value) })
                  }
                />
              </Field>
              <Field label={t(locale, 'lineHeight')} value={canvas.lineHeight.toFixed(2)}>
                <input
                  type="range"
                  min="1.2"
                  max="2.2"
                  step="0.05"
                  value={canvas.lineHeight}
                  onChange={(event) =>
                    updateCanvas({ lineHeight: Number(event.target.value) })
                  }
                />
              </Field>
              <button
                className="asset-button"
                type="button"
                onClick={() => fontInputRef.current?.click()}
              >
                <Type size={16} />
                {t(locale, 'customFont')}
              </button>
              {canvas.customFontAssetId && (
                <button
                  type="button"
                  className="remove-asset"
                  onClick={() =>
                    void removeAsset('customFontAssetId', canvas.customFontAssetId)
                  }
                >
                  <X size={13} /> {t(locale, 'remove')}
                </button>
              )}
            </section>
          </>
        )}

        {activeTab === 'canvas' && (
          <>
            <section className="control-section">
              <div className="section-heading">{t(locale, 'canvasPreset')}</div>
              <div className="preset-grid">
                {canvasPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={canvas.preset === preset.id ? 'active' : ''}
                    onClick={() =>
                      updateCanvas({
                        preset: preset.id,
                        width: preset.width,
                        minHeight: preset.minHeight,
                      })
                    }
                  >
                    <span
                      className={`preset-shape preset-${preset.id}`}
                      aria-hidden="true"
                    />
                    <span>{t(locale, preset.label)}</span>
                  </button>
                ))}
              </div>
              <p className="preset-hint">{t(locale, 'canvasPresetHint')}</p>
            </section>

            <section className="control-section control-stack">
              <Field label={t(locale, 'width')} value={`${canvas.width}px`}>
                <input
                  type="number"
                  min="320"
                  max="2400"
                  value={canvas.width}
                  onChange={(event) =>
                    updateCanvas({
                      preset: 'custom',
                      width: Number(event.target.value),
                    })
                  }
                />
              </Field>
              <Field label={t(locale, 'minHeight')} value={`${canvas.minHeight}px`}>
                <input
                  type="number"
                  min="320"
                  max="6000"
                  value={canvas.minHeight}
                  onChange={(event) =>
                    updateCanvas({
                      preset: 'custom',
                      minHeight: Number(event.target.value),
                    })
                  }
                />
              </Field>
              <Field label={t(locale, 'padding')} value={`${canvas.paddingX}px`}>
                <input
                  type="range"
                  min="24"
                  max="160"
                  value={canvas.paddingX}
                  onChange={(event) =>
                    updateCanvas({
                      paddingX: Number(event.target.value),
                      paddingY: Number(event.target.value),
                    })
                  }
                />
              </Field>
              <Field label={t(locale, 'radius')} value={`${canvas.cornerRadius}px`}>
                <input
                  type="range"
                  min="0"
                  max="48"
                  value={canvas.cornerRadius}
                  onChange={(event) =>
                    updateCanvas({ cornerRadius: Number(event.target.value) })
                  }
                />
              </Field>
              <label className="toggle-row">
                <span>{t(locale, 'shadow')}</span>
                <input
                  type="checkbox"
                  checked={canvas.shadow}
                  onChange={(event) => updateCanvas({ shadow: event.target.checked })}
                />
              </label>
              <label className="toggle-row">
                <span>{t(locale, 'transparent')}</span>
                <input
                  type="checkbox"
                  checked={canvas.transparent}
                  onChange={(event) =>
                    updateCanvas({ transparent: event.target.checked })
                  }
                />
              </label>
              <Field label={t(locale, 'background')}>
                <input
                  className="color-input"
                  type="color"
                  value={canvas.backgroundColor}
                  disabled={canvas.transparent}
                  onChange={(event) =>
                    updateCanvas({ backgroundColor: event.target.value })
                  }
                />
              </Field>
              <button
                className="asset-button"
                type="button"
                disabled={canvas.transparent}
                onClick={() => backgroundInputRef.current?.click()}
              >
                <ImagePlus size={16} />
                {t(locale, 'backgroundImage')}
              </button>
              {canvas.backgroundAssetId && (
                <button
                  type="button"
                  className="remove-asset"
                  onClick={() =>
                    void removeAsset('backgroundAssetId', canvas.backgroundAssetId)
                  }
                >
                  <X size={13} /> {t(locale, 'remove')}
                </button>
              )}
            </section>

            <section className="control-section">
              <button
                className="advanced-trigger"
                type="button"
                aria-expanded={advancedOpen}
                onClick={() => setAdvancedOpen((open) => !open)}
              >
                <span>{t(locale, 'advanced')}</span>
                <span>{advancedOpen ? '−' : '+'}</span>
              </button>
              {advancedOpen && (
                <Field label={t(locale, 'customCss')}>
                  <textarea
                    className="css-editor"
                    value={customCss}
                    spellCheck={false}
                    placeholder={`h1 {\n  letter-spacing: .02em;\n}`}
                    onChange={(event) => setCustomCss(event.target.value)}
                  />
                </Field>
              )}
            </section>
          </>
        )}

        {activeTab === 'export' && (
          <>
            <section className="control-section">
              <div className="section-heading">{t(locale, 'exportFormat')}</div>
              <div className="format-grid">
                {formats.map((format) => (
                  <button
                    key={format}
                    type="button"
                    className={exportConfig.format === format ? 'active' : ''}
                    onClick={() => updateExport({ format })}
                  >
                    {format === 'split-zip'
                      ? 'ZIP'
                      : format === 'print'
                        ? locale === 'zh-CN'
                          ? '打印'
                          : 'Print'
                      : format === 'clipboard'
                        ? locale === 'zh-CN'
                          ? '复制'
                          : 'Copy'
                        : format.toUpperCase()}
                  </button>
                ))}
              </div>
            </section>
            <section className="control-section control-stack">
              <Field label={t(locale, 'scale')} value={`${exportConfig.scale}×`}>
                <div className="segmented">
                  {[1, 2, 3].map((scale) => (
                    <button
                      key={scale}
                      type="button"
                      className={exportConfig.scale === scale ? 'active' : ''}
                      onClick={() =>
                        updateExport({ scale: scale as 1 | 2 | 3 })
                      }
                    >
                      {scale}×
                    </button>
                  ))}
                </div>
              </Field>
              <Field
                label={t(locale, 'quality')}
                value={`${Math.round(exportConfig.quality * 100)}%`}
              >
                <input
                  type="range"
                  min="0.5"
                  max="1"
                  step="0.01"
                  value={exportConfig.quality}
                  onChange={(event) =>
                    updateExport({ quality: Number(event.target.value) })
                  }
                />
              </Field>
              <Field label={t(locale, 'filename')}>
                <input
                  type="text"
                  value={exportConfig.filename}
                  onChange={(event) => updateExport({ filename: event.target.value })}
                />
              </Field>
            </section>
            <button className="primary-button full-width" type="button" onClick={onOpenExport}>
              {t(locale, 'export')}
            </button>
            <p className="export-note">{t(locale, 'exportHint')}</p>
          </>
        )}
      </div>

      <footer className="inspector-footer">
        <button type="button" onClick={resetSettings}>
          <RotateCcw size={14} />
          {t(locale, 'resetSettings')}
        </button>
      </footer>

      <input
        ref={backgroundInputRef}
        hidden
        type="file"
        accept="image/*"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            void saveAsset(file, 'image')
              .then((asset) => updateCanvas({ backgroundAssetId: asset.id }))
              .catch((error) => {
                console.error(error)
                onToast(t(locale, 'importFailed'), 'error')
              })
          }
          event.target.value = ''
        }}
      />
      <input
        ref={fontInputRef}
        hidden
        type="file"
        accept=".woff,.woff2,.ttf,.otf,font/*"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            void saveAsset(file, 'font')
              .then((asset) => updateCanvas({ customFontAssetId: asset.id }))
              .catch((error) => {
                console.error(error)
                onToast(t(locale, 'importFailed'), 'error')
              })
          }
          event.target.value = ''
        }}
      />
    </aside>
  )
}
