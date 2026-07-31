import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const distRoot = join(projectRoot, 'dist')
const siteOrigin = 'https://markgleam.com'
const baseManifest = JSON.parse(
  await readFile(join(projectRoot, 'src/data/toolPages.json'), 'utf8'),
)
const japanesePages = JSON.parse(
  await readFile(join(projectRoot, 'src/data/toolPages.ja.json'), 'utf8'),
)
const manifest = baseManifest.map((page) => {
  const japanese = japanesePages[page.id]
  if (!japanese) throw new Error(`Missing Japanese content for ${page.id}`)
  return {
    ...page,
    jaPath: page.enPath.replace(/^\/en\//, '/ja/'),
    title: { ...page.title, ja: japanese.title },
    description: { ...page.description, ja: japanese.description },
    h1: { ...page.h1, ja: japanese.h1 },
    intro: { ...page.intro, ja: japanese.intro },
    steps: { ...page.steps, ja: japanese.steps },
    limitations: { ...page.limitations, ja: japanese.limitations },
    sample: { ...page.sample, ja: japanese.sample },
    schemaFeatures: { ...page.schemaFeatures, ja: japanese.schemaFeatures },
  }
})
const template = await readFile(join(distRoot, 'index.html'), 'utf8')

const locales = ['zh-CN', 'en', 'ja']
const localeConfig = {
  'zh-CN': {
    language: 'zh-CN',
    ogLocale: 'zh_CN',
    label: '简体中文',
    stepsTitle: '使用步骤',
    limitsTitle: '使用限制',
    sampleTitle: '输入示例',
    tagline: '本地处理 · 免费使用',
    toolsLabel: '工具页面',
    noScript: 'MarkGleam 需要启用 JavaScript；文档、图片与导出处理均在你的浏览器本地完成。',
    interfaceSuffix: '工具界面',
  },
  en: {
    language: 'en',
    ogLocale: 'en_US',
    label: 'English',
    stepsTitle: 'How to use it',
    limitsTitle: 'Limitations',
    sampleTitle: 'Input example',
    tagline: 'Local processing · Free to use',
    toolsLabel: 'Tools',
    noScript: 'MarkGleam requires JavaScript. Documents, images and exports are processed locally in your browser.',
    interfaceSuffix: 'interface',
  },
  ja: {
    language: 'ja',
    ogLocale: 'ja_JP',
    label: '日本語',
    stepsTitle: '使い方',
    limitsTitle: '制限事項',
    sampleTitle: '入力例',
    tagline: 'ローカル処理 · 無料で利用',
    toolsLabel: 'ツール',
    noScript: 'MarkGleam を利用するには JavaScript が必要です。文書、画像、書き出し処理はブラウザ内で完結します。',
    interfaceSuffix: 'ツール画面',
  },
}

const localizedPath = (page, locale) =>
  locale === 'zh-CN' ? page.path : locale === 'en' ? page.enPath : page.jaPath

const escapeHtml = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const localized = (page, locale) => ({
  title: page.title[locale],
  description: page.description[locale],
  h1: page.h1[locale],
  intro: page.intro[locale],
  steps: page.steps[locale],
  limitations: page.limitations[locale],
  sample: page.sample[locale],
  schemaFeatures: page.schemaFeatures[locale],
})

const absoluteUrl = (path) => new URL(path, siteOrigin).href

const outputFile = (path) =>
  path === '/' ? join(distRoot, 'index.html') : join(distRoot, path, 'index.html')

const replaceRequired = (html, pattern, replacement, label) => {
  if (!pattern.test(html)) throw new Error(`Unable to replace ${label}`)
  return html.replace(pattern, replacement)
}

const renderStructuredData = (page, locale, canonical, content) => {
  const language = localeConfig[locale].language
  const app = {
    '@type': 'WebApplication',
    '@id': `${canonical}#app`,
    name: content.h1,
    url: canonical,
    description: content.description,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript and a modern web browser',
    inLanguage: language,
    isAccessibleForFree: true,
    isPartOf: { '@id': `${siteOrigin}/#website` },
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'CNY' },
    featureList: content.schemaFeatures,
  }
  const graph = [
    {
      '@type': 'WebSite',
      '@id': `${siteOrigin}/#website`,
      name: 'MarkGleam',
      url: `${siteOrigin}/`,
    },
    app,
  ]

  if (page.path !== '/') {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'MarkGleam',
          item: absoluteUrl(localizedPath(manifest[0], locale)),
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: content.h1,
          item: canonical,
        },
      ],
    })
  }

  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })
    .replaceAll('<', '\\u003c')
}

const renderStaticBody = (page, locale, content) => {
  const pages = manifest
    .map((item) => {
      const path = localizedPath(item, locale)
      return `<a href="${escapeHtml(path)}">${escapeHtml(item.h1[locale])}</a>`
    })
    .join(' · ')
  const config = localeConfig[locale]
  const languageLinks = locales
    .filter((candidate) => candidate !== locale)
    .map(
      (candidate) =>
        `<a href="${escapeHtml(localizedPath(page, candidate))}" lang="${localeConfig[candidate].language}">${localeConfig[candidate].label}</a>`,
    )
    .join(' · ')

  return {
    root: `<div id="root">
      <div class="app-bootstrap">
        <header class="app-bootstrap__bar">
          <p class="app-bootstrap__brand">MarkGleam <span>${escapeHtml(config.tagline)}</span></p>
        </header>
        <main class="app-bootstrap__main">
          <article class="app-bootstrap__copy">
            <h1>${escapeHtml(content.h1)}</h1>
            <p>${escapeHtml(content.intro)}</p>
            <section aria-labelledby="static-steps">
              <h2 id="static-steps">${escapeHtml(config.stepsTitle)}</h2>
              <ol>${content.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol>
            </section>
            <section aria-labelledby="static-limitations">
              <h2 id="static-limitations">${escapeHtml(config.limitsTitle)}</h2>
              <p>${escapeHtml(content.limitations)}</p>
            </section>
            <section aria-labelledby="static-sample">
              <h2 id="static-sample">${escapeHtml(config.sampleTitle)}</h2>
              <pre><code>${escapeHtml(content.sample)}</code></pre>
            </section>
            <nav aria-label="${config.toolsLabel}">${pages}</nav>
            <p>${languageLinks}</p>
          </article>
        </main>
      </div>
    </div>`,
    noScript: `<noscript>${escapeHtml(config.noScript)}</noscript>`,
  }
}

