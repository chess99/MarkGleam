import { useState } from 'react'
import {
  CheckCircle2,
  Clipboard,
  Download,
  FileArchive,
  FileImage,
  FileText,
  LoaderCircle,
} from 'lucide-react'
import { t } from '../i18n'
import { trackEvent } from '../lib/analytics'
import { runExport } from '../lib/export'
import { useAppStore } from '../store'
import type { ExportFormat } from '../types'
import { Field } from './Field'
import { Modal } from './Modal'

const formatMeta: {
  id: ExportFormat
  icon: typeof FileImage
  label: string
}[] = [
  { id: 'png', icon: FileImage, label: 'PNG' },
  { id: 'jpeg', icon: FileImage, label: 'JPEG' },
  { id: 'webp', icon: FileImage, label: 'WebP' },
  { id: 'svg', icon: FileText, label: 'SVG' },
  { id: 'pdf', icon: FileText, label: 'PDF' },
  { id: 'clipboard', icon: Clipboard, label: 'Clipboard' },
  { id: 'split-zip', icon: FileArchive, label: 'ZIP parts' },
]

interface ExportDialogProps {
  surface: HTMLElement
  onClose: () => void
  onToast: (message: string, kind?: 'success' | 'error') => void
}

export function ExportDialog({ surface, onClose, onToast }: ExportDialogProps) {
  const locale = useAppStore((state) => state.locale)
  const config = useAppStore((state) => state.export)
  const updateExport = useAppStore((state) => state.updateExport)
  const [exporting, setExporting] = useState(false)
  const [done, setDone] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    setDone(false)
    try {
      const result = await runExport(surface, config)
      trackEvent('export_completed', {
        requested_format: config.format,
        delivered_format: result.format,
        scale: config.scale,
        parts: result.parts ?? 1,
      })
      setDone(true)
      if (config.format === 'clipboard' && result.format === 'png') {
        onToast(t(locale, 'copyFallback'))
      } else {
        onToast(
          `${t(locale, 'exportSuccess')} · ${result.filename}${
            result.parts && result.parts > 1 ? ` (${result.parts})` : ''
          }`,
          'success',
        )
      }
    } catch (error) {
      console.error(error)
      onToast(t(locale, 'exportFailed'), 'error')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Modal
      title={t(locale, 'export')}
      onClose={onClose}
      closeLabel={t(locale, 'close')}
      wide
    >
      <div className="export-dialog-grid">
        <section>
          <div className="section-heading">{t(locale, 'exportFormat')}</div>
          <div className="export-format-list">
            {formatMeta.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                type="button"
                className={config.format === id ? 'active' : ''}
                onClick={() => updateExport({ format: id })}
              >
                <Icon size={18} />
                <span>
                  {id === 'clipboard'
                    ? t(locale, 'copyImage')
                    : id === 'split-zip'
                      ? locale === 'zh-CN'
                        ? '长图分片 ZIP'
                        : 'Sliced ZIP'
                      : label}
                </span>
                {config.format === id && <CheckCircle2 size={16} />}
              </button>
            ))}
          </div>
        </section>

        <section className="export-options">
          <Field label={t(locale, 'filename')}>
            <input
              type="text"
              value={config.filename}
              onChange={(event) => updateExport({ filename: event.target.value })}
            />
          </Field>
          <Field label={t(locale, 'scale')} value={`${config.scale}×`}>
            <div className="segmented">
              {[1, 2, 3].map((scale) => (
                <button
                  key={scale}
                  type="button"
                  className={config.scale === scale ? 'active' : ''}
                  onClick={() => updateExport({ scale: scale as 1 | 2 | 3 })}
                >
                  {scale}×
                </button>
              ))}
            </div>
          </Field>
          {['jpeg', 'webp'].includes(config.format) && (
            <Field
              label={t(locale, 'quality')}
              value={`${Math.round(config.quality * 100)}%`}
            >
              <input
                type="range"
                min="0.5"
                max="1"
                step="0.01"
                value={config.quality}
                onChange={(event) =>
                  updateExport({ quality: Number(event.target.value) })
                }
              />
            </Field>
          )}
          {config.format === 'pdf' && (
            <>
              <div className="section-heading">{t(locale, 'pdfSettings')}</div>
              <Field label={t(locale, 'paper')}>
                <select
                  value={config.pdfSize}
                  onChange={(event) =>
                    updateExport({ pdfSize: event.target.value as 'a4' | 'letter' })
                  }
                >
                  <option value="a4">A4</option>
                  <option value="letter">Letter</option>
                </select>
              </Field>
              <Field label={t(locale, 'orientation')}>
                <div className="segmented">
                  {(['portrait', 'landscape'] as const).map((orientation) => (
                    <button
                      key={orientation}
                      type="button"
                      className={config.pdfOrientation === orientation ? 'active' : ''}
                      onClick={() => updateExport({ pdfOrientation: orientation })}
                    >
                      {t(locale, orientation)}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label={t(locale, 'margin')} value={`${config.pdfMargin}mm`}>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={config.pdfMargin}
                  onChange={(event) =>
                    updateExport({ pdfMargin: Number(event.target.value) })
                  }
                />
              </Field>
            </>
          )}
          {config.format === 'split-zip' && (
            <Field
              label={t(locale, 'splitHeight')}
              value={`${config.splitHeight}px`}
            >
              <input
                type="range"
                min="1600"
                max="7000"
                step="100"
                value={config.splitHeight}
                onChange={(event) =>
                  updateExport({ splitHeight: Number(event.target.value) })
                }
              />
            </Field>
          )}

          <div className="export-summary">
            <span>{t(locale, 'exportHint')}</span>
            <b>{t(locale, 'localOnly')}</b>
          </div>
          <button
            className="primary-button export-now"
            type="button"
            disabled={exporting}
            onClick={() => void handleExport()}
          >
            {exporting ? (
              <>
                <LoaderCircle className="spin" size={18} />
                {t(locale, 'exporting')}
              </>
            ) : done ? (
              <>
                <CheckCircle2 size={18} />
                {t(locale, 'exportSuccess')}
              </>
            ) : (
              <>
                <Download size={18} />
                {config.format === 'clipboard'
                  ? t(locale, 'copyImage')
                  : t(locale, 'download')}
              </>
            )}
          </button>
        </section>
      </div>
    </Modal>
  )
}
