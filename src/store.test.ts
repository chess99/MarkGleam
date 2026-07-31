import { beforeEach, describe, expect, it } from 'vitest'
import { getTheme } from './data/themes'
import {
  defaultCanvas,
  defaultDocumentState,
  defaultExport,
  defaultSignature,
  useAppStore,
} from './store'
import type { RouteDefaults } from './types'

const xiaohongshuDefaults = {
  canvas: {
    preset: 'xiaohongshu',
    width: 1080,
    minHeight: 1440,
    cornerRadius: 0,
    shadow: false,
    transparent: false,
  },
  export: {
    format: 'split-zip',
    scale: 1,
    splitMode: 'fixed',
    splitHeight: 1440,
  },
  inspectorTab: 'export',
} satisfies RouteDefaults

const persistedState = () =>
  JSON.parse(localStorage.getItem('md2img-state-v1') ?? '{}').state

const enterXiaohongshuTool = () => {
  useAppStore.getState().setToolId('xiaohongshu-long-article')
  useAppStore.getState().applyRouteDefaults(xiaohongshuDefaults)
}

const resettableSettings = () => {
  const state = useAppStore.getState()
  return {
    themeId: state.themeId,
    canvas: state.canvas,
    signature: state.signature,
    export: state.export,
    customCss: state.customCss,
  }
}