const renderPage = (page, locale) => {
  const content = localized(page, locale)
  const path = localizedPath(page, locale)
  const canonical = absoluteUrl(path)
  const zhUrl = absoluteUrl(page.path)
  const enUrl = absoluteUrl(page.enPath)
  const jaUrl = absoluteUrl(page.jaPath)
  const language = localeConfig[locale].language
  const ogLocale = localeConfig[locale].ogLocale
  const alternateOgLocales = locales
    .filter((candidate) => candidate !== locale)
    .map(
      (candidate) =>
        `    <meta property="og:locale:alternate" content="${localeConfig[candidate].ogLocale}" />`,
    )
    .join('\n')
  const structuredData = renderStructuredData(page, locale, canonical, content)
  const body = renderStaticBody(page, locale, content)

  let html = template
  html = replaceRequired(html, /<html lang="[^"]+">/, `<html lang="${language}">`, 'html lang')
  html = replaceRequired(html, /<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(content.title)}</title>`, 'title')
  html = replaceRequired(
    html,
    /<meta\s+name="description"\s+content="[\s\S]*?"\s*\/>/,
    `<meta name="description" content="${escapeHtml(content.description)}" />`,
    'description',
  )
  html = replaceRequired(
    html,
    /<link rel="canonical" href="[^"]+"\s*\/>/,
    `<link rel="canonical" href="${canonical}" />
    <link rel="alternate" hreflang="zh-CN" href="${zhUrl}" />
    <link rel="alternate" hreflang="en" href="${enUrl}" />
    <link rel="alternate" hreflang="ja" href="${jaUrl}" />
    <link rel="alternate" hreflang="x-default" href="${zhUrl}" />`,
    'canonical',
  )
  html = replaceRequired(html, /<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${escapeHtml(content.title)}" />`, 'og:title')
  html = replaceRequired(
    html,
    /<meta\s+property="og:description"\s+content="[\s\S]*?"\s*\/>/,
    `<meta property="og:description" content="${escapeHtml(content.description)}" />`,
    'og:description',
  )
  html = replaceRequired(html, /<meta property="og:url" content="[^"]*"\s*\/>/, `<meta property="og:url" content="${canonical}" />`, 'og:url')
  html = replaceRequired(
    html,
    /<meta property="og:image:alt" content="[^"]*"\s*\/>/,
    `<meta property="og:image:alt" content="${escapeHtml(
      `${content.h1} ${localeConfig[locale].interfaceSuffix}`,
    )}" />`,
    'og:image:alt',
  )
  html = replaceRequired(
    html,
    /<meta property="og:locale" content="[^"]*"\s*\/>/,
    `<meta property="og:locale" content="${ogLocale}" />
${alternateOgLocales}`,
    'og:locale',
  )
  html = replaceRequired(html, /<meta name="twitter:title" content="[^"]*"\s*\/>/, `<meta name="twitter:title" content="${escapeHtml(content.title)}" />`, 'twitter:title')
  html = replaceRequired(
    html,
    /<meta\s+name="twitter:description"\s+content="[\s\S]*?"\s*\/>/,
    `<meta name="twitter:description" content="${escapeHtml(content.description)}" />`,
    'twitter:description',
  )
  html = replaceRequired(
    html,
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script type="application/ld+json">${structuredData}</script>`,
    'structured data',
  )

  const rootStart = html.indexOf('<div id="root">')
  const noScriptStart = html.indexOf('<noscript>', rootStart)
  const noScriptEnd = html.indexOf('</noscript>', noScriptStart)
  if (rootStart < 0 || noScriptStart < 0 || noScriptEnd < 0) {
    throw new Error('Unable to locate static root content')
  }
  html = `${html.slice(0, rootStart)}${body.root}\n    ${body.noScript}${html.slice(noScriptEnd + '</noscript>'.length)}`

  return html
}

const sitemapEntries = []

for (const page of manifest) {
  for (const locale of locales) {
    const path = localizedPath(page, locale)
    const file = outputFile(path)
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, renderPage(page, locale), 'utf8')
    sitemapEntries.push(`  <url>
    <loc>${absoluteUrl(path)}</loc>
    <xhtml:link rel="alternate" hreflang="zh-CN" href="${absoluteUrl(page.path)}" />
    <xhtml:link rel="alternate" hreflang="en" href="${absoluteUrl(page.enPath)}" />
    <xhtml:link rel="alternate" hreflang="ja" href="${absoluteUrl(page.jaPath)}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${absoluteUrl(page.path)}" />
    <lastmod>2026-07-30</lastmod>
  </url>`)
  }
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${sitemapEntries.join('\n')}
</urlset>
`

await writeFile(join(projectRoot, 'public/sitemap.xml'), sitemap, 'utf8')
await writeFile(join(distRoot, 'sitemap.xml'), sitemap, 'utf8')

console.log(`Generated ${sitemapEntries.length} static SEO pages and sitemap entries.`)
