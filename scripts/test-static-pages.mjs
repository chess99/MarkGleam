import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const distRoot = join(projectRoot, 'dist')
const siteOrigin = 'https://markgleam.com'
const manifest = JSON.parse(
  await readFile(join(projectRoot, 'src/data/toolPages.json'), 'utf8'),
)

const escapeHtml = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const absoluteUrl = (path) => new URL(path, siteOrigin).href
const outputFile = (path) =>
  path === '/' ? join(distRoot, 'index.html') : join(distRoot, path, 'index.html')
const matchOne = (html, pattern, label, path) => {
  const matches = [...html.matchAll(pattern)]
  assert.equal(matches.length, 1, `${path}: expected one ${label}`)
  return matches[0]
}

assert.equal(manifest.length, 9, 'SEO manifest must contain the workspace and eight tool pages')
assert.equal(new Set(manifest.map((page) => page.id)).size, manifest.length, 'Tool page ids must be unique')
assert.equal(new Set(manifest.map((page) => page.path)).size, manifest.length, 'Chinese paths must be unique')
assert.equal(new Set(manifest.map((page) => page.enPath)).size, manifest.length, 'English paths must be unique')

const allPaths = new Set()
const allTitles = new Set()
const allCanonicals = new Set()

for (const page of manifest) {
  assert.match(page.path, /^\/(?:[a-z0-9-]+\/)?$/, `${page.id}: invalid Chinese path`)
  assert.match(page.enPath, /^\/en\/(?:[a-z0-9-]+\/)?$/, `${page.id}: invalid English path`)
  assert.ok(page.intro['zh-CN'].length >= 30, `${page.id}: Chinese intro is too thin`)
  assert.ok(page.intro.en.length >= 60, `${page.id}: English intro is too thin`)
  assert.equal(page.steps['zh-CN'].length, 3, `${page.id}: Chinese steps must be concrete`)
  assert.equal(page.steps.en.length, 3, `${page.id}: English steps must be concrete`)
  assert.ok(page.limitations['zh-CN'].length >= 25, `${page.id}: Chinese limitation is too thin`)
  assert.ok(page.limitations.en.length >= 50, `${page.id}: English limitation is too thin`)
  assert.ok(page.schemaFeatures['zh-CN'].length >= 3, `${page.id}: missing Chinese schema features`)
  assert.ok(page.schemaFeatures.en.length >= 3, `${page.id}: missing English schema features`)

  for (const locale of ['zh-CN', 'en']) {
    const path = locale === 'zh-CN' ? page.path : page.enPath
    const alternatePath = locale === 'zh-CN' ? page.enPath : page.path
    const language = locale === 'zh-CN' ? 'zh-CN' : 'en'
    const canonical = absoluteUrl(path)
    const html = await readFile(outputFile(path), 'utf8')
    const expectedTitle = page.title[locale]
    const expectedDescription = page.description[locale]
    const expectedH1 = page.h1[locale]

    assert.ok(!allPaths.has(path), `${path}: duplicate route`)
    assert.ok(!allTitles.has(expectedTitle), `${path}: duplicate title`)
    assert.ok(!allCanonicals.has(canonical), `${path}: duplicate canonical`)
    allPaths.add(path)
    allTitles.add(expectedTitle)
    allCanonicals.add(canonical)

    assert.match(html, new RegExp(`<html lang="${language}">`), `${path}: wrong html lang`)
    assert.ok(html.includes(`<title>${escapeHtml(expectedTitle)}</title>`), `${path}: wrong title`)
    assert.ok(
      html.includes(`<meta name="description" content="${escapeHtml(expectedDescription)}" />`),
      `${path}: wrong description`,
    )
    assert.ok(html.includes(`<link rel="canonical" href="${canonical}" />`), `${path}: wrong canonical`)
    assert.ok(
      html.includes(`<link rel="alternate" hreflang="zh-CN" href="${absoluteUrl(page.path)}" />`),
      `${path}: missing zh-CN alternate`,
    )
    assert.ok(
      html.includes(`<link rel="alternate" hreflang="en" href="${absoluteUrl(page.enPath)}" />`),
      `${path}: missing English alternate`,
    )
    assert.ok(
      html.includes(`<link rel="alternate" hreflang="x-default" href="${absoluteUrl(page.path)}" />`),
      `${path}: missing x-default alternate`,
    )
    assert.ok(html.includes(`href="${alternatePath}"`), `${path}: missing visible language counterpart`)
    assert.ok(!/noindex/i.test(html), `${path}: indexable page unexpectedly contains noindex`)

    const h1 = matchOne(html, /<h1>([\s\S]*?)<\/h1>/g, 'H1', path)
    assert.equal(h1[1], escapeHtml(expectedH1), `${path}: wrong H1`)
    assert.ok(html.includes(escapeHtml(page.intro[locale])), `${path}: intro absent from raw HTML`)
    assert.ok(html.includes(escapeHtml(page.limitations[locale])), `${path}: limitation absent from raw HTML`)
    assert.ok(html.includes(escapeHtml(page.sample[locale])), `${path}: sample absent from raw HTML`)
    assert.ok(html.includes('href="/favicon.svg"'), `${path}: favicon must be root absolute`)
    assert.ok(
      !/\b(?:src|href)="\.\.?\//.test(html),
      `${path}: relative asset reference can break on a deep route`,
    )
    const expectedOgAlt =
      locale === 'zh-CN' ? `${expectedH1} 工具界面` : `${expectedH1} interface`
    assert.ok(
      html.includes(`<meta property="og:image:alt" content="${escapeHtml(expectedOgAlt)}" />`),
      `${path}: wrong og:image:alt`,
    )
    for (const step of page.steps[locale]) {
      assert.ok(html.includes(`<li>${escapeHtml(step)}</li>`), `${path}: missing step ${step}`)
    }

    const schemaMatch = matchOne(
      html,
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
      'JSON-LD block',
      path,
    )
    const schema = JSON.parse(schemaMatch[1])
    const app = schema['@graph'].find((item) => item['@type'] === 'WebApplication')
    assert.ok(app, `${path}: WebApplication schema missing`)
    assert.equal(app.url, canonical, `${path}: schema URL mismatch`)
    assert.equal(app['@id'], `${canonical}#app`, `${path}: schema @id mismatch`)
    assert.equal(app.name, expectedH1, `${path}: schema name mismatch`)
    assert.equal(app.inLanguage, language, `${path}: schema language mismatch`)
    assert.deepEqual(app.featureList, page.schemaFeatures[locale], `${path}: schema features mismatch`)

    const localReferences = [
      ...html.matchAll(/\b(?:src|href)="(\/[^"?#]*)(?:[?#][^"]*)?"/g),
    ].map((match) => match[1])
    assert.ok(localReferences.some((reference) => reference.startsWith('/assets/')), `${path}: assets are not root absolute`)
    for (const reference of localReferences) {
      const referencedFile = reference.endsWith('/')
        ? outputFile(reference)
        : join(distRoot, reference.slice(1))
      await access(referencedFile)
    }
  }
}

const sitemap = await readFile(join(distRoot, 'sitemap.xml'), 'utf8')
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
const expectedUrls = manifest.flatMap((page) => [absoluteUrl(page.path), absoluteUrl(page.enPath)])
assert.deepEqual(new Set(sitemapUrls), new Set(expectedUrls), 'Sitemap URLs must match the manifest exactly')
assert.equal(sitemapUrls.length, expectedUrls.length, 'Sitemap must not contain duplicate URLs')

console.log(`Validated ${allPaths.size} static SEO pages, metadata, schemas, assets and sitemap entries.`)
