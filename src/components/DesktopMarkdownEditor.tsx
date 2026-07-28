import CodeMirror from '@uiw/react-codemirror'
import { markdown as markdownLanguage } from '@codemirror/lang-markdown'

interface DesktopMarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  dark: boolean
}

export default function DesktopMarkdownEditor({
  value,
  onChange,
  dark,
}: DesktopMarkdownEditorProps) {
  return (
    <CodeMirror
      value={value}
      height="100%"
      minHeight="100%"
      extensions={[markdownLanguage()]}
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
