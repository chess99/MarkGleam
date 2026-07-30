import { useEffect, useRef, useState } from 'react'
import {
  CheckCircle2,
  Clipboard,
  Download,
  FileArchive,
  FileImage,
  FileText,
  LoaderCircle,
  Printer,
  X,
} from 'lucide-react'
import { t } from '../i18n'
import { trackEvent } from '../lib/analytics'
import { runExport, type ExportProgress } from '../lib/export'
import { suggestFilename } from '../lib/filename'
import { runPrint } from '../lib/print'
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
  { id: 'print', icon: Printer, label: 'Print' },
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
  const markdown = useAppStore((state) => state.markdown)
  const config = useAppStore((state) => state.export)
  const updateExport = useAppStore((state) => state.updateExport)
  const filenameInitialized = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState<ExportProgress>()
  const [optimizeLongPdf, setOptimizeLongPdf] = useState(true)
  const [preservePrintBackground, setPreservePrintBackground] = useState(false)
  const [completedFingerprint, setCompletedFingerprint] = useState<string>()
  const exportFingerprint = JSON.stringify([config, markdown])
  const done = completedFingerprint === exportFingerprint

  useEffect(() => {
    if (filenameInitialized.current) return
    filenameInitialized.current = true
    if (
      !config.filename.trim() ||
      config.filename === 'md2img' ||
      config.filename === 'markgleam'
    ) {
      updateExport({ filename: suggestFilename(markdown) })
    }
  }, [config.filename, markdown, updateExport])

  useEffect(
    () => () => {
      abortControllerRef.current?.abort()
    },
    [],
  )

  const changeExport = (patch: Parameters<typeof updateExport>[0]) => {
    updateExport(patch)
  }

  const handleExport = async () => {
    const controller = new AbortController()
    abortControllerRef.current = controller
    setExporting(true)
    setProgress(undefined)
    setCompletedFingerprint(undefined)
    try {
      if (config.format === 'print') {
        await runPrint(surface, config, {
          preserveBackground: preservePrintBackground,
        })
        trackEvent('export_completed', {
          requested_format: 'print',
          delivered_format: 'print',
          scale: 1,
          parts: 1,
        })
        onToast(t(locale, 'printDialogOpened'))
        return
      }

      const result = await runExport(surface, config, {
        signal: controller.signal,
        onProgress: setProgress,
        optimizeLongPdf,
      })
      trackEvent('export_completed', {
        requested_format: config.format,
        delivered_format: result.format,
        scale: config.scale,
        parts: result.parts ?? 1,
      })
      setCompletedFingerprint(exportFingerprint)
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
      if (controller.signal.aborted) return
      console.error(error)
      onToast(t(locale, 'exportFailed'), 'error')
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
      }
      setExporting(false)
      setProgress(undefined)
    }
  }

  const cancelExport = () => {
    abortControllerRef.current?.abort()
  }

  const progressPercent = progress
    ? Math.round((progress.completed / Math.max(1, progress.total)) * 100)
    : 0

  return (
    <Modal
      title={t(locale, 'export')}
      onClose={onClose}
      closeLabel={t(locale, 'close')}
      wide
      stableHeight
    >
      <div className="export-dialog-grid">
        <section>
          <div className="section-heading">{t(locale, 'exportFormat')}</div>
          <div className="export-format-list">
            {formatMeta.map(({ id, icon: Icon, label }) => {
              const optionLabel =
                id === 'clipboard'
                  ? t(locale, 'copyImage')
                  : id === 'split-zip'
                    ? locale === 'zh-CN'
                      ? '长图分片 ZIP'
                      : 'Sliced ZIP'
                    : id === 'pdf'
                      ? t(locale, 'visualPdf')
                      : id === 'print'
                        ? t(locale, 'printPdf')
                        : label
              const optionSummary =
                id === 'pdf'
                  ? t(locale, 'visualPdfSummary')
                  : id === 'print'
                    ? t(locale, 'printPdfSummary')
                    : undefined

              return (
                <button
                  key={id}
                  type="button"
                  data-format={id}
                  className={config.format === id ? 'active' : ''}
                  onClick={() => changeExport({ format: id })}
                >
                  <Icon size={18} />
                  <span className="export-format-copy">
                    <span>{optionLabel}</span>
                    {optionSummary && <small>{optionSummary}</small>}
                  </span>
                  {config.format === id && <CheckCircle2 size={16} />}
                </button>
              )
            })}
          </div>
        </section>

        <section className="export-options">
          <Field label={t(locale, 'filename')}>
            <input
              type="text"
              value={config.filename}
              onChange={(event) =>
                changeExport({ filename: event.target.value })
              }
            />
          </Field>
          {config.format !== 'print' && (
            <Field label={t(locale, 'scale')} value={`${config.scale}×`}>
              <div className="segmented">
                {[1, 2, 3].map((scale) => (
                  <button
                    key={scale}
                    type="button"
                    className={config.scale === scale ? 'active' : ''}
                    onClick={() => changeExport({ scale: scale as 1 | 2 | 3 })}
                  >
                    {scale}×
                  </button>
                ))}
              </div>
            </Field>
          )}
          {['jpeg', 'webp', 'pdf'].includes(config.format) && (
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
                  changeExport({ quality: Number(event.target.value) })
                }
              />
            </Field>
          )}
          {['pdf', 'print'].includes(config.format) && (
            <>
              <div className="section-heading">
                {t(locale, config.format === 'print' ? 'printSettings' : 'pdfSettings')}
              </div>
              <Field label={t(locale, 'paper')}>
                <select
                  value={config.pdfSize}
                  onChange={(event) =>
                    changeExport({ pdfSize: event.target.value as 'a4' | 'letter' })
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
                      onClick={() => changeExport({ pdfOrientation: orientation })}
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
                    changeExport({ pdfMargin: Number(event.target.value) })
                  }
                />
              </Field>
              {config.format === 'pdf' ? (
                <>
                  <Field label={t(locale, 'pdfHeader')}>
                    <input
                      type="text"
                      value={config.pdfHeader}
                      placeholder={locale === 'zh-CN' ? '可留空' : 'Optional'}
                      onChange={(event) =>
                        changeExport({ pdfHeader: event.target.value })
                      }
                    />
                  </Field>
                  <Field label={t(locale, 'pdfFooter')}>
                    <input
                      type="text"
                      value={config.pdfFooter}
                      placeholder={locale === 'zh-CN' ? '可留空' : 'Optional'}
                      onChange={(event) =>
                        changeExport({ pdfFooter: event.target.value })
                      }
                    />
                  </Field>
                  <label className="toggle-row pdf-optimization-toggle">
                    <span>{t(locale, 'pdfPageNumbers')}</span>
                    <input
                      type="checkbox"
                      checked={config.pdfPageNumbers}
                      onChange={(event) =>
                        changeExport({ pdfPageNumbers: event.target.checked })
                      }
                    />
                  </label>
                  <label className="toggle-row pdf-optimization-toggle">
                    <span>{t(locale, 'optimizeLongPdf')}</span>
                    <input
                      type="checkbox"
                      checked={optimizeLongPdf}
                      onChange={(event) => setOptimizeLongPdf(event.target.checked)}
                    />
                  </label>
                  <p className="export-optimization-hint">
                    {t(locale, 'optimizeLongPdfHint')}
                  </p>
                </>
              ) : (
                <>
                  <label className="toggle-row pdf-optimization-toggle">
                    <span>{t(locale, 'preservePrintBackground')}</span>
                    <input
                      type="checkbox"
                      checked={preservePrintBackground}
                      onChange={(event) =>
                        setPreservePrintBackground(event.target.checked)
                      }
                    />
                  </label>
                  <p className="export-optimization-hint">
                    {t(locale, 'printHint')}
                  </p>
                </>
              )}
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
                  changeExport({ splitHeight: Number(event.target.value) })
                }
              />
            </Field>
          )}

          <div className="export-summary">
            <span>{t(locale, 'exportHint')}</span>
            <b>{t(locale, 'localOnly')}</b>
            {progress && (
              <div
                className="export-progress"
                role="progressbar"
                aria-label={t(locale, 'exporting')}
                aria-valuemin={0}
                aria-valuemax={progress.total}
                aria-valuenow={progress.completed}
              >
                <span>
                  {locale === 'zh-CN' ? '页面进度' : 'Page progress'}
                  <b>
                    {progress.completed} / {progress.total}
                  </b>
                </span>
                <i style={{ width: `${progressPercent}%` }} />
              </div>
            )}
          </div>
          <p className="export-signature-notice">
            {t(locale, 'exportSignatureNotice')}
          </p>
          <button
            className={`primary-button export-now ${exporting ? 'is-cancel' : ''}`}
            type="button"
            onClick={() => {
              if (exporting) cancelExport()
              else void handleExport()
            }}
          >
            {exporting ? (
              <>
                {progress ? <X size={18} /> : <LoaderCircle className="spin" size={18} />}
                {t(locale, 'cancelExport')}
              </>
            ) : done ? (
              <>
                <CheckCircle2 size={18} />
                {t(locale, 'exportSuccess')}
              </>
            ) : (
              <>
                {config.format === 'print' ? (
                  <Printer size={18} />
                ) : (
                  <Download size={18} />
                )}
                {config.format === 'clipboard'
                  ? t(locale, 'copyImage')
                  : config.format === 'print'
                    ? t(locale, 'printPdf')
                  : t(locale, 'download')}
              </>
            )}
          </button>
        </section>
      </div>
    </Modal>
  )
}
