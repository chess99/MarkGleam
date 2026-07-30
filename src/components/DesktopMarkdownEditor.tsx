import CodeMirror, { EditorView } from '@uiw/react-codemirror'
import { markdown as markdownLanguage } from '@codemirror/lang-markdown'

interface DesktopMarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  dark: boolean
  ariaLabel: string
}

export default function DesktopMarkdownEditor({
  value,
  onChange,
  dark,
  ariaLabel,
}: DesktopMarkdownEditorProps) {
  return (
    <CodeMirror
      className="desktop-markdown-editor"
      value={value}
      height="100%"
      extensions={[
        markdownLanguage(),
        EditorView.contentAttributes.of({ 'aria-label': ariaLabel }),
      ]}
      onChange={onChange}
      theme={dark ? 'dark' : 'light'}
      basicSetup={{
        lineNumbers: true,
        foldGutter: true,
        highlightActiveLine: true,
        highlightActiveLineGutter: true,
        autocompletion: true,
        bracketMatching: true,
        searchKeymap: true,
      }}
    />
  )
}
