import { sampleMarkdown } from './sample'
import type { InputKind, ToolDrafts } from '../types'

export const toolSamples: ToolDrafts = {
  markdown: sampleMarkdown,
  mermaid: `flowchart LR
  A[粘贴 Mermaid 源码] --> B[实时预览]
  B --> C{选择格式}
  C -->|PNG| D[导出图片]
  C -->|SVG| D`,
  formula: String.raw`\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}`,
  code: `const idea = "Markdown"
const image = await render(idea, {
  format: "png",
  scale: 2,
})`,
}

export const createToolDrafts = (): ToolDrafts => ({ ...toolSamples })

export const getToolSample = (inputKind: InputKind) => toolSamples[inputKind]