describe('app store product state', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({
      ...defaultDocumentState,
      drafts: { ...defaultDocumentState.drafts },
      localePreference: null,
      routeDefaultsSnapshot: null,
      pendingSettingsUndo: null,
      markdown: '# Current title',
      appearance: 'light',
      themeId: 'paper',
      canvas: { ...defaultCanvas },
      signature: { ...defaultSignature },
      export: { ...defaultExport, filename: 'custom-name' },
      customCss: '',
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

  it('restores only active tool recommendations without polluting workspace settings', () => {
    const workspaceCanvas = {
      ...defaultCanvas,
      preset: 'custom' as const,
      width: 1280,
      minHeight: 960,
      paddingX: 88,
      cornerRadius: 24,
      shadow: true,
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
    enterXiaohongshuTool()

    useAppStore.getState().setThemeId('forest')
    useAppStore.getState().updateCanvas({
      width: 960,
      minHeight: 1200,
      paddingX: 96,
      fontSize: 34,
      cornerRadius: 12,
      shadow: true,
      transparent: true,
    })
    useAppStore.getState().updateSignature({
      style: 'stamp',
      tone: 'solid',
    })
    useAppStore.getState().updateExport({
      format: 'webp',
      scale: 3,
      quality: 0.8,
      filename: 'keep-this-name',
      splitMode: 'compact',
      splitHeight: 2048,
    })
    useAppStore.getState().setCustomCss('h1 { color: tomato; }')
    useAppStore.getState().setCodeLanguage('go')
    useAppStore.getState().setInspectorTab('theme')

    const token = useAppStore.getState().restoreToolRecommendations()

    expect(token).toEqual(expect.any(Number))
    expect(useAppStore.getState()).toMatchObject({
      themeId: 'forest',
      canvas: {
        ...xiaohongshuDefaults.canvas,
        paddingX: 96,
        fontSize: 34,
        backgroundColor: getTheme('forest').surface,
      },
      signature: { style: 'stamp', tone: 'solid' },
      export: {
        ...xiaohongshuDefaults.export,
        quality: 0.8,
        filename: 'keep-this-name',
      },
      customCss: 'h1 { color: tomato; }',
      codeLanguage: 'go',
      inspectorTab: 'theme',
    })

    expect(persistedState()).toMatchObject({
      themeId: 'forest',
      canvas: {
        preset: 'custom',
        width: 1280,
        minHeight: 960,
        paddingX: 96,
        fontSize: 34,
        cornerRadius: 24,
        shadow: true,
        transparent: false,
        backgroundColor: getTheme('forest').surface,
      },
      signature: { style: 'stamp', tone: 'solid' },
      export: {
        format: 'webp',
        scale: 3,
        quality: 0.8,
        filename: 'keep-this-name',
        splitMode: 'compact',
        splitHeight: 4096,
      },
      customCss: 'h1 { color: tomato; }',
      codeLanguage: 'go',
    })
  })

  it('makes recommendation restoration undoable exactly once', () => {
    enterXiaohongshuTool()
    useAppStore.getState().updateCanvas({ width: 960, cornerRadius: 12 })
    useAppStore.getState().updateExport({ format: 'webp', scale: 3 })
    const before = resettableSettings()

    const token = useAppStore.getState().restoreToolRecommendations()
    expect(token).toEqual(expect.any(Number))
    expect(useAppStore.getState().undoSettingsReset(token!)).toBe(true)
    expect(resettableSettings()).toEqual(before)
    expect(useAppStore.getState().undoSettingsReset(token!)).toBe(false)
  })

  it('does not create an undo when recommendations already match or no tool overlay exists', () => {
    expect(useAppStore.getState().restoreToolRecommendations()).toBeUndefined()

    enterXiaohongshuTool()
    useAppStore.getState().setCodeLanguage('rust')
    useAppStore.getState().setInspectorTab('theme')

    expect(useAppStore.getState().restoreToolRecommendations()).toBeUndefined()
    expect(useAppStore.getState().pendingSettingsUndo).toBeNull()
    expect(useAppStore.getState()).toMatchObject({
      codeLanguage: 'rust',
      inspectorTab: 'theme',
    })
  })

  it('resets all output settings to the global baseline under the active tool overlay', () => {
    useAppStore.setState({
      markdown: '# Durable article',
      drafts: {
        ...useAppStore.getState().drafts,
        markdown: '# Durable article',
      },
      codeLanguage: 'rust',
      locale: 'ja',
      localePreference: 'ja',
      appearance: 'dark',
      editorCollapsed: true,
      inspectorCollapsed: true,
      mobilePane: 'editor',
      inspectorTab: 'canvas',
      themeId: 'forest',
      canvas: {
        ...defaultCanvas,
        preset: 'custom',
        width: 1280,
        minHeight: 960,
        paddingX: 104,
        fontSize: 36,
        backgroundColor: getTheme('forest').surface,
        backgroundAssetId: 'background-asset',
        customFontAssetId: 'font-asset',
      },
      signature: { style: 'camera', tone: 'solid' },
      export: {
        ...defaultExport,
        format: 'webp',
        scale: 3,
        quality: 0.75,
        filename: 'custom-export',
      },
      customCss: 'article { letter-spacing: 1px; }',
    })
    enterXiaohongshuTool()
    useAppStore.getState().setInspectorTab('theme')

    const stateBefore = useAppStore.getState()
    const unaffectedBefore = {
      toolId: stateBefore.toolId,
      inputKind: stateBefore.inputKind,
      drafts: stateBefore.drafts,
      markdown: stateBefore.markdown,
      codeLanguage: stateBefore.codeLanguage,
      locale: stateBefore.locale,
      localePreference: stateBefore.localePreference,
      appearance: stateBefore.appearance,
      editorCollapsed: stateBefore.editorCollapsed,
      inspectorCollapsed: stateBefore.inspectorCollapsed,
      mobilePane: stateBefore.mobilePane,
      inspectorTab: stateBefore.inspectorTab,
    }

    const token = useAppStore.getState().resetAllSettings()
    const state = useAppStore.getState()

    expect(token).toEqual(expect.any(Number))
    expect(resettableSettings()).toEqual({
      themeId: 'paper',
      canvas: { ...defaultCanvas, ...xiaohongshuDefaults.canvas },
      signature: defaultSignature,
      export: {
        ...defaultExport,
        filename: 'Durable-article',
        ...xiaohongshuDefaults.export,
      },
      customCss: '',
    })
    expect({
      toolId: state.toolId,
      inputKind: state.inputKind,
      drafts: state.drafts,
      markdown: state.markdown,
      codeLanguage: state.codeLanguage,
      locale: state.locale,
      localePreference: state.localePreference,
      appearance: state.appearance,
      editorCollapsed: state.editorCollapsed,
      inspectorCollapsed: state.inspectorCollapsed,
      mobilePane: state.mobilePane,
      inspectorTab: state.inspectorTab,
    }).toEqual(unaffectedBefore)

    const saved = persistedState()
    expect(saved).toMatchObject({
      markdown: '# Durable article',
      codeLanguage: 'rust',
      localePreference: 'ja',
      appearance: 'dark',
      themeId: 'paper',
      canvas: defaultCanvas,
      signature: defaultSignature,
      export: { ...defaultExport, filename: 'Durable-article' },
      customCss: '',
      editorCollapsed: true,
      inspectorCollapsed: true,
    })
    expect(saved).not.toHaveProperty('routeDefaultsSnapshot')
    expect(saved).not.toHaveProperty('pendingSettingsUndo')
  })

  it('uses the reset baseline when leaving or refreshing an active tool', () => {
    useAppStore.setState({
      canvas: {
        ...defaultCanvas,
        preset: 'custom',
        width: 1280,
        minHeight: 960,
        paddingX: 96,
      },
      export: {
        ...defaultExport,
        format: 'webp',
        scale: 3,
      },
    })
    enterXiaohongshuTool()
    useAppStore.getState().resetAllSettings()

    expect(persistedState()).toMatchObject({
      canvas: defaultCanvas,
      export: { ...defaultExport, filename: 'Current-title' },
    })

    useAppStore.getState().applyRouteDefaults()
    expect(useAppStore.getState()).toMatchObject({
      canvas: defaultCanvas,
      export: { ...defaultExport, filename: 'Current-title' },
      routeDefaultsSnapshot: null,
      pendingSettingsUndo: null,
    })

    useAppStore.getState().applyRouteDefaults(xiaohongshuDefaults)
    expect(useAppStore.getState()).toMatchObject({
      canvas: { ...defaultCanvas, ...xiaohongshuDefaults.canvas },
      export: {
        ...defaultExport,
        filename: 'Current-title',
        ...xiaohongshuDefaults.export,
      },
    })
  })

  it('undoes a full reset atomically and restores its persisted route baseline', () => {
    useAppStore.setState({
      themeId: 'ocean',
      canvas: {
        ...defaultCanvas,
        preset: 'custom',
        width: 1320,
        minHeight: 980,
        paddingY: 108,
        backgroundColor: getTheme('ocean').surface,
      },
      signature: { style: 'stamp', tone: 'solid' },
      export: {
        ...defaultExport,
        format: 'webp',
        scale: 3,
        filename: 'before-reset',
      },
      customCss: 'blockquote { border: 0; }',
    })
    enterXiaohongshuTool()
    useAppStore.getState().updateCanvas({ width: 960 })
    useAppStore.getState().updateExport({ format: 'jpeg' })
    const before = resettableSettings()
    const savedBefore = persistedState()

    const token = useAppStore.getState().resetAllSettings()

    expect(useAppStore.getState().undoSettingsReset(token)).toBe(true)
    expect(resettableSettings()).toEqual(before)
    expect(persistedState()).toEqual(savedBefore)
    expect(useAppStore.getState().undoSettingsReset(token)).toBe(false)
  })

  it('keeps UI preferences changed during the undo window', () => {
    enterXiaohongshuTool()
    const token = useAppStore.getState().resetAllSettings()

    useAppStore.getState().setLocale('ja')
    useAppStore.getState().setAppearance('dark')
    useAppStore.getState().setCodeLanguage('python')
    useAppStore.getState().toggleEditor()
    useAppStore.getState().toggleInspector()
    useAppStore.getState().setMobilePane('settings')
    useAppStore.getState().setInspectorTab('canvas')

    expect(useAppStore.getState().undoSettingsReset(token)).toBe(true)
    expect(useAppStore.getState()).toMatchObject({
      locale: 'ja',
      localePreference: 'ja',
      appearance: 'dark',
      codeLanguage: 'python',
      editorCollapsed: true,
      inspectorCollapsed: true,
      mobilePane: 'settings',
      inspectorTab: 'canvas',
    })
  })

  it('invalidates reset undo after an output setting changes', () => {
    const token = useAppStore.getState().resetAllSettings()

    useAppStore.getState().updateCanvas({ paddingX: 96 })

    expect(useAppStore.getState().pendingSettingsUndo).toBeNull()
    expect(useAppStore.getState().undoSettingsReset(token)).toBe(false)
  })

  it('invalidates reset undo after changing tools or route defaults', () => {
    const toolToken = useAppStore.getState().resetAllSettings()
    useAppStore.getState().setToolId('markdown-to-pdf')
    expect(useAppStore.getState().undoSettingsReset(toolToken)).toBe(false)

    useAppStore.getState().setToolId('xiaohongshu-long-article')
    const routeToken = useAppStore.getState().resetAllSettings()
    useAppStore.getState().applyRouteDefaults(xiaohongshuDefaults)
    expect(useAppStore.getState().undoSettingsReset(routeToken)).toBe(false)
  })

  it('reuses a full-reset token so repeated clicks still restore the original settings', () => {
    useAppStore.setState({
      themeId: 'ocean',
      canvas: {
        ...defaultCanvas,
        paddingX: 112,
        backgroundColor: getTheme('ocean').surface,
      },
      signature: { style: 'camera', tone: 'solid' },
      export: {
        ...defaultExport,
        format: 'webp',
        filename: 'original-settings',
      },
      customCss: 'h2 { text-wrap: balance; }',
    })
    const before = resettableSettings()

    const first = useAppStore.getState().resetAllSettings()
    useAppStore.getState().setLocale('ja')
    useAppStore.getState().setInspectorTab('export')
    const second = useAppStore.getState().resetAllSettings()

    expect(second).toBe(first)
    expect(useAppStore.getState().pendingSettingsUndo).toMatchObject({
      kind: 'full-reset',
      token: first,
    })
    expect(useAppStore.getState().undoSettingsReset(second)).toBe(true)
    expect(resettableSettings()).toEqual(before)
    expect(useAppStore.getState()).toMatchObject({
      locale: 'ja',
      inspectorTab: 'export',
    })
    expect(useAppStore.getState().undoSettingsReset(first)).toBe(false)
  })

  it('creates a new full-reset checkpoint after restoring recommendations', () => {
    enterXiaohongshuTool()
    useAppStore.getState().updateCanvas({ width: 960 })
    const recommendationToken =
      useAppStore.getState().restoreToolRecommendations()
    const afterRecommendation = resettableSettings()

    const resetToken = useAppStore.getState().resetAllSettings()

    expect(recommendationToken).toEqual(expect.any(Number))
    expect(resetToken).not.toBe(recommendationToken)
    expect(useAppStore.getState().pendingSettingsUndo).toMatchObject({
      kind: 'full-reset',
      token: resetToken,
    })
    expect(
      useAppStore.getState().undoSettingsReset(recommendationToken!),
    ).toBe(false)
    expect(useAppStore.getState().undoSettingsReset(resetToken)).toBe(true)
    expect(resettableSettings()).toEqual(afterRecommendation)
  })

  it('discards only the matching full-reset token', () => {
    const token = useAppStore.getState().resetAllSettings()

    useAppStore.getState().discardSettingsReset(token + 1)
    expect(useAppStore.getState().pendingSettingsUndo?.token).toBe(token)

    useAppStore.getState().discardSettingsReset(token)
    expect(useAppStore.getState().pendingSettingsUndo).toBeNull()
    expect(useAppStore.getState().undoSettingsReset(token)).toBe(false)
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

    enterXiaohongshuTool()

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
      codeLanguage: 'python',
      inspectorTab: 'export',
    })

    useAppStore.getState().updateCanvas({ paddingX: 96 })
    useAppStore.getState().updateExport({ filename: 'route-edited' })
    useAppStore.getState().setCodeLanguage('go')
    useAppStore.getState().setInspectorTab('theme')

    expect(persistedState()).toMatchObject({
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
      codeLanguage: 'go',
    })

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
      codeLanguage: 'go',
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
    enterXiaohongshuTool()
    useAppStore.getState().updateCanvas({ paddingY: 104 })

    useAppStore.getState().setToolId('markdown-long-image')
    useAppStore.getState().applyRouteDefaults({
      canvas: { preset: 'auto', width: 1080, minHeight: 720 },
      export: {
        format: 'split-zip',
        scale: 2,
        splitHeight: 4096,
        splitMode: 'compact',
      },
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
        format: 'split-zip',
        scale: 2,
        splitMode: 'compact',
        splitHeight: 4096,
      },
    })
  })
})
