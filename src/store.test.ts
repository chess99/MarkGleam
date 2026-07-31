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
    localStorage.clear()
    useAppStore.setState({
      ...defaultDocumentState,
      localePreference: null,
      routeDefaultsSnapshot: null,
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

  it('keeps route defaults runtime-only while persisting workspace settings', () => {
    const workspaceCanvas = {
      ...defaultCanvas,
      preset: 'custom' as const,
      width: 1280,
      minHeight: 960,
      paddingX: 88,
      cornerRadius: 24,
    }
    const workspaceExport = {
      ...defaultExport,
      format: 'webp' as const,
      scale: 3 as const,
      filename: 'workspace-export',
    }
    useAppStore.setState({
      canvas: workspaceCanvas,
      export: workspaceExport,
      codeLanguage: 'python',
      inspectorTab: 'canvas',
    })

    useAppStore.getState().applyRouteDefaults({
      canvas: {
        preset: 'xiaohongshu',
        width: 1080,
        minHeight: 1440,
        cornerRadius: 0,
        shadow: false,
      },
      export: {
        format: 'split-zip',
        scale: 1,
        splitMode: 'fixed',
        splitHeight: 1440,
      },
      codeLanguage: 'typescript',
      inspectorTab: 'export',
    })

    expect(useAppStore.getState()).toMatchObject({
      canvas: {
        preset: 'xiaohongshu',
        width: 1080,
        minHeight: 1440,
        paddingX: 88,
        cornerRadius: 0,
        shadow: false,
      },
      export: {
        format: 'split-zip',
        scale: 1,
        filename: 'workspace-export',
        splitMode: 'fixed',
        splitHeight: 1440,
      },
      codeLanguage: 'typescript',
      inspectorTab: 'export',
    })

    useAppStore.getState().updateCanvas({ paddingX: 96 })
    useAppStore.getState().updateExport({ filename: 'route-edited' })
    useAppStore.getState().setCodeLanguage('go')
    useAppStore.getState().setInspectorTab('theme')

    const saved = JSON.parse(
      localStorage.getItem('md2img-state-v1') ?? '{}',
    ).state as {
      canvas: typeof workspaceCanvas
      export: typeof workspaceExport
      codeLanguage: string
    }
    expect(saved.canvas).toMatchObject({
      preset: 'custom',
      width: 1280,
      minHeight: 960,
      paddingX: 96,
      cornerRadius: 24,
      shadow: true,
    })
    expect(saved.export).toMatchObject({
      format: 'webp',
      scale: 3,
      filename: 'route-edited',
      splitMode: 'compact',
      splitHeight: 4096,
    })
    expect(saved.codeLanguage).toBe('python')

    useAppStore.getState().applyRouteDefaults()
    expect(useAppStore.getState()).toMatchObject({
      canvas: {
        preset: 'custom',
        width: 1280,
        minHeight: 960,
        paddingX: 96,
        cornerRadius: 24,
        shadow: true,
      },
      export: {
        format: 'webp',
        scale: 3,
        filename: 'route-edited',
        splitMode: 'compact',
        splitHeight: 4096,
      },
      codeLanguage: 'python',
      inspectorTab: 'canvas',
      routeDefaultsSnapshot: null,
    })
  })

  it('restores prior route overrides before applying another route', () => {
    useAppStore.setState({
      canvas: {
        ...defaultCanvas,
        preset: 'custom',
        width: 1280,
        minHeight: 960,
        cornerRadius: 24,
        shadow: true,
      },
      export: {
        ...defaultExport,
        format: 'webp',
        scale: 3,
      },
    })

    useAppStore.getState().applyRouteDefaults({
      canvas: {
        preset: 'xiaohongshu',
        width: 1080,
        minHeight: 1440,
        cornerRadius: 0,
        shadow: false,
      },
      export: {
        format: 'split-zip',
        scale: 1,
      },
    })
    useAppStore.getState().updateCanvas({ paddingY: 104 })

    useAppStore.getState().applyRouteDefaults({
      canvas: { preset: 'auto', width: 1080, minHeight: 720 },
      export: { format: 'png' },
    })

    expect(useAppStore.getState()).toMatchObject({
      canvas: {
        preset: 'auto',
        width: 1080,
        minHeight: 720,
        paddingY: 104,
        cornerRadius: 24,
        shadow: true,
      },
      export: {
        format: 'png',
        scale: 3,
      },
    })
  })
})
