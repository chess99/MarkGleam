import { beforeEach, describe, expect, it } from 'vitest'
import { getTheme } from './data/themes'
import {
  defaultCanvas,
  defaultDocumentState,
  defaultExport,
  useAppStore,
} from './store'

describe('app store product state', () => {
  beforeEach(() => {
    useAppStore.setState({
      ...defaultDocumentState,
      localePreference: null,
      markdown: '# Current title',
      appearance: 'light',
      themeId: 'paper',
      canvas: { ...defaultCanvas },
      export: { ...defaultExport, filename: 'custom-name' },
    })
  })

  it('keeps an independent draft for every input kind', () => {
    useAppStore.getState().setInputKind('mermaid')
    useAppStore.getState().setMarkdown('flowchart LR\n  A --> B')
    useAppStore.getState().setInputKind('code')
    useAppStore.getState().setMarkdown('const answer = 42')

    useAppStore.getState().setInputKind('mermaid')
    expect(useAppStore.getState().markdown).toBe('flowchart LR\n  A --> B')

    useAppStore.getState().setInputKind('markdown')
    expect(useAppStore.getState().markdown).toBe('# Current title')
  })

  it('selects the input kind associated with a tool without losing work', () => {
    useAppStore.getState().setToolId('formula-to-image')
    useAppStore.getState().setMarkdown('E = mc^2')
    useAppStore.getState().setToolId('markdown-to-pdf')

    expect(useAppStore.getState().toolId).toBe('markdown-to-pdf')
    expect(useAppStore.getState().inputKind).toBe('markdown')
    expect(useAppStore.getState().markdown).toBe('# Current title')

    useAppStore.getState().setToolId('formula-to-image')
    expect(useAppStore.getState().markdown).toBe('E = mc^2')
  })

  it('applies a theme surface when selecting a theme', () => {
    useAppStore.getState().setThemeId('terminal')
    expect(useAppStore.getState().canvas.backgroundColor).toBe(
      getTheme('terminal').surface,
    )
  })

  it('keeps interface appearance independent from the export theme', () => {
    useAppStore.getState().setAppearance('dark')
    expect(useAppStore.getState().appearance).toBe('dark')
    expect(useAppStore.getState().themeId).toBe('paper')
    expect(useAppStore.getState().canvas.backgroundColor).toBe(
      getTheme('paper').surface,
    )
  })

  it('persists a locale only after an explicit selection', () => {
    expect(useAppStore.getState().localePreference).toBeNull()
    useAppStore.getState().setLocale('ja')
    expect(useAppStore.getState().locale).toBe('ja')
    expect(useAppStore.getState().localePreference).toBe('ja')
  })

  it('regenerates the filename when settings are reset', () => {
    useAppStore.getState().resetSettings()
    expect(useAppStore.getState().export.filename).toBe('Current-title')
  })
})
