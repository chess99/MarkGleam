import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { sampleMarkdown } from './data/sample'
import { suggestFilename } from './lib/filename'
import type {
  CanvasConfig,
  DocumentState,
  ExportConfig,
  InspectorTab,
  Locale,
  MobilePane,
  ThemeId,
} from './types'

export const defaultCanvas: CanvasConfig = {
  preset: 'auto',
  width: 1080,
  minHeight: 720,
  paddingX: 72,
  paddingY: 72,
  fontSize: 28,
  lineHeight: 1.75,
  cornerRadius: 18,
  shadow: true,
  transparent: false,
  backgroundColor: '#f2eee6',
}

export const defaultExport: ExportConfig = {
  format: 'png',
  scale: 2,
  quality: 0.92,
  filename: 'md2img',
  pdfSize: 'a4',
  pdfOrientation: 'portrait',
  pdfMargin: 12,
  splitHeight: 4096,
}

export const defaultDocumentState: DocumentState = {
  markdown: sampleMarkdown,
  locale: 'zh-CN',
  themeId: 'paper',
  canvas: defaultCanvas,
  export: defaultExport,
  customCss: '',
  editorCollapsed: false,
  inspectorCollapsed: false,
  mobilePane: 'preview',
  inspectorTab: 'theme',
}

interface AppStore extends DocumentState {
  setMarkdown: (markdown: string) => void
  setLocale: (locale: Locale) => void
  setThemeId: (themeId: ThemeId) => void
  updateCanvas: (patch: Partial<CanvasConfig>) => void
  updateExport: (patch: Partial<ExportConfig>) => void
  setCustomCss: (customCss: string) => void
  toggleEditor: () => void
  toggleInspector: () => void
  setMobilePane: (mobilePane: MobilePane) => void
  setInspectorTab: (inspectorTab: InspectorTab) => void
  resetDocument: () => void
  resetSettings: () => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      ...defaultDocumentState,
      setMarkdown: (markdown) =>
        set((state) => {
          const currentSuggestion = suggestFilename(state.markdown)
          const shouldRefreshFilename =
            !state.export.filename.trim() ||
            state.export.filename === 'md2img' ||
            state.export.filename === currentSuggestion
          return {
            markdown,
            export: shouldRefreshFilename
              ? { ...state.export, filename: suggestFilename(markdown) }
              : state.export,
          }
        }),
      setLocale: (locale) => set({ locale }),
      setThemeId: (themeId) => set({ themeId }),
      updateCanvas: (patch) =>
        set((state) => ({ canvas: { ...state.canvas, ...patch } })),
      updateExport: (patch) =>
        set((state) => ({ export: { ...state.export, ...patch } })),
      setCustomCss: (customCss) => set({ customCss }),
      toggleEditor: () =>
        set((state) => ({ editorCollapsed: !state.editorCollapsed })),
      toggleInspector: () =>
        set((state) => ({ inspectorCollapsed: !state.inspectorCollapsed })),
      setMobilePane: (mobilePane) => set({ mobilePane }),
      setInspectorTab: (inspectorTab) => set({ inspectorTab }),
      resetDocument: () =>
        set((state) => ({
          markdown: sampleMarkdown,
          export: {
            ...state.export,
            filename: suggestFilename(sampleMarkdown),
          },
        })),
      resetSettings: () =>
        set((state) => ({
          ...state,
          themeId: defaultDocumentState.themeId,
          canvas: { ...defaultCanvas },
          export: { ...defaultExport },
          customCss: '',
        })),
    }),
    {
      name: 'md2img-state-v1',
      version: 1,
      partialize: (state) => ({
        markdown: state.markdown,
        locale: state.locale,
        themeId: state.themeId,
        canvas: state.canvas,
        export: state.export,
        customCss: state.customCss,
        editorCollapsed: state.editorCollapsed,
        inspectorCollapsed: state.inspectorCollapsed,
      }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<DocumentState>
        return {
          ...current,
          ...saved,
          canvas: { ...current.canvas, ...saved.canvas },
          export: { ...current.export, ...saved.export },
        }
      },
    },
  ),
)
