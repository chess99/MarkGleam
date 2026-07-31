import type { DocumentState, InputKind, ToolDrafts, ToolId } from '../types'

const toolInputKinds: Record<ToolId, InputKind> = {
  'visual-workspace': 'markdown',
  'markdown-to-image': 'markdown',
  'markdown-long-image': 'markdown',
  'xiaohongshu-long-article': 'markdown',
  'markdown-to-pdf': 'markdown',
  'mermaid-to-image': 'mermaid',
  'formula-to-image': 'formula',
  'code-to-image': 'code',
  'github-readme-to-image': 'markdown',
  'batch-markdown-to-image': 'markdown',
}

export const getToolInputKind = (toolId: ToolId) => toolInputKinds[toolId]

type InputState = Pick<DocumentState, 'inputKind' | 'drafts' | 'markdown'>

export const switchToolInput = (
  state: InputState,
  nextInputKind: InputKind,
): Pick<DocumentState, 'inputKind' | 'drafts' | 'markdown'> => {
  const drafts: ToolDrafts = {
    ...state.drafts,
    [state.inputKind]: state.markdown,
  }

  return {
    inputKind: nextInputKind,
    drafts,
    markdown: drafts[nextInputKind],
  }
}
