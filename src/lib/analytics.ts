const GOOGLE_MEASUREMENT_ID =
  import.meta.env.VITE_GOOGLE_MEASUREMENT_ID || 'G-XRTY7G7G3Y'
const BAIDU_SITE_ID =
  import.meta.env.VITE_BAIDU_ANALYTICS_ID ||
  '771a2878fa58bca1d5d31f597f9315be'

type AnalyticsValue = string | number | boolean
type AnalyticsProperties = Record<string, AnalyticsValue>

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
    _hmt?: unknown[][]
  }
}

let initialized = false

const isLocalPreview = () =>
  ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)

const appendAsyncScript = (src: string) => {
  if (document.querySelector(`script[src="${src}"]`)) return
  const script = document.createElement('script')
  script.async = true
  script.src = src
  document.head.appendChild(script)
}

const initializeAnalytics = () => {
  if (initialized || isLocalPreview()) return
  initialized = true

  window.dataLayer = window.dataLayer || []
  window.gtag = (...args: unknown[]) => {
    window.dataLayer?.push(args)
  }
  window.gtag('js', new Date())
  window.gtag('config', GOOGLE_MEASUREMENT_ID, {
    send_page_view: true,
  })
  appendAsyncScript(
    `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_MEASUREMENT_ID}`,
  )

  window._hmt = window._hmt || []
  appendAsyncScript(`https://hm.baidu.com/hm.js?${BAIDU_SITE_ID}`)
}

const initializeWhenIdle = () => {
  if (window.requestIdleCallback) {
    window.requestIdleCallback(initializeAnalytics, { timeout: 4000 })
    return
  }
  window.setTimeout(initializeAnalytics, 1500)
}

export const scheduleAnalytics = () => {
  if (!import.meta.env.PROD || isLocalPreview()) return
  if (document.readyState === 'complete') {
    initializeWhenIdle()
    return
  }
  window.addEventListener('load', initializeWhenIdle, { once: true })
}

export const trackEvent = (
  name: string,
  properties: AnalyticsProperties = {},
) => {
  if (import.meta.env.PROD && !isLocalPreview()) initializeAnalytics()
  window.gtag?.('event', name, properties)
  window._hmt?.push([
    '_trackEvent',
    'product',
    name,
    JSON.stringify(properties),
  ])
}
