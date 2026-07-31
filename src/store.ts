import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { sampleMarkdown } from './data/sample'
import { createToolDrafts } from './data/toolSamples'
import { getTheme } from './data/themes'
import { suggestFilename } from './lib/filename'
import { detectSystemLocale } from './lib/locale'
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
  | 'appearance'
  | 'themeId'
  | 'canvas'
  | 'signature'
  | 'export'
  | 'customCss'
  | 'editorCollapsed'
  | 'inspectorCollapsed'
>

type PersistedAppState = PersistedDocumentState & {
  localePreference: Locale | null
}

export interface RouteDefaults {
  canvas?: Partial<CanvasConfig>
  export?: Partial<ExportConfig>
  codeLanguage?: string
  inspectorTab?: InspectorTab
}

interface RouteDefaultsSnapshot {
  canvas: CanvasConfig
  export: ExportConfig
  codeLanguage: string
  inspectorTab: InspectorTab
  canvasKeys: (keyof CanvasConfig)[]
  exportKeys: (keyof ExportConfig)[]
  codeLanguageOverridden: boolean
  inspectorTabOverridden: boolean
}

const keysOf = <Value extends object>(patch?: Partial<Value>) =>
  patch ? (Object.keys(patch) as (keyof Value)[]) : []

const restoreOverriddenKeys = <Value extends object>(
  current: Value,
  original: Value,
  keys: readonly (keyof Value)[],
) =>
  keys.reduce<Value>(
    (restored, key) => ({ ...restored, [key]: original[key] }),
    current,
  )

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
  splitMode: 'compact',
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
  locale: detectSystemLocale(),
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
  localePreference: Locale | null
  routeDefaultsSnapshot: RouteDefaultsSnapshot | null
  setToolId: (toolId: ToolId) => void
  applyRouteDefaults: (defaults?: RouteDefaults) => void
  setInputKind: (inputKind: InputKind) => void
  setMarkdown: (markdown: string) => void
  setCodeLanguage: (codeLanguage: string) => void
  setLocale: (locale: Locale) => void
  syncLocale: (locale: Locale) => void
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
      localePreference: null,
      routeDefaultsSnapshot: null,
      setToolId: (toolId) =>
        set((state) => ({
          toolId,
          ...switchToolInput(state, getToolInputKind(toolId)),
        })),
      applyRouteDefaults: (defaults) =>
        set((state) => {
          const snapshot = state.routeDefaultsSnapshot
          const baseCanvas = snapshot
            ? restoreOverriddenKeys(
                state.canvas,
                snapshot.canvas,
                snapshot.canvasKeys,
              )
            : state.canvas
          const baseExport = snapshot
            ? restoreOverriddenKeys(
                state.export,
                snapshot.export,
                snapshot.exportKeys,
              )
            : state.export
          const baseCodeLanguage =
            snapshot?.codeLanguageOverridden
              ? snapshot.codeLanguage
              : state.codeLanguage
          const baseInspectorTab =
            snapshot?.inspectorTabOverridden
              ? snapshot.inspectorTab
              : state.inspectorTab

          if (!defaults) {
            if (!snapshot) return state
            return {
              canvas: baseCanvas,
              export: baseExport,
              codeLanguage: baseCodeLanguage,
              inspectorTab: baseInspectorTab,
              routeDefaultsSnapshot: null,
            }
          }

          const canvasKeys = keysOf(defaults.canvas)
          const exportKeys = keysOf(defaults.export)
          const codeLanguageOverridden =
            defaults.codeLanguage !== undefined
          const inspectorTabOverridden =
            defaults.inspectorTab !== undefined

          return {
            canvas: { ...baseCanvas, ...defaults.canvas },
            export: { ...baseExport, ...defaults.export },
            codeLanguage: defaults.codeLanguage ?? baseCodeLanguage,
            inspectorTab: defaults.inspectorTab ?? baseInspectorTab,
            routeDefaultsSnapshot: {
              canvas: baseCanvas,
              export: baseExport,
              codeLanguage: baseCodeLanguage,
              inspectorTab: baseInspectorTab,
              canvasKeys,
              exportKeys,
              codeLanguageOverridden,
              inspectorTabOverridden,
            },
          }
        }),
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
      setLocale: (locale) => set({ locale, localePreference: locale }),
      syncLocale: (locale) => set({ locale }),
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
      version: 6,
      migrate: (persisted, version) => {
        const saved = persisted as PersistedAppState & { locale?: Locale }
        let migrated: PersistedAppState = {
          ...saved,
          localePreference: saved.localePreference ?? null,
        }
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
        if (version < 5) {
          migrated = {
            ...migrated,
            localePreference: null,
          }
          delete (migrated as PersistedAppState & { locale?: Locale }).locale
        }
        if (version < 6) {
          migrated = {
            ...migrated,
            export: {
              ...defaultExport,
              ...migrated.export,
              splitMode: 'compact',
            },
          }
        }
        return migrated
      },
      partialize: (state) => {
        const snapshot = state.routeDefaultsSnapshot
        return {
          markdown: state.markdown,
          inputKind: state.inputKind,
          drafts: state.drafts,
          codeLanguage: snapshot?.codeLanguageOverridden
            ? snapshot.codeLanguage
            : state.codeLanguage,
          localePreference: state.localePreference,
          appearance: state.appearance,
          themeId: state.themeId,
          canvas: snapshot
            ? restoreOverriddenKeys(
                state.canvas,
                snapshot.canvas,
                snapshot.canvasKeys,
              )
            : state.canvas,
          signature: state.signature,
          export: snapshot
            ? restoreOverriddenKeys(
                state.export,
                snapshot.export,
                snapshot.exportKeys,
              )
            : state.export,
          customCss: state.customCss,
          editorCollapsed: state.editorCollapsed,
          inspectorCollapsed: state.inspectorCollapsed,
        }
      },
      merge: (persisted, current) => {
        const saved = persisted as Partial<PersistedAppState>
        return {
          ...current,
          ...saved,
          locale: saved.localePreference ?? current.locale,
          drafts: { ...current.drafts, ...saved.drafts },
          canvas: { ...current.canvas, ...saved.canvas },
          signature: { ...current.signature, ...saved.signature },
          export: { ...current.export, ...saved.export },
        }
      },
    },
  ),
)
