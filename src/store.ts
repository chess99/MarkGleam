import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { sampleMarkdown } from './data/sample'
import { createToolDrafts } from './data/toolSamples'
import { getTheme } from './data/themes'
import { suggestFilename } from './lib/filename'
import {
  getToolInputKind,
  switchToolInput,
} from './lib/toolInput'
import type {
  Appearance,
  CanvasConfig,
  DocumentState,
  ExportConfig,
  InputKind,
  InspectorTab,
  Locale,
  MobilePane,
  SignatureConfig,
  ToolId,
  ThemeId,
} from './types'

type PersistedDocumentState = Pick<
  DocumentState,
  | 'markdown'
  | 'inputKind'
  | 'drafts'
  | 'codeLanguage'
  | 'locale'
  | 'appearance'
  | 'themeId'
  | 'canvas'
  | 'signature'
  | 'export'
  | 'customCss'
  | 'editorCollapsed'
  | 'inspectorCollapsed'
>

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
  backgroundColor: getTheme('paper').surface,
}

export const defaultExport: ExportConfig = {
  format: 'png',
  scale: 2,
  quality: 0.92,
  filename: 'markgleam',
  pdfSize: 'a4',
  pdfOrientation: 'portrait',
  pdfMargin: 12,
  pdfHeader: '',
  pdfFooter: '',
  pdfPageNumbers: true,
  splitHeight: 4096,
}

export const defaultSignature: SignatureConfig = {
  style: 'minimal',
  tone: 'subtle',
}

export const defaultDocumentState: DocumentState = {
  toolId: 'visual-workspace',
  inputKind: 'markdown',
  drafts: createToolDrafts(),
  markdown: sampleMarkdown,
  codeLanguage: 'typescript',
  locale: 'zh-CN',
  appearance: 'light',
  themeId: 'paper',
  canvas: defaultCanvas,
  signature: defaultSignature,
  export: defaultExport,
  customCss: '',
  editorCollapsed: false,
  inspectorCollapsed: false,
  mobilePane: 'preview',
  inspectorTab: 'theme',
}

interface AppStore extends DocumentState {
  setToolId: (toolId: ToolId) => void
  setInputKind: (inputKind: InputKind) => void
  setMarkdown: (markdown: string) => void
  setCodeLanguage: (codeLanguage: string) => void
  setLocale: (locale: Locale) => void
  setAppearance: (appearance: Appearance) => void
  setThemeId: (themeId: ThemeId) => void
  updateCanvas: (patch: Partial<CanvasConfig>) => void
  updateSignature: (patch: Partial<SignatureConfig>) => void
  updateExport: (patch: Partial<ExportConfig>) => void
  setCustomCss: (customCss: string) => void
  toggleEditor: () => void
  toggleInspector: () => void
  setMobilePane: (mobilePane: MobilePane) => void
  setInspectorTab: (inspectorTab: InspectorTab) => void
  resetSettings: () => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      ...defaultDocumentState,
      setToolId: (toolId) =>
        set((state) => ({
          toolId,
          ...switchToolInput(state, getToolInputKind(toolId)),
        })),
      setInputKind: (inputKind) =>
        set((state) => switchToolInput(state, inputKind)),
      setMarkdown: (markdown) =>
        set((state) => {
          const currentSuggestion = suggestFilename(state.markdown)
          const shouldRefreshFilename =
            !state.export.filename.trim() ||
            state.export.filename === 'md2img' ||
            state.export.filename === 'markgleam' ||
            state.export.filename === currentSuggestion
          return {
            markdown,
            drafts: {
              ...state.drafts,
              [state.inputKind]: markdown,
            },
            export: shouldRefreshFilename
              ? { ...state.export, filename: suggestFilename(markdown) }
              : state.export,
          }
        }),
      setCodeLanguage: (codeLanguage) => set({ codeLanguage }),
      setLocale: (locale) => set({ locale }),
      setAppearance: (appearance) => set({ appearance }),
      setThemeId: (themeId) =>
        set((state) => ({
          themeId,
          canvas: {
            ...state.canvas,
            backgroundColor: getTheme(themeId).surface,
          },
        })),
      updateCanvas: (patch) =>
        set((state) => ({ canvas: { ...state.canvas, ...patch } })),
      updateSignature: (patch) =>
        set((state) => ({ signature: { ...state.signature, ...patch } })),
      updateExport: (patch) =>
        set((state) => ({ export: { ...state.export, ...patch } })),
      setCustomCss: (customCss) => set({ customCss }),
      toggleEditor: () =>
        set((state) => ({ editorCollapsed: !state.editorCollapsed })),
      toggleInspector: () =>
        set((state) => ({ inspectorCollapsed: !state.inspectorCollapsed })),
      setMobilePane: (mobilePane) => set({ mobilePane }),
      setInspectorTab: (inspectorTab) => set({ inspectorTab }),
      resetSettings: () =>
        set((state) => ({
          ...state,
          themeId: defaultDocumentState.themeId,
          canvas: { ...defaultCanvas },
          signature: { ...defaultSignature },
          export: {
            ...defaultExport,
            filename: suggestFilename(state.markdown),
          },
          customCss: '',
        })),
    }),
    {
      name: 'md2img-state-v1',
      version: 4,
      migrate: (persisted, version) => {
        const saved = persisted as PersistedDocumentState
        let migrated: PersistedDocumentState = saved
        if (
          version < 2 &&
          saved.canvas?.backgroundColor === '#f2eee6'
        ) {
          migrated = {
            ...saved,
            canvas: {
              ...saved.canvas,
              backgroundColor: getTheme(saved.themeId ?? 'paper').surface,
            },
          }
        }
        if (version < 3) {
          const drafts = createToolDrafts()
          drafts.markdown = saved.markdown ?? sampleMarkdown
          migrated = {
            ...migrated,
            inputKind: 'markdown',
            drafts,
            codeLanguage: 'typescript',
          }
        }
        if (version < 4) {
          migrated = {
            ...migrated,
            signature: defaultSignature,
            export: {
              ...migrated.export,
              filename:
                migrated.export?.filename === 'md2img'
                  ? 'markgleam'
                  : migrated.export?.filename ?? defaultExport.filename,
            },
          }
        }
        return migrated
      },
      partialize: (state) => ({
        markdown: state.markdown,
        inputKind: state.inputKind,
        drafts: state.drafts,
        codeLanguage: state.codeLanguage,
        locale: state.locale,
        appearance: state.appearance,
        themeId: state.themeId,
        canvas: state.canvas,
        signature: state.signature,
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
          drafts: { ...current.drafts, ...saved.drafts },
          canvas: { ...current.canvas, ...saved.canvas },
          signature: { ...current.signature, ...saved.signature },
          export: { ...current.export, ...saved.export },
        }
      },
    },
  ),
)
