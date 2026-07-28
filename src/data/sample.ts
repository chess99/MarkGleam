export const sampleMarkdown = `# 把想法，变成一张好看的图

所有处理都在你的浏览器中完成。**无需登录、没有水印，也没有次数限制。**

## 为什么选择 MD2IMG？

- 🧡 本地优先：内容不会上传到服务器
- ⚡ 实时预览：写下即可看见最终效果
- 🎨 八套主题：每一种都可以继续调整
- 🖼️ 自由导出：PNG、JPEG、WebP、SVG 与 PDF

> 简洁的工具，专注于内容本身。

## 代码高亮

\`\`\`ts
const idea = "Markdown"
const result = render(idea, { watermark: false })
\`\`\`

## 数学公式

行内公式 $E = mc^2$，以及一个块级公式：

$$
\\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}
$$

## Mermaid 图表

\`\`\`mermaid
flowchart LR
  A[写下 Markdown] --> B[实时预览]
  B --> C{选择格式}
  C -->|图片| D[免费导出]
  C -->|PDF| D
\`\`\`

| 能力 | 支持情况 |
| --- | --- |
| GFM 与代码高亮 | ✅ |
| KaTeX 与 Mermaid | ✅ |
| 本地保存 | ✅ |

_用 Markdown 记录，用图片表达。_
`

export const sampleMarkdownEn = `# Turn ideas into beautiful images

Everything happens inside your browser. **No account, no watermark, no limits.**

## Why MD2IMG?

- 🧡 Local-first and private
- ⚡ Live preview as you type
- 🎨 Eight adaptable themes
- 🖼️ PNG, JPEG, WebP, SVG and PDF

> A quiet tool that keeps the content in focus.

\`\`\`ts
const idea = "Markdown"
const result = render(idea, { watermark: false })
\`\`\`

Inline math $E = mc^2$ and diagrams are supported too.

\`\`\`mermaid
flowchart LR
  A[Write Markdown] --> B[Live preview]
  B --> C[Export freely]
\`\`\`
`
