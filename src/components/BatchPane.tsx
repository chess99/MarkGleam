import JSZip from 'jszip'
import { FileArchive, FilePlus2, LoaderCircle, Play, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { downloadBlob, generateImageArtifact } from '../lib/export'
import { sanitizeFilename } from '../lib/css'
import { useAppStore } from '../store'
import type { Locale } from '../types'
import { MarkdownPreview } from './MarkdownPreview'

type BatchStatus = 'ready' | 'rendering' | 'done' | 'error'

interface BatchItem {
  id: string
  file: File
  status: BatchStatus
  error?: string
}

const MAX_FILES = 30
const MAX_FILE_BYTES = 2 * 1024 * 1024
const MAX_TOTAL_BYTES = 15 * 1024 * 1024

const batchCopy: Record<
  Locale,
  {
    limits: string
    files: string
    chooseFiles: string
    dropFiles: string
    dropHint: string
    choose: string
    rendering: string
    done: string
    exportZip: string
    stop: (completed: number, total: number) => string
    complete: (succeeded: number, failed: number) => string
  }
> = {
  'zh-CN': {
    limits: '最多 30 个 Markdown 文件；单个不超过 2 MB，总计不超过 15 MB。',
    files: '批量文件',
    chooseFiles: '选择 Markdown 文件',
    dropFiles: '选择或拖入多个 Markdown 文件',
    dropHint: '最多 30 个，统一导出为 PNG ZIP',
    choose: '选择文件',
    rendering: '渲染中',
    done: '完成',
    exportZip: '导出 PNG ZIP',
    stop: (completed, total) => `停止（${completed}/${total}）`,
    complete: (succeeded, failed) =>
      `批量导出完成：成功 ${succeeded} 个，失败 ${failed} 个。`,
  },
  en: {
    limits: 'Use up to 30 Markdown files, 2 MB each and 15 MB in total.',
    files: 'Batch files',
    chooseFiles: 'Choose Markdown files',
    dropFiles: 'Choose or drop Markdown files',
    dropHint: 'Up to 30 files, exported as one PNG ZIP',
    choose: 'Choose files',
    rendering: 'Rendering',
    done: 'Done',
    exportZip: 'Export PNG ZIP',
    stop: (completed, total) => `Stop (${completed}/${total})`,
    complete: (succeeded, failed) =>
      `Batch complete: ${succeeded} succeeded, ${failed} failed.`,
  },
  ja: {
    limits: 'Markdown は最大 30 ファイル、1件 2 MB、合計 15 MB までです。',
    files: '一括ファイル',
    chooseFiles: 'Markdown ファイルを選択',
    dropFiles: '複数の Markdown ファイルを選択またはドロップ',
    dropHint: '最大 30 ファイルを一つの PNG ZIP に書き出します',
    choose: 'ファイルを選択',
    rendering: '描画中',
    done: '完了',
    exportZip: 'PNG ZIP を書き出し',
    stop: (completed, total) => `停止（${completed}/${total}）`,
    complete: (succeeded, failed) =>
      `一括書き出し完了：成功 ${succeeded} 件、失敗 ${failed} 件。`,
  },
}

const nextFrame = () =>
  new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  )

const uniqueName = (preferred: string, used: Set<string>) => {
  let candidate = preferred
  let suffix = 2
  while (used.has(candidate.toLowerCase())) {
    const extensionAt = preferred.lastIndexOf('.')
    const base = extensionAt > 0 ? preferred.slice(0, extensionAt) : preferred
    const extension = extensionAt > 0 ? preferred.slice(extensionAt) : ''
    candidate = `${base}-${suffix}${extension}`
    suffix += 1
  }
  used.add(candidate.toLowerCase())
  return candidate
}

