import { beforeEach, describe, expect, it } from 'vitest'
import { getTheme } from './data/themes'
import { defaultCanvas, defaultExport, useAppStore } from './store'

describe('app store product state', () => {
  beforeEach(() => {
    useAppStore.setState({
      markdown: '# Current title',
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

  it('regenerates the filename when settings are reset', () => {
    useAppStore.getState().resetSettings()
    expect(useAppStore.getState().export.filename).toBe('Current-title')
  })
})
