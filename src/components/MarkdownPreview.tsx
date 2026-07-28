import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from 'react'
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import type { Components } from 'react-markdown'
import { getTheme } from '../data/themes'
import { loadAssetUrl } from '../lib/assets'
import { scopeCustomCss } from '../lib/css'
import { useAppStore } from '../store'
import { AssetImage } from './AssetImage'
import { MermaidBlock } from './MermaidBlock'

interface MarkdownPreviewProps {
  surfaceRef: React.RefObject<HTMLDivElement | null>
  onSurfaceReady?: (surface: HTMLDivElement) => void
  onHeightChange?: (height: number) => void
}

const remarkPlugins = [remarkGfm, remarkMath]
type RehypePlugin = NonNullable<
  ComponentProps<typeof ReactMarkdown>['rehypePlugins']
>[number]

const containsMath = (markdown: string) =>
  /(^|[^\\])\${1,2}(?!\s)[\s\S]*?\${1,2}/m.test(markdown)

const containsHighlightedCode = (markdown: string) =>
  /^```(?!mermaid(?:\s|$))[\w-]+/m.test(markdown)

const markdownUrlTransform = (url: string) =>
  url.startsWith('md2img-asset://') ? url : defaultUrlTransform(url)

const markdownComponents = {
  img: AssetImage,
  hr: () => <hr data-page-break />,
  code({ className, children, ...props }) {
    const language = /language-([\w-]+)/.exec(className ?? '')?.[1]
    const content = String(children).replace(/\n$/, '')
    if (language === 'mermaid') {
      return <MermaidBlock chart={content} />
    }
    return (
      <code className={className} {...props}>
        {children}
      </code>
    )
  },
} satisfies Components

export function MarkdownPreview({
  surfaceRef,
  onSurfaceReady,
  onHeightChange,
}: MarkdownPreviewProps) {
  const markdown = useAppStore((state) => state.markdown)
  const themeId = useAppStore((state) => state.themeId)
  const canvas = useAppStore((state) => state.canvas)
  const customCss = useAppStore((state) => state.customCss)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [surfaceHeight, setSurfaceHeight] = useState(canvas.minHeight)
  const [scopedCss, setScopedCss] = useState('')
  const [backgroundAsset, setBackgroundAsset] = useState<{
    id: string
    url?: string
  }>()
  const [katexPlugin, setKatexPlugin] = useState<RehypePlugin>()
  const [highlightPlugin, setHighlightPlugin] = useState<RehypePlugin>()
  const theme = useMemo(() => getTheme(themeId), [themeId])
  const needsKatex = useMemo(() => containsMath(markdown), [markdown])
  const needsHighlight = useMemo(
    () => containsHighlightedCode(markdown),
    [markdown],
  )
  const rehypePlugins = useMemo(
    () =>
      [
        needsKatex ? katexPlugin : undefined,
        needsHighlight ? highlightPlugin : undefined,
      ].filter(Boolean) as NonNullable<
        ComponentProps<typeof ReactMarkdown>['rehypePlugins']
      >,
    [highlightPlugin, katexPlugin, needsHighlight, needsKatex],
  )

  useEffect(() => {
    if (!needsKatex || katexPlugin) return
    let active = true
    void import('rehype-katex').then(({ default: plugin }) => {
      if (active) setKatexPlugin(() => plugin)
    })
    return () => {
      active = false
    }
  }, [katexPlugin, needsKatex])

  useEffect(() => {
    if (!needsHighlight || highlightPlugin) return
    let active = true
    void import('rehype-highlight').then(({ default: plugin }) => {
      if (active) setHighlightPlugin(() => plugin)
    })
    return () => {
      active = false
    }
  }, [highlightPlugin, needsHighlight])

  useEffect(() => {
    scopeCustomCss(customCss).then(setScopedCss)
  }, [customCss])

  useEffect(() => {
    const assetId = canvas.backgroundAssetId
    if (!assetId) return
    let active = true
    let currentUrl: string | undefined
    loadAssetUrl(assetId)
      .then((url) => {
        if (!active) {
          if (url) URL.revokeObjectURL(url)
          return
        }
        currentUrl = url
        setBackgroundAsset({ id: assetId, url })
      })
      .catch(() => {
        if (active) setBackgroundAsset({ id: assetId })
      })
    return () => {
      active = false
      if (currentUrl) URL.revokeObjectURL(currentUrl)
    }
  }, [canvas.backgroundAssetId])

  useEffect(() => {
    let active = true
    let fontUrl: string | undefined
    let fontFace: FontFace | undefined
    if (!canvas.customFontAssetId) return

    loadAssetUrl(canvas.customFontAssetId)
      .then(async (url) => {
        if (!url) return
        if (!active) {
          URL.revokeObjectURL(url)
          return
        }
        fontUrl = url
        fontFace = new FontFace('MD2IMG Custom', `url(${url})`)
        await fontFace.load()
        if (active) document.fonts.add(fontFace)
      })
      .catch(() => undefined)

    return () => {
      active = false
      if (fontFace) document.fonts.delete(fontFace)
      if (fontUrl) URL.revokeObjectURL(fontUrl)
    }
  }, [canvas.customFontAssetId])

  useEffect(() => {
    const container = containerRef.current
    const surface = surfaceRef.current
    if (!container || !surface) return

    const update = () => {
      const available = Math.max(280, container.clientWidth - 64)
      setScale(Math.min(1, available / canvas.width))
      setSurfaceHeight(surface.scrollHeight)
      onHeightChange?.(surface.scrollHeight)
    }

    const observer = new ResizeObserver(update)
    observer.observe(container)
    observer.observe(surface)
    update()
    return () => observer.disconnect()
  }, [canvas.width, canvas.minHeight, onHeightChange, surfaceRef])

  const backgroundUrl =
    backgroundAsset && backgroundAsset.id === canvas.backgroundAssetId
      ? backgroundAsset.url
      : undefined

  const style = {
    '--theme-surface': canvas.transparent ? 'transparent' : theme.surface,
    '--theme-text': theme.text,
    '--theme-muted': theme.muted,
    '--theme-accent': theme.accent,
    '--theme-accent-soft': theme.accentSoft,
    '--theme-border': theme.border,
    '--theme-code': theme.codeBackground,
    '--theme-heading-font': canvas.customFontAssetId
      ? '"MD2IMG Custom", sans-serif'
      : theme.headingFont,
    '--theme-body-font': canvas.customFontAssetId
      ? '"MD2IMG Custom", sans-serif'
      : theme.bodyFont,
    '--content-font-size': `${canvas.fontSize}px`,
    '--content-line-height': canvas.lineHeight,
    '--canvas-radius': `${canvas.cornerRadius}px`,
    width: `${canvas.width}px`,
    minHeight: `${canvas.minHeight}px`,
    padding: `${canvas.paddingY}px ${canvas.paddingX}px`,
    backgroundColor: canvas.transparent
      ? 'transparent'
      : canvas.backgroundColor,
    backgroundImage: !canvas.transparent && backgroundUrl
      ? `linear-gradient(${canvas.backgroundColor}d9, ${canvas.backgroundColor}d9), url("${backgroundUrl}")`
      : undefined,
  } as React.CSSProperties

  return (
    <div className="preview-container" ref={containerRef}>
      <div
        className="preview-spacer"
        style={{
          width: `${canvas.width * scale}px`,
          height: `${surfaceHeight * scale}px`,
        }}
      >
        <div
          className="preview-scaler"
          style={{ transform: `scale(${scale})`, width: `${canvas.width}px` }}
        >
          <div
            ref={(node) => {
              surfaceRef.current = node
              if (node) onSurfaceReady?.(node)
            }}
            id="md2img-export-surface"
            className={`export-surface ${canvas.shadow ? 'has-shadow' : ''}`}
            style={style}
            data-testid="export-surface"
            data-md2img-background-asset-id={canvas.backgroundAssetId}
          >
            {scopedCss && <style>{scopedCss}</style>}
            <article className="markdown-body" data-export-content>
              <ReactMarkdown
                remarkPlugins={remarkPlugins}
                rehypePlugins={rehypePlugins}
                components={markdownComponents}
                urlTransform={markdownUrlTransform}
              >
                {markdown}
              </ReactMarkdown>
            </article>
          </div>
        </div>
      </div>
    </div>
  )
}