export function BatchPane({
  locale,
  onPreview,
  onToast,
}: {
  locale: Locale
  onPreview: (source: string) => void
  onToast: (message: string, kind?: 'success' | 'error') => void
}) {
  const labels = batchCopy[locale]
  const exportConfig = useAppStore((state) => state.export)
  const [items, setItems] = useState<BatchItem[]>([])
  const [renderSource, setRenderSource] = useState('')
  const [running, setRunning] = useState(false)
  const [completed, setCompleted] = useState(0)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const canceledRef = useRef(false)

  const addFiles = (files: File[]) => {
    const markdownFiles = files.filter(
      (file) =>
        /\.md(?:own)?$/i.test(file.name) ||
        file.type === 'text/markdown' ||
        file.type === 'text/plain',
    )
    const candidates = [...items.map((item) => item.file), ...markdownFiles]
    const accepted: File[] = []
    let acceptedBytes = 0
    for (const file of candidates) {
      if (
        accepted.length >= MAX_FILES ||
        file.size > MAX_FILE_BYTES ||
        acceptedBytes + file.size > MAX_TOTAL_BYTES
      ) {
        continue
      }
      accepted.push(file)
      acceptedBytes += file.size
    }
    if (
      markdownFiles.length !== files.length ||
      accepted.length !== candidates.length
    ) {
      onToast(
        labels.limits,
        'error',
      )
    }
    setItems(
      accepted.map((file, index) => ({
          id: `${file.name}-${file.lastModified}-${index}`,
          file,
          status: 'ready' as const,
        })),
    )
  }

  const updateItem = (id: string, patch: Partial<BatchItem>) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    )
  }

  const runBatch = async () => {
    if (!items.length || running) return
    canceledRef.current = false
    setRunning(true)
    setCompleted(0)
    setItems((current) =>
      current.map((item) => ({ ...item, status: 'ready', error: undefined })),
    )
    const zip = new JSZip()
    const usedNames = new Set<string>()
    const errors: string[] = []

    for (const item of items) {
      if (canceledRef.current) break
      updateItem(item.id, { status: 'rendering', error: undefined })
      try {
        const source = await item.file.text()
        setRenderSource(source)
        await nextFrame()
        const surface = surfaceRef.current
        if (!surface) throw new Error('Render surface is unavailable')
        const base = sanitizeFilename(item.file.name.replace(/\.[^.]+$/, ''))
        const artifact = await generateImageArtifact(
          surface,
          { ...exportConfig, filename: base, format: 'png' },
          'png',
        )
        const filename = uniqueName(artifact.filename, usedNames)
        zip.file(filename, artifact.blob)
        updateItem(item.id, { status: 'done' })
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        errors.push(`${item.file.name}: ${reason}`)
        updateItem(item.id, { status: 'error', error: reason })
      }
      setCompleted((value) => value + 1)
    }

    try {
      if (!canceledRef.current) {
        if (errors.length) zip.file('errors.txt', errors.join('\n'))
        const blob = await zip.generateAsync({ type: 'blob' })
        downloadBlob(blob, 'markgleam-batch.zip')
        onToast(
          labels.complete(items.length - errors.length, errors.length),
          errors.length ? 'error' : 'success',
        )
      }
    } finally {
      setRunning(false)
    }
  }

  return (
    <section className="pane editor-pane batch-pane" aria-label={labels.files}>
      <header className="pane-header">
        <div className="pane-title">
          <span className="pane-icon pane-icon-coral" aria-hidden="true">
            <FileArchive size={17} />
          </span>
          <span>{labels.files}</span>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label={labels.chooseFiles}
          onClick={() => inputRef.current?.click()}
        >
          <FilePlus2 size={17} />
        </button>
      </header>

      <div
        className="batch-dropzone"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          addFiles([...event.dataTransfer.files])
        }}
      >
        <FilePlus2 size={24} />
        <b>{labels.dropFiles}</b>
        <span>{labels.dropHint}</span>
        <button type="button" onClick={() => inputRef.current?.click()}>
          {labels.choose}
        </button>
      </div>

      <div className="batch-list" role="list">
        {items.map((item) => (
          <button
            type="button"
            role="listitem"
            key={item.id}
            className={`batch-item batch-${item.status}`}
            onClick={() => void item.file.text().then(onPreview)}
          >
            <span>{item.file.name}</span>
            <small>
              {item.status === 'rendering'
                ? labels.rendering
                : item.status === 'done'
                  ? labels.done
                  : item.status === 'error'
                    ? item.error
                    : `${Math.max(1, Math.ceil(item.file.size / 1024))} KB`}
            </small>
          </button>
        ))}
      </div>

      <div className="batch-actions">
        <button
          className={`primary-button ${running ? 'is-cancel' : ''}`}
          type="button"
          disabled={!items.length}
          onClick={() => {
            if (running) canceledRef.current = true
            else void runBatch()
          }}
        >
          {running ? <X size={17} /> : items.length ? <Play size={17} /> : <LoaderCircle size={17} />}
          {running
            ? labels.stop(completed, items.length)
            : labels.exportZip}
        </button>
      </div>

      <input
        ref={inputRef}
        hidden
        multiple
        type="file"
        accept=".md,.markdown,text/markdown,text/plain"
        onChange={(event) => {
          addFiles(event.target.files ? [...event.target.files] : [])
          event.target.value = ''
        }}
      />

      <div className="batch-render-host" aria-hidden="true">
        <MarkdownPreview
          surfaceRef={surfaceRef}
          source={renderSource}
          inputKind="markdown"
          surfaceId="md2img-batch-export-surface"
        />
      </div>
    </section>
  )
}
