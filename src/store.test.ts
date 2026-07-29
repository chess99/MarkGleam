import { beforeEach, describe, expect, it } from 'vitest'
import { getTheme } from './data/themes'
import { defaultCanvas, defaultExport, useAppStore } from './store'

describe('app store product state', () => {
  beforeEach(() => {
    useAppStore.setState({
      markdown: '# Current title',
      appearance: 'light',
      themeId: 'paper',
      canvas: { ...defaultCanvas },
      export: { ...defaultExport, filename: 'custom-name' },
    })
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

  it('regenerates the filename when settings are reset', () => {
    useAppStore.getState().resetSettings()
    expect(useAppStore.getState().export.filename).toBe('Current-title')
  })
})
