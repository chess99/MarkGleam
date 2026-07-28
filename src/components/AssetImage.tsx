import { useEffect, useState, type ImgHTMLAttributes } from 'react'
import { loadAssetUrl, parseAssetUrl } from '../lib/assets'
import { useAppStore } from '../store'
import { t } from '../i18n'

export function AssetImage({
  src,
  alt,
  title,
  className,
}: ImgHTMLAttributes<HTMLImageElement>) {
  const locale = useAppStore((state) => state.locale)
  const [assetState, setAssetState] = useState<{
    src?: string
    resolved?: string
    failed: boolean
  }>({ failed: false })
  const assetId = parseAssetUrl(src)

  useEffect(() => {
    let objectUrl: string | undefined
    if (!assetId) return

    loadAssetUrl(assetId).then((url) => {
      objectUrl = url
      setAssetState({ src, resolved: url, failed: !url })
    })

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [assetId, src])

  const stateForCurrentSrc = assetState.src === src ? assetState : undefined
  const failed = stateForCurrentSrc?.failed ?? false
  const resolvedSrc = assetId ? stateForCurrentSrc?.resolved : src

  if (failed) {
    return <span className="image-error">{t(locale, 'remoteImageError')}</span>
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt ?? ''}
      title={title}
      className={className}
      data-md2img-asset-id={assetId || undefined}
      crossOrigin={src?.startsWith('http') ? 'anonymous' : undefined}
      onError={() => setAssetState({ src, resolved: resolvedSrc, failed: true })}
    />
  )
}
