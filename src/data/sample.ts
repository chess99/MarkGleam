import pageData from './toolPages.json'

const markdownPage = pageData.find((page) => page.id === 'markdown-to-image')

if (!markdownPage) {
  throw new Error('Missing markdown-to-image sample')
}

// The Markdown landing page is the canonical source for the default draft.
// The homepage uses the same sample so both Markdown entry points stay aligned.
export const sampleMarkdown = markdownPage.sample['zh-CN']
export const sampleMarkdownEn = markdownPage.sample.en
